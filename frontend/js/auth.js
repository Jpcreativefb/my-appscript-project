function setAuthMessage(message, type){

  const el =
    document.getElementById("authMessage");

  el.innerText =
    message || "";

  el.classList.toggle(
    "hidden",
    !message
  );

  el.classList.toggle(
    "success",
    type === "success"
  );

  el.classList.toggle(
    "status",
    type === "status"
  );

}

function showAuthView(view){

  const views = [
    "login",
    "signup",
    "guest",
    "reset"
  ];

  const viewIds = {
    login: "loginForm",
    signup: "signupView",
    guest: "guestView",
    reset: "resetView"
  };

  if (views.indexOf(view) < 0) view = "login";

  views.forEach(name => {

    const panel = document.getElementById(viewIds[name]);
    if (!panel) return;

    panel.classList.toggle(
      "hidden",
      name !== view
    );

  });

  document
    .querySelectorAll(".auth-tab")
    .forEach((tab, index) => {

      const tabView = tab.getAttribute("data-auth-view") || views[index];

      tab.classList.toggle(
        "active",
        tabView === view
      );

      tab.setAttribute(
        "aria-selected",
        tabView === view ? "true" : "false"
      );

    });

  const subtitles = {
    login: "Sign in to continue",
    signup: "Create your account",
    guest: "Join or return as a guest",
    reset: "Reset your PIN"
  };

  document.getElementById("authSubtitle").innerText =
    subtitles[view] || "PATTC Predicts";

  setAuthMessage("");

}

function getSelectedSignupContactMethod(){

  const selected =
    document.querySelector(
      "input[name='signupContactMethod']:checked"
    );

  return selected
    ? selected.value
    : "none";

}

let AUTH_LOGIN_IN_FLIGHT = false;

function setLoginBusy_(busy, label) {
  const button = document.getElementById("loginButton");
  const loginView = document.getElementById("loginView");
  AUTH_LOGIN_IN_FLIGHT = !!busy;

  if (button) {
    button.disabled = !!busy;
    button.classList.toggle("is-loading", !!busy);
    const text = button.querySelector(".auth-button-text");
    if (text) text.textContent = label || (busy ? "Signing in…" : "Sign In");
  }

  if (loginView) {
    loginView.setAttribute("aria-busy", busy ? "true" : "false");
  }
}

function showLoginCard_(message) {
  const boot = document.getElementById("authBoot");
  const card = document.getElementById("authCard");
  if (boot) boot.classList.add("hidden");
  if (card) card.classList.remove("auth-card-hidden");
  document.body.classList.remove("auth-booting");
  if (message) setAuthMessage(message);
}

function setAuthBoot_(title, detail) {
  const titleEl = document.getElementById("authBootTitle");
  const detailEl = document.getElementById("authBootDetail");
  if (titleEl) titleEl.textContent = title || "Opening PATTC Predicts";
  if (detailEl) detailEl.textContent = detail || "Checking this device…";
}

async function login(){

  if (AUTH_LOGIN_IN_FLIGHT) return;

  const username = document.getElementById("username").value.trim();
  const pin = document.getElementById("pin").value.trim();
  const rememberInput = document.getElementById("rememberDevice");
  const rememberMe = rememberInput ? rememberInput.checked : true;

  setAuthMessage("");

  if(!username || !pin){
    setAuthMessage("Enter your username, email, or phone and PIN");
    return;
  }

  setLoginBusy_(true, "Signing in…");
  setAuthMessage("Securely checking your account…", "status");

  try{
    const res = await apiLogin(username, pin, rememberMe);

    if(!res.success){
      setAuthMessage(res.message || res.error || "Invalid login");
      setLoginBusy_(false, "Sign In");
      return;
    }

    if (typeof setSession === "function") {
      setSession({ ...res, rememberMe: rememberMe, validatedAt: Date.now() });
    } else {
      localStorage.setItem("session", JSON.stringify({ ...res, rememberMe, createdAt: Date.now(), validatedAt: Date.now() }));
    }

    setAuthMessage("Signed in ✓ Opening app…", "success");
    setLoginBusy_(true, "Signed in ✓");
    window.location.replace("./app.html");

  }catch(err){
    console.error(err);
    setAuthMessage("Could not reach the app. Check your connection and try again.");
    setLoginBusy_(false, "Sign In");
  }
}

async function signup(){

  const username =
    document
      .getElementById("signupUsername")
      .value
      .trim();

  const realName =
    document
      .getElementById("signupRealName")
      .value
      .trim();

  const pin =
    document
      .getElementById("signupPin")
      .value
      .trim();

  const contactMethod = "none";

  setAuthMessage("");

  if(!username || !pin){

    setAuthMessage(
      "Enter username and PIN"
    );

    return;

  }

  if (!/^\d{4}$/.test(pin)) {
    setAuthMessage("Choose a 4-digit PIN");
    return;
  }

  try{

    const res =
      await apiSignup(
        username,
        realName,
        pin,
        "",
        "",
        contactMethod
      );

    if(!res.success){

      setAuthMessage(
        res.message || "Could not create account"
      );

      return;

    }

    const loginRes =
      await apiLogin(
        username,
        pin,
        true
      );

    if(loginRes.success){

      if (
        typeof setSession === "function"
      ) {

        setSession(loginRes);

      } else {

        localStorage.setItem(
          "session",
          JSON.stringify(loginRes)
        );

      }

      try {
        localStorage.setItem("profileOnboardingGeneral", "1");
      } catch (err) {}

      window.location.href =
        "./app.html#profile";

      return;

    }

    showAuthView("login");

    setAuthMessage(
      "Account created. Log in to continue.",
      "success"
    );

  }catch(err){

    console.error(err);

    setAuthMessage(
      "Connection error"
    );

  }

}

async function requestPinReset(){

  const identifier =
    document
      .getElementById("resetIdentifier")
      .value
      .trim();

  if(!identifier){

    setAuthMessage(
      "Enter your username or email"
    );

    return;

  }

  try{

    const res =
      await apiRequestPinReset(
        identifier
      );

    setAuthMessage(
      res.message || "If that account exists and has email, a reset code was sent.",
      "success"
    );

  }catch(err){

    console.error(err);

    setAuthMessage(
      "Connection error"
    );

  }

}

async function resetPin(){

  const identifier =
    document
      .getElementById("resetIdentifier")
      .value
      .trim();

  const resetCode =
    document
      .getElementById("resetCode")
      .value
      .trim();

  const newPin =
    document
      .getElementById("newPin")
      .value
      .trim();

  if(!identifier || !resetCode || !newPin){

    setAuthMessage(
      "Enter username/email, reset code, and new PIN"
    );

    return;

  }

  try{

    const res =
      await apiResetPin(
        identifier,
        resetCode,
        newPin
      );

    if(!res.success){

      setAuthMessage(
        res.message || "Could not reset PIN"
      );

      return;

    }

    showAuthView("login");

    setAuthMessage(
      "PIN reset. Log in with your new PIN.",
      "success"
    );

  }catch(err){

    console.error(err);

    setAuthMessage(
      "Connection error"
    );

  }

}




/* =========================
   REMEMBERED DEVICE LOGIN — v1.2.18a
========================= */

async function redirectRememberedSession_(){
  if (typeof getSession !== "function") {
    showLoginCard_();
    return;
  }

  const session = getSession();

  if (!session || !session.token) {
    showLoginCard_();
    return;
  }

  const name = session.displayName || session.realName || session.username || "";
  setAuthBoot_(name ? "Welcome back, " + name : "Welcome back", "Checking this device…");

  // A just-validated session coming back from app.html does not need another
  // round-trip just because the user refreshed the login URL.
  if (session.validatedAt && Date.now() - Number(session.validatedAt) < 5 * 60 * 1000) {
    window.location.replace("./app.html");
    return;
  }

  try {
    const res = await apiValidateSession(session.token);

    if (res && res.success) {
      setSession({ ...session, ...res, validatedAt: Date.now() });
      window.location.replace("./app.html");
      return;
    }

    clearSession();
    showLoginCard_(res && res.message ? res.message : "Your saved sign-in expired. Sign in again.");
  } catch (err) {
    console.warn("Remembered login validation failed", err);

    // A temporary network/Apps Script hiccup should not force an otherwise
    // unexpired remembered device back through the PIN screen.
    if (typeof isSessionValid === "function" && isSessionValid(session)) {
      window.location.replace("./app.html");
      return;
    }

    clearSession();
    showLoginCard_("Could not restore your saved sign-in. Please sign in again.");
  }
}

function bindAuthLoginForm_() {
  const form = document.getElementById("loginForm");
  if (form) {
    form.addEventListener("submit", function(event) {
      event.preventDefault();
      login();
    });
  }
}

function bindAuthTabs_() {
  document.querySelectorAll(".auth-tab[data-auth-view]").forEach(function(tab) {
    tab.addEventListener("click", function(event) {
      event.preventDefault();
      showAuthView(tab.getAttribute("data-auth-view") || "login");
    });
  });
}

document.addEventListener("DOMContentLoaded", function() {
  bindAuthLoginForm_();
  bindAuthTabs_();
  redirectRememberedSession_();
});


// Guest sign-in uses server-derived usernames and server-owned account roles.
let AUTH_GUEST_BUSY_ = false;
async function guestAuth_(returning) {
  if (AUTH_GUEST_BUSY_) return;
  const name = String(document.getElementById("guestName")?.value || "").trim();
  const pin = String(document.getElementById("guestPin")?.value || "").trim();
  if (name.length < 3 || !/^\d{4}$/.test(pin)) {
    setAuthMessage("Enter a guest name and 4-digit PIN.");
    return;
  }
  AUTH_GUEST_BUSY_ = true;
  setAuthMessage("");
  try {
    const res = returning ? await apiGuestLogin(name, pin) : await apiGuestSignup(name, pin);
    if (!res || !res.success) {
      setAuthMessage((res && (res.message || res.error)) || "Guest sign-in failed.");
      return;
    }
    const loginRes = returning ? res : await apiGuestLogin(name, pin);
    if (!loginRes || !loginRes.success || loginRes.accountType !== "guest") {
      setAuthMessage("Guest was created. Please try Returning Guest to sign in.");
      return;
    }
    if (typeof setSession === "function") {
      setSession({...loginRes, rememberMe:true, validatedAt:Date.now()});
    } else {
      localStorage.setItem("session",JSON.stringify({...loginRes,rememberMe:true,validatedAt:Date.now()}));
    }
    window.location.href = "./app.html#home";
  } catch (err) {
    setAuthMessage("Could not reach PATTC. Please try again.");
  } finally {
    AUTH_GUEST_BUSY_ = false;
  }
}
function joinAsGuest(){return guestAuth_(false);}
function returnAsGuest(){return guestAuth_(true);}
