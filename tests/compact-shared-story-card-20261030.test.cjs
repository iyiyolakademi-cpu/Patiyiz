const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-compact-shared-story-20261030.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const card=app.slice(app.indexOf('function patiStorySharedPostCard(x){'),app.indexOf('function showStoryFrame(){'));
const frame=app.slice(app.indexOf('function showStoryFrame(){'),app.indexOf('async function syncStoryLike(id){'));

test('Patiyiz app JavaScript remains valid',()=>new vm.Script(app));
test('Reposted story has an actual compact, clickable photo/video card instead of fullscreen media',()=>{
 assert.match(card,/pati-story-share-stage/);
 assert.match(card,/pati-story-share-card/);
 assert.match(card,/pati-story-share-media/);
 assert.match(card,/story-big-video pati-story-share-media-video/);
 assert.match(card,/story-big-photo pati-story-share-media-photo/);
 assert.match(card,/pati-story-shared-source/);
 assert.match(card,/data-action="pati-story-open-post"/);
 assert.match(card,/esc\(x\.shared_post_id\)/);
 assert.match(card,/Paylaşılan Reels önizlemesi/);
 assert.match(card,/Gönderiyi aç/);
 assert.match(frame,/x\.shared_post_id\?patiStorySharedPostCard\(x\):x\.video_url\?/);
 assert.match(frame,/x\.caption&&!x\.shared_post_id/);
});
test('Ordinary photo/video stories stay immersive and audio/playback, progress and owner controls survive',()=>{
 assert.match(frame,/class="story-big-video/);
 assert.match(frame,/class="story-big-photo/);
 assert.match(frame,/class="pati-story-sound"/);
 assert.match(frame,/root\.querySelector\('\.story-big-video'\)/);
 assert.match(frame,/storyGroupItems\.map/);
 assert.match(frame,/pati-own-story-stack/);
 assert.match(frame,/pati-story-viewer-preview/);
 assert.match(frame,/story-delete/);
 assert.match(frame,/patiStoryPreviewLoad\(x\.id\)/);
 assert.match(frame,/querySelector\(':scope > \.pati-story-shared-source'\)/);
});
test('Compact story layout uses media-constrained card, not full screen, and respects phone safe areas',()=>{
 assert.match(css,/#story-overlay\.pati-story-has-source \.pati-story-share-stage/);
 assert.match(css,/width:min\(76vw,310px\)!important/);
 assert.match(css,/height:min\(36dvh,306px\)!important/);
 assert.match(css,/object-fit:contain!important/);
 assert.ok(css.includes('.pati-story-share-card>.pati-story-shared-source'));
 assert.match(css,/pati-own-story-stack/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
 assert.match(css,/@media\(max-height:690px\)/);
 assert.match(css,/pati-story-viewers-open/);
});
test('Web/PWA and Android include new styles and refresh application JS cache',()=>{
 assert.match(html,/patiyiz-compact-shared-story-20261030\.css\?v=1/);
 assert.match(html,/compact_story_share=20261030/);
 assert.match(native,/'patiyiz-compact-shared-story-20261030\.css'/);
 assert.ok(html.indexOf('patiyiz-compact-shared-story-20261030.css')<html.indexOf('patiyiz-crop-insights-mobile-final-20261029.css'));
});
