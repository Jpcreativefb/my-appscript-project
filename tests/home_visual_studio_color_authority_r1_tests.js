'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const studio = read('frontend/js/ownerVisualStudioR3.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const nav = read('frontend/js/navigationSlotsR1.js');

assert(studio.includes("function runtimeAppearanceAuthority(node)"), 'Visual Studio must detect runtime appearance authority');
assert(studio.includes("node.closest('[data-runtime-color-authority]')"), 'Visual Studio authority must protect descendants such as Hub icons/artwork');
assert(studio.includes("const runtimeColorOwned = runtimeAppearanceAuthority(node);"), 'Studio style pass must resolve runtime color ownership');
assert(studio.includes("if (!runtimeColorOwned && value.backgroundMode === 'transparent')"), 'Studio background must yield to runtime appearance');
assert(studio.includes("if (!runtimeColorOwned && value.color) set('color', value.color);"), 'Studio text color must yield to runtime appearance');
assert(studio.includes("if (!runtimeColorOwned && (value.headerColor || value.headerBackground))"), 'Studio header colors must yield to runtime appearance');
assert(studio.includes("if (!runtimeColorOwned && value.borderColor)"), 'Studio border colors must yield to runtime appearance');
assert(studio.includes("if (value.textAlign) set('text-align', value.textAlign);"), 'Studio layout/text alignment must remain active');
assert(studio.includes("['margin', 'padding', 'gap', 'fontSize', 'borderWidth', 'borderRadius']"), 'Studio spacing/layout styling must remain active');
assert(studio.includes("if (value.objectPosition) { set('object-position', value.objectPosition); set('background-position', value.objectPosition); }"), 'Studio image positioning must remain active');
assert(studio.includes("const runtimeVars = runtimeAppearanceVars(node);"), 'Studio reset must preserve runtime CSS variables that arrive after first paint');
assert(studio.includes("runtimeVars.forEach(([property, value, priority])"), 'Studio reset must restore late runtime appearance variables');
assert(studio.includes("if (!runtimeAppearanceAuthority(node))"), 'Studio collapse colors must not repaint runtime-owned sections');

assert(dashboard.includes("data-runtime-color-authority=\"profile\""), 'saved Home profile must mark runtime color authority');
assert(dashboard.includes("node.setAttribute(\"data-runtime-color-authority\", \"profile\")"), 'late saved profile repaint must claim authority');
assert(dashboard.includes("card.setAttribute(\"data-runtime-color-authority\", \"appearance\")"), 'late Hub Appearance repaint must claim authority');
assert((dashboard.match(/data-runtime-color-authority=\"appearance\"/g) || []).length >= 3, 'Home Hub, full Hub header and subhub must carry Appearance authority markers');
assert(dashboard.includes("setting && Object.keys(setting).length ? ' data-runtime-color-authority=\"appearance\"' : ''"), 'Studio remains fallback when no saved Hub Appearance row exists');
assert(dashboard.includes("String(profile.scope || profile.Scope || \"\").trim().toLowerCase() === \"general\""), 'Studio remains fallback when no saved general profile exists');

assert(nav.includes("var authoritativeRows = Array.isArray(rows) && rows.length > 0;"), 'Bottom Nav must distinguish saved/restored rows from empty fallback');
assert(nav.includes("nav.setAttribute('data-runtime-color-authority', 'appearance')"), 'Bottom Nav Appearance must outrank Visual Studio');
assert(nav.includes("nav.removeAttribute('data-runtime-color-authority')"), 'Visual Studio may remain fallback when no nav appearance rows exist');

console.log('Home Visual Studio color authority R1: PASS');
