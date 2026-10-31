const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const media=fs.readFileSync('patiyiz-system-media.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-reels-controls-media-icons-20261031.css','utf8');
const priorCSS=fs.readFileSync('patiyiz-fullscreen-reels-profile-20261031.css','utf8');

test('The new style loads last without losing fullscreen Reels rules',()=>{
 assert.ok(html.includes('patiyiz-reels-controls-media-icons-20261031.css?v=1'));
 assert.ok(html.indexOf('patiyiz-reels-controls-media-icons-20261031.css?v=1')>html.indexOf('patiyiz-profile-menu-coin-layout-20261031.css?v=1'));
 assert.match(priorCSS,/data-pati-view="reels"/);
});
test('All existing right rail actions stay connected to app handlers',()=>{
 const start=app.indexOf('function reelsPage(){');
 const end=app.indexOf('function closePatiCreate()',start);
 assert.ok(start>=0&&end>start);
 const reel=app.slice(start,end);
 for(const action of ['like','comment','pati-repost','share-post','save','reel-speed','reel-sound']){
  assert.ok(reel.includes('data-action="'+action+'"'),action+' is unavailable');
 }
 assert.match(reel,/pati-reel-rail/);
 assert.match(css,/\.pati-reel-rail>button/);
 assert.match(css,/border:1\.3px solid var\(--pati-reel-ctl-outline\)!important/);
 assert.match(css,/backdrop-filter:blur\(14px\)/);
 assert.match(css,/focus-visible/);
 assert.match(css,/@media\(max-height:530px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
});
test('Saved and liked states are distinct, not just decorative',()=>{
 assert.match(css,/active\[data-action="like"\]/);
 assert.match(css,/active\[data-action="save"\]/);
 assert.match(css,/active\[data-action="pati-repost"\]/);
 assert.match(css,/svg\.icon/);
 assert.match(css,/pati-reel-count/);
 assert.match(css,/min-height:52px!important/);
});
test('Only the left photo/video/gallery tiles change and native inputs remain unchanged',()=>{
 for(const action of ['camera-photo','camera-video','gallery']){
  assert.ok(media.includes('data-system="'+action+'"'),'missing '+action);
 }
 for(const classname of ['pati-system-option-photo','pati-system-option-video','pati-system-option-gallery']){
  assert.match(css,new RegExp('\\.'+classname+'\\{'));
 }
 assert.match(css,/pati-system-option-icon::before/);
 assert.match(css,/pati-system-option-icon::after/);
 assert.match(css,/svg\{[\s\S]*stroke:#fff!important/);
 assert.doesNotMatch(css,/\.pati-system-panel\{|\.pati-system-modes\{|\.pati-system-options button\[data-system="camera-photo"\]\{/);
 assert.match(media,/capture="environment"/);
 assert.match(media,/window\.PatiyizNative\?\.isNative/);
 assert.doesNotMatch(css,/pati-system-camera-video\{/);
});
test('Refined vector glyphs are clear photo/video/gallery drawings and all scripts parse',()=>{
 assert.match(media,/const optionIcons=\{/);
 assert.match(media,/photo:'<svg/);
 assert.match(media,/video:'<svg/);
 assert.match(media,/gallery:'<svg/);
 assert.match(media,/<circle cx="12" cy="13" r="3\.25"\/>/);
 assert.match(media,/<circle cx="9\.65" cy="12" r="2\.45"/);
 new vm.Script(media);new vm.Script(app);
 let depth=0;
 for(const c of css){if(c==='{')depth++;if(c==='}')depth--;assert.ok(depth>=0)}
 assert.equal(depth,0);
});
