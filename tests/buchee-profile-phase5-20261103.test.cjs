'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('buchee-profile-phase5-20261103.css','utf8');
const page=app.slice(app.indexOf('function profilePage(){'),app.indexOf('function formField(',app.indexOf('function profilePage(){')));
const wallet=app.slice(app.indexOf('function patiProfileWalletRefresh(){'),app.indexOf('function patiProfileTabKeyboard(',app.indexOf('function patiProfileWalletRefresh(){')));
const keys=app.slice(app.indexOf('function patiProfileTabKeyboard('),app.indexOf('document.addEventListener(\'keydown\',patiProfileTabKeyboard);')+'document.addEventListener(\'keydown\',patiProfileTabKeyboard);'.length);
test('own profile shows the real wallet balance, not an invented or hardcoded amount',()=>{
 assert.match(page,/const walletReady=typeof patiCoinState!=='undefined'&&patiCoinState\.ready===true/);
 assert.match(page,/Number\(patiCoinState\.balance\)/);
 assert.match(page,/data-buchee-wallet-value aria-live="polite"/);
 assert.match(page,/data-action="paticoin-rewards"/);
 assert.match(page,/walletBalance/);
 assert.match(app,/ready:true\};\s*navRender\(\);patiProfileWalletRefresh\(\)/);
 assert.match(app,/let patiCoinState=\{balance:0,[^\n]*ready:false\}/);
 assert.doesNotMatch(page,/walletBalance=\d{3}/);
});
test('wallet refresh renders a server-confirmed balance, then leaves unknown amounts unclaimed',()=>{
 const number={textContent:''};
 const attrs={};
 const button={querySelector:selector=>selector==='[data-buchee-wallet-value]'?number:null,setAttribute:(k,v)=>attrs[k]=v};
 const ctx={view:'profile',me:{id:'alice'},profileId:'',main:{querySelector:()=>button},
   patiCoinState:{balance:12540,ready:true},Number,Math};
 const run=vm.runInNewContext(wallet+'\npatiProfileWalletRefresh',ctx);
 run();
 assert.equal(number.textContent,'12.540');
 assert.match(attrs['aria-label'],/12\.540 puan/);
 ctx.patiCoinState={balance:0,ready:false};
 run();
 assert.equal(number.textContent,'—');
 assert.match(attrs['aria-label'],/yükleniyor/);
 ctx.profileId='bob';ctx.patiCoinState={balance:900,ready:true};run();
 assert.equal(number.textContent,'—','never shows private balance on another profile');
});
test('five separate content tabs remain, accessible and large enough for narrow phones',()=>{
 for(const name of ["['media',gridTabIcon","['reels',ico('reels-tab')","['videos',videoTabIcon","['text',textTabIcon","['reposts',repostTabIcon"])assert.ok(page.includes(name),name);
 assert.match(page,/role="tablist" aria-label="Profil gönderileri"/);
 assert.match(page,/aria-selected=/);
 assert.match(page,/tabindex=/);
 assert.match(page,/pati-profile-tab-caption/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(css,/min-height:60px!important/);
 assert.match(css,/width:20px!important;height:20px!important/);
});
test('keyboard supports Arrow navigation, Home and End without deleting any tab',()=>{
 assert.match(keys,/ArrowLeft/);
 assert.match(keys,/ArrowRight/);
 assert.match(keys,/Home/);
 assert.match(keys,/End/);
 assert.match(keys,/tabs\[next\]\.click\(\)/);
 assert.match(keys,/preventDefault\(\)/);
 assert.match(keys,/focus\?\.\(\{preventScroll:true\}\)/);
});
test('profile edit and insights share one row; followers remain linked and updated from server',()=>{
 assert.match(page,/pati-own-profile-actions/);
 assert.match(page,/patiCreatorPreviewHTML/);
 assert.match(page,/data-action="followers-list"/);
 assert.match(app,/function syncProfileCounts\(id,force=false\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
 assert.match(css,/\.pati-profile-insights-preview/);
 assert.match(css,/min-height:46px!important/);
});
test('photo/video grid and privacy remain, no balance appears on visitor profiles',()=>{
 assert.match(page,/const privateLocked=!own&&p\.is_private/);
 assert.match(page,/profilePostsTab==='reposts'\?patiRepostedPosts/);
 assert.match(page,/pati-profile-text-feed/);
 assert.match(page,/pati-ig-grid/);
 assert.match(page,/own\?'<div class="buchee-profile-wallet"/);
 assert.match(page,/syncProfileCounts\(p\.id\)/);
});
test('isolated mobile stylesheet is loaded late without modifying source bundle',()=>{
 assert.match(html,/buchee-profile-phase5-20261103\.css\?v=20261103v1/);
 assert.match(html,/app\.js\?v=20261103-profile-phase5-v1/);
 assert.ok(html.indexOf('buchee-profile-phase5-20261103.css')>html.indexOf('buchee-reels-phase4-20261103.css'));
 assert.doesNotMatch(css,/html\[data-pati-view="reels"\]|html\[data-pati-view="home"\]|html\[data-pati-view="messages"\]/);
 new vm.Script(app);
 let depth=0;for(const char of css){if(char==='{')depth++;if(char==='}')depth--;assert.ok(depth>=0)}
 assert.equal(depth,0);
});
