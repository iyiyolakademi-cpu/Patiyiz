const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const camera=fs.readFileSync('patiyiz-camera-flow.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const compress=fs.readFileSync('patiyiz-video-prepare.js','utf8');
const draft=fs.readFileSync('patiyiz-camera-draft.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
test('Camera preview shares square and portrait crop logic with capture and recording',()=>{
 assert.match(camera,/function paintFramePreview\(current\)/);
 assert.match(camera,/drawCameraFrame\(canvas\.getContext\('2d',\{alpha:false\}\),video,canvas\.width,canvas\.height,current\.facing==='user'\)/);
 assert.match(camera,/id="pati-camera-framed"/);
 assert.match(camera,/mode==='post'\?720:1280/);
 assert.match(camera,/drawCameraFrame\(cv\.getContext\('2d'\),v,w,h,state\.facing==='user'\)/);
 assert.match(css,/#patiyiz-camera-screen #pati-camera-framed/);
});
test('Audio/video preference and user controls are graceful',()=>{
 assert.match(camera,/frameRate:\{ideal:30\}/);
 assert.match(camera,/getCapabilities\?\.\(\)/);
 assert.match(camera,/if\(torch\)\{torch\.hidden=!caps\.torch/);
 assert.match(camera,/if\(action==='torch'\)/);
 assert.match(camera,/applyConstraints\(\{advanced:\[\{torch:next\}\]\}\)/);
 assert.match(camera,/id="pati-camera-zoom"/);
 assert.match(camera,/if\(state\.recorder\?\.state==='recording'\)return/);
 assert.match(camera,/focusMode:'single-shot'/);
});
test('Large video never bypasses storage limit and attempts audio-safe local encode',()=>{
 assert.match(compress,/LIMIT=50\*1024\*1024/);
 assert.match(compress,/MAX_SOURCE=500\*1024\*1024/);
 assert.match(compress,/MAX_DURATION=600/);
 assert.match(compress,/createMediaStreamDestination\(\)/);
 assert.match(compress,/getAudioTracks\(\)/);
 assert.match(compress,/canvas\.captureStream\(24\)/);
 assert.match(compress,/if\(!blob\.size\|\|blob\.size>LIMIT\)/);
 assert.match(app,/const max=50\*1024\*1024/);
 assert.match(camera,/file\.size>500\*1024\*1024/);
});
test('Web and native gallery offer photos and videos without exposing private media',()=>{
 assert.match(camera,/Telefon galerisi · fotoğraf veya video/);
 assert.match(camera,/data-camera="video-gallery"/);
 assert.match(camera,/accept="image\/\*,video\/\*/);
 assert.match(camera,/PatiyizNativeGallery\.getPhotos/);
});
test('User scoped IndexedDB persists selected files for at most 24h',()=>{
 assert.match(draft,/indexedDB\.open\(DB,1\)/);
 assert.match(draft,/TTL=24\*60\*60\*1000/);
 assert.match(draft,/MAX_BYTES=120\*1024\*1024/);
 assert.match(draft,/async function save\(user,mode,files,caption/);
 assert.match(draft,/Date\.now\(\)-\(item\.saved\|\|0\)>TTL/);
 assert.match(camera,/PatiyizCameraDraft\?\.save\(state\.userId/);
 assert.match(camera,/PatiyizCameraDraft\?\.load\(userId\)/);
 assert.match(app,/mode,userId:me\.id/);
 assert.match(app,/PatiyizCameraDraft\?\.clear\(me\.id\)/);
 assert.match(native,/'patiyiz-camera-draft\.js'/);
 assert.match(html,/patiyiz-camera-draft\.js/);
});
test('Backgrounding finalizes recording before stopping source tracks',()=>{
 assert.match(camera,/if\(document\.hidden\)\{/);
 assert.match(camera,/const current=state;stopRecorder\(\)/);
 assert.match(camera,/setTimeout\(\(\)=>\{if\(state===current\)stopCamera\(\)\},900\)/);
 assert.match(camera,/onstop=\(\)=>/);
 assert.match(html,/camera6=1/);
});