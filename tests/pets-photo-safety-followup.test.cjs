const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8'),style=fs.readFileSync('pets-completion.css','utf8');
const segment=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};

test('Kendi hayvanlarını genel 600 kayıt sınırından bağımsız olarak yükler',async()=>{
 const pets=Array.from({length:85},(_,i)=>({id:'pet-'+i,owner_id:'owner',name:'Patim '+i}));
 const existing={id:'another',owner_id:'another'};
 const calls=[];
 const ctx={me:{id:'owner'},patiyizLoadToken:5,patiOwnPetsRequest:0,
  view:'home',data:{pets:[existing]},console,
  sb:{from(table){calls.push(table);return{
    select(){return this},eq(field,v){calls.push([field,v]);return this},
    order(){return this},limit(n){calls.push(['limit',n]);return Promise.resolve({data:pets,error:null})}
  }}}};
 const fn=vm.runInNewContext(segment('async function patiLoadOwnedPets(){','function petsPage(){')+'\npatiLoadOwnedPets',ctx);
 await fn();
 assert.equal(ctx.data.pets.length,86);
 assert.ok(ctx.data.pets.some(p=>p.id==='another'));
 assert.equal(ctx.data.pets.filter(p=>p.owner_id==='owner').length,85);
 assert.deepEqual(calls,['pets',['owner_id','owner'],['limit',200]]);
});

test('Hesap değişirse önceki sahibin hayvanları yeni hesabın listesine yazılmaz',async()=>{
 let release;
 const delayed=new Promise(resolve=>release=resolve);
 const ctx={me:{id:'old'},patiyizLoadToken:1,patiOwnPetsRequest:0,view:'home',
   data:{pets:[]},console,
   sb:{from(){return{select(){return this},eq(){return this},order(){return this},limit(){return delayed}}}}};
 const fn=vm.runInNewContext(segment('async function patiLoadOwnedPets(){','function petsPage(){')+'\npatiLoadOwnedPets',ctx);
 const request=fn();
 ctx.me={id:'new'};ctx.patiyizLoadToken++;
 release({data:[{id:'old-pet',owner_id:'old'}],error:null});
 await request;
 assert.equal(ctx.data.pets.length,0);
 assert.match(app,/if\(typeof patiOwnPetsRequest!=='undefined'\)patiOwnPetsRequest\+\+/);
});

test('Hayvan düzenleme mevcut fotoğrafı gösterir ve tek fotoğraf ile canlı önizleme sunar',()=>{
 const edit=segment('function editPet(p){','function questionReplies(');
 assert.match(edit,/p\.owner_id!==me\.id/);
 assert.match(edit,/Mevcut hayvan fotoğrafı/);
 assert.match(edit,/name="photo" type="file"/);
 assert.match(edit,/pati-pet-photo-select/);
 assert.match(edit,/pati-pet-delete/);
 assert.match(app,/if\(input\?\.id==='pati-pet-photo'\)/);
 assert.match(app,/URL\.createObjectURL\(file\)/);
 assert.match(app,/URL\.revokeObjectURL\(patiPetPhotoObjectUrl\)/);
 assert.match(app,/file\.size>30\*1024\*1024/);
 assert.match(style,/\.pati-pet-edit-modal \.pati-pet-edit-photo/);
});

test('Hayvan silme yalnızca sahip için ve adıyla ikinci doğrulama üzerinden yapılır',()=>{
 const code=segment("case 'pet-edit':","case 'my-profile':");
 assert.match(code,/case 'pet-delete':/);
 assert.match(code,/pet\.owner_id!==me\.id/);
 assert.match(code,/answer\.trim\(\)!==pet\.name/);
 assert.match(code,/\.delete\(\)\.eq\('id',pet\.id\)\.eq\('owner_id',uid\)\.select\('id'\)/);
 assert.match(code,/if\(!result\.data\?\.length\)throw Error/);
 assert.match(code,/await patiLoadOwnedPets\(\)/);
 const form=segment("case 'pet-form':","case 'reply-form':");
 assert.match(form,/if\(editId&&\(!existing\|\|existing\.owner_id!==owner\)\)/);
 assert.match(form,/if\(name\.length<2\|\|name\.length>70\)/);
 assert.match(form,/await save\('pets',o,editId\)/);
});

test('Mevcut topluluk sayfalaması ve Capacitor paketindeki CSS korunur',()=>{
 assert.match(app,/async function patiLoadCommunityPets\(reset=false\)/);
 assert.match(app,/const PATI_PETS_PAGE=30/);
 assert.match(app,/case 'pets-more':void patiLoadCommunityPets\(\)/);
 assert.match(app,/data-action="view-user"/);
 const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
 assert.match(native,/pets-completion\.css/);
 const sql=fs.readFileSync('supabase/patiyiz-pets-directory-indexes-20261025.sql','utf8');
 assert.match(sql,/patiyiz_pets_directory_recent_idx/);
 assert.match(sql,/patiyiz_pets_owner_recent_idx/);
});
