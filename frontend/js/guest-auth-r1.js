/* Guest Access R1 — additive auth UI; do not modify accepted login baseline. */
(function () {
  "use strict";
  const originalShowAuthView = window.showAuthView;
  if (typeof originalShowAuthView !== "function") return;

  window.showAuthView = function(view) {
    originalShowAuthView(view === "guest" ? "login" : view);
    const guest = document.getElementById("guestView");
    if (!guest) return;
    guest.classList.toggle("hidden", view !== "guest");
    if (view !== "guest") return;
    const login = document.getElementById("loginForm");
    if (login) login.classList.add("hidden");
    document.querySelectorAll(".auth-tab").forEach(tab => {
      const active = tab.getAttribute("data-auth-view") === "guest";
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    const subtitle = document.getElementById("authSubtitle");
    if (subtitle) subtitle.innerText = "Join or return as a guest";
  };

  let guestBusy = false;
  async function guestAuth(returning) {
    if (guestBusy) return;
    const name = String(document.getElementById("guestName")?.value || "").trim();
    const pin = String(document.getElementById("guestPin")?.value || "").trim();
    if (name.length < 3 || !/^[0-9]{4}$/.test(pin)) {
      window.setAuthMessage("Enter a guest name and 4-digit PIN.");
      return;
    }
    guestBusy = true;
    window.setAuthMessage("");
    try {
      const res = returning ? await window.apiGuestLogin(name,pin) : await window.apiGuestSignup(name,pin);
      if (!res || !res.success) {
        window.setAuthMessage((res && (res.message || res.error)) ||
          "Unable to join. If you've used this name before, choose Returning Guest.");
        return;
      }
      const loginRes = returning ? res : await window.apiGuestLogin(name,pin);
      if (!loginRes || !loginRes.success || loginRes.accountType !== "guest") {
        window.setAuthMessage("Guest created. Choose Returning Guest to sign in.");
        return;
      }
      const saved = {...loginRes,rememberMe:true,validatedAt:Date.now()};
      if (typeof window.setSession === "function") {
        window.setSession(saved);
      } else {
        localStorage.setItem("session",JSON.stringify(saved));
      }
      window.location.href = "./app.html#dashboard";
    } catch(err) {
      window.setAuthMessage("Connection error. Please try again.");
    } finally {
      guestBusy = false;
    }
  }
  window.joinAsGuest = () => guestAuth(false);
  window.returnAsGuest = () => guestAuth(true);
})();
