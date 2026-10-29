const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),mainCss=fs.readFileSync('patiyiz-inspired.css','utf8'),newCss=fs.readFileSync('instagram-share-clean.css','utf8'),picker=fs.readFileSync('gallery-picker.js','utf8');
const between=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};
test('Homepage starts with stories and posts, not the Profile Complete card',()=>{
 const src=between('function homePage(){','let savedPostsLoading=');
 assert.match(src,/storiesStrip\(\)\+'<div class="pati-feed-posts">/);
 assert.doesNotMatch(src,/patiyizProgressCard\(\)/);
 const ctx={data:{posts:[]},blocked:new Set(),selectedPostId:null,main:{innerHTML:''},storiesStrip:()=>'<div id="my-stories">Stories</div>',patiyizLoadedTables:new Set(['posts']),pageMore:{posts:false},empty:()=>'<div>Gönderi yok</div>',patiHomeFeedIds:null,patiHomeLoadError:'',patiSyncHomePostCounts:()=>{},me:{id:'me'}};
 vm.runInNewContext(src+'\nhomePage()',ctx);
 assert.match(ctx.main.innerHTML,/my-stories/);
 assert.match(ctx.main.innerHTML,/pati-feed-posts/);
 assert.doesNotMatch(ctx.main.innerHTML,/Profilini tamamla|pati-progress-card/i);
});
test('Completion tasks remain available in own profile, but not in home feed',()=>{
 assert.match(app,/main\.innerHTML=\(own\?patiyizProgressCard\(\):''\)/);
 assert.match(app,/function patiyizProgressCard\(\)/);
});
test('Native gallery opens directly without an initial blank fake library sheet',()=>{
 const src=between('function openComposerMediaPicker(kind){','function openStoryComposer(');
 let nativeClicks=0,overlays=0,mode='post';
 const file={multiple:true,attributes:new Set(),setAttribute(name){this.attributes.add(name)},removeAttribute(name){this.attributes.delete(name)},click(){nativeClicks++}};
 const form={dataset:{mode:'post'},querySelector:()=>file};
 const ctx={document:{getElementById:()=>form},window:{PatiyizGalleryPicker:{open(){overlays++}}}};
 const open=vm.runInNewContext(src+'\nopenComposerMediaPicker',ctx);
 open('gallery');
 assert.equal(nativeClicks,1);
 assert.equal(overlays,0);
 assert.equal(file.multiple,true);
 assert.equal(file.attributes.has('capture'),false);
 open('camera');
 assert.equal(nativeClicks,2);
 assert.equal(file.attributes.has('capture'),true);
 assert.equal(file.multiple,false);
 form.dataset.mode='reels';open('gallery');
 assert.equal(nativeClicks,3);
 assert.equal(file.multiple,true,'multi clip Reels selection preserved');
});
test('File selection uses chosen-gallery grid, not another full-screen studio',()=>{
 const src=between("if(post&&(input.name==='photo'||input.name==='video')){","if(input?.form?.id==='story-form'");
 assert.match(src,/PatiyizGalleryPicker\.open\(chosen,\{/);
 assert.match(src,/onConfirm:files=>/);
 assert.match(src,/updatePostMediaPreview\(\)/);
 assert.match(src,/onReopen:.*openComposerMediaPicker\('gallery'\)/);
 assert.doesNotMatch(src,/openPostPhotoStudio|openStoryPhotoStudio|PatiyizPhotoStudio/);
});
test('Story media now uses the same native chooser, preview and crop as posts',()=>{
 const composer=between("function openStoryComposer(","async function renderEditedStoryFile(");
 assert.match(composer,/compose\(null,'story',autoPick\)/);
 const shared=between("function compose(post,mode='post',autoPick=true){","function uploadStatus(");
 assert.match(shared,/postMediaField\(mode\)/);
 assert.match(shared,/story\?'story'/);
 assert.match(shared,/pati-crop-preview/);
 assert.match(app,/cropPostPhoto\(photo,str\('aspect'\)\|\|'9:16'\)/);
 assert.doesNotMatch(shared,/PatiyizPhotoStudio/);
});
test('No obsolete photo studio module, script or full-screen CSS remain',()=>{
 assert.equal(fs.existsSync('photo-studio.js'),false);
 assert.doesNotMatch(html,/src="photo-studio\.js/);
 assert.doesNotMatch(app,/PatiyizPhotoStudio|openPostPhotoStudio|openStoryPhotoStudio|Fotoğraf Stüdyosu/);
 assert.doesNotMatch(mainCss,/#pati-photo-studio|body\.pati-studio-open/);
 assert.match(html,/instagram-share-clean\.css\?v=20261025-instagram-share-1/);
});
test('Instagram-like ratios and optional crop controls remain in the same composer',()=>{
 const comp=between("function compose(post,mode='post',autoPick=true){","function uploadStatus(");
 assert.match(comp,/post-ratio/);
 assert.match(comp,/post-crop-open/);
 assert.match(comp,/pati-crop-preview" hidden/);
 assert.match(comp,/pati-media-controls" hidden/);
 assert.match(app,/case 'post-crop-open':/);
 assert.match(app,/case 'post-crop-open':void patiCropOpen\(\)/);
 assert.match(app,/function patiCropOpen\(options=\{\}\)/);
 assert.match(newCss,/#post-form \.pati-media-gallery/);
 assert.match(newCss,/aspect-ratio:4\/5/);
});
test('Photos, text posts, stories and video/Reels still use original publishing transaction',()=>{
 assert.match(app,/const photoFiles=\[\.\.\.\(form\.querySelector\('input\[name="photo"\]'\)\?\.files\|\|\[\]\)\]/);
 assert.match(app,/await cropPostPhoto\(photoFiles\[i\],str\('aspect'\)\)/);
 assert.match(app,/publishMediaRecord\('posts',form/);
 assert.match(app,/publishMediaRecord\('patiyiz_stories',form/);
 assert.match(app,/PatiyizReelsEditor\.exportVideo/);
 assert.match(app,/PatiyizReelsEditor\.setFiles/);
 assert.match(app,/if\(form\.dataset\.mode==='text'&&!body\)/);
});
test('Removal is isolated to home/profile studio, not avatar editor or hidden file fields',()=>{
 assert.match(app,/patiyizProgressCard\(\)/);
 assert.match(app,/name="story_gallery"/);
 assert.match(app,/name="photo"/);
 assert.match(app,/name="video"/);
 assert.match(newCss,/@media\(max-width:680px\)/);
 assert.match(newCss,/data-pati-theme="dark"/);
});
