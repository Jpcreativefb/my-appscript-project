/* ======================
   FRONTEND UTILITIES
====================== */

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function escapeAttr(value) {

  return escapeHtml(value);

}

function escapeJs(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

}/* ======================
   FRONTEND UTILITIES
====================== */

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function escapeAttr(value) {

  return escapeHtml(value);

}

function escapeJs(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

}

/* ======================
   DEBUG HELPERS
====================== */

function isDebugMode() {

  return Boolean(
    typeof CONFIG !== "undefined" &&
    CONFIG.DEBUG === true
  );

}

function debugLog() {

  if (!isDebugMode()) {
    return;
  }

  console.log.apply(
    console,
    arguments
  );

}

function debugWarn() {

  if (!isDebugMode()) {
    return;
  }

  console.warn.apply(
    console,
    arguments
  );

}