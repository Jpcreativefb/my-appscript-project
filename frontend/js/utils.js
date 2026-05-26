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

/* ======================
   UI STATE HELPERS
====================== */

function renderErrorCard(
  title,
  message
) {

  return `
    <div class="card error-card">
      <h2>${escapeHtml(title || "Something went wrong")}</h2>
      <p>${escapeHtml(message || "Please try again.")}</p>
    </div>
  `;

}

function renderEmptyCard(
  message
) {

  return `
    <div class="card empty-card">
      <p>${escapeHtml(message || "Nothing found.")}</p>
    </div>
  `;

}

function isApiError(
  res
) {

  return Boolean(
    res &&
    (
      res.success === false ||
      res.error === true
    )
  );

}

function getApiErrorMessage(
  res,
  fallback
) {

  return (
    res &&
    (
      res.message ||
      res.error
    )
  ) || fallback || "Request failed.";

}