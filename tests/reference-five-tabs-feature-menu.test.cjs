const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');

function excerpt(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,start+' source range');
 return app.slice(a,b);
}

test('Ekran görüntüsündeki sıralama ve ortadaki siyah artı düğmesi kullanılır',()=>{
 let output='';
 const fab={hidden:false,style:{},dataset:{},setAttribute(){}};
 const dom={
  '#app-root>.mobile-fab':fab,
  '.nav-create':{hidden:false,style:{},dataset:{},setAttribute(){},innerHTML:''},
  '#pati-header-messages':{innerHTML:'',classList:{toggle(){}},setAttribute(){}},
  '#pati-header-notifications':{innerHTML:'',classList:{toggle(){}}},
  '#desktop-nav':{innerHTML:''},
  '#mobile-nav':{set innerHTML(x){output=x}}
 };
 const fn=vm.runInNewContext(excerpt('function navRender(){','function openMobileFeaturesMenu(){')+'\nnavRender',{
  $:s=>dom[s],view:'home',isAdmin:false,nav:[['home','Ana Sayfa','home']],
  current:()=>({id:'me'}),avatar:()=>'<img>',
  unreadCounts:()=>({messages:0,notifications:0}),countBadge:()=>'',ico:s=>'<svg>'+s+'</svg>'
 });
 fn();
 assert.deepEqual([...output.matchAll(/<small>([^<]+)<\/small>/g)].map(m=>m[1]),
  ['Akış','Keşfet','Paylaş','Reels','Profil']);
 assert.equal((output.match(/class="mobile-nav-btn/g)||[]).length,5);
 assert.match(output,/data-action="pati-create-open"/);
 assert.match(output,/class="mobile-nav-btn pati-create-nav"/);
 assert.match(output,/svg>search<\/svg>/);
 assert.match(output,/svg>reels-tab<\/svg>/);
 assert.equal(fab.hidden,true);
 assert.equal(fab.style.display,'none');
 assert.match(html,/symbol id="i-reels-tab"/);
 assert.match(css,/#app-root:not\(\.hidden\)>\.mobile-bottom>\.mobile-nav-btn\.pati-create-nav\{/);
 assert.match(css,/#app-root:not\(\.hidden\)>\.mobile-fab\[hidden\]/);
});

test('Mobil üst menü düğmesi tüm gerçek bölümlere erişim sağlar',()=>{
 const header=html.slice(html.indexOf('<header class="mobile-header">'),html.indexOf('</header>'));
 assert.match(header,/id="pati-header-menu"/);
 assert.match(header,/data-action="tools"/);
 assert.match(header,/aria-label="Tüm Özellikler menüsünü aç"/);
 const fragment=excerpt('function openMobileFeaturesMenu(){','function side(){');
 const known=['community','pets','messages','notifications','education','knowledge','lost','adoption','care','settings','blocked'];
 let rendered='';
 let type='',removed=false;
 const fn=vm.runInNewContext(fragment+'\nopenMobileFeaturesMenu',{
  isAdmin:false,
  esc:s=>String(s),ico:i=>'<svg>'+i+'</svg>',
  modal:(title,body,kind)=>{rendered=title+' '+body;type=kind},
  $:selector=>selector==='#tools-form .modal-footer'?{remove(){removed=true}}:null
 });
 fn();
 assert.equal(type,'tools-form');
 assert.match(rendered,/Tüm Özellikler/);
 for(const id of known)assert.match(rendered,new RegExp('data-view="'+id+'"'),'missing '+id);
 assert.equal(removed,true);
 assert.match(app,/case 'tools':openMobileFeaturesMenu\(\);break/);
 assert.match(app,/if\(v\)\{closePatiCreate\(\);profileId='';selectedPostId='';/);
 assert.match(css,/#tools-form \.pati-feature-group/);
});

test('Menüdeki yönetim bağlantısı yalnız doğrulanmış adminler için görünür',()=>{
 const fragment=excerpt('function openMobileFeaturesMenu(){','function side(){');
 const make=isAdmin=>{
  let rendered='';
  vm.runInNewContext(fragment+'\nopenMobileFeaturesMenu',{
   isAdmin,esc:String,ico:i=>i,
   modal:(_title,body)=>{rendered=body},$:()=>null
  })();
  return rendered;
 };
 assert.doesNotMatch(make(false),/data-action="open-admin"/);
 assert.match(make(true),/data-action="open-admin"/);
});

test('Güncel beşli menü ve CSS önbelleği aynı sürümü kullanır',()=>{
 assert.match(html,/patiyiz-inspired\.css\?v=20261024-wellness-insights-1/);
 assert.match(html,/app\.js\?v=20261024-wellness-insights-1/);
 assert.match(css,/#app-root>\.mobile-header \.pati-header-menu/);
});
