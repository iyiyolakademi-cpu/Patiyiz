const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const studio=fs.readFileSync('photo-studio.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
function between(text,a,b){const i=text.indexOf(a),j=text.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing '+a+' -> '+b);return text.slice(i,j)}
const runtime={window:{}};
vm.runInNewContext(studio,runtime);
const editor=runtime.window.PatiyizPhotoStudio;

test('Fotoğraf Stüdyosu sekmeleri, oranlar, filtreler, undo/redo ve dışa aktarım var',()=>{
 assert.ok(editor);
 assert.deepEqual(Object.keys(editor.CROPS),['original','1:1','4:5','9:16','16:9']);
 assert.ok(editor.PRESETS.some(p=>p[0]==='Canlı'));
 assert.ok(editor.PRESETS.some(p=>p[0]==='Yumuşak Tüy'));
 for(const key of ['exposure','contrast','highlights','shadows','saturation','warmth','sharpness'])
  assert.match(studio,new RegExp("'"+key+"'"));
 for(const key of ['data-studio="undo"','data-studio="redo"','data-studio="next"','data-studio="rotate"','data-studio="reset"','data-studio="ratio"'])
  assert.ok(studio.includes(key),key);
 assert.match(studio,/data-tab="filters"/);
 assert.match(studio,/data-tab="adjust"/);
 assert.match(studio,/data-tab="crop"/);
 assert.match(studio,/pointerdown/);
 assert.match(studio,/pointermove/);
 assert.match(studio,/toBlob\(resolve,'image\/jpeg'/);
 assert.match(studio,/new File\(\[blob\],'patiyiz-studio-/);
});

test('Orijinal ve tüm kırpma oranları doğru piksel boyutuna dönüştürülür',()=>{
 const picture={naturalWidth:1600,naturalHeight:1200};
 const s={crop:'original',rotate:0};
 let p=editor.plan(picture,s,1600);
 assert.equal(p.width,1600);assert.equal(p.height,1200);
 p=editor.plan(picture,{crop:'original',rotate:1},1600);
 assert.equal(p.width,1200);assert.equal(p.height,1600);
 for(const [crop,w,h]of [['1:1',1000,1000],['4:5',800,1000],['9:16',563,1000],['16:9',1000,563]]){
  p=editor.plan(picture,{crop,rotate:0},1000);
  assert.equal(p.width,w);assert.equal(p.height,h);
 }
});

test('Işık, kontrast, filtre ve pozlama resmin gerçek render filtresini değiştirir',()=>{
 const base={preset:'none',strength:100,exposure:0,contrast:0,saturation:0,warmth:0};
 const vivid={...base,preset:'vivid',exposure:30,contrast:20,saturation:15,warmth:10};
 assert.notEqual(editor.filterFor(vivid),editor.filterFor(base));
 assert.match(editor.filterFor(vivid),/brightness\(/);
 assert.match(editor.filterFor(vivid),/saturate\(/);
});

test('Canvas şeffaf kaynakta güvenle doldurulur ve netlik işlemi gerçek piksele uygulanır',()=>{
 const image={naturalWidth:60,naturalHeight:40};
 let drawn=0,updated=0,saved=0;
 const ctx={
  save(){saved++},restore(){},fillRect(){},translate(){},rotate(){},drawImage(){drawn++},
  getImageData(_x,_y,w,h){const a=new Uint8ClampedArray(w*h*4);a.fill(100);return{data:a}},
  putImageData(){updated++}
 };
 const canvas={getContext(){return ctx}};
 const state={crop:'1:1',rotate:0,straight:0,zoom:1,panX:0,panY:0,
 preset:'none',strength:100,exposure:0,contrast:0,highlights:10,shadows:5,saturation:0,warmth:0,sharpness:40};
 const result=editor.draw(canvas,image,state,50);
 assert.equal(result.width,50);assert.equal(result.height,50);
 assert.equal(drawn,1);assert.equal(saved,1);assert.equal(updated,2);
});

test('Mavi tik sadece onaylı profillerde ve @kullanıcıadının yanında görünür',()=>{
 const badge=between(app,'const verifiedBadge=','const avatar=');
 const context={esc:String};
 const make=vm.runInNewContext(badge+'\nverifiedBadge',context);
 assert.equal(make({is_verified:false}),'');
 assert.match(make({is_verified:true}),/pati-verified-blue/);
 assert.match(make({is_verified:true}),/aria-label="Doğrulanmış hesap"/);
 assert.match(make({is_verified:true}),/#2196f3/);
 const profile=between(app,'function profilePage(){','function formField(');
 assert.match(profile,/class="pati-ig-handle-row"/);
 assert.match(profile,/esc\(p.handle\|\|'patiyiz'\)/);
 assert.match(profile,/verifiedBadge\(p\)/);
 assert.doesNotMatch(profile,/button\('Hayvan ekle','pet-add'\)/);
 assert.doesNotMatch(profile,/button\('Menü','tools'\)/);
 assert.match(profile,/button\('Profili düzenle','edit-profile'\)/);
 assert.match(css,/pati-verified-blue/);
 assert.match(app,/data-action="pet-add"/);
});

test('Fotoğraf seçimi önce editöre gider; değiştirilmiş dosya tekrar kırpılmaz',()=>{
 assert.match(app,/function openPostPhotoStudio\(form,files\)/);
 assert.match(app,/function openStoryPhotoStudio\(form,file\)/);
 assert.match(app,/return openPostPhotoStudio\(post,files\)/);
 assert.match(app,/void openPostPhotoStudio\(post,\[\.\.\.input.files\]\)/);
 assert.match(app,/void openStoryPhotoStudio\(input.form,file\)/);
 assert.match(app,/form\._patiEditedPhotos\|\|/);
 assert.match(app,/form\._patiEditedPhotos\?photoFiles\[i\]:await cropPostPhoto/);
 assert.match(app,/form\._patiEditedStory\|\|f\.get\(choice\)/);
 assert.match(app,/updateStoryMediaPreview\(edited\[0\]\)/);
 assert.match(app,/onCancel:\(\)=>\{/);
 assert.match(html,/photo-studio\.js\?v=20261024-feed-highlights-1/);
 assert.ok(html.indexOf('photo-studio.js')<html.indexOf('app.js?v=20261024-feed-highlights-1'));
 assert.match(html,/patiyiz-inspired\.css\?v=20261024-feed-highlights-1/);
});

test('Fotoğraf Stüdyosu Patiyiz oturumu kapanınca kapatılır',()=>{
 assert.match(app,/PatiyizPhotoStudio\?\.close\?\.\(\)/);
 assert.match(studio,/document\.removeEventListener\('keydown',escapeKey,true\)/);
 assert.match(studio,/session\.urls\.forEach\(u=>URL\.revokeObjectURL\(u\)\)/);
 assert.match(studio,/if\(active\)return false/);
 assert.match(css,/body\.pati-studio-open/);
 assert.match(css,/safe-area-inset-bottom/);
});
