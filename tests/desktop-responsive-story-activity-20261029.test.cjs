const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('patiyiz-desktop-responsive-story-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
test('Desktop restores sidebar and full available width instead of 740px phone shell',()=>{
 assert.match(css,/@media \(min-width:741px\)/);
 assert.match(css,/>.app-shell>.sidebar\{[\s\S]*?display:flex!important/);
 assert.match(css,/grid-template-columns:clamp\(192px,20vw,244px\) minmax\(0,1fr\)/);
 assert.match(css,/@media\(min-width:1180px\)/);
 assert.match(css,/>.app-shell>.right-rail\{[\s\S]*?display:flex!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/>.mobile-header,[\s\S]*?>.mobile-bottom,[\s\S]*?>.mobile-fab\{display:none!important\}/);
});
test('Desktop every feature is reachable through old nav plus more menu and action shortcuts',()=>{
 assert.match(html,/id="desktop-nav"/);
 assert.match(html,/data-action="pati-create-open" aria-label="Yeni paylaşım oluştur"/);
 assert.match(html,/data-action="tools" aria-label="Tüm özellikleri aç"/);
 for(const route of ['rewards','shop','saved-posts'])assert.match(html,new RegExp('data-view="'+route+'"'));
 assert.match(app,/function navRender\(\)/);
 assert.match(app,/function openMobileFeaturesMenu\(\)/);
 assert.match(app,/case 'pati-create-open':openPatiCreate\(\)/);
});
test('Mobile is not changed; open direct and group messages keep fullscreen layout',()=>{
 const desktop=css.slice(css.indexOf('@media (min-width:741px)'));
 assert.doesNotMatch(css,/@media \(max-width:740px\)/);
 assert.match(css,/mobile-chat-open\)>.app-shell/);
 assert.match(css,/mobile-chat-open\)>.app-shell>.sidebar/);
 assert.match(css,/mobile-chat-open>.chat-window\{/);
 assert.match(app,/mobileChatOpen&&\(personId\|\|patiActiveGroupId\)\?'mobile-chat-open':'mobile-chat-list'/);
});
test('Story activities hide own story profile and name; only a fullscreen activity view remains',()=>{
 assert.match(css,/#story-overlay\.pati-story-viewers-open \.story-player-head/);
 assert.match(css,/#story-overlay\.pati-story-viewers-open \.story-progress/);
 assert.match(css,/#story-overlay \.story-viewers-sheet:not\(\[hidden\]\)\{[\s\S]*?position:fixed!important/);
 assert.match(css,/width:100vw!important;max-width:none!important/);
 assert.match(css,/height:100dvh!important/);
 assert.match(app,/classList\.add\('pati-story-viewers-open'\)/);
 assert.match(app,/classList\.remove\('pati-story-viewers-open'\)/);
});
test('New styles load after all legacy CSS and are packed in native web bundle',()=>{
 assert.match(html,/patiyiz-micro-motion-20261029\.css\?v=[^"\s]+">\s*<link rel="stylesheet" href="patiyiz-desktop-responsive-story-20261029\.css\?v=1"/);
 assert.match(native,/'patiyiz-desktop-responsive-story-20261029\.css'/);
});
