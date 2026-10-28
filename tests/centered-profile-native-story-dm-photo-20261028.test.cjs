const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const system=fs.readFileSync('patiyiz-system-media.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-centered-logo-profile-story-dm-images-20261028.css','utf8');
const segment=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'Missing '+a);return app.slice(i,j)};

test('Updated JavaScript parses and CSS is loaded last after previous desktop/mobile styling',()=>{
 new vm.Script(app,{filename:'app.js'});
 new vm.Script(system,{filename:'patiyiz-system-media.js'});
 assert.match(html,/patiyiz-centered-logo-profile-story-dm-images-20261028\.css\?v=1/);
 assert.match(html,/center_profile_dm_native=20261028/);
 assert.match(html,/story_native_20261028=1/);
 assert.match(css,/\.mobile-header>\.brand/);
 assert.match(css,/left:50%!important/);
 assert.match(css,/transform:translate\(-50%,-50%\)!important/);
});
test('Only own profile avatar has a plus button that opens existing story create action',()=>{
 const src=segment('function profilePage(){','function formField(');
 assert.match(src,/pati-profile-story-plus/);
 assert.match(src,/own\?'<button type="button" class="pati-profile-story-plus"/);
 assert.match(src,/data-action="story-create"/);
 assert.match(app,/case 'story-create':startPatiCameraStory\(\)/);
 assert.match(css,/\.pati-ig-profile \.pati-ig-summary \.pati-ig-avatar/);
 assert.match(css,/\.pati-ig-avatar>\.avatar\.l/);
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/overflow:visible!important/);
});
test('Story photo capture uses the phone operating system picker and native camera plugin',()=>{
 const camera=segment('function mountPatiyizCamera(mode){','function startPatiCameraPost(){');
 assert.match(camera,/const mediaFlow=window\.PatiyizSystemMediaFlow/);
 assert.match(camera,/mediaFlow\.open\(\{/);
 assert.doesNotMatch(camera,/window\.PatiyizCameraFlow|onStoryPhotoCamera/);
 assert.match(system,/capture="environment"/);
 assert.match(system,/name==='camera-photo'&&window\.PatiyizNative\?\.isNative/);
 assert.match(system,/pickPhotoForInput\(input,'camera',false\)/);
 assert.doesNotMatch(system,/action==='camera-photo'&&state\.mode==='story'/);
});
test('DM image bubble displays natural photo aspect and image can be enlarged',()=>{
 const page=segment('function messagesPage(){','function pushKeyBytes(');
 assert.match(page,/pati-dm-image-message/);
 assert.match(page,/pati-dm-image-open/);
 assert.match(page,/data-action="dm-image-open"/);
 assert.match(page,/data-private-path/);
 assert.match(app,/case 'dm-image-open':patiDmOpenPhoto\(id\);break/);
 assert.match(css,/object-fit:contain!important/);
 assert.match(css,/width:auto!important;height:auto!important/);
 assert.match(css,/max-height:min\(65dvh,520px\)!important/);
});
test('DM photo viewer requires current conversation and opens only already signed private image',()=>{
 const src=segment('function patiDmOpenPhoto(messageId){','function messagesPage(){');
 assert.match(src,/message\?\.attachment_type!=='image'/);
 assert.match(src,/message\.sender_id===owner&&message\.receiver_id===peer/);
 assert.match(src,/photo\.dataset\.privatePath!==message\.attachment_path/);
 assert.match(src,/modal\('Sohbet fotoğrafı'/);
 assert.match(src,/esc\(url\)/);
 assert.doesNotMatch(src,/createSignedUrl\(/);
 assert.match(src,/pati-dm-photo-modal/);
 assert.match(css,/#modal-root \.pati-dm-photo-modal \.pati-dm-photo-view img/);
});
