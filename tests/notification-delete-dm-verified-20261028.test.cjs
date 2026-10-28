const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-notification-delete-dm-verified-20261028.css','utf8');
const sql=fs.readFileSync('supabase/verification-request-client-access-20261028.sql','utf8');
function piece(a,b){const x=app.indexOf(a),y=app.indexOf(b,x+a.length);assert.ok(x>=0&&y>x,a);return app.slice(x,y);}
test('App code and asset version remain valid',()=>{
 new vm.Script(app,{filename:'app.js'});
 assert.match(html,/patiyiz-notification-delete-dm-verified-20261028\.css\?v=1/);
 assert.match(html,/direct_delete_dm_verified=20261028/);
});
test('Only the bottom Share tab changes to DMs; left top + remains',()=>{
 const nav=piece('function navRender(){','function openMobileFeaturesMenu(){');
 assert.match(nav,/pati-messages-nav/);
 assert.match(nav,/data-view="messages"/);
 assert.match(nav,/<small>Mesajlar<\/small>/);
 assert.doesNotMatch(nav,/pati-create-nav|<small>Paylaş<\/small>/);
 const header=html.slice(html.indexOf('<header class="mobile-header">'),html.indexOf('</header>',html.indexOf('<header class="mobile-header">')));
 assert.match(header,/id="pati-header-share"[^>]*data-action="pati-create-open"/);
});
test('Notification row has immediate delete button with own id, no modal/hold',()=>{
 const rows=piece('function notificationRows(list){','function notificationRenderResults(){');
 assert.match(rows,/class="pati-alert-delete"/);
 assert.match(rows,/data-action="notification-delete"/);
 assert.match(rows,/aria-label="Bildirimi sil"/);
 assert.doesNotMatch(rows,/basılı tut/);
 assert.doesNotMatch(app,/notificationPressTimer|openNotificationDeleteOptions|notificationLongPressed/);
 const handler=app.slice(app.indexOf("case 'notification-delete':"),app.indexOf("case 'notifications-delete-all':"));
 assert.match(handler,/\.delete\(\)\.eq\('id',id\)\.eq\('owner_id',uid\)\.select\('id'\)/);
 assert.match(handler,/data\.notifications=data\.notifications\.filter/);
 assert.doesNotMatch(handler,/confirm\(|modal\(/);
});
test('Verification requests appear on own profile and not someone else',()=>{
 const profile=piece('function profilePage(){','function formField(');
 assert.match(profile,/\(own\?patiVerificationProfileAction\(\):''\)/);
 const status=piece('function patiVerificationProfileAction(){','function profilePage(){');
 assert.match(status,/data-action="verification-request"/);
 assert.match(status,/talebin incelemede/);
 assert.match(status,/Önceki talebin reddedildi/);
 assert.match(status,/Doğrulama yalnızca yönetici/);
 const submit=app.slice(app.indexOf("case 'verification-request-form':"),app.indexOf("case 'highlight-album-form':"));
 assert.match(submit,/from\('verification_requests'\)\.insert\(\{user_id:uid,note:str\('note'\)\}\)/);
 assert.match(submit,/status:'pending'/);
});
test('Authenticated user can only submit own pending verification, not grant blue tick',()=>{
 assert.match(sql,/grant select on table public\.verification_requests to authenticated/);
 assert.match(sql,/grant insert\(user_id,note\) on table public\.verification_requests to authenticated/);
 assert.match(sql,/user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/status='pending'/);
 assert.match(sql,/reviewed_by is null/);
 assert.match(sql,/not exists\(select 1 from public\.profiles/);
 assert.doesNotMatch(sql,/grant update/);
 assert.match(sql,/revoke all on table public\.verification_requests from public, anon, authenticated/);
});
test('Responsive buttons provide keyboard focus, accessible tap sizes and dark theme',()=>{
 assert.match(css,/pati-alert-delete:focus-visible/);
 assert.match(css,/min-width:42px/);
 assert.match(css,/pati-profile-verify-button/);
 assert.match(css,/pati-messages-nav/);
 assert.match(css,/data-pati-theme="dark"/);
});
