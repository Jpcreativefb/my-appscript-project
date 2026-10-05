/* =====================================================
   PATTC CONFIGURABLE BOTTOM NAVIGATION SLOTS R1
   Six admin-configurable slots backed by AppearanceHubSettings nav:1..nav:6.
   Existing five-button HTML remains the first-paint/offline fallback.
===================================================== */
(function(root) {
  'use strict';

  var STORAGE_KEY = 'pattcBottomNavSlotsR1';
  var DESTINATIONS = [
    {value:'dashboard', label:'Home', icon:'⌂', color:'#20284a'},
    {value:'hub:general', label:'Games', icon:'🎲', color:'#4452a4'},
    {value:'hub:sports', label:'Sports', icon:'🏈', color:'#1f5f45'},
    {value:'hub:reality', label:'Reality', icon:'📺', color:'#6d3aa8'},
    {value:'hub:awards', label:'Awards', icon:'🏆', color:'#9a6a13'},
    {value:'more', label:'More', icon:'•••', color:'#374151'},
    {value:'voting', label:'Voting', icon:'🗳️', color:'#475569'},
    {value:'ranking', label:'Rankings', icon:'↕', color:'#475569'},
    {value:'leaderboard', label:'Standings', icon:'📊', color:'#475569'},
    {value:'leagues', label:'Leagues', icon:'🏟️', color:'#475569'},
    {value:'season-hub', label:'Season Hub', icon:'🗓️', color:'#475569'},
    {value:'trophy-room', label:'Trophy Room', icon:'🏆', color:'#475569'}
  ];
  var ALLOWED = {};
  DESTINATIONS.forEach(function(item) { ALLOWED[item.value] = item; });

  function str(v) { return v == null ? '' : String(v).trim(); }
  function bool(v, fallback) {
    if (v === true || v === false) return v;
    var s = str(v).toLowerCase();
    if (['true','1','yes','on'].indexOf(s) !== -1) return true;
    if (['false','0','no','off'].indexOf(s) !== -1) return false;
    return fallback === true;
  }
  function clamp(n, min, max, fallback) {
    n = Number(n);
    return isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function defaultRows() {
    return [
      {SettingKey:'nav:1',HubCategory:'navigation',HubGroup:'1',DisplayName:'Home',Color:'#20284a',IconText:'⌂',ShowNavIcon:true,ShowNavLabel:true,Active:true,NavSlot:1,NavDestination:'dashboard',NavIconSize:22,NavLocked:true},
      {SettingKey:'nav:2',HubCategory:'navigation',HubGroup:'2',DisplayName:'Sports',Color:'#1f5f45',IconText:'🏈',ShowNavIcon:true,ShowNavLabel:true,Active:true,NavSlot:2,NavDestination:'hub:sports',NavIconSize:22,NavLocked:false},
      {SettingKey:'nav:3',HubCategory:'navigation',HubGroup:'3',DisplayName:'Reality',Color:'#6d3aa8',IconText:'📺',ShowNavIcon:true,ShowNavLabel:true,Active:true,NavSlot:3,NavDestination:'hub:reality',NavIconSize:22,NavLocked:false},
      {SettingKey:'nav:4',HubCategory:'navigation',HubGroup:'4',DisplayName:'Awards',Color:'#9a6a13',IconText:'🏆',ShowNavIcon:true,ShowNavLabel:true,Active:true,NavSlot:4,NavDestination:'hub:awards',NavIconSize:22,NavLocked:false},
      {SettingKey:'nav:5',HubCategory:'navigation',HubGroup:'5',DisplayName:'More',Color:'#374151',IconText:'•••',ShowNavIcon:true,ShowNavLabel:true,Active:true,NavSlot:5,NavDestination:'more',NavIconSize:22,NavLocked:false},
      {SettingKey:'nav:6',HubCategory:'navigation',HubGroup:'6',DisplayName:'Games',Color:'#4452a4',IconText:'🎲',ShowNavIcon:true,ShowNavLabel:true,Active:false,NavSlot:6,NavDestination:'hub:general',NavIconSize:22,NavLocked:false}
    ];
  }
  function hasNavigationRows(rows) {
    return (Array.isArray(rows) ? rows : []).some(function(row) {
      var key = str(row && row.SettingKey).toLowerCase();
      var category = str(row && row.HubCategory).toLowerCase();
      return category === 'navigation' || key.indexOf('nav:') === 0;
    });
  }
  function normalizedRows(rows) {
    var bySlot = {}, hubByKey = {};
    (Array.isArray(rows) ? rows : []).forEach(function(row) {
      var key = str(row && row.SettingKey).toLowerCase();
      var category = str(row && row.HubCategory).toLowerCase();
      if (key && category !== 'navigation') hubByKey[key] = row;
      if (category !== 'navigation' && key.indexOf('nav:') !== 0) return;
      var slot = Math.floor(Number(row.NavSlot || row.HubGroup || key.split(':')[1] || 0));
      if (slot < 1 || slot > 6) return;
      bySlot[slot] = Object.assign({}, row, {NavSlot:slot});
    });
    var hubKeyForDest = {'dashboard':'home','hub:general':'general','hub:sports':'sports','hub:reality':'reality','hub:awards':'awards','more':'more'};
    return defaultRows().map(function(def) {
      var explicit = bySlot[def.NavSlot] || null;
      var fallback = hubByKey[hubKeyForDest[def.NavDestination] || ''] || {};
      var inherited = {};
      ['DisplayName','Color','IconText','IconUrl','IconFileId','ShowNavIcon','ShowNavLabel'].forEach(function(k){
        if (fallback[k] !== undefined && fallback[k] !== '') inherited[k] = fallback[k];
      });
      var row = Object.assign({}, def, inherited, explicit || {});
      var dest = str(row.NavDestination || def.NavDestination);
      if (!ALLOWED[dest]) dest = def.NavDestination;
      row.SettingKey = 'nav:' + def.NavSlot;
      row.HubCategory = 'navigation';
      row.HubGroup = String(def.NavSlot);
      row.NavSlot = def.NavSlot;
      row.NavDestination = dest;
      row.DisplayName = explicit && Object.prototype.hasOwnProperty.call(explicit, 'DisplayName')
        ? str(explicit.DisplayName)
        : (str(row.DisplayName) || ALLOWED[dest].label);
      row.IconText = explicit && Object.prototype.hasOwnProperty.call(explicit, 'IconText')
        ? str(explicit.IconText)
        : str(row.IconText);
      row.Color = /^#[0-9a-f]{6}$/i.test(str(row.Color)) ? str(row.Color) : ALLOWED[dest].color;
      row.NavIconSize = clamp(row.NavIconSize, 18, 40, 22);
      row.ShowNavIcon = bool(row.ShowNavIcon, true);
      row.ShowNavLabel = bool(row.ShowNavLabel, true);
      row.Active = bool(row.Active, def.Active === true);
      row.NavLocked = bool(row.NavLocked, def.NavLocked === true);
      if (row.NavSlot === 1 && row.NavLocked) row.Active = true;
      return row;
    }).sort(function(a,b){return a.NavSlot-b.NavSlot;});
  }
  function remember(rows) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:1, rows:normalizedRows(rows)})); } catch (err) {}
  }
  function restoreRows() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && Array.isArray(parsed.rows) ? normalizedRows(parsed.rows) : null;
    } catch (err) { return null; }
  }
  function iconUrl(row) {
    var url = str(row.IconUrl);
    if (url) return url;
    var id = str(row.IconFileId);
    return id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w240' : '';
  }
  function render(rows) {
    var nav = document.querySelector('.bottom-nav');
    if (!nav) return false;
    rows = normalizedRows(rows);
    var active = rows.filter(function(row){ return row.Active === true; });
    if (!active.length) return false;
    nav.innerHTML = '';
    nav.setAttribute('data-slot-count', String(active.length));
    active.forEach(function(row) {
      var button = document.createElement('button');
      button.type = 'button';
      button.dataset.page = row.NavDestination;
      button.dataset.navSlot = String(row.NavSlot);
      button.style.setProperty('--bottom-nav-accent', row.Color);
      button.style.setProperty('--bottom-nav-accent-bg', row.Color + '33');
      button.style.setProperty('--bottom-nav-icon-size', row.NavIconSize + 'px');
      button.setAttribute('aria-label', row.DisplayName || ALLOWED[row.NavDestination].label);
      button.addEventListener('click', function(){ if (typeof root.navigate === 'function') root.navigate(row.NavDestination); });

      var icon = document.createElement('span');
      icon.className = 'bottom-nav-icon';
      if (row.ShowNavIcon === false) {
        button.dataset.navIconState = 'disabled';
        icon.hidden = true;
      } else {
        var url = iconUrl(row);
        if (url) {
          button.dataset.navIconState = 'remote';
          var img = document.createElement('img');
          img.className = 'bottom-nav-custom-icon';
          img.alt = '';
          img.src = url;
          img.addEventListener('load', function() {
            button.dataset.navIconState = 'loaded';
          });
          img.addEventListener('error', function() {
            button.dataset.navIconState = 'load-failed';
            img.hidden = true;
          });
          icon.appendChild(img);
        } else {
          button.dataset.navIconState = row.IconText ? 'text' : 'empty';
          icon.textContent = row.IconText;
          icon.hidden = !row.IconText;
        }
      }

      var label = document.createElement('span');
      label.className = 'bottom-nav-label';
      label.textContent = row.ShowNavLabel === false ? '' : row.DisplayName;
      label.hidden = row.ShowNavLabel === false;
      button.appendChild(icon);
      button.appendChild(label);
      nav.appendChild(button);
    });
    if (root.PlatformImageEngine && typeof root.PlatformImageEngine.process === 'function') root.PlatformImageEngine.process(nav);
    return true;
  }
  function apply(rows) {
    if (!hasNavigationRows(rows)) return false;
    var normalized = normalizedRows(rows);
    remember(normalized);
    return render(normalized);
  }
  function restore() {
    var rows = restoreRows();
    return rows ? render(rows) : false;
  }
  function currentRowsFromAppState() {
    if (!root.APP_STATE) return [];
    if (Array.isArray(root.APP_STATE.dashboardHubAppearanceRows)) return root.APP_STATE.dashboardHubAppearanceRows;
    var map = root.APP_STATE.dashboardHubAppearanceMap || {};
    return Object.keys(map).map(function(key){return map[key];});
  }
  function pageMatches(page, dest) {
    if (page === dest) return true;
    if (dest === 'hub:sports' && ['team-fantasy','survivor','betting'].indexOf(String(page || '')) !== -1) return true;
    if (dest === 'more') {
      return page === 'profile' || page === 'notifications' || page === 'admin' || page === 'admin-games' ||
        page === 'admin-awards' || page === 'admin-reality-tv' || page === 'admin-appearance' ||
        String(page || '').indexOf('admin-game-setup:') === 0;
    }
    return false;
  }
  function setActive(page) {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.bottom-nav button[data-page]'));
    if (!buttons.length) return false;
    var exact = buttons.find(function(btn){return str(btn.dataset.page) === str(page);});
    var matched = exact || buttons.find(function(btn){return pageMatches(page, btn.dataset.page);});
    if (!matched && page === 'hub:general') matched = buttons.find(function(btn){return btn.dataset.page === 'more';});
    buttons.forEach(function(btn){btn.classList.toggle('active', btn === matched);});
    return !!matched;
  }

  function rawAdminRows() {
    var state = (typeof ADMIN_APPEARANCE_STATE !== 'undefined' ? ADMIN_APPEARANCE_STATE : (root.ADMIN_APPEARANCE_STATE || {}));
    var dash = state.dashboard || {};
    return normalizedRows(dash.hubAppearance || []);
  }
  function destinationOptions(selected) {
    return DESTINATIONS.map(function(item){return '<option value="'+esc(item.value)+'"'+(item.value===selected?' selected':'')+'>'+esc(item.label)+'</option>';}).join('');
  }
  function slotCard(row) {
    var locked = row.NavLocked === true;
    return '<div class="appearance-nav-slot" data-nav-slot-card="'+row.NavSlot+'">'+
      '<div class="appearance-nav-slot-head"><strong>Slot '+row.NavSlot+' · '+esc(row.DisplayName)+'</strong><span>'+(row.Active?'On':'Off')+'</span></div>'+
      '<div class="appearance-nav-grid">'+
      '<label><span>On / Off</span><input type="checkbox" data-nav-enabled '+(row.Active?'checked':'')+(locked?' disabled':'')+'></label>'+
      '<label><span>Destination Page</span><select class="input" data-nav-destination>'+destinationOptions(row.NavDestination)+'</select></label>'+
      '<label><span>Label</span><input class="input" data-nav-label value="'+esc(row.DisplayName)+'"></label>'+
      '<label><span>Show Icon</span><input type="checkbox" data-nav-show-icon '+(row.ShowNavIcon?'checked':'')+'></label>'+
      '<label><span>Fallback Icon</span><input class="input" data-nav-icon-text value="'+esc(row.IconText)+'" maxlength="8"></label>'+
      '<label class="appearance-nav-wide"><span>Icon / Logo URL</span><input class="input" data-nav-icon-url value="'+esc(row.IconUrl || '')+'" placeholder="https://…"></label>'+
      '<label><span>Icon Size</span><input class="input" data-nav-icon-size type="number" min="18" max="40" value="'+row.NavIconSize+'"></label>'+
      '<label><span>Active Color</span><input class="input" data-nav-color type="color" value="'+esc(row.Color)+'"></label>'+
      '<label><span>Show Label</span><input type="checkbox" data-nav-show-label '+(row.ShowNavLabel?'checked':'')+'></label>'+
      '<label><span>Protect Slot</span><input type="checkbox" data-nav-locked '+(locked?'checked':'')+'></label>'+
      '</div><div class="appearance-nav-actions">'+
      '<button type="button" class="admin-small-button secondary" onclick="adminNavigationSlotsMoveR1_('+row.NavSlot+',-1)"'+(row.NavSlot===1?' disabled':'')+'>↑ Move</button>'+
      '<button type="button" class="admin-small-button secondary" onclick="adminNavigationSlotsMoveR1_('+row.NavSlot+',1)"'+(row.NavSlot===6?' disabled':'')+'>↓ Move</button>'+
      '</div></div>';
  }
  function adminHtml() {
    var rows = rawAdminRows();
    return '<details class="card admin-collapsible-card appearance-navigation-card" open><summary><strong>Navigation Icons</strong><span>Six configurable bottom navigation shortcuts</span></summary>'+
      '<div class="appearance-card-body"><div class="admin-sub">Pages stay intact when a shortcut is replaced. Slot 6 starts Off for backward compatibility. Home can remain protected while other slots are reordered.</div>'+
      '<div id="appearanceNavigationSlotsR1" class="appearance-nav-slots">'+rows.map(slotCard).join('')+'</div>'+
      '<div class="admin-actions"><button type="button" class="button" onclick="adminNavigationSlotsSaveR1_()">Save Navigation</button><span class="admin-sub" id="appearanceNavigationStatusR1"></span></div></div></details>';
  }
  function collectAdminRows() {
    var base = rawAdminRows();
    return base.map(function(row) {
      var card = document.querySelector('[data-nav-slot-card="'+row.NavSlot+'"]');
      if (!card) return row;
      return Object.assign({}, row, {
        Active: !!card.querySelector('[data-nav-enabled]').checked,
        NavDestination: card.querySelector('[data-nav-destination]').value,
        DisplayName: str(card.querySelector('[data-nav-label]').value),
        ShowNavIcon: !!card.querySelector('[data-nav-show-icon]').checked,
        IconText: str(card.querySelector('[data-nav-icon-text]').value),
        IconUrl: str(card.querySelector('[data-nav-icon-url]').value),
        NavIconSize: clamp(card.querySelector('[data-nav-icon-size]').value,18,40,22),
        Color: card.querySelector('[data-nav-color]').value,
        ShowNavLabel: !!card.querySelector('[data-nav-show-label]').checked,
        NavLocked: !!card.querySelector('[data-nav-locked]').checked
      });
    });
  }
  function setAdminRows(rows) {
    var state = (typeof ADMIN_APPEARANCE_STATE !== 'undefined' ? ADMIN_APPEARANCE_STATE : (root.ADMIN_APPEARANCE_STATE || {}));
    if (!state.dashboard) state.dashboard = {};
    var others = (state.dashboard.hubAppearance || []).filter(function(row){
      return str(row && row.HubCategory).toLowerCase() !== 'navigation' && str(row && row.SettingKey).toLowerCase().indexOf('nav:') !== 0;
    });
    state.dashboard.hubAppearance = others.concat(normalizedRows(rows));
  }
  root.adminNavigationSlotsMoveR1_ = function(slot, delta) {
    var rows = collectAdminRows();
    var a = slot - 1, b = a + delta;
    if (a < 0 || b < 0 || a >= rows.length || b >= rows.length) return;
    if (rows[a].NavLocked || rows[b].NavLocked) return;
    var tmp = rows[a]; rows[a] = rows[b]; rows[b] = tmp;
    rows.forEach(function(row, index){ row.NavSlot=index+1; row.SettingKey='nav:'+(index+1); row.HubGroup=String(index+1); });
    setAdminRows(rows);
    var host=document.getElementById('appearanceNavigationSlotsR1'); if(host) host.innerHTML=rows.map(slotCard).join('');
  };
  root.adminNavigationSlotsSaveR1_ = async function() {
    var status = document.getElementById('appearanceNavigationStatusR1');
    var rows = collectAdminRows();
    if (status) status.textContent='Saving…';
    try {
      for (var i=0;i<rows.length;i++) {
        var row=rows[i];
        var payload={settingKey:'nav:'+(i+1),hubCategory:'navigation',hubGroup:String(i+1),displayName:row.DisplayName,
          color:row.Color,iconText:row.IconText,iconUrl:row.IconUrl,iconFileId:row.IconFileId||'',showNavIcon:row.ShowNavIcon,showNavLabel:row.ShowNavLabel,
          active:row.Active,navSlot:i+1,navDestination:row.NavDestination,navIconSize:row.NavIconSize,navLocked:row.NavLocked};
        var result=await root.apiAdminSaveAppearanceHubSetting(payload);
        if(!result||result.success===false) throw new Error(result&&(result.message||result.error)||('Could not save slot '+(i+1)));
        rows[i]=Object.assign({},row,result.setting||{});
      }
      setAdminRows(rows); apply(rows);
      if(status) status.textContent='Navigation saved.';
    } catch(err) { if(status) status.textContent=err&&err.message?err.message:String(err); }
  };
  root.adminAppearanceNavigationSlotsHtml_ = adminHtml;
  root.appApplyNavigationSlots_ = apply;
  root.appRestoreNavigationSlots_ = restore;
  root.appSetActiveNavigationSlot_ = setActive;
  root.PATTC_NAVIGATION_SLOTS_R1 = {apply:apply,restore:restore,setActive:setActive,normalize:normalizedRows,destinations:DESTINATIONS.slice()};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore);
  else setTimeout(restore,0);
})(window);

/* Bottom Nav Rescue R1: current-production compatibility + stale-route guard.
   This layer intentionally does not wrap Home or Team Fantasy renderers. */
(function(root) {
  'use strict';

  function str_(value) { return value == null ? '' : String(value).trim(); }
  function routePage_() {
    try {
      return str_(root.location && root.location.hash).replace(/^#/, '') || 'dashboard';
    } catch (err) {
      return str_(root.APP_STATE && root.APP_STATE.currentPage) || 'dashboard';
    }
  }
  function repairStaleRoute_(expectedPage) {
    var current = routePage_();
    if (current === str_(expectedPage)) return null;
    if (root.APP_STATE) root.APP_STATE.currentPage = current;
    var app = root.document && root.document.getElementById ? root.document.getElementById('app') : null;
    return app ? String(app.innerHTML || '') : '';
  }
  function guardRenderer_(name, expectedPage) {
    var original = root[name];
    if (typeof original !== 'function' || original.__pattcBottomNavRescueR1) return;
    var guarded = async function() {
      var args = arguments;
      var expected = typeof expectedPage === 'function' ? expectedPage.apply(null, args) : expectedPage;
      try {
        var html = await original.apply(this, args);
        var staleHtml = repairStaleRoute_(expected);
        return staleHtml === null ? html : staleHtml;
      } catch (err) {
        var staleHtml = repairStaleRoute_(expected);
        if (staleHtml !== null) return staleHtml;
        throw err;
      }
    };
    guarded.__pattcBottomNavRescueR1 = true;
    root[name] = guarded;
  }
  function installSnapshotGuard_() {
    var original = root.appCapturePageSnapshot_;
    if (typeof original !== 'function' || original.__pattcBottomNavRescueR1) return;
    var guarded = function(page) {
      if (str_(page) !== routePage_()) return;
      return original.apply(this, arguments);
    };
    guarded.__pattcBottomNavRescueR1 = true;
    root.appCapturePageSnapshot_ = guarded;
  }
  function installActiveGuard_() {
    var original = root.appSetActiveNavigationSlot_;
    if (typeof original !== 'function' || original.__pattcBottomNavRescueR1) return;
    var guarded = function(page) {
      var current = str_(root.APP_STATE && root.APP_STATE.currentPage);
      if (str_(page) !== 'dashboard' && current && current !== str_(page)) return true;
      return original.apply(this, arguments);
    };
    guarded.__pattcBottomNavRescueR1 = true;
    root.appSetActiveNavigationSlot_ = guarded;
    if (root.PATTC_NAVIGATION_SLOTS_R1) root.PATTC_NAVIGATION_SLOTS_R1.setActive = guarded;
  }
  function installForPage_(page) {
    page = str_(page);
    if (!page || page === 'dashboard' || page === 'team-fantasy') return;
    installSnapshotGuard_();
    installActiveGuard_();
    if (page === 'picks') guardRenderer_('renderPicksPage', 'picks');
    else if (page === 'survivor') guardRenderer_('renderSurvivorPage', 'survivor');
    else if (page === 'voting') guardRenderer_('renderVotingPage', 'voting');
    else if (page === 'ranking') guardRenderer_('renderRankingPage', 'ranking');
    else if (page === 'game-hub') guardRenderer_('renderGameModeHubPage', 'game-hub');
    else if (page === 'betting') guardRenderer_('renderBettingPage', 'betting');
    else if (page === 'leaderboard') guardRenderer_('renderLeaderboardPage', 'leaderboard');
    else if (page === 'season-hub') guardRenderer_('renderSeasonHubPage', 'season-hub');
    else if (page === 'leagues') guardRenderer_('renderLeaguesPage', 'leagues');
    else if (page === 'trophy-room') guardRenderer_('renderDashboardTrophyRoomPage_', 'trophy-room');
    else if (page === 'more') guardRenderer_('renderDashboardMorePage_', 'more');
    else if (page.indexOf('hub:') === 0) {
      guardRenderer_('renderDashboardHubPage_', function(category) {
        return 'hub:' + str_(category || 'general').toLowerCase();
      });
    }
  }
  function install_() {
    // navigationSlotsR1 is authoritative. Neutralize the legacy rendered-DOM
    // cache before app startup can replay stale icons/labels on a route change.
    root.appRememberBottomNavAppearance_ = function() { return false; };
    root.appRestoreBottomNavAppearance_ = function() { return false; };

    var originalEnsure = root.ensurePageModules_;
    if (typeof originalEnsure !== 'function' || originalEnsure.__pattcBottomNavRescueR1) return;
    var guardedEnsure = function(page) {
      // Preserve Home and Team Fantasy module loading exactly: no extra await,
      // renderer wrapping, snapshot wrapping, or navigation DOM work.
      if (str_(page) === 'dashboard' || str_(page) === 'team-fantasy') {
        return originalEnsure.apply(this, arguments);
      }
      var result = originalEnsure.apply(this, arguments);
      return Promise.resolve(result).then(function(value) {
        installForPage_(page);
        return value;
      });
    };
    guardedEnsure.__pattcBottomNavRescueR1 = true;
    root.ensurePageModules_ = guardedEnsure;
  }

  if (root.document && root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', install_);
  } else {
    root.setTimeout(install_, 0);
  }
})(window);
