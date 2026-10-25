const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('health-file.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('health-stage13.css','utf8');
const migration=fs.readFileSync('supabase/patiyiz-health-file-update-stage13-20261025.sql','utf8');
const docs=[
 {id:'1',owner_id:'self',pet_id:'cat',title:'Karma aşı',doc_type:'vaccine',notes:'Aşı yapıldı',document_date:'2026-10-10',object_path:null},
 {id:'2',owner_id:'self',pet_id:'cat',title:'Kan tahlili',doc_type:'test',notes:'Veteriner sonucu normal',document_date:'2026-09-05',object_path:'self/cat/file.pdf',mime_type:'application/pdf'},
 {id:'3',owner_id:'self',pet_id:'dog',title:'Muayene',doc_type:'vet',notes:'Kontrol',document_date:'2026-08-05',object_path:null},
 {id:'4',owner_id:'other',pet_id:'cat',title:'Gizli kayıt',doc_type:'other',notes:'Private',document_date:'2026-08-05',object_path:null}
];
function fixture({failRead=false}={}){
 const actions=[],notices=[];
 const sb={
  from(table){
   assert.equal(table,'patiyiz_health_documents');
   const chain={
    select(){return this},eq(){return this},order(){return this},limit(){return Promise.resolve({data:failRead?null:docs,error:failRead?{message:'offline'}:null})},
    insert(payload){actions.push({method:'insert',payload});return Promise.resolve({data:[{id:'new'}],error:null})},
    update(payload){actions.push({method:'update',payload});return {eq(){return this},select(){return Promise.resolve({data:[{id:'1'}],error:null})}}},
    delete(){return {eq(){return this},select(){return Promise.resolve({data:[{id:'1'}],error:null})}}}
   };
   return chain;
  },
  storage:{from(bucket){assert.equal(bucket,'patiyiz-health-private');return{
   createSignedUrl(){return Promise.resolve({data:{signedUrl:'https://private.example/?token=test'},error:null})},
   upload(){return Promise.resolve({data:{},error:null})},
   remove(){return Promise.resolve({data:{},error:null})}
  }}}
 };
 const ctx={window:{open:()=>{},print:()=>{}},console,Date,crypto:{randomUUID:()=> 'generated'},confirm:()=>true,
  document:{getElementById:()=>null},};
 vm.runInNewContext(src,ctx,{filename:'health-file.js'});
 let viewer={id:'self'};
 const portal=ctx.window.PatiyizHealthFile.create({
  sb,getUser:()=>viewer,
  getPets:()=>[{id:'cat',owner_id:'self',name:'Şeker',species:'Kedi'}, {id:'dog',owner_id:'self',name:'Mavi',species:'Köpek'},{id:'secret',owner_id:'other',name:'Saklı'}],
  getWeights:()=>[],getReminders:()=>[],
  esc:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
  notify:(...args)=>notices.push(args),onChange:()=>{}
 });
 return {portal,actions,notices,setViewer:v=>viewer=v};
}
test('Health-file module is actually loaded into the application before app.js',()=>{
 assert.match(html,/health-file\.js\?v=20261025-health-v2/);
 assert.ok(html.indexOf('health-file.js')<html.indexOf('app.js'));
 assert.match(app,/window\.PatiyizHealthFile\.create/);
 assert.match(html,/health-stage13\.css\?v=20261025-health-v2/);
});
test('Private records only render for their owner and currently selected animal',async()=>{
 const {portal}=fixture();
 await portal.load();
 const html1=portal.render();
 assert.match(html1,/Karma aşı/);
 assert.match(html1,/Kan tahlili/);
 assert.doesNotMatch(html1,/Gizli kayıt/);
 assert.doesNotMatch(html1,/Muayene/);
 portal.selectPet('dog');
 const html2=portal.render();
 assert.match(html2,/Muayene/);
 assert.doesNotMatch(html2,/Kan tahlili/);
});
test('Turkish-insensitive search and category filter work together',async()=>{
 const {portal}=fixture();await portal.load();portal.render();
 portal.setSearch('asi');assert.deepEqual(Array.from(portal.shownDocs(),d=>d.id),['1']);
 portal.setSearch('veteriner');portal.selectType('test');assert.deepEqual(Array.from(portal.shownDocs(),d=>d.id),['2']);
 portal.selectType('vaccine');assert.equal(portal.shownDocs().length,0);
 portal.setSearch('');assert.deepEqual(Array.from(portal.shownDocs(),d=>d.id),['1']);
});
test('Record editor can only modify selected owned document',async()=>{
 const {portal}=fixture();await portal.load();portal.render();
 portal.edit('2');assert.equal(portal.state.editingId,'2');
 assert.match(portal.render(),/Kan tahlili/);
 assert.match(portal.render(),/Değişiklikleri kaydet/);
 portal.edit('4');assert.equal(portal.state.editingId,'2');
 portal.selectPet('dog');assert.equal(portal.state.editingId,'');
});
test('Updates without a new file preserve private document metadata',async()=>{
 const {portal,actions}=fixture();await portal.load();portal.render();portal.edit('2');
 const fields={'health-title':'Kan tahlili yenilendi','health-type':'test','health-date':'2026-09-05','health-notes':'Sağlık notu'};
 const form={querySelector:sel=>sel==='[name="health-file"]'?{files:[]}:{value:fields[sel.match(/\[name="([^"]+)"\]/)?.[1]]||''},reset:()=>{}};
 await portal.save(form);
 assert.equal(actions[0].method,'update');
 assert.equal(actions[0].payload.title,'Kan tahlili yenilendi');
 assert.ok(!Object.hasOwn(actions[0].payload,'object_path'));
 assert.ok(!Object.hasOwn(actions[0].payload,'owner_id'));
});
test('New health records accept notes without attached files',async()=>{
 const {portal,actions}=fixture();await portal.load();portal.render();
 const fields={'health-title':'Veteriner ziyareti','health-type':'vet','health-date':'2026-10-20','health-notes':'Muayene sonucu'};
 const form={querySelector:sel=>sel==='[name="health-file"]'?{files:[]}:{value:fields[sel.match(/\[name="([^"]+)"\]/)?.[1]]||''},reset:()=>{}};
 await portal.save(form);
 assert.equal(actions[0].method,'insert');
 assert.equal(actions[0].payload.owner_id,'self');
 assert.equal(actions[0].payload.pet_id,'cat');
 assert.equal(actions[0].payload.object_path,null);
});
test('Invalid dates and oversized files do not reach the database',async()=>{
 const {portal,actions,notices}=fixture();await portal.load();portal.render();
 const make=(date,file)=>({querySelector:sel=>{
  if(sel==='[name="health-file"]')return {files:file?[file]:[]};
  const name=sel.match(/\[name="([^"]+)"\]/)?.[1];
  return {value:{'health-title':'Aşı kaydı','health-type':'vaccine','health-date':date,'health-notes':'İyi'}[name]||''}
 }});
 await portal.save(make('2026-02-30'));
 await portal.save(make('2099-10-10'));
 await portal.save(make('2026-10-20',{type:'application/pdf',size:11*1024*1024}));
 assert.equal(actions.length,0);
 assert.equal(notices.length,3);
});
test('Secure file links use short signed URLs without public URLs',()=>{
 assert.match(src,/\.createSignedUrl\(record\.object_path,90\)/);
 assert.doesNotMatch(src,/\.getPublicUrl\(/);
 assert.match(src,/window\.open\(result\.data\.signedUrl,'_blank','noopener,noreferrer'\)/);
});
test('Delete verifies affected database row before removing the storage object',()=>{
 const idx=src.indexOf('async function remove(id){');
 const code=src.slice(idx,src.indexOf('function report(){',idx));
 assert.match(code,/\.eq\('pet_id',state\.petId\)\.select\('id'\)/);
 assert.match(code,/if\(!result\.data\?\.length\)throw Error/);
 assert.ok(code.indexOf('if(!result.data?.length)')<code.indexOf("sb.storage.from(bucket).remove"));
});
test('Document replacement uploads before update and only deletes old file after success',()=>{
 assert.match(src,/const saved=editing\?/);
 assert.match(src,/if\(editing&&uploadedPath&&editing\.object_path/);
 assert.match(src,/if\(uploadedPath\)\{try\{const cleanup=await sb\.storage\.from\(bucket\)\.remove/);
});
test('Health document update policy checks authenticated owner and owned pet, storage remains private',()=>{
 assert.match(migration,/for update to authenticated/);
 assert.match(migration,/owner_id = \(select auth\.uid\(\)\)/);
 assert.match(migration,/p\.owner_id = \(select auth\.uid\(\)\)/);
 assert.match(migration,/object_path like \(owner_id::text \|\| '\/' \|\| pet_id::text \|\| '\/%'\)/);
 assert.doesNotMatch(migration,/to anon/);
});
test('Health screen is mobile responsive, theme-aware, and does not print private attachments',()=>{
 assert.match(css,/#main-content \.health-stage13/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/data-pati-theme="dark"/);
 assert.match(css,/:focus-visible/);
 assert.match(src,/Ek dosyalar ve PDF tahliller gizlilik nedeniyle rapora eklenmez/);
 assert.match(app,/data-health-edit/);
 assert.match(app,/data-health-filter/);
 assert.match(app,/e\.target\?\.id==='hf-search'/);
});
