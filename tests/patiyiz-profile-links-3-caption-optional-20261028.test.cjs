const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const media=fs.readFileSync('patiyiz-system-media.js','utf8');
const camera=fs.readFileSync('patiyiz-camera-flow.js','utf8');
const migration=fs.readFileSync('supabase/patiyiz-profile-link-permissions-three-media-captions-20261028.sql','utf8');
const html=fs.readFileSync('index.html','utf8');

test('Profile editor respects maximum 3 links and uses existing owner-only RLS update',()=>{
 new vm.Script(app);
 new vm.Script(media);
 new vm.Script(camera);
 assert.match(app,/const PATI_PROFILE_LINK_LIMIT=3;/);
 assert.match(app,/profile_links:patiCollectProfileLinks\(form\)/);
 assert.match(migration,/GRANT UPDATE \(display_name, handle, city, bio, avatar_url, profile_links\)/);
 assert.doesNotMatch(migration,/GRANT UPDATE \([^)]*is_verified/);
 assert.match(migration,/jsonb_array_length\(profile_links\)<=3/);
 assert.match(html,/links3_captionoptional=20261028/);
});
test('Media composer captions are optional and do not exceed database lengths',()=>{
 assert.match(media,/Açıklama \(isteğe bağlı\)/);
 assert.match(media,/mode==='story'\?'300':'1500'/);
 assert.doesNotMatch(media,/<textarea id="pati-system-caption"[^>]+required/);
 assert.match(camera,/mode==='story'\?'300':'1500'/);
 assert.match(app,/if\(captionField&&!textOnly\)captionField.required=false/);
 assert.match(app,/story\?'Hikâye açıklaması \(isteğe bağlı\)':'Açıklama \(isteğe bağlı\)'/);
 assert.match(migration,/char_length\(btrim\(body\)\) <= 1500/);
 assert.match(migration,/coalesce\(array_length\(images,1\),0\)>0/);
 assert.match(migration,/nullif\(btrim\(coalesce\(video_url,''\)\),''\)/);
});
test('Photos and Reels publish with an empty body while text-only post needs actual text',async()=>{
 const a=app.indexOf('async function createPostPublication('),b=app.indexOf('async function patiFallbackStoryPoster(',a);
 assert.ok(a>=0&&b>a);
 const publishMediaRecord=async(_table,_form,build)=>await build(async(file,kind)=>file?.size?'https://example.com/'+kind+'.jpg':null);
 const publish=vm.runInNewContext(app.slice(a,b)+'\ncreatePostPublication',{
  publishMediaRecord,uploadStatus:()=>{},cropPostPhoto:async(file)=>file,
  patiGenerateVideoCover:async()=>null,window:{},Date
 });
 const photo={size:123,type:'image/jpeg'};
 const video={size:234,type:'video/mp4'};
 const formFor=(mode,photos=[],videos=[])=>({
  dataset:{mode,cameraFirst:'1',selfieMirror:'false'},
  querySelector(selector){
   if(selector==='input[name="photo"]')return {files:photos};
   if(selector==='input[name="cover_photo"]')return {files:[]};
   return {files:videos};
  }
 });
 const formData=(videos=[])=>({get(field){return field==='video'?videos[0]||null:null}});
 const blank=()=>'',get=(name)=>name==='aspect'?'1:1':'';
 const post=await publish(formFor('post',[photo,photo]),formData(),get);
 assert.equal(post.body,'');
 assert.equal(post.images.length,2);
 const reel=await publish(formFor('reels',[],[video]),formData([video]),blank);
 assert.equal(reel.body,'');
 assert.ok(reel.video_url);
 await assert.rejects(()=>publish(formFor('text'),formData(),blank),/Yazı paylaşmak/);
});
test('Story captions remain optional for public and close-friends stories',()=>{
 assert.match(app,/caption:shared\?str\('body'\)\.slice\(0,300\):str\('caption'\)/);
 assert.match(app,/caption:str\('body'\)\.slice\(0,300\)/);
 assert.match(app,/if\(!photo\?\.size&&!video\?\.size\)throw Error\('Hikâye için fotoğraf veya video seç\.'/);
 assert.match(migration,/audience='close_friends' AND image_url='' AND private_image_path IS NOT NULL/);
});
