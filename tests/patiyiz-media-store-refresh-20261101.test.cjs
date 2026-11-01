const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-media-store-refresh-20261101.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const begin=app.indexOf('const patiCropEdits=new WeakMap()');
const end=app.indexOf('async function patiCropOpen(',begin);
test('Post, story and Reels ratios map to clear export dimensions',()=>{
 const context={WeakMap,Number,Math,Uint8ClampedArray,console};
 vm.createContext(context);
 const source=app.slice(begin,end);
 vm.runInContext(source+';this.__crop={defaultRatio:patiMediaDefaultRatio,allowed:patiMediaAllowedRatios,size:patiCropSize}',context);
 const c=context.__crop,img={naturalWidth:2400,naturalHeight:1600};
 assert.equal(c.defaultRatio('post'),'4:5');
 assert.equal(c.defaultRatio('story'),'9:16');
 assert.equal(c.defaultRatio('reels'),'9:16');
 assert.deepEqual([...c.allowed('post')],['4:5','1:1','1.91:1']);
 assert.deepEqual([...c.allowed('story')],['9:16']);
 assert.deepEqual([...c.size('4:5',img)],[1080,1350]);
 assert.deepEqual([...c.size('1:1',img)],[1080,1080]);
 assert.deepEqual([...c.size('9:16',img)],[1080,1920]);
 assert.deepEqual([...c.size('9:16',img,0,'preview')],[540,960]);
});
test('Photo crop UI keeps per-image edits and output follows mode',()=>{
 assert.match(app,/patiMediaAllowedRatios\(form\.dataset\.mode\|\|'post'\)/);
 assert.match(app,/patiCropEdits\.set\(files\[i\]/);
 assert.match(app,/patiCropPaint\(canvas,img,state,'preview'\)/);
 assert.match(app,/const file=await cropPostPhoto\(photoFiles\[i\],patiMediaDefaultRatio/);
 assert.match(app,/cropPostPhoto\(photo,'9:16'\)/);
 assert.match(app,/record\.video_cover_url=await send\(await cropPostPhoto/);
 assert.match(app,/await cropPostPhoto\(poster,'9:16'\)/);
 assert.match(app,/setupFeedMediaRatios\(\)/);
 assert.match(css,/--pati-compose-ratio:9 \/ 16/);
 assert.match(css,/aspect-ratio:var\(--pati-feed-aspect,4 \/ 5\)/);
});
test('Shop contains four actual options, clear stock limitations and planned cash progress without false payout promises',()=>{
 const s=app.slice(app.indexOf('function patiShopPage(){'),app.indexOf('function patiCoinShowCheckout('));
 let markup='';
 const model={balance:250,items:[
  {id:'kedi-mamasi-250',name:'Kedi Maması · 250 g',coins:350,stock_available:0},
  {id:'kopek-mamasi-250',name:'Köpek Maması · 250 g',coins:350,stock_available:0},
  {id:'mama-destek',name:'Sokak Hayvanlarına Mama Desteği',coins:400,stock_available:10},
  {id:'fidan-bagisi',name:'Bir Fidan Bağışla',coins:700,stock_available:10},
  {id:'mini-sticker',name:'Mini Çıkartma Seti',coins:120,stock_available:100}
 ],orders:[],history:[]};
 const env={patiCoinState:model,main:{set innerHTML(s){markup=s}},esc:s=>String(s),day:s=>String(s)};
 vm.createContext(env);vm.runInContext(s+';patiShopPage()',env);
 assert.equal((markup.match(/class="pati-calm-item"/g)||[]).length,4);
 assert.match(markup,/Kedi Maması/);
 assert.match(markup,/Köpek Maması/);
 assert.match(markup,/Sokak Hayvanlarına Mama Desteği/);
 assert.match(markup,/Bir Fidan Bağışla/);
 assert.doesNotMatch(markup,/Mini Çıkartma Seti|pati-store-filterbar/);
 assert.match(markup,/10\.000 puan/);
 assert.match(markup,/1\.000 TL/);
 assert.match(markup,/Nakit ödül programı henüz başlatılmadı/);
 assert.match(markup,/aria-valuenow="250"/);
 assert.match(markup,/data-id="kedi-mamasi-250" disabled aria-disabled="true"/);
 assert.match(markup,/data-action="paticoin-rewards"/);
 assert.match(css,/\.pati-calm-grid/);
 assert.match(css,/\.pati-calm-progress/);
 assert.match(html,/patiyiz-media-store-refresh-20261101\.css\?v=4/);
});
