async function login() {

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

  const error =
    document.getElementById("error");

  error.classList.add("hidden");
  error.innerText = "";

  if (!username || !pin) {

    error.innerText =
      "Enter username and PIN";

    error.classList.remove("hidden");

    return;

  }

  try {

    console.log(
      "LOGIN START",
      {
        username:
          username
      }
    );

    const res =
      await apiLogin(
        username,
        pin
      );

    console.log(
      "LOGIN RESPONSE",
      res
    );

    if (!res || res.success === false) {

      error.innerText =
        res && (res.message || res.error)
          ? res.message || res.error
          : "Invalid login";

      error.classList.remove("hidden");

      return;

    }

    setSession({
      ...res,
      createdAt:
        Date.now()
    });

    window.location.href =
      "./app.html";

  } catch (err) {

    console.error(
      "LOGIN ERROR",
      err
    );

    error.innerText =
      err && err.message
        ? err.message
        : "Connection error";

    error.classList.remove("hidden");

  }

}