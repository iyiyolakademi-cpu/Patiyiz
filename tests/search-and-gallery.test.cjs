const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),gallery=fs.readFileSync('gallery-picker.js','utf8'),css=fs.readFileSync('patiyiz-inspired.css','utf8');
function sourceBetween(start,end){const i=app.indexOf(start),j=app.indexOf(end,i+start.length);assert.ok(i>=0&&j>i,start);return app.slice(i,j)}

test('Arama sekmesine basınca doğrudan kullanıcı profilleri görünür',()=>{
 const ctx={data:{profiles:[{id:'me',display_name:'Kendim',handle:'ben'},{id:'a',display_name:'Damla',handle:'damla'},{id:'b',display_name:'Doğa',handle:'dogapolari'},{id:'c',display_name:'Ahmet',handle:'ahmet'}]},
  me:{id:'me'},blocked:new Set(),followed:new Set(['b']),search:'',exploreTab:'users',
  main:{innerHTML:''},esc:String,ico:n=>'<svg>'+n+'</svg>',avatar:p=>'<img data-avatar="'+p.id+'">'};
 const fn=vm.runInNewContext(sourceBetween('function explorePage(){','function communityPage()')+'\nexplorePage',ctx);
 fn();assert.match(ctx.main.innerHTML,/id="explore-search"/);assert.match(ctx.main.innerHTML,/class="pati-search-results"/);
 assert.doesNotMatch(ctx.main.innerHTML,/pati-explore-gallery|pati-explore-media|pati-explore-animals/);
 assert.ok(ctx.main.innerHTML.indexOf('data-id="b"')<ctx.main.innerHTML.indexOf('data-id="a"'),'Takip edilen önce');
 assert.doesNotMatch(ctx.main.innerHTML,/data-id="me"/);
 ctx.search='d';fn();assert.match(ctx.main.innerHTML,/data-id="b"/);assert.match(ctx.main.innerHTML,/data-id="a"/);assert.doesNotMatch(ctx.main.innerHTML,/data-id="c"/);
 ctx.search='xyz';fn();assert.match(ctx.main.innerHTML,/eşleşen profil yok/);
 assert.match(app,/if\(view==='explore'\)\{exploreTab='users';search=''\}/);
 assert.match(app,/case 'pati-search-cancel'/);
 assert.match(app,/case 'pati-search-discover'/);
});

test('Kullanıcı listesi mobil genişlikte profil fotoğrafı ve arama düğmesi ile düzenlenir',()=>{
 assert.match(css,/#main-content \.pati-search-top/);
 assert.match(css,/#main-content \.pati-search-user>\\.avatar/);
 assert.match(css,/#main-content \.pati-search-user-info strong/);
 assert.match(css,/#app-root:has\(\.pati-search-screen\)>\.mobile-header\{display:none!important/);
 assert.match(css,/#main-content #explore-search/);
});

test('Fotoğraf ve DM için native dosya izni sonrası uygulama içi galeri modülü çağrılır',()=>{
 const changes=app.slice(app.indexOf("document.addEventListener('change'"),app.indexOf('let lastPhotoTap=',app.indexOf("document.addEventListener('change'")));
 assert.match(changes,/input\?\.name==='dm_camera'\|\|input\?\.name==='dm_gallery'/);
 assert.match(changes,/if\(isGallery&&files\.length&&window\.PatiyizGalleryPicker\)/);
 assert.match(changes,/onConfirm:async selected=>/);
 assert.match(changes,/await sendDmImage\(selected\[0\]\)/);
 assert.match(changes,/input\.name==='photo'&&!cameraCapture/);
 assert.match(changes,/onConfirm:files=>/);
 assert.match(changes,/new DataTransfer\(\)/);
 assert.match(app,/name="dm_gallery" accept="image\/\*" multiple hidden/);
 const gal=html.indexOf('gallery-picker.js?v=20261024-search-gallery-1'),appjs=html.indexOf('app.js?v=20261024-search-gallery-1');
 assert.ok(gal>=0&&appjs>gal);
 assert.match(html,/patiyiz-inspired\.css\?v=20261024-search-gallery-1/);
 assert.doesNotMatch(gallery,/navigator\.mediaDevices\.getUserMedia|webkitGetAsEntry|showDirectoryPicker/);
});

test('Galeri seçimi kullanıcı seçtiği dosyaları ızgarada gösterip seçim numarası tutar',async()=>{
 class El{
  constructor(type){this.type=type;this.dataset={};this.className='';this.children=[];this.listeners={};this.attributes={};this.style={};this.disabled=false;this.textContent='';this.value='';}
  setAttribute(name,val){this.attributes[name]=val}
  append(...els){this.children.push(...els)}
  appendChild(el){this.children.push(el)}
  replaceChildren(...els){this.children=[...els]}
  remove(){this.removed=true}
  addEventListener(name,fn){this.listeners[name]=fn}
  closest(cls){return cls==='.pati-gallery-tile'&&this.className?.includes('pati-gallery-tile')?this:null}
  querySelector(k){return this.elements?.[k]||null}
 }
 const document={body:new El('body'),createElement:t=>{
  const el=new El(t);
  if(t==='div'){
   el.elements={'.pati-gallery-grid':new El('grid'),'.pati-gallery-continue':new El('button'),'.pati-gallery-hint':new El('p')};
  }
  return el;
 }};
 const revoked=[];
 const sandbox={window:{},document,URL:{createObjectURL:f=>'blob:'+f.name,revokeObjectURL:x=>revoked.push(x)},Number,Set,Array,String};
 vm.runInNewContext(gallery,sandbox);
 const files=[{name:'kedi.jpg',size:15,type:'image/jpeg'},{name:'kopek.png',size:20,type:'image/png'}];
 let confirmed;
 assert.equal(sandbox.window.PatiyizGalleryPicker.open(files,{multiple:true,max:10,onConfirm:arr=>{confirmed=arr}}),true);
 assert.equal(sandbox.window.PatiyizGalleryPicker.active,true);
 const root=document.body.children[0],grid=root.elements['.pati-gallery-grid'];
 assert.equal(grid.children.length,2);
 assert.equal(grid.children[0].children[1].textContent,'1');
 const target=grid.children[1];await root.listeners.click({target});
 assert.equal(grid.children.length,2);
 assert.equal(grid.children[1].attributes['aria-pressed'],'false');
 const confirm=root.elements['.pati-gallery-continue'];
 await root.listeners.click({target:{closest:selector=>selector==='[data-gallery]'?{dataset:{gallery:'confirm'},disabled:false,textContent:'Devam et'}:null}});
 assert.equal(confirmed.length,1);assert.equal(confirmed[0].name,'kedi.jpg');
 assert.equal(sandbox.window.PatiyizGalleryPicker.active,false);
 assert.deepEqual(revoked,['blob:kedi.jpg','blob:kopek.png']);
});

test('Fotoğraflar galeri izni olmadan okunmaz, dialog mobil ekranla sınırlıdır',()=>{
 assert.match(gallery,/Array\.from\(files\|\|\[\]\)/);
 assert.match(gallery,/URL\.createObjectURL\(f\)/);
 assert.match(gallery,/URL\.revokeObjectURL\(url\)/);
 assert.match(gallery,/class="pati-gallery-grid"/);
 assert.match(gallery,/class="pati-gallery-check"/);
 assert.match(gallery,/role="dialog" aria-modal="true"/);
 assert.match(css,/\.pati-gallery-overlay\{position:fixed/);
 assert.match(css,/\.pati-gallery-grid\{display:grid;grid-template-columns:repeat\(4/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 new vm.Script(gallery);
 new vm.Script(app);
});
