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
  
    const error =
      document.getElementById("error");
  
    error.classList.add("hidden");
  
    if(!username || !pin){
      error.innerText =
        "Enter username and PIN";
  
      error.classList.remove("hidden");
  
      return;
    }
  
    try{
  
      const res =
        await apiLogin(
          username,
          pin
        );
  
      if(!res.success){
  
        error.innerText =
          "Invalid login";
  
        error.classList.remove("hidden");
  
        return;
      }
  
      localStorage.setItem(
        "session",
        JSON.stringify(res)
      );
  
      window.location.href =
        "./app.html";
  
    }catch(err){
  
      console.error(err);
  
      error.innerText =
        "Connection error";
  
      error.classList.remove("hidden");
    }
  }