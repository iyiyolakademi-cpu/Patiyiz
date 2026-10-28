const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('notifications-stage14.css','utf8');
const rows=[
 {id:'n1',owner_id:'self',actor_id:'friend',kind:'messages',text:'Yeni mesaj aldınız',read:false,created_at:'2026-10-25T12:00:00Z'},
 {id:'n2',owner_id:'self',actor_id:'friend',kind:'post_likes',text:'Fotoğrafını beğendi',read:true,created_at:'2026-10-25T11:00:00Z'},
 {id:'n3',owner_id:'self',actor_id:null,kind:'pet_reminder',text:'Karma aşı hatırlatması',read:false,created_at:'2026-10-25T10:00:00Z'},
 {id:'n4',owner_id:'self',actor_id:'blocked',kind:'comments',text:'Engellenmiş yorum',read:false,created_at:'2026-10-25T09:00:00Z'},
 {id:'n5',owner_id:'another',actor_id:'friend',kind:'follows',text:'Özel başka kullanıcı bildirimi',read:false,created_at:'2026-10-25T08:00:00Z'}
];
const start=app.indexOf("let notificationFilter='all'"),end=app.indexOf('async function openNotification(',start);
assert.ok(start>0&&end>start,'notification stage14 source range');
function setup(){
 const element={innerHTML:''},counter={textContent:''};
 const context={
  data:{notifications:rows.map(x=>({...x})),profiles:[{id:'friend',display_name:'Şeker dostu'}],follows:[]},
  me:{id:'self'},blocked:new Set(['blocked']),followed:new Set(),view:'notifications',
  main:{innerHTML:''},pageMore:{notifications:false},pageLimits:{notifications:150},
  patiyizLoadToken:0,patiyizLoadedTables:new Set(),console,Date,
  esc:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
  day:v=>v?.slice(0,10)||'',
  ico:name=>'('+name+')',avatar:p=>p.display_name,button:label=>label,
  document:{getElementById:id=>id==='notification-v2-results'?element:id==='notification-v2-result-count'?counter:null},
  navRender:()=>{},navigator:{serviceWorker:{getRegistration:async()=>({pushManager:{getSubscription:async()=>({endpoint:'https://device.example/unique'})}})}},
  window:{PushManager:function(){},Notification:{permission:'granted'}}
 };
 context.Notification=context.window.Notification;
 vm.createContext(context);
 vm.runInContext(app.slice(start,end)+'\nglobalThis.api={notificationVisible,notificationMatches,notificationRows,notificationRenderResults,notificationCheckPush,notificationFetch,notificationsPage};',context);
 return {context,api:context.api,element,counter};
}
test('Notification center only shows current owner and excludes blocked actors',()=>{
 const {api}=setup();
 assert.deepEqual(Array.from(api.notificationVisible(),x=>x.id),['n1','n2','n3']);
});
test('Unread, social, messages and care filters match their real categories',()=>{
 const {api,context}=setup();
 vm.runInContext("notificationFilter='unread'",context);
 assert.deepEqual(Array.from(api.notificationMatches(),x=>x.id),['n1','n3']);
 vm.runInContext("notificationFilter='messages'",context);
 assert.deepEqual(Array.from(api.notificationMatches(),x=>x.id),['n1']);
 vm.runInContext("notificationFilter='care'",context);
 assert.deepEqual(Array.from(api.notificationMatches(),x=>x.id),['n3']);
 vm.runInContext("notificationFilter='social'",context);
 assert.deepEqual(Array.from(api.notificationMatches(),x=>x.id),['n2']);
});
test('Turkish content search works without replacing the search field',()=>{
 const {api,context,element,counter}=setup();
 vm.runInContext("notificationSearch='KARMA AŞI'",context);
 api.notificationRenderResults();
 assert.match(element.innerHTML,/Karma aşı hatırlatması/);
 assert.doesNotMatch(element.innerHTML,/Yeni mesaj aldınız/);
 assert.equal(counter.textContent,'1 / 3 bildirim');
});
test('Row layout opens notifications and has a direct delete button',()=>{
 const {api,context}=setup();
 const a=api.notificationRows([context.data.notifications[0]]);
 const b=api.notificationRows([context.data.notifications[1]]);
 assert.match(a,/data-action="open-notification"/);
 assert.match(a,/data-notification-id="n1"/);
 assert.match(a,/Okunmadı/);
 assert.match(b,/is-read/);
 assert.doesNotMatch(a,/notification-toggle-read|pati-alert-follow-back/);
 assert.match(a,/data-action="notification-delete"/);
 assert.match(a,/aria-label="Bildirimi sil"/);
 assert.doesNotMatch(app,/function openNotificationDeleteOptions\(el\)/);
});
test('Notification screen contains only the list with no dashboard tools',()=>{
 const {api,context}=setup();
 api.notificationsPage();
 const ui=context.main.innerHTML;
 assert.match(ui,/Bildirimler/);
 assert.match(ui,/Yeni mesaj aldınız/);
 assert.match(ui,/Fotoğrafını beğendi/);
 assert.match(ui,/Karma aşı hatırlatması/);
 assert.doesNotMatch(ui,/notification-v2-stats|notification-v2-filters|notification-v2-push|notification-v2-search/);
 assert.doesNotMatch(ui,/data-action="notifications-refresh"|data-action="notifications-delete-all"|data-action="notifications-read"/);
});
test('Push detection checks granted permission, active device subscription and current account',async()=>{
 const {api,context}=setup();
 let received='';
 context.sb={from(table){assert.equal(table,'push_subscriptions');return{select(){return this},eq(field,v){if(field==='user_id')assert.equal(v,'self');if(field==='endpoint')received=v;return this},limit:async()=>({data:[{id:'saved'}],error:null})}}};
 await api.notificationCheckPush();
 assert.equal(received,'https://device.example/unique');
 assert.equal(vm.runInContext('notificationPushStatus',context),'on');
});
test('Push with permission blocked is not reported as active',async()=>{
 const {api,context}=setup();
 context.window.Notification.permission='denied';
 await api.notificationCheckPush();
 assert.equal(vm.runInContext('notificationPushStatus',context),'blocked');
});
test('Open notification and all write actions constrain mutation to owner and inspect rows',()=>{
 assert.match(app,/function notificationVisible\(\)/);
 assert.match(app,/\.update\(\{read:true\}\)\.eq\('id',n\.id\)\.eq\('owner_id',me\.id\)\.select\('id'\)/);
 assert.match(app,/case 'notification-toggle-read':/);
 assert.match(app,/\.update\(\{read:next\}\)\.eq\('id',id\)\.eq\('owner_id',me\.id\)\.select\('id'\)/);
 assert.match(app,/\.update\(\{read:true\}\)\.eq\('owner_id',uid\)\.eq\('read',false\)\.select\('id'\)/);
 assert.match(app,/\.delete\(\)\.eq\('id',id\)\.eq\('owner_id',uid\)\.select\('id'\)/);
 assert.match(app,/\.delete\(\)\.eq\('owner_id',uid\)\.select\('id'\)/);
 assert.doesNotMatch(app,/case 'notifications-read':run\(async\(\)=>\{let r=.*await refresh\(\)/);
});
test('Notification refresh queries only the current account and caps fetched rows',()=>{
 assert.match(app,/from\('notifications'\)\.select\('\*'\)\.eq\('owner_id',uid\)\.order\('created_at',\{ascending:false\}\)\.limit\(cap\)/);
 assert.match(app,/if\(to==='notifications'&&previous!=='notifications'\)\{void notificationFetch\(\);void notificationCheckPush\(\);\}/);
 assert.match(app,/if\(e\.target\?\.id!=='notification-v2-search'\)return/);
});
test('Existing realtime channel still watches notification inserts',()=>{
 assert.match(app,/\.on\('postgres_changes',\{event:'INSERT',schema:'public',table:'notifications',filter:'owner_id=eq\.'\+me\.id\},queueLiveUpdate\)/);
 assert.match(app,/function queueLiveUpdate\(\)/);
});
test('Mobile light/dark CSS and cache-busting link are present',()=>{
 assert.match(css,/#main-content \.notification-v2/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/data-pati-theme="dark"/);
 assert.match(css,/:focus-visible/);
 assert.match(html,/notifications-stage14\.css\?v=20261025-notifications-v2/);
 assert.match(html,/notifications20261025=14/);
});
