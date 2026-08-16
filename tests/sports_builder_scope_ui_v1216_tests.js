const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'frontend/css/sports.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'frontend/js/sports.js'), 'utf8');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
assert(css.includes('.sports-advanced-builder-scope-fields[hidden]'), 'missing hidden scope CSS rule');
assert(/\.sports-advanced-builder-scope-fields\[hidden\]\s*\{[^}]*display:\s*none;/s.test(css), 'hidden scope fields must display none');
assert(js.includes('League Week selected — dates are not required.'), 'missing League Week clarity status');
assert(js.includes('Date Range selected — season/week fields are not required.'), 'missing Date Range clarity status');
assert(js.includes('dateFields.hidden = useWeek;'), 'date scope toggle missing');
assert(js.includes('weekFields.hidden = !useWeek;'), 'week scope toggle missing');
console.log('PASS sports builder scope UI v1.2.16');
