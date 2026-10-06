from pathlib import Path

path = Path('frontend/js/ownerVisualStudioR3.js')
text = path.read_text()
original = text

def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)

replace_once(
"""  function runtimeAppearanceOwnsPaint_(node, state) {
    if (!node || typeof node.closest !== 'function') return false;
    if (node.closest('[data-dashboard-profile-card],#dashboardPlayerCard,#dashboardPlayerSticky')) return profileHasSavedAppearance_(state);
    const hub = node.closest('[data-dashboard-hub-category]');
    if (hub) return !!hubAppearanceRow_(state, hub.getAttribute('data-dashboard-hub-category'));
    if (node.closest('.bottom-nav')) return navigationHasSavedAppearance_(state);
    return false;
  }
  function visualStudioPaintAllowed_(node, property, state) {
    const key = String(property || '').trim().toLowerCase();
    return !VISUAL_STUDIO_PAINT_PROPERTIES.has(key) || !runtimeAppearanceOwnsPaint_(node, state);
  }
""",
"""  function runtimeManagedPaintTarget_(node) {
    if (!node || typeof node.closest !== 'function') return false;
    return !!(
      node.closest('[data-dashboard-profile-card],#dashboardPlayerCard,#dashboardPlayerSticky') ||
      node.closest('[data-dashboard-hub-category]') ||
      node.closest('.bottom-nav')
    );
  }
  function runtimeAppearanceOwnsPaint_(node, state) {
    // Dynamic runtime components own their paint slot from first paint onward.
    // Do not let a stale Visual Studio color flash while Profile/Hub/Nav
    // Appearance is still resolving. Visual Studio remains authoritative for
    // layout/geometry/structure and for paint on non-runtime-managed targets.
    return runtimeManagedPaintTarget_(node);
  }
  function visualStudioPaintAllowed_(node, property, state) {
    const key = String(property || '').trim().toLowerCase();
    return !VISUAL_STUDIO_PAINT_PROPERTIES.has(key) || !runtimeAppearanceOwnsPaint_(node, state);
  }
""",
'runtime paint invariant')

replace_once(
"""      function original(properties){
        const probe=document.createElement('div');probe.setAttribute('style',originals.get(node).style || '');
        properties.forEach(property=>{const value=probe.style.getPropertyValue(property);if(value)node.style.setProperty(property,value,probe.style.getPropertyPriority(property));else node.style.removeProperty(property);});
      }
""",
"""      function original(properties){
        const probe=document.createElement('div');probe.setAttribute('style',originals.get(node).style || '');
        properties.forEach(property=>{
          if (paintAllowed(node, property) === false) return;
          const value=probe.style.getPropertyValue(property);if(value)node.style.setProperty(property,value,probe.style.getPropertyPriority(property));else node.style.removeProperty(property);
        });
      }
""",
'original paint guard')

replace_once(
"""    let panel = null, frame = null, observer = null, renderPending = false, undo = [], versions = [];
    let colorEditor = null, colorPreview = null;
""",
"""    let panel = null, frame = null, observer = null, renderPending = false, undo = [], versions = [];
    let colorEditor = null, colorPreview = null;
    let pendingAuthorityTransition = 'boot';
    const authorityTrace = [];
    function markAuthorityTransition(name) { pendingAuthorityTransition = String(name || 'render'); }
    function logAuthorityTransition(phase, transition) {
      const entry = {
        at: new Date().toISOString(), phase,
        transition: String(transition || pendingAuthorityTransition || 'render'),
        pageKey: scope().pageKey,
        opened: controller ? controller.snapshot().opened : false,
        dirty: controller ? controller.snapshot().dirty : false,
        selected: selected || '',
        runtimePaintInvariant: true
      };
      authorityTrace.push(entry); if (authorityTrace.length > 80) authorityTrace.shift();
      host.console?.debug?.('[PATTC Visual Studio authority]', entry);
      return entry;
    }
""",
'transition trace state')

replace_once(
"""    function apply(manifest) {
      if (colorPreview) manifest = colorPreview(copy(manifest));
""",
"""    function apply(manifest) {
      const transition = pendingAuthorityTransition || 'render'; pendingAuthorityTransition = 'render';
      logAuthorityTransition('before-render', transition);
      if (colorPreview) manifest = colorPreview(copy(manifest));
""",
'apply transition start')

replace_once(
"""        renderer.render(manifest, { view: controller.snapshot().opened && controller.snapshot().lock !== 'close' ? view : breakpointFor(host.innerWidth || 1280), editing: controller.snapshot().opened && controller.snapshot().lock !== 'close', scope: scope().gameId });
        highlight(selectedNode());
""",
"""        renderer.render(manifest, { view: controller.snapshot().opened && controller.snapshot().lock !== 'close' ? view : breakpointFor(host.innerWidth || 1280), editing: controller.snapshot().opened && controller.snapshot().lock !== 'close', scope: scope().gameId });
        logAuthorityTransition('after-render', transition);
        highlight(selectedNode());
""",
'apply transition end')

replace_once(
"""    function restoreOriginal() {
      const node = selectedNode();
""",
"""    function restoreOriginal() {
      markAuthorityTransition('Restore Selected Original');
      const node = selectedNode();
""",
'restore original trace')

replace_once(
"""      button(quick ? 'Quick Edit' : 'Advanced Edit', () => { quick = !quick; mode = quick ? 'section' : 'element'; showPanel(); });
""",
"""      button(quick ? 'Quick Edit' : 'Advanced Edit', () => { logAuthorityTransition('no-render', 'Quick Edit / mode switch'); quick = !quick; mode = quick ? 'section' : 'element'; showPanel(); });
""",
'quick mode trace')

replace_once(
"""      ['desktop','tablet','mobile'].forEach(value => { const b = button(value[0].toUpperCase() + value.slice(1), () => { view = value; apply(controller.snapshot().manifest); showPanel(); }); b.setAttribute('aria-pressed', String(view === value)); });
      button('Clear Selection', () => { clearSelection(); showPanel(); });
""",
"""      ['desktop','tablet','mobile'].forEach(value => { const b = button(value[0].toUpperCase() + value.slice(1), () => { markAuthorityTransition('View switch: ' + value); view = value; apply(controller.snapshot().manifest); showPanel(); }); b.setAttribute('aria-pressed', String(view === value)); });
      button('Clear Selection', () => { logAuthorityTransition('no-render', 'Clear Selection'); clearSelection(); showPanel(); });
""",
'view and selection trace')

replace_once(
"""        button('Restore Selected Last Saved', () => { controller.restoreSelected(existing || selected); showPanel(); });
""",
"""        button('Restore Selected Last Saved', () => { markAuthorityTransition('Restore Selected Last Saved'); controller.restoreSelected(existing || selected); showPanel(); });
""",
'last saved trace')

replace_once(
"""      button('Undo', () => { if (!undo.length) return; const previous = undo.pop(); controller.edit(m => { Object.keys(m).forEach(k => delete m[k]); Object.assign(m, previous); }); showPanel(); });
      button('Original Page', () => { edit(m => { maps.forEach(k => m[k] = {}); delete m.responsive; }); showPanel(); });
      button('Revert to Server Draft', async () => { await controller.revert(); undo = []; showPanel(); });
      ['Save Element','Save Section','Save Page Draft','Save Whole Project Drafts'].forEach(label => button(label, () => { if (colorEditor) throw new Error('Apply or cancel the color preview before saving.'); return controller.flush(); }));
""",
"""      button('Undo', () => { if (!undo.length) return; markAuthorityTransition('Undo'); const previous = undo.pop(); controller.edit(m => { Object.keys(m).forEach(k => delete m[k]); Object.assign(m, previous); }); showPanel(); });
      button('Original Page', () => { markAuthorityTransition('Original Page'); edit(m => { maps.forEach(k => m[k] = {}); delete m.responsive; }); showPanel(); });
      button('Revert to Server Draft', async () => { markAuthorityTransition('Revert to Server Draft'); await controller.revert(); undo = []; showPanel(); });
      ['Save Element','Save Section','Save Page Draft','Save Whole Project Drafts'].forEach(label => button(label, () => { if (colorEditor) throw new Error('Apply or cancel the color preview before saving.'); logAuthorityTransition('no-render', label); return controller.flush(); }));
""",
'undo restore save trace')

replace_once(
"""          edit(m => {
            const destination = responsive ? layer(m) : m;
""",
"""          markAuthorityTransition('Field edit: ' + key);
          edit(m => {
            const destination = responsive ? layer(m) : m;
""",
'field edit trace')

replace_once(
"""    launch.onclick = () => perform(async () => { if (!admin()) throw new Error('Owner access required'); await verifyEnvironment(); if (!controller.snapshot().opened){launch.textContent='Loading fresh Studio Draft…';await controller.open(scope());}launch.textContent=localhost ? 'Visual Studio R3 · LOCAL' : 'Visual Studio R3';showPanel();if(detached && !detached.closed)detached.focus(); }); document.body.appendChild(launch);
""",
"""    launch.onclick = () => perform(async () => { if (!admin()) throw new Error('Owner access required'); await verifyEnvironment(); if (!controller.snapshot().opened){markAuthorityTransition('Open Visual Studio / fresh Draft');launch.textContent='Loading fresh Studio Draft…';await controller.open(scope());}launch.textContent=localhost ? 'Visual Studio R3 · LOCAL' : 'Visual Studio R3';showPanel();if(detached && !detached.closed)detached.focus(); }); document.body.appendChild(launch);
""",
'open trace')

replace_once(
"""        if(!controller.snapshot().opened && sameScope(current,scope())){runtimeScope=current;runtimeManifest=rowManifest(bundle,TYPES.published,current.pageKey)||normalize({pageKey:current.pageKey});apply(runtimeManifest);}
""",
"""        if(!controller.snapshot().opened && sameScope(current,scope())){runtimeScope=current;runtimeManifest=rowManifest(bundle,TYPES.published,current.pageKey)||normalize({pageKey:current.pageKey});markAuthorityTransition('Cold/runtime published Visual Studio manifest');apply(runtimeManifest);}
""",
'runtime manifest trace')

replace_once(
"""    host.PATTC_OWNER_VISUAL_STUDIO_R3 = { open: () => launch.click(), close: async () => {cancelColorEditor();removePreview();await controller.close();panel?.remove();panel=null;layoutDock();clearSelection();}, snapshot: controller.snapshot };
""",
"""    host.PATTC_OWNER_VISUAL_STUDIO_R3 = { open: () => launch.click(), close: async () => {cancelColorEditor();removePreview();await controller.close();panel?.remove();panel=null;layoutDock();clearSelection();}, snapshot: controller.snapshot, authorityTrace: () => copy(authorityTrace) };
""",
'trace export')

replace_once(
"""createController, serverAdapter, createRenderer, safeSimilar, interactive, resolveView, responsiveLayer, breakpointFor, profileHasSavedAppearance_, hubAppearanceRow_, navigationHasSavedAppearance_, runtimeAppearanceOwnsPaint_, visualStudioPaintAllowed_, restoreOriginalSelected_ };
""",
"""createController, serverAdapter, createRenderer, safeSimilar, interactive, resolveView, responsiveLayer, breakpointFor, profileHasSavedAppearance_, hubAppearanceRow_, navigationHasSavedAppearance_, runtimeManagedPaintTarget_, runtimeAppearanceOwnsPaint_, visualStudioPaintAllowed_, restoreOriginalSelected_ };
""",
'test export')

if text == original:
    raise SystemExit('no changes')
path.write_text(text)
print('Applied Visual Studio runtime authority invariant R1')
