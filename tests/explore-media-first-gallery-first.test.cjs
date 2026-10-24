const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const gal=fs.readFileSync('gallery-picker.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function part(a,b){const start=app.indexOf(a),end=app.indexOf(b,start+a.length);assert.ok(start>=0&&end>start,'missing '+a);return app.slice(start,end)}

test('Keşfet ilk açıldığında isimler değil fotoğraf ve videolar görünür',()=>{
 const posts=[
  {id:'old-photo',image_url:'photo.jpg',created_at:'2026-10-20'},
  {id:'video',video_url:'video.mp4',video_cover_url:'cover.jpg',created_at:'2026-10-22'},
  {id:'text',body:'Yazı paylaşımı',created_at:'2026-10-23'},
  {id:'new-photo',images:['picture.jpg'],created_at:'2026-10-24'}
 ];
 const ctx={exploreTab:'media',me:{id:'me'},main:{innerHTML:''},
  data:{posts},blocked:new Set(),esc:String,ico:n=>'<svg>'+n+'</svg>',empty:()=>'<p>Boş</p>'};
 const fn=vm.runInNewContext(part('function explorePage(){','function communityPage()')+'\nexplorePage',ctx);
 fn();const output=ctx.main.innerHTML;
 assert.match(output,/pati-explore-media-screen/);
 assert.match(output,/pati-explore-gallery/);
 assert.match(output,/data-action="pati-search-open"/);
 assert.doesNotMatch(output,/pati-search-user|pati-explore-people|pati-explore-pets|pati-explore-animals|Yazı paylaşımı/);
 assert.deepEqual([...output.matchAll(/data-id="([^"]+)"/g)].map(m=>m[1]),['new-photo','video','old-photo']);
 assert.match(output,/cover\.jpg/);
 assert.match(output,/picture\.jpg/);
 assert.match(css,/#main-content \.pati-explore-media-screen \.pati-explore-gallery/);
});
test('Profil araması sadece arama kutusuna basınca açılır, iptal Keşfet ızgarasına döner',()=>{
 assert.match(app,/if\(view==='explore'\)\{exploreTab='media';search=''\}/);
 assert.match(app,/case 'pati-search-open':search='';exploreTab='users';explorePage\(\);requestAnimationFrame/);
 assert.match(app,/case 'pati-search-cancel':search='';exploreTab='media';explorePage\(\)/);
 assert.match(app,/case 'pati-search-discover':exploreTab='media'/);
 assert.match(css,/#main-content \.pati-explore-media-screen>\.pati-explore-search-launch/);
});
test('Gönderide Galeri butonu Patiyiz ekranını direkt açar, işletim sistemi seçicisini açmaz',()=>{
 const code=part('function openComposerMediaPicker(kind){','function openStoryComposer(');
 let opened,clicked=0,cap=false;
 const input={
  isConnected:true,multiple:false,click(){clicked++},
  setAttribute(n,v){if(n==='capture')cap=true},removeAttribute(n){if(n==='capture')cap=false}
 };
 const f={dataset:{mode:'post'},querySelector:()=>input};
 const ctx={window:{PatiyizGalleryPicker:{open:(files,options)=>{opened={files,options}}}},
  document:{getElementById:()=>f}};
 const action=vm.runInNewContext(code+'\nopenComposerMediaPicker',ctx);
 action('gallery');
 assert.equal(clicked,0,'OS chooser must not show on first tap');
 assert.equal(opened.files.length,0);
 assert.equal(opened.options.multiple,true);
 assert.equal(opened.options.max,10);
 opened.options.onReopen();
 assert.equal(clicked,1,'OS access only after user chooses permission');
 action('camera');
 assert.equal(clicked,2);
 assert.equal(cap,true);
});
test('DM galerisi formda sistem label yerine normal butondan açılır',()=>{
 const dm=part('function messagesPage(){','function pushKeyBytes(');
 assert.match(dm,/data-action="pati-dm-gallery-open"/);
 assert.match(dm,/name="dm_gallery" accept="image\/\*" multiple hidden/);
 assert.doesNotMatch(dm,/<label class="pati-dm-gallery"/);
 assert.match(app,/case 'pati-dm-gallery-open':\{/);
 assert.match(app,/window\.PatiyizGalleryPicker\.open\(\[\],\{multiple:false,max:1/);
});
test('Galeri ilk dokunmada ekrana açılır ve fotoğraf iznini açıkça ister',async()=>{
 class El{
  constructor(type){this.type=type;this.children=[];this.dataset={};this.hidden=false;this.listeners={};this.className='';this.textContent='';this.elements={};}
  append(...els){this.children.push(...els)}
  appendChild(el){this.children.push(el)}
  replaceChildren(...els){this.children=[...els]}
  addEventListener(n,fn){this.listeners[n]=fn}
  remove(){this.removed=true}
  querySelector(k){return this.elements[k]||null}
  closest(){return null}
  setAttribute(){}
 }
 const doc={body:new El('body'),createElement(type){
  const el=new El(type);
  if(type==='div'){
   el.elements={'.pati-gallery-grid':new El('grid'),'.pati-gallery-continue':new El('button'),'.pati-gallery-hint':new El('hint'),'.pati-gallery-reselect':new El('button')};
  }
  return el;
 }};
 const ctx={window:{},document:doc,URL:{createObjectURL:()=>{throw Error('No file authorized')},revokeObjectURL:()=>{}},Set,Array,Math,Number,String};
 vm.runInNewContext(gal,ctx);
 let clicks=0;
 assert.equal(ctx.window.PatiyizGalleryPicker.open([],{multiple:true,onReopen:()=>{clicks++}}),true);
 assert.equal(ctx.window.PatiyizGalleryPicker.active,true);
 const root=doc.body.children[0],grid=root.elements['.pati-gallery-grid'];
 assert.equal(grid.children.length,1);
 assert.equal(grid.children[0].className,'pati-gallery-empty');
 assert.equal(root.elements['.pati-gallery-continue'].hidden,true);
 assert.equal(clicks,0);
 const trigger={dataset:{gallery:'reopen'}};
 await root.listeners.click({target:{closest:k=>k==='[data-gallery]'?trigger:null}});
 assert.equal(clicks,1);
 assert.equal(ctx.window.PatiyizGalleryPicker.active,false);
 assert.match(gal,/Web uygulaması telefonundaki bütün fotoğrafları otomatik okuyamaz/);
 assert.match(css,/\.pati-gallery-grid \.pati-gallery-empty/);
 assert.match(html,/gallery-picker\.js\?v=20261024-gallery-safety-1/);
});
