const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('dm-fullscreen.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const section=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'Missing '+a);return app.slice(i,j)};

test('Both inbox and open chat own the complete phone viewport',()=>{
 assert.match(css,/@media \(max-width:740px\)/);
 assert.match(css,/#app-root:not\(\.hidden\):has\(#main-content \.pati-dm-layout\)>\.app-shell/);
 assert.match(css,/height:var\(--pati-dm-visual-height,100dvh\)!important/);
 assert.match(css,/mobile-header,[\s\S]*?mobile-bottom,[\s\S]*?mobile-fab/);
 assert.match(css,/\.pati-dm-layout\.mobile-chat-list/);
 assert.match(css,/\.pati-dm-layout\.mobile-chat-open/);
 assert.match(css,/env\(safe-area-inset-top,0px\)/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
});

test('Fullscreen message inbox has a real exit action back to the prior screen',()=>{
 const navigate=section('function navigate(to){','function userRow(');
 assert.match(navigate,/if\(to==='messages'&&previous!=='messages'\)patiDmReturnView=previous/);
 const page=section('function messagesPage(){','function pushKeyBytes(');
 assert.match(page,/data-action="dm-exit"/);
 assert.match(page,/class="pati-dm-inbox-back"/);
 assert.match(page,/class="pati-dm-title"/);
 assert.match(app,/case 'dm-exit':patiDmTypingInput\(''\);mobileChatOpen=false;/);
 assert.match(app,/navigate\(patiDmReturnView&&patiDmReturnView!=='messages'\?patiDmReturnView:'home'\)/);
});

test('Chat keeps existing media, typing, receipts, reply and composer',()=>{
 const page=section('function messagesPage(){','function pushKeyBytes(');
 for(const expected of ['data-action="dm-new"','data-action="dm-record"','data-action="pati-dm-gallery-open"','data-action="dm-reply"','data-action="dm-edit"','data-private-path','read_at','pati-dm-typing-indicator','form id="message-form"','chat-history']) {
  assert.ok(page.includes(expected),expected);
 }
 assert.match(css,/\.chat-history[\s\S]*?overflow-y:auto!important/);
 assert.match(css,/html\.pati-keyboard-open[\s\S]*?\.chat-form/);
 assert.match(app,/visualViewport\?\.addEventListener\('scroll',patiResizeChatViewport\)/);
});

test('Desktop and native Android bundle include isolated full-screen stylesheet',()=>{
 assert.match(index,/dm-fullscreen\.css\?v=20261025-fullscreen-1/);
 assert.match(native,/'dm-fullscreen\.css'/);
 assert.match(css,/@media \(min-width:741px\)/);
 assert.match(css,/data-pati-theme="dark"/);
});

test('No new message storage or deletion logic has been introduced',()=>{
 assert.match(app,/sb\.functions\.invoke\('patiyiz-delete-message'/);
 assert.match(app,/\.from\('messages'\)\.insert\(/);
 assert.doesNotMatch(css,/position:absolute!important;bottom:0/);
});
