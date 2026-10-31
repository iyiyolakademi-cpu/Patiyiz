const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const fullscreen=fs.readFileSync('patiyiz-fullscreen-reels-profile-20261031.css','utf8');
const colorful=fs.readFileSync('patiyiz-colorful-camera-chooser-20261031.css','utf8');
const media=fs.readFileSync('patiyiz-system-media.js','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');

test('New screen and camera styles load after the unified stylesheet',()=>{
 const old='patiyiz-unified-social-design-20261031.css?v=1';
 const pages='patiyiz-fullscreen-reels-profile-20261031.css?v=1';
 const colors='patiyiz-colorful-camera-chooser-20261031.css?v=1';
 assert.ok(html.includes(old)&&html.includes(pages)&&html.includes(colors));
 assert.ok(html.indexOf(old)<html.indexOf(pages)&&html.indexOf(pages)<html.indexOf(colors));
 assert.match(native,/const referenced=\[\.\.\.htmlSource\.matchAll/);
 assert.match(native,/for\(const file of referenced\)/);
});

test('Header only appears on feed; inner pages keep back navigation',()=>{
 assert.match(app,/dataset\.patiScreen=\(view==='home'&&!selectedPostId\)\?'feed':'inner'/);
 assert.match(app,/function patiEnsurePageBack\(\)\{[\s\S]*?view==='messages'\)return/);
 assert.match(app,/btn\.dataset\.action='pati-page-back'/);
 assert.match(app,/case 'pati-page-back':case 'pati-global-back':patiGoBack\(\)/);
 assert.match(fullscreen,/html\[data-pati-screen="inner"\] #app-root:not\(\.hidden\)>\.mobile-header/);
 assert.match(fullscreen,/html\[data-pati-view="reels"\] #main-content>\.pati-page-back/);
 assert.match(fullscreen,/html\[data-pati-view="reels"\] #main-content \.pati-reels-viewport/);
 assert.match(fullscreen,/@media\(min-width:741px\)/);
 assert.match(fullscreen,/@media\(max-width:740px\)/);
 assert.match(fullscreen,/safe-area-inset-top/);
});

test('Other-profile safety actions only appear in the accessible overflow menu',()=>{
 const begin=app.indexOf('function profilePage(){');
 const end=app.indexOf('function formField(',begin);
 assert.ok(begin>=0&&end>begin);
 const profile=app.slice(begin,end);
 assert.match(profile,/<details class="pati-profile-more-wrap"/);
 assert.match(profile,/button\('Hesabı bildir','report'/);
 assert.match(profile,/button\(patiSafetyState\.restrictions\.has\(p\.id\)\?'Kısıtlamayı kaldır':'Kısıtla','pati-restrict'/);
 assert.match(profile,/\+button\('Mesaj gönder','chat'/);
 const actions=profile.slice(profile.indexOf("pati-ig-actions"),profile.indexOf("patiCreatorPreviewHTML"));
 assert.ok(actions.length>0&&actions.length<600);
 assert.doesNotMatch(actions,/Hesabı bildir|Kısıtla|pati-restrict/);
 assert.match(app,/menu\.open=false/);
 assert.match(fullscreen,/\.pati-profile-more-wrap>summary:focus-visible/);
 assert.match(fullscreen,/\.pati-profile-more-menu button/);
});

test('Reels actions remain operable and have thumb-friendly visual sizes',()=>{
 for(const action of ['reel-play','reel-sound','reel-seek','like','comment','pati-repost','share-post','save']){
  assert.ok(app.includes('data-action="'+action+'"'),'Missing '+action);
 }
 assert.match(fullscreen,/min-height:45px!important/);
 assert.match(fullscreen,/backdrop-filter:blur\(9px\)/);
 assert.match(fullscreen,/pati-reel-rail \.pati-reel-action-label\{display:none!important\}/);
});

test('Photo, video and gallery remain distinct native picker actions and are colorful',()=>{
 for(const action of ['camera-photo','camera-video','gallery']){
  assert.ok(media.includes('data-system="'+action+'"'),'Missing native picker '+action);
 }
 assert.match(colorful,/pati-system-options button\[data-system="camera-video"\]/);
 assert.match(colorful,/pati-system-options button\[data-system="gallery"\]/);
 assert.match(colorful,/pati-system-option-photo/);
 assert.match(colorful,/pati-system-option-video/);
 assert.match(colorful,/pati-system-option-gallery/);
 assert.match(colorful,/linear-gradient/);
 assert.match(colorful,/prefers-reduced-motion/);
 assert.doesNotMatch(colorful,/input\[type="file"\]\{display:none/);
});

test('Both new CSS assets have balanced rule blocks',()=>{
 for(const [name,css] of [['fullscreen',fullscreen],['colorful',colorful]]){
  let depth=0;
  for(const c of css){if(c==='{')depth++;else if(c==='}')depth--;assert.ok(depth>=0,name+' unexpected closing brace');}
  assert.equal(depth,0,name+' unbalanced rule blocks');
 }
});
