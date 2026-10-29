const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const system=fs.readFileSync('patiyiz-system-media.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const native=fs.readFileSync('native-capacitor/src/native-shell.js','utf8');
const build=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
test('Camera creation opens actual device capture and photo/video gallery, not web viewfinder',()=>{
 assert.match(system,/id="pati-system-camera-photo" type="file" accept="image\/\*" capture="environment"/);
 assert.match(system,/id="pati-system-camera-video" type="file" accept="video\/\*/);
 assert.match(system,/id="pati-system-gallery" type="file" accept="/);
 assert.doesNotMatch(system,/getUserMedia|MediaRecorder|captureStream|requestAnimationFrame/);
 assert.match(app,/mediaFlow\.open\(\{/);
 assert.match(app,/window\.PatiyizSystemMediaFlow/);
 assert.match(app,/const mediaFlow=window\.PatiyizSystemMediaFlow/);
 assert.doesNotMatch(system,/action==='camera-photo'&&state\.mode==='story'/);
});
test('Android native photo capture uses Capacitor real camera, video and gallery use file picker',()=>{
 assert.match(system,/window\.PatiyizNative\.pickPhotoForInput\(input,'camera',false\)/);
 assert.match(native,/Camera\.getPhoto\(\{source:source==='camera'\?CameraSource\.Camera:CameraSource\.Photos/);
 assert.match(system,/try\{input\.click\(\)\}/);
 assert.match(system,/name==='camera-photo'/);
 assert.match(build,/'patiyiz-system-media\.js'/);
});
test('iPhone and browser picker supports videos in story and photo or video gallery',()=>{
 assert.match(system,/mode==='reels'\?'video':'mixed'/);
 assert.match(system,/image\/\*,video\/\*,\.heic,\.heif,\.mov,\.mp4/);
 assert.match(system,/mode==='post'\?' multiple'/);
 assert.match(system,/current\.mode==='reels'&&\(!videos\.length\|\|selected\.length!==1\)/);
 assert.match(system,/current\.mode==='story'&&selected\.length!==1/);
 assert.match(system,/videos\.length&&\(photos\.length\|\|\(current\.mode!=='post'&&videos\.length>1\)\|\|videos\.length>4\)/);
});
test('After selection only native file preview caption and publication remain',()=>{
 assert.match(system,/id="pati-system-preview-media"/);
 assert.match(system,/id="pati-system-caption"/);
 assert.match(system,/id="pati-system-publish"/);
 assert.match(system,/id="pati-system-chooser"/);
 assert.match(system,/chooser\.hidden=chosen;preview\.hidden=!chosen/);
 assert.match(system,/await state\.onPublish\(root\.querySelector\('#pati-system-caption'\)\.value\)/);
 assert.match(app,/await createStoryPublication\(form,f,str\)/);
 assert.match(app,/await createPostPublication\(form,f,str\)/);
 assert.match(app,/form\.dataset\.cameraFirst='1'/);
 assert.match(css,/#patiyiz-system-media \.pati-system-options/);
});
test('No lost files on cancellation or failed upload, no cross-account drafts',()=>{
 assert.match(system,/const cb=state\.onCancel;close\(\);cb\?\.\(\)/);
 assert.match(system,/catch\(err\)\{[\s\S]*?publish\.disabled=false;publish\.textContent='Tekrar paylaş'/);
 assert.match(system,/PatiyizCameraDraft\?\.save\(current\.userId,current\.mode,selected/);
 assert.match(app,/mode,userId:me\.id/);
 assert.match(app,/mediaFlow\?\.close\(\);closeModal\(true\)/);
 assert.match(app,/void window\.PatiyizCameraDraft\?\.clear\(me\.id\)/);
});
test('Share mode switch routes to existing composer without custom camera',()=>{
 assert.match(system,/data-system="switch"/);
 assert.match(system,/const cb=state\.onSwitch;close\(\);cb\?\.\(next\)/);
 assert.match(app,/if\(nextMode==='post'\)startPatiCameraPost\(\)/);
 assert.match(app,/else if\(nextMode==='story'\)startPatiCameraStory\(\)/);
 assert.match(app,/else if\(nextMode==='reels'\)startPatiCameraReels\(\)/);
 assert.match(html,/patiyiz-system-media\.js\?v=20261027-native-picker-1/);
 assert.match(html,/systempicker=1/);
});