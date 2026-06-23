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

}

function showAuthView(view){

  const views = [
    "login",
    "signup",
    "reset"
  ];

  views.forEach(name => {

    document
      .getElementById(name + "View")
      .classList
      .toggle(
        "hidden",
        name !== view
      );

  });

  document
    .querySelectorAll(".auth-tab")
    .forEach((tab, index) => {

      tab.classList.toggle(
        "active",
        views[index] === view
      );

    });

  const subtitles = {
    login: "Sign in to continue",
    signup: "Create your account",
    reset: "Reset your PIN"
  };

  document.getElementById("authSubtitle").innerText =
    subtitles[view] || "Awards App";

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

async function login(){

  const username =
    document
      .getElementById("username")
      .value
      .trim();

  const pin =
    document
      .getElementById("pin")
      .value
      .trim();

  const rememberInput =
    document.getElementById(
      "rememberDevice"
    );

  const rememberMe =
    rememberInput
      ? rememberInput.checked
      : true;

  setAuthMessage("");

  if(!username || !pin){

    setAuthMessage(
      "Enter your username, email, or phone and PIN"
    );

    return;

  }

  try{

    const res =
      await apiLogin(
        username,
        pin,
        rememberMe
      );

    if(!res.success){

      setAuthMessage(
        res.message || "Invalid login"
      );

      return;

    }

    if (
      typeof setSession === "function"
    ) {

      setSession(res);

    } else {

      localStorage.setItem(
        "session",
        JSON.stringify(res)
      );

    }

    window.location.href =
      "./app.html";

  }catch(err){

    console.error(err);

    setAuthMessage(
      "Connection error"
    );

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

  const email =
    document
      .getElementById("signupEmail")
      .value
      .trim();

  const phone =
    document
      .getElementById("signupPhone")
      .value
      .trim();

  const pin =
    document
      .getElementById("signupPin")
      .value
      .trim();

  const contactMethod =
    getSelectedSignupContactMethod();

  setAuthMessage("");

  if(!username || !pin){

    setAuthMessage(
      "Enter username and PIN"
    );

    return;

  }

  if(contactMethod === "email" && !email){

    setAuthMessage(
      "Enter an email or choose Play only / Phone only"
    );

    return;

  }

  if(contactMethod === "phone" && !phone){

    setAuthMessage(
      "Enter a phone number or choose Play only / Email"
    );

    return;

  }

  try{

    const res =
      await apiSignup(
        username,
        realName,
        pin,
        email,
        phone,
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

      window.location.href =
        "./app.html";

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
   REMEMBERED LOGIN
========================= */

async function redirectRememberedSession_(){

  if (
    typeof getSession !== "function"
  ) {
    return;
  }

  const session =
    getSession();

  if (
    !session ||
    !session.token
  ) {
    return;
  }

  if (
    typeof apiValidateSession !== "function"
  ) {

    window.location.href =
      "./app.html";

    return;

  }

  try {

    const res =
      await apiValidateSession(
        session.token
      );

    if (
      res &&
      res.success
    ) {

      setSession({
        ...session,
        ...res
      });

      window.location.href =
        "./app.html";

      return;

    }

    const message =
      res && res.message
        ? String(res.message)
        : "";

    if (
      message
        .toLowerCase()
        .indexOf("network") > -1
    ) {

      window.location.href =
        "./app.html";

      return;

    }

    clearSession();

  } catch (err) {

    console.warn(
      "Remembered login validation failed",
      err
    );

  }

}

document.addEventListener(
  "DOMContentLoaded",
  redirectRememberedSession_
);
