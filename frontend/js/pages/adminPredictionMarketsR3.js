/* PATTC Prediction Market Admin Manager R3 — operational Admin surface only. */
(function(root) {
  "use strict";

  var STATE = { markets: [], editingMarketId: "" };
  function s(v) { return String(v == null ? "" : v).trim(); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function market(id) { return STATE.markets.find(function(row){ return s(row.marketId) === s(id); }) || null; }
  function statusClass(status) { return "admin-pill " + s(status).toLowerCase(); }
  function message(text, state) {
    var node = document.getElementById("adminPredictionMarketMessage");
    if (!node) return;
    node.textContent = s(text);
    node.setAttribute("data-state", s(state));
  }
  function value(form, name) { var f=form&&form.elements?form.elements[name]:null; return s(f&&f.value); }
  function numberValue(form, name) { var v=value(form,name); return v === "" ? "" : Number(v); }
  function isoValue(form, name) { var v=value(form,name); if (!v) return ""; var d=new Date(v); return isNaN(d.getTime()) ? v : d.toISOString(); }
  function localDateTime(iso) { if (!iso) return ""; var d=new Date(iso); if (isNaN(d.getTime())) return ""; var z=new Date(d.getTime()-d.getTimezoneOffset()*60000); return z.toISOString().slice(0,16); }
  function providerText(row) { return [row.providerKind,row.providerId,row.externalMarketId,row.sourceUrl].filter(Boolean).join(" · ") || "MANUAL"; }

  async function call(action, payload) {
    if (typeof api !== "function") throw new Error("Admin API transport is unavailable.");
    var result = await api(action, payload || {});
    if (!result || result.success !== true) throw new Error(result && (result.error || result.message) || "Prediction Market Admin request failed.");
    return result;
  }

  function lifecycleButtons(row) {
    var actions = Array.isArray(row.allowedAdminActions) ? row.allowedAdminActions : [];
    function has(a){ return actions.indexOf(a) !== -1; }
    var out = [];
    if (has("EDIT")) out.push('<button class="button admin-button secondary" onclick="predictionMarketAdminR3EditDraft_(\''+esc(row.marketId)+'\')">Edit Draft</button>');
    if (has("SET_PRICE")) out.push('<button class="button admin-button secondary" onclick="predictionMarketAdminR3SetPrice_(\''+esc(row.marketId)+'\')">Update Price</button>');
    if (has("OPEN")) out.push('<button class="button admin-button" onclick="predictionMarketAdminR3Lifecycle_(\'open\',\''+esc(row.marketId)+'\')">Open</button>');
    if (has("LOCK")) out.push('<button class="button admin-button" onclick="predictionMarketAdminR3Lifecycle_(\'lock\',\''+esc(row.marketId)+'\')">Lock</button>');
    if (has("RESOLVE_YES")) out.push('<button class="button admin-button" onclick="predictionMarketAdminR3Lifecycle_(\'resolve-yes\',\''+esc(row.marketId)+'\')">Resolve YES</button>');
    if (has("RESOLVE_NO")) out.push('<button class="button admin-button" onclick="predictionMarketAdminR3Lifecycle_(\'resolve-no\',\''+esc(row.marketId)+'\')">Resolve NO</button>');
    if (has("VOID")) out.push('<button class="button admin-button secondary" onclick="predictionMarketAdminR3Lifecycle_(\'void\',\''+esc(row.marketId)+'\')">Void</button>');
    return out.join("");
  }

  function renderMarkets() {
    var host = document.getElementById("adminPredictionMarketList");
    if (!host) return;
    if (!STATE.markets.length) { host.innerHTML = '<div class="admin-sub">No Prediction Markets are currently stored.</div>'; return; }
    host.innerHTML = STATE.markets.map(function(row){
      var winner = row.status === "RESOLVED" ? (" · Winner: " + esc(row.winningOutcome || "")) : "";
      return '<div class="admin-category-card" data-prediction-market-id="'+esc(row.marketId)+'">'+
        '<div class="admin-category-header"><div><strong>'+esc(row.title)+'</strong><div class="admin-sub"><code>'+esc(row.marketId)+'</code> · '+esc(row.category||"Uncategorized")+'</div></div><span class="'+statusClass(row.status)+'">'+esc(row.status)+winner+'</span></div>'+
        '<div class="admin-grid">'+
          '<div><div class="admin-label">YES / NO</div><div class="admin-value">'+esc(row.referenceYesPrice)+' / '+esc(row.referenceNoPrice)+'</div></div>'+
          '<div><div class="admin-label">Price As Of</div><div class="admin-sub">'+esc(row.referencePriceAsOf||"—")+'</div></div>'+
          '<div><div class="admin-label">Open</div><div class="admin-sub">'+esc(row.openTime||"—")+'</div></div>'+
          '<div><div class="admin-label">Lock</div><div class="admin-sub">'+esc(row.lockTime||"—")+'</div></div>'+
        '</div>'+
        '<div class="admin-sub"><strong>Provider / source:</strong> '+esc(providerText(row))+'</div>'+
        '<div class="admin-sub"><strong>Trading state:</strong> '+(row.tradingAvailable ? 'OPEN for accepted R2 trading' : 'Not available')+'</div>'+
        '<div class="admin-actions" style="margin-top:10px">'+lifecycleButtons(row)+'</div>'+
      '</div>';
    }).join("");
  }

  async function load() {
    message("Loading Prediction Markets…", "working");
    try {
      var res = await call("adminGetPredictionMarkets", {});
      STATE.markets = Array.isArray(res.markets) ? res.markets : [];
      renderMarkets();
      message("Prediction Markets loaded.", "success");
    } catch (err) {
      STATE.markets = [];
      renderMarkets();
      message(err && err.message ? err.message : "Prediction Market list failed.", "error");
    }
  }

  function formPayload(form) {
    return {
      marketId:value(form,"marketId"), title:value(form,"title"), description:value(form,"description"), category:value(form,"category"),
      yesLabel:value(form,"yesLabel")||"YES", noLabel:value(form,"noLabel")||"NO",
      referenceYesPrice:numberValue(form,"referenceYesPrice"), referenceNoPrice:numberValue(form,"referenceNoPrice"),
      referencePriceAsOf:isoValue(form,"referencePriceAsOf"), referencePriceTrusted:true,
      providerKind:value(form,"providerKind")||"MANUAL", providerId:value(form,"providerId"), externalMarketId:value(form,"externalMarketId"), sourceUrl:value(form,"sourceUrl"),
      providerMetadata:value(form,"providerMetadata")||"{}", openTime:isoValue(form,"openTime"), lockTime:isoValue(form,"lockTime")
    };
  }

  root.predictionMarketAdminR3Submit_ = async function(event) {
    if (event && event.preventDefault) event.preventDefault();
    var form = event && (event.currentTarget || event.target); if (!form) return false;
    var editing = !!STATE.editingMarketId;
    try {
      await call(editing ? "adminEditPredictionMarket" : "adminCreatePredictionMarket", formPayload(form));
      message(editing ? "Draft market updated." : "Draft market created.", "success");
      STATE.editingMarketId = ""; form.reset();
      var id=form.elements.marketId; if(id) id.disabled=false;
      var submit=document.getElementById("adminPredictionMarketSubmit"); if(submit) submit.textContent="Create Draft Market";
      await load(); return true;
    } catch(err) { message(err && err.message ? err.message : "Save failed.", "error"); return false; }
  };

  root.predictionMarketAdminR3EditDraft_ = function(id) {
    var row=market(id), form=document.getElementById("adminPredictionMarketForm"); if(!row||!form) return false;
    STATE.editingMarketId=s(id);
    ["marketId","title","description","category","yesLabel","noLabel","referenceYesPrice","referenceNoPrice","providerKind","providerId","externalMarketId","sourceUrl"].forEach(function(name){ if(form.elements[name]) form.elements[name].value=row[name]==null?"":row[name]; });
    if(form.elements.providerMetadata) form.elements.providerMetadata.value=JSON.stringify(row.providerMetadata||{});
    ["referencePriceAsOf","openTime","lockTime"].forEach(function(name){ if(form.elements[name]) form.elements[name].value=localDateTime(row[name]); });
    form.elements.marketId.disabled=true;
    document.getElementById("adminPredictionMarketSubmit").textContent="Save Draft Changes";
    form.scrollIntoView({behavior:"smooth",block:"start"}); return true;
  };

  root.predictionMarketAdminR3CancelEdit_ = function() {
    STATE.editingMarketId=""; var form=document.getElementById("adminPredictionMarketForm"); if(form){form.reset();form.elements.marketId.disabled=false;}
    var submit=document.getElementById("adminPredictionMarketSubmit");if(submit)submit.textContent="Create Draft Market"; return true;
  };

  root.predictionMarketAdminR3SetPrice_ = async function(id) {
    var row=market(id); if(!row) return false;
    var yes=window.prompt("YES reference price (0 to 1)", String(row.referenceYesPrice)); if(yes===null)return false;
    var no=window.prompt("NO reference price (YES + NO must equal 1)", String(row.referenceNoPrice)); if(no===null)return false;
    try { await call("adminSetPredictionMarketPrice",{marketId:id,referenceYesPrice:Number(yes),referenceNoPrice:Number(no),referencePriceAsOf:new Date().toISOString()}); message("Manual reference price updated.","success"); await load(); return true; }
    catch(err){message(err&&err.message?err.message:"Price update failed.","error");return false;}
  };

  root.predictionMarketAdminR3Lifecycle_ = async function(action,id) {
    var apiAction="", payload={marketId:id}, finalText="";
    if(action==="open") apiAction="adminOpenPredictionMarket";
    if(action==="lock") apiAction="adminLockPredictionMarket";
    if(action==="resolve-yes"){apiAction="adminResolvePredictionMarket";payload.winningOutcome="YES";finalText="Resolve this market YES? This is a final market resolution.";}
    if(action==="resolve-no"){apiAction="adminResolvePredictionMarket";payload.winningOutcome="NO";finalText="Resolve this market NO? This is a final market resolution.";}
    if(action==="void"){apiAction="adminVoidPredictionMarket";finalText="Void this market? Open cost basis is returned by the accepted R2 settlement authority.";}
    if(!apiAction)return false;
    if(finalText && !window.confirm(finalText)) return false;
    try { await call(apiAction,payload); message("Market lifecycle updated.","success"); await load(); return true; }
    catch(err){message(err&&err.message?err.message:"Lifecycle update failed.","error");return false;}
  };

  root.renderAdminPredictionMarketsPage = async function() {
    window.setTimeout(load,0);
    return '<div class="page admin-page" data-admin-prediction-markets-r3="1">'+
      '<div class="admin-sub"><button type="button" class="admin-small-button secondary" onclick="navigate(\'admin\')">Admin</button> → Games &amp; Design → Prediction Markets</div>'+
      '<div class="admin-page-header"><div><h1>Prediction Markets</h1><div class="admin-sub">Create and operate binary Prediction Markets through the accepted R2 engine. Player trading, external ingestion, and direct storage editing are not part of this manager.</div></div></div>'+
      '<div id="adminPredictionMarketMessage" class="admin-message" aria-live="polite"></div>'+
      '<div class="card admin-card"><h2>Create / Edit Draft Market</h2><form id="adminPredictionMarketForm" onsubmit="predictionMarketAdminR3Submit_(event);return false;"><div class="admin-control-grid">'+
        '<label class="admin-field"><span>Market ID</span><input name="marketId" required></label><label class="admin-field"><span>Title</span><input name="title" required></label><label class="admin-field"><span>Category</span><input name="category"></label><label class="admin-field"><span>Description</span><input name="description"></label>'+
        '<label class="admin-field"><span>YES Price</span><input name="referenceYesPrice" type="number" min="0" max="1" step="0.01" required></label><label class="admin-field"><span>NO Price</span><input name="referenceNoPrice" type="number" min="0" max="1" step="0.01" required></label><label class="admin-field"><span>YES Label</span><input name="yesLabel" value="YES"></label><label class="admin-field"><span>NO Label</span><input name="noLabel" value="NO"></label>'+
        '<label class="admin-field"><span>Reference Price As Of</span><input name="referencePriceAsOf" type="datetime-local" required></label><label class="admin-field"><span>Open Time</span><input name="openTime" type="datetime-local"></label><label class="admin-field"><span>Lock Time</span><input name="lockTime" type="datetime-local" required></label><label class="admin-field"><span>Provider Kind</span><input name="providerKind" value="MANUAL"></label>'+
        '<label class="admin-field"><span>Provider ID</span><input name="providerId"></label><label class="admin-field"><span>External Market ID</span><input name="externalMarketId"></label><label class="admin-field"><span>Source URL</span><input name="sourceUrl" type="url"></label><label class="admin-field"><span>Provider Metadata JSON</span><input name="providerMetadata" value="{}"></label></div>'+
        '<div class="admin-actions"><button id="adminPredictionMarketSubmit" type="submit" class="button admin-button">Create Draft Market</button><button type="button" class="button admin-button secondary" onclick="predictionMarketAdminR3CancelEdit_()">Clear / Cancel Edit</button></div></form></div>'+
      '<div class="card admin-card"><div class="admin-category-header"><div><h2>Markets</h2><div class="admin-sub">DRAFT · OPEN · LOCKED · RESOLVED · VOID. Buttons are derived from the accepted lifecycle; the server remains authoritative.</div></div><button type="button" class="button admin-button secondary" onclick="predictionMarketAdminR3Refresh_()">Refresh</button></div><div id="adminPredictionMarketList" class="admin-list"></div></div></div>';
  };

  root.predictionMarketAdminR3Refresh_ = load;
})(typeof window !== "undefined" ? window : this);
