'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('buchee-iphone-screen-fixes-20261104.css','utf8');
const part=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i);return app.slice(i,j)};
test('DM Reels share has exactly one play glyph, drawn once and positioned at the center',()=>{
 const src=part('function patiDmSharedCard(message){','async function patiDm');
 assert.match(src,/class="pati-dm-shared-play" aria-hidden="true"><\/span>/);
 assert.doesNotMatch(src,/class="pati-dm-shared-play" aria-hidden="true">▶<\/span>/);
 assert.match(src,/data-action="dm-open-shared-post"/);
 assert.match(css,/\.pati-dm-shared-video-wrap>\.pati-dm-shared-play::before/);
 assert.match(css,/content:"▶"!important/);
 assert.match(css,/top:50%!important;left:50%!important/);
 assert.match(css,/translate\(-50%,-50%\)/);
 assert.match(css,/::-webkit-media-controls-start-playback-button/);
});
test('Owner story sound control sits immediately to the left of Close, never floating above',()=>{
 const src=part('function showStoryFrame(){','async function syncStoryLike(');
 assert.match(src,/root\.querySelector\('\.story-player-head'\)/);
 assert.match(src,/root\.querySelector\('\.story-player > \.pati-story-sound'\)/);
 assert.match(src,/if\(soundButton&&closeButton\)closeButton\.before\(soundButton\)/);
 assert.match(css,/\.story-player-head>\.pati-story-sound/);
 assert.match(css,/position:relative!important;inset:auto!important/);
 assert.match(css,/order:2!important/);
 assert.match(css,/\.story-player-head>\.story-close\{/);
 assert.match(css,/order:3!important/);
});
test('Visitor profile menu is moved below top bar but keeps report and restriction actions',()=>{
 const src=part('function profilePage(){','function formField(');
 assert.match(src,/class="pati-profile-more-wrap"/);
 assert.match(src,/aria-label="Profil seçenekleri"/);
 assert.match(src,/Hesabı bildir/);
 assert.match(src,/Kısıtlamayı kaldır/);
 assert.match(css,/top:calc\(56px \+ 14px\)!important/);
 assert.match(css,/min-height:44px!important/);
});
test('Post detail uses a single real back button and never covers guidance text',()=>{
 const detail=part('function patiDetailPage(){','function closePostDetail(){');
 const render=part('function render(){','async function load(');
 assert.match(detail,/class="pati-detail-toolbar"><button type="button" data-action="post-back"/);
 assert.match(detail,/Diğer paylaşımlar için yukarı veya aşağı kaydır/);
 assert.match(render,/globalBack\.hidden=.*patiDetailState/);
 assert.match(css,/grid-template-areas:"back back" "heading count"!important/);
 assert.match(css,/grid-area:back!important/);
 assert.match(css,/grid-area:heading!important/);
 assert.match(css,/button\[data-action="post-back"\]\{/);
 assert.match(app,/case 'post-back':\{\s*closePostDetail\(\)/);
});
test('No database changes and new CSS is shipped through web and native asset manifests',()=>{
 assert.match(html,/buchee-iphone-screen-fixes-20261104\.css\?v=20261104-v1/);
 assert.match(html,/app\.js\?v=20261104-iphone-fixes-v1/);
 assert.ok(html.indexOf('buchee-iphone-screen-fixes-20261104.css')>html.indexOf('buchee-profile-phase5-20261103.css'));
 const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
 assert.match(native,/htmlSource\.matchAll/);
 new vm.Script(app);
 let nest=0;for(const ch of css){if(ch==='{')nest++;if(ch==='}')nest--;assert.ok(nest>=0)}
 assert.equal(nest,0);
});
