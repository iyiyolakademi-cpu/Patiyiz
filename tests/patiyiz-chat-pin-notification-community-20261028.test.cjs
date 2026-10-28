const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-header-notifications-community-pins-20261028.css','utf8');
const sql=fs.readFileSync('supabase/patiyiz-dm-message-pins-20261028.sql','utf8');
const source=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i);return app.slice(i,j)};

test('New social features keep full app script syntactically correct',()=>new vm.Script(app,{filename:'app.js'}));
test('Header puts add before branded logo and removes its message icon',()=>{
 const header=html.slice(html.indexOf('<header class="mobile-header">'),html.indexOf('</header>',html.indexOf('<header class="mobile-header">')));
 assert.ok(header.indexOf('id="pati-header-share"')>=0);
 assert.ok(header.indexOf('id="pati-header-share"')<header.indexOf('<div class="brand">'));
 assert.match(header,/data-action="pati-create-open"/);
 assert.doesNotMatch(header,/id="pati-header-messages"/);
 assert.match(header,/id="pati-header-notifications"/);
 assert.match(css,/\.pati-header-share/);
});
test('Notification page is only the notification list, without filters or widgets',()=>{
 const page=source('function notificationsPage(){','async function openNotification(');
 assert.match(page,/Bildirimler/);
 assert.match(page,/notificationRows\(list\)/);
 assert.doesNotMatch(page,/notification-v2-stats|notification-v2-filters|notification-v2-push|notification-v2-search|notifications-delete-all|notifications-read/);
 const rows=source('function notificationRows(list){','function notificationRenderResults(){');
 assert.match(rows,/data-action="open-notification"/);
 assert.doesNotMatch(rows,/notification-toggle-read|pati-alert-remove|pati-alert-follow-back/);
});
test('Notification deletion is now a direct, account-scoped row action without long-press',()=>{
 const rows=source('function notificationRows(list){','function notificationRenderResults(){');
 assert.match(rows,/data-action="notification-delete"/);
 assert.match(rows,/aria-label="Bildirimi sil"/);
 assert.doesNotMatch(app,/notificationPressTimer|openNotificationDeleteOptions/);
 assert.match(app,/case 'notification-delete':run\(/);
 assert.match(app,/\.delete\(\)\.eq\('id',id\)\.eq\('owner_id',uid\)/);
});
test('Question categories include entrepreneurship and general life, legacy animal categories remain discoverable',()=>{
 assert.match(app,/PATI_QUESTION_CATEGORIES=\['Girişimcilik','Hayvanlar','Teknoloji','Eğitim ve Kariyer','Günlük Yaşam','Diğer'\]/);
 assert.match(app,/patiQuestionCategoryGroup\(q\.category\)===communityCategory/);
 assert.match(app,/query\.in\('category',\['Hayvanlar',\.\.\.PATI_LEGACY_PET_QUESTION_CATEGORIES\]\)/);
 assert.match(app,/selectField\('category','Kategori',PATI_QUESTION_CATEGORIES\)/);
});
test('Pin records are private, linked to real participant messages, and synced to the account',()=>{
 assert.match(sql,/alter table public\.patiyiz_dm_message_pins enable row level security/);
 assert.match(sql,/primary key \(viewer_id, peer_id\)/);
 assert.match(sql,/viewer_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/m\.id=message_id/);
 assert.match(sql,/m\.sender_id=viewer_id and m\.receiver_id=peer_id/);
 assert.match(sql,/on delete cascade/);
 assert.match(app,/patiyiz_dm_message_pins/);
 assert.match(app,/data-action="dm-message-unpin"/);
 assert.match(app,/data-action="dm-pin-jump"/);
 assert.match(app,/patiDmPinnedBanner\(personId,conv\)/);
});
test('Pin banner text is escaped, supports media, and exposes jump/remove',()=>{
 const snippet=source('function patiDmPinnedBanner(peer,conv){','async function patiDmPinSave(');
 const ctx={me:{id:'me'},patiDmPinState:{owner:'me',byPeer:new Map([['friend','m1']]),loaded:new Set(),busy:new Set(),details:new Map()},patiDmPinReset(){},esc:String,cut:(x,n)=>String(x).slice(0,n)};
 const fn=vm.runInNewContext(snippet+'\npatiDmPinnedBanner',ctx);
 const result=fn('friend',[{id:'m1',body:'Merhaba',attachment_type:null}]);
 assert.match(result,/Sabitlenen mesaj/);
 assert.match(result,/Merhaba/);
 assert.match(result,/data-action="dm-pin-jump"/);
 assert.match(result,/data-action="dm-message-unpin"/);
});
