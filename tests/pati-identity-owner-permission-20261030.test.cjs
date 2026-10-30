const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const owner=fs.readFileSync('pati-identity-owner.js','utf8');
const edge=fs.readFileSync('supabase/functions/pati-identity/index.ts','utf8');
const core=fs.readFileSync('app.js','utf8');
test('Pati Kimliği pet picker gets the signed-in owners pet list from the server',()=>{
 assert.match(edge,/from\('pets'\)[\s\S]*?\.eq\('owner_id',user\.id\)[\s\S]*?limit\(200\)/);
 assert.match(edge,/respond\(\{ok:true,pets:pets\|\|\[\]/);
 assert.match(owner,/state\.pets=res\.pets\.filter\(p=>p\.owner_id===owner\)/);
 assert.match(owner,/if\(!state\.pets\.some\(p=>p\.id===selected\)\)/);
 assert.match(owner,/!state\.loaded\|\|!state\.pets\.some\(p=>p\.id===petId\)/);
 assert.match(owner,/const petId=selected/);
 assert.match(owner,/state\.tokenPet=petId/);
});
test('HTTP 403 is no longer inaccurately shown as a missing QR server',()=>{
 assert.match(owner,/error\.context/);
 assert.match(owner,/typeof response\.clone==='function'\?response\.clone\(\):response/);
 assert.match(owner,/response\?\.status===403/);
 assert.match(edge,/if\(petError\)return err\('Hayvan kaydına şu anda ulaşılamadı\.'/);
 assert.match(edge,/if\(!pet\)return err\('Bu hayvan bu hesapta bulunamadı\./);
 assert.doesNotMatch(owner,/Servis henüz kurulmamış olabilir/);
});
test('Other Patiyiz areas and owner QR interface continue to parse',()=>{
 assert.doesNotThrow(()=>new Function(owner));
 assert.doesNotThrow(()=>new Function(core));
 assert.match(owner,/data-pk-act="create"/);
 assert.match(owner,/data-pk-act="download"/);
 assert.match(owner,/data-pk-act="refresh"/);
 assert.match(owner,/data-view="my-pet"/);
});
