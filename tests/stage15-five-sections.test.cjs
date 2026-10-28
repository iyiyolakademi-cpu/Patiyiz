const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('stage15-navigation-qa.css','utf8'),privacy=fs.readFileSync('privacy.html','utf8'),terms=fs.readFileSync('terms.html','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
function between(a,b){const i=app.indexOf(a),j=app.indexOf(b,i);assert.ok(i>=0&&j>i,a);return app.slice(i,j)}
const menu=between('function openMobileFeaturesMenu(){','const patiCoinTasks=');
const profile=between('function profilePage(){','function formField(');
const settings=between('function settingsPage(){','const profileCountCache=');
const messages=between('function messagesPage(){','function pushKeyBytes(');
const notice=between('function notificationsPage(){','async function openNotification(');
test('All five screenshot sidebar sections exist in desktop routes and view dispatcher',()=>{
 for(const name of ["['messages','Mesajlar'","['notifications','Bildirimler'","['profile','Profilim'","['settings','Ayarlar ve Gizlilik'"])assert.ok(app.includes(name),name);
 for(const text of ['messages:messagesPage','notifications:notificationsPage','profile:profilePage','settings:settingsPage'])assert.ok(app.includes(text),text);
});
test('Mobile menu is concise and Pet Center links to specialized modules',()=>{
 for(const n of ["['community','Topluluk soruları','users']","['pets','Patileri keşfet','paw']","['my-pet','Hayvanım Merkezi · Tüm seçenekler','heart']","['settings','Ayarlar ve gizlilik','settings']","['shop','Pati Mağaza','grid']"])assert.ok(menu.includes(n),n);
 assert.match(app,/data-action="pati-my-pet-tab"/);
 assert.match(app,/p4-hub-grid/);
 assert.match(app,/messages:messagesPage/);
 assert.match(app,/notifications:notificationsPage/);
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
test('Retired badge and certificate screen cannot be opened',()=>{
 assert.doesNotMatch(app,/achievementsPage\(|\['achievements',|case 'achievement-open'/);
 assert.doesNotMatch(menu,/Rozetler ve Belgeler|Premium Akademi/);
 assert.doesNotMatch(html,/achievements\.js|premium-academy\.js/);
});
test('Privacy and terms preserve wording but use black-white branding',()=>{
 assert.match(privacy,/Gizlilik Politikası/);assert.match(terms,/Kullanım Şartları/);
 for(const document of [privacy,terms]){assert.match(document,/<meta name="theme-color" content="#19191c">/);assert.doesNotMatch(document,/#24634e/i)}
});
test('Sidebar and mobile menus have aligned badges, active states and keyboard focus',()=>{
 for(const needle of ['#app-root .sidebar #desktop-nav .nav-link','#tools-form .pati-mobile-menu-item>.pati-count-badge','@media(max-width:740px)',':focus-visible','data-pati-theme="dark"'])assert.ok(css.includes(needle),needle);
 assert.match(html,/stage15-navigation-qa\.css\?v=20261025-final-qa-v1/);
 assert.match(html,/stage1520261025=1/);
 assert.doesNotMatch(html,/achievements\.js|premium-academy\.js/);
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
