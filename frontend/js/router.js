const ROUTES = {

    dashboard: {
      html: "./pages/dashboard.html",
      js: "./js/pages/dashboard.js"
    },
  
    picks: {
      html: "./pages/picks.html",
      js: "./js/pages/picks.js"
    }
  
  };
  
  async function navigate(page){
  
    const route =
      ROUTES[page];
  
    if(!route){
      return;
    }
  
    showLoader();
  
    try{
  
      const html =
        await fetch(
          route.html
        ).then(r => r.text());
  
      document.getElementById(
        "app"
      ).innerHTML = html;
  
      await loadScript(route.js);
  
      history.pushState(
        {},
        "",
        `#${page}`
      );
  
    }catch(err){
  
      console.error(err);
  
      document.getElementById(
        "app"
      ).innerHTML = `
        <div class="card">
          Failed to load page
        </div>
      `;
    }
  
    hideLoader();
  }
  
  function loadScript(src){
  
    return new Promise((resolve,reject)=>{
  
      const old =
        document.querySelector(
          `script[data-page="${src}"]`
        );
  
      if(old){
        old.remove();
      }
  
      const script =
        document.createElement("script");
  
      script.src = src;
  
      script.dataset.page = src;
  
      script.onload = resolve;
  
      script.onerror = reject;
  
      document.body.appendChild(script);
  
    });
  }
  
  function showLoader(){
  
    document
      .getElementById("loader")
      .classList
      .remove("hidden");
  }
  
  function hideLoader() {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.display = "none";
    }
  }