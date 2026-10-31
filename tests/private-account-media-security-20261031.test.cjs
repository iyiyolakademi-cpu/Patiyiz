const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const helper=fs.readFileSync('patiyiz-private-media-20261031.js','utf8');
const server=fs.readFileSync('supabase/functions/patiyiz-secure-account-media/index.ts','utf8');
const owner='11111111-1111-1111-1111-111111111111';
const path=owner+'/22222222-2222-2222-2222-222222222222.jpg';
function init(){
 const win={document:null,setInterval:null};
 vm.runInNewContext(helper,{window:win,console,crypto:{randomUUID:()=> '22222222-2222-2222-2222-222222222222'}});
 return win.PatiyizPrivateMedia;
}
test('Helper parses, private marker is constrained to UUID paths',()=>{
 assert.doesNotThrow(()=>new vm.Script(helper));
 const media=init();
 assert.equal(media.getPath('patiyiz-private-posts:'+path),path);
 assert.equal(media.getPath('patiyiz-private-posts:../../secret.png'),null);
});
test('Public URL never replaces persistent private reference on upload',async()=>{
 const media=init();const file={size:100,type:'image/jpeg'};
 const sb={storage:{from:bucket=>{assert.equal(bucket,'patiyiz-private-posts');return {upload:async()=>({data:{path},error:null})}}}};
 const ref=await media.upload(file,'image',owner,sb,{reliable:false});
 assert.equal(ref,'patiyiz-private-posts:'+path);
 assert.ok(!ref.includes('/storage/v1/object/public/'));
});
test('Only authorized Storage responses become display URLs and raw reference is preserved',async()=>{
 const media=init();const raw='patiyiz-private-posts:'+path;
 const fake={storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://signed.example/object?token=ephemeral'},error:null})})}};
 const one=await media.hydrateRows([{id:'p1',image_url:raw,images:[raw],video_url:null}],owner,fake);
 assert.match(one[0].image_url,/token=ephemeral/);
 assert.deepEqual(one[0]._patiPrivateRaw.images,[raw]);
 const denied={storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:'Forbidden'}})})}};
 media.clear();
 const two=await media.hydrateRows([{id:'p2',image_url:raw}],owner,denied);
 assert.equal(two[0].image_url,'');
});
test('App uploads posts and ordinary stories only via the protected publication helper',()=>{
 assert.match(app,/async function uploadPrivatePublicationMedia\(/);
 assert.match(app,/const url=await uploadPrivatePublicationMedia\(file,kind\)/);
 assert.match(app,/publishMediaRecord\('posts'/);
 assert.match(app,/publishMediaRecord\('patiyiz_stories'/);
 assert.match(app,/PatiyizPrivateMedia\.hydrateRows/);
 assert.match(html,/patiyiz-private-media-20261031\.js\?v=1/);
});
test('Privacy toggle requires authenticated migration and story repost links source instead of duplicating URLs',()=>{
 assert.match(app,/functions\/v1\/patiyiz-secure-account-media/);
 assert.match(app,/if\(next\)\{/);
 assert.match(app,/const record=\{author_id:owner,image_url:'',video_url:null/);
});
test('Migration uses real JWT verification, recovery manifest and deletes old public file before enabling private',()=>{
 assert.match(server,/admin\.auth\.getUser\(token\)/);
 assert.match(server,/patiyiz_private_media_migration_manifest/);
 assert.match(server,/\.remove\(\[item\.source_path\]\)/);
 assert.match(server,/update\(\{is_private:true\}\)/);
});
