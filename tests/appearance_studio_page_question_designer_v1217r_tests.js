const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8')} function ok(v,m){if(!v)throw new Error(m)}
const a=read('frontend/js/pages/adminAppearance.js'), p=read('frontend/js/pages/picks.js'), c=read('frontend/css/picks.css'), ac=read('frontend/css/appearance.css');
ok(a.includes('Question Area Designer'),'missing Question Area Designer');
ok(a.includes('Question Layout Types'),'missing layout types');
['Text','Compact','Image','Wager / Market'].forEach(x=>ok(a.includes(x),'missing '+x));
ok(a.includes('data-question-layout-id'),'missing per-question override');
ok(a.includes('data-question-section-id'),'missing section override');
ok(a.includes('adminAppearanceSetPreviewSurface_'),'missing preview surface');
ok(p.includes('picksResolvedQuestionLayout_'),'missing runtime layout resolver');
ok(p.includes('applyPicksAppearanceToPage_'),'missing page appearance runtime');
ok(p.includes('question-layout-${escapeAttr(picksResolvedQuestionLayout_(category))}'),'missing card layout class');
ok(c.includes('--picks-theme-question-bg'),'missing question variables');
ok(c.includes('.nominee-layout-wager'),'missing wager layout CSS');
ok(ac.includes('.appearance-question-preview'),'missing question preview CSS');
console.log('PASS appearance_studio_page_question_designer_v1217r_tests');
