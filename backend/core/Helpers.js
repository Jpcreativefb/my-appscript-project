/* =========================
   CORE HELPERS
========================= */

/**
 * Safe sheet getter
 */
function getSheet(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error(`Missing sheet: ${name}`);
  return sh;
}

/**
 * Build header map (STANDARDIZED)
 */
function getHeaderMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    map[String(h).trim()] = i;
  });
  return map;
}

/**
 * String slug generator
 */
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* =========================
   USER NORMALIZATION
========================= */
function normalizeUser(user) {
  return {
    username: String(user.username || "").trim(),
    pin: String(user.pin || "").trim(),
    isAdmin: (
      user.isAdmin === true ||
      user.isAdmin === "true" ||
      user.isAdmin === "TRUE" ||
      user.isAdmin === 1 ||
      user.isAdmin === "Yes" ||
      user.isAdmin === "yes"
    ),
    avatar: user.avatar || "",
    themeColor: user.themeColor || "",
    createdAt: new Date().toISOString()
  };
}

/* =========================
   CATEGORY CACHE
========================= */
function getCategoriesCached() {
  const cache = CacheService.getScriptCache();
  const key = "categories_v2";

  const cached = cache.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  const categories = getCategories();
  cache.put(key, JSON.stringify(categories), 120);

  return categories;
}
