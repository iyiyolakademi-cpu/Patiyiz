const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const slice=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+1);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};

test('Alt menü eski isimlerin yerine gerçekten beş hedefi gösterir',()=>{
 const src=slice('function navRender(){','function side(){');
 let markup='',create={},desktop='';
 const dom={
  '#app-root>.mobile-fab':{hidden:true,style:{},dataset:{},setAttribute(){}},
  '.nav-create':{hidden:true,style:{},dataset:{},setAttribute(){},innerHTML:''},
  '#desktop-nav':{set innerHTML(v){desktop=v}},
  '#mobile-nav':{set innerHTML(v){markup=v}},
  '#pati-header-messages':{classList:{toggle(){}},setAttribute(){}},
  '#pati-header-notifications':{classList:{toggle(){}}}
 };
 const navRender=vm.runInNewContext(src+'\nnavRender',{$:sel=>dom[sel],view:'home',
   me:{id:'me'},nav:[['pets','Patiler','heart']],isAdmin:false,
   current:()=>({id:'me'}),avatar:()=>'<img src="avatar.jpg">',
   unreadCounts:()=>({messages:0,notifications:0}),countBadge:()=>'',ico:i=>'<svg>'+i+'</svg>'});
 navRender();
 const labels=[...markup.matchAll(/<small>([^<]+)<\/small>/g)].map(x=>x[1]);
 assert.deepEqual(labels,['Akış','Keşfet','Paylaş','Reels','Profil']);
 assert.match(markup,/data-view="reels"/);
 assert.doesNotMatch(markup,/data-view="pets"/);
 assert.match(markup,/data-action="pati-create-open"/);
 assert.match(desktop,/Patiler/);
 assert.equal(dom['#app-root>.mobile-fab'].hidden,true);
 assert.match(css,/#app-root:not\(\.hidden\)>\.mobile-fab\{/);
});

test('Patiler bölümü profil kayıtlarını gerçekten listeler ve sahibinin profilini açar',()=>{
 let markup='';
 const pets=[{id:'cat',owner_id:'me',name:'Pamuk',species:'Kedi',photo_url:'https://example.com/a.jpg'},
  {id:'dog',owner_id:'another',name:'Max',species:'Köpek',photo_url:'https://example.com/b.jpg'}];
 const f=vm.runInNewContext(slice('function petsPage(){','function knowledgePage(){')+'\npetsPage',{
  me:{id:'me'},data:{pets},blocked:new Set(),main:{set innerHTML(x){markup=x}},
  esc:s=>String(s),petIcon:s=>s==='Kedi'?'🐱':'🐶',ico:()=>'<svg></svg>'
 });
 f();
 assert.match(markup,/Benim Patilerim/);assert.match(markup,/Topluluktaki Patiler/);
 assert.match(markup,/Pamuk/);assert.match(markup,/Max/);
 assert.match(markup,/data-action="view-user" data-id="another"/);
 assert.match(markup,/data-action="pet-add"/);
 assert.match(markup,/loading="eager"/);
 assert.match(app,/pets:petsPage/);
});

test('Girişte ilk gönderi fotoğrafları lazy beklemeden hazırlanır',()=>{
 const feed=slice('function homePage(){','function explorePage(){');
 const explore=slice('function explorePage(){','function petsPage(){');
 assert.match(feed,/list\.map\(\(p,i\)=>postCard\(p,i<5\)\)/);
 assert.match(explore,/i<9\?'eager':'lazy'/);
 assert.match(explore,/i<3\?'fetchpriority="high"'/);
 assert.match(app,/loading="\$\{priority===true\?'eager':'lazy'\}"/);
});

test('Geç açılan Supabase gönderileri ana sayfada görünür hale gelir; medya yoksa yeniden çizim olmaz',async()=>{
 const show=slice('function showApp(){','const authBusy=');
 let rendered=0,loads=0,scrollRestored=0,resolveDelay;
 const data={posts:[],stories:[]};
 const loaded=new Set();
 const dom={classList:{add(){},remove(){}}};
 const ctx={starter(){},authRoot:dom,appRoot:dom,view:'home',me:{id:'same'},data,patiyizDeferredLoading:null,
  navigate(){},startLive(){},routePendingNotification(){},checkAdmin(){},navRender(){},render(){rendered++},
  patiyizLoadedTables:loaded,document:{activeElement:{matches:()=>false}},window:{scrollY:55,setTimeout:()=>{},scrollTo(opts){scrollRestored=opts.top}},
  requestAnimationFrame:cb=>cb(),console,setTimeout:cb=>{resolveDelay=cb},
  load:async()=>{loads++;data.posts=[{id:'new-post'}];loaded.add('posts')}
 };
 const run=vm.runInNewContext(show+'\nshowApp',ctx);run();
 assert.equal(rendered,0);assert.equal(typeof resolveDelay,'function');resolveDelay();
 await ctx.patiyizDeferredLoading;
 assert.equal(loads,1);
 assert.equal(rendered,1);
 assert.equal(scrollRestored,55);
});

test('Güncellenmiş css ve script eski alt menüyü önbellekten çağırmaz',()=>{
 assert.match(html,/patiyiz-inspired\.css\?v=20261024-photo-studio-1/);
 assert.match(html,/app\.js\?v=20261024-photo-studio-1/);
 assert.match(css,/\.pati-pets-grid/);
 assert.match(css,/#app-root:not\(\.hidden\)>\.mobile-fab\{/);
});
