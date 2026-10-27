const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const camera=fs.readFileSync('patiyiz-camera-flow.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');

test('Post uses 1:1 square, Story and Reels use 9:16 portrait frames',()=>{
 const source=camera.slice(camera.indexOf('const targetFrame='),camera.indexOf('function drawCameraFrame('));
 const targetFrame=vm.runInNewContext(source+'\ntargetFrame',{});
 assert.equal(targetFrame('post').w/targetFrame('post').h,1);
 assert.equal(targetFrame('story').w/targetFrame('story').h,9/16);
 assert.equal(targetFrame('reels').w/targetFrame('reels').h,9/16);
 assert.match(camera,/dataset.captureAspect=mode==='post'\?'square':'portrait'/);
 assert.match(css,/data-capture-aspect="square"/);
 assert.match(css,/aspect-ratio:9\/16/);
 assert.match(css,/aspect-ratio:1\/1/);
});
test('Selfie starts with front camera, mirrors preview and asks for supported minimum zoom',()=>{
 assert.match(camera,/facing:'user'/);
 assert.match(camera,/facingMode:\{ideal:current.facing\}/);
 assert.match(camera,/zoom:cap.zoom.min/);
 assert.match(camera,/drawCameraFrame\(cv.getContext\('2d'\),v,w,h,state.facing==='user'\)/);
 assert.match(camera,/ctx.scale\(-1,1\)/);
 assert.match(css,/pati-camera-selfie[^\n]*transform:scaleX\(-1\)/);
});
test('Camera capture and selected photo uses only caption and Share',()=>{
 assert.match(camera,/>Paylaş<\/button>/);
 assert.doesNotMatch(camera,/>Düzenle<\/button>/);
 assert.doesNotMatch(camera,/data-camera="edit"/);
 assert.match(app,/async onPublish\(caption\)/);
 assert.match(app,/await createStoryPublication\(form,f,str\)/);
 assert.match(app,/await createPostPublication\(form,f,str\)/);
 assert.match(app,/cameraFirst!=='1'/);
 assert.match(app,/if\(aspect\)aspect.value=mode==='post'\?'1:1':'9:16'/);
 assert.match(html,/patiyiz-camera-flow\.js[^"]*framing=1/);
});
test('Square and portrait camera video capture includes microphone audio when supported',()=>{
 assert.match(camera,/const frame=targetFrame\(current.mode\),w=720,h=Math.round\(frame.h\*720\/frame.w\)/);
 assert.match(camera,/canvas\.captureStream\(30\)/);
 assert.match(camera,/getAudioTracks\(\)\.forEach\(track=>output.addTrack\(track\)\)/);
});
