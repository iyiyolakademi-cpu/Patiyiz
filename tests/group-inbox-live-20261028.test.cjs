const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-group-inbox-read-delete-20261028.sql','utf8');
const css=fs.readFileSync('patiyiz-social-private-groups-20261028.css','utf8');
const between=(start,end)=>{
 const i=app.indexOf(start),j=app.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'Missing code section '+start);
 return app.slice(i,j);
};
test('App JavaScript is syntactically valid and direct DM remains separate',()=>{
 new vm.Script(app,{filename:'app.js'});
 for(const name of ['function messagesPage()','function patiDmOpenPhoto(','function patiDmSetReaction(','function patiCloseFriendsDialog()','async function patiGroupOpen('])
  assert.ok(app.includes(name),name);
 assert.doesNotMatch(sql,/alter table public\.messages/);
});
test('Group inbox shows latest activity and unread badges without leaking other member list',()=>{
 const list=between('async function patiGroupFetchInbox(force=false){','function patiGroupChatPaneHTML(){');
 assert.match(list,/from\('patiyiz_group_inbox'\)/);
 assert.match(list,/\.eq\('user_id',owner\)/);
 assert.match(list,/\.order\('activity_at',\{ascending:false\}\)/);
 assert.match(app,/pati-group-inbox-avatar/);
 assert.match(app,/chat-unread/);
 assert.match(list,/last_body/);
 assert.match(sql,/create or replace view public\.patiyiz_group_inbox with \(security_invoker=true\)/);
 assert.match(sql,/where m\.user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/msg\.sender_id<>m\.user_id and msg\.created_at>m\.last_read_at/);
});
test('Group chat loads newest 200 and renders in chronological order',()=>{
 const open=between('async function patiGroupOpen(id){','async function patiGroupMembersDialog(id){');
 assert.match(open,/\.order\('created_at',\{ascending:false\}\)\.limit\(200\)/);
 assert.match(open,/\(messages\.data\|\|\[\]\)\.slice\(\)\.reverse\(\)/);
 assert.match(app,/patiGroupLiveStart\(patiActiveGroupId\)/);
 assert.match(open,/patiGroupMarkRead\(id\)/);
});
test('Active group chat refreshes without replacing the composer',()=>{
 const realtime=between('let patiGroupLiveTimer=null','async function patiGroupList(){');
 assert.match(realtime,/setInterval\(/);
 assert.match(realtime,/document\.hidden/);
 assert.match(realtime,/form\.querySelector\('\[name="group_id"\]'\)/);
 assert.match(realtime,/history\.innerHTML=/);
 assert.doesNotMatch(realtime,/modal\(/);
 assert.match(app,/function closeModal\(force=false\)\{[\s\S]*?patiGroupLiveStop/);
 assert.match(app,/if\(id!=='pati-group-message-form'&&typeof patiGroupLiveStop/);
 assert.match(css,/\.pati-group-chat-window/);
});
test('Server-only read marker and own group-message deletion are authorized',()=>{
 assert.match(sql,/set last_read_at=now\(\)/);
 assert.match(sql,/where group_id=p_group and user_id=auth\.uid\(\)/);
 assert.match(sql,/patiyiz_group_mark_read/);
 assert.match(sql,/group_message_delete_self/);
 assert.match(sql,/sender_id=\(select auth\.uid\(\)\)/);
 const actions=between("case 'pati-group-delete-message':","case 'pati-group-add-open':");
 assert.match(actions,/\.eq\('sender_id',owner\)/);
 assert.match(actions,/patiGroupRefreshActive\(group,true\)/);
 assert.match(app,/data-action="pati-group-delete-message"/);
});
