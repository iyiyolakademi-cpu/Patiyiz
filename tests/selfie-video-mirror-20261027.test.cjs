const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const picker=fs.readFileSync('patiyiz-system-media.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
test('Phone-recorded videos start in mirrored selfie mode and rear recordings can opt out',()=>{
 assert.match(picker,/current\.mirrorSelfie=!!videos\.length&&source==='camera-video'/);
 assert.match(picker,/await acceptFiles\(selected,n\)/);
 assert.match(picker,/const next=btn\.dataset\.mode/);
 assert.match(picker,/id="pati-system-mirror-option"/);
 assert.match(picker,/id="pati-system-mirror" type="checkbox"/);
 assert.match(picker,/Arka kamerada kapat/);
 assert.match(picker,/state\.mirrorSelfie=!!e\.target\.checked/);
 assert.match(picker,/onMirrorChange\?\.\(state\.mirrorSelfie\)/);
});
test('Mirror updates selected preview before publishing and does not touch audio/video bytes',()=>{
 assert.match(picker,/el\.classList\.toggle\('pati-selfie-mirrored',current\.mirrorSelfie\)/);
 assert.match(picker,/pati-system-preview-media video'\)\?\.classList\.toggle/);
 assert.doesNotMatch(picker,/canvas\.captureStream|MediaRecorder|getUserMedia/);
 assert.match(css,/#patiyiz-system-media \.pati-system-preview-media video\.pati-selfie-mirrored/);
 assert.match(css,/transform:scaleX\(-1\)!important/);
});
test('Mirror preference is saved for new posts/reels and stories, not for old content',()=>{
 assert.match(app,/form\.dataset\.selfieMirror='false'/);
 assert.match(app,/onMirrorChange\(enabled\)\{form\.dataset\.selfieMirror=enabled\?'true':'false'\}/);
 assert.match(app,/selfie_mirrored:hasVideo&&form\.dataset\.selfieMirror==='true'/);
 assert.match(app,/selfie_mirrored:!!video_url&&form\.dataset\.selfieMirror==='true'/);
});
test('All Patiyiz video views mirror the selected clip consistently',()=>{
 assert.match(app,/pati-post-video'\+\(p\.selfie_mirrored\?' pati-selfie-mirrored'/);
 assert.match(app,/story-big-video'\+\(x\.selfie_mirrored\?' pati-selfie-mirrored'/);
 assert.match(app,/pati-reel-video'\+\(p\.selfie_mirrored\?' pati-selfie-mirrored'/);
 assert.match(css,/#main-content \.pati-reel-video\.pati-selfie-mirrored/);
 assert.match(css,/#story-overlay \.story-big-video\.pati-selfie-mirrored/);
 assert.match(css,/#main-content \.pati-profile-tile \.pati-selfie-mirrored/);
 assert.match(css,/#main-content \.pati-explore-media \.pati-selfie-mirrored/);
});
test('Camera/gallery chooser and publication transaction are unchanged',()=>{
 assert.match(picker,/data-system="camera-photo"/);
 assert.match(picker,/data-system="camera-video"/);
 assert.match(picker,/data-system="gallery"/);
 assert.match(app,/await createStoryPublication\(form,f,str\)/);
 assert.match(app,/await createPostPublication\(form,f,str\)/);
 assert.match(html,/patiyiz-system-media\.js\?v=[^"]*selfiemirror=1/);
 assert.match(html,/app\.js\?v=[^"]*selfiemirror=1/);
});
