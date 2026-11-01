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
test('Shop shows real stock and point checkout, while unavailable new items stay disabled',()=>{
 const s=app.slice(app.indexOf('function patiShopPage(){'),app.indexOf('function patiCoinShowCheckout('));
 let markup='';
 const model={balance:250,items:[
  {id:'mama-mini',name:'Mini Paket',description:'Küçük bir paket',emoji:'🥣',kind:'food',coins:220,stock_available:10},
  {id:'mini-sticker',name:'Mini Çıkartma',description:'Stok bekliyor',emoji:'🎨',kind:'supply',coins:120,stock_available:0}
 ],orders:[],history:[]};
 const env={patiShopFilter:'all',patiCoinState:model,main:{set innerHTML(s){markup=s}},esc:s=>String(s),day:s=>String(s)};
 vm.createContext(env);vm.runInContext(s+';patiShopPage()',env);
 assert.match(markup,/Satın Al/);
 assert.match(markup,/Mini Çıkartma/);
 assert.match(markup,/Stok bekleniyor/);
 assert.match(markup,/data-id="mini-sticker" disabled aria-disabled="true"/);
 assert.match(markup,/Sosyal Puan/);
 assert.match(markup,/TL ile ödeme yapılmaz/);
 assert.match(app,/patiyiz_redeem_reward/);
 assert.match(css,/\.pati-store-grid/);
 assert.match(css,/@media\(max-width:540px\)/);
 assert.match(html,/patiyiz-media-store-refresh-20261101\.css\?v=2/);
});
