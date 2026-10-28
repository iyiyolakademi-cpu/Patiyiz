const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sql=fs.readFileSync('supabase/patiyiz-login-streak-20261029.sql','utf8');
const css=fs.readFileSync('patiyiz-delight-20261029.css','utf8');
const theme=fs.readFileSync('patiyiz-theme-contrast-20261029.css','utf8');
const js=fs.readFileSync('patiyiz-delight-20261029.js','utf8');
const mascot=fs.readFileSync('patiyiz-mascot.svg','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
test('Existing application and delight motion scripts are valid JavaScript',()=>{
 new vm.Script(app);new vm.Script(js);
});
test('Animated original dog mascot has safe motion reduction and no external dependencies',()=>{
 assert.match(mascot,/<svg [^>]*viewBox="0 0 240 240"/);
 for(const key of ['blink','wave','wag','tilt','prefers-reduced-motion'])assert.ok(mascot.includes(key),key);
 assert.doesNotMatch(mascot,/(?:href|src)=["']https?:\/\/|<script\b/i);
 assert.match(html,/patiyiz-delight-20261029\.js\?v=4/);
 assert.match(native,/'patiyiz-mascot\.svg'/);
});
test('Streak is database-owned, private and synchronized between devices',()=>{
 assert.match(sql,/user_id uuid primary key references auth\.users\(id\) on delete cascade/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/security definer/);
 assert.match(sql,/set search_path = ''/);
 assert.match(sql,/v_user uuid := \(select auth\.uid\(\)\)/);
 assert.match(sql,/Europe\/Istanbul/);
 assert.match(sql,/on conflict \(user_id\) do update set/);
 assert.match(sql,/when old\.last_visit_on >= v_today then old\.current_streak/);
 assert.match(sql,/revoke all on public\.patiyiz_login_streaks from public, anon/);
 assert.match(sql,/grant select on public\.patiyiz_login_streaks to authenticated/);
 assert.doesNotMatch(sql,/grant select,insert,update on public\.patiyiz_login_streaks to authenticated/);
 assert.match(sql,/revoke (?:all|execute) on function public\.patiyiz_checkin_streak\(\) from public, anon/);
 assert.match(sql,/grant execute on function public\.patiyiz_checkin_streak\(\) to authenticated/);
 assert.match(app,/sb\.rpc\('patiyiz_checkin_streak'\)/);
 assert.match(app,/function patiStreakToday\(\)/);
 assert.match(app,/patiStreakState\.checkedOn===today/);
 assert.match(app,/function resetSessionState\(\)[\s\S]*?patiStreakState=\{owner:''/);
});
test('Home and Academy include mascot progress without replacing content',()=>{
 assert.match(app,/function homePage\(\)/);
 assert.match(app,/storiesStrip\(\)\+'<div class="pati-feed-posts">/);
 assert.match(app,/patiyizLessons\.length\)\|\|''/);
 assert.match(app,/academyIntro\(topicDone,topic\.length\)/);
 assert.match(app,/function educationPathCards\(topic,done\)/);
 assert.match(app,/class="pati-edu-path-item/);
 assert.match(css,/\.pati-edu-path-items:before/);
 assert.match(css,/\.is-current \.pati-edu-path-no/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Follow effect only celebrates after successful database mutation',()=>{
 const code=app.slice(app.indexOf('function doToggle('),app.indexOf('async function deleteOwnedMedia('));
 assert.match(app,/case 'follow':run\(\(\)=>doToggle\('follows'/);
 assert.match(code,/followRect=isFollow/);
 assert.match(code,/if\(r.error\)throw r.error/);
 assert.match(code,/followConfirmed\(followRect,!present\)/);
 assert.ok(code.indexOf('if(r.error)throw r.error')<code.indexOf('followConfirmed'));
 assert.match(js,/function followConfirmed\(rect,isFollowing\)/);
});
test('Dark and light modes protect Academy and other text and form contrast',()=>{
 assert.match(theme,/html\[data-pati-theme="dark"\]/);
 assert.match(theme,/html\[data-pati-theme="light"\]/);
 for(const fragment of ['.pati-edu-path-home','.pati-ref-academy-topic','.pati-ig-profile','.pati-edu-path-topic-head',
  '.pati-community-card','.pati-dm-layout','.pati-mobile-menu-item','.pati-settings-list','.pati-delight-card',
  '.story-viewers-sheet','.pati-story-activity-list','input:not([type="checkbox"])']) {
  assert.ok(theme.includes(fragment)||css.includes(fragment),fragment);
 }
 assert.match(html,/patiyiz-theme-contrast-20261029\.css\?v=1/);
});
test('Web and Capacitor bundles both include every new asset',()=>{
 for(const path of ['patiyiz-delight-20261029.css','patiyiz-theme-contrast-20261029.css',
  'patiyiz-delight-20261029.js','patiyiz-mascot.svg']) {
  assert.ok(native.includes("'"+path+"'"),path);
 }
});

test('Streak popup displays only once per user and local calendar day after server check-in',()=>{
 assert.match(app,/sb\.rpc\('patiyiz_checkin_streak'\)/);
 assert.doesNotMatch(app,/showStreakOnce\(patiStreakState,\{userId:uid,day:today\}\)/);
 assert.match(app,/streakPanel\(\{count:days,best\},patiStreakToday\(\)\)/);
 assert.doesNotMatch(app,/patiStreakMarkup\(\)/);
 assert.match(js,/seenInPage\.has\(key\)/);
 assert.match(js,/localStorage\.getItem\(key\)==='1'/);
 assert.match(js,/localStorage\.setItem\(key,'1'\)/);
 assert.match(js,/window\.setTimeout\(closeStreak,5100\)/);
 assert.match(js,/function streakWeekdays\(state,day\)/);
 assert.match(js,/Pzt','Sal','Çar','Per','Cum','Cmt','Paz/);
 assert.match(js,/el\.className='pati-streak-overlay'/);
 const style=fs.readFileSync('patiyiz-streak-popup-20261029.css','utf8');
 assert.match(style,/\.pati-streak-dialog\{/);
 assert.match(style,/\.pati-streak-flame/);
 assert.match(style,/prefers-reduced-motion:reduce/);
 assert.match(html,/patiyiz-streak-popup-20261029\.css\?v=2/);
});
test('Upgraded mascot includes premium gradients, blush, waving paw and reduced-motion fallback',()=>{
 assert.match(mascot,/<linearGradient id="fur"/);
 assert.match(mascot,/<linearGradient id="ear"/);
 assert.match(mascot,/<radialGradient id="blush"/);
 assert.match(mascot,/class="eyes"/);
 assert.match(mascot,/class="wave"/);
 assert.match(mascot,/prefers-reduced-motion:reduce/);
 assert.match(js,/patiyiz-mascot\.svg\?v=20261029-2/);
});
test('Final dark-mode audit corrects text and surfaces in every core section',()=>{
 const audit=fs.readFileSync('patiyiz-dark-contrast-audit-20261029.css','utf8');
 for(const key of ['.p4-hub','.p4-health','.pati-ref-care','.pati-ref-kb-home','.pati-shop-v2','.pati-edu-v2','.kb-v2','.lost-v2','.adopt-v2','.care-v2','.wellness-v2','.pati-ig-summary','.pati-settings-list','.pati-feature-group','.pati-dm-layout']){
  assert.ok(audit.includes(key)||theme.includes(key),key);
 }
 assert.match(audit,/data-pati-theme="dark"/);
 assert.match(audit,/input:not\(\[type="checkbox"\]\)/);
 assert.match(html,/patiyiz-dark-contrast-audit-20261029\.css\?v=1/);
 assert.match(native,/'patiyiz-dark-contrast-audit-20261029\.css'/);
 assert.match(native,/'patiyiz-streak-popup-20261029\.css'/);
});
