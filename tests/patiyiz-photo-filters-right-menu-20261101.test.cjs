const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-photo-filters-right-menu-20261101.css','utf8');
const first=app.indexOf('const patiCropEdits=new WeakMap()');
const last=app.indexOf('async function patiCropOpen(',first);

test('Photo filter model exposes eight presets and correct neutral defaults',()=>{
 assert.ok(first>=0&&last>first,'existing Patiyiz crop tool is preserved');
 const context={};vm.createContext(context);
 vm.runInContext(app.slice(first,last),context);
 assert.equal(vm.runInContext('Object.keys(patiCropFilters).length',context),8);
 const neutral=vm.runInContext('patiCropDefault(null,"1:1")',context);
 assert.equal(neutral.filter,'original');
 assert.equal(neutral.brightness,100);
 assert.equal(neutral.contrast,100);
 const preset=vm.runInContext('patiCropFilterCSS({filter:"vintage",brightness:120,contrast:90})',context);
 assert.match(preset,/sepia/);
 assert.match(preset,/brightness\(120%\)/);
 assert.match(preset,/contrast\(90%\)/);
});
test('Filters use pixel-level image processing on iPhones and match upload output',()=>{
 const context={};vm.createContext(context);vm.runInContext(app.slice(first,last),context);
 const original=Uint8ClampedArray.from([225,80,40,255,15,205,115,255]);
 let output=null;
 const fake2d={
  clearRect(){},save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(){},
  getImageData(){return {data:Uint8ClampedArray.from(original)}},
  putImageData(image){output=Uint8ClampedArray.from(image.data)}
 };
 const canvas={width:0,height:0,getContext:()=>fake2d};
 const img={naturalWidth:1600,naturalHeight:1200};
 vm.runInContext('this.renderFilter=patiCropPaint',context);
 context.renderFilter(canvas,img,{ratio:'1:1',zoom:1,x:.5,y:.5,rotation:0,flip:false,filter:'mono',brightness:95,contrast:125});
 assert.equal(canvas.width,1080);
 assert.equal(canvas.height,1080);
 assert.ok(output,'output bytes should be exported on canvas');
 assert.equal(output[0],output[1]);
 assert.equal(output[1],output[2]);
 assert.notDeepEqual([...output],[...original]);
 assert.match(app,/patiCropApplyPixelFilter\(ctx,w,h,state\)/);
 assert.match(app,/ctx\.putImageData\(image,0,0\)/);
 assert.match(app,/async function cropPostPhoto\(file,aspect\)/);
 assert.match(app,/await cropPostPhoto\(photoFiles\[i\],patiMediaDefaultRatio/);
});
test('Photo adjustment controls are available on mobile, preview and export',()=>{
 assert.match(app,/pati-crop-filter-strip/);
 assert.match(app,/data-crop-action="filter"/);
 assert.match(app,/data-crop-action="reset-color"/);
 assert.match(app,/id="pati-crop-brightness"/);
 assert.match(app,/id="pati-crop-contrast"/);
 assert.match(app,/pati-media-edit-entry/);
 assert.match(app,/cropPostPhoto\(selected,'original'\)/);
 assert.match(css,/\.pati-crop-adjustments/);
 assert.match(css,/\.pati-crop-filter-tile\.active/);
 assert.match(html,/patiyiz-photo-filters-right-menu-20261101\.css\?v=2/);
});
test('Right-side ball opens a fullscreen page on tap only',()=>{
 assert.match(app,/id='pati-right-menu-handle'/);
 assert.match(app,/function patiOpenRightMenu\(markup\)/);
 assert.doesNotMatch(app,/if\(view==='home'&&dx<0\)\{openMobileFeaturesMenu\(\);return;\}/);
 assert.match(app,/target\.closest\('input,textarea,select,\[contenteditable\],\.pati-carousel/);
 assert.match(css,/dialog\.pati-right-menu-drawer\[open\]/);
 assert.match(css,/width:100vw!important;max-width:100vw!important;height:100dvh!important/);
 assert.match(css,/animation:none!important;transform:none!important;transition:none!important/);
 assert.match(html,/photo_filters_right_menu=20261101v2/);
});
test('Reward label is Puan, no paw icon beside balance, and daily streak page does not reference undefined state',()=>{
 assert.match(app,/let patiStreak60State=/);
 assert.match(app,/async function patiStreak60Load\(/);
 assert.match(app,/async function patiStreak60Claim\(/);
 assert.match(app,/patiyiz_streak60_reward/);
 assert.match(app,/p_claim:false/);
 assert.match(app,/p_claim:true/);
 assert.match(app,/Serilerim/);
 assert.match(app,/Puan ve Görevler/);
 assert.doesNotMatch(app,/PatiCoin/);
 assert.match(app,/counter\.innerHTML='<span class="pati-balance-title">Bakiyen<\/span>/);
 assert.match(app,/case 'pati-streak-60-claim':void patiStreak60Claim\(\)/);
});
