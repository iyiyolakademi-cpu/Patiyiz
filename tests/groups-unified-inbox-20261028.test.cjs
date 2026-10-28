const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-social-private-groups-20261028.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function section(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,start);
 return app.slice(a,b);
}
test('Unified inbox code parses and retains the individual DM implementation',()=>{
 new vm.Script(app,{filename:'app.js'});
 assert.match(app,/function patiDmLoadInbox\(/);
 assert.match(app,/function patiDmLoadThread\(/);
 assert.match(app,/function messagesPage\(/);
 assert.match(app,/patiGroupMountInMessages\(summaries,peers,chatFilter\)/);
});
test('Groups appear in the same timestamp-sorted list, not a separate group dialog',()=>{
 const pane=section('function patiGroupMountInMessages(','/* Group inbox shows latest activity');
 assert.match(pane,/pati-dm-list-row pati-group-thread-row/);
 assert.match(pane,/data-action="pati-group-open"/);
 assert.match(pane,/chat-unread/);
 assert.match(pane,/\.sort\(\(a,b\)=>new Date\(b\.dataset\.activity\|\|0\)/);
 assert.match(pane,/people\.insertBefore\(row,footer\|\|null\)/);
 const list=section('async function patiGroupList(){','function patiGroupCreateDialog(){');
 assert.doesNotMatch(list,/modal\('Grup sohbetleri'/);
 assert.match(list,/view!=='messages'/);
 const messages=section('function messagesPage(){','function pushKeyBytes(');
 assert.match(messages,/pati-group-create-open/);
 assert.doesNotMatch(messages,/data-action="pati-group-list">Grup sohbetleri/);
});
test('Created group opens as a chat in Messages, preserving shared mobile navigation',()=>{
 const open=section('async function patiGroupOpen(id){','async function patiGroupMembersDialog(id){');
 assert.match(open,/patiActiveGroupId=id;personId='';chatFilter='primary';mobileChatOpen=true/);
 assert.match(open,/if\(view!=='messages'\)\{view='messages';navRender\(\)\}/);
 assert.doesNotMatch(open,/modal\(group\.data\.title/);
 assert.match(app,/mobileChatOpen&&\(personId\|\|patiActiveGroupId\)/);
 assert.match(app,/class="chat-history pati-group-history"/);
 assert.match(app,/id="pati-group-message-form" class="chat-form/);
 assert.match(css,/\.pati-group-chat-window \.chat-history/);
});
test('Messages use the existing submit route and preserve typed input on inbox updates',()=>{
 assert.match(app,/case 'pati-group-message-form'/);
 assert.match(app,/from\('patiyiz_group_messages'\)\.insert/);
 assert.match(app,/patiDmSafeRender\(\);\s*await patiGroupRefreshActive\(group,true\)/);
 assert.match(app,/document\.querySelector\('#message-form input\[name="body"\],#pati-group-message-form input\[name="group_body"\]'\)/);
 assert.match(app,/function patiGroupInboxStart\(\)/);
 assert.match(app,/patiGroupInboxState=\{owner:'',rows:\[\],ready:false/);
});
test('Private media and RLS remain separate from group layout changes',()=>{
 assert.match(app,/patiyiz-close-stories/);
 assert.match(app,/patiyiz_group_inbox/);
 assert.match(app,/patiGroupLiveStart\(patiActiveGroupId\)/);
 assert.match(app,/function patiGroupMessageMarkup\(/);
 assert.match(app,/data-action="pati-group-delete-message"/);
 assert.match(html,/patiyiz-social-private-groups-20261028\.css/);
});
