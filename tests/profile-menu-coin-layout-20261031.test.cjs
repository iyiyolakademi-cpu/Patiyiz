const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-profile-menu-coin-layout-20261031.css','utf8');

test('Own profile gets an accessible top-right button connected to existing features menu',()=>{
 const start=app.indexOf('function profilePage(){');
 const end=app.indexOf('function formField(',start);
 assert.ok(start>0&&end>start);
 const profile=app.slice(start,end);
 assert.match(profile,/pati-profile-topbar/);
 assert.match(profile,/pati-profile-menu-trigger/);
 assert.match(profile,/data-action="tools"/);
 assert.match(profile,/Profil menüsünü aç/);
 assert.match(profile,/own\?'<div class="pati-profile-topbar"/);
 assert.match(app,/case 'tools':openMobileFeaturesMenu\(\);break/);
 assert.match(css,/#main-content \.pati-profile-menu-trigger/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/focus-visible/);
});

test('Other profile retains only its three-dot safety menu, not the own profile menu',()=>{
 const start=app.indexOf('function profilePage(){'),end=app.indexOf('function formField(',start);
 const profile=app.slice(start,end);
 assert.match(profile,/<details class="pati-profile-more-wrap"/);
 assert.match(profile,/button\('Hesabı bildir','report'/);
 assert.match(profile,/pati-restrict/);
 assert.match(profile,/\(!own\?'<details class="pati-profile-more-wrap"/);
});

test('PatiCoin card is balanced with edit action and still uses live rewards route',()=>{
 const start=app.indexOf('function profilePage(){'),end=app.indexOf('function formField(',start);
 const profile=app.slice(start,end);
 assert.match(profile,/Profili düzenle/);
 assert.match(profile,/pati-profile-coin-icon/);
 assert.match(profile,/pati-profile-coin-copy/);
 assert.match(profile,/PatiCoin bakiyen/);
 assert.match(profile,/id="pati-profile-balance"/);
 assert.match(profile,/data-action="paticoin-rewards"/);
 assert.match(app,/profileBalance\.textContent=Number\(patiCoinState\.balance/);
 assert.match(app,/case 'paticoin-rewards':navigate\('rewards'\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.1fr\)!important/);
 assert.match(css,/height:64px!important/);
 assert.match(css,/white-space:normal!important/);
});

test('Layout is scoped to profile and supports narrow mobile screens',()=>{
 assert.match(css,/#main-content \.pati-ig-profile/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/@media\(max-width:320px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.ok(html.indexOf('patiyiz-profile-menu-coin-layout-20261031.css?v=1')>html.indexOf('patiyiz-share-profile-story-polish-20261031.css?v=1'));
 let depth=0;for(const char of css){if(char==='{')depth++;if(char==='}')depth--;assert.ok(depth>=0)}
 assert.equal(depth,0);
 new vm.Script(app);
});
