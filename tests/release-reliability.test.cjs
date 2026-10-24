const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const uploader=fs.readFileSync('patiyiz-upload.js','utf8');
function createUploader({browser={},online=true}={}){
 const ctx={window:browser,navigator:{onLine:online},URL,Error,Promise};
 vm.runInNewContext(uploader,ctx);
 return browser.PatiyizReliableUpload;
}
test('Manifest works on a custom domain or a GitHub Pages subpath',()=>{
 assert.equal(manifest.start_url,'./');
 assert.equal(manifest.scope,'./');
 assert.equal(manifest.id,'./');
 assert.match(html,/href="patiyiz-favicon-48\.png/);
 assert.doesNotMatch(html,/href="\/patiyiz-favicon-48\.png/);
});
test('Pinned TUS browser library and uploader are loaded before app',()=>{
 assert.match(html,/tus-js-client@4\.3\.1\/dist\/tus\.min\.js/);
 const library=html.indexOf('tus-js-client@4.3.1');
 const uploaderIndex=html.indexOf('patiyiz-upload.js');
 const appIndex=html.indexOf('app.js?v=20261024-release-reliability-1');
 assert.ok(library>=0&&uploaderIndex>library&&appIndex>uploaderIndex);
});
test('Small files retain authenticated SDK upload and announce completion',async()=>{
 let called=0,progress=[];
 const up=createUploader();
 const sb={storage:{from:bucket=>({upload:async (key,file,opts)=>{called++;assert.equal(bucket,'patiyiz-media');assert.equal(key,'u/a.png');assert.equal(opts.contentType,'image/png');return {error:null}}})}};
 const response=await up.upload({sb,bucket:'patiyiz-media',key:'u/a.png',file:{size:4000,type:'image/png'},onProgress:n=>progress.push(n)});
 assert.equal(called,1);assert.deepEqual(progress,[100]);assert.equal(response.error,null);
});
test('Large files use token-authenticated chunked upload with real percentage',async()=>{
 let opts,progress=[];
 const browser={tus:{Upload:class{constructor(file,settings){opts=settings}start(){opts.onProgress(3,6);opts.onSuccess()}}}};
 const up=createUploader({browser});
 const sb={auth:{getSession:async()=>({data:{session:{access_token:'example-access-token'}},error:null})}};
 const response=await up.upload({sb,projectUrl:'https://test-project.supabase.co',bucket:'patiyiz-videos',key:'user/unique.mp4',file:{size:7*1024*1024,type:'video/mp4'},onProgress:n=>progress.push(n)});
 assert.equal(response.error,null);
 assert.equal(opts.endpoint,'https://test-project.storage.supabase.co/storage/v1/upload/resumable');
 assert.equal(opts.headers.authorization,'Bearer example-access-token');
 assert.equal(opts.metadata.bucketName,'patiyiz-videos');
 assert.equal(opts.metadata.objectName,'user/unique.mp4');
 assert.equal(opts.chunkSize,6*1024*1024);
 assert.deepEqual(progress,[50,100]);
});
test('Large upload stops when session is absent; retry cannot silently bypass auth',async()=>{
 const up=createUploader({browser:{tus:{Upload:class{}}}});
 const sb={auth:{getSession:async()=>({data:{session:null},error:null})}};
 await assert.rejects(up.upload({sb,projectUrl:'https://test-project.supabase.co',bucket:'patiyiz-videos',key:'x.mp4',file:{size:7*1024*1024}}),/Oturum sona erdi/);
});
test('Live notifications reconnect after channel timeout and refresh on return',()=>{
 assert.match(app,/CHANNEL_ERROR/);
 assert.match(app,/TIMED_OUT/);
 assert.match(app,/function refreshOnReturn\(\)/);
 assert.match(app,/addEventListener\('visibilitychange'/);
 assert.match(app,/addEventListener\('focus',refreshOnReturn\)/);
 assert.match(app,/PatiyizReliableUpload\.upload/);
});
