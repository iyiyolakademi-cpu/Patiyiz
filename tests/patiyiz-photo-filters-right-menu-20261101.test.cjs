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
test('Filters are painted into canvas pixels used for actual uploads',()=>{
 const context={};vm.createContext(context);vm.runInContext(app.slice(first,last),context);
 const log=[],fake2d={
  clearRect(){},save(){},restore(){},translate(){},rotate(){},scale(){},
  drawImage(){log.push({filter:this.filter})}
 };
 const canvas={width:0,height:0,getContext:()=>fake2d};
 const img={naturalWidth:1600,naturalHeight:1200};
 vm.runInContext('this.renderFilter=patiCropPaint',context);
 context.renderFilter(canvas,img,{ratio:'1:1',zoom:1,x:.5,y:.5,rotation:0,flip:false,filter:'mono',brightness:95,contrast:125});
 assert.equal(canvas.width,720);
 assert.equal(canvas.height,720);
 assert.equal(log.length,1);
 assert.match(log[0].filter,/grayscale\(1\)/);
 assert.match(log[0].filter,/brightness\(95%\)/);
 assert.match(log[0].filter,/contrast\(125%\)/);
 assert.match(app,/patiCropPaint\(canvas,img,state\)/);
 assert.match(app,/async function cropPostPhoto\(file,aspect\)/);
 assert.match(app,/patiCropEdits\.has\(photoFiles\[i\]\)/);
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
 assert.match(html,/patiyiz-photo-filters-right-menu-20261101\.css\?v=1/);
});
test('Right-side ball and swipe-left menu preserve carousel gestures',()=>{
 assert.match(app,/id='pati-right-menu-handle'/);
 assert.match(app,/function patiOpenRightMenu\(markup\)/);
 assert.match(app,/if\(view==='home'&&dx<0\)\{openMobileFeaturesMenu\(\);return;\}/);
 assert.match(app,/target\.closest\('input,textarea,select,\[contenteditable\],\.pati-carousel/);
 assert.match(app,/if\(dx>75&&Math\.abs\(dx\)>Math\.abs\(dy\)\*1\.4\)/);
 assert.match(css,/\.pati-right-menu-panel/);
 assert.match(css,/html\[data-pati-view="home"\]/);
 assert.match(html,/photo_filters_right_menu=20261101v1/);
});
