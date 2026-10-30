const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const app=fs.readFileSync('app.js','utf8');
test('Read receipts retains server-backed owner-only update and visible refresh',()=>{
 assert.match(app,/case 'dm-receipts-toggle':run\(async\(\)=>\{/);
 assert.match(app,/update\(\{read_receipts_enabled:next\}\)\.eq\('id',user\)/);
 assert.match(app,/const p=data\.profiles\.find\(x=>x\.id===user\)/);
 assert.match(app,/render\(\);/);
});
test('Extra sections get a back button and back trail is bounded',()=>{
 assert.match(app,/const pages=\['community'[^\n]*'my-pet'[^\n]*'follows-list'/);
 assert.match(app,/const patiViewTrail=\[\]/);
 assert.match(app,/while\(patiViewTrail\.length\)/);
 assert.match(app,/patiNavigatingBack=true;navigate\(dest\)/);
 assert.doesNotThrow(()=>new Function(app));
});
