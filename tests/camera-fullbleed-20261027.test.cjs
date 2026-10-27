const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const camera=fs.readFileSync('patiyiz-camera-flow.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const style=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/src/native-shell.js','utf8');
const full=style.slice(style.indexOf('/* 2026-10-27 · Full-bleed Instagram-style'));

test('Story and Reels portrait viewfinder occupies the entire phone viewport',()=>{
 assert.ok(full.length>1000,'new full-bleed styles loaded');
 assert.match(full,/@media\(max-width:740px\)/);
 assert.match(full,/data-capture-aspect="portrait"[^{}]*\{[\s\S]*?height:100dvh!important/);
 assert.match(full,/\.pati-camera-stage\{[\s\S]*?position:absolute!important;inset:0!important;[\s\S]*?height:100%!important/);
 assert.match(full,/\.pati-camera-viewfinder\{[\s\S]*?inset:0!important;[\s\S]*?aspect-ratio:auto!important/);
 assert.match(full,/pati-camera-chosen-video\{[\s\S]*?object-fit:cover!important/);
 assert.match(full,/\.pati-camera-head\{[\s\S]*?position:absolute!important/);
 assert.match(full,/\.pati-camera-bottom\{[\s\S]*?position:absolute!important/);
 assert.match(full,/\.pati-camera-gallery-panel\{[\s\S]*?bottom:0!important/);
});

test('Full-screen framing applies equally to front and rear camera, with mirrored selfie',()=>{
 assert.match(camera,/facing:'user'/);
 assert.match(camera,/state\.facing=state\.facing==='environment'\?'user':'environment'/);
 assert.match(style,/pati-camera-selfie[^{]*#pati-camera-live\{transform:scaleX\(-1\)/);
 assert.match(full,/pati-camera-selfie[^{]*#pati-camera-live\{[\s\S]*?object-fit:cover!important/);
 assert.match(camera,/root\.dataset\.captureAspect=mode==='post'\?'square':'portrait'/);
 assert.match(style,/data-capture-aspect="square"[^{}]*\{aspect-ratio:1\/1/);
});

test('Camera overlays contain working gallery, capture, flip and post/story/reels tabs',()=>{
 for(const text of ['data-camera="toggle"','data-camera="shutter"','data-camera="flip"','data-camera="switch"','data-camera-target="post"','data-camera-target="story"','data-camera-target="reels"','data-camera="retake"']){
  assert.ok(camera.includes(text),text);
 }
 assert.match(camera,/if\(action==='switch'\)/);
 assert.match(camera,/const cb=state\.onSwitch;cleanup\(\);cb\?\.\(next\)/);
 assert.match(app,/onSwitch\(nextMode\)/);
 assert.match(app,/if\(nextMode==='post'\)startPatiCameraPost\(\)/);
 assert.match(app,/else if\(nextMode==='story'\)startPatiCameraStory\(\)/);
 assert.match(app,/else if\(nextMode==='reels'\)startPatiCameraReels\(\)/);
 assert.match(camera,/if\(action==='retake'\)/);
 assert.match(camera,/resetSelection\(\);[\s\S]*?await startCamera\(\)/);
 assert.match(camera,/root\.querySelector\('#pati-camera-retake'\)\.hidden=!has/);
});

test('Android Story/Reels enters immersive mode only while camera is open',()=>{
 assert.match(native,/function setCameraImmersive\(active\)/);
 assert.match(native,/active\?StatusBar\.hide\(\):StatusBar\.show\(\)/);
 assert.match(native,/nativeLogout,setCameraImmersive/);
 assert.match(camera,/setCameraImmersive\?\.\(mode==='story'\|\|mode==='reels'\)/);
 assert.match(camera,/setCameraImmersive\?\.\(false\)/);
});

test('New viewfinder and controls are versioned for mobile updates',()=>{
 assert.match(html,/patiyiz-camera-flow\.js[^"]*fullbleed=1/);
 assert.match(html,/patiyiz-inspired\.css[^"]*fullbleed=1/);
 assert.match(html,/app\.js[^"]*fullbleed=1/);
});
