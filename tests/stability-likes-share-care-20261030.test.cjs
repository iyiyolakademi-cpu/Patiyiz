const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-crop-insights-mobile-final-20261029.css','utf8');
const nativeMedia=fs.readFileSync('patiyiz-system-media.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('like uses INSERT instead of disallowed UPDATE-style UPSERT and permits own post likes',()=>{
 const start=app.indexOf('async function togglePostLike(id){');
 const end=app.indexOf('const pendingPostSaves',start);
 assert.ok(start>=0&&end>start);
 const like=app.slice(start,end);
 assert.match(like,/post_likes'\)\.insert\(\{user_id:owner,post_id:id\}\)/);
 assert.doesNotMatch(like,/post_likes'\)\.upsert/);
 assert.doesNotMatch(like,/if\(post\.author_id===me\.id\)/);
 assert.match(like,/verified\.data/);
});
test('only bottom profile statistics remains, preserving 7 30 and 90-day tabs',()=>{
 assert.match(app,/button\('Profili düzenle','edit-profile'\)/);
 assert.doesNotMatch(app,/button\('Profili düzenle','edit-profile'\)\+button\('İstatistikler','pati-insights'\)/);
 assert.match(app,/patiCreatorPreviewHTML\(\)/);
 assert.match(app,/\[7,30,90\]\.map\(n=>/);
 assert.match(app,/role="status">Bu dönemde henüz kayıtlı /);
});
test('system media always offers visible head publish action after selecting a file',()=>{
 assert.match(nativeMedia,/class="pati-system-head-publish" data-system="publish" hidden/);
 assert.match(nativeMedia,/headPublish\.hidden=!chosen/);
 assert.match(nativeMedia,/headerPublish\.disabled=true/);
 assert.match(css,/\.pati-system-head-publish\{/);
 assert.match(css,/#pati-system-publish\{/);
});
test('full-page mobile publisher maintains submit, content scrolls independently',()=>{
 assert.match(app,/new Set\(\['profile-form','pet-form','lost-form','adoption-form','care-form','post-form','story-form'\]\)/);
 assert.match(css,/#modal-root #post-form \.modal-footer button\[type="submit"\]/);
 assert.match(css,/content:none!important/);
});
test('care calendar combines tasks and reminders, timezone-aware and 42 clickable days',()=>{
 const begin=app.indexOf('function patiCareDate(raw){');
 const end=app.indexOf('function careFold(v){',begin);
 assert.ok(begin>=0&&end>begin);
 const slice=app.slice(begin,end);
 const ctx={Date,Map,Array,Number,esc:String,careToday:()=> '2026-10-30',patiCareMonth:'2026-10',patiCareSelectedDate:'2026-10-30'};
 const calc=vm.runInNewContext(slice+';({patiCareDate,patiCareCalendarMarkup})',ctx);
 const out=calc.patiCareCalendarMarkup([{due_date:'2026-10-30'}],[{due_at:'2026-10-30T09:00:00Z'}]);
 assert.equal((out.match(/data-action="pati-care-day"/g)||[]).length,42);
 assert.match(out,/data-id="2026-10-30" aria-pressed="true"/);
 assert.match(out,/2 kayıt/);
 assert.match(app,/case 'pati-care-month':/);
 assert.match(app,/patiWellnessCompleting\.has\(id\)/);
});
test('app and media scripts are cache-busted in the public page and parsed',()=>{
 assert.match(html,/patiyiz-system-media\.js\?[^"]*stability=20261030/);
 assert.match(html,/app\.js\?[^"]*stability=20261030/);
 assert.match(html,/patiyiz-crop-insights-mobile-final-20261029\.css\?[^"]*stability=20261030/);
 assert.doesNotThrow(()=>new vm.Script(app));
 assert.doesNotThrow(()=>new vm.Script(nativeMedia));
});
