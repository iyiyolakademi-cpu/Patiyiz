'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const picker=fs.readFileSync('patiyiz-reels-cover-picker-20261101.js','utf8');
const style=fs.readFileSync('patiyiz-reels-cover-picker-20261101.css','utf8');

test('Reels cover controls provide both gallery upload and video-frame scrubbing',()=>{
 assert.match(app,/data-pati-cover-action="gallery"/);
 assert.match(app,/data-pati-cover-action="frame"/);
 assert.match(app,/name="cover_photo"/);
 assert.match(app,/pati-reel-cover-timeline/);
 assert.match(app,/pati-reel-cover-player/);
 assert.match(app,/videoyu ilerleterek istediğin kareyi kapak yap/);
});
test('Selected Reel cover is persisted through the existing media publication path',()=>{
 assert.match(app,/window\.PatiyizReelsCover\.getSelectedCover\(form\)/);
 assert.match(app,/record\.video_cover_url=await send/);
 assert.match(app,/chosenCover\?\.size\?chosenCover:await patiGenerateVideoCover\(video\)/);
 assert.match(app,/form\.dataset\.mode==='reels'\?'9:16':'4:5'/);
 assert.doesNotMatch(picker,/\bfetch\s*\(|\bXMLHttpRequest\b/);
});
test('Frame capture is local, cropped 9:16 and requires a valid image',()=>{
 assert.match(picker,/canvas\.width=540;canvas\.height=960/);
 assert.match(picker,/ctx\.drawImage\(video,/);
 assert.match(picker,/canvas\.toBlob\(/);
 assert.match(picker,/state\.mode==='frame'/);
 assert.match(picker,/state\.mode==='gallery'/);
 assert.match(picker,/URL\.revokeObjectURL/);
 assert.match(picker,/if\(!file\?\.size\)throw Error/);
});
test('Feed bookmark is on far right, even in post detail screen',()=>{
 assert.match(app,/class="pati-actionbar pati-social-actions"/);
 assert.match(app,/class="pati-save-action /);
 assert.match(style,/#main-content \.pati-feed-card \.pati-actionbar\.pati-social-actions>button\[data-action="save"\]/);
 assert.match(style,/margin-left:auto!important;margin-right:0!important/);
 assert.match(style,/order:99!important/);
});
test('Cover picker assets load last and pass syntax checks',()=>{
 const css=html.indexOf('patiyiz-reels-cover-picker-20261101.css');
 const old=html.indexOf('patiyiz-mobile-icons-actions-insights-20261101.css');
 assert.ok(css>old&&old>=0);
 assert.match(html,/patiyiz-reels-cover-picker-20261101.js\?v=/);
 new vm.Script(picker);
 new vm.Script(app);
 let braces=0;for(const c of style){if(c==='{')braces++;if(c==='}')braces--;assert.ok(braces>=0)}
 assert.equal(braces,0);
});
