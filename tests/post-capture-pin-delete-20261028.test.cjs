const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const system=fs.readFileSync('patiyiz-system-media.js','utf8');
const html=fs.readFileSync('index.html','utf8');
function part(a,b){const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j)}
test('App and native system media remain valid JavaScript',()=>{new vm.Script(app);new vm.Script(system)});
test('Photo or video can be shared without caption; text-only stays nonempty',()=>{
 const post=part('async function createPostPublication(','async function patiFallbackStoryPoster(');
 assert.match(post,/if\(form.dataset.mode==='text'&&!body\)/);
 assert.match(post,/if\(!body&&!photoFiles.length&&!hasVideo\)/);
 assert.doesNotMatch(post,/if\(!body\)throw/);
 assert.match(system,/Açıklama \(isteğe bağlı\)/);
});
test('Camera photos can append up to 10 to a sliding multi-image post',()=>{
 assert.match(system,/data-system="add-camera-photo"/);
 assert.match(system,/data-system="add-gallery"/);
 assert.match(system,/const selected=append\?\[\.\.\.current.files,\.\.\.incoming\]:incoming/);
 assert.match(system,/selected.length>10/);
 assert.match(system,/await current.onMedia\(selected,/);
 assert.match(system,/state\.appendMode=true/);
 assert.match(system,/showPreview\(\)/);
 assert.match(app,/record\.images\.push\(url\)/);
 assert.match(html,/post_camera_album=20261028/);
});
test('Profile pin icon and server recheck do not duplicate existing pin rows',()=>{
 const pin=part('async function patiTogglePin(','function postCard(');
 assert.match(pin,/patiFindSocialPost\(postId\)/);
 assert.match(pin,/\.eq\('owner_id',owner\)/);
 assert.match(pin,/data\.pins=\[\.\.\.data\.pins\.filter/);
 assert.match(app,/↻ Profilde sabitle/);
 assert.match(app,/aria-label="Sabitlenmiş gönderi">📌/);
});
test('Deleting an owned post goes directly through RLS delete, then removes UI row',()=>{
 const rm=part('async function remove(table,id){','async function save(');
 assert.match(rm,/if\(table==='posts'\)\{/);
 assert.match(rm,/\.delete\(\)\.eq\('id',id\)\.eq\('author_id',owner\)/);
 assert.match(rm,/data\.posts=data\.posts\.filter\(p=>p.id!==id\)/);
 assert.match(rm,/closeModal\(true\);render\(\)/);
 assert.match(rm,/if\(!confirm\('Bu kaydı silmek/);
 assert.ok(rm.indexOf("if(!confirm(")>rm.indexOf("if(table==='posts')"),"Only non-post deletion asks confirmation");
});
