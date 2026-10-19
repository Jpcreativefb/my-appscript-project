/* =====================================================
   PREDICTION MARKET PLAYER EXPERIENCE R4
   Presentation only. R2 backend remains wallet/trade/accounting authority.
===================================================== */

var PREDICTION_MARKET_R4_STATE = {
  payload:null,
  selectedMarketId:"",
  selectedOutcome:"YES",
  selectedSide:"BUY",
  pendingTrade:null,
  busy:false,
  message:""
};

function predictionMarketR4Esc_(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, function(ch) {
    return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[ch];
  });
}
function predictionMarketR4Num_(value) { var n=Number(value); return isFinite(n)?n:0; }
function predictionMarketR4Credits_(value) { return predictionMarketR4Num_(value).toFixed(2); }
function predictionMarketR4Price_(value) { return predictionMarketR4Num_(value).toFixed(3); }
function predictionMarketR4Date_(value) {
  var d=new Date(String(value||""));
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
function predictionMarketR4NewTransactionId_() {
  if (typeof crypto!=="undefined" && typeof crypto.randomUUID==="function") return "pm-"+crypto.randomUUID();
  return "pm-"+Date.now()+"-"+Math.random().toString(36).slice(2,12);
}
function predictionMarketR4IntentKey_(intent) {
  intent=intent||{};
  return [intent.marketId,intent.side,intent.outcome,Number(intent.quantity),Number(intent.expectedWalletVersion),Number(intent.referencePrice)].join("|");
}
function predictionMarketR4PrepareSubmission_(intent, prior) {
  var key=predictionMarketR4IntentKey_(intent);
  if (prior && prior.key===key && prior.uncertain===true) return prior;
  return {
    key:key,
    transactionId:predictionMarketR4NewTransactionId_(),
    uncertain:false,
    inFlight:false,
    payload:Object.assign({},intent)
  };
}
function predictionMarketR4FailureUncertain_(result) {
  var text=String(result && (result.error||result.message)||"").toLowerCase();
  return !result || /timeout|timed out|network|connection|invalid response|524/.test(text);
}
function predictionMarketR4Api_(action,payload) {
  if (typeof apiPredictionMarketPlayerR4 === "function") return apiPredictionMarketPlayerR4(action,payload||{});
  if (typeof api === "function") return api(action,payload||{});
  return Promise.resolve({success:false,error:"Prediction Market API is unavailable."});
}
function predictionMarketR4Market_(marketId) {
  var markets=PREDICTION_MARKET_R4_STATE.payload && PREDICTION_MARKET_R4_STATE.payload.markets || [];
  return markets.find(function(m){return String(m.marketId)===String(marketId);})||null;
}
function predictionMarketR4Positions_(marketId) {
  var positions=PREDICTION_MARKET_R4_STATE.payload && PREDICTION_MARKET_R4_STATE.payload.portfolio && PREDICTION_MARKET_R4_STATE.payload.portfolio.positions || [];
  return positions.filter(function(p){return String(p.marketId)===String(marketId);});
}
function predictionMarketR4Position_(marketId,outcome) {
  return predictionMarketR4Positions_(marketId).find(function(p){return String(p.outcome)===String(outcome);})||null;
}

async function predictionMarketR4Load_(preserveSelection) {
  var res=await predictionMarketR4Api_("getPredictionMarketPlayerState",{});
  if (!res || res.success===false) throw new Error(res && (res.error||res.message) || "Could not load Prediction Markets.");
  PREDICTION_MARKET_R4_STATE.payload=res;
  var markets=res.markets||[];
  if (!preserveSelection || !predictionMarketR4Market_(PREDICTION_MARKET_R4_STATE.selectedMarketId)) {
    PREDICTION_MARKET_R4_STATE.selectedMarketId=markets[0] ? markets[0].marketId : "";
  }
  return res;
}

function predictionMarketR4MarketCard_(market) {
  var stale=market.priceStale===true;
  return `<button type="button" class="pmr4-market-card ${String(market.marketId)===String(PREDICTION_MARKET_R4_STATE.selectedMarketId)?"selected":""}" onclick="predictionMarketR4SelectMarket_('${predictionMarketR4Esc_(market.marketId)}')">
    <span class="pmr4-card-top"><strong>${predictionMarketR4Esc_(market.title)}</strong><span class="pmr4-status pmr4-${predictionMarketR4Esc_(String(market.status||"").toLowerCase())}">${predictionMarketR4Esc_(market.status)}</span></span>
    <span class="pmr4-meta">${predictionMarketR4Esc_(market.category||"Prediction Market")} · locks ${predictionMarketR4Esc_(predictionMarketR4Date_(market.lockTime))}</span>
    <span class="pmr4-prices"><b>YES ${predictionMarketR4Price_(market.referenceYesPrice)}</b><b>NO ${predictionMarketR4Price_(market.referenceNoPrice)}</b></span>
    <span class="pmr4-meta">Price ${predictionMarketR4Esc_(predictionMarketR4Date_(market.referencePriceAsOf))} · ${predictionMarketR4Esc_(market.providerLabel||market.providerKind||"MANUAL")}</span>
    <span class="pmr4-trade-state ${market.tradingAvailable?"available":"blocked"}">${market.tradingAvailable?"Trading available":(stale?"Price stale / unavailable":"Not currently tradable")}</span>
  </button>`;
}

function predictionMarketR4PositionLine_(position,outcome) {
  position=position||{outcome:outcome,quantity:0,costBasisCredits:0,averageCostCredits:0,markedValueCredits:0,unrealizedCredits:0,realizedCredits:0,settled:false,settledCredits:0};
  return `<div class="pmr4-position-line"><strong>${predictionMarketR4Esc_(outcome)}</strong><span>${predictionMarketR4Credits_(position.quantity)} shares</span><span>Avg ${predictionMarketR4Credits_(position.averageCostCredits)}</span><span>Basis ${predictionMarketR4Credits_(position.costBasisCredits)}</span><span>Value ${predictionMarketR4Credits_(position.markedValueCredits)}</span><span>U/P&L ${predictionMarketR4Credits_(position.unrealizedCredits)}</span><span>R/P&L ${predictionMarketR4Credits_(position.realizedCredits)}</span><span>${position.settled?"Settled "+predictionMarketR4Credits_(position.settledCredits):"Open"}</span></div>`;
}

function predictionMarketR4CommunityHtml_(community) {
  community=community||{};
  var yes=community.yesPositioningPercent;
  var no=community.noPositioningPercent;
  var hasPositioning=yes!=null && no!=null;
  var movement=function(row,label){
    if (!row || row.supported!==true || row.yesPointChange==null) return `${label}: not enough history`;
    var value=predictionMarketR4Num_(row.yesPointChange);
    return `${label}: ${value>0?"+":""}${value.toFixed(1)} pts toward YES`;
  };
  var trend=(community.activity||[]).slice(-7).map(function(point){
    var value=point.yesPositioningPercent;
    var height=value==null?4:Math.max(4,Math.min(100,predictionMarketR4Num_(value)));
    return `<span title="${predictionMarketR4Esc_(point.date)} · ${value==null?"no positioning":predictionMarketR4Num_(value).toFixed(1)+"% YES"} · ${predictionMarketR4Credits_(point.volumeCredits)} credits" style="display:inline-block;width:12px;height:${height}px;max-height:52px;background:currentColor;opacity:.62;border-radius:4px 4px 0 0"></span>`;
  }).join("");
  return `<div class="pmr4-community" style="margin:14px 0;padding:14px;border:1px solid rgba(127,127,127,.24);border-radius:12px">
    <div class="pmr4-card-top"><div><div class="pmr4-kicker">PATTC Community</div><h3 style="margin:.2rem 0">PATTC Positioning</h3></div><span class="pmr4-meta">${predictionMarketR4Esc_(community.participatingPlayers||0)} participating players</span></div>
    ${hasPositioning?`<div class="pmr4-prices"><b>YES ${predictionMarketR4Num_(yes).toFixed(1)}%</b><b>NO ${predictionMarketR4Num_(no).toFixed(1)}%</b></div>`:`<div class="pmr4-meta">No active PATTC positioning yet.</div>`}
    <div class="pmr4-facts"><span>YES shares <b>${predictionMarketR4Credits_(community.yesShareQuantity)}</b></span><span>NO shares <b>${predictionMarketR4Credits_(community.noShareQuantity)}</b></span><span>BUY volume <b>${predictionMarketR4Credits_(community.buyVolumeCredits)}</b></span><span>SELL volume <b>${predictionMarketR4Credits_(community.sellVolumeCredits)}</b></span><span>Total traded <b>${predictionMarketR4Credits_(community.tradingVolumeCredits)}</b> credits</span></div>
    <div class="pmr4-meta">${predictionMarketR4Esc_(movement(community.movement24h,"24h"))} · ${predictionMarketR4Esc_(movement(community.movement7d,"7d"))}</div>
    ${trend?`<div style="display:flex;align-items:flex-end;gap:4px;height:56px;margin-top:10px" aria-label="PATTC Community positioning trend">${trend}</div>`:""}
    <div class="pmr4-meta">Aggregate PATTC activity only. This does not set or move the external reference price.</div>
  </div>`;
}

function predictionMarketR4DetailHtml_() {
  var market=predictionMarketR4Market_(PREDICTION_MARKET_R4_STATE.selectedMarketId);
  if (!market) return `<div class="card">No Prediction Markets are available.</div>`;
  var yes=predictionMarketR4Position_(market.marketId,"YES");
  var no=predictionMarketR4Position_(market.marketId,"NO");
  var outcome=PREDICTION_MARKET_R4_STATE.selectedOutcome;
  var side=PREDICTION_MARKET_R4_STATE.selectedSide;
  var owned=predictionMarketR4Position_(market.marketId,outcome);
  var price=outcome==="YES"?market.referenceYesPrice:market.referenceNoPrice;
  var trading=market.tradingAvailable===true;
  var canSell=trading && owned && Number(owned.quantity)>0;
  return `<section class="pmr4-detail card">
    <div class="pmr4-card-top"><div><div class="pmr4-kicker">${predictionMarketR4Esc_(market.category||"Prediction Market")}</div><h2>${predictionMarketR4Esc_(market.title)}</h2></div><span class="pmr4-status pmr4-${predictionMarketR4Esc_(String(market.status||"").toLowerCase())}">${predictionMarketR4Esc_(market.status)}</span></div>
    <p>${predictionMarketR4Esc_(market.description||"")}</p>
    <div class="pmr4-facts"><span>External market ${predictionMarketR4Esc_(market.yesLabel||"YES")}: <b>${predictionMarketR4Price_(market.referenceYesPrice)}</b></span><span>External market ${predictionMarketR4Esc_(market.noLabel||"NO")}: <b>${predictionMarketR4Price_(market.referenceNoPrice)}</b></span><span>Price time: ${predictionMarketR4Esc_(predictionMarketR4Date_(market.referencePriceAsOf))}</span><span>Locks: ${predictionMarketR4Esc_(predictionMarketR4Date_(market.lockTime))}</span><span>Source: ${predictionMarketR4Esc_(market.providerLabel||market.providerKind||"MANUAL")}</span></div>
    ${predictionMarketR4CommunityHtml_(market.community)}
    ${market.priceStale?`<div class="pmr4-alert">Reference pricing is stale or unavailable. Trading is disabled until R2 accepts fresh pricing.</div>`:""}
    ${market.status==="RESOLVED"?`<div class="pmr4-alert">Resolved ${predictionMarketR4Esc_(market.winningOutcome||"")}. Settlement is shown when the accepted backend has completed it.</div>`:""}
    ${market.status==="VOID"?`<div class="pmr4-alert">This market is VOID. Settlement is shown when the accepted backend has completed it.</div>`:""}
    <div class="pmr4-position-grid">${predictionMarketR4PositionLine_(yes,"YES")}${predictionMarketR4PositionLine_(no,"NO")}</div>
    <div class="pmr4-ticket">
      <h3>Trade ticket</h3>
      <div class="pmr4-segment"><button class="${outcome==="YES"?"active":""}" onclick="predictionMarketR4SetOutcome_('YES')">YES</button><button class="${outcome==="NO"?"active":""}" onclick="predictionMarketR4SetOutcome_('NO')">NO</button></div>
      <div class="pmr4-segment"><button class="${side==="BUY"?"active":""}" onclick="predictionMarketR4SetSide_('BUY')">BUY</button><button class="${side==="SELL"?"active":""}" onclick="predictionMarketR4SetSide_('SELL')" ${canSell?"":"disabled"}>SELL</button></div>
      <label>Quantity<input id="pmr4Quantity" inputmode="decimal" type="number" min="0.000001" step="0.01" value="1" oninput="predictionMarketR4TicketEstimate_()"></label>
      <div id="pmr4Estimate" class="pmr4-estimate">Displayed price ${predictionMarketR4Price_(price)} · estimated ${side==="BUY"?"cost":"proceeds"} ${predictionMarketR4Credits_(price)} credits</div>
      ${side==="SELL"?`<div class="pmr4-meta">Owned ${predictionMarketR4Credits_(owned&&owned.quantity)} · average cost ${predictionMarketR4Credits_(owned&&owned.averageCostCredits)}</div>`:""}
      <button id="pmr4Submit" class="button pmr4-submit" onclick="predictionMarketR4Submit_()" ${trading && (side!=="SELL"||canSell)?"":"disabled"}>${side} ${outcome}</button>
      <div class="pmr4-meta">Final accepted server reference price is authoritative.</div>
    </div>
  </section>`;
}

function predictionMarketR4PortfolioHtml_() {
  var p=PREDICTION_MARKET_R4_STATE.payload && PREDICTION_MARKET_R4_STATE.payload.portfolio || {};
  return `<section class="pmr4-summary card"><h2>Wallet & portfolio</h2><div class="pmr4-summary-grid">
    <span><small>Available</small><b>${predictionMarketR4Credits_(p.availableCredits)}</b></span><span><small>Reserved</small><b>${predictionMarketR4Credits_(p.reservedCredits)}</b></span><span><small>Marked positions</small><b>${predictionMarketR4Credits_(p.currentMarkedPositionValueCredits)}</b></span><span><small>Unrealized P/L</small><b>${predictionMarketR4Credits_(p.unrealizedGainLossCredits)}</b></span><span><small>Realized P/L</small><b>${predictionMarketR4Credits_(p.realizedGainLossCredits)}</b></span><span><small>Settled credits</small><b>${predictionMarketR4Credits_(p.settledValueCredits)}</b></span><span><small>Total portfolio</small><b>${predictionMarketR4Credits_(p.portfolioValueCredits)}</b></span></div></section>`;
}

function predictionMarketR4HoldingsHtml_() {
  var p=PREDICTION_MARKET_R4_STATE.payload && PREDICTION_MARKET_R4_STATE.payload.portfolio || {};
  var markets={}; (PREDICTION_MARKET_R4_STATE.payload.markets||[]).forEach(function(m){markets[m.marketId]=m;});
  var rows=(p.positions||[]).map(function(pos){var m=markets[pos.marketId]||{};return `<div class="pmr4-holding"><strong>${predictionMarketR4Esc_(m.title||pos.marketId)} · ${predictionMarketR4Esc_(pos.outcome)}</strong><span>${predictionMarketR4Credits_(pos.quantity)} shares · basis ${predictionMarketR4Credits_(pos.costBasisCredits)} · avg ${predictionMarketR4Credits_(pos.averageCostCredits)}</span><span>mark ${predictionMarketR4Price_(pos.outcome==="YES"?m.referenceYesPrice:m.referenceNoPrice)} · value ${predictionMarketR4Credits_(pos.markedValueCredits)} · U/P&L ${predictionMarketR4Credits_(pos.unrealizedCredits)} · R/P&L ${predictionMarketR4Credits_(pos.realizedCredits)}</span><span>${pos.settled?"Settled":"Open"}</span></div>`;}).join("");
  return `<section class="card"><h2>Holdings</h2>${rows||`<p class="pmr4-meta">No Prediction Market positions yet.</p>`}</section>`;
}

async function predictionMarketR4LeaderboardHtml_() {
  var res=await predictionMarketR4Api_("getPredictionMarketLeaderboard",{});
  if (!res || res.success===false) return `<section class="card"><h2>Prediction Market leaderboard</h2><p>${predictionMarketR4Esc_(res&&(res.error||res.message)||"Unavailable")}</p></section>`;
  return `<section class="card"><h2>Prediction Market leaderboard</h2><div class="pmr4-leaderboard">${(res.leaderboard||[]).map(function(row){return `<div><b>#${predictionMarketR4Esc_(row.rank)} ${predictionMarketR4Esc_(row.displayName||row.playerId)}</b><span>${predictionMarketR4Credits_(row.portfolioValueCredits)} credits</span></div>`;}).join("")}</div></section>`;
}

function predictionMarketR4Styles_() { return `<style>
.pmr4-page{padding-bottom:110px}.pmr4-shell{display:grid;grid-template-columns:minmax(240px,360px) minmax(0,1fr);gap:16px}.pmr4-markets{display:grid;gap:10px;align-content:start}.pmr4-market-card{width:100%;text-align:left;border:1px solid rgba(127,127,127,.28);border-radius:14px;padding:14px;background:var(--card-bg,#fff);color:inherit}.pmr4-market-card.selected{outline:2px solid currentColor}.pmr4-card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.pmr4-meta{display:block;font-size:.85rem;opacity:.72;margin-top:6px}.pmr4-prices{display:flex;gap:16px;margin-top:10px}.pmr4-status{font-size:.72rem;font-weight:800;padding:5px 8px;border-radius:999px;background:rgba(127,127,127,.16)}.pmr4-trade-state{display:block;margin-top:9px;font-weight:700;font-size:.82rem}.pmr4-trade-state.blocked,.pmr4-alert{color:#9a3412}.pmr4-detail h2{margin:.2rem 0}.pmr4-kicker{text-transform:uppercase;font-size:.72rem;font-weight:800;letter-spacing:.08em}.pmr4-facts,.pmr4-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px;margin:12px 0}.pmr4-facts span,.pmr4-summary-grid span{padding:10px;border-radius:10px;background:rgba(127,127,127,.09)}.pmr4-summary-grid small,.pmr4-summary-grid b{display:block}.pmr4-position-grid{display:grid;gap:8px}.pmr4-position-line,.pmr4-holding{display:grid;gap:4px;padding:10px;border-radius:10px;background:rgba(127,127,127,.08);font-size:.88rem}.pmr4-ticket{margin-top:16px;padding:14px;border-radius:14px;background:rgba(127,127,127,.08)}.pmr4-segment{display:flex;gap:8px;margin:8px 0}.pmr4-segment button{min-height:44px;min-width:76px;border-radius:10px;border:1px solid rgba(127,127,127,.3);background:transparent;color:inherit}.pmr4-segment button.active{font-weight:800;outline:2px solid currentColor}.pmr4-ticket label{display:grid;gap:6px;margin-top:10px}.pmr4-ticket input{font:inherit;min-height:44px;padding:8px;border-radius:10px;border:1px solid rgba(127,127,127,.35)}.pmr4-submit{width:100%;min-height:48px;margin-top:12px}.pmr4-estimate{font-weight:700;margin-top:10px}.pmr4-alert{padding:10px;border-radius:10px;background:rgba(234,88,12,.1);margin:10px 0}.pmr4-message{position:sticky;top:8px;z-index:5;padding:10px;border-radius:10px;background:var(--card-bg,#fff);box-shadow:0 4px 20px rgba(0,0,0,.12);margin-bottom:10px}.pmr4-leaderboard>div{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid rgba(127,127,127,.18)}@media(max-width:760px){.pmr4-shell{grid-template-columns:1fr}.pmr4-markets{grid-template-columns:1fr}.pmr4-page{padding-left:10px;padding-right:10px}.pmr4-card-top{align-items:flex-start}.pmr4-prices{justify-content:space-between}.pmr4-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:390px){.pmr4-summary-grid{grid-template-columns:1fr 1fr}.pmr4-facts{grid-template-columns:1fr}.pmr4-segment button{flex:1}.pmr4-market-card,.pmr4-detail,.pmr4-summary{overflow-wrap:anywhere}}
</style>`; }

async function renderPredictionMarketsPage() {
  await predictionMarketR4Load_(true);
  var leaderboard=await predictionMarketR4LeaderboardHtml_();
  var payload=PREDICTION_MARKET_R4_STATE.payload||{};
  return `${predictionMarketR4Styles_()}<div class="page pmr4-page"><div class="page-header"><div><h1>Prediction Markets</h1><p>Virtual PATTC credits · reference-price trading · no cash value</p></div></div><div id="pmr4Message">${PREDICTION_MARKET_R4_STATE.message?`<div class="pmr4-message">${predictionMarketR4Esc_(PREDICTION_MARKET_R4_STATE.message)}</div>`:""}</div>${predictionMarketR4PortfolioHtml_()}<div class="pmr4-shell"><div class="pmr4-markets">${(payload.markets||[]).map(predictionMarketR4MarketCard_).join("")||`<div class="card">No markets available.</div>`}</div><div id="pmr4Detail">${predictionMarketR4DetailHtml_()}</div></div>${predictionMarketR4HoldingsHtml_()}${leaderboard}</div>`;
}

function predictionMarketR4SelectMarket_(marketId){PREDICTION_MARKET_R4_STATE.selectedMarketId=marketId;PREDICTION_MARKET_R4_STATE.pendingTrade=null;predictionMarketR4RefreshDetail_();}
function predictionMarketR4SetOutcome_(outcome){PREDICTION_MARKET_R4_STATE.selectedOutcome=outcome;PREDICTION_MARKET_R4_STATE.pendingTrade=null;predictionMarketR4RefreshDetail_();}
function predictionMarketR4SetSide_(side){PREDICTION_MARKET_R4_STATE.selectedSide=side;PREDICTION_MARKET_R4_STATE.pendingTrade=null;predictionMarketR4RefreshDetail_();}
function predictionMarketR4RefreshDetail_(){var node=document.getElementById("pmr4Detail");if(node)node.innerHTML=predictionMarketR4DetailHtml_();}
function predictionMarketR4TicketEstimate_(){var m=predictionMarketR4Market_(PREDICTION_MARKET_R4_STATE.selectedMarketId);var q=predictionMarketR4Num_(document.getElementById("pmr4Quantity")&&document.getElementById("pmr4Quantity").value);var p=PREDICTION_MARKET_R4_STATE.selectedOutcome==="YES"?m&&m.referenceYesPrice:m&&m.referenceNoPrice;var node=document.getElementById("pmr4Estimate");if(node)node.textContent="Displayed price "+predictionMarketR4Price_(p)+" · estimated "+(PREDICTION_MARKET_R4_STATE.selectedSide==="BUY"?"cost ":"proceeds ")+predictionMarketR4Credits_(q*predictionMarketR4Num_(p))+" credits";PREDICTION_MARKET_R4_STATE.pendingTrade=null;}

async function predictionMarketR4Submit_(){
  if(PREDICTION_MARKET_R4_STATE.busy)return;
  var market=predictionMarketR4Market_(PREDICTION_MARKET_R4_STATE.selectedMarketId);var portfolio=PREDICTION_MARKET_R4_STATE.payload&&PREDICTION_MARKET_R4_STATE.payload.portfolio||{};var q=predictionMarketR4Num_(document.getElementById("pmr4Quantity")&&document.getElementById("pmr4Quantity").value);var outcome=PREDICTION_MARKET_R4_STATE.selectedOutcome;var side=PREDICTION_MARKET_R4_STATE.selectedSide;var price=outcome==="YES"?market.referenceYesPrice:market.referenceNoPrice;
  if(!market||!market.tradingAvailable||q<=0)return;
  var owned=predictionMarketR4Position_(market.marketId,outcome);if(side==="SELL"&&(!owned||q>Number(owned.quantity))){PREDICTION_MARKET_R4_STATE.message="You cannot sell more shares than you own.";return predictionMarketR4Rerender_();}
  var intent={marketId:market.marketId,side:side,outcome:outcome,quantity:q,expectedWalletVersion:portfolio.walletVersion,referencePrice:price,requestedAt:new Date().toISOString()};
  var pending=predictionMarketR4PrepareSubmission_(intent,PREDICTION_MARKET_R4_STATE.pendingTrade);
  if(!window.confirm(side+" "+q+" "+outcome+" shares of “"+market.title+"” at displayed reference "+predictionMarketR4Price_(price)+" (estimated "+predictionMarketR4Credits_(q*price)+" credits)? Final server reference price is authoritative."))return;
  pending.inFlight=true;PREDICTION_MARKET_R4_STATE.pendingTrade=pending;PREDICTION_MARKET_R4_STATE.busy=true;var button=document.getElementById("pmr4Submit");if(button)button.disabled=true;
  var res;
  try{res=await predictionMarketR4Api_("executePredictionMarketTrade",Object.assign({transactionId:pending.transactionId},pending.payload));}
  catch(err){res={success:false,error:err&&err.message||"Network error"};}
  PREDICTION_MARKET_R4_STATE.busy=false;pending.inFlight=false;
  if(res&&res.success!==false){var t=res.trade||{};PREDICTION_MARKET_R4_STATE.pendingTrade=null;PREDICTION_MARKET_R4_STATE.message=side+" confirmed at "+predictionMarketR4Price_(t.executionReferencePrice)+" · "+predictionMarketR4Credits_(t.grossCredits)+" credits · wallet "+predictionMarketR4Credits_(t.wallet&&t.wallet.availableCredits)+" · position "+predictionMarketR4Credits_(t.position&&t.position.quantity)+" shares.";await predictionMarketR4Load_(true);return predictionMarketR4Rerender_();}
  pending.uncertain=predictionMarketR4FailureUncertain_(res);var error=String(res&&(res.error||res.message)||"Trade was not accepted.");PREDICTION_MARKET_R4_STATE.message=pending.uncertain?error+" The same transaction ID will be reused if you retry this unchanged trade.":error+" State has been refreshed; review the ticket before submitting again.";
  try{await predictionMarketR4Load_(true);}catch(ignore){}
  if(!pending.uncertain)PREDICTION_MARKET_R4_STATE.pendingTrade=null;
  predictionMarketR4Rerender_();
}

async function predictionMarketR4Rerender_(){var app=document.getElementById("app");if(app)app.innerHTML=await renderPredictionMarketsPage();}

if(typeof module!=="undefined"&&module.exports){module.exports={predictionMarketR4IntentKey_:predictionMarketR4IntentKey_,predictionMarketR4PrepareSubmission_:predictionMarketR4PrepareSubmission_,predictionMarketR4FailureUncertain_:predictionMarketR4FailureUncertain_};}
