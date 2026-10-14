/* PATTC ADMIN SPORTS / GAME MANAGER ORGANIZATION R2 — navigation/routing only. */
(function(root){
  'use strict';
  if(root.__PATTC_ADMIN_SPORTS_GAME_ORG_R2__) return;
  root.__PATTC_ADMIN_SPORTS_GAME_ORG_R2__=true;
  var TARGET_KEY='pattcAdminSportsR2Target';

  function text(v){return String(v==null?'':v).trim();}
  function buttonByOnclick_(fragment){
    return Array.prototype.find.call(document.querySelectorAll('button[onclick]'),function(button){
      return String(button.getAttribute('onclick')||'').indexOf(fragment)!==-1;
    })||null;
  }
  function buttonIn_(host,fragment){
    if(!host)return null;
    return Array.prototype.find.call(host.querySelectorAll('button[onclick]'),function(button){
      return String(button.getAttribute('onclick')||'').indexOf(fragment)!==-1;
    })||null;
  }
  function targetLabel_(target){
    return ({
      confidence:'Confidence',
      survivor:'Survivor',
      'team-fantasy':'Team Fantasy Football',
      'playoff-race':'Playoff Race',
      'nfl-cup':'Cups / Combined Competitions → NFL Cup'
    })[target]||'NFL 2026';
  }
  function setTarget_(target){
    try{root.sessionStorage.setItem(TARGET_KEY,target);}catch(_){ }
  }
  function getTarget_(){
    try{return text(root.sessionStorage.getItem(TARGET_KEY));}catch(_){return '';}
  }
  function clearTarget_(){
    try{root.sessionStorage.removeItem(TARGET_KEY);}catch(_){ }
  }

  root.pattcAdminSportsR2Open_=function(target){
    target=text(target);
    if(target==='team-fantasy'){
      if(typeof root.navigate==='function') root.navigate('admin-team-fantasy');
      return;
    }
    setTarget_(target);
    if(typeof root.navigate==='function') root.navigate('admin-games');
  };

  function sportsMarkup_(){
    return '<div class="admin-category-card" data-admin-sports-organization-r2="1">'+
      '<div class="admin-sub"><strong>Sports</strong> → League → Season → Game / Cup / Sports Operations</div>'+
      '<div class="admin-list" style="margin-top:10px">'+
        '<div class="admin-list-row"><div><strong>Sports → NFL → 2026</strong><div class="admin-sub">Each game opens its existing authoritative configuration surface. R2 creates no duplicate managers.</div></div></div>'+
        '<div class="admin-list-row"><div><strong>Confidence</strong><div class="admin-sub">Specialized Confidence scoring controls remain in Manage Games.</div></div><button type="button" class="admin-small-button secondary" onclick="pattcAdminSportsR2Open_(\'confidence\')">Open Confidence</button></div>'+
        '<div class="admin-list-row"><div><strong>Survivor</strong><div class="admin-sub">Specialized Survivor / Elimination Rules remain in Manage Games.</div></div><button type="button" class="admin-small-button secondary" onclick="pattcAdminSportsR2Open_(\'survivor\')">Open Survivor</button></div>'+
        '<div class="admin-list-row"><div><strong>Team Fantasy Football</strong><div class="admin-sub">Uses the existing dedicated Team Fantasy manager.</div></div><span data-admin-r2-team-fantasy-slot></span></div>'+
        '<div class="admin-list-row"><div><strong>Playoff Race</strong><div class="admin-sub">Existing NFL Playoff Race timing/configuration controls remain in Manage Games.</div></div><button type="button" class="admin-small-button secondary" onclick="pattcAdminSportsR2Open_(\'playoff-race\')">Open Playoff Race</button></div>'+
        '<div class="admin-category-card" style="margin-top:8px" data-admin-r2-cups="1"><strong>Cups / Combined Competitions</strong><div class="admin-sub">A Cup references authoritative games by Game ID. One game record; no copied games. R2 does not migrate schema.</div><div class="admin-list-row" style="margin-top:8px"><div><strong>NFL Cup</strong><div class="admin-sub">Existing NFL Cup Control Center: membership, contribution weights, qualification/field protection, weekly/season awards, preflight and publication.</div></div><button type="button" class="admin-small-button secondary" onclick="pattcAdminSportsR2Open_(\'nfl-cup\')">Open NFL Cup</button></div></div>'+
        '<div class="admin-list-row"><div><strong>NFL 2026 shared game definitions</strong><div class="admin-sub">Identity, type, Hub/League/Season placement, status, availability, common display settings and lifecycle remain in Manage Games.</div></div><span data-admin-r2-shared-games-slot></span></div>'+
      '</div>'+
      '<div class="admin-category-card" style="margin-top:10px" data-admin-r2-sports-operations="1"><strong>Sports Operations</strong><div class="admin-sub">Existing sports tools are grouped here without duplicating their routes, managers or APIs.</div><div class="admin-actions" data-admin-r2-sports-operations-actions></div><div data-admin-r2-sports-message-slot></div><div data-admin-r2-sports-panel-slot></div></div>'+
    '</div>';
  }

  function organizeAdmin_(){
    var guide=document.querySelector('[data-admin-games-design-r1="1"]');
    if(!guide||guide.querySelector('[data-admin-sports-organization-r2="1"]')) return;
    var list=guide.querySelector('.admin-list');
    if(!list) return;
    var sportsRow=Array.prototype.find.call(list.querySelectorAll('.admin-list-row'),function(row){
      return /Sports\s*→\s*NFL\s*→\s*2026/i.test(text(row.textContent));
    });
    if(!sportsRow) return;

    var oldActions=guide.querySelector('[data-admin-games-design-team-fantasy="1"]');
    var teamFantasyButton=buttonIn_(oldActions,"navigate('admin-team-fantasy')");
    var sharedGamesButton=buttonIn_(oldActions,"navigate('admin-games')");
    var holder=document.createElement('div');
    holder.innerHTML=sportsMarkup_();
    var sports=holder.firstElementChild;
    sportsRow.parentNode.replaceChild(sports,sportsRow);

    var tfSlot=sports.querySelector('[data-admin-r2-team-fantasy-slot]');
    if(tfSlot&&teamFantasyButton){
      teamFantasyButton.textContent='Open Team Fantasy Manager';
      tfSlot.appendChild(teamFantasyButton);
    }
    var sharedSlot=sports.querySelector('[data-admin-r2-shared-games-slot]');
    if(sharedSlot&&sharedGamesButton){
      sharedGamesButton.textContent='Open Manage Games';
      sharedSlot.appendChild(sharedGamesButton);
    }
    if(oldActions) oldActions.remove();

    var sportsScores=buttonByOnclick_("./sports.html");
    var sportsEngine=buttonByOnclick_('adminOpenSportsControls()');
    var ops=sports.querySelector('[data-admin-r2-sports-operations-actions]');
    if(ops&&sportsScores) ops.appendChild(sportsScores);
    if(ops&&sportsEngine) ops.appendChild(sportsEngine);

    var message=document.getElementById('adminSportsControlMessage');
    var panel=document.getElementById('adminSportsControlPanel');
    var messageSlot=sports.querySelector('[data-admin-r2-sports-message-slot]');
    var panelSlot=sports.querySelector('[data-admin-r2-sports-panel-slot]');
    if(messageSlot&&message) messageSlot.appendChild(message);
    if(panelSlot&&panel) panelSlot.appendChild(panel);
  }

  function findCardByText_(needle){
    needle=String(needle||'').toLowerCase();
    return Array.prototype.find.call(document.querySelectorAll('.admin-card,.card,[data-admin-game-filterable="true"]'),function(node){
      return String(node.textContent||'').toLowerCase().indexOf(needle)!==-1;
    })||null;
  }
  function manageGamesTargetNode_(target){
    if(target==='nfl-cup') return document.getElementById('pattcCupControlR1');
    if(target==='playoff-race') return findCardByText_('NFL Playoff Race Timing');
    var cards=document.querySelectorAll('[data-admin-game-filterable="true"]');
    var needle=target==='survivor'?'survivor':'confidence';
    return Array.prototype.find.call(cards,function(card){
      var hay=[card.getAttribute('data-admin-game-id'),card.getAttribute('data-admin-game-name'),card.textContent].join(' ').toLowerCase();
      return hay.indexOf(needle)!==-1;
    })||null;
  }
  function applyManageGamesTarget_(){
    var target=getTarget_();
    if(!target||target==='team-fantasy') return;
    var page=document.querySelector('.admin-games-page,.admin-page');
    var search=document.getElementById('adminGamesSearch');
    if(!page||!search) return;
    if(!page.querySelector('[data-admin-sports-r2-context]')){
      var header=page.querySelector('.admin-page-header');
      if(header){
        var banner=document.createElement('div');
        banner.className='card admin-card';
        banner.setAttribute('data-admin-sports-r2-context','1');
        banner.innerHTML='<div class="admin-sub"><strong>Admin → Games &amp; Design → Sports → NFL → 2026 → '+targetLabel_(target)+'</strong></div><div class="admin-sub">This route reuses the existing authoritative controls; no duplicate manager or game record was created.</div>';
        header.insertAdjacentElement('afterend',banner);
      }
    }
    var node=manageGamesTargetNode_(target);
    if(!node) return;
    if(node.tagName&&node.tagName.toLowerCase()==='details') node.open=true;
    var details=node.querySelectorAll?node.querySelectorAll('details'):[];
    Array.prototype.forEach.call(details,function(d){
      var t=String(d.textContent||'').toLowerCase();
      if((target==='confidence'&&t.indexOf('confidence scoring')!==-1)||(target==='survivor'&&t.indexOf('survivor / elimination rules')!==-1)) d.open=true;
    });
    clearTarget_();
    if(typeof node.scrollIntoView==='function') setTimeout(function(){node.scrollIntoView({block:'start'});},0);
  }

  function refresh_(){organizeAdmin_();applyManageGamesTarget_();}
  function start_(){
    var app=document.getElementById('app')||document.documentElement;
    if(typeof MutationObserver!=='undefined') new MutationObserver(refresh_).observe(app,{childList:true,subtree:true});
    refresh_();
  }
  root.PATTC_ADMIN_SPORTS_GAME_ORG_R2={organize:organizeAdmin_,applyTarget:applyManageGamesTarget_};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start_); else setTimeout(start_,0);
})(window);
