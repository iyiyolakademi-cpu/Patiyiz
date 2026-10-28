const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
const part=(a,b)=>{let i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};
test('Patiler keşfi yalnızca topluluk hayvanlarını gösterir; kişisel yönetim merkezde kalır',()=>{
 const ctx={me:{id:'owner'},view:'pets',data:{pets:[{id:'own',owner_id:'owner',name:'Pamuk',species:'Kedi'},{id:'other',owner_id:'other',name:'Max',species:'Köpek'}]},blocked:new Set(),patiPetsState:{owner:'owner',rows:[],hasMore:false,ready:true},main:{innerHTML:''},esc:String,petIcon:()=>'*',ico:()=>'<svg></svg>'};
 const pets=vm.runInNewContext(part('function petsPage(){','function knowledgePage()')+'\npetsPage',ctx);pets();
 assert.match(ctx.main.innerHTML,/Hayvanlarım/);assert.match(ctx.main.innerHTML,/Topluluktaki Patiler/);
 assert.doesNotMatch(ctx.main.innerHTML,/Pamuk/);
 assert.match(ctx.main.innerHTML,/data-view="my-pet"/);
 assert.doesNotMatch(ctx.main.innerHTML,/data-action="pet-edit" data-id="other"/);
 assert.match(ctx.main.innerHTML,/data-action="view-user" data-id="other"/);
 assert.match(ctx.main.innerHTML,/Max/);
});
test('Topluluk patileri sunucudan oturum ile 30’ar çekilir ve önceki kayıtları korur',async()=>{
 let calls=[];const all=Array.from({length:64},(_,i)=>({id:'pet'+i,owner_id:'owner',name:'Pet'+i,created_at:new Date(Date.UTC(2026,9,25,0,0,64-i)).toISOString()}));
 const ctx={me:{id:'viewer'},patiyizLoadToken:2,view:'home',PATI_PETS_PAGE:30,patiPetsState:{owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''},data:{pets:[],profiles:[{id:'owner'}]},Map,Set,Promise,console,
 sb:{from(table){calls.push({table});return{select(){return this},neq(key,value){calls.push({key,value});return this},order(){return this},range(from,to){calls.push({from,to});return Promise.resolve({data:all.slice(from,to+1),error:null})}}}}};
 const fn=vm.runInNewContext(part('async function patiLoadCommunityPets(','function petsPage(){')+'\npatiLoadCommunityPets',ctx);
 await fn(true);await fn();await fn();
 assert.equal(ctx.patiPetsState.rows.length,64);
 assert.equal(ctx.patiPetsState.hasMore,false);
 assert.equal(ctx.data.pets.length,64);
 assert.deepEqual(calls.filter(v=>'from' in v).map(v=>[v.from,v.to]),[[0,29],[30,59],[60,89]]);
 assert.ok(calls.filter(v=>v.table).every(v=>v.table==='pets'));
});
test('Patiler sayfalama başarısız olunca yeniden deneme korunur',async()=>{
 const state={owner:'viewer',rows:[{id:'original',owner_id:'other'}],offset:1,hasMore:true,loading:false,ready:true,error:''};
 const ctx={me:{id:'viewer'},patiyizLoadToken:0,view:'home',PATI_PETS_PAGE:30,patiPetsState:state,data:{pets:[],profiles:[]},Set,Map,Promise,console,
 sb:{from(){return {select(){return this},neq(){return this},order(){return this},range(){return Promise.resolve({error:new Error('offline')})}}}}};
 const fn=vm.runInNewContext(part('async function patiLoadCommunityPets(','function petsPage(){')+'\npatiLoadCommunityPets',ctx);
 await fn();assert.equal(state.rows.length,1);assert.equal(state.offset,1);assert.equal(state.hasMore,true);assert.match(state.error,/Tekrar/);
});
test('Mobil tasarım ve Android yerel paket stilini içerir',()=>{
 assert.match(html,/pets-completion\.css/);
 const css=fs.readFileSync('pets-completion.css','utf8');
 assert.match(css,/\.pati-pets-edit/);
 assert.match(css,/@media\(max-width:450px\)/);
 const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
 assert.match(native,/pets-completion\.css/);
});
