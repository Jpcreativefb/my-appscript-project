/* Owner Visual Studio R3. Opt-in local preview; no production boot changes. */
(function (host) {
  'use strict';
  const TYPES = { draft: 'visual-studio-draft', published: 'visual-studio-published', version: 'visual-studio-version' };
  const maps = ['items', 'groups', 'groupMembers', 'moves', 'hidden', 'hiddenSelectors', 'collapse', 'generatedSections'];
  const copy = value => JSON.parse(JSON.stringify(value));
  function normalize(raw) {
    if (raw != null && (typeof raw !== 'object' || Array.isArray(raw))) throw new Error('Invalid manifest');
    const result = Object.assign({ version: 1, studioVersion: 'owner-visual-studio-r3', pageKey: '', meta: {} }, copy(raw || {}));
    maps.forEach(key => {
      if (result[key] == null) result[key] = {};
      if (typeof result[key] !== 'object' || Array.isArray(result[key])) throw new Error('Invalid manifest field: ' + key);
    });
    if (result.responsive != null) {
      if (typeof result.responsive !== 'object' || Array.isArray(result.responsive)) throw new Error('Invalid responsive manifest');
      for (const view of ['tablet','mobile']) {
        const layer = result.responsive[view]; if (layer == null) continue;
        if (typeof layer !== 'object' || Array.isArray(layer)) throw new Error('Invalid responsive view');
        for (const key of ['items','hidden','collapse']) {
          if (layer[key] == null) layer[key] = {};
          if (typeof layer[key] !== 'object' || Array.isArray(layer[key])) throw new Error('Invalid responsive field');
        }
      }
    }
    return result;
  }
  const responsiveStyles = new Set(['padding','gap','fontSize','headerFontSize','widthPct','widthMode','heightPx','heightMode','scale','textAlign','objectFit','objectPosition']);
  const breakpointFor = width => width <= 600 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop';
  function responsiveLayer(manifest, view, create = false) {
    if (view === 'desktop') return manifest;
    if (!['tablet','mobile'].includes(view)) throw new Error('Invalid responsive view');
    if (create) { manifest.responsive ||= {}; manifest.responsive[view] ||= { items: {}, hidden: {}, collapse: {} }; }
    return manifest.responsive?.[view] || { items: {}, hidden: {}, collapse: {} };
  }
  function resolveView(raw, view = 'desktop') {
    const result = normalize(raw), layer = responsiveLayer(result, view);
    if (view === 'desktop') return result;
    for (const [id, entry] of Object.entries(layer.items || {})) {
      const base = result.items[id] || {};
      result.items[id] = { ...base, ...entry, style: { ...base.style, ...entry.style } };
      if (Object.keys(entry.style || {}).length || entry.columns != null) result.items[id].original = false;
    }
    Object.assign(result.hidden, layer.hidden);
    for (const [id, hidden] of Object.entries(layer.hidden || {})) if (hidden && result.items[id]) result.items[id].original = false;
    for (const [id, config] of Object.entries(layer.collapse || {})) result.collapse[id] = { ...result.collapse[id], ...config };
    return result;
  }
  function exact(value) {
    function sort(v) {
      if (Array.isArray(v)) return v.map(sort);
      if (v && typeof v === 'object') return Object.keys(v).sort().reduce((r, k) => { r[k] = sort(v[k]); return r; }, {});
      return v;
    }
    return JSON.stringify(sort(normalize(value)));
  }
  function rowManifest(bundle, type, id) {
    if (!bundle || bundle.success !== true || !Array.isArray(bundle.overrides)) {
      throw new Error('Fresh Appearance read failed' + (bundle && bundle.error ? ': ' + String(bundle.error) : ''));
    }
    const matches = bundle.overrides.filter(row => String(row.EntityType || row.entityType) === type &&
      String(row.EntityId || row.entityId) === id && ![false, 'false', 'FALSE', 0, '0'].includes(row.Active == null ? row.active : row.Active));
    if (!matches.length) return null;
    const parsed = matches.map(row => {
      const value = row.ThemeOverrideJSON == null ? row.themeOverrideJSON : row.ThemeOverrideJSON;
      if (!value) throw new Error('Server row has no manifest');
      return normalize(typeof value === 'string' ? JSON.parse(value) : value);
    });
    if (parsed.some(value => exact(value) !== exact(parsed[0]))) throw new Error('Conflicting server rows for ' + type + '/' + id);
    return parsed[0];
  }

  // All server operations share this queue. The adapter is the only I/O boundary.
  function createController(adapter, options = {}) {
    let manifest = normalize(), published = normalize(), scope = null;
    let opened = false, demo = false, dirty = false, revision = 0, timer = null, queue = Promise.resolve(), lock = '';
    let status = 'Closed', statusBeforeDemo = 'Closed', hasDraft = false;
    const later = options.setTimeout || setTimeout, cancel = options.clearTimeout || clearTimeout;
    const notify = options.onChange || (() => {}), render = options.render || (() => {});
    function snapshot() { return { manifest: copy(manifest), published: copy(published), scope: scope && copy(scope), opened, demo, dirty, status, lock }; }
    function emit(text) { if (text) status = text; notify(snapshot()); }
    function enqueue(work) { const next = queue.then(work); queue = next.catch(() => {}); return next; }
    function clearTimer() { if (timer != null) cancel(timer); timer = null; }
    async function read() { return adapter.readFresh(copy(scope)); }
    async function write(type, id, value) {
      if (demo) throw new Error('Preview cannot write');
      const ack = await adapter.write(copy(scope), type, id, copy(value));
      if (!ack || ack.success !== true) throw new Error(ack && (ack.error || ack.message) || 'Server did not acknowledge save');
    }
    async function verified(type, id, expected) {
      let reason = 'server manifest differs';
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const value = rowManifest(await read(), type, id);
          if (value && exact(value) === exact(expected)) return value;
        } catch (error) { reason = error.message; }
      }
      throw new Error('Fresh verification failed after 5 reads: ' + reason);
    }
    async function saveLatest() {
      while (dirty) {
        const sequence = revision, intended = copy(manifest);
        emit('Auto-saving…');
        await write(TYPES.draft, scope.pageKey, intended);
        await verified(TYPES.draft, scope.pageKey, intended);
        hasDraft = true;
        if (sequence === revision) { dirty = false; emit('Draft Saved'); }
      }
    }
    function operation(name, work) {
      if (lock) return Promise.reject(new Error('Studio is busy: ' + lock));
      lock = name; clearTimer(); emit();
      return enqueue(work).catch(error => { emit('Save Failed: ' + error.message); throw error; })
        .finally(() => { lock = ''; emit(); });
    }
    const api = {
      snapshot,
      open(nextScope) {
        if (opened) return Promise.reject(new Error('Close Studio before opening another page'));
        return operation('open', async () => {
          scope = copy(nextScope);
          const bundle = await read();
          published = rowManifest(bundle, TYPES.published, scope.pageKey) || normalize({ pageKey: scope.pageKey });
          const draft=rowManifest(bundle, TYPES.draft, scope.pageKey); hasDraft=!!draft;
          manifest = draft || copy(published);
          if (manifest.pageKey && manifest.pageKey !== scope.pageKey) throw new Error('Draft belongs to another page');
          dirty = false; revision = 0; opened = true; demo = false;
          render(copy(manifest)); emit('Fresh server Draft loaded');
        });
      },
      edit(change) {
        if (!opened || demo || lock) throw new Error('Studio is not editable');
        const next = copy(manifest); change(next); manifest = normalize(next);
        manifest.pageKey = scope.pageKey;
        revision++; dirty = true; render(copy(manifest)); emit('Unsaved');
        clearTimer(); timer = later(() => { timer = null; api.flush().catch(() => {}); }, options.debounce == null ? 650 : options.debounce);
      },
      flush() {
        clearTimer();
        if (demo) return Promise.reject(new Error('Preview cannot save'));
        return enqueue(saveLatest).catch(error => { emit('Save Failed: ' + error.message); throw error; });
      },
      publish() {
        if (!opened || demo) return Promise.reject(new Error('Open an editable Studio first'));
        return operation('publish', async () => {
          if(!hasDraft)dirty=true;
          await saveLatest();
          const intended = copy(manifest);
          await write(TYPES.published, scope.pageKey, intended);
          published = await verified(TYPES.published, scope.pageKey, intended);
          const id = scope.pageKey + '::' + (options.versionId ? options.versionId() : host.crypto.randomUUID());
          await write(TYPES.version, id, intended);
          emit('Published + VERIFIED');
        });
      },
      versions() {
        if (!opened || demo) return Promise.reject(new Error('Open an editable Studio first'));
        return enqueue(async () => {
          const bundle = await read();
          rowManifest(bundle, TYPES.draft, scope.pageKey); // validates the response even when no draft exists
          return bundle.overrides.filter(r => (r.EntityType || r.entityType) === TYPES.version &&
            String(r.EntityId || r.entityId).startsWith(scope.pageKey + '::')).map(r => String(r.EntityId || r.entityId)).sort().reverse();
        });
      },
      revert() {
        if (!opened || demo) return Promise.reject(new Error('Open an editable Studio first'));
        return operation('revert', async () => {
          const bundle=await read();
          const next=rowManifest(bundle,TYPES.draft,scope.pageKey) || rowManifest(bundle,TYPES.published,scope.pageKey) || normalize({pageKey:scope.pageKey});
          manifest=next;hasDraft=!!rowManifest(bundle,TYPES.draft,scope.pageKey);revision++;dirty=false;render(copy(manifest));emit('Fresh server Draft loaded');
        });
      },
      restore(id) {
        if (!opened || demo) return Promise.reject(new Error('Open an editable Studio first'));
        return operation('restore', async () => {
          if (!String(id).startsWith(scope.pageKey + '::')) throw new Error('Version belongs to another page');
          await saveLatest();
          const selected = rowManifest(await read(), TYPES.version, id);
          if (!selected) throw new Error('Version not found');
          await write(TYPES.draft, scope.pageKey, selected);
          manifest = await verified(TYPES.draft, scope.pageKey, selected);
          revision++; dirty = false; hasDraft=true; render(copy(manifest)); emit('Draft Saved · Restored + VERIFIED');
        });
      },
      preview(enabled) {
        if (!opened || lock || dirty) throw new Error('Save the Draft before entering preview');
        if(enabled && !demo)statusBeforeDemo=status;
        demo = !!enabled; emit(demo ? 'DEMO / PREVIEW — NOT LIVE DATA' : statusBeforeDemo);
        return copy(manifest);
      },
      close() {
        if (!opened) return Promise.resolve();
        return operation('close', async () => {
          demo = false; await saveLatest();
          published = rowManifest(await read(), TYPES.published, scope.pageKey) || normalize({ pageKey: scope.pageKey });
          render(copy(published)); opened = false; emit('Closed');
        });
      }
    };
    return api;
  }

  // Existing authenticated dashboard read is a direct Sheet read, with no
  // public runtime-cache or in-flight reuse. No new endpoint or auth behavior.
  function serverAdapter(api) {
    return {
      readFresh: scope => api.apiAdminGetAppearanceDashboard(scope.gameId, true),
      write: (scope, type, id, manifest) => api.apiAdminSaveAppearanceOverride({
        gameId: scope.gameId, entityType: type, entityId: id, themeOverride: manifest, active: true
      })
    };
  }
  const safeSimilar = selector => /^[a-z][a-z0-9-]*\.[a-zA-Z_][a-zA-Z0-9_-]*$/.test(selector || '');
  const interactive = node => node.matches('button,input,select,textarea,[role="button"]') || !!node.querySelector('button,input,select,textarea,[role="button"]');
  const sectionSelector = 'section,details,article,.card,.panel,[class*="section"],[class*="hero"]';

  function createRenderer(root, options = {}) {
    const document = root.ownerDocument, originals = new Map(), keys = new Map();
    let generated = [], collapseCleanup = [];
    const collapseStates = new Map(), collapseControls = new Map();
  function slug_(value){
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48);
  }

  function meaningfulClasses_(node){
    if (!node || !node.classList) return [];
    return Array.from(node.classList).filter(function(name){
      if (!name || /^pattc-vs-/.test(name) || /^(active|open|hidden|selected|loading|is-|has-)/.test(name)) return false;
      return name.length < 70;
    }).slice(0,3);
  }

  function semanticDataKey_(node){
    if (!node || !node.getAttribute) return "";
    const attrs = ["data-pattc-vs-generated","data-section-id","data-category-id","data-question-id","data-position","data-game-id","data-entry-id","data-market-key","data-route","data-tab","data-view"];
    for (let i=0;i<attrs.length;i++) {
      const v = String(node.getAttribute(attrs[i]) || "").trim();
      if (v) return node.tagName.toLowerCase() + "[" + attrs[i] + "=" + v + "]";
    }
    return "";
  }

  function siblingIndex_(node){
    if (!node || !node.parentElement) return 0;
    return Array.from(node.parentElement.children).indexOf(node);
  }

  function visualIdentityText_(node){
    if(!node||node.nodeType!==1)return "";
    const attrs=["name","aria-label","data-label","title","placeholder"];
    for(let i=0;i<attrs.length;i++){const v=String(node.getAttribute&&node.getAttribute(attrs[i])||"").trim();if(v)return slug_(v);}
    if(node.matches(sectionSelector)){
      const h=node.querySelector(":scope > summary > span:first-child,:scope > summary > strong:first-child,:scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > .section-title,:scope > .card-title");
      const t=String(h&&h.textContent||"").trim(); if(t)return slug_(t.replace(/\b\d+\b/g,""));
    }
    if(/^(BUTTON|SUMMARY|H1|H2|H3|H4|LABEL)$/.test(node.tagName)){const t=String(node.textContent||"").trim().replace(/\s+/g," ");if(t)return slug_(t.replace(/\b\d+\b/g,""));}
    return "";
  }

  function visualAncestorToken_(node){
    let p=node&&node.parentElement;
    while(p&&p!==document.body){
      if(p.id)return "id-"+slug_(p.id);
      const sem=semanticDataKey_(p); if(sem)return slug_(sem);
      const id=visualIdentityText_(p); if(id)return slug_(p.tagName.toLowerCase()+"-"+meaningfulClasses_(p).join("-")+"-"+id);
      p=p.parentElement;
    }
    return "root";
  }


    function legacyKey(node){
      if(node.id)return "id:"+node.id;
      const semantic=semanticDataKey_(node);if(semantic)return semantic;
      const cls=meaningfulClasses_(node),tag=node.tagName.toLowerCase(),identity=visualIdentityText_(node),parent=visualAncestorToken_(node);
      return identity?"sem:"+tag+(cls.length?"."+cls.join("."):"")+"|p:"+parent+"|n:"+identity:"dom:"+tag+(cls.length?"."+cls.join("."):"")+"|p:"+parent+"|i:"+siblingIndex_(node);
    }
    const aliases=new Map();
    function key(node) {
      if (keys.has(node)) return keys.get(node);
      const inherited = node.getAttribute('data-pattc-vs-key');
      let id = inherited || (node.id ? 'id:' + node.id : 'r3:' + path(node));
      keys.set(node, id); const legacy=legacyKey(node); if(!aliases.has(legacy) || !root.contains(aliases.get(legacy)))aliases.set(legacy,node); return id;
    }
    function path(node) {
      if (node === root) return 'root';
      const parent = node.parentElement;
      if (!parent || !root.contains(parent)) throw new Error('Element is outside this page');
      return (parent.id ? '#' + parent.id : path(parent)) + '/' + node.tagName.toLowerCase() + ':' + Array.from(parent.children).indexOf(node);
    }
    function index() { [root, ...root.querySelectorAll('*')].forEach(key); }
    function find(id) { return Array.from(keys).find(([node, value]) => value === id && root.contains(node))?.[0] || (aliases.get(id) && root.contains(aliases.get(id)) ? aliases.get(id) : null) || (key(root) === id ? root : null); }
    function remember(node) {
      if (!originals.has(node)) originals.set(node, { style: node.getAttribute('style'), open: node.open, parent: node.parentNode, index: Array.from(node.parentNode?.children || []).indexOf(node) });
    }
    function reset() {
      collapseCleanup.forEach(clean => clean()); collapseCleanup = []; collapseControls.clear();
      // Return moved children before removing their generated containers.
      for (const [node, saved] of originals) {
        if (!root.contains(node)) continue; // The app owns replacements; never resurrect detached runtime nodes.
        if (saved.parent && (saved.parent.isConnected || root.contains(saved.parent))) {
          const siblings = Array.from(saved.parent.children).filter(n => n !== node);
          if (node.parentNode !== saved.parent || Array.from(saved.parent.children).indexOf(node) !== saved.index) saved.parent.insertBefore(node, siblings[saved.index] || null);
        }
        if (saved.style == null) node.removeAttribute('style'); else node.setAttribute('style', saved.style);
        if (node.tagName === 'DETAILS') node.open = saved.open;
      }
      generated.forEach(n => { keys.delete(n); n.remove(); }); generated = []; originals.clear();
    }
    function style(node, value) {
      remember(node);
      const set = (k, v) => node.style.setProperty(k, String(v), 'important');
      function original(properties){
        const probe=document.createElement('div');probe.setAttribute('style',originals.get(node).style || '');
        properties.forEach(property=>{const value=probe.style.getPropertyValue(property);if(value)node.style.setProperty(property,value,probe.style.getPropertyPriority(property));else node.style.removeProperty(property);});
      }
      if(value.backgroundMode==='original') original(['background','background-color','background-image','background-position','background-size','background-repeat','background-origin','background-clip','background-attachment']);
      if(value.heightMode==='original') original(['height','min-height','max-height','overflow-y']);
      if(value.widthMode==='original') original(['width','max-width','margin-left','margin-right']);
      if (value.backgroundMode === 'transparent') { set('background-color', 'transparent'); set('background-image', 'none'); }
      else if (value.backgroundMode === 'color' || (!value.backgroundMode && value.backgroundColor)) {
        set('background-color', value.backgroundColor || 'transparent'); if (value.backgroundMode === 'color') set('background-image', 'none');
      }
      // Original mode deliberately leaves the reset runtime declarations intact.
      ['color', 'textAlign'].forEach(k => { if (value[k]) set(k === 'textAlign' ? 'text-align' : k, value[k]); });
      ['padding', 'gap', 'fontSize', 'borderWidth', 'borderRadius'].forEach(k => {
        if (value[k] != null && value[k] !== '') set(k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), Math.max(0, Number(value[k]) || 0) + 'px');
      });
      if(value.scale != null && value.scale !== '') set('zoom',Math.max(50,Math.min(150,Number(value.scale)||100))/100);
      if(value.headerFontSize != null && value.headerFontSize !== '') node.querySelectorAll(':scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > summary,:scope > [class*="title"]').forEach(header=>{remember(header);header.style.setProperty('font-size',Math.max(8,Number(value.headerFontSize)||16)+'px','important');});
      if (value.objectFit) set('object-fit', value.objectFit);
      if (value.objectPosition) { set('object-position', value.objectPosition); set('background-position', value.objectPosition); }
      if (value.borderColor) set('border-color', value.borderColor);
      if (value.widthMode === 'full') set('width', '100%');
      else if (value.widthMode === 'auto') { set('width', 'auto'); set('max-width', 'none'); }
      else if (value.widthMode !== 'original' && value.widthPct != null && value.widthPct !== '') { set('width', Math.max(1, Math.min(100, Number(value.widthPct) || 100)) + '%'); set('max-width', '100%'); }
      const heightMode = value.heightMode || (value.minHeight != null ? 'min' : 'original');
      const height = Math.max(0, Math.min(4000, Number(value.heightPx ?? value.minHeight) || 0));
      if (heightMode !== 'original') {
        set('height', heightMode === 'fixed' ? height + 'px' : 'auto');
        set('min-height', heightMode === 'min' ? height + 'px' : '0');
        set('max-height', heightMode === 'fixed' ? height + 'px' : 'none');
        set('overflow-y', heightMode === 'fixed' ? 'auto' : 'visible');
      }
    }
    function target(node){return node.querySelector(':scope > .pattc-vs-generated-body,:scope > .admin-collapsible-body,:scope > .dashboard-subhub-section-body,:scope > .dashboard-home-collapsible-body,:scope > .card-body,:scope > .content,:scope > .grid')||node;}
    function render(raw, context = {}) {
      reset(); index(); const view = context.view || breakpointFor(host.innerWidth || 1280), manifest = resolveView(raw, view);
      if (context.editing && view !== 'desktop') {
        remember(root); root.style.setProperty('width', view === 'mobile' ? '390px' : '768px', 'important');
        root.style.setProperty('max-width', 'calc(100vw - 330px)', 'important');
        root.style.setProperty('margin-left', '0', 'important');
      }
      for (const [id, config] of Object.entries(manifest.generatedSections)) {
        const node = document.createElement(config.collapsible===false?'section':'details'), title = document.createElement(config.collapsible===false?'h2':'summary'), body=document.createElement('div');
        node.className = 'card'; body.className='pattc-vs-generated-body'; title.textContent = config.title || 'New Section'; node.appendChild(title);node.appendChild(body);node.open=config.defaultOpen!==false;
        target(find(config.parentKey) || root).appendChild(node); keys.set(node, 'generated:' + id); generated.push(node);
      }
      const originalNode=node=>Object.entries(manifest.items).some(([id,item])=>item.original && find(id)===node);
      for (const group of Object.values(manifest.groups)) {
        if (!group.selector) continue;
        try { root.querySelectorAll(group.selector).forEach(node => { if (!originalNode(node)) style(node, group.style || {}); }); } catch (_) { /* Invalid historical selector does not break the page. */ }
      }
      for (const [id, name] of Object.entries(manifest.groupMembers)) {
        const node = find(id), group = manifest.groups[name];
        if (node && group && !originalNode(node)) style(node, group.style || {});
      }
      for (const [id, item] of Object.entries(manifest.items)) {
        const node = find(id); if (!node || originalNode(node)) continue;
        style(node, item.style || {});
        if (item.columns) { const body=target(node);remember(body);body.style.setProperty('display', 'grid', 'important'); body.style.setProperty('grid-template-columns', 'repeat(' + Math.max(1, Math.min(4, Number(item.columns))) + ', minmax(0, 1fr))', 'important'); }
      }
      for (const [id, destination] of Object.entries(manifest.moves)) {
        const node = find(id), target = find(destination);
        if (node && target && node !== root && node !== target && !node.contains(target)) { remember(node); const body=target.querySelector(':scope > .pattc-vs-generated-body,:scope > .card-body,:scope > .content,:scope > .admin-collapsible-body')||target;if(!node.contains(body))body.appendChild(node); }
      }
      for (const [id, item] of Object.entries(manifest.items)) {
        if (!item.order) continue;
        const node = find(id), target = find(item.order.parentKey);
        if (node && target && node !== root && !node.contains(target)) { remember(node); target.insertBefore(node, Array.from(target.children).filter(n => n !== node)[item.order.index] || null); }
      }
      for (const [id, hidden] of Object.entries(manifest.hidden)) {
        const node = find(id); if (node && hidden && !originalNode(node)) { remember(node); node.style.setProperty('display', 'none', 'important'); }
      }
      for (const [selector, hidden] of Object.entries(manifest.hiddenSelectors)) {
        if (hidden && safeSimilar(selector)) root.querySelectorAll(selector).forEach(node => { if (!interactive(node) && !originalNode(node)) { remember(node); node.style.setProperty('display', 'none', 'important'); } });
      }
      if (context.editing && view !== 'desktop') { root.style.setProperty('width', view === 'mobile' ? '390px' : '768px', 'important'); root.style.setProperty('max-width', 'calc(100vw - 330px)', 'important'); }
      for (const [id, config] of Object.entries(manifest.collapse)) {
        const node = find(id); if (!node) continue;
        if (config.collapsible === false) {
          if (node.tagName === 'DETAILS') {
            remember(node); node.open = true;
            const summary = node.querySelector(':scope > summary');
            const keepOpen = event => { event.preventDefault(); event.stopImmediatePropagation(); };
            summary?.addEventListener?.('click', keepOpen, true);
            collapseCleanup.push(() => summary?.removeEventListener?.('click', keepOpen, true));
          }
          continue;
        }
        const originalChildren = Array.from(node.childNodes || node.children);
        let header = node.querySelector(':scope > summary,:scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > header,:scope > .section-title,:scope > .card-title,:scope > [class*="title"]');
        const addedHeader = !header;
        if (!header) { header = document.createElement(node.tagName === 'DETAILS' ? 'summary' : 'h2'); header.textContent = node.getAttribute('aria-label') || 'Section'; node.insertBefore(header, node.firstChild); }
        remember(node);
        // Keep native details open: the body wrapper supplies the blind animation.
        if (node.tagName === 'DETAILS') node.open = true;
        const body = document.createElement('div'); body.className = 'r3-collapse-body';
        const children = Array.from(node.childNodes || node.children).filter(child => child !== header);
        children.forEach(child => body.appendChild(child)); node.appendChild(body);
        const enabled = config.collapsible !== false;
        const stateKey = JSON.stringify([context.scope || '', manifest.pageKey, id, view, !!context.editing]);
        const signature = JSON.stringify(config);
        let state = collapseStates.get(stateKey);
        if (!state || state.signature !== signature) {
          let open = config.defaultOpen !== false;
          if (!context.editing && config.rememberPlayerState) {
            try { const saved = (options.storage || host.localStorage)?.getItem('pattc:r3:collapse:' + stateKey); if (saved !== null && saved !== undefined) open = saved === 'open'; } catch (_) { /* Storage can be unavailable. */ }
          }
          state = { signature, open }; collapseStates.set(stateKey, state);
        }
        const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'r3-collapse-toggle';
        toggle.setAttribute('aria-label', 'Toggle section'); toggle.textContent = '↕';
        if (enabled) header.appendChild(toggle);
        function paint(animate) {
          const open = !enabled || state.open;
          const reduced = host.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          body.style.setProperty('overflow', 'hidden');
          body.style.setProperty('transition', animate && config.collapseStyle === 'blind' && !reduced ? 'max-height 240ms ease' : 'none');
          body.style.setProperty('max-height', open ? (body.scrollHeight || 4000) + 'px' : '0px');
          body.inert = !open;
          body.setAttribute('aria-hidden', String(!open));
          toggle.setAttribute('aria-expanded', String(open));
          if (open && !animate) body.style.setProperty('max-height', 'none');
        }
        function setOpen(open) {
          if (!enabled) return;
          // Freeze the measured open height before starting a closing transition.
          body.style.setProperty('max-height', (body.scrollHeight || 4000) + 'px');
          void body.offsetHeight;
          state.open = !!open; paint(true);
          if (!context.editing && config.rememberPlayerState) {
            try { (options.storage || host.localStorage)?.setItem('pattc:r3:collapse:' + stateKey, state.open ? 'open' : 'closed'); } catch (_) { /* Browser-only preference, never gameplay I/O. */ }
          }
        }
        function click(event) { event.preventDefault(); event.stopImmediatePropagation(); setOpen(!state.open); }
        function ended() { if (!enabled || state.open) body.style.setProperty('max-height', 'none'); }
        header.addEventListener?.('click', click, true); body.addEventListener?.('transitionend', ended);
        collapseControls.set(id, setOpen); paint(false);
        collapseCleanup.push(() => {
          header.removeEventListener?.('click', click, true); body.removeEventListener?.('transitionend', ended);
          toggle.remove();
          if (body.parentNode === node) { Array.from(body.childNodes || body.children).forEach(child => node.insertBefore(child, body)); body.remove(); originalChildren.filter(child => child.parentNode === node).forEach(child => node.appendChild(child)); }
          if (addedHeader) header.remove();
        });
      }
    }
    index(); return { key, find, render, reset, setSectionOpen: (id, open) => collapseControls.get(id)?.(open) };
  }

  function mountBrowser() {
    if (!host.PATTC_STUDIO_R3_LOCAL || !['localhost', '127.0.0.1', '[::1]'].includes(host.location.hostname)) return;
    const document = host.document;
    let outline=null, hoverOutline=null, hoverTarget=null, launch=null;
    const groupOpen = new Map();
    let view = 'desktop';
    let root = null, renderer = null, selected = null, mode = 'element', picking = true, moving = false, minimized = false;
    let runtimeScope=null, runtimeManifest=null, runtimeRequest=null;
    let panel = null, frame = null, observer = null, renderPending = false, undo = [], versions = [];
    const admin = () => typeof host.isAdminSession === 'function' ? host.isAdminSession(host.getSession()) : !!host.getSession?.()?.isAdmin;
    function scope() {
      const pageKey = String((typeof APP_STATE !== 'undefined' ? APP_STATE.currentPage : host.APP_STATE?.currentPage) || host.location.hash.slice(1) || 'dashboard').split(/[?:]/)[0].toLowerCase();
      return { pageKey, gameId: /^(dashboard|sports-hub|profile|admin.*)$/.test(pageKey) ? '__pattc_global__' : String(host.getFrontendGameId?.() || '__pattc_global__') };
    }
    function sameScope(a, b) { return a && b && a.gameId === b.gameId && a.pageKey === b.pageKey; }
    function watch() { observer?.observe(document.getElementById('app') || document.body, { childList: true, subtree: true }); }
    function apply(manifest) {
      if (controller?.snapshot().opened && !sameScope(controller.snapshot().scope, scope())) return;
      observer?.disconnect();
      try {
        const app = document.getElementById('app'); if (!app) return;
        if (root !== app) { renderer?.reset(); root = app; renderer = createRenderer(root); }
        renderer.render(manifest, { view: controller.snapshot().opened && controller.snapshot().lock !== 'close' ? view : breakpointFor(host.innerWidth || 1280), editing: controller.snapshot().opened && controller.snapshot().lock !== 'close', scope: scope().gameId });
        highlight(selectedNode());
        const caption=panel?.querySelector('[data-selection]');
        if(caption && selected)caption.textContent=selectedNode()?name(selectedNode()):'Selected target unavailable; waiting for the page to render it.';
      } finally { watch(); }
    }
    function error(error) { const status = panel?.querySelector('[data-status]'); if (status) status.textContent = error.message; else if(launch)launch.textContent='R3: '+error.message; }
    function perform(work) { Promise.resolve().then(work).catch(error); }
    const controller = createController(serverAdapter(host), { render: apply, onChange: updateStatus });
    function updateStatus(state) {
      if (!panel) return;
      panel.querySelector('[data-status]').textContent = state.status;
      panel.querySelector('[data-status]').style.color = state.status.startsWith('Save Failed') ? '#ff9696' : '#b9e3b9';
      const saveGroup=Array.from(panel.querySelectorAll('[data-studio-group]')).find(n=>n.dataset.studioGroup==='Save Settings / Restore');
      if(saveGroup)saveGroup.querySelector('summary').textContent='Save Settings / Restore · '+state.status;
      const publishStatus=panel.querySelector('[data-publish-status]');
      if(publishStatus && /[Pp]ublish|[Vv]erification/.test(state.status))publishStatus.textContent=state.status;
    }
    function name(node) { return String(node.querySelector(':scope > h1,:scope > h2,:scope > h3,:scope > summary')?.textContent || node.getAttribute('aria-label') || node.id || node.tagName).trim().slice(0, 75); }
    function highlight(node, hoverOnly = false){
      let marker = hoverOnly ? hoverOutline : outline;
      if (!node && !marker) return;
      if (!marker) {
        marker=document.createElement('div');
        marker.dataset.studioOutline=hoverOnly?'hover':'selected';
        marker.style.cssText='position:fixed;pointer-events:none;border:2px '+(hoverOnly?'dashed #80c7f5':'solid #dca64c')+';z-index:2147482997;box-sizing:border-box';
        document.body.appendChild(marker);
        if(hoverOnly)hoverOutline=marker;else outline=marker;
      }
      if(!node || !node.isConnected){marker.hidden=true;return;}
      const box=node.getBoundingClientRect();marker.hidden=false;Object.assign(marker.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});
    }
    function clearSelection() { selected=null;hoverTarget=null;moving=false;highlight(null);highlight(null,true); }
    function refreshHighlights() {
      const state=controller.snapshot();
      highlight(state.opened && !state.demo ? selectedNode() : null);
      highlight(state.opened && !state.demo && picking ? hoverTarget : null,true);
    }
    function selectedNode() { return selected && renderer?.find(selected); }
    function similar() {
      const node = selectedNode();
      const cls = node && Array.from(node.classList).find(c => !/^(pattc-vs-|r3-|is-|active|selected|open|hidden)/.test(c));
      const selector = cls ? node.tagName.toLowerCase() + '.' + cls : '';
      return safeSimilar(selector) ? selector : '';
    }
    function edit(change) {
      const previous = controller.snapshot().manifest;
      controller.edit(change); undo.push(previous); if (undo.length > 60) undo.shift();
    }
    function item(manifest) {
      if (!selected) throw new Error('Select an element first');
      if(!manifest.items[selected]){
        const previous=Object.keys(manifest.items).find(id=>renderer.find(id)===selectedNode());
        manifest.items[selected]=previous?copy(manifest.items[previous]):{style:{}};
        if(previous && previous!==selected)delete manifest.items[previous];
      }
      return manifest.items[selected];
    }
    function moveTo(destination) {
      const node = selectedNode(), target = renderer.find(destination);
      if (!node || !target || node === root || node === target || node.contains(target)) throw new Error('Choose a destination outside the selected element');
      edit(m => { m.moves[selected] = destination; if (m.items[selected]) delete m.items[selected].order; });
      moving = false; showPanel();
    }
    function restoreOriginal() {
      edit(m => { maps.filter(k => !['groups','generatedSections'].includes(k)).forEach(k => Object.keys(m[k]).forEach(id=>{if(id===selected || renderer.find(id)===selectedNode())delete m[k][id];})); ['tablet','mobile'].forEach(device => { const target = responsiveLayer(m, device); ['items','hidden','collapse'].forEach(k => { if (target[k]) delete target[k][selected]; }); }); m.items[selected] = { original: true, style: {} }; });
      showPanel();
    }
    function layer(m) { return responsiveLayer(m, view, true); }
    function viewItem(m) { if (view === 'desktop') return item(m); const target = layer(m); target.items[selected] ||= { style: {} }; return target.items[selected]; }
    function field(label, key, type, value, choices, category = 'style') {
      const wrap = document.createElement('label'); wrap.textContent = label;
      const responsive = category !== 'style' || responsiveStyles.has(key);
      const input = document.createElement(choices ? 'select' : 'input'); input.dataset.field = key;
      if (choices) choices.forEach(([id, text]) => { const option = document.createElement('option'); option.value = id; option.textContent = text; input.appendChild(option); });
      else { input.type = type; if (type === 'number') { input.min = '0'; input.max = '4000'; } }
      input.value = value == null ? '' : value;
      input.addEventListener('input', () => {
        try {
          if(['backgroundColor','color','borderColor'].includes(key) && input.value && host.CSS && !host.CSS.supports('color',input.value))return;
          edit(m => {
            const destination = responsive ? layer(m) : m;
            let values;
            if (category === 'collapse') { destination.collapse[selected] ||= resolveView(m, view).collapse[selected] ? {} : { collapsible: false }; values = destination.collapse[selected]; }
            else if (category === 'item') values = viewItem(m);
            else { const entry = responsive ? viewItem(m) : item(m); delete entry.original; entry.style ||= {}; values = entry.style; }
            if (input.value === '') delete values[key];
            else values[key] = type === 'number' ? Number(input.value) : type === 'boolean' ? input.value === 'true' : input.value;
            if (key === 'backgroundColor') values.backgroundMode = 'color';
            if (key === 'widthPct') values.widthMode = 'percent';
          });
          if(key==='backgroundColor')panel.querySelector('[data-field=backgroundMode]').value='color';
          if(key==='widthPct')panel.querySelector('[data-field=widthMode]').value='percent';
          updateInheritance();
        } catch (err) { error(err); }
      }); wrap.appendChild(input);
      function updateInheritance() {
        if (!responsive) return;
        const m = controller.snapshot().manifest, target = responsiveLayer(m, view);
        const values = category === 'collapse' ? target.collapse?.[selected] : category === 'item' ? target.items?.[selected] : target.items?.[selected]?.style;
        const custom = view !== 'desktop' && Object.prototype.hasOwnProperty.call(values || {}, key);
        badge.textContent = view === 'desktop' ? 'Desktop base' : custom ? 'Custom ' + (view === 'mobile' ? 'Mobile' : 'Tablet') : 'Using Desktop';
        reset.hidden = !custom;
      }
      const badge = document.createElement('small'), reset = document.createElement('button');
      if (responsive) {
        reset.type = 'button'; reset.textContent = 'Reset Override'; reset.setAttribute('aria-label', 'Reset Override: ' + label);
        reset.onclick = event => { event.preventDefault(); perform(() => { edit(m => {
          const target = layer(m), values = category === 'collapse' ? target.collapse?.[selected] : category === 'item' ? target.items?.[selected] : target.items?.[selected]?.style;
          if (values) { delete values[key]; if (key === 'widthPct') delete values.widthMode; }
        }); showPanel(); }); };
        wrap.appendChild(badge); wrap.appendChild(reset); updateInheritance();
      }
      return wrap;
    }
    function showPanel() {
      if (!controller.snapshot().opened) return;
      if (!panel) { panel = document.createElement('aside'); panel.id = 'pattcStudioR3'; document.body.appendChild(panel); }
      panel.replaceChildren();
      const title = document.createElement('strong'); title.textContent = 'Owner Visual Studio R3'; panel.appendChild(title);
      function button(label, work) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = () => perform(work); panel.appendChild(b); return b; }
      button(minimized ? 'Expand' : 'Minimize', () => { minimized = !minimized; showPanel(); });
      button('Close', async () => { removePreview(); await controller.close(); runtimeScope=scope();runtimeManifest=controller.snapshot().published; panel.remove(); panel = null; clearSelection(); undo = []; });
      const status = document.createElement('p'); status.dataset.status = ''; status.setAttribute('role', 'status'); panel.appendChild(status); updateStatus(controller.snapshot());
      panel.style.width = minimized ? '190px' : '300px'; if (minimized) return;
      button(picking ? 'Cursor selection ON' : 'Cursor selection OFF', () => { picking = !picking; showPanel(); });
      ['element', 'section', 'page'].forEach(value => button(value === 'page' ? 'Whole Page' : value === 'element' ? 'Element' : 'Section', () => { mode = value; clearSelection(); if (mode === 'page') selected = renderer.key(root); showPanel(); }));
      ['desktop','tablet','mobile'].forEach(value => { const b = button(value[0].toUpperCase() + value.slice(1), () => { view = value; apply(controller.snapshot().manifest); showPanel(); }); b.setAttribute('aria-pressed', String(view === value)); });
      button('Clear Selection', () => { clearSelection(); showPanel(); });
      refreshHighlights();
      const node = selectedNode(), caption = document.createElement('p'); caption.dataset.selection = selected || '';  caption.textContent = node ? name(node) : 'Click a real PATTC element to select it.'; panel.appendChild(caption);
      if (node) {
        const current=resolveView(controller.snapshot().manifest, view);const existing=Object.keys(current.items).find(id=>renderer.find(id)===node);
        const style = current.items[selected]?.style || current.items[existing]?.style || {}, computed = host.getComputedStyle(node);
        const grid = document.createElement('div'); grid.className = 'r3-fields'; panel.appendChild(grid);
        grid.appendChild(field('Background', 'backgroundMode', 'text', style.backgroundMode || (style.backgroundColor ? 'color' : 'original'), [['original','Original'],['transparent','Transparent'],['color','Color']]));
        [['Background color','backgroundColor'],['Text color','color'],['Border color','borderColor']].forEach(([label,key]) => grid.appendChild(field(label,key,'text',style[key] || (key === 'backgroundColor' ? computed.backgroundColor : key === 'color' ? computed.color : computed.borderColor))));
        [['Border px','borderWidth'],['Radius','borderRadius'],['Padding','padding'],['Gap','gap'],['Body font','fontSize'],['Header font','headerFontSize'],['Width %','widthPct'],['Height px','heightPx'],['Scale %','scale']].forEach(([label,key]) => grid.appendChild(field(label,key,'number',style[key])));
        grid.appendChild(field('Width mode','widthMode','text',style.widthMode || 'original',[['original','Original'],['auto','Auto'],['full','Full'],['percent','Percent']]));
        grid.appendChild(field('Height mode','heightMode','text',style.heightMode || 'original',[['original','Original'],['auto','Auto'],['min','Minimum'],['fixed','Fixed + Scroll']]));
        grid.appendChild(field('Alignment','textAlign','text',style.textAlign || 'left',[['left','Left'],['center','Center'],['right','Right']]));
        grid.appendChild(field('Columns','columns','number',current.items[selected]?.columns, [['1','1'],['2','2'],['3','3'],['4','4']], 'item'));
        grid.appendChild(field('Image crop','objectFit','text',style.objectFit || 'cover',[['cover','Cover'],['contain','Contain'],['fill','Fill']]));
        grid.appendChild(field('Image position','objectPosition','text',style.objectPosition || '50% 50%'));
        if (mode === 'section') {
          const config = current.collapse[selected] || {};
          grid.appendChild(field('Collapsible','collapsible','boolean',String(!!current.collapse[selected] && config.collapsible !== false),[['true','ON'],['false','OFF']], 'collapse'));
          grid.appendChild(field('Default State','defaultOpen','boolean',String(config.defaultOpen !== false),[['true','Open'],['false','Closed']], 'collapse'));
          grid.appendChild(field('Collapse Style','collapseStyle','text',config.collapseStyle || 'instant',[['instant','Instant'],['blind','Roll Up / Blind']], 'collapse'));
          grid.appendChild(field('Remember Player State','rememberPlayerState','boolean',String(config.rememberPlayerState === true),[['true','ON'],['false','OFF']], 'collapse'));
          [true,false].forEach(open => button(open ? 'Open Section' : 'Close Section', () => { renderer.setSectionOpen(selected, open); refreshHighlights(); }));
        }
        button('Move → Pick Destination', () => { moving = true; picking = true; status.textContent = 'Click the destination section'; });
        const destinations = document.createElement('select'); const prompt = document.createElement('option'); prompt.textContent = 'Move into named section…'; prompt.value = ''; destinations.appendChild(prompt);
        root.querySelectorAll(sectionSelector).forEach(target => { if (target === node || node.contains(target)) return; const option = document.createElement('option'); option.value = renderer.key(target); option.textContent = name(target); destinations.appendChild(option); });
        destinations.onchange = () => perform(() => moveTo(destinations.value)); panel.appendChild(destinations);
        [-1,1].forEach(delta => button(delta < 0 ? '↑ Up' : '↓ Down', () => { const active = selectedNode(); const parent = active?.parentElement; if(!parent)throw new Error('Selected target is unavailable'); const index = Array.from(parent.children).indexOf(active); edit(m => { item(m).order = { parentKey: renderer.key(parent), index: Math.max(0, Math.min(parent.children.length - 1, index + delta)) }; }); }));
        button('Hide Selected', () => { edit(m => { layer(m).hidden[selected] = true; delete viewItem(m).original; }); showPanel(); });
        button('Show Selected', () => { edit(m => { layer(m).hidden[selected] = false; }); showPanel(); });
        button('Restore Selected Original', restoreOriginal);
        const selector = similar(), count = selector ? root.querySelectorAll(selector).length : 0;
        const matches = document.createElement('p'); matches.textContent = selector ? selector + ' · ' + count + ' matches · ' + Array.from(root.querySelectorAll(selector)).filter(n => !interactive(n)).length + ' safe to hide' : 'No safe class-qualified Similar selector'; panel.appendChild(matches);
        button('Apply Style to Similar', () => { if (!selector) throw new Error('No safe Similar selector'); edit(m => { m.groups['Similar: ' + selector] = { selector, style: copy(item(m).style || {}) }; }); });
        [true,false].forEach(hidden => button(hidden ? 'Hide Similar' : 'Show Similar', () => { if (!selector) throw new Error('No safe Similar selector'); edit(m => { m.hiddenSelectors[selector] = hidden; }); }));
        [['Universal Buttons','button,.button,[role="button"]'],['Universal Headers','h1,h2,h3,h4,summary'],['Universal Sections',sectionSelector]].forEach(([label,selector]) => button(label, () => edit(m => { m.groups[label] = { selector, style: copy(item(m).style || {}) }; })));

        button('Split / Extract to New Section', () => createSection(true));
      }
      button('New Section', () => createSection(false));
      button('Undo', () => { if (!undo.length) return; const previous = undo.pop(); controller.edit(m => { Object.keys(m).forEach(k => delete m[k]); Object.assign(m, previous); }); showPanel(); });
      button('Original Page', () => { edit(m => { maps.forEach(k => m[k] = {}); delete m.responsive; }); showPanel(); });
      button('Revert to Server Draft', async () => { await controller.revert(); undo = []; showPanel(); });
      ['Save Element','Save Section','Save Page Draft'].forEach(label => button(label, () => controller.flush()));
      button('Publish Page', () => controller.publish());
      button('Load Version History', async () => { versions = await controller.versions(); showPanel(); });
      const history = document.createElement('select'); history.setAttribute('aria-label','Saved versions'); versions.forEach(id => { const o = document.createElement('option'); o.textContent = id; o.value = id; history.appendChild(o); }); panel.appendChild(history);
      button('Restore Version as Draft', async () => { await controller.restore(history.value); undo = []; showPanel(); });
      const hidden = resolveView(controller.snapshot().manifest, view).hidden;
      if (selected && view !== 'desktop') { const custom = Object.prototype.hasOwnProperty.call(responsiveLayer(controller.snapshot().manifest, view).hidden || {}, selected); button((custom ? 'Custom ' + (view === 'mobile' ? 'Mobile' : 'Tablet') : 'Using Desktop') + ' · Visibility', () => {}); if (custom) button('Reset Override: Visibility', () => { edit(m => delete layer(m).hidden[selected]); showPanel(); }); }
      Object.keys(hidden).filter(k => hidden[k]).forEach(id => button('Show ' + (renderer.find(id) ? name(renderer.find(id)) : id), () => { edit(m => { layer(m).hidden[id] = false; }); showPanel(); }));
      const phase = document.createElement('select'); phase.setAttribute('aria-label','Demo state'); ['empty','in-progress','live','final','locked'].forEach(value => { const o = document.createElement('option'); o.value = value; o.textContent = value; phase.appendChild(o); }); panel.appendChild(phase);
      ['full','leaderboard','compare'].forEach(kind => button('Demo ' + kind, () => preview(kind, phase.value)));
      button('Demo Off', () => { removePreview(); showPanel(); });
      organizePanel();
    }
    function organizePanel() {
      const names=['Layouts','Appearance / Style','Hide / Show','Save Settings / Restore','Publish Pages','Demo Values'];
      const groups=new Map();
      names.forEach(name=>{
        const group=document.createElement('details');group.dataset.studioGroup=name;
        group.open=groupOpen.has(name)?groupOpen.get(name):['Layouts','Appearance / Style'].includes(name);
        const summary=document.createElement('summary');summary.textContent=name;group.appendChild(summary);
        group.addEventListener('toggle',()=>groupOpen.set(name,group.open));groups.set(name,group);
      });
      const layoutFields=new Set(['collapsible','defaultOpen','collapseStyle','rememberPlayerState','columns','padding','gap','widthPct','heightPx','scale','widthMode','heightMode']);
      const grids=new Map();
      ['Layouts','Appearance / Style'].forEach(name=>{const grid=document.createElement('div');grid.className='r3-fields';groups.get(name).appendChild(grid);grids.set(name,grid);});
      const oldGrid=panel.querySelector('.r3-fields');
      if(oldGrid){Array.from(oldGrid.children).forEach(label=>grids.get(layoutFields.has(label.querySelector('[data-field]').dataset.field)?'Layouts':'Appearance / Style').appendChild(label));oldGrid.remove();}
      Array.from(panel.children).forEach(node=>{
        const text=node.textContent;
        let group=null;
        if(node.hasAttribute('data-status'))group='Save Settings / Restore';
        else if(node.tagName==='BUTTON'){
          if(/^(Hide |Show )/.test(text))group='Hide / Show';
          else if(/^(Publish)/.test(text))group='Publish Pages';
          else if(/^(Demo)/.test(text))group='Demo Values';
          else if(/^(Undo|Original Page|Revert|Save |Load Version|Restore)/.test(text))group='Save Settings / Restore';
          else if(/^(Apply Style|Universal)/.test(text))group='Appearance / Style';
          else if(/Columns$|^(Move|↑|↓|Default |Open Section|Close Section|Split |New Section)/.test(text))group='Layouts';
        }else if(node.tagName==='SELECT')group=node.getAttribute('aria-label')==='Demo state'?'Demo Values':node.getAttribute('aria-label')==='Saved versions'?'Save Settings / Restore':'Layouts';
        else if(node.tagName==='P' && !node.hasAttribute('data-selection'))group='Hide / Show';
        if(group)groups.get(group).appendChild(node);
      });
      const published=document.createElement('p');published.dataset.publishStatus='';published.textContent='Publish requires exact server verification before Version creation.';groups.get('Publish Pages').appendChild(published);
      names.forEach(name=>panel.appendChild(groups.get(name)));
      updateStatus(controller.snapshot());
    }
    function createSection(extract) {
      if (extract && (!selectedNode() || selectedNode() === root)) throw new Error('Select an element inside a section first');
      const id = host.crypto.randomUUID(), node = selectedNode();
      edit(m => { m.generatedSections[id] = { title: 'New Section', parentKey: renderer.key(root) }; if (extract) { m.moves[selected] = 'generated:' + id; if (m.items[selected]) delete m.items[selected].order; } });
      if (!extract) selected = 'generated:' + id; showPanel();
    }
    function removePreview() { if (frame) frame.remove(); frame = null; if (controller.snapshot().demo) controller.preview(false); }
    function preview(kind, phase) {
      removePreview(); highlight(null); const cloneManifest = controller.preview(true);
      try {
        const markup = host.PATTC_STUDIO_R3_DEMO.render(root, { kind, phase, pageKey: scope().pageKey, manifest: cloneManifest });
        frame = document.createElement('iframe'); frame.id = 'pattcStudioR3Demo'; frame.title = 'DEMO / PREVIEW — NOT LIVE DATA'; frame.setAttribute('sandbox','');
        const css = Array.from(document.querySelectorAll('link[rel="stylesheet"],style')).map(n => n.outerHTML).join('');
        frame.srcdoc = '<!doctype html><html><head><base href="' + document.baseURI.replace(/"/g,'&quot;') + '"><meta http-equiv="Content-Security-Policy" content="script-src \'none\'; connect-src \'none\'; form-action \'none\'; frame-src \'none\'">' + css + '</head><body><strong>DEMO / PREVIEW — NOT LIVE DATA · ' + phase + '</strong>' + markup + '</body></html>';
        document.body.appendChild(frame); showPanel();
      } catch (err) { removePreview(); throw err; }
    }
    const css = document.createElement('style'); css.textContent = '#pattcStudioR3{position:fixed;z-index:2147483000;right:8px;top:8px;max-height:94vh;overflow:auto;padding:12px;border:1px solid #c99748;border-radius:12px;background:#171d29;color:#eee;box-shadow:0 8px 30px #0008;font:12px system-ui}#pattcStudioR3 button{padding:6px;margin:3px;border:1px solid #627089;border-radius:5px;background:#293447;color:#fff;font:inherit}#pattcStudioR3 select,#pattcStudioR3 input{width:100%;max-width:100%;background:#101722;color:#fff;border:1px solid #657089;padding:4px}#pattcStudioR3 details{border-top:1px solid #46536b;padding:8px 0}#pattcStudioR3 summary{cursor:pointer;font-weight:700;padding:5px 0}#pattcStudioR3 .r3-fields{display:grid;grid-template-columns:1fr 1fr;gap:6px}#pattcStudioR3Demo{position:fixed;inset:0;width:calc(100% - 330px);height:100vh;background:#151923;border:0;z-index:2147482999}#pattcStudioR3Launch{position:fixed;right:12px;bottom:80px;z-index:2147482998;padding:9px;background:#242d40;color:#efcd86;border:1px solid #c99748;border-radius:10px}'; document.head.appendChild(css);
    launch = document.createElement('button'); launch.id = 'pattcStudioR3Launch'; launch.textContent = 'Visual Studio R3 · LOCAL';
    launch.onclick = () => perform(async () => { if (!admin()) throw new Error('Owner access required'); if (!controller.snapshot().opened){launch.textContent='Loading fresh Studio Draft…';await controller.open(scope());}launch.textContent='Visual Studio R3 · LOCAL';showPanel(); }); document.body.appendChild(launch);
    document.addEventListener('pointermove',event=>{
      const state=controller.snapshot();
      hoverTarget=state.opened && !state.demo && picking && root?.contains(event.target)
        ? (mode==='section'||moving?event.target.closest(sectionSelector):mode==='page'?root:event.target) : null;
      refreshHighlights();
    },true);
    host.addEventListener('scroll',refreshHighlights,true);
    host.addEventListener('resize', () => { const state = controller.snapshot(); if (state.opened) apply(state.manifest); else if (runtimeManifest) apply(runtimeManifest); refreshHighlights(); });
    document.addEventListener('click', event => {
      if (!controller.snapshot().opened || event.target.closest('#pattcStudioR3,#pattcStudioR3Launch') || !root?.contains(event.target)) return;
      if (!picking && !controller.snapshot().demo) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (controller.snapshot().demo) return;
      perform(() => {
        const node = (moving || mode === 'section') ? event.target.closest(sectionSelector) : mode === 'page' ? root : event.target;
        if (!node || !root.contains(node)) return;
        if (moving) moveTo(renderer.key(node)); else { selected = renderer.key(node); hoverTarget=null; showPanel(); }
      });
    }, true);
    ['click','submit','change','input','keydown','pointerdown','drop'].forEach(type => host.addEventListener(type,event => {
      if (controller.snapshot().demo && !event.target.closest?.('#pattcStudioR3')) { event.preventDefault(); event.stopImmediatePropagation(); }
    },true));
    host.addEventListener('beforeunload', event => { if (controller.snapshot().dirty) { event.preventDefault(); event.returnValue = ''; } });
    async function runtimeAppearance(){
      const current=scope();
      if(controller.snapshot().opened)return;
      if(sameScope(runtimeScope,current)){if(runtimeManifest)apply(runtimeManifest);return;}
      if(runtimeRequest)return;
      runtimeRequest=true;
      try{
        const bundle=await host.apiGetGameAppearance(current.gameId);
        if(!controller.snapshot().opened && sameScope(current,scope())){runtimeScope=current;runtimeManifest=rowManifest(bundle,TYPES.published,current.pageKey)||normalize({pageKey:current.pageKey});apply(runtimeManifest);}
      }catch(err){console.warn('R3 published runtime read failed',err.message);}finally{runtimeRequest=null;}
    }
    observer = new MutationObserver(() => {
      if (renderPending) return; renderPending = true;
      Promise.resolve().then(async () => {
        renderPending = false; launch.hidden = !admin();
        const state = controller.snapshot();
        if (state.opened && !sameScope(state.scope, scope())) {
          removePreview(); try { await controller.close(); panel?.remove(); panel = null; clearSelection(); } catch (err) { error(err); } return;
        }
        if (state.opened && !state.demo) apply(state.manifest);
        else if(!state.opened) runtimeAppearance();
      });
    }); watch(); launch.hidden = !admin(); runtimeAppearance();
    host.PATTC_OWNER_VISUAL_STUDIO_R3 = { open: () => launch.click(), close: async () => {removePreview();await controller.close();panel?.remove();panel=null;clearSelection();}, snapshot: controller.snapshot };
  }
  const exports = { TYPES, normalize, exact, rowManifest, createController, serverAdapter, createRenderer, safeSimilar, interactive, resolveView, responsiveLayer, breakpointFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = exports;
  else { host.PATTC_STUDIO_R3 = exports; if (host.document.readyState === 'loading') host.document.addEventListener('DOMContentLoaded', mountBrowser); else mountBrowser(); }
})(typeof window !== 'undefined' ? window : globalThis);
