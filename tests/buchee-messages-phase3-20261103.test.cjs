'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('buchee-messages-phase3-20261103.css','utf8');
const bulk=fs.readFileSync('buchee-dm-bulk-select-20261102.js','utf8');
const messages=app.slice(app.indexOf('function messagesPage(){'),app.indexOf('function pushKeyBytes(',app.indexOf('function messagesPage(){')));
const safeRender=app.slice(app.indexOf('function patiDmSafeRender(){'),app.indexOf('async function patiDmLoadInbox(',app.indexOf('function patiDmSafeRender(){')));
test('inbox keeps only one list, three distinct header actions, and exact mobile back behavior',()=>{
 assert.match(messages,/data-action="dm-exit"/);
 assert.match(messages,/class="pati-dm-title"><strong>Mesajlar<\/strong>/);
 assert.match(messages,/buchee-dm-unread-total/);
 assert.match(messages,/data-action="dm-new"/);
 assert.match(messages,/data-action="pati-group-create-open"/);
 assert.match(bulk,/className='buchee-dm-bulk-trigger'/);
 assert.ok(messages.indexOf('data-action="dm-new"')<messages.indexOf('data-action="pati-group-create-open"'));
 assert.match(app,/case 'chat-back':patiDmTypingInput\(''\);mobileChatOpen=false;patiDmDisconnectTyping\(\);render\(\);break;/);
 assert.match(css,/grid-template-columns:44px minmax\(0,1fr\) 132px/);
 assert.match(css,/min-height:44px/);
 assert.doesNotMatch(messages,/class="pati-dm-filters"/);
});
test('personal and group messages remain visible; deleting a chat only creates a viewer cutoff',()=>{
 assert.match(messages,/patiDmIndexDmHistory|patiIndexDmHistory/);
 assert.match(messages,/patiGroupMountInMessages\(summaries,peers,chatFilter\)/);
 assert.match(messages,/chat-unread/);
 assert.match(messages,/Yeni mesaj isteği/);
 assert.match(app,/from\('patiyiz_dm_hidden_threads'\)/);
 const single=app.slice(app.indexOf('async function patiDmDeleteConversation('),app.indexOf('function patiDmSafeRender(){'));
 assert.doesNotMatch(single,/\.from\('messages'\)\.delete\(/);
 assert.match(bulk,/BucheeBulkHideDmThreads/);
 assert.match(bulk,/Mesajlar ve grup sohbetleri silinmez/);
 assert.match(bulk,/pati-group-thread-row/);
});
test('search filtering and list scroll position survive live inbox updates',()=>{
 assert.match(messages,/const priorSearchValue=priorSearch\?\.value\|\|''/);
 assert.match(messages,/const priorSearchFocus=/);
 assert.match(messages,/const priorInboxScroll=/);
 assert.match(messages,/chatSearch\.value=priorSearchValue/);
 assert.match(messages,/chatSearch\.dispatchEvent\(new Event\('input'\)\)/);
 assert.match(messages,/currentInboxList\.scrollTop=priorInboxScroll/);
 assert.match(messages,/data-search=/);
});
test('safe rerender retains a draft, reply identity and the cursor position',()=>{
 let phase=0,focused=false,selection=-1;
 const original={value:'Yarım kalan mesaj',selectionStart:5,form:{dataset:{reply:'message-1'}}};
 const searchOld={value:'',focus(){}};
 const after={value:'',form:{dataset:{}},focus(){focused=true},setSelectionRange(n){selection=n}};
 const searchNew={value:'',focus(){}};
 const doc={activeElement:original,querySelector(selector){
  return selector.startsWith('#message-form')?(!phase?original:after):(!phase?searchOld:searchNew);
 }};
 const fn=vm.runInNewContext(safeRender+'\npatiDmSafeRender',{view:'messages',document:doc,render(){phase=1},Event:class{}});
 fn();
 assert.equal(after.value,'Yarım kalan mesaj');
 assert.equal(after.form.dataset.reply,'message-1');
 assert.equal(focused,true);
 assert.equal(selection,5);
});
test('empty inbox has a way to start a new chat and message previews identify media',()=>{
 assert.match(messages,/buchee-dm-empty/);
 assert.match(messages,/data-action="dm-new">Yeni sohbet başlat/);
 assert.match(messages,/last\.attachment_type==='image'\?'Fotoğraf'/);
 assert.match(messages,/last\.attachment_type==='audio'\?'Sesli mesaj'/);
});
test('all new styles remain scoped, keyboard follows existing viewport height and source bundle stays intact',()=>{
 assert.match(css,/html\[data-pati-view="messages"\]/);
 assert.match(css,/\.pati-dm-layout\.mobile-chat-open \.chat-history/);
 assert.match(css,/html\.pati-keyboard-open\[data-pati-view="messages"\]/);
 assert.doesNotMatch(css,/@import/);
 assert.match(html,/buchee-messages-phase3-20261103\.css\?v=20261103v1/);
 assert.match(html,/buchee-dm-bulk-select-20261102\.js\?v=20261103-phase3-v1/);
 new vm.Script(app);new vm.Script(bulk);
});
