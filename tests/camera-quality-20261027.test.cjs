const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const camera=fs.readFileSync('patiyiz-camera-flow.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function between(s,a,b){const x=s.indexOf(a),y=s.indexOf(b,x+a.length);assert.ok(x>=0&&y>x,'missing '+a);return s.slice(x,y)}

test('Front camera preview and saved photo use matching fill crop instead of dark bars',()=>{
 assert.match(css,/pati-camera-selfie[^\n]*object-fit:cover/);
 const geometry=between(camera,'function drawCameraFrame(','function showMessage(');
 assert.match(geometry,/Math.max\(width\/vw,height\/vh\)/);
 assert.doesNotMatch(geometry,/selfie\?Math.min/);
 const calls=[];
 const ctx={fillRect(...args){calls.push(['fill',...args])},save(){},restore(){},
  translate(){},scale(){},drawImage(...args){calls.push(['draw',...args.slice(1)])}};
 const draw=vm.runInNewContext(geometry+'\ndrawCameraFrame',{});
 draw(ctx,{videoWidth:1920,videoHeight:1080},1080,1080,true);
 const painted=calls.find(x=>x[0]==='draw');
 assert.ok(painted[3]>=1080&&painted[4]>=1080,'selfie square filled without letterbox');
});

test('Camera handles denied microphone without blocking camera video',()=>{
 const section=between(camera,'async function startCamera(){','function resetSelection(){');
 assert.match(section,/catch\(initialError\)/);
 assert.match(section,/audio:false/);
 assert.match(section,/stream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
 assert.match(section,/request!==current\.cameraRequest/);
 assert.match(camera,/state.cameraRequest=\(state.cameraRequest\|\|0\)\+1/);
});

test('Recording improves quality and checks readiness before encoding',()=>{
 assert.match(camera,/canvas\.captureStream\(30\)/);
 assert.match(camera,/videoBitsPerSecond:current.mode==='post'\?3400000:3000000/);
 assert.match(camera,/audioBitsPerSecond:128000/);
 assert.match(camera,/if\(!live\?\.videoWidth\|\|live\.readyState<2\)/);
 assert.match(camera,/if\(video\?\.readyState>=2&&video\.videoWidth\)/);
});

test('Recording disables camera switching until stopped',()=>{
 assert.match(camera,/action==='flip'[^\n]*recorder\?\.state==='recording'/);
 assert.match(camera,/action==='mode'[^\n]*recorder\?\.state==='recording'/);
 assert.match(camera,/recordStream\?\.getVideoTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
});

test('Camera flow skips second gallery and hidden Reels editor',()=>{
 assert.match(app,/if\(post\.dataset\.cameraFirst==='1'\)return/);
 const chooser=between(app,'function compose(post,mode=','function uploadStatus(');
 assert.match(chooser,/if\(reel&&autoPick\)/);
 assert.match(app,/if\(post\.dataset\.mode==='reels'&&input\.name==='video'&&window\.PatiyizReelsEditor\)/);
 assert.match(html,/patiyiz-camera-flow\.js[^\"]*cameraq=1/);
});
test('Backgrounding releases camera and resumes it on return',()=>{
 assert.match(camera,/document\.addEventListener\('visibilitychange'/);
 assert.match(camera,/if\(document\.hidden\)\{/);
 assert.match(camera,/const current=state;stopRecorder\(\)/);
 assert.match(camera,/setTimeout\(\(\)=>\{if\(state===current\)stopCamera\(\)\},900\)/);
 assert.match(camera,/if\(!state\.selected\.length\)void startCamera\(\)/);
 assert.match(camera,/typeof MediaRecorder\.isTypeSupported!=='function'/);
});
