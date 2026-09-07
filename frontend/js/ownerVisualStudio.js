/* ============================================================
   PATTC OWNER VISUAL STUDIO — RC24D FOUNDATION R1
   Admin visual layout editor + published layout runtime.
   Appearance/layout only. No picks, scoring, locks, sports or auth writes.
============================================================ */
(function(){
  "use strict";

  const OVS_VERSION = "rc24d-owner-visual-studio-r1";
  const OVS_GLOBAL_GAME_ID = "__pattc_global__";
  const OVS_DRAFT_TYPE = "visual-studio-draft";
  const OVS_PUBLISHED_TYPE = "visual-studio-published";
  const OVS_VERSION_TYPE = "visual-studio-version";
  const OVS_PANEL_ID = "pattcOwnerVisualStudioPanel";
  const OVS_LAUNCH_ID = "pattcOwnerVisualStudioLaunch";
  const OVS_STYLE_ID = "pattcOwnerVisualStudioStyle";
  const OVS_DEMO_CLASS = "pattc-vs-demo-active";

  const state = {
    open:false,
    picking:false,
    selectMode:"element",
    selected:null,
    selectedKey:"",
    selectedSection:null,
    selectedSectionKey:"",
    working:null,
    saved:null,
    published:null,
    bundle:null,
    scopeKey:"",
    pageKey:"",
    storageGameId:"",
    loading:false,
    applying:false,
    demo:false,
    demoState:"in-progress",
    demoText:new Map(),
    hover:null,
    observer:null,
    refreshTimer:0,
    lastMutationAt:0,
    originalSnapshots:new Map()
  };

  function clone_(value){
    try { return JSON.parse(JSON.stringify(value == null ? {} : value)); }
    catch (err) { return {}; }
  }

  function emptyManifest_(){
    return {
      version:1,
      studioVersion:OVS_VERSION,
      pageKey:"",
      items:{},
      groups:{},
      groupMembers:{},
      moves:{},
      hidden:{},
      collapse:{},
      generatedSections:{},
      meta:{updatedAt:"", updatedBy:""}
    };
  }

  function normalizeManifest_(raw){
    const base = emptyManifest_();
    raw = raw && typeof raw === "object" ? raw : {};
    base.version = Number(raw.version) || 1;
    base.studioVersion = String(raw.studioVersion || OVS_VERSION);
    base.pageKey = String(raw.pageKey || "");
    base.items = raw.items && typeof raw.items === "object" ? clone_(raw.items) : {};
    base.groups = raw.groups && typeof raw.groups === "object" ? clone_(raw.groups) : {};
    base.groupMembers = raw.groupMembers && typeof raw.groupMembers === "object" ? clone_(raw.groupMembers) : {};
    base.moves = raw.moves && typeof raw.moves === "object" ? clone_(raw.moves) : {};
    base.hidden = raw.hidden && typeof raw.hidden === "object" ? clone_(raw.hidden) : {};
    base.collapse = raw.collapse && typeof raw.collapse === "object" ? clone_(raw.collapse) : {};
    base.generatedSections = raw.generatedSections && typeof raw.generatedSections === "object" ? clone_(raw.generatedSections) : {};
    base.meta = raw.meta && typeof raw.meta === "object" ? clone_(raw.meta) : {};
    return base;
  }

  function isAdmin_(){
    try {
      const session = typeof getSession === "function" ? getSession() : null;
      if (typeof isAdminSession === "function") return isAdminSession(session) === true;
      return !!(session && (session.isAdmin === true || session.IsAdmin === true));
    } catch (err) { return false; }
  }

  function pageKey_(){
    let raw = "";
    try { raw = String((window.APP_STATE && APP_STATE.currentPage) || ""); } catch (err) {}
    if (!raw) raw = String(window.location.hash || "#dashboard").replace(/^#/, "");
    raw = raw.split(":")[0].split("?")[0].trim().toLowerCase();
    return raw || "dashboard";
  }

  function storageGameId_(){
    const page = pageKey_();
    if (page === "dashboard" || page === "sports-hub" || page === "profile" || page.indexOf("admin") === 0) {
      return OVS_GLOBAL_GAME_ID;
    }
    try {
      const gameId = typeof getFrontendGameId === "function" ? String(getFrontendGameId() || "").trim() : "";
      return gameId || OVS_GLOBAL_GAME_ID;
    } catch (err) { return OVS_GLOBAL_GAME_ID; }
  }

  function scopeKey_(){ return storageGameId_() + "|" + pageKey_(); }

  function html_(value){
    return String(value == null ? "" : value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function cssSafe_(value){
    try { return CSS.escape(String(value || "")); }
    catch (err) { return String(value || "").replace(/[^a-zA-Z0-9_-]/g,"\\$&"); }
  }

  function slug_(value){
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48);
  }

  function meaningfulClasses_(node){
    if (!node || !node.classList) return [];
    return Array.from(node.classList).filter(function(name){
      if (!name || /^pattc-vs-/.test(name) || /^(active|open|hidden|selected|loading|is-|has-)/.test(name)) return false;
      return name.length < 70;
    }).slice(0,3);
  }

  function semanticDataKey_(node){
    if (!node || !node.getAttribute) return "";
    const attrs = ["data-section-id","data-category-id","data-question-id","data-position","data-game-id","data-entry-id","data-market-key","data-route","data-tab","data-view"];
    for (let i=0;i<attrs.length;i++) {
      const v = String(node.getAttribute(attrs[i]) || "").trim();
      if (v) return node.tagName.toLowerCase() + "[" + attrs[i] + "=" + v + "]";
    }
    return "";
  }

  function siblingIndex_(node){
    if (!node || !node.parentElement) return 0;
    return Array.from(node.parentElement.children).indexOf(node);
  }

  function stableKey_(node){
    if (!node || node.nodeType !== 1) return "";
    const existing = node.getAttribute("data-pattc-vs-key");
    if (existing) return existing;
    let key = "";
    if (node.id) key = "id:" + node.id;
    if (!key) key = semanticDataKey_(node);
    if (!key) {
      const classes = meaningfulClasses_(node);
      const tag = node.tagName.toLowerCase();
      const text = slug_(node.children.length ? "" : node.textContent);
      let parent = node.parentElement;
      let parentToken = "root";
      while (parent && parent !== document.body) {
        if (parent.id) { parentToken = "id-" + parent.id; break; }
        const semantic = semanticDataKey_(parent);
        if (semantic) { parentToken = slug_(semantic); break; }
        parent = parent.parentElement;
      }
      key = "dom:" + tag + (classes.length ? "." + classes.join(".") : "") + "|p:" + parentToken + "|i:" + siblingIndex_(node) + (text ? "|t:" + text : "");
    }
    node.setAttribute("data-pattc-vs-key", key);
    return key;
  }

  function annotate_(root){
    root = root || document.getElementById("app") || document.body;
    if (!root || !root.querySelectorAll) return;
    stableKey_(root);
    root.querySelectorAll("section,details,.card,.panel,[class*='section'],[class*='group'],[class*='hero'],button,select,input,textarea,h1,h2,h3,h4,summary,[role='button']").forEach(function(node){
      if (node.closest && node.closest("#" + OVS_PANEL_ID)) return;
      stableKey_(node);
    });
  }

  function sectionLike_(node){
    if (!node || node.nodeType !== 1) return false;
    if (/^(SECTION|DETAILS|ARTICLE)$/.test(node.tagName)) return true;
    const cls = String(node.className || "");
    return /(^|\s)(card|panel|[^\s]*section[^\s]*|[^\s]*group[^\s]*|[^\s]*hero[^\s]*)(\s|$)/i.test(cls);
  }

  function closestSection_(node){
    let cur = node;
    const app = document.getElementById("app");
    while (cur && cur !== document.body && cur !== app) {
      if (sectionLike_(cur)) return cur;
      cur = cur.parentElement;
    }
    return app || node;
  }

  function layoutTarget_(section){
    if (!section) return null;
    if (section.tagName === "DETAILS") {
      return section.querySelector(":scope > .admin-collapsible-body, :scope > .dashboard-subhub-section-body, :scope > .card-body, :scope > .content") || section;
    }
    return section.querySelector(":scope > .admin-collapsible-body, :scope > .dashboard-subhub-section-body, :scope > .card-body, :scope > .content, :scope > .grid") || section;
  }

  function resolveKey_(key){
    if (!key) return null;
    if (key.indexOf("id:") === 0) return document.getElementById(key.slice(3));
    return document.querySelector('[data-pattc-vs-key="' + cssSafe_(key) + '"]');
  }


  function snapshotNode_(node){
    if (!node || state.originalSnapshots.has(node)) return;
    state.originalSnapshots.set(node,{
      style:node.getAttribute("style"),
      parent:node.parentElement,
      index:siblingIndex_(node),
      open:node.tagName === "DETAILS" ? node.open : null
    });
  }

  function styleObjectFromNode_(node){
    if (!node) return {};
    const c = getComputedStyle(node);
    return {
      backgroundColor: rgbToHex_(c.backgroundColor),
      color: rgbToHex_(c.color),
      borderColor: rgbToHex_(c.borderTopColor),
      borderWidth: parseFloat(c.borderTopWidth) || 0,
      borderRadius: parseFloat(c.borderTopLeftRadius) || 0,
      padding: parseFloat(c.paddingTop) || 0,
      gap: parseFloat(c.gap) || 0,
      fontSize: parseFloat(c.fontSize) || 16,
      textAlign: c.textAlign || "left"
    };
  }

  function rgbToHex_(value){
    const m = String(value || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#000000";
    return "#" + [m[1],m[2],m[3]].map(function(n){ return Number(n).toString(16).padStart(2,"0"); }).join("");
  }

  function applyStyle_(node, style){
    if (!node || !style) return;
    snapshotNode_(node);
    const s = node.style;
    if (style.backgroundColor) s.setProperty("background-color", style.backgroundColor, "important");
    if (style.color) s.setProperty("color", style.color, "important");
    if (style.borderColor) s.setProperty("border-color", style.borderColor, "important");
    if (style.borderWidth != null && style.borderWidth !== "") s.setProperty("border-width", Number(style.borderWidth) + "px", "important");
    if (style.borderRadius != null && style.borderRadius !== "") s.setProperty("border-radius", Number(style.borderRadius) + "px", "important");
    if (style.padding != null && style.padding !== "") s.setProperty("padding", Number(style.padding) + "px", "important");
    if (style.gap != null && style.gap !== "") s.setProperty("gap", Number(style.gap) + "px", "important");
    if (style.fontSize != null && style.fontSize !== "") s.setProperty("font-size", Number(style.fontSize) + "px", "important");
    if (style.textAlign) s.setProperty("text-align", style.textAlign, "important");
    if (style.widthMode === "full") s.setProperty("width", "100%", "important");
    else if (style.widthMode === "auto") s.removeProperty("width");
  }

  function clearStudioStyle_(node){
    if (!node) return;
    ["background-color","color","border-color","border-width","border-radius","padding","gap","font-size","text-align","width","display","grid-template-columns"].forEach(function(prop){ node.style.removeProperty(prop); });
    node.classList.remove("pattc-vs-layout-grid");
  }

  function applyLayout_(section, item){
    if (!section || !item) return;
    const target = layoutTarget_(section);
    if (!target) return;
    snapshotNode_(target);
    const columns = Number(item.columns || 0);
    if (columns >= 1 && columns <= 3) {
      target.classList.add("pattc-vs-layout-grid");
      target.style.setProperty("display","grid","important");
      target.style.setProperty("grid-template-columns","repeat(" + columns + ", minmax(0,1fr))","important");
      if (item.gap != null) target.style.setProperty("gap", Number(item.gap) + "px", "important");
    }
  }

  function applyCollapse_(node, config){
    if (!node || !config) return;
    snapshotNode_(node);
    if (node.tagName === "DETAILS") node.open = config.defaultOpen === true;
  }


  function ensureGeneratedSections_(manifest){
    const app=document.getElementById("app"); if(!app)return;
    Object.keys((manifest&&manifest.generatedSections)||{}).forEach(function(id){
      const cfg=manifest.generatedSections[id]||{};
      const key="generated:"+id;
      let section=resolveKey_(key);
      if(!section){
        section=document.createElement("section");
        section.className="card pattc-vs-generated-section";
        section.setAttribute("data-pattc-vs-generated",id);
        section.setAttribute("data-pattc-vs-key",key);
        section.innerHTML='<h2 class="pattc-vs-generated-title"></h2><div class="pattc-vs-generated-body"></div>';
        const parent=resolveKey_(cfg.parentKey)||app;
        const target=layoutTarget_(parent)||parent;
        const after=resolveKey_(cfg.afterKey);
        if(after&&after.parentElement===target) target.insertBefore(section,after.nextSibling); else target.appendChild(section);
      }
      const title=section.querySelector(".pattc-vs-generated-title"); if(title) title.textContent=String(cfg.title||"New Section");
      stableKey_(section);
    });
  }

  function applyManifest_(manifest){
    manifest = normalizeManifest_(manifest);
    const app = document.getElementById("app");
    if (!app || state.applying) return;
    state.applying = true;
    try {
      ensureGeneratedSections_(manifest);
      annotate_(app);

      Object.keys(manifest.groups || {}).forEach(function(name){
        const group = manifest.groups[name] || {};
        const selector = String(group.selector || "").trim();
        if (!selector) return;
        try { app.querySelectorAll(selector).forEach(function(node){ applyStyle_(node, group.style || {}); }); } catch (err) {}
      });

      Object.keys(manifest.items || {}).forEach(function(key){
        const node = resolveKey_(key);
        if (!node) return;
        const item = manifest.items[key] || {};
        applyStyle_(node, item.style || {});
        if (item.columns) applyLayout_(node, item);
      });

      Object.keys(manifest.groupMembers || {}).forEach(function(key){
        const name = manifest.groupMembers[key];
        const node = resolveKey_(key);
        const group = manifest.groups && manifest.groups[name];
        if (node && group) applyStyle_(node, group.style || {});
      });

      Object.keys(manifest.moves || {}).forEach(function(key){
        const node = resolveKey_(key);
        const destination = resolveKey_(manifest.moves[key]);
        if (!node || !destination || node === destination || node.contains(destination)) return;
        const target = layoutTarget_(destination);
        if (target && node.parentElement !== target) { snapshotNode_(node); target.appendChild(node); }
      });

      Object.keys(manifest.hidden || {}).forEach(function(key){
        if (manifest.hidden[key] !== true) return;
        const node = resolveKey_(key);
        if (node) { snapshotNode_(node); node.style.setProperty("display","none","important"); }
      });

      Object.keys(manifest.items || {}).forEach(function(key){
        const item = manifest.items[key] || {};
        if (!item.order || !item.order.parentKey) return;
        const node = resolveKey_(key);
        const parent = resolveKey_(item.order.parentKey);
        if (!node || !parent || node === parent || node.contains(parent)) return;
        const target = layoutTarget_(parent) || parent;
        snapshotNode_(node);
        const children = Array.from(target.children).filter(function(child){ return child !== node; });
        const idx = Math.max(0, Math.min(Number(item.order.index) || 0, children.length));
        target.insertBefore(node, children[idx] || null);
      });

      Object.keys(manifest.collapse || {}).forEach(function(key){
        applyCollapse_(resolveKey_(key), manifest.collapse[key]);
      });
    } finally {
      state.applying = false;
    }
  }

  function parseOverride_(row){
    if (!row) return null;
    const raw = row.ThemeOverrideJSON != null ? row.ThemeOverrideJSON : row.themeOverrideJSON;
    if (!raw) return null;
    if (typeof raw === "object") return normalizeManifest_(raw);
    try { return normalizeManifest_(JSON.parse(raw)); } catch (err) { return null; }
  }

  function findOverride_(bundle, type, entityId){
    const rows = bundle && Array.isArray(bundle.overrides) ? bundle.overrides : [];
    return rows.find(function(row){
      return String(row.EntityType || row.entityType || "") === type && String(row.EntityId || row.entityId || "") === entityId;
    }) || null;
  }


  function readBundleCache_(gameId){
    try {
      const keys=["pattcGameAppearance:"+gameId,"pattcOwnerVsBundle:"+gameId];
      for(let i=0;i<keys.length;i++){
        const raw=sessionStorage.getItem(keys[i]);
        if(!raw) continue;
        const parsed=JSON.parse(raw);
        if(parsed && parsed.bundle && parsed.savedAt){
          if(Date.now()-Number(parsed.savedAt)<10*60*1000) return parsed.bundle;
        } else if(parsed && (parsed.overrides || parsed.assignment)) return parsed;
      }
    } catch(err){}
    return null;
  }

  function writeBundleCache_(gameId,bundle){
    try { sessionStorage.setItem("pattcOwnerVsBundle:"+gameId,JSON.stringify({savedAt:Date.now(),bundle:bundle||{}})); } catch(err){}
  }

  function consumeBundle_(bundle){
    state.bundle=bundle||{};
    state.published=parseOverride_(findOverride_(bundle,OVS_PUBLISHED_TYPE,state.pageKey))||emptyManifest_();
    state.saved=parseOverride_(findOverride_(bundle,OVS_DRAFT_TYPE,state.pageKey))||clone_(state.published);
    state.working=clone_(state.open&&isAdmin_()?state.saved:state.published);
    state.working.pageKey=state.pageKey;
    applyManifest_(state.working);
    if(state.open) renderPanel_();
  }

  async function loadScope_(force){
    const scope = scopeKey_();
    if (!force && state.scopeKey === scope && state.working) return;
    if (state.scopeKey && state.scopeKey !== scope) {
      resetApplied_();
      clearSelectionClass_();
      state.selected=null; state.selectedKey=""; state.selectedSection=null; state.selectedSectionKey="";
    }
    if (state.loading || typeof apiGetGameAppearance !== "function") return;
    state.loading = true;
    try {
      state.pageKey = pageKey_();
      state.storageGameId = storageGameId_();
      state.scopeKey = scope;
      const cached = readBundleCache_(state.storageGameId);
      if (cached) consumeBundle_(cached);
      const admin = isAdmin_();
      if (!admin && cached) {
        // Do not add latency to player startup. Refresh the public appearance bundle after the page is usable.
        setTimeout(async function(){
          try {
            if(scopeKey_() !== scope) return;
            const fresh=await apiGetGameAppearance(state.storageGameId);
            writeBundleCache_(state.storageGameId,fresh);
            if(scopeKey_()===scope){consumeBundle_(fresh);}
          } catch(err){}
        },1500);
      } else {
        const bundle = await apiGetGameAppearance(state.storageGameId);
        writeBundleCache_(state.storageGameId,bundle);
        consumeBundle_(bundle);
      }
    } catch (err) {
      console.warn("PATTC Visual Studio load warning", err);
    } finally { state.loading = false; }
  }

  function injectStyle_(){
    if (document.getElementById(OVS_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = OVS_STYLE_ID;
    style.textContent = `
      #${OVS_LAUNCH_ID}{position:fixed;right:14px;bottom:14px;z-index:2147482000;border:1px solid rgba(255,255,255,.28);background:#151821;color:#fff;border-radius:999px;padding:9px 13px;font:700 12px/1 system-ui;box-shadow:0 8px 28px rgba(0,0,0,.34);cursor:pointer}
      #${OVS_PANEL_ID}{position:fixed;right:12px;top:70px;bottom:12px;width:min(390px,calc(100vw - 24px));z-index:2147482500;background:rgba(16,18,24,.985);color:#f6f7fb;border:1px solid rgba(255,255,255,.2);border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.52);font:13px/1.35 system-ui;display:flex;flex-direction:column;overflow:hidden}
      #${OVS_PANEL_ID} *{box-sizing:border-box}
      .pattc-vs-head{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.12);background:#20232d}.pattc-vs-head strong{flex:1}.pattc-vs-head button{border:0;background:#343845;color:#fff;border-radius:8px;padding:6px 8px;cursor:pointer}
      .pattc-vs-body{overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:10px}.pattc-vs-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.pattc-vs-row>*{min-width:0}.pattc-vs-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pattc-vs-grid label{display:flex;flex-direction:column;gap:3px;color:#bec3d1}.pattc-vs-grid input,.pattc-vs-grid select,.pattc-vs-input{width:100%;background:#11131a;color:#fff;border:1px solid #3b4050;border-radius:8px;padding:7px}
      .pattc-vs-btn{border:1px solid #41485a;background:#282d39;color:#fff;border-radius:8px;padding:7px 9px;font-weight:700;cursor:pointer}.pattc-vs-btn.primary{background:#315bce}.pattc-vs-btn.danger{background:#7d2630}.pattc-vs-btn.on{outline:2px solid #7ca2ff}.pattc-vs-help{color:#9ea6b7;font-size:11px}.pattc-vs-card{padding:9px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.035)}.pattc-vs-card h4{margin:0 0 7px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#aeb5c5}
      .pattc-vs-selected{outline:3px solid #63a6ff !important;outline-offset:2px !important}.pattc-vs-hover{outline:2px dashed #f3c451 !important;outline-offset:2px !important}.pattc-vs-section-selected{outline:3px solid #6fe0b2 !important;outline-offset:3px !important}.pattc-vs-layout-grid>*{min-width:0}
      .pattc-vs-hidden-list{max-height:120px;overflow:auto}.pattc-vs-hidden-row{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.08)}
      .pattc-vs-demo-badge{position:fixed;left:12px;bottom:12px;z-index:2147481900;background:#8b5b00;color:#fff;border-radius:999px;padding:7px 10px;font:700 11px system-ui}
      @media(max-width:700px) and (hover:none) and (pointer:coarse){#${OVS_PANEL_ID}{inset:8px;width:auto;border-radius:12px}.pattc-vs-grid{grid-template-columns:1fr}.pattc-vs-body{padding-bottom:80px}}
    `;
    document.head.appendChild(style);
  }

  function ensureLaunch_(){
    if (!isAdmin_()) { const old=document.getElementById(OVS_LAUNCH_ID); if(old) old.remove(); return; }
    if (document.getElementById(OVS_LAUNCH_ID)) return;
    const button = document.createElement("button");
    button.id = OVS_LAUNCH_ID;
    button.type = "button";
    button.textContent = "Visual Studio";
    button.title = "Open PATTC Owner Visual Studio";
    button.addEventListener("click", function(){ openStudio_(); });
    document.body.appendChild(button);
  }

  function selectedLabel_(){
    const node = state.selected;
    if (!node) return "Nothing selected";
    const id = node.id ? "#" + node.id : "";
    const cls = meaningfulClasses_(node).slice(0,2).map(function(c){return "."+c;}).join("");
    const text = String(node.textContent || "").trim().replace(/\s+/g," ").slice(0,55);
    return node.tagName.toLowerCase() + id + cls + (text ? " · " + text : "");
  }

  function currentItem_(){
    if (!state.working || !state.selectedKey) return null;
    if (!state.working.items[state.selectedKey]) state.working.items[state.selectedKey] = {style:styleObjectFromNode_(state.selected)};
    if (!state.working.items[state.selectedKey].style) state.working.items[state.selectedKey].style = {};
    return state.working.items[state.selectedKey];
  }

  function sectionOptions_(){
    const app = document.getElementById("app");
    if (!app) return "";
    const seen = new Set();
    const rows = [];
    app.querySelectorAll("section,details,.card,.panel,[class*='section'],[class*='group'],[class*='hero']").forEach(function(node){
      if (!sectionLike_(node) || node.closest("#"+OVS_PANEL_ID)) return;
      const key = stableKey_(node); if (!key || seen.has(key)) return; seen.add(key);
      const label = (node.id ? "#"+node.id : meaningfulClasses_(node).slice(0,2).join(".")) || node.tagName.toLowerCase();
      rows.push('<option value="'+html_(key)+'">'+html_(label.slice(0,70))+'</option>');
    });
    return rows.join("");
  }

  function renderPanel_(){
    let panel = document.getElementById(OVS_PANEL_ID);
    if (!state.open) { if(panel) panel.remove(); return; }
    if (!panel) { panel=document.createElement("aside"); panel.id=OVS_PANEL_ID; document.body.appendChild(panel); }
    const item = currentItem_();
    const st = item ? item.style || {} : {};
    const selectedIsDetails = !!(state.selected && state.selected.tagName === "DETAILS");
    const hiddenKeys = Object.keys((state.working && state.working.hidden) || {}).filter(function(k){return state.working.hidden[k]===true;});
    panel.innerHTML = `
      <div class="pattc-vs-head"><strong>PATTC Visual Studio</strong><span>${html_(OVS_VERSION)}</span><button data-ovs="close">✕</button></div>
      <div class="pattc-vs-body">
        <div class="pattc-vs-card"><h4>Page</h4><div><strong>${html_(state.pageKey || pageKey_())}</strong> · <span>${html_(state.storageGameId || storageGameId_())}</span></div><div class="pattc-vs-help">Draft designs save to PATTC, so the same design opens on both Macs.</div></div>
        <div class="pattc-vs-row">
          <button class="pattc-vs-btn ${state.picking?'on':''}" data-ovs="pick">${state.picking?'Picking…':'Pick on Page'}</button>
          <button class="pattc-vs-btn ${state.selectMode==='element'?'on':''}" data-ovs="mode-element">Element</button>
          <button class="pattc-vs-btn ${state.selectMode==='section'?'on':''}" data-ovs="mode-section">Section</button><button class="pattc-vs-btn" data-ovs="select-page">Whole Page</button>
        </div>
        <div class="pattc-vs-card"><h4>Selected</h4><div>${html_(selectedLabel_())}</div><div class="pattc-vs-help">Element mode edits one item. Section mode edits the whole containing section.</div></div>
        ${item ? `
        <div class="pattc-vs-card"><h4>Style</h4><div class="pattc-vs-grid">
          <label>Background<input type="color" data-field="backgroundColor" value="${html_(st.backgroundColor || '#20232d')}"></label>
          <label>Text<input type="color" data-field="color" value="${html_(st.color || '#ffffff')}"></label>
          <label>Border<input type="color" data-field="borderColor" value="${html_(st.borderColor || '#41485a')}"></label>
          <label>Border px<input type="number" min="0" max="12" data-field="borderWidth" value="${html_(st.borderWidth==null?0:st.borderWidth)}"></label>
          <label>Radius<input type="number" min="0" max="60" data-field="borderRadius" value="${html_(st.borderRadius==null?0:st.borderRadius)}"></label>
          <label>Padding<input type="number" min="0" max="80" data-field="padding" value="${html_(st.padding==null?0:st.padding)}"></label>
          <label>Gap<input type="number" min="0" max="60" data-field="gap" value="${html_(st.gap==null?0:st.gap)}"></label>
          <label>Font px<input type="number" min="8" max="72" data-field="fontSize" value="${html_(st.fontSize==null?16:st.fontSize)}"></label>
          <label>Align<select data-field="textAlign"><option ${st.textAlign==='left'?'selected':''}>left</option><option ${st.textAlign==='center'?'selected':''}>center</option><option ${st.textAlign==='right'?'selected':''}>right</option></select></label>
          <label>Width<select data-field="widthMode"><option value="auto" ${st.widthMode!=='full'?'selected':''}>Auto</option><option value="full" ${st.widthMode==='full'?'selected':''}>Full</option></select></label>
        </div></div>
        <div class="pattc-vs-card"><h4>Layout + Move</h4><div class="pattc-vs-row">
          <button class="pattc-vs-btn" data-ovs="col-1">1 Column</button><button class="pattc-vs-btn" data-ovs="col-2">2 Columns</button><button class="pattc-vs-btn" data-ovs="col-3">3 Columns</button>
        </div><div class="pattc-vs-row" style="margin-top:7px"><button class="pattc-vs-btn" data-ovs="up">↑ Up</button><button class="pattc-vs-btn" data-ovs="down">↓ Down</button><button class="pattc-vs-btn" data-ovs="new-section">New Section</button><button class="pattc-vs-btn danger" data-ovs="hide">Remove / Hide</button></div>
        <label class="pattc-vs-help" style="display:block;margin-top:7px">Move into section<select class="pattc-vs-input" data-ovs-select="move"><option value="">Choose section…</option>${sectionOptions_()}</select></label></div>
        <div class="pattc-vs-card"><h4>Grouped / Universal Style</h4><div class="pattc-vs-row"><button class="pattc-vs-btn" data-ovs="similar">Apply to Similar</button><button class="pattc-vs-btn" data-ovs="universal-button">Universal Buttons</button><button class="pattc-vs-btn" data-ovs="universal-header">Universal Headers</button><button class="pattc-vs-btn" data-ovs="universal-section">Universal Sections</button></div><div class="pattc-vs-help">Change one selection button, then Apply to Similar to style the rest of that button class together.</div></div>
        <div class="pattc-vs-card"><h4>Collapsible Section</h4>${selectedIsDetails?`<div class="pattc-vs-row"><button class="pattc-vs-btn" data-ovs="preview-open">Preview Open</button><button class="pattc-vs-btn" data-ovs="preview-closed">Preview Closed</button><button class="pattc-vs-btn" data-ovs="default-open">Default Open</button><button class="pattc-vs-btn" data-ovs="default-closed">Default Closed</button></div>`:`<div class="pattc-vs-help">Select a collapsible &lt;details&gt; section to edit its open/closed state.</div>`}</div>
        ` : ''}
        <div class="pattc-vs-card"><h4>Demo Values</h4><div class="pattc-vs-row"><button class="pattc-vs-btn ${state.demo?'on':''}" data-ovs="demo">${state.demo?'Demo ON':'Demo OFF'}</button><select class="pattc-vs-input" style="width:auto" data-ovs-select="demo-state"><option value="empty" ${state.demoState==='empty'?'selected':''}>Empty</option><option value="in-progress" ${state.demoState==='in-progress'?'selected':''}>In Progress</option><option value="live" ${state.demoState==='live'?'selected':''}>Live</option><option value="final" ${state.demoState==='final'?'selected':''}>Final</option><option value="locked" ${state.demoState==='locked'?'selected':''}>Locked</option></select></div><div class="pattc-vs-help">Preview-only dummy scores, ranks, points and statuses. Never writes player data.</div></div>
        <div class="pattc-vs-card"><h4>Save + Revert</h4><div class="pattc-vs-row"><button class="pattc-vs-btn" data-ovs="save-element">Save Element</button><button class="pattc-vs-btn" data-ovs="save-section">Save Section</button><button class="pattc-vs-btn primary" data-ovs="save-page">Save Page Draft</button><button class="pattc-vs-btn primary" data-ovs="publish">Publish Page</button></div><div class="pattc-vs-row" style="margin-top:7px"><button class="pattc-vs-btn" data-ovs="last-saved">Last Saved</button><button class="pattc-vs-btn" data-ovs="original">Original Preview</button></div><div id="pattcVsStatus" class="pattc-vs-help" style="margin-top:7px"></div></div>
        <div class="pattc-vs-card"><h4>Removed / Hidden (${hiddenKeys.length})</h4><div class="pattc-vs-hidden-list">${hiddenKeys.length?hiddenKeys.map(function(k){return '<div class="pattc-vs-hidden-row"><span>'+html_(k.slice(0,55))+'</span><button class="pattc-vs-btn" data-restore-key="'+html_(k)+'">Restore</button></div>';}).join(''):'<div class="pattc-vs-help">Nothing removed from this layout.</div>'}</div></div>
      </div>`;
    bindPanel_(panel);
  }

  function setStatus_(text, error){
    const el=document.getElementById("pattcVsStatus"); if(!el) return;
    el.textContent=String(text||""); el.style.color=error?"#ff8a8a":"#9ee6bc";
  }

  function bindPanel_(panel){
    panel.querySelectorAll("[data-field]").forEach(function(input){
      input.addEventListener("input", function(){
        const item=currentItem_(); if(!item) return;
        let value=input.value;
        if (["borderWidth","borderRadius","padding","gap","fontSize"].indexOf(input.dataset.field)>=0) value=Number(value);
        item.style[input.dataset.field]=value;
        applyManifest_(state.working);
      });
    });
    panel.querySelectorAll("[data-ovs]").forEach(function(button){
      button.addEventListener("click", function(){ action_(button.dataset.ovs); });
    });
    panel.querySelectorAll("[data-restore-key]").forEach(function(button){ button.addEventListener("click",function(){ restoreHidden_(button.dataset.restoreKey); }); });
    const move=panel.querySelector('[data-ovs-select="move"]'); if(move) move.addEventListener("change",function(){ moveSelected_(move.value); });
    const demoState=panel.querySelector('[data-ovs-select="demo-state"]'); if(demoState) demoState.addEventListener("change",function(){ state.demoState=demoState.value; if(state.demo){ disableDemo_(); enableDemo_(); } });
  }

  function startPick_(){ state.picking=true; clearSelectionClass_(); renderPanel_(); }
  function stopPick_(){ state.picking=false; if(state.hover){state.hover.classList.remove("pattc-vs-hover");state.hover=null;} renderPanel_(); }

  function chooseNode_(node){
    if (!node || node.closest && node.closest("#"+OVS_PANEL_ID)) return;
    const chosen = state.selectMode === "section" ? closestSection_(node) : node;
    if (!chosen) return;
    clearSelectionClass_();
    state.selected=chosen; state.selectedKey=stableKey_(chosen);
    state.selectedSection=closestSection_(chosen); state.selectedSectionKey=stableKey_(state.selectedSection);
    chosen.classList.add(state.selectMode === "section" ? "pattc-vs-section-selected" : "pattc-vs-selected");
    currentItem_();
    state.picking=false;
    renderPanel_();
  }

  function clearSelectionClass_(){
    document.querySelectorAll(".pattc-vs-selected,.pattc-vs-section-selected,.pattc-vs-hover").forEach(function(n){n.classList.remove("pattc-vs-selected","pattc-vs-section-selected","pattc-vs-hover");});
  }

  function onPointerMove_(event){
    if(!state.picking) return;
    let node=event.target; if(!node || node.closest && node.closest("#"+OVS_PANEL_ID)) return;
    if(state.selectMode==="section") node=closestSection_(node);
    if(state.hover===node) return;
    if(state.hover) state.hover.classList.remove("pattc-vs-hover");
    state.hover=node; if(node) node.classList.add("pattc-vs-hover");
  }

  function onPickClick_(event){
    if(!state.picking) return;
    if(event.target && event.target.closest && event.target.closest("#"+OVS_PANEL_ID)) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); chooseNode_(event.target);
  }

  function moveSibling_(delta){
    const node=state.selected; if(!node || !node.parentElement) return;
    const siblings=Array.from(node.parentElement.children); const i=siblings.indexOf(node); const j=i+delta; if(j<0||j>=siblings.length)return;
    if(delta<0) node.parentElement.insertBefore(node,siblings[j]); else node.parentElement.insertBefore(siblings[j],node);
    const parentKey=stableKey_(node.parentElement);
    state.working.items[state.selectedKey]=state.working.items[state.selectedKey]||{style:{}};
    state.working.items[state.selectedKey].order={parentKey:parentKey,index:j};
    renderPanel_();
  }

  function moveSelected_(destKey){
    const node=state.selected, dest=resolveKey_(destKey); if(!node||!dest||node===dest||node.contains(dest)) return;
    const target=layoutTarget_(dest); if(!target) return;
    target.appendChild(node); state.working.moves[state.selectedKey]=destKey; state.selectedSection=dest; state.selectedSectionKey=destKey; renderPanel_();
  }

  function hideSelected_(){ if(!state.selectedKey)return; state.working.hidden[state.selectedKey]=true; applyManifest_(state.working); renderPanel_(); }
  function restoreHidden_(key){ if(!key)return; state.working.hidden[key]=false; const node=resolveKey_(key); if(node) node.style.removeProperty("display"); applyManifest_(state.working); renderPanel_(); }

  function setColumns_(count){ const item=currentItem_(); if(!item)return; item.columns=Number(count); applyManifest_(state.working); renderPanel_(); }

  function similarSelector_(node){
    if(!node) return "";
    const cls=meaningfulClasses_(node);
    if(cls.length) return node.tagName.toLowerCase()+"."+cls[0];
    if(node.tagName==="BUTTON") return "button";
    if(/^H[1-6]$/.test(node.tagName)) return "h1,h2,h3,h4,h5,h6";
    return node.tagName.toLowerCase();
  }

  function groupFromSelected_(name, selector){
    const item=currentItem_(); if(!item||!selector)return;
    state.working.groups[name]={selector:selector,style:clone_(item.style||{})};
    state.working.groupMembers[state.selectedKey]=name;
    applyManifest_(state.working); setStatus_("Group style applied to "+name+"."); renderPanel_();
  }

  function savePayload_(manifest){
    manifest=normalizeManifest_(manifest); manifest.pageKey=state.pageKey; manifest.studioVersion=OVS_VERSION;
    manifest.meta=manifest.meta||{}; manifest.meta.updatedAt=new Date().toISOString();
    try { const s=typeof getSession==="function"?getSession():null; manifest.meta.updatedBy=s&&s.username?String(s.username):"admin"; } catch(err){}
    return manifest;
  }

  async function saveOverride_(type, entityId, manifest, active){
    if(typeof apiAdminSaveAppearanceOverride!=="function") throw new Error("Appearance save API is unavailable.");
    const result=await apiAdminSaveAppearanceOverride({gameId:state.storageGameId,entityType:type,entityId:entityId,themeOverride:savePayload_(manifest),active:active!==false});
    try { sessionStorage.removeItem("pattcOwnerVsBundle:"+state.storageGameId); sessionStorage.removeItem("pattcGameAppearance:"+state.storageGameId); } catch(err){}
    return result;
  }

  async function saveDraft_(scope){
    try {
      setStatus_("Saving "+scope+"…");
      if(scope==="element" && state.selectedKey){
        const next=clone_(state.saved||emptyManifest_());
        next.items=next.items||{}; next.items[state.selectedKey]=clone_((state.working.items||{})[state.selectedKey]||{});
        next.hidden=next.hidden||{}; if(state.working.hidden.hasOwnProperty(state.selectedKey)) next.hidden[state.selectedKey]=state.working.hidden[state.selectedKey];
        if(state.working.moves.hasOwnProperty(state.selectedKey)){next.moves=next.moves||{};next.moves[state.selectedKey]=state.working.moves[state.selectedKey];}
        state.saved=normalizeManifest_(next);
      } else if(scope==="section" && state.selectedSectionKey){
        const next=clone_(state.saved||emptyManifest_()); const key=state.selectedSectionKey;
        const section=resolveKey_(key) || state.selectedSection;
        next.items=next.items||{}; next.hidden=next.hidden||{}; next.moves=next.moves||{}; next.groupMembers=next.groupMembers||{}; next.groups=next.groups||{};
        const sectionKeys=new Set([key]);
        Object.keys(state.working.items||{}).forEach(function(candidateKey){
          const node=resolveKey_(candidateKey);
          if(section && node && (node===section || section.contains(node))) sectionKeys.add(candidateKey);
        });
        sectionKeys.forEach(function(candidateKey){
          if(state.working.items.hasOwnProperty(candidateKey)) next.items[candidateKey]=clone_(state.working.items[candidateKey]);
          if(state.working.hidden.hasOwnProperty(candidateKey)) next.hidden[candidateKey]=state.working.hidden[candidateKey];
          if(state.working.moves.hasOwnProperty(candidateKey)) next.moves[candidateKey]=state.working.moves[candidateKey];
          if(state.working.groupMembers.hasOwnProperty(candidateKey)){
            const groupName=state.working.groupMembers[candidateKey];
            next.groupMembers[candidateKey]=groupName;
            if(state.working.groups[groupName]) next.groups[groupName]=clone_(state.working.groups[groupName]);
          }
        });
        next.collapse=next.collapse||{}; if(state.working.collapse.hasOwnProperty(key)) next.collapse[key]=clone_(state.working.collapse[key]);
        next.generatedSections=next.generatedSections||{};
        Object.keys(state.working.generatedSections||{}).forEach(function(sectionId){
          const generatedKey="generated:"+sectionId; const generated=resolveKey_(generatedKey);
          if(generated && section && (generated===section || section.contains(generated))) next.generatedSections[sectionId]=clone_(state.working.generatedSections[sectionId]);
        });
        state.saved=normalizeManifest_(next);
      } else state.saved=normalizeManifest_(clone_(state.working));
      await saveOverride_(OVS_DRAFT_TYPE,state.pageKey,state.saved,true);
      setStatus_("Saved "+scope+" draft. Available on both Macs.");
    } catch(err){ setStatus_(err&&err.message?err.message:String(err),true); }
  }

  async function publish_(){
    try {
      setStatus_("Publishing page…");
      state.published=normalizeManifest_(clone_(state.working));
      await saveOverride_(OVS_PUBLISHED_TYPE,state.pageKey,state.published,true);
      const versionId=state.pageKey+"::"+Date.now();
      await saveOverride_(OVS_VERSION_TYPE,versionId,state.published,true);
      state.saved=clone_(state.published);
      await saveOverride_(OVS_DRAFT_TYPE,state.pageKey,state.saved,true);
      setStatus_("Published. Player layout updated without GitHub/clasp.");
    } catch(err){ setStatus_(err&&err.message?err.message:String(err),true); }
  }

  function revertSaved_(){ state.working=normalizeManifest_(clone_(state.saved||emptyManifest_())); resetApplied_(); applyManifest_(state.working); renderPanel_(); setStatus_("Reverted to last saved draft."); }
  function originalPreview_(){ state.working=emptyManifest_(); state.working.pageKey=state.pageKey; resetApplied_(); renderPanel_(); setStatus_("Original PATTC layout preview. Publish only if you want this live."); }

  function resetApplied_(){
    document.querySelectorAll(".pattc-vs-generated-section[data-pattc-vs-generated]").forEach(function(node){node.remove();});
    const snapshots = Array.from(state.originalSnapshots.entries());
    // Restore parent/index before styles so layout targets return to their original DOM structure.
    snapshots.forEach(function(entry){
      const node=entry[0], snap=entry[1]||{};
      if(!node) return;
      if(snap.parent && snap.parent.isConnected && node.parentElement !== snap.parent){
        const children=Array.from(snap.parent.children).filter(function(child){return child!==node;});
        snap.parent.insertBefore(node, children[Math.max(0,Math.min(Number(snap.index)||0,children.length))] || null);
      }
      if(node.tagName === "DETAILS" && snap.open != null) node.open=!!snap.open;
      if(snap.style == null) node.removeAttribute("style"); else node.setAttribute("style",snap.style);
      node.classList.remove("pattc-vs-layout-grid","pattc-vs-selected","pattc-vs-section-selected","pattc-vs-hover");
    });
    state.originalSnapshots.clear();
    if(typeof scheduleAppAppearanceRevalidation_==="function") { try{scheduleAppAppearanceRevalidation_("visual-studio-reset");}catch(err){} }
  }

  function enableDemo_(){
    const app=document.getElementById("app"); if(!app)return; state.demo=true; app.classList.add(OVS_DEMO_CLASS); app.setAttribute("data-pattc-vs-demo-state",state.demoState);
    state.demoText=new Map();
    app.querySelectorAll("span,strong,b,small,div,p").forEach(function(node){
      if(node.children.length || !node.className) return;
      const cls=String(node.className||"").toLowerCase(); const text=String(node.textContent||"").trim(); let replacement="";
      if(/score/.test(cls)) replacement=state.demoState==="final"?"24–17":state.demoState==="live"?"17–14":"0–0";
      else if(/rank|place/.test(cls)) replacement="#3";
      else if(/point|total/.test(cls)) replacement="127 pts";
      else if(/confidence/.test(cls)) replacement="14";
      else if(/record/.test(cls)) replacement="8–3";
      else if(/bank|credit|balance/.test(cls)) replacement="1,000 credits";
      else if(/status|state/.test(cls)) replacement=state.demoState==="live"?"LIVE · Q3 06:42":state.demoState==="final"?"FINAL":state.demoState==="locked"?"LOCKED":"OPEN";
      else if(!text && /name|player|team/.test(cls)) replacement="Demo Player";
      if(replacement){state.demoText.set(node,node.textContent);node.textContent=replacement;}
    });
    let badge=document.querySelector(".pattc-vs-demo-badge"); if(!badge){badge=document.createElement("div");badge.className="pattc-vs-demo-badge";document.body.appendChild(badge);} badge.textContent="DEMO DATA · "+state.demoState.toUpperCase();
    renderPanel_();
  }

  function disableDemo_(){ state.demoText.forEach(function(value,node){if(node&&node.isConnected)node.textContent=value;}); state.demoText=new Map(); state.demo=false; const app=document.getElementById("app");if(app){app.classList.remove(OVS_DEMO_CLASS);app.removeAttribute("data-pattc-vs-demo-state");} const badge=document.querySelector(".pattc-vs-demo-badge");if(badge)badge.remove(); }


  function selectWholePage_(){
    const app=document.getElementById("app"); if(!app)return;
    state.selectMode="section"; chooseNode_(app);
  }

  function createSection_(){
    if(!state.working)return;
    let title="New Section";
    try { const entered=window.prompt("New section name",title); if(entered===null)return; title=String(entered||title).trim()||title; } catch(err){}
    const id="section-"+Date.now().toString(36);
    const parent=state.selectedSection || document.getElementById("app");
    state.working.generatedSections=state.working.generatedSections||{};
    state.working.generatedSections[id]={title:title,parentKey:parent?stableKey_(parent):"id:app",afterKey:state.selected?stableKey_(state.selected):""};
    applyManifest_(state.working);
    const created=resolveKey_("generated:"+id); if(created){state.selectMode="section";chooseNode_(created);}
    setStatus_("New section created. Move elements into it, then Save Page Draft.");
  }

  function action_(name){
    if(name==="close"){closeStudio_();return;} if(name==="pick"){state.picking?stopPick_():startPick_();return;}
    if(name==="mode-element"){state.selectMode="element";renderPanel_();return;} if(name==="mode-section"){state.selectMode="section";renderPanel_();return;} if(name==="select-page"){selectWholePage_();return;}
    if(name==="col-1"||name==="col-2"||name==="col-3"){setColumns_(Number(name.slice(-1)));return;}
    if(name==="up"){moveSibling_(-1);return;} if(name==="down"){moveSibling_(1);return;} if(name==="new-section"){createSection_();return;} if(name==="hide"){hideSelected_();return;}
    if(name==="similar"){groupFromSelected_("Similar · "+similarSelector_(state.selected),similarSelector_(state.selected));return;}
    if(name==="universal-button"){groupFromSelected_("Universal Buttons","button,.button,[role='button']");return;}
    if(name==="universal-header"){groupFromSelected_("Universal Headers","h1,h2,h3,h4,summary");return;}
    if(name==="universal-section"){groupFromSelected_("Universal Sections","section,details,.card,.panel");return;}
    if(name==="preview-open"&&state.selected&&state.selected.tagName==="DETAILS"){state.selected.open=true;return;}
    if(name==="preview-closed"&&state.selected&&state.selected.tagName==="DETAILS"){state.selected.open=false;return;}
    if(name==="default-open"&&state.selectedKey){state.working.collapse[state.selectedKey]={defaultOpen:true};state.selected.open=true;renderPanel_();return;}
    if(name==="default-closed"&&state.selectedKey){state.working.collapse[state.selectedKey]={defaultOpen:false};state.selected.open=false;renderPanel_();return;}
    if(name==="demo"){state.demo?disableDemo_():enableDemo_();renderPanel_();return;}
    if(name==="save-element"){saveDraft_("element");return;} if(name==="save-section"){saveDraft_("section");return;} if(name==="save-page"){saveDraft_("page");return;} if(name==="publish"){publish_();return;}
    if(name==="last-saved"){revertSaved_();return;} if(name==="original"){originalPreview_();return;}
  }

  async function openStudio_(){
    if(!isAdmin_())return; injectStyle_(); state.open=true; await loadScope_(true); state.working=clone_(state.saved||state.published||emptyManifest_()); applyManifest_(state.working); renderPanel_();
  }
  function closeStudio_(){ state.open=false;state.picking=false;clearSelectionClass_();disableDemo_();const panel=document.getElementById(OVS_PANEL_ID);if(panel)panel.remove();state.working=clone_(state.published||emptyManifest_());resetApplied_();applyManifest_(state.published||emptyManifest_()); }

  function mutationRefresh_(mutations){
    if(state.applying)return;
    if (Array.isArray(mutations) || (mutations && typeof mutations.length === "number")) {
      const list = Array.from(mutations || []);
      if (list.length && list.every(function(m){
        const t = m && m.target && m.target.nodeType === 1 ? m.target : null;
        return !!(t && ((t.closest && t.closest("#"+OVS_PANEL_ID)) || t.id === OVS_LAUNCH_ID));
      })) return;
    }
    clearTimeout(state.refreshTimer); state.refreshTimer=setTimeout(function(){
      ensureLaunch_(); annotate_(); const scope=scopeKey_(); if(scope!==state.scopeKey) loadScope_(true); else applyManifest_(state.open&&isAdmin_()?state.working:state.published); if(state.open) renderPanel_();
    },90);
  }

  function init_(){
    injectStyle_(); ensureLaunch_(); annotate_();
    document.addEventListener("pointermove",onPointerMove_,true); document.addEventListener("click",onPickClick_,true);
    window.addEventListener("hashchange",function(){setTimeout(function(){loadScope_(true);},50);});
    if(!state.observer){state.observer=new MutationObserver(mutationRefresh_);state.observer.observe(document.body,{childList:true,subtree:true});}
    loadScope_(true);
    window.PATTC_OWNER_VISUAL_STUDIO={version:OVS_VERSION,open:openStudio_,close:closeStudio_,reload:function(){return loadScope_(true);},getWorking:function(){return clone_(state.working);},apply:function(manifest){state.working=normalizeManifest_(manifest);applyManifest_(state.working);renderPanel_();}};
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init_); else setTimeout(init_,0);
})();
