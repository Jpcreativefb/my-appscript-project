/* Owner Visual Studio R3. Opt-in local preview; no production boot changes. */
(function (host) {
  'use strict';
  const TYPES = { draft: 'visual-studio-draft', published: 'visual-studio-published', version: 'visual-studio-version', template: 'visual-studio-template' };
  const TEMPLATE_LIBRARY = '__pattc_global__';
  const TEMPLATE_FAMILIES = ['Reality TV','Sports','Awards','General'];
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
  const responsiveStyles = new Set(['margin','padding','gap','fontSize','headerFontSize','widthPct','widthMode','heightPx','heightMode','scale','textAlign','objectFit','objectPosition']);
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

  const PRODUCTION_BACKEND = 'https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec';
  function developmentWritePolicy(config, actualUrl, bridge, identity) {
    const blocked = reason => ({ allowed: false, label: 'READ ONLY — ' + reason, backend: actualUrl || 'unknown' });
    if (!actualUrl || actualUrl === PRODUCTION_BACKEND) return blocked('Production backend');
    if (!config || config.environment !== 'isolated-test') return blocked('Backend not explicitly configured for isolated testing');
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.apiUrl || '') || config.apiUrl !== actualUrl) return blocked('Backend URL mismatch');
    if (!config.scriptId || !config.spreadsheetId || config.scriptId === '1KdBY1vvNGgdl9khWfb8G7mSqG_kbWvLc_vKbubEoB8knIwy83tAkvB_3' || config.spreadsheetId === '1py9-zQIAp2aSl9oK6oyH8UQ6151m2mSE2TmwoyXWveY') return blocked('Separate project and Sheet required');
    for (const proof of [bridge, identity]) {
      if (!proof || proof.environment !== 'isolated-test' || proof.apiUrl !== config.apiUrl || proof.scriptId !== config.scriptId || proof.spreadsheetId !== config.spreadsheetId) return blocked('Isolated backend identity not verified');
    }
    return { allowed: true, label: 'ISOLATED TEST — Draft writes enabled', backend: actualUrl };
  }
  // Production is explicitly opt-in and read-only until BOTH the same-origin
  // Pages bridge and an authenticated admin Apps Script identity check succeed.
  // Browser UI flags are not authority: the API separately authenticates every admin write.
  function productionWritePolicy(hostname, actualUrl, enabled, bridge, identity) {
    const blocked = reason => ({ allowed: false, label: 'READ ONLY — ' + reason, backend: actualUrl || 'unknown' });
    if (enabled !== true || !hostname || ['localhost','127.0.0.1','[::1]'].includes(hostname)) return blocked('Production Studio is not enabled on this host');
    if (actualUrl !== PRODUCTION_BACKEND) return blocked('Production backend URL mismatch');
    if (!bridge || bridge.success !== true || bridge.studioProductionBridge !== true || bridge.apiUrl !== actualUrl) return blocked('Production Pages bridge not verified');
    if (!identity || identity.success !== true || identity.environment !== 'production' || identity.verified !== true || identity.apiUrl !== actualUrl) return blocked('Production Apps Script/Sheet identity not verified');
    return { allowed: true, production: true, label: 'PRODUCTION — Authorized admin Draft writes enabled', backend: actualUrl };
  }
  const verifiedDevelopmentEnvironments = new WeakMap();
  const verifiedProductionSessions = new WeakMap();
  async function verifyDevelopmentEnvironment(api, config, actualUrl) {
    let policy = developmentWritePolicy(config, actualUrl);
    verifiedDevelopmentEnvironments.set(api, policy);
    if (config && config.environment === 'isolated-test' && actualUrl !== PRODUCTION_BACKEND && config.apiUrl === actualUrl) {
      try {
        const bridge = await (await api.fetch('./api/app', { cache: 'no-store' })).json();
        if (bridge.apiUrl !== actualUrl) throw new Error('Proxy backend mismatch');
        const identity = await api.api('studioEnvironment', {});
        policy = developmentWritePolicy(config, actualUrl, bridge, identity);
      } catch (_) { policy = { allowed: false, label: 'READ ONLY — Isolated environment verification failed', backend: actualUrl }; }
      verifiedDevelopmentEnvironments.set(api, policy);
    }
    return Object.freeze({ ...policy });
  }
  async function verifyProductionEnvironment(api, hostname, enabled, actualUrl) {
    let policy = productionWritePolicy(hostname, actualUrl, enabled);
    verifiedDevelopmentEnvironments.set(api, policy);
    if (enabled === true && !['localhost','127.0.0.1','[::1]'].includes(hostname) && actualUrl === PRODUCTION_BACKEND) {
      try {
        const bridgeResponse = await api.fetch('./api/app', { cache: 'no-store' });
        if (!bridgeResponse.ok) throw new Error('Production bridge unavailable');
        const bridge = await bridgeResponse.json();
        const identity = await api.api('adminGetStudioProductionIdentity', {});
        policy = productionWritePolicy(hostname, actualUrl, enabled, bridge, identity);
        if (policy.allowed) {
          const session = typeof api.getSession === 'function' ? api.getSession() : null;
          if (!session || !session.token || typeof api.isAdminSession !== 'function' || !api.isAdminSession(session))
            throw new Error('Authenticated owner session required');
          verifiedProductionSessions.set(api, session.token);
        }
      } catch (_) { policy = { allowed: false, label: 'READ ONLY — Production identity verification failed', backend: actualUrl }; }
      verifiedDevelopmentEnvironments.set(api, policy);
    }
    return Object.freeze({ ...policy });
  }
  function requireDevelopmentWrite(api) {
    const policy = verifiedDevelopmentEnvironments.get(api);
    if (!policy || policy.allowed !== true) throw new Error(policy?.label || 'Studio writes blocked: backend identity has not been verified');
    if (policy.production) {
      const session = typeof api.getSession === 'function' ? api.getSession() : null;
      if (!session || !session.token || session.token !== verifiedProductionSessions.get(api) ||
          typeof api.isAdminSession !== 'function' || !api.isAdminSession(session))
        throw new Error('Studio writes blocked: owner session changed; reopen Studio to verify again');
    }
  }

  // All server operations share this queue. The adapter is the only I/O boundary.
  function createController(adapter, options = {}) {
    let manifest = normalize(), published = normalize(), saved = normalize(), scope = null;
    let opened = false, demo = false, dirty = false, revision = 0, timer = null, queue = Promise.resolve(), lock = '';
    let status = 'Closed', statusBeforeDemo = 'Closed', hasDraft = false;
    const later = options.setTimeout || setTimeout, cancel = options.clearTimeout || clearTimeout;
    const assertWritable = options.assertWritable || (() => {});
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
        assertWritable();
        const sequence = revision, intended = copy(manifest);
        emit('Saving…');
        await write(TYPES.draft, scope.pageKey, intended);
        await verified(TYPES.draft, scope.pageKey, intended);
        hasDraft = true; saved = copy(intended);
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
          manifest = draft || copy(published); saved = copy(manifest);
          if (manifest.pageKey && manifest.pageKey !== scope.pageKey) throw new Error('Draft belongs to another page');
          dirty = false; revision = 0; opened = true; demo = false;
          render(copy(manifest)); emit('Fresh server Draft loaded');
        });
      },
      edit(change) {
        assertWritable();
        if (!opened || demo || lock) throw new Error('Studio is not editable');
        const next = copy(manifest); change(next); manifest = normalize(next);
        manifest.pageKey = scope.pageKey;
        revision++; dirty = true; render(copy(manifest)); emit('Unsaved');
        clearTimer(); timer = later(() => { timer = null; api.flush().catch(() => {}); }, options.debounce == null ? 650 : options.debounce);
      },
      restoreSelected(id) {
        if (!id) throw new Error('Select a section or element first');
        api.edit(next => {
          maps.forEach(key => { if (Object.prototype.hasOwnProperty.call(saved[key], id)) next[key][id] = copy(saved[key][id]); else delete next[key][id]; });
          ['tablet','mobile'].forEach(view => {
            const target = responsiveLayer(next, view, true), base = responsiveLayer(saved, view);
            ['items','hidden','collapse'].forEach(key => { if (Object.prototype.hasOwnProperty.call(base[key], id)) target[key][id] = copy(base[key][id]); else delete target[key][id]; });
          });
        });
      },
      flush() {
        const fail = error => { emit('Save Failed: ' + error.message); throw error; };
        try {
          assertWritable();
          if (!opened || demo) throw new Error(demo ? 'Preview cannot save' : 'Open an editable Studio first');
        } catch (error) { return Promise.reject(error).catch(fail); }
        clearTimer();
        const requestedChanges = dirty;
        if (requestedChanges) emit('Saving…');
        return enqueue(async () => {
          if (dirty) await saveLatest();
          else emit(requestedChanges ? 'Draft Saved' : 'No changes to save');
        }).catch(fail);
      },
      publish() {
        try { assertWritable(); } catch (error) { return Promise.reject(error); }
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
        try { assertWritable(); } catch (error) { return Promise.reject(error); }
        if (!opened || demo) return Promise.reject(new Error('Open an editable Studio first'));
        return operation('revert', async () => {
          const bundle=await read();
          const next=rowManifest(bundle,TYPES.draft,scope.pageKey) || rowManifest(bundle,TYPES.published,scope.pageKey) || normalize({pageKey:scope.pageKey});
          manifest=next;saved=copy(next);hasDraft=!!rowManifest(bundle,TYPES.draft,scope.pageKey);revision++;dirty=false;render(copy(manifest));emit('Fresh server Draft loaded');
        });
      },
      restore(id) {
        try { assertWritable(); } catch (error) { return Promise.reject(error); }
        if (!opened || demo) return Promise.reject(new Error('Open an editable Studio first'));
        return operation('restore', async () => {
          if (!String(id).startsWith(scope.pageKey + '::')) throw new Error('Version belongs to another page');
          await saveLatest();
          const selected = rowManifest(await read(), TYPES.version, id);
          if (!selected) throw new Error('Version not found');
          await write(TYPES.draft, scope.pageKey, selected);
          manifest = await verified(TYPES.draft, scope.pageKey, selected);
          saved=copy(manifest); revision++; dirty = false; hasDraft=true; render(copy(manifest)); emit('Draft Saved · Restored + VERIFIED');
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
      write: (scope, type, id, manifest) => { requireDevelopmentWrite(api); return api.apiAdminSaveAppearanceOverride({
        gameId: scope.gameId, entityType: type, entityId: id, themeOverride: manifest, active: true
      }); }
    };
  }
  // Phase 1: page appearance templates saved only in the authenticated admin
  // AppearanceOverrides store. Never copy picks, contestants, questions or scores.
  // Templates are private global rows, not public Published appearance.
  function createTemplateManager(adapter, controller, options = {}) {
    const assertWritable = options.assertWritable || (() => {});
    const idGenerator = options.createId || (() => host.crypto.randomUUID());
    const now = options.now || (() => new Date().toISOString());
    const libraryScope = { gameId: TEMPLATE_LIBRARY, pageKey: 'template-library' };
    const validGame = state => {
      assertWritable();
      if (!state.opened || state.demo || state.lock || !state.scope ||
          !state.scope.pageKey || !state.scope.gameId || state.scope.gameId === TEMPLATE_LIBRARY)
        throw new Error('Open a real game in editable Visual Studio first');
      return state.scope;
    };
    function entries(bundle) {
      if (!bundle || bundle.success !== true || !Array.isArray(bundle.overrides))
        throw new Error('Fresh template library read failed');
      return bundle.overrides.filter(row =>
        String(row.EntityType || row.entityType) === TYPES.template &&
        String(row.GameId || row.gameId) === TEMPLATE_LIBRARY &&
        ![false, 'false', 'FALSE', 0, '0'].includes(row.Active == null ? row.active : row.Active))
        .map(row => {
          const id = String(row.EntityId || row.entityId || '');
          if (!/^r3-template::[a-zA-Z0-9_-]{6,100}$/.test(id)) throw new Error('Invalid template identifier');
          const manifest = rowManifest(bundle, TYPES.template, id);
          const info = manifest.meta && manifest.meta.template;
          if (!info || typeof info.name !== 'string' || !TEMPLATE_FAMILIES.includes(info.family) ||
              info.pageKey !== manifest.pageKey) throw new Error('Invalid template metadata');
          return { id, name: info.name, family: info.family, pageKey: info.pageKey, manifest };
        });
    }
    async function freshTemplates() { assertWritable(); return entries(await adapter.readFresh(libraryScope)); }
    async function save(name, family) {
      name = String(name || '').trim();
      if (!name || name.length > 80) throw new Error('Enter a template name (up to 80 characters)');
      if (!TEMPLATE_FAMILIES.includes(family)) throw new Error('Select a template game type');
      const initial = validGame(controller.snapshot());
      await controller.flush();
      const state = controller.snapshot(), scope = validGame(state);
      if (scope.gameId !== initial.gameId || scope.pageKey !== initial.pageKey)
        throw new Error('Game changed while saving template');
      const id = 'r3-template::' + idGenerator();
      if (!/^r3-template::[a-zA-Z0-9_-]{6,100}$/.test(id)) throw new Error('Invalid template identifier');
      const manifest = normalize(state.manifest);
      manifest.pageKey = scope.pageKey;
      manifest.meta = { template: { name, family, pageKey: scope.pageKey, savedAt: now() } };
      await adapter.write(libraryScope, TYPES.template, id, manifest);
      const confirmed = rowManifest(await adapter.readFresh(libraryScope), TYPES.template, id);
      if (!confirmed || exact(confirmed) !== exact(manifest)) throw new Error('Template server verification failed');
      return { id, name, family, pageKey: scope.pageKey };
    }
    async function apply(id) {
      const initial = validGame(controller.snapshot());
      if (!/^r3-template::[a-zA-Z0-9_-]{6,100}$/.test(String(id || ''))) throw new Error('Choose a saved template');
      const chosen = (await freshTemplates()).find(item => item.id === id);
      if (!chosen) throw new Error('Saved template not found');
      if (chosen.pageKey !== initial.pageKey) throw new Error('This template belongs to a different page type');
      await controller.flush();
      const current = controller.snapshot(), scope = validGame(current);
      if (scope.gameId !== initial.gameId || scope.pageKey !== initial.pageKey)
        throw new Error('Game changed while applying template');
      // Preserve the existing Draft on the target game as a recoverable version.
      const backupId = scope.pageKey + '::before-template-' + idGenerator();
      await adapter.write(scope, TYPES.version, backupId, current.manifest);
      const backup = rowManifest(await adapter.readFresh(scope), TYPES.version, backupId);
      if (!backup || exact(backup) !== exact(current.manifest)) throw new Error('Could not verify pre-template backup');
      const next = normalize(chosen.manifest);
      next.pageKey = scope.pageKey;
      delete next.meta.template;
      next.meta.appliedTemplate = { name: chosen.name, family: chosen.family, at: now() };
      controller.edit(manifest => { Object.keys(manifest).forEach(key => delete manifest[key]); Object.assign(manifest, copy(next)); });
      await controller.flush();
      return { id, name: chosen.name, gameId: scope.gameId, pageKey: scope.pageKey, backupId };
    }
    return { list: freshTemplates, save, apply };
  }

  const safeSimilar = selector => /^[a-z][a-z0-9-]*\.[a-zA-Z_][a-zA-Z0-9_-]*$/.test(selector || '');
  const interactive = node => node.matches('button,input,select,textarea,[role="button"]') || !!node.querySelector('button,input,select,textarea,[role="button"]');
  const sectionHeader = node => node.querySelector(':scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > summary,:scope > header') || node.querySelector('h1,h2,h3,h4,summary');
  const sectionSelector = 'section,details,article,.card,.panel,[class*="section"],[class*="hero"]';

  function createRenderer(root, options = {}) {
    const document = root.ownerDocument, originals = new Map(), keys = new Map();
    let generated = [], collapseCleanup = [];
    const textOriginals = new Map();
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
      textOriginals.forEach((text, node) => { node.nodeValue = text; }); textOriginals.clear();
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
      ['margin', 'padding', 'gap', 'fontSize', 'borderWidth', 'borderRadius'].forEach(k => {
        if (value[k] != null && value[k] !== '') set(k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), Math.max(0, Number(value[k]) || 0) + 'px');
      });
      if(value.scale != null && value.scale !== '') set('zoom',Math.max(50,Math.min(150,Number(value.scale)||100))/100);
      if(value.headerFontSize != null && value.headerFontSize !== '') [sectionHeader(node)].filter(Boolean).forEach(header=>{remember(header);header.style.setProperty('font-size',Math.max(8,Number(value.headerFontSize)||16)+'px','important');});
      if (value.headerColor || value.headerBackground) [sectionHeader(node)].filter(Boolean).forEach(header => { remember(header); if (value.headerColor) header.style.setProperty('color', value.headerColor, 'important'); if (value.headerBackground) header.style.setProperty('background-color', value.headerBackground, 'important'); });
      if (value.borderWidth > 0) set('border-style', 'solid');
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
        root.style.setProperty('max-width', '100%', 'important');
        root.style.setProperty('margin-left', 'auto', 'important'); root.style.setProperty('margin-right', 'auto', 'important');
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
        if (item.headerText != null) {
          const header = sectionHeader(node);
          if (header) {
            const texts = [];
            const walk = parent => Array.from(parent.childNodes || []).forEach(child => { if (child.nodeType === 3 && child.nodeValue.trim()) texts.push(child); else if (child.nodeType === 1 && !child.matches('button,input,select,svg')) walk(child); }); walk(header);
            texts.forEach((text, index) => { textOriginals.set(text, text.nodeValue); text.nodeValue = index ? '' : String(item.headerText); });
          }
        }
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
      if (context.editing && view !== 'desktop') { root.style.setProperty('width', view === 'mobile' ? '390px' : '768px', 'important'); root.style.setProperty('max-width', '100%', 'important'); }
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
        remember(node); remember(header);
        const headerColor = header.style.getPropertyValue('background-color');
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
          const color = open ? config.expandedColor : config.collapsedColor;
          if (color || headerColor) header.style.setProperty('background-color', color || headerColor, 'important'); else header.style.removeProperty('background-color');
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
        let lastScroll = host.scrollY || 0;
        const onScroll = () => { const next = host.scrollY || 0; if (Math.abs(next - lastScroll) > 8) { setOpen(next >= lastScroll || next <= 0); lastScroll = next; } };
        if (config.collapseOnScroll && !context.editing) { host.addEventListener?.('scroll', onScroll, { passive: true }); collapseCleanup.push(() => host.removeEventListener?.('scroll', onScroll)); }
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

  // Compact color UI: previews are transient; only Apply enters the existing Draft edit path.
  function parseColor(value) {
    const text = String(value || '').trim().toLowerCase();
    if (text === 'transparent') return [0, 0, 0, 0];
    const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(text);
    if (hex) {
      const full = hex[1].length < 5 ? [...hex[1]].map(c => c + c).join('') : hex[1];
      return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)).concat(full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1);
    }
    const rgb = /^rgba?\(([^)]+)\)$/.exec(text);
    if (!rgb) return null;
    const parts = rgb[1].trim().split(/[\s,\/]+/);
    if (parts.length < 3 || parts.length > 4 || parts.some(p => !/^\d*\.?\d+%?$/.test(p))) return null;
    const values = parts.map((p, i) => Number(p.replace('%', '')) * (p.endsWith('%') ? (i === 3 ? .01 : 2.55) : 1));
    if (values.slice(0, 3).some(v => v < 0 || v > 255.0001) || (values.length === 4 && values[3] > 1)) return null;
    return values.slice(0, 3).map(Math.round).concat(values.length === 4 ? values[3] : 1);
  }
  function colorFormats(color) {
    const rgb = color.slice(0, 3), alpha = Math.round(color[3] * 1000) / 1000;
    const hex = '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
    return { hex, hexAlpha: hex + (alpha < 1 ? Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase() : ''), rgb: alpha < 1 ? `rgba(${rgb.join(', ')}, ${alpha})` : `rgb(${rgb.join(', ')})` };
  }
  function blendColor(front, back) { return front.slice(0, 3).map((n, i) => Math.round(n * front[3] + back[i] * (1 - front[3]))).concat(1); }
  function colorContrast(a, b) {
    const luminance = c => c.slice(0, 3).map(n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  }
  function createColorEditor(document, options) {
    const box = document.createElement('div'); box.className = 'r3-color-editor'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', options.label + ' color editor');
    const add = (tag, text, parent = box) => { const node = document.createElement(tag); if (text) node.textContent = text; parent.appendChild(node); return node; };
    const button = (text, work, parent = box) => { const node = add('button', text, parent); node.type = 'button'; node.onclick = work; return node; };
    const read = key => { try { const value = JSON.parse(options.storage?.getItem('pattc:r3:colors:' + key) || '[]'); return Array.isArray(value) ? value.filter(v => parseColor(v)).slice(0, 12) : []; } catch (_) { return []; } };
    const store = (key, values) => { try { options.storage?.setItem('pattc:r3:colors:' + key, JSON.stringify(values.slice(0, 12))); } catch (_) { /* Optional local palette preference. */ } };
    const original = parseColor(options.value) || [255, 255, 255, 1]; let current = [...original], valid = true;
    add('strong', options.label); add('p', 'Preview only until Apply. Your selected section stays active.');
    const modes = add('div'), panes = {};
    for (const mode of ['Color Picker', 'Palettes', 'Custom']) {
      const pane = add('div'); panes[mode] = pane; pane.hidden = mode !== 'Color Picker';
      const tab = button(mode, () => { Object.entries(panes).forEach(([name, p]) => { p.hidden = name !== mode; }); }, modes); tab.setAttribute('aria-label', mode + ' mode');
    }
    const swatch = add('div'); swatch.className = 'r3-color-preview'; swatch.setAttribute('aria-label', 'Selected color preview');
    const formats = add('p'); formats.className = 'r3-color-formats';
    const picker = add('input', '', panes['Color Picker']); picker.type = 'color'; picker.setAttribute('aria-label', 'Visual color picker');
    const customLabel = add('label', 'HEX, RGB or RGBA', panes.Custom), custom = add('input', '', customLabel); custom.type = 'text'; custom.setAttribute('aria-label', 'Custom color');
    const alphaLabel = add('label', 'Opacity %'), alpha = add('input', '', alphaLabel); alpha.type = 'range'; alpha.min = '0'; alpha.max = '100'; alpha.step = '1'; alpha.setAttribute('aria-label', 'Color opacity');
    const opacity = add('output', '', alphaLabel);
    const protection = add('label'), protect = add('input', '', protection); protect.type = 'checkbox'; protect.checked = true; protect.setAttribute('aria-label', 'Keep text readable');
    protection.appendChild(document.createTextNode ? document.createTextNode(' Keep text readable (adjust text if needed)') : add('span', 'Keep text readable (adjust text if needed)', protection));
    protection.hidden = !options.background;
    const message = add('p'); message.setAttribute('role', 'status');
    const paletteRows = {};
    function palette(name, values) {
      let row = paletteRows[name]; if (!row) { add('strong', name, panes.Palettes); row = add('div', '', panes.Palettes); row.className = 'r3-color-palette'; paletteRows[name] = row; }
      row.replaceChildren();
      if (!values.length) add('span', 'None yet', row);
      values.forEach(value => { const color = parseColor(value); if (!color) return; const b = button('', () => choose(color), row); b.setAttribute('aria-label', name + ' ' + colorFormats(color).hexAlpha); b.title = colorFormats(color).rgb; b.style.backgroundColor = colorFormats(color).rgb; b.className = 'r3-color-chip'; });
    }
    palette('PATTC', options.palette || ['#FACC15', '#354785', '#171D29', '#FFFFFF', '#000000']);
    palette('Recent', read('recent')); palette('Favorites', read('favorites'));
    button('Save favorite', () => { const value = colorFormats(current).rgb; const values = [value, ...read('favorites').filter(v => v !== value)]; store('favorites', values); palette('Favorites', values.slice(0, 12)); }, panes.Palettes);
    button('Remove favorite', () => { const value = colorFormats(current).rgb; const values = read('favorites').filter(v => colorFormats(parseColor(v)).rgb !== value); store('favorites', values); palette('Favorites', values); }, panes.Palettes);
    const actions = add('div');
    const applyButton = button('Apply color', () => { if (!valid) return; try { options.onApply(colorFormats(current).rgb, protect.checked); const value = colorFormats(current).rgb; store('recent', [value, ...read('recent').filter(v => v !== value)]); } catch (error) { message.textContent = 'Could not apply color: ' + error.message; } }, actions);
    button('Revert color', () => choose([...original]), actions);
    button('Cancel color', () => options.onCancel(), actions);
    function paint(preview) {
      const formatted = colorFormats(current); picker.value = formatted.hex.toLowerCase(); custom.value = formatted.rgb; alpha.value = String(Math.round(current[3] * 100)); opacity.textContent = alpha.value + '%';
      swatch.style.backgroundColor = formatted.rgb; formats.textContent = formatted.hexAlpha + ' · ' + formatted.rgb;
      valid = true; applyButton.disabled = false;
      message.textContent = preview ? (options.onPreview(formatted.rgb, protect.checked) || 'Preview only — Apply to save.') : 'Choose a color. Apply uses the normal Draft save.';
    }
    function choose(color) { current = color; paint(true); }
    picker.oninput = () => { const color = parseColor(picker.value); if (color) { color[3] = current[3]; choose(color); } };
    alpha.oninput = () => { current[3] = Number(alpha.value) / 100; paint(true); };
    custom.oninput = () => { const color = parseColor(custom.value); if (color) { current = color; const typed = custom.value; paint(true); custom.value = typed; } else { valid = false; applyButton.disabled = true; message.textContent = 'Enter a valid HEX, RGB or RGBA color (opacity 0–1).'; } };
    protect.onchange = () => paint(true);
    box.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); options.onCancel(); } });
    paint(false); return box;
  }

  function mountBrowser() {
    const localhost = ['localhost', '127.0.0.1', '[::1]'].includes(host.location.hostname);
    if (!((host.PATTC_STUDIO_R3_LOCAL === true && localhost) ||
      (host.PATTC_STUDIO_R3_PRODUCTION === true && !localhost))) return;
    const document = host.document;
    const backendUrl = typeof API_BASE !== 'undefined' ? API_BASE : host.API_BASE;
    host.PATTC_STUDIO_R3_WRITE_POLICY = developmentWritePolicy(host.PATTC_STUDIO_R3_ENV, backendUrl);
    async function verifyEnvironment() {
      host.PATTC_STUDIO_R3_WRITE_POLICY = localhost
        ? await verifyDevelopmentEnvironment(host, host.PATTC_STUDIO_R3_ENV, backendUrl)
        : await verifyProductionEnvironment(host, host.location.hostname, host.PATTC_STUDIO_R3_PRODUCTION === true, backendUrl);
      if (controller.snapshot().opened) showPanel();
    }
    let outline=null, hoverOutline=null, hoverTarget=null, launch=null;
    const groupOpen = new Map();
    let view = 'desktop';
    let quick = true, detached = null, dockWidth = 320;
    const mapOpen = new Set(), selectedGroup = new Set();
    let root = null, renderer = null, selected = null, mode = 'section', picking = true, moving = false, minimized = false;
    let runtimeScope=null, runtimeManifest=null, runtimeRequest=null;
    const firstRenderAt = Date.now();
    let panel = null, frame = null, observer = null, renderPending = false, undo = [], versions = [];
    let colorEditor = null, colorPreview = null;
    let templateEntries = [], selectedTemplateId = '', templateFeedback = '';
    const admin = () => typeof host.isAdminSession === 'function' ? host.isAdminSession(host.getSession()) : !!host.getSession?.()?.isAdmin;
    function scope() {
      const pageKey = String((typeof APP_STATE !== 'undefined' ? APP_STATE.currentPage : host.APP_STATE?.currentPage) || host.location.hash.slice(1) || 'dashboard').split(/[?:]/)[0].toLowerCase();
      return { pageKey, gameId: /^(dashboard|sports-hub|profile|admin.*)$/.test(pageKey) ? '__pattc_global__' : String(host.getFrontendGameId?.() || '__pattc_global__') };
    }
    function sameScope(a, b) { return a && b && a.gameId === b.gameId && a.pageKey === b.pageKey; }
    function watch() { observer?.observe(document.getElementById('app') || document.body, { childList: true, subtree: true }); }
    function apply(manifest) {
      if (colorPreview) manifest = colorPreview(copy(manifest));
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
    function error(error) {
      const state = controller.snapshot();
      if (panel) updateStatus({ ...state, status: state.status.startsWith('Save Failed:') ? state.status : 'Error: ' + error.message });
      else if (launch) launch.textContent = 'R3: ' + error.message;
    }
    function perform(work) { Promise.resolve().then(work).catch(error); }
    const studioAdapter = serverAdapter(host);
    const controller = createController(studioAdapter, { assertWritable: () => requireDevelopmentWrite(host), render: apply, onChange: updateStatus });
    const templates = createTemplateManager(studioAdapter, controller, { assertWritable: () => requireDevelopmentWrite(host) });
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
    function clearSelection() { selected=null;selectedGroup.clear();hoverTarget=null;moving=false;highlight(null);highlight(null,true); }
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
    function cancelColorEditor() {
      if (!colorEditor) return;
      colorEditor.remove(); colorEditor = null; colorPreview = null;
      apply(controller.snapshot().manifest);
    }
    function openColorEditor(input, label, key, category) {
      cancelColorEditor();
      const id = selected, node = selectedNode(); if (!node) throw new Error('Select an element first');
      const computed = host.getComputedStyle(node);
      const header = sectionHeader(node) || node, headerStyle = host.getComputedStyle(header);
      const background = key === 'backgroundColor' || key === 'headerBackground';
      const foregroundKey = key === 'headerBackground' ? 'headerColor' : 'color';
      const foreground = parseColor((key === 'headerBackground' ? headerStyle : computed).color) || [255,255,255,1];
      // Composite translucent backgrounds over the visible ancestor background.
      let back = [255,255,255,1]; const ancestors = [];
      for (let parent = background ? node.parentElement : node; parent; parent = parent.parentElement) ancestors.unshift(parent);
      ancestors.forEach(parent => { const color = parseColor(host.getComputedStyle(parent).backgroundColor); if (color) back = blendColor(color, back); });
      let feedback = '';
      function transform(value, protect) {
        return manifest => {
          const entry = manifest.items[id] ||= { style: {} }; entry.style ||= {}; delete entry.original;
          if (category === 'collapse') {
            const target = responsiveLayer(manifest, view, true); target.collapse[id] ||= {}; target.collapse[id][key] = value;
          } else entry.style[key] = value;
          if (key === 'backgroundColor') entry.style.backgroundMode = 'color';
          const color = parseColor(value), surface = background ? blendColor(color, back) : back;
          let text = background ? blendColor(foreground, surface) : blendColor(color, surface);
          let ratio = colorContrast(text, surface);
          if (background && protect && ratio < 4.5) {
            const white = [255,255,255,1], black = [0,0,0,1]; text = colorContrast(white, surface) > colorContrast(black, surface) ? white : black;
            entry.style[foregroundKey] = colorFormats(text).rgb; ratio = colorContrast(text, surface);
            feedback = 'Text adjusted for readability · ' + ratio.toFixed(1) + ':1 contrast. Apply saves both colors.';
          } else feedback = (ratio < 4.5 ? 'Low text contrast · ' : 'Text contrast · ') + ratio.toFixed(1) + ':1. Preview only until Apply.';
          if (!background && !['color','headerColor'].includes(key)) feedback = 'Preview only — Apply to save.';
          return manifest;
        };
      }
      let storage; try { storage = host.localStorage; } catch (_) {}
      let initialColor = input.value;
      if (!parseColor(initialColor)) {
        const probe = document.createElement('span'); probe.style.color = initialColor || computed.color; probe.hidden = true; panel.appendChild(probe);
        initialColor = host.getComputedStyle(probe).color; probe.remove();
      }
      colorEditor = createColorEditor(document, { label, value: initialColor, storage, background,
        onPreview(value, protect) { colorPreview = transform(value, protect); apply(controller.snapshot().manifest); return feedback; },
        onApply(value, protect) {
          const change = transform(value, protect); colorPreview = null;
          edit(manifest => change(manifest)); colorEditor?.remove(); colorEditor = null; showPanel();
        },
        onCancel: cancelColorEditor
      });
      panel.insertBefore(colorEditor, panel.firstChild); colorEditor.scrollIntoView?.({ block: 'nearest' });
    }
    function field(label, key, type, value, choices, category = 'style') {
      const wrap = document.createElement('label'); wrap.textContent = label;
      const responsive = category !== 'style' || responsiveStyles.has(key);
      const input = document.createElement(choices ? 'select' : 'input'); input.dataset.field = key; input.disabled = !host.PATTC_STUDIO_R3_WRITE_POLICY.allowed;
      if (choices) choices.forEach(([id, text]) => { const option = document.createElement('option'); option.value = id; option.textContent = text; input.appendChild(option); });
      else { input.type = type; if (type === 'number') { input.min = '0'; input.max = '4000'; } }
      input.value = value == null ? '' : value;
      if (['backgroundColor','color','borderColor','headerColor','headerBackground','expandedColor','collapsedColor'].includes(key)) {
        input.readOnly = true; input.setAttribute('aria-haspopup', 'dialog'); input.title = 'Open visual color editor';
        input.style.setProperty('border-left', '12px solid ' + (input.value || 'transparent'));
        const open = () => { try { openColorEditor(input, label, key, category); } catch (err) { error(err); } };
        input.addEventListener('click', open);
        input.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
      }
      input.addEventListener('input', () => {
        try {
          if(['backgroundColor','color','borderColor','headerColor','headerBackground'].includes(key) && input.value && host.CSS && !host.CSS.supports('color',input.value))return;
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
        reset.type = 'button'; reset.disabled = !host.PATTC_STUDIO_R3_WRITE_POLICY.allowed; reset.textContent = 'Reset Override'; reset.setAttribute('aria-label', 'Reset Override: ' + label);
        reset.onclick = event => { event.preventDefault(); perform(() => { edit(m => {
          const target = layer(m), values = category === 'collapse' ? target.collapse?.[selected] : category === 'item' ? target.items?.[selected] : target.items?.[selected]?.style;
          if (values) { delete values[key]; if (key === 'widthPct') delete values.widthMode; }
        }); showPanel(); }); };
        wrap.appendChild(badge); wrap.appendChild(reset); updateInheritance();
      }
      return wrap;
    }
    function selectMapped(node) {
      selected = renderer.key(node); hoverTarget = null;
      // Open only ancestors needed to edit a selected descendant.
      for (let parent = node.parentElement; parent && root.contains(parent); parent = parent.parentElement) renderer.setSectionOpen(renderer.key(parent), true);
      node.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      showPanel();
    }
    function sectionMap() {
      const map = document.createElement('details'); map.dataset.sectionMap = ''; map.open = true;
      const summary = document.createElement('summary'); summary.textContent = 'Section Map'; map.appendChild(summary);
      function children(parent, container, depth) {
        Array.from(parent.children).forEach(node => {
          if (node.matches('script,style') || node.classList.contains('r3-collapse-toggle')) return;
          const section = node.matches(sectionSelector);
          if (quick && !section) { children(node, container, depth); return; }
          const branch = document.createElement('details'), id = renderer.key(node);
          branch.open = mapOpen.has(id); branch.dataset.mapKey = id;
          const line = document.createElement('summary'), select = document.createElement('button');
          select.type = 'button'; select.textContent = name(node); select.setAttribute('aria-pressed', String(selected === id));
          select.onclick = event => { event.preventDefault(); selectMapped(node); };
          const check = document.createElement('input'); check.type = 'checkbox'; check.checked = selectedGroup.has(id); check.setAttribute('aria-label', 'Include ' + name(node) + ' in style group'); check.onchange = () => { if (check.checked) selectedGroup.add(id); else selectedGroup.delete(id); }; line.appendChild(check);
          line.appendChild(select); branch.appendChild(line);
          branch.addEventListener('toggle', () => { if (branch.open) mapOpen.add(id); else mapOpen.delete(id); });
          container.appendChild(branch);
          // Advanced descendants are lazy: expanding a branch reveals one level.
          let loaded = false;
          const expand = () => { if (branch.open && !loaded) { loaded = true; children(node, branch, depth + 1); } };
          branch.addEventListener('toggle', expand); expand();
        });
      }
      children(root, map, 0); return map;
    }
    function returnToDock() {
      const old = detached; detached = null;
      if (panel) document.body.appendChild(panel);
      if (old && !old.closed) old.close();
      layoutDock();
    }
    function detachPanel() {
      if (detached && !detached.closed) { detached.focus(); return; }
      // A named window is shared by same-origin tabs and survives opener refreshes.
      // Each editor must own its controls window, never adopt another editor's popup.
      const popup = host.open('', '_blank', 'popup,width=420,height=850');
      if (!popup) throw new Error('Allow this local Studio window to open, or keep using the dock.');
      detached = popup;
      popup.document.title = 'PATTC Visual Studio — Controls';
      const sheet = popup.document.createElement('style'); sheet.textContent = css.textContent + '#pattcStudioR3{position:static!important;width:auto!important;max-height:95vh}body{background:#171d29;margin:0}';
      popup.document.head.appendChild(sheet);
      popup.addEventListener('beforeunload', () => {
        if (detached !== popup) return; // Ignore an old window's delayed unload.
        detached = null; if (panel) document.body.appendChild(panel); layoutDock();
      });
      popup.document.body.appendChild(panel); layoutDock();
    }
    function layoutDock() {
      // Reserve space outside #app: renderer resets cannot destroy dock geometry.
      document.body.style.setProperty('--r3-dock-space', panel && !detached && !minimized ? (dockWidth + 32) + 'px' : '0px');
      document.body.classList.toggle('r3-editing', !!panel);
    }
    function showPanel() {
      cancelColorEditor();
      if (!controller.snapshot().opened) return;
      if (detached?.closed) detached = null;
      if (!panel) { panel = document.createElement('aside'); panel.id = 'pattcStudioR3'; }
      const panelBody = detached ? detached.document.body : document.body;
      if (panel.parentNode !== panelBody) panelBody.appendChild(panel);
      panel.replaceChildren();
      const title = document.createElement('strong'); title.textContent = 'Owner Visual Studio R3'; panel.appendChild(title);
      const environment = document.createElement('p'); environment.dataset.environment = ''; environment.textContent = host.PATTC_STUDIO_R3_WRITE_POLICY.label + '\n' + (backendUrl || 'Unknown backend'); environment.style.overflowWrap = 'anywhere'; panel.appendChild(environment);
      function button(label, work) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = () => perform(work); if (/^(Save |Use Selected Template|Load Game Templates|Publish|Restore|Reset|Undo|Original Page|Revert|Hide |Show |Move|↑|↓|Split |New Section|Apply Style|Universal)/.test(label)) b.disabled = !host.PATTC_STUDIO_R3_WRITE_POLICY.allowed; panel.appendChild(b); return b; }
      button(minimized ? 'Expand' : 'Minimize', () => { minimized = !minimized; showPanel(); });
      button('Close', async () => { cancelColorEditor(); removePreview(); await controller.close(); runtimeScope=scope();runtimeManifest=controller.snapshot().published; panel.remove(); panel = null; if (detached) { detached.close(); detached = null; } layoutDock(); clearSelection(); undo = []; });
      const status = document.createElement('p'); status.dataset.status = ''; status.setAttribute('role', 'status'); panel.appendChild(status); updateStatus(controller.snapshot());
      panel.style.width = minimized ? '190px' : dockWidth + 'px'; layoutDock(); if (minimized) return;
      const separate = button('Separate Window', detachPanel); separate.onclick = () => { try { detachPanel(); } catch (err) { error(err); } };
      button('Return to Dock', returnToDock);
      const width = document.createElement('input'); width.type = 'range'; width.min = '260'; width.max = '520'; width.value = dockWidth; width.setAttribute('aria-label', 'Dock width'); width.oninput = () => { dockWidth = Number(width.value); panel.style.width = dockWidth + 'px'; layoutDock(); }; panel.appendChild(width);
      button(quick ? 'Quick Edit' : 'Advanced Edit', () => { quick = !quick; mode = quick ? 'section' : 'element'; showPanel(); });
      button('Live Page Navigation', () => { picking = false; showPanel(); });
      panel.appendChild(sectionMap());
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
        [['Header color','headerColor'],['Header background','headerBackground'],['Background color','backgroundColor'],['Text color','color'],['Border color','borderColor']].forEach(([label,key]) => grid.appendChild(field(label,key,'text',style[key] || (key === 'backgroundColor' ? computed.backgroundColor : key === 'color' ? computed.color : computed.borderColor))));
        [['Border px','borderWidth'],['Radius','borderRadius'],['Margin','margin'],['Padding','padding'],['Gap','gap'],['Body font','fontSize'],['Header font','headerFontSize'],['Width %','widthPct'],['Height px','heightPx'],['Scale %','scale']].forEach(([label,key]) => grid.appendChild(field(label,key,'number',style[key])));
        grid.appendChild(field('Width mode','widthMode','text',style.widthMode || 'original',[['original','Original'],['auto','Auto'],['full','Full'],['percent','Percent']]));
        grid.appendChild(field('Height mode','heightMode','text',style.heightMode || 'original',[['original','Original'],['auto','Auto'],['min','Minimum'],['fixed','Fixed + Scroll']]));
        grid.appendChild(field('Alignment','textAlign','text',style.textAlign || 'left',[['left','Left'],['center','Center'],['right','Right']]));
        grid.appendChild(field('Columns','columns','number',current.items[selected]?.columns, [['1','1'],['2','2'],['3','3'],['4','4']], 'item'));
        grid.appendChild(field('Image crop','objectFit','text',style.objectFit || 'cover',[['cover','Cover'],['contain','Contain'],['fill','Fill']]));
        grid.appendChild(field('Image position','objectPosition','text',style.objectPosition || '50% 50%'));
        if (mode === 'section') {
          if (sectionHeader(node)) grid.appendChild(field('Section header','headerText','text',current.items[selected]?.headerText ?? sectionHeader(node)?.textContent ?? '',null,'item'));
          const config = current.collapse[selected] || {};
          grid.appendChild(field('Collapsible','collapsible','boolean',String(!!current.collapse[selected] && config.collapsible !== false),[['true','ON'],['false','OFF']], 'collapse'));
          grid.appendChild(field('Default State','defaultOpen','boolean',String(config.defaultOpen !== false),[['true','Open'],['false','Closed']], 'collapse'));
          grid.appendChild(field('Collapse Style','collapseStyle','text',config.collapseStyle || 'instant',[['instant','Instant'],['blind','Roll Up / Blind']], 'collapse'));
          grid.appendChild(field('Roll up on upward scroll','collapseOnScroll','boolean',String(config.collapseOnScroll === true),[['true','ON'],['false','OFF']], 'collapse'));
          grid.appendChild(field('Expanded header color','expandedColor','text',config.expandedColor || '',null,'collapse'));
          grid.appendChild(field('Collapsed header color','collapsedColor','text',config.collapsedColor || '',null,'collapse'));
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
        button('Restore Selected Last Saved', () => { controller.restoreSelected(selected); showPanel(); });
        const selector = similar(), count = selector ? root.querySelectorAll(selector).length : 0;
        const matches = document.createElement('p'); matches.textContent = selector ? selector + ' · ' + count + ' matches · ' + Array.from(root.querySelectorAll(selector)).filter(n => !interactive(n)).length + ' safe to hide' : 'No safe class-qualified Similar selector'; panel.appendChild(matches);
        button('Apply Style to Selected Group', () => { if (!selectedGroup.size) throw new Error('Choose members in Section Map'); edit(m => { const group = 'Selected Group'; m.groups[group] = { style: copy(item(m).style || {}) }; selectedGroup.forEach(id => { m.groupMembers[id] = group; }); }); });
        button('Apply Style to Similar', () => { if (!selector) throw new Error('No safe Similar selector'); edit(m => { m.groups['Similar: ' + selector] = { selector, style: copy(item(m).style || {}) }; }); });
        [true,false].forEach(hidden => button(hidden ? 'Hide Similar' : 'Show Similar', () => { if (!selector) throw new Error('No safe Similar selector'); edit(m => { m.hiddenSelectors[selector] = hidden; }); }));
        [['Universal Dropdowns','select'],['Universal Buttons','button,.button,[role="button"]'],['Universal Headers','h1,h2,h3,h4,summary'],['Universal Sections',sectionSelector]].forEach(([label,selector]) => button(label, () => edit(m => { m.groups[label] = { selector, style: copy(item(m).style || {}) }; })));

        button('Split / Extract to New Section', () => createSection(true));
      }
      button('New Section', () => createSection(false));
      button('Undo', () => { if (!undo.length) return; const previous = undo.pop(); controller.edit(m => { Object.keys(m).forEach(k => delete m[k]); Object.assign(m, previous); }); showPanel(); });
      button('Original Page', () => { edit(m => { maps.forEach(k => m[k] = {}); delete m.responsive; }); showPanel(); });
      button('Revert to Server Draft', async () => { await controller.revert(); undo = []; showPanel(); });
      ['Save Element','Save Section','Save Page Draft','Save Whole Project Drafts'].forEach(label => button(label, () => { if (colorEditor) throw new Error('Apply or cancel the color preview before saving.'); return controller.flush(); }));
      const saveHelp = document.createElement('p'); saveHelp.dataset.saveHelp = ''; saveHelp.textContent = 'All Save controls verify the complete current page Draft. Previously visited pages were saved before closing. Whole Project flushes the only open page; it does not publish or rewrite unopened pages.'; panel.appendChild(saveHelp);
      // Templates are stored separately from per-game Drafts and Published rows.
      const templateName = document.createElement('input'); templateName.type = 'text';
      templateName.maxLength = 80; templateName.placeholder = 'Template name (e.g., Survivor Tropical)';
      templateName.setAttribute('aria-label', 'Template name'); templateName.dataset.templateControl = 'name'; panel.appendChild(templateName);
      const family = document.createElement('select'); family.setAttribute('aria-label', 'Template game type'); family.dataset.templateControl = 'family';
      TEMPLATE_FAMILIES.forEach(value => { const o = document.createElement('option'); o.value = value; o.textContent = value; family.appendChild(o); });
      const game = String(scope().gameId || '');
      family.value = /reality|traitor|amazing|dwt|survivor-tv/i.test(game) ? 'Reality TV' : /sports|nfl|fantasy|playoff|koth|confidence/i.test(game) ? 'Sports' : /award|oscar|emmy|grammy/i.test(game) ? 'Awards' : 'General';
      panel.appendChild(family);
      const templatePick = document.createElement('select'); templatePick.setAttribute('aria-label','Saved game templates'); templatePick.dataset.templateControl='pick';
      const placeholder = document.createElement('option'); placeholder.value=''; placeholder.textContent='Load templates for this page…'; templatePick.appendChild(placeholder);
      templateEntries.filter(entry => entry.pageKey === scope().pageKey).forEach(entry => { const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.family + ' · ' + entry.name; templatePick.appendChild(option); });
      templatePick.value = templateEntries.some(entry => entry.id === selectedTemplateId && entry.pageKey === scope().pageKey) ? selectedTemplateId : '';
      templatePick.onchange = () => { selectedTemplateId = templatePick.value; };
      panel.appendChild(templatePick);
      const feedback = document.createElement('p'); feedback.dataset.templateFeedback=''; feedback.setAttribute('role','status'); feedback.textContent = templateFeedback || 'Templates copy appearance only; each game keeps its own Draft and Published layout.'; panel.appendChild(feedback);
      button('Load Game Templates', async () => { templateFeedback = 'Loading templates…'; feedback.textContent=templateFeedback; templateEntries = await templates.list(); templateFeedback = templateEntries.length + ' saved template(s) found.'; showPanel(); });
      button('Save as Template', async () => {
        if (colorEditor) throw new Error('Apply or cancel the color preview before saving.');
        templateFeedback = 'Saving template…'; feedback.textContent=templateFeedback;
        const entry = await templates.save(templateName.value, family.value);
        templateEntries = await templates.list(); selectedTemplateId = entry.id;
        templateFeedback = 'Template Saved + VERIFIED · ' + entry.name; showPanel();
      });
      button('Use Selected Template', async () => {
        if (colorEditor) throw new Error('Apply or cancel the color preview before applying a template.');
        const entry = templateEntries.find(value => value.id === templatePick.value && value.pageKey === scope().pageKey);
        if (!entry) throw new Error('Load and select a matching page template first');
        if (!host.confirm('Replace this game page Draft with "' + entry.name + '"? A backup version will be saved. Published appearance will NOT change.')) return;
        templateFeedback = 'Applying template…'; feedback.textContent=templateFeedback;
        const result = await templates.apply(entry.id);
        undo=[]; selected=null; templateFeedback = 'Template applied to Draft + VERIFIED · ' + result.name + '. Publish separately when ready.'; showPanel();
      });
      button('Publish Page', () => { if (host.confirm('Publish this page Draft to live appearance?')) return controller.publish(); });
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
      if (quick) panel.querySelectorAll('button').forEach(b => { if (/^(Move|↑|↓|Split |New Section|Apply Style to Similar|Hide Similar|Show Similar|Universal Sections)/.test(b.textContent)) b.hidden = true; });
    }
    function organizePanel() {
      const names=['Layouts','Appearance / Style','Hide / Show','Save Settings / Restore','Game Templates','Publish Pages','Demo Values'];
      const groups=new Map();
      names.forEach(name=>{
        const group=document.createElement('details');group.dataset.studioGroup=name;
        group.open=groupOpen.has(name)?groupOpen.get(name):['Layouts','Appearance / Style'].includes(name);
        const summary=document.createElement('summary');summary.textContent=name;group.appendChild(summary);
        group.addEventListener('toggle',()=>groupOpen.set(name,group.open));groups.set(name,group);
      });
      const layoutFields=new Set(['margin','collapsible','defaultOpen','collapseStyle','rememberPlayerState','collapseOnScroll','columns','padding','gap','widthPct','heightPx','scale','widthMode','heightMode']);
      const grids=new Map();
      ['Layouts','Appearance / Style'].forEach(name=>{const grid=document.createElement('div');grid.className='r3-fields';groups.get(name).appendChild(grid);grids.set(name,grid);});
      const oldGrid=panel.querySelector('.r3-fields');
      if(oldGrid){Array.from(oldGrid.children).forEach(label=>grids.get(layoutFields.has(label.querySelector('[data-field]').dataset.field)?'Layouts':'Appearance / Style').appendChild(label));oldGrid.remove();}
      Array.from(panel.children).forEach(node=>{
        const text=node.textContent;
        let group=null;
        if(node.hasAttribute('data-status') || node.hasAttribute('data-save-help'))group='Save Settings / Restore';
        else if(node.tagName==='BUTTON'){
          if(/^(Hide |Show )/.test(text))group='Hide / Show';
          else if(/^(Load Game Templates|Save as Template|Use Selected Template)/.test(text))group='Game Templates';
          else if(/^(Publish)/.test(text))group='Publish Pages';
          else if(/^(Demo)/.test(text))group='Demo Values';
          else if(/^(Undo|Original Page|Revert|Save |Load Version|Restore)/.test(text))group='Save Settings / Restore';
          else if(/^(Apply Style|Universal)/.test(text))group='Appearance / Style';
          else if(/Columns$|^(Move|↑|↓|Default |Open Section|Close Section|Split |New Section)/.test(text))group='Layouts';
        }else if(node.dataset.templateControl || node.hasAttribute('data-template-feedback'))group='Game Templates';
        else if(node.tagName==='SELECT')group=node.getAttribute('aria-label')==='Demo state'?'Demo Values':node.getAttribute('aria-label')==='Saved versions'?'Save Settings / Restore':'Layouts';
        else if(node.tagName==='P' && !node.hasAttribute('data-selection') && !node.hasAttribute('data-environment'))group='Hide / Show';
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
    const css = document.createElement('style'); css.textContent = 'body.r3-editing{box-sizing:border-box;padding-right:var(--r3-dock-space,0px)}#pattcStudioR3 [data-section-map]{max-height:35vh;overflow:auto}#pattcStudioR3 [data-map-key]{margin-left:8px}#pattcStudioR3{position:fixed;z-index:2147483000;right:8px;top:8px;max-height:94vh;overflow:auto;padding:12px;border:1px solid #c99748;border-radius:12px;background:#171d29;color:#eee;box-shadow:0 8px 30px #0008;font:12px system-ui}#pattcStudioR3 button{padding:6px;margin:3px;border:1px solid #627089;border-radius:5px;background:#293447;color:#fff;font:inherit}#pattcStudioR3 select,#pattcStudioR3 input{width:100%;max-width:100%;background:#101722;color:#fff;border:1px solid #657089;padding:4px}#pattcStudioR3 details{border-top:1px solid #46536b;padding:8px 0}#pattcStudioR3 summary{cursor:pointer;font-weight:700;padding:5px 0}#pattcStudioR3 .r3-fields{display:grid;grid-template-columns:1fr 1fr;gap:6px}#pattcStudioR3Demo{position:fixed;inset:0;width:calc(100% - 330px);height:100vh;background:#151923;border:0;z-index:2147482999}#pattcStudioR3Launch{position:fixed;right:12px;bottom:80px;z-index:2147482998;padding:9px;background:#242d40;color:#efcd86;border:1px solid #c99748;border-radius:10px}'; css.textContent += '#pattcStudioR3 .r3-color-editor{box-sizing:border-box;width:100%;padding:10px;margin-bottom:12px;border:2px solid #dca64c;border-radius:8px;background:#171d29;color:#fff}#pattcStudioR3 .r3-color-editor [hidden]{display:none!important}#pattcStudioR3 .r3-color-editor input[type=color]{height:56px;padding:2px;cursor:pointer}#pattcStudioR3 .r3-color-editor input[type=checkbox]{width:auto}#pattcStudioR3 .r3-color-preview{height:60px;border:1px solid #94a3b8;border-radius:6px;margin:8px 0;background-image:linear-gradient(45deg,#8883 25%,transparent 25%)}#pattcStudioR3 .r3-color-formats{overflow-wrap:anywhere;font:12px monospace}#pattcStudioR3 .r3-color-palette{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}#pattcStudioR3 .r3-color-chip{width:32px;height:32px;padding:0;border:2px solid #cbd5e1}#pattcStudioR3 [aria-haspopup=dialog]{cursor:pointer}'; document.head.appendChild(css);
    launch = document.createElement('button'); launch.id = 'pattcStudioR3Launch'; launch.textContent = localhost ? 'Visual Studio R3 · LOCAL' : 'Visual Studio R3';
    launch.onclick = () => perform(async () => { if (!admin()) throw new Error('Owner access required'); await verifyEnvironment(); if (!controller.snapshot().opened){launch.textContent='Loading fresh Studio Draft…';await controller.open(scope());}launch.textContent=localhost ? 'Visual Studio R3 · LOCAL' : 'Visual Studio R3';showPanel();if(detached && !detached.closed)detached.focus(); }); document.body.appendChild(launch);
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
      if (event.target.closest('.r3-collapse-toggle')) return;
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
    host.addEventListener('pagehide', () => { const old = detached; detached = null; if (old && !old.closed) old.close(); });
    host.addEventListener('beforeunload', event => { if (controller.snapshot().dirty) { event.preventDefault(); event.returnValue = ''; } });
    async function runtimeAppearance(){
      const current=scope();
      if (current.pageKey === 'dashboard' && Date.now() - firstRenderAt < 7000) return;
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
          cancelColorEditor(); removePreview(); try { await controller.close(); panel?.remove(); panel = null; layoutDock(); clearSelection(); } catch (err) { error(err); } return;
        }
        if (state.opened && !state.demo) apply(state.manifest);
        else if(!state.opened) runtimeAppearance();
      });
    }); watch(); launch.hidden = !admin();
    // Production identity is checked only when an admin intentionally opens Studio.
    // No extra Apps Script request on ordinary player Home startup.
    if (localhost && admin()) verifyEnvironment();
    // Do not compete with the Home Hub's critical initial API request.
    host.setTimeout(() => { if (!controller.snapshot().opened) runtimeAppearance(); }, 7000);
    host.PATTC_OWNER_VISUAL_STUDIO_R3 = { open: () => launch.click(), close: async () => {cancelColorEditor();removePreview();await controller.close();panel?.remove();panel=null;layoutDock();clearSelection();}, snapshot: controller.snapshot };
  }
  const exports = { createTemplateManager, TEMPLATE_LIBRARY, TEMPLATE_FAMILIES, parseColor, colorFormats, blendColor, colorContrast, createColorEditor, verifyDevelopmentEnvironment, developmentWritePolicy, verifyProductionEnvironment, productionWritePolicy, requireDevelopmentWrite, TYPES, normalize, exact, rowManifest, createController, serverAdapter, createRenderer, safeSimilar, interactive, resolveView, responsiveLayer, breakpointFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = exports;
  else { host.PATTC_STUDIO_R3 = exports; if (host.document.readyState === 'loading') host.document.addEventListener('DOMContentLoaded', mountBrowser); else mountBrowser(); }
})(typeof window !== 'undefined' ? window : globalThis);
