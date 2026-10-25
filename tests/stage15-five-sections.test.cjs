const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),badges=fs.readFileSync('achievements.js','utf8'),html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('stage15-navigation-qa.css','utf8'),privacy=fs.readFileSync('privacy.html','utf8'),terms=fs.readFileSync('terms.html','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
function between(a,b){const i=app.indexOf(a),j=app.indexOf(b,i);assert.ok(i>=0&&j>i,a);return app.slice(i,j)}
const menu=between('function openMobileFeaturesMenu(){','const patiCoinTasks=');
const profile=between('function profilePage(){','function formField(');
const settings=between('function settingsPage(){','const profileCountCache=');
const messages=between('function messagesPage(){','function pushKeyBytes(');
const notice=between('function notificationsPage(){','async function openNotification(');
test('All five screenshot sidebar sections exist in desktop routes and view dispatcher',()=>{
 for(const name of ["['achievements','Rozetler & Belgeler'","['messages','Mesajlar'","['notifications','Bildirimler'","['profile','Profilim'","['settings','Ayarlar ve Gizlilik'"])assert.ok(app.includes(name),name);
 for(const text of ['achievements:achievementsPage','messages:messagesPage','notifications:notificationsPage','profile:profilePage','settings:settingsPage'])assert.ok(app.includes(text),text);
});
test('Mobile all-features menu exposes all five sections and Health File',()=>{
 for(const n of ["['profile','Profilim','user']","['messages','Mesajlar','message']","['notifications','Bildirimler','bell']","['achievements','🏅 Rozetler ve Belgeler','library']","['settings','Ayarlar ve Gizlilik','settings']","['my-pet','Hayvanım · Bakım ve Sağlık','heart']"])assert.ok(menu.includes(n),n);
 assert.match(menu,/menuBadge\(menuCounts\.notifications\)/);
 assert.match(menu,/menuBadge\(menuCounts\.messages\)/);
});
test('Sidebar and header notifications expose accessible unread labels',()=>{
 assert.match(app,/topBell\.setAttribute\?\.\('aria-label',counts\.notifications/);
 assert.match(app,/topMessages\.setAttribute\('aria-label'/);
 assert.match(app,/aria-current=/);
 assert.match(app,/id==='messages'\?countBadge\(counts\.messages\)/);
 assert.match(app,/id==='notifications'\?countBadge\(counts\.notifications\)/);
});
test('Messages keep original conversations, unread, read receipts and requests',()=>{
 for(const source of ['patiDmInbox','patiDmThreads','patiDmReadReceiptsEnabled','patiDmSeenIds','requests','data-action="dm-tab"'])assert.ok(messages.includes(source),source);
 assert.match(app,/case 'dm-receipts-toggle'/);
});
test('My profile is distinct from visited-user profiles when navigating sidebar',()=>{
 assert.match(profile,/profile\(profileId\|\|me\.id\)/);
 assert.match(profile,/profilePostsTab/);
 assert.match(app,/let v=target\.dataset\.view;if\(v\)\{closePatiCreate\(\);profileId='';selectedPostId=''/);
 assert.match(app,/case 'view-user':/);
 assert.match(app,/case 'profile-back':/);
});
test('Settings expose legal/security and use actual Notification Center for device controls',()=>{
 for(const item of ['Ayarlar ve Gizlilik','theme-set','dm-receipts-toggle','settings-password','delete-account-open','privacy.html','terms.html','data-view="notifications"'])assert.ok(settings.includes(item),item);
 assert.doesNotMatch(settings,/button\('Bildirimleri aç','push-enable'\)/);
});
test('Notifications retain filters, count and protected write actions',()=>{
 for(const item of ['notificationMatches()','notifications-read','notifications-delete-all','notifications-refresh'])assert.ok(notice.includes(item),item);
 assert.match(app,/case 'notification-toggle-read':/);
 assert.match(app,/\.update\(\{read:next\}\)\.eq\('id',id\)\.eq\('owner_id',me\.id\)/);
 assert.match(app,/async function notificationCheckPush\(\)/);
});
test('Unverified cloud progress cannot unlock academy badges or free certificates',()=>{
 const ctx={window:{},Date,console};vm.runInNewContext(badges,ctx);
 const portal=ctx.window.PatiyizAchievements.create({esc:x=>String(x),notify:()=>{}});
 const completed=new Set(Array.from({length:101},(_,i)=>'lesson-'+i));
 const pending=portal.render({freeCompleted:completed,cloudReady:false,premiumCompleted:new Set()});
 assert.match(pending,/Doğrulanıyor/);
 assert.doesNotMatch(pending,/class="pati-badge earned"/);
 const ready=portal.render({freeCompleted:completed,cloudReady:true,premiumCompleted:new Set()});
 assert.match(ready,/101\/101/);
 assert.match(ready,/Belgeyi oluştur \/ PDF/);
});
test('Premium certificates reject invalid and out-of-range day entries',()=>{
 const ctx={window:{},Date,console};vm.runInNewContext(badges,ctx);const notices=[];
 const portal=ctx.window.PatiyizAchievements.create({esc:x=>String(x),notify:(...x)=>notices.push(x)});
 const fake=new Set(Array.from({length:30},(_,i)=>'dog-30:'+(100+i)));
 const invalid=portal.render({premiumCompleted:fake,premiumMember:true,cloudReady:false});
 assert.match(invalid,/0\/30 görev/);
 assert.doesNotMatch(invalid,/class="pati-cert-card earned"/);
 portal.print({kind:'dog-30',user:'Test',freeCompleted:new Set(),premiumCompleted:fake,cloudReady:false,member:true});
 assert.equal(notices.length,1);
 const valid=new Set(Array.from({length:30},(_,i)=>'dog-30:'+(i+1)));
 const ready=portal.render({premiumCompleted:valid,premiumMember:true,cloudReady:true});
 assert.match(ready,/30\/30 görev/);
 assert.match(ready,/Belgeyi oluştur \/ PDF/);
});
test('Privacy and terms preserve wording but use black-white branding',()=>{
 assert.match(privacy,/Gizlilik Politikası/);assert.match(terms,/Kullanım Şartları/);
 for(const document of [privacy,terms]){assert.match(document,/<meta name="theme-color" content="#19191c">/);assert.doesNotMatch(document,/#24634e/i)}
});
test('Sidebar and mobile menus have aligned badges, active states and keyboard focus',()=>{
 for(const needle of ['#app-root .sidebar #desktop-nav .nav-link','#tools-form .pati-mobile-menu-item>.pati-count-badge','@media(max-width:740px)',':focus-visible','data-pati-theme="dark"'])assert.ok(css.includes(needle),needle);
 assert.match(html,/stage15-navigation-qa\.css\?v=20261025-final-qa-v1/);
 assert.match(html,/stage1520261025=1/);
 assert.match(html,/achievements\.js\?v=20261025-badges-verified-15/);
});
test('Standalone manifest, app icons and live account dependencies remain available',()=>{
 assert.equal(manifest.name,'Patiyiz');assert.equal(manifest.display,'standalone');
 assert.ok(manifest.icons.some(x=>x.sizes==='192x192'));
 assert.ok(manifest.icons.some(x=>x.sizes==='512x512'));
 assert.match(html,/manifest\.webmanifest/);
 assert.match(html,/patiyiz-sw\.js|app\.js/);
});
test('Release QA explicitly records unverified manual and store blockers',()=>{
 const checklist=fs.readFileSync('docs/release-readiness-stage15.md','utf8');
 for(const word of ['Android','iPhone','Play Store','Bildirim','Gizlilik Politikası','Test','DOĞRULANMADI','MANUEL TEST GEREKİYOR'])assert.ok(checklist.includes(word),word);
});
