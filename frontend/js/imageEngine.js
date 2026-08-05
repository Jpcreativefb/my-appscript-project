(function initializePlatformImageEngine(global) {
  "use strict";

  const TRANSPARENT_PIXEL =
    "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

  const DEFAULT_VARIANTS = {
    icon: { width: 64, height: 64, fit: "contain", quality: 72 },
    avatar: { width: 96, height: 96, fit: "cover", quality: 74 },
    thumb: { width: 120, height: 150, fit: "cover", quality: 74 },
    logo: { width: 160, height: 160, fit: "contain", quality: 78 },
    card: { width: 240, height: 300, fit: "cover", quality: 76 },
    profile: { width: 480, height: 600, fit: "cover", quality: 78 },
    hero: { width: 1200, height: 675, fit: "cover", quality: 80 }
  };

  const supplied = global.PLATFORM_IMAGE_CONFIG || {};
  const config = {
    enabled: supplied.enabled !== false,
    mode: String(supplied.mode || "browser").toLowerCase(),
    cloudflareBaseUrl: String(supplied.cloudflareBaseUrl || "").replace(/\/$/, ""),
    transformExternal: supplied.transformExternal === true,
    providerOptimization: supplied.providerOptimization !== false,
    lazyRootMargin: String(supplied.lazyRootMargin || "350px 0px"),
    variants: Object.assign({}, DEFAULT_VARIANTS, supplied.variants || {})
  };

  const metrics = {
    discovered: 0,
    requested: 0,
    loaded: 0,
    transformed: 0,
    providerOptimized: 0,
    manifest: 0,
    fallbacks: 0,
    failed: 0,
    backgrounds: 0
  };

  const imageObserver = "IntersectionObserver" in global
    ? new global.IntersectionObserver(handleIntersections_, {
        root: null,
        rootMargin: config.lazyRootMargin,
        threshold: 0.01
      })
    : null;

  const backgroundObserver = "IntersectionObserver" in global
    ? new global.IntersectionObserver(handleBackgroundIntersections_, {
        root: null,
        rootMargin: config.lazyRootMargin,
        threshold: 0.01
      })
    : null;

  function string_(value) {
    return value == null ? "" : String(value).trim();
  }

  function escapeAttr_(value) {
    return string_(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeClass_(value) {
    return string_(value).replace(/[^a-zA-Z0-9_\- ]/g, " ").replace(/\s+/g, " ").trim();
  }

  function safeCssProperty_(value) {
    const property = string_(value);
    return /^--[a-zA-Z0-9_-]+$/.test(property) ? property : "--platform-image-background";
  }

  function safeSource_(value) {
    const source = string_(value);
    if (!source) return "";
    if (/^(javascript|vbscript):/i.test(source)) return "";
    if (/^data:/i.test(source) && !/^data:image\//i.test(source)) return "";
    return source;
  }

  function absoluteUrl_(value) {
    const source = safeSource_(value);
    if (!source) return "";
    try {
      return new URL(source, global.location && global.location.href || "https://example.invalid/").href;
    } catch (err) {
      return source;
    }
  }

  function variant_(name) {
    const key = string_(name || "card").toLowerCase();
    return Object.assign({}, config.variants[key] || config.variants.card, { name: key });
  }


  function manifestEntry_(source) {
    const manifest = global.PLATFORM_IMAGE_MANIFEST || {};
    const raw = safeSource_(source);
    if (!raw) return null;

    const aliasMatch = raw.match(/^(?:asset|media):(?:\/\/)?(.+)$/i);
    const key = aliasMatch ? aliasMatch[1].replace(/^\/+/, "") : raw;
    const entry = manifest[key] || manifest[raw] || null;
    if (!entry) return null;
    if (typeof entry === "string") return { original: entry, card: entry };
    return entry;
  }

  function manifestUrl_(source, variantName) {
    const entry = manifestEntry_(source);
    if (!entry) return null;

    const key = string_(variantName || "card").toLowerCase();
    const preferred = entry[key] ||
      entry.card || entry.profile || entry.thumb || entry.logo || entry.hero || entry.original || "";
    if (!preferred) return null;

    return {
      original: safeSource_(entry.original || preferred),
      url: safeSource_(preferred),
      method: "manifest"
    };
  }

  function providerOptimizedUrl_(source, variantName) {
    const original = safeSource_(source);
    if (!config.providerOptimization || !original) {
      return { url: original, optimized: false };
    }

    let parsed;
    try {
      parsed = new URL(original, global.location && global.location.href || "https://example.invalid/");
    } catch (err) {
      return { url: original, optimized: false };
    }

    const preset = variant_(variantName);
    const host = parsed.hostname.toLowerCase();
    let changed = false;

    // TMDB supports path-based poster widths such as /w185/ and /w500/.
    if (host === "image.tmdb.org" && /\/t\/p\/(?:original|w\d+)\//.test(parsed.pathname)) {
      const tmdbWidth = preset.width <= 120 ? 154 : preset.width <= 240 ? 342 : 500;
      parsed.pathname = parsed.pathname.replace(/\/t\/p\/(?:original|w\d+)\//, "/t/p/w" + tmdbWidth + "/");
      changed = true;
    }

    // ESPN team logos commonly expose the source width as a path segment.
    if ((host === "a.espncdn.com" || host.endsWith(".espncdn.com")) && /\/teamlogos\//i.test(parsed.pathname)) {
      const espnWidth = preset.width <= 96 ? 80 : preset.width <= 160 ? 100 : 200;
      const replaced = parsed.pathname.replace(/\/500\//, "/" + espnWidth + "/");
      if (replaced !== parsed.pathname) {
        parsed.pathname = replaced;
        changed = true;
      }
    }

    // Google Drive thumbnail endpoint supports a requested width through sz=wNNN.
    if (host === "drive.google.com" && /\/thumbnail$/i.test(parsed.pathname)) {
      parsed.searchParams.set("sz", "w" + Math.max(64, preset.width));
      changed = true;
    }

    // Google-hosted images commonly support an =wNNN suffix.
    if ((host === "lh3.googleusercontent.com" || host.endsWith(".googleusercontent.com")) && !/=w\d+(?:-|$)/.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(/=s\d+(?:-[^/]*)?$/, "") + "=w" + Math.max(64, preset.width);
      changed = true;
    }

    return {
      url: changed ? parsed.href : original,
      optimized: changed
    };
  }

  function canUseCloudflare_(source) {
    if (config.mode !== "cloudflare" || !config.cloudflareBaseUrl) return false;
    if (!/^https:\/\//i.test(config.cloudflareBaseUrl)) return false;
    if (/\.pages\.dev$/i.test(new URL(config.cloudflareBaseUrl).hostname)) return false;

    const absolute = absoluteUrl_(source);
    if (!absolute) return false;

    try {
      const sourceUrl = new URL(absolute);
      const baseUrl = new URL(config.cloudflareBaseUrl);
      return sourceUrl.origin === baseUrl.origin || config.transformExternal;
    } catch (err) {
      return false;
    }
  }

  function cloudflareUrl_(source, variantName) {
    const original = absoluteUrl_(source);
    if (!canUseCloudflare_(original)) return "";

    const preset = variant_(variantName);
    const options = [
      "width=" + Math.max(1, Number(preset.width) || 240),
      "height=" + Math.max(1, Number(preset.height) || 300),
      "fit=" + encodeURIComponent(preset.fit || "cover"),
      "quality=" + Math.max(1, Math.min(100, Number(preset.quality) || 76)),
      "format=auto",
      "metadata=none"
    ];

    let sourcePart = original;
    try {
      const sourceUrl = new URL(original);
      const baseUrl = new URL(config.cloudflareBaseUrl);
      if (sourceUrl.origin === baseUrl.origin) {
        sourcePart = sourceUrl.pathname.replace(/^\//, "") + sourceUrl.search;
        options.push("onerror=redirect");
      }
    } catch (err) {
      // Keep the absolute source URL.
    }

    return config.cloudflareBaseUrl + "/cdn-cgi/image/" + options.join(",") + "/" + sourcePart;
  }

  function resolveUrl_(source, variantName) {
    const manifest = manifestUrl_(source, variantName);
    if (manifest) return manifest;

    const original = safeSource_(source);
    if (!original || /^(?:asset|media):/i.test(original)) {
      return { original: "", url: "", method: "none" };
    }

    const cloudflare = cloudflareUrl_(original, variantName);
    if (cloudflare) {
      return { original: original, url: cloudflare, method: "cloudflare" };
    }

    const provider = providerOptimizedUrl_(original, variantName);
    return {
      original: original,
      url: provider.url || original,
      method: provider.optimized ? "provider" : "original"
    };
  }

  function imageHtml_(source, options) {
    const opts = options || {};
    const original = safeSource_(source);
    if (!original) return "";

    const variantName = string_(opts.variant || "card").toLowerCase();
    const preset = variant_(variantName);
    const eager = opts.eager === true || opts.critical === true;
    const className = safeClass_((opts.className || "") + " platform-image");
    const alt = escapeAttr_(opts.alt || "");
    const width = Math.max(1, Number(opts.width || preset.width) || preset.width);
    const height = Math.max(1, Number(opts.height || preset.height) || preset.height);
    const resolved = eager ? resolveUrl_(original, variantName).url : TRANSPARENT_PIXEL;
    const deferred = eager ? "" : ` data-platform-src="${escapeAttr_(original)}"`;
    const originalAttr = ` data-platform-original="${escapeAttr_(original)}"`;
    const priority = eager ? "high" : "low";
    const loading = eager ? "eager" : "lazy";
    const extra = string_(opts.extraAttrs);

    return `<img class="${escapeAttr_(className)}" src="${escapeAttr_(resolved)}"${deferred}${originalAttr} data-platform-image="1" data-image-variant="${escapeAttr_(variantName)}" alt="${alt}" loading="${loading}" decoding="async" fetchpriority="${priority}" width="${width}" height="${height}" referrerpolicy="no-referrer"${extra ? " " + extra : ""}>`;
  }

  function backgroundAttrs_(source, options) {
    const opts = options || {};
    const original = safeSource_(source);
    if (!original) return "";

    return [
      `data-platform-bg="${escapeAttr_(original)}"`,
      `data-platform-bg-original="${escapeAttr_(original)}"`,
      `data-image-variant="${escapeAttr_(opts.variant || "hero")}"`,
      `data-platform-bg-var="${escapeAttr_(safeCssProperty_(opts.cssVariable || "--platform-image-background"))}"`,
      opts.eager === true ? 'data-platform-bg-eager="1"' : ""
    ].filter(Boolean).join(" ");
  }

  function inferVariant_(img) {
    const explicit = string_(img.getAttribute("data-image-variant"));
    if (explicit) return explicit;

    const className = String(img.className || "").toLowerCase();
    if (/hero|banner/.test(className)) return "hero";
    if (/logo|league|team|tribe|group/.test(className)) return "logo";
    if (/avatar|headshot|starter/.test(className)) return "avatar";
    if (/profile|compare/.test(className)) return "profile";
    if (/thumb|compact/.test(className)) return "thumb";
    return "card";
  }

  function attachImageEvents_(img) {
    if (img.dataset.platformEvents === "1") return;
    img.dataset.platformEvents = "1";

    img.addEventListener("load", function() {
      if (img.currentSrc === TRANSPARENT_PIXEL || img.src === TRANSPARENT_PIXEL) return;
      img.dataset.platformState = "loaded";
      img.classList.remove("platform-image-loading", "platform-image-failed");
      metrics.loaded += 1;
    });

    img.addEventListener("error", function() {
      const original = safeSource_(img.dataset.platformOriginal || img.getAttribute("data-platform-original"));
      const current = safeSource_(img.currentSrc || img.src);
      const alreadyRetried = img.dataset.platformOriginalRetry === "1";

      if (original && !alreadyRetried && absoluteUrl_(current) !== absoluteUrl_(original)) {
        img.dataset.platformOriginalRetry = "1";
        img.dataset.platformState = "fallback";
        img.removeAttribute("srcset");
        img.src = original;
        metrics.fallbacks += 1;
        return;
      }

      img.dataset.platformState = "failed";
      img.classList.remove("platform-image-loading");
      img.classList.add("platform-image-failed");
      metrics.failed += 1;
    });
  }

  function loadImage_(img) {
    if (!img || img.dataset.platformRequested === "1") return;

    const original = safeSource_(
      img.getAttribute("data-platform-src") ||
      img.getAttribute("data-platform-original") ||
      img.getAttribute("src")
    );

    if (!original || original === TRANSPARENT_PIXEL) return;

    const variantName = inferVariant_(img);
    const resolved = resolveUrl_(original, variantName);

    img.dataset.platformRequested = "1";
    img.dataset.platformOriginal = resolved.original;
    img.dataset.platformMethod = resolved.method;
    img.dataset.platformState = "loading";
    img.classList.add("platform-image-loading");
    img.removeAttribute("data-platform-src");
    img.src = resolved.url;

    metrics.requested += 1;
    if (resolved.method === "cloudflare") metrics.transformed += 1;
    if (resolved.method === "provider") metrics.providerOptimized += 1;
    if (resolved.method === "manifest") metrics.manifest += 1;
  }

  function processImage_(img) {
    if (!img || img.nodeType !== 1 || img.tagName !== "IMG") return;
    if (img.dataset.platformProcessed === "1") return;

    img.dataset.platformProcessed = "1";
    metrics.discovered += 1;

    if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
    if (!img.hasAttribute("referrerpolicy")) img.setAttribute("referrerpolicy", "no-referrer");
    if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
    if (!img.hasAttribute("fetchpriority")) img.setAttribute("fetchpriority", "low");

    const original = safeSource_(
      img.getAttribute("data-platform-original") ||
      img.getAttribute("data-platform-src") ||
      img.getAttribute("src")
    );
    if (original && original !== TRANSPARENT_PIXEL) img.dataset.platformOriginal = original;

    attachImageEvents_(img);

    const deferred = !!img.getAttribute("data-platform-src");
    const eager = img.getAttribute("loading") === "eager" || img.getAttribute("fetchpriority") === "high";

    if (deferred && !eager && imageObserver) {
      imageObserver.observe(img);
    } else if (deferred) {
      loadImage_(img);
    }
  }

  function loadBackground_(element) {
    if (!element || element.dataset.platformBgRequested === "1") return;

    const original = safeSource_(element.dataset.platformBg || element.dataset.platformBgOriginal);
    if (!original) return;

    const variantName = string_(element.dataset.imageVariant || "hero");
    const resolved = resolveUrl_(original, variantName);
    const property = safeCssProperty_(element.dataset.platformBgVar || "--platform-image-background");
    const cssUrl = 'url("' + resolved.url.replace(/"/g, "%22") + '")';

    element.dataset.platformBgRequested = "1";
    element.dataset.platformBgOriginal = resolved.original;
    element.dataset.platformBgMethod = resolved.method;
    element.style.setProperty(property, cssUrl);
    metrics.backgrounds += 1;
    if (resolved.method === "cloudflare") metrics.transformed += 1;
    if (resolved.method === "provider") metrics.providerOptimized += 1;
    if (resolved.method === "manifest") metrics.manifest += 1;
  }

  function processBackground_(element) {
    if (!element || element.nodeType !== 1 || element.dataset.platformBgProcessed === "1") return;
    element.dataset.platformBgProcessed = "1";

    if (element.dataset.platformBgEager === "1" || !backgroundObserver) {
      loadBackground_(element);
    } else {
      backgroundObserver.observe(element);
    }
  }

  function handleIntersections_(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      imageObserver.unobserve(entry.target);
      loadImage_(entry.target);
    });
  }

  function handleBackgroundIntersections_(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      backgroundObserver.unobserve(entry.target);
      loadBackground_(entry.target);
    });
  }

  function process_(root) {
    if (!config.enabled) return;
    const scope = root && root.querySelectorAll ? root : document;

    if (scope.tagName === "IMG") processImage_(scope);
    if (scope.dataset && scope.dataset.platformBg) processBackground_(scope);

    scope.querySelectorAll("img").forEach(processImage_);
    scope.querySelectorAll("[data-platform-bg]").forEach(processBackground_);
  }

  function observeDom_() {
    if (!("MutationObserver" in global) || !document.documentElement) return;

    const observer = new global.MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (!node || node.nodeType !== 1) return;
          process_(node);
        });
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  const api = {
    config: config,
    variants: config.variants,
    resolve: resolveUrl_,
    html: imageHtml_,
    backgroundAttrs: backgroundAttrs_,
    process: process_,
    load: loadImage_,
    metrics: function() { return Object.assign({}, metrics); },
    transparentPixel: TRANSPARENT_PIXEL
  };

  global.PlatformImageEngine = api;
  global.platformImageUrl = function(source, variantName) {
    return resolveUrl_(source, variantName || "card").url;
  };
  global.platformImgHtml = imageHtml_;
  global.platformBackgroundAttrs = backgroundAttrs_;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      process_(document);
      observeDom_();
    }, { once: true });
  } else {
    process_(document);
    observeDom_();
  }
})(window);
