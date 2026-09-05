
/* PATTC RC24A R2 — shared Sports shell renderer */
(function(global){
  "use strict";
  function esc(v){
    return String(v===undefined||v===null?"":v)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function attr(js){return js?` onclick="${js}"`:"";}
  function render(c){
    c=c||{};
    return `<section class="sports-shell ${esc(c.className||"")}">
      <div class="sports-shell-topbar">
        <button type="button" class="sports-shell-menu" aria-label="Sports menu"${attr(c.menuAction)}></button>
        <div class="sports-shell-wordmark" aria-label="PATTC Sports"><strong>PATTC</strong><small>SPORTS</small></div>
        <div class="sports-shell-account">
          <div class="sports-shell-points"><b>P</b><span>${esc(c.pointsLabel||"—")}</span></div>
          <button type="button" class="sports-shell-sync"${attr(c.syncAction)}>SYNC ↻</button>
        </div>
      </div>
      <div class="sports-shell-identity">
        <div class="sports-shell-badge"><span>${esc(c.badgeText||"SP")}</span></div>
        <div class="sports-shell-title"><h1>${esc(c.title||"SPORTS")}</h1><p>${esc(c.subtitle||"")}</p></div>
        <span class="sports-shell-league">${esc(c.league||"NFL")}</span>
      </div>
      ${c.featureHtml||""}
    </section>`;
  }
  global.PATTCSportsShell={render,escape:esc};
})(window);
