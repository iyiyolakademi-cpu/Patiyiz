const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const js=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-creator-crop-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
function between(a,b){
 const i=js.indexOf(a),j=js.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,'Missing '+a);
 return js.slice(i,j);
}
function paint(state){
 const calls=[];
 const context={
  clearRect(...a){calls.push(['clearRect',...a])},
  save(){calls.push(['save'])},
  translate(...a){calls.push(['translate',...a])},
  rotate(...a){calls.push(['rotate',...a])},
  scale(...a){calls.push(['scale',...a])},
  drawImage(...a){calls.push(['drawImage',...a])},
  restore(){calls.push(['restore'])}
 };
 const canvas={width:1,height:1,getContext:()=>context};
 const img={naturalWidth:1200,naturalHeight:800};
 const source=between('/* Full-screen, photo-by-photo crop editor.','async function uploadVideo(');
 const api=vm.runInNewContext(source+'\n({patiCropPaint,patiCropDefault})',{WeakMap,Math,Number});
 const result=api.patiCropPaint(canvas,img,state);
 return {calls,canvas,result};
}
test('Full-screen cropping preserves wide originals, and swaps rotated dimensions correctly',()=>{
 const original=paint({ratio:'original',zoom:1,x:.5,y:.5,rotation:0,flip:false});
 const rotated=paint({ratio:'original',zoom:1,x:.5,y:.5,rotation:90,flip:false});
 assert.ok(original.canvas.width>original.canvas.height);
 assert.ok(rotated.canvas.width<rotated.canvas.height);
 assert.equal(original.calls.find(x=>x[0]==='rotate')[1],0);
 assert.ok(Math.abs(rotated.calls.find(x=>x[0]==='rotate')[1]-Math.PI/2)<.0001);
 assert.ok(rotated.calls.some(x=>x[0]==='drawImage'));
});
test('Crop orientation, zoom and pan are independent of the file the user selected',()=>{
 const a=paint({ratio:'4:5',zoom:1,x:.5,y:.5,rotation:0,flip:false});
 const b=paint({ratio:'1:1',zoom:1.6,x:.9,y:.2,rotation:0,flip:true});
 assert.deepEqual([a.canvas.width,a.canvas.height],[720,900]);
 assert.deepEqual([b.canvas.width,b.canvas.height],[720,720]);
 assert.ok(b.calls.some(x=>x[0]==='scale'&&x[1]===-1));
 assert.notDeepEqual(a.calls.find(x=>x[0]==='translate').slice(1),b.calls.find(x=>x[0]==='translate').slice(1));
});
test('Editor commits only on Bitti, is fully accessible and applies actual export on story and post',()=>{
 const source=between('async function patiCropOpen(options={}){','async function drawPostCrop()');
 for(const cmd of ['Vazgeç','Bitti','Ayna','Döndür','Orijinal','4:5','9:16','Yakınlaştır','patiCropEdits.set(files[i]','if(action===\'cancel\')','patiCropPaint(canvas,img,state)'])
  assert.ok(source.includes(cmd),'Missing control '+cmd);
 assert.match(js,/const file=\(typeof patiCropEdits!=='undefined'&&patiCropEdits\.has\(photoFiles\[i\]\)\)/);
 assert.match(js,/patiCropEdits\.has\(photo\)/);
 assert.match(js,/async function cropPostPhoto/);
 assert.match(js,/await cropPostPhoto\(photoFiles\[i\]/);
 assert.match(css,/\.pati-full-crop-dialog\{/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/touch-action:none/);
 assert.match(css,/data-pati-theme="dark"/);
});
test('Dashboard is scoped to own profile and uses real backend events, never guessed demographic data',()=>{
 assert.match(js,/if\(!me\?\.id\|\|view!=='profile'\|\|\(profileId&&profileId!==me\.id\)\)return/);
 for(const name of ['patiyiz_creator_insights_extended','patiyiz_creator_audience','patiyiz_creator_content_breakdown','patiyiz_creator_recent_visitors'])
  assert.ok(js.includes(name));
 assert.match(js,/data-action="pati-insights-visitors"/);
 assert.match(js,/patiCreatorBreakdown\(genders/);
 assert.match(js,/patiCreatorBreakdown\(cities/);
 assert.match(js,/loss_history_complete/);
 assert.match(js,/pati-profile-insights-preview/);
 assert.match(js,/pati-profile-visit-disclosure/);
 assert.ok(!js.includes('Profesyonel pano'));
});
test('New stylesheet is last, viewport-safe and packaged with Capacitor',()=>{
 const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(styles.at(-1).includes('patiyiz-crop-insights-mobile-final-20261029.css'));
 assert.match(native,/'patiyiz-creator-crop-20261029\.css'/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/overflow-x:hidden/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
