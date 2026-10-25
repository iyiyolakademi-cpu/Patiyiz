const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const sql=fs.readFileSync('supabase/patiyiz-pets-directory-indexes-20261025.sql','utf8');
const part=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'Missing '+a);return app.slice(i,j)};

test('Patiler topluluk listesi, 36 kayıtlık sayfalar ve sahibinin tüm hayvanlarını ayrı ayrı getirir',async()=>{
 const own=[{id:'mine-a',owner_id:'owner',name:'Pamuk'},{id:'mine-b',owner_id:'owner',name:'Mavi'}];
 const others=Array.from({length:83},(_,i)=>({id:'pet-'+i,owner_id:'u'+i,name:'Patili '+i}));
 const calls=[];
 const sb={from(name){assert.equal(name,'pets');let conditions={};return {
  select(){return this},eq(key,val){conditions.eq=[key,val];return this},neq(key,val){conditions.neq=[key,val];return this},
  order(key,args){calls.push({op:'order',key,args});return this},
  limit(n){calls.push({op:'own',n,conditions});return Promise.resolve({data:own,error:null})},
  range(a,b){calls.push({op:'range',a,b,conditions});return Promise.resolve({data:others.slice(a,b+1),error:null})}
 }}};
 const ctx={me:{id:'owner'},patiyizLoadToken:1,sb,Promise,Map,Set,console,
  PATI_PETS_PAGE_SIZE:36,patiPetsDirectory:{owner:'',own:[],rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''},
  view:'home',data:{pets:[]},petsPage(){throw Error('Should not redraw inactive pets view')}};
 const fn=vm.runInNewContext(part('async function patiLoadPetsDirectory(reset=false){','function petsPage(){')+'\npatiLoadPetsDirectory',ctx);
 await fn(true);await fn();await fn();
 assert.deepEqual(ctx.patiPetsDirectory.own.map(x=>x.id),['mine-a','mine-b']);
 assert.equal(ctx.patiPetsDirectory.rows.length,83);
 assert.equal(ctx.patiPetsDirectory.hasMore,false);
 assert.equal(ctx.data.pets.length,85);
 assert.deepEqual(calls.filter(x=>x.op==='range').map(x=>[x.a,x.b]),[[0,35],[36,71],[72,107]]);
 assert.equal(calls.filter(x=>x.op==='own').length,1);
 assert.ok(calls.filter(x=>x.op==='range').every(x=>x.conditions.neq[1]==='owner'));
});

test('Oturum değişiminde eski hayvan listesi yeni kullanıcı hesabına karışmaz',async()=>{
 let release;
 const pending=new Promise(resolve=>release=resolve);
 const sb={from(){return{select(){return this},eq(){return this},neq(){return this},order(){return this},limit(){return pending},range(){return pending}}}};
 const ctx={me:{id:'user-old'},patiyizLoadToken:2,sb,Promise,Map,Set,console,PATI_PETS_PAGE_SIZE:36,
  patiPetsDirectory:{owner:'',own:[],rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''},
  view:'home',data:{pets:[]},petsPage(){}};
 const fn=vm.runInNewContext(part('async function patiLoadPetsDirectory(reset=false){','function petsPage(){')+'\npatiLoadPetsDirectory',ctx);
 const task=fn(true);
 ctx.me={id:'user-new'};ctx.patiyizLoadToken=3;
 release({data:[{id:'old-pet',owner_id:'user-old'}],error:null});
 await task;
 assert.equal(ctx.data.pets.length,0);
 assert.equal(ctx.patiPetsDirectory.rows.length,0);
});

test('Hayvan sahipleri düzenleme, diğer kişiler sahibine geçiş düğmesini görür',()=>{
 let html='';
 const own={id:'own-pet',owner_id:'owner',name:'Pamuk',species:'Kedi',photo_url:'https://example.org/a.jpg'};
 const other={id:'other-pet',owner_id:'stranger',name:'Mavi',species:'Köpek'};
 const ctx={me:{id:'owner'},data:{pets:[own,other]},main:{set innerHTML(v){html=v}},
  blocked:new Set(),esc:String,petIcon:()=> '🐾',ico:()=>'<svg></svg>'};
 const fn=vm.runInNewContext(part('function petsPage(){','function knowledgePage(){')+'\npetsPage',ctx);
 fn();
 assert.match(html,/Benim Patilerim/);
 assert.match(html,/Topluluktaki Patiler/);
 assert.match(html,/data-action="pet-edit" data-id="own-pet"/);
 assert.match(html,/data-action="view-user" data-id="stranger"/);
 assert.match(html,/data-action="pet-add"/);
 assert.match(html,/loading="eager"/);
 assert.doesNotMatch(html,/data-action="pet-edit" data-id="other-pet"/);
 assert.match(css,/\.pati-pets-edit/);
 assert.match(css,/\.pati-pets-owner/);
});

test('Hayvan düzenleme penceresi fotoğrafını gösterir ve seçilen yeni fotoğrafı önizler',()=>{
 const editor=part('function editPet(p){','function questionReplies(');
 assert.match(editor,/Mevcut hayvan fotoğrafı/);
 assert.match(editor,/name="photo" type="file"/);
 assert.match(editor,/pati-pet-photo-select/);
 assert.match(editor,/p\.owner_id!==me\.id/);
 assert.match(editor,/data-action="pet-delete"/);
 assert.match(app,/if\(input\?\.id==='pati-pet-photo'\)/);
 assert.match(app,/URL\.createObjectURL\(file\)/);
 assert.match(app,/URL\.revokeObjectURL\(patiPetPhotoObjectUrl\)/);
 assert.match(app,/file\.size>30\*1024\*1024/);
});

test('Hayvan silme iki adımlıdır; sahiplik sunucuda da doğrulanır, ilişkili kayıtlar korunmadan kaybolmaz',()=>{
 const handlers=part('function processClick(e){','document.addEventListener(');
 assert.match(handlers,/case 'pet-delete'/);
 assert.match(handlers,/pet\.owner_id!==me\.id/);
 assert.match(handlers,/answer\.trim\(\)!==pet\.name/);
 assert.match(handlers,/\.delete\(\)\.eq\('id',pet\.id\)\.eq\('owner_id',uid\)\.select\('id'\)/);
 assert.match(handlers,/if\(!result\.data\?\.length\)throw Error/);
 assert.match(handlers,/patiLoadPetsDirectory\(true\)/);
 assert.match(app,/if\(editId&&\(!existing\|\|existing\.owner_id!==owner\)\)/);
});

test('Supabase indeksleri owner ve newest-first topluluk yüklemelerini destekler',()=>{
 assert.match(sql,/create index if not exists patiyiz_pets_directory_recent_idx/i);
 assert.match(sql,/create index if not exists patiyiz_pets_owner_recent_idx/i);
 assert.match(sql,/owner_id, created_at desc/i);
 assert.match(app,/if\(to==='pets'&&previous!=='pets'\)void patiLoadPetsDirectory\(true\)/);
 assert.match(app,/if\(typeof patiPetsDirectory!=='undefined'\)patiPetsDirectory=/);
});
