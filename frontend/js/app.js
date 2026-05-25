/* ======================
   SESSION BOOTSTRAP
====================== */

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("session"));
  } catch (e) {
    return null;
  }
}

/* ======================
   START APP
====================== */

document.addEventListener("DOMContentLoaded", () => {

  const session = getSession();

  // 🔒 AUTH GUARD
  if (!session || !session.username) {
    window.location.href = "./index.html";
    return;
  }

  // 👤 HEADER USER
  const headerUser = document.getElementById("headerUser");
  if (headerUser) {
    headerUser.innerText = session.username;
  }

  // 🚀 INIT APP
  initApp(session);

});


/* ======================
   INIT APP
====================== */

function initApp(session) {

  console.log("🚀 App initialized");

  hideLoader();

  bindGlobalEvents();

  // initial route
  const hash = window.location.hash.replace("#", "");
  navigate(hash || "dashboard");
}


/* ======================
   LOADER CONTROL
====================== */

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.add("hidden");
  }
}

function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.remove("hidden");
  }
}


/* ======================
   LOGOUT
====================== */

function logout() {
  localStorage.removeItem("session");
  window.location.href = "./index.html";
}


/* ======================
   NAVIGATION CORE
====================== */

function navigate(page) {

  if (!page) page = "dashboard";

  const app =
    document.getElementById("app");

  app.classList.add("page-enter");

  showLoader();

  window.location.hash = page;

  setTimeout(() => {

    renderPage(page);

    requestAnimationFrame(() => {

      app.classList.remove("page-enter");

      app.classList.add("page-enter-active");

      hideLoader();

      setActiveNav(page);

    });

  }, 120);
}

/* ======================
   ACTIVE NAV
====================== */

function setActiveNav(page) {

  document
    .querySelectorAll(".bottom-nav button")
    .forEach(btn => {

      btn.classList.remove("active");

      if (
        btn.dataset.page === page
      ) {
        btn.classList.add("active");
      }

    });
}


/* ======================
   PAGE ROUTER
====================== */

async function renderPage(page) {

  const app =
    document.getElementById("app");

  APP_STATE.currentPage = page;

  switch (page) {

    case "dashboard":

      app.innerHTML =
        renderDashboardPage();

      break;

    case "picks":

      app.innerHTML =
        await renderPicksPage();

      break;

    case "leaderboard":

      app.innerHTML =
        await renderLeaderboardPage();

      break;

    default:

      app.innerHTML =
        "<h2>Page Not Found</h2>";
  }
}


/* ======================
   SAMPLE PAGES (TEMP PLACEHOLDERS)
====================== */

function renderDashboard() {
  return `
    <h1>Dashboard</h1>
    <p>Welcome to the app</p>
  `;
}

function renderPicks() {
  return `
    <h1>Picks</h1>
    <p>Picks page loaded</p>
  `;
}


/* ======================
   GLOBAL EVENT BINDING
====================== */

function bindGlobalEvents() {

  console.log("🔗 Binding navigation");

  // Example: safe nav binding if needed later
  document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      console.log("Button clicked:", btn.innerText);
    });
  });

}