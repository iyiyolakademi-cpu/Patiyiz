const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const app=fs.readFileSync('app.js','utf8');
const camera=fs.readFileSync('patiyiz-camera-flow.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const java=fs.readFileSync('native-capacitor/android-source/PatiyizGalleryPlugin.java','utf8');
const setup=fs.readFileSync('native-capacitor/scripts/setup-camera-gallery.mjs','utf8');
const build=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const shell=fs.readFileSync('native-capacitor/src/native-shell.js','utf8');
const workflow=fs.readFileSync('.github/workflows/capacitor-android.yml','utf8');
const sql=fs.readFileSync('supabase/patiyiz-post-unique-viewers-20261024.sql','utf8');
const between=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return s.slice(i,j)};
test('Plus opens a single camera screen and not legacy media chooser modal',()=>{
 const actions=between(app,"case 'pati-media-gallery':","case 'story-close':");
 assert.match(actions,/case 'pati-create-post':closePatiCreate\(\);startPatiCameraPost\(\)/);
 assert.match(app,/else if\(view==='home'\|\|view==='profile'\)startPatiCameraPost\(\)/);
 assert.match(app,/function startPatiCameraPost\(\)/);
 assert.match(app,/compose\(null,'post',false\)/);
 assert.match(app,/window\.PatiyizSystemMediaFlow\.open/);
 assert.match(app,/async onPublish\(caption\)/);
 assert.match(app,/await createPostPublication\(form,f,str\)/);
 assert.match(app,/new DataTransfer\(\)/);
 assert.match(index,/patiyiz-camera-flow\.js/);
});
test('Camera has embedded full gallery, square last-photo thumbnail and no second picker UI',()=>{
 for(const token of ["id='patiyiz-camera-screen'","pati-camera-gallery-grid","pati-camera-gallery-panel",
 "pati-camera-gallery-thumb","pati-camera-shutter","pati-camera-caption","data-camera='publish'"]){
  assert.ok(camera.includes(token.replaceAll("'",'"'))||camera.includes(token),token);
 }
 assert.match(camera,/navigator\.mediaDevices\.getUserMedia/);
 assert.match(camera,/URL\.createObjectURL/);
 assert.match(camera,/window\.PatiyizNativeGallery\.getPhotos/);
 assert.match(camera,/window\.PatiyizNativeGallery\.readPhoto/);
 assert.match(camera,/current\.offset\+=/);
 assert.match(camera,/limit:36/);
 assert.match(camera,/getPhotos\(\{offset:0,limit:1,previewOnly:true\}\)/);
 assert.match(camera,/window\.PatiyizCameraFlow=\{open,close:cleanup,cancel/);
 assert.match(css,/pati-camera-gallery-grid\{display:grid;grid-template-columns:repeat\(3/);
 assert.match(css,/pati-camera-recent\{width:55px;height:55px/);
});
test('Android bridge requests limited/photo permissions and only reads permitted photos',()=>{
 assert.match(java,/class PatiyizGalleryPlugin extends Plugin/);
 assert.match(java,/android\.permission\.READ_MEDIA_VISUAL_USER_SELECTED|Manifest\.permission\.READ_MEDIA_VISUAL_USER_SELECTED/);
 assert.match(java,/galleryAllowed\(\)/);
 assert.match(java,/getPermissionState\("galleryImages"\)/);
 assert.match(java,/call\.getBoolean\("previewOnly",false\)/);
 assert.match(java,/MediaStore\.Images\.Media\.EXTERNAL_CONTENT_URI/);
 assert.match(java,/resolver\.loadThumbnail/);
 assert.match(java,/requestPermissionForAlias/);
 assert.match(java,/requestPermissionForAliases/);
 assert.match(java,/call\.getString\("id",""\)/);
 assert.match(java,/!key\.matches/);
 assert.match(java,/result\.put\("base64"/);
 assert.match(java,/offset==0\|\|cursor\.moveToPosition\(offset-1\)/);
 assert.match(setup,/registerPlugin\(PatiyizGalleryPlugin\.class\)/);
 assert.match(setup,/READ_MEDIA_VISUAL_USER_SELECTED/);
 assert.match(shell,/registerPlugin\('PatiyizGallery'\)/);
 assert.match(build,/'patiyiz-camera-flow\.js'/);
 assert.match(build,/PatiyizCameraFlow\?\.active/);
 assert.match(workflow,/setup-camera-gallery\.mjs/);
});
test('Light/dark theme is a visible settings choice, persists and is loaded before paint',()=>{
 assert.match(app,/case 'theme-set':patiApplyTheme\(id\)/);
 assert.match(app,/localStorage\.setItem\('patiyiz_theme',value\)/);
 assert.match(app,/data-action="theme-set" data-id="dark"/);
 assert.match(app,/data-action="theme-set" data-id="light"/);
 assert.match(index,/dataset\.patiTheme=localStorage\.getItem/);
 assert.match(css,/html\[data-pati-theme="dark"\]/);
 assert.match(css,/pati-theme-options button\.active/);
});
test('Profile post/Reels viewers count is owner-visible and server-verifiable',()=>{
 assert.match(app,/patiPostViewCounts=new Map\(\)/);
 assert.match(app,/patiLoadProfileViewCounts/);
 assert.match(app,/patiRecordPostView/);
 assert.match(app,/intersectionRatio>=\.55/);
 assert.match(app,/1100\)/);
 assert.match(app,/data-pati-view-count/);
 assert.match(app,/patiyiz_post_view_totals/);
 assert.match(app,/sb\.rpc\('patiyiz_record_post_view'/);
 assert.match(sql,/primary key\(post_id,viewer_id\)/);
 assert.match(sql,/post\.author_id<>viewer|p\.author_id<>viewer/);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/on conflict\(post_id,viewer_id\) do nothing/);
 assert.match(sql,/revoke all on public\.patiyiz_post_view_events from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.patiyiz_record_post_view\(uuid\) to authenticated/);
});
test('New JavaScript modules have valid Node syntax',()=>{
 for(const file of ['app.js','patiyiz-camera-flow.js','native-capacitor/scripts/setup-camera-gallery.mjs']){
  const c=spawnSync(process.execPath,['--check',file],{encoding:'utf8',timeout:10000});
  assert.equal(c.status,0,file+' '+c.stderr);
 }
});
