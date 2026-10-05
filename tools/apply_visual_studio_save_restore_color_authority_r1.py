from pathlib import Path

path = Path('frontend/js/ownerVisualStudioR3.js')
text = path.read_text()
original = text


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    text = text.replace(old, new, 1)


# Explicit Save controls are the persistence boundary in the live editor. Keep
# controller autosave available for non-browser consumers, but disable it for
# mountBrowser so an unsaved edit cannot silently replace Last Saved.
replace_once(
    "        clearTimer(); timer = later(() => { timer = null; api.flush().catch(() => {}); }, options.debounce == null ? 650 : options.debounce);",
    "        clearTimer();\n        if (options.autosave !== false) timer = later(() => { timer = null; api.flush().catch(() => {}); }, options.debounce == null ? 650 : options.debounce);",
    'controller autosave guard'
)

replace_once(
    "    const controller = createController(serverAdapter(host), { assertWritable: () => requireDevelopmentWrite(host), render: apply, onChange: updateStatus });",
    "    const controller = createController(serverAdapter(host), { autosave: false, assertWritable: () => requireDevelopmentWrite(host), render: apply, onChange: updateStatus });",
    'browser explicit save option'
)

# Runtime Appearance is authoritative for paint only. Visual Studio remains
# authoritative for layout/geometry/structure and remains the paint fallback
# when no saved runtime appearance exists.
marker = "  function createRenderer(root, options = {}) {\n"
if marker not in text:
    raise SystemExit('renderer marker not found')
helper = r'''  const VISUAL_STUDIO_PAINT_PROPERTIES = new Set([
    'background', 'background-color', 'background-image', 'color', 'border-color',
    'outline-color', 'fill', 'stroke'
  ]);
  function appearanceValue_(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }
  function profileHasSavedAppearance_(state) {
    const profile = state && state.profile && typeof state.profile === 'object' ? state.profile : {};
    const nested = [profile.appearance, profile.profileAppearance].filter(value => value && typeof value === 'object');
    const direct = [
      profile.profileColor, profile.ProfileColor, profile.themeColor, profile.ThemeColor,
      profile.profileColor2, profile.ProfileColor2, profile.profileColorMode, profile.ProfileColorMode,
      profile.profileGradientAngle, profile.ProfileGradientAngle, profile.textColor, profile.TextColor
    ];
    const nestedValues = [];
    nested.forEach(value => ['primaryColor','secondaryColor','color','color2','textColor','gradientMode','gradientAngle'].forEach(key => nestedValues.push(value[key])));
    return direct.concat(nestedValues).some(appearanceValue_);
  }
  function hubAppearanceRow_(state, category) {
    const key = String(category || '').trim().toLowerCase();
    if (!key || !state) return null;
    const map = state.dashboardHubAppearanceMap && typeof state.dashboardHubAppearanceMap === 'object' ? state.dashboardHubAppearanceMap : {};
    if (map[key] && typeof map[key] === 'object') return map[key];
    const rows = Array.isArray(state.dashboardHubAppearanceRows) ? state.dashboardHubAppearanceRows : [];
    return rows.find(row => String(row && (row.HubCategory || row.hubCategory || row.SettingKey || row.settingKey) || '').trim().toLowerCase() === key) || null;
  }
  function navigationHasSavedAppearance_(state) {
    if (!state) return false;
    const rows = Array.isArray(state.dashboardHubAppearanceRows)
      ? state.dashboardHubAppearanceRows
      : Object.values(state.dashboardHubAppearanceMap && typeof state.dashboardHubAppearanceMap === 'object' ? state.dashboardHubAppearanceMap : {});
    return rows.some(row => {
      const category = String(row && (row.HubCategory || row.hubCategory) || '').trim().toLowerCase();
      const setting = String(row && (row.SettingKey || row.settingKey) || '').trim().toLowerCase();
      return category === 'navigation' || setting.indexOf('nav:') === 0;
    });
  }
  function runtimeAppearanceOwnsPaint_(node, state) {
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

'''
text = text.replace(marker, helper + marker, 1)

replace_once(
    "  function createRenderer(root, options = {}) {\n    const document = root.ownerDocument, originals = new Map(), keys = new Map();",
    "  function createRenderer(root, options = {}) {\n    const document = root.ownerDocument, originals = new Map(), keys = new Map();\n    const paintAllowed = typeof options.paintAllowed === 'function' ? options.paintAllowed : (() => true);",
    'renderer paint authority callback'
)

replace_once(
    "      const set = (k, v) => node.style.setProperty(k, String(v), 'important');",
    "      const set = (k, v) => { if (paintAllowed(node, k) !== false) node.style.setProperty(k, String(v), 'important'); };",
    'renderer paint setter'
)

replace_once(
    "      if (value.headerColor || value.headerBackground) [sectionHeader(node)].filter(Boolean).forEach(header => { remember(header); if (value.headerColor) header.style.setProperty('color', value.headerColor, 'important'); if (value.headerBackground) header.style.setProperty('background-color', value.headerBackground, 'important'); });",
    "      if (value.headerColor || value.headerBackground) [sectionHeader(node)].filter(Boolean).forEach(header => { remember(header); if (value.headerColor && paintAllowed(header, 'color') !== false) header.style.setProperty('color', value.headerColor, 'important'); if (value.headerBackground && paintAllowed(header, 'background-color') !== false) header.style.setProperty('background-color', value.headerBackground, 'important'); });",
    'header paint authority'
)

replace_once(
    "          if (color || headerColor) header.style.setProperty('background-color', color || headerColor, 'important'); else header.style.removeProperty('background-color');",
    "          if (paintAllowed(header, 'background-color') !== false) { if (color || headerColor) header.style.setProperty('background-color', color || headerColor, 'important'); else header.style.removeProperty('background-color'); }",
    'collapse header paint authority'
)

replace_once(
    "        if (root !== app) { renderer?.reset(); root = app; renderer = createRenderer(root); }",
    "        if (root !== app) { renderer?.reset(); root = app; renderer = createRenderer(root, { paintAllowed: (node, property) => visualStudioPaintAllowed_(node, property, host.APP_STATE || (typeof APP_STATE !== 'undefined' ? APP_STATE : {})) }); }",
    'browser runtime paint authority'
)

# Alias-aware selected restore: the panel already resolves legacy/current keys
# for display, so Last Saved must use that same concrete manifest key.
replace_once(
    "        button('Restore Selected Last Saved', () => { controller.restoreSelected(selected); showPanel(); });",
    "        button('Restore Selected Last Saved', () => { controller.restoreSelected(existing || selected); showPanel(); });",
    'last saved selected key'
)

# Make Original restoration testable and keep the existing browser behavior.
insert_before = "  function createRenderer(root, options = {}) {\n"
restore_helper = r'''  function restoreOriginalSelected_(manifest, id) {
    if (!id) throw new Error('Select a section or element first');
    maps.filter(key => !['groups','generatedSections'].includes(key)).forEach(key => { delete manifest[key][id]; });
    ['tablet','mobile'].forEach(view => {
      const target = responsiveLayer(manifest, view, true);
      ['items','hidden','collapse'].forEach(key => { if (target[key]) delete target[key][id]; });
    });
    manifest.items[id] = { original: true, style: {} };
    return manifest;
  }

'''
if restore_helper not in text:
    text = text.replace(insert_before, restore_helper + insert_before, 1)

old_restore = "    function restoreOriginal() {\n      edit(m => { maps.filter(k => !['groups','generatedSections'].includes(k)).forEach(k => Object.keys(m[k]).forEach(id=>{if(id===selected || renderer.find(id)===selectedNode())delete m[k][id];})); ['tablet','mobile'].forEach(device => { const target = responsiveLayer(m, device); ['items','hidden','collapse'].forEach(k => { if (target[k]) delete target[k][selected]; }); }); m.items[selected] = { original: true, style: {} }; });\n      showPanel();\n    }"
new_restore = "    function restoreOriginal() {\n      const node = selectedNode();\n      edit(m => {\n        Object.keys(m.items).filter(id => id === selected || renderer.find(id) === node).forEach(id => { if (id !== selected) { maps.filter(k => !['groups','generatedSections'].includes(k)).forEach(k => delete m[k][id]); } });\n        restoreOriginalSelected_(m, selected);\n      });\n      showPanel();\n    }"
replace_once(old_restore, new_restore, 'original selected restore')

# Export the pure authority/original helpers for focused Node regression tests.
replace_once(
    "createController, serverAdapter, createRenderer, safeSimilar, interactive, resolveView, responsiveLayer, breakpointFor };",
    "createController, serverAdapter, createRenderer, safeSimilar, interactive, resolveView, responsiveLayer, breakpointFor, profileHasSavedAppearance_, hubAppearanceRow_, navigationHasSavedAppearance_, runtimeAppearanceOwnsPaint_, visualStudioPaintAllowed_, restoreOriginalSelected_ };",
    'testable helper exports'
)

if text == original:
    raise SystemExit('no changes applied')
path.write_text(text)
print('Visual Studio Save/Restore + Color Authority R1 patch applied')
