const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const system=fs.readFileSync('patiyiz-system-media.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-compose-stability-20261029.css','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
function section(start,end,source=app){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing section '+start);
 return source.slice(a,b);
}
test('Shared crop tool is available in OS/native picker; cancel does not commit and done does',()=>{
 assert.doesNotThrow(()=>new vm.Script(app));
 assert.doesNotThrow(()=>new vm.Script(system));
 const editor=section('async function patiCropOpen(', 'async function drawPostCrop()');
 assert.match(editor,/const drafts=new Map\(\)/);
 assert.match(editor,/if\(action==='cancel'\)\{popup.close\(\);return\}/);
 assert.match(editor,/patiCropEdits.set\(files\[i\]/);
 assert.match(editor,/options.onDone\?\.\(\)/);
 assert.match(editor,/window.PatiyizCropMedia=\{/);
 assert.match(editor,/return cropPostPhoto\(file,'original'\)/);
 assert.match(system,/data-system="photo-crop"/);
 assert.match(system,/PatiyizCropMedia\.open\(/);
 assert.match(system,/data-system='photo-remove'/);
 assert.match(system,/data-system='photo-move-prev'/);
 assert.match(system,/data-system='photo-move-next'/);
});
test('Preview displays the actual cropped export and discards stale asynchronous media',()=>{
 assert.match(system,/current.previewVersion=\(current.previewVersion\|\|0\)\+1/);
 assert.match(system,/if\(state!==current\|\|current.previewVersion!==version\)return/);
 assert.match(system,/await window.PatiyizCropMedia.preview\(file\)/);
 assert.match(system,/media.querySelector\('img\[data-file-index="/);
 assert.match(system,/if\(main\)main.src=url/);
 assert.match(system,/if\(thumb\)thumb.src=url/);
 assert.match(system,/current.previewError=true/);
 assert.match(system,/state.previewError\|\|!state.files.length/);
});
test('Native gallery previews all four allowed post videos with matching counts, without changing Reels/story limits',()=>{
 assert.match(system,/for\(const \[index,file\] of files.entries\(\)\)/);
 assert.match(system,/el.setAttribute\('aria-label',\(index\+1\)\+'\. videonun önizlemesi'\)/);
 assert.match(system,/videos.length>4/);
 assert.match(system,/current.mode!=='post'&&videos.length>1/);
 assert.match(system,/files.length\+' '\+\(video\?'video':'fotoğraf'\)\+' seçildi'/);
 assert.match(app,/videoFiles.length>4/);
});
test('Mobile composer has no horizontal overflow, and original five profile tabs are preserved',()=>{
 const profile=section('function profilePage(){','function formField(');
 for(const tab of ['media','reels','videos','text','reposts'])
  assert.ok(profile.includes("['"+tab+"',"),'Missing original profile tab: '+tab);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(css,/overflow-x:auto!important/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/\.pati-system-crop-entry\[hidden\]/);
 assert.match(css,/\.pati-system-publish-actions #pati-system-publish/);
 assert.match(html,/patiyiz-compose-stability-20261029\.css\?v=1/);
 assert.match(native,/'patiyiz-compose-stability-20261029\.css'/);
});
function uploadRuntime({failFirst=false,alreadySaved=false,metadataSize=500}={}){
 const calls=[];
 const uploaded={value:alreadySaved};
 const sb={storage:{from(bucket){assert.equal(bucket,'patiyiz-videos');return {
  async upload(key,file){calls.push({key,file});
   if(failFirst&&calls.length===1){uploaded.value=alreadySaved;throw Error('NetworkError: response lost')}
   uploaded.value=true;
   return {error:null};
  },
  async info(key){return uploaded.value?{data:{size:metadataSize},error:null}:{error:{message:'missing'},data:null}},
  getPublicUrl(key){return {data:{publicUrl:'https://cdn.example.invalid/'+key}};}
 }}}};
 const context={
  me:{id:'owner'},sb,cfg:{supabaseUrl:'https://example.supabase.co'},
  navigator:{onLine:true},window:{},console,
  crypto:{randomUUID:()=> 'media-id'},uploadStatus(){},
  setTimeout:fn=>fn(),Promise,Error,Number,String
 };
 const src=section('/* Network retries can arrive after Storage already saved the object.', 'async function upload(file)');
 vm.createContext(context);
 vm.runInContext(src+'\nglobalThis.transfer=uploadVideo;',context);
 return {context,calls};
}
test('Transient video network exceptions retry the same object key rather than fail at first attempt',async()=>{
 const {context,calls}=uploadRuntime({failFirst:true});
 const url=await context.transfer({size:500,name:'clip.mp4',type:'video/mp4'});
 assert.match(url,/owner\/media-id\.mp4/);
 assert.equal(calls.length,2);
 assert.equal(calls[0].key,calls[1].key);
});
test('Ambiguous upload is considered successful ONLY when verified object size equals expected bytes',async()=>{
 const good=uploadRuntime({failFirst:true,alreadySaved:true,metadataSize:500});
 await good.context.transfer({size:500,name:'clip.mp4',type:'video/mp4'});
 assert.equal(good.calls.length,1);
 const wrong=uploadRuntime({failFirst:true,alreadySaved:true,metadataSize:700});
 await wrong.context.transfer({size:500,name:'clip.mp4',type:'video/mp4'});
 assert.equal(wrong.calls.length,2);
});
