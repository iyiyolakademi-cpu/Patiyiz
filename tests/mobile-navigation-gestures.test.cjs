const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function block(start,end){const i=app.indexOf(start),j=app.indexOf(end,i+start.length);assert.ok(i>=0&&j>i,'missing '+start);return app.slice(i,j)}

test('Mobil alt menüde beş erişilebilir sekme ve belirgin seçili sayfa bulunur',()=>{
 const markup=block('function navRender(){','function side(){');
 let nav='',sidebar='',topB={},topM={};
 const dom={
  '#app-root>.mobile-fab':{hidden:true,style:{},dataset:{},setAttribute(){}},
  '.nav-create':{hidden:false,style:{},dataset:{},setAttribute(){}},
  '#mobile-nav':{set innerHTML(v){nav=v},get innerHTML(){return nav}},
  '#desktop-nav':{set innerHTML(v){sidebar=v}},
  '#pati-header-messages':{innerHTML:'',classList:{toggle(){}},setAttribute(){}},
  '#pati-header-notifications':{innerHTML:'',classList:{toggle(){}}}
 };
 const ctx={view:'home',me:{id:'me'},isAdmin:false,nav:[['home','Ana sayfa','home'],['messages','Mesajlar','message']],current:()=>({id:'me'}),avatar:()=>'<span class="avatar"></span>',unreadCounts:()=>({messages:2,notifications:0}),countBadge:n=>String(n),ico:n=>'<svg>'+n+'</svg>',$:k=>dom[k]};
 const fn=vm.runInNewContext(markup+'\nnavRender',ctx);
 fn();
 assert.equal((nav.match(/class="mobile-nav-btn/g)||[]).length,5);
 for(const label of ['Akış','Keşfet','Paylaş','Reels','Profil'])assert.ok(nav.includes(label),label);
 assert.match(nav,/data-view="home"[^>]*aria-current="page"/);
 assert.match(nav,/data-view="reels"[^>]*aria-current="false"/);
 assert.match(nav,/pati-mobile-nav-glyph/);
 assert.match(nav,/data-action="pati-create-open"/);
 ctx.view='reels';fn();
 assert.match(nav,/data-view="reels"[^>]*aria-current="page"/);
 assert.match(nav,/data-view="home"[^>]*aria-current="false"/);
 assert.ok(sidebar.includes('messages'));
});

function navigationHarness(){
 const calls=[],main={
  classList:{added:[],removed:[],remove(x){this.removed.push(x)},add(x){this.added.push(x)}},
  offsetWidth:300
 };
 const reels={scrollTop:155,scrollTo:opts=>{calls.push(['reel-scroll-to',opts]);reels.scrollTop=opts.top}};
 const windowObj={scrollY:260,scrollTo:opts=>{calls.push(['window-scroll-to',opts]);windowObj.scrollY=typeof opts==='object'?opts.top:arguments[1]},
  matchMedia:q=>({matches:q.includes('max-width')})};
 const doc={getElementById:()=>main,querySelector:()=>reels,scrollingElement:{scrollTo(){} } };
 let renderCount=0;
 const context={Map,Set,allowed:['home','explore','reels','profile','messages','blocked'],view:'home',
  profileId:'',lastDetailView:'',followReturnList:false,search:'',articleId:'',exploreTab:'media',
  viewFlags:{},window:windowObj,document:doc,navRender:()=>{},side:()=>{},
  render:()=>{renderCount++},ensureViewData:()=>{},markConversationRead:()=>{},
  loadBlockedNames:()=>{},requestAnimationFrame:fn=>fn(),setTimeout:fn=>fn()};
 const src=block('const patiMobileTabScroll=new Map();','function userRow(');
 const navigate=vm.runInNewContext(src+'\nnavigate',context);
 return{navigate,context,windowObj,reels,calls,main,getRender:()=>renderCount};
}

test('Sekmeler değiştiğinde Akışın kaydırma konumu geri yüklenir',()=>{
 const f=navigationHarness();
 f.navigate('explore');
 assert.equal(f.context.view,'explore');
 assert.equal(f.getRender(),1);
 f.windowObj.scrollY=94;
 f.navigate('home');
 assert.equal(f.windowObj.scrollY,260);
 assert.equal(f.getRender(),2);
 assert.ok(f.main.classList.added.includes('pati-view-enter'));
 f.navigate('reels');
 assert.equal(f.reels.scrollTop,0);
 f.reels.scrollTop=390;
 f.navigate('home');
 f.navigate('reels');
 assert.equal(f.reels.scrollTop,390);
});

test('Aktif Akış veya Reels sekmesine tekrar basınca başa dönülür',()=>{
 const f=navigationHarness();
 f.navigate('home');
 assert.equal(f.getRender(),0,'resel does not redraw the feed');
 assert.equal(f.windowObj.scrollY,0);
 f.navigate('reels');
 f.reels.scrollTop=440;
 const before=f.getRender();
 f.navigate('reels');
 assert.equal(f.getRender(),before);
 assert.equal(f.reels.scrollTop,0);
});

test('Hikâyede yatay kaydırma ilerletir, dikey kaydırma kapatma davranışını korur',()=>{
 const src=block('let storyTouchY=null,storyTouchX=null;',"document.addEventListener('click',processClick);");
 const listeners={},calls=[];
 const context={document:{addEventListener:(name,fn)=>listeners[name]=fn},storyTouchY:null,storyTouchX:null,me:{id:'me'},storyItems:[{author_id:'other'}],storyIndex:0,
  stepStory:n=>calls.push(['step',n]),showStoryViewers:()=>calls.push(['viewers']),closeStory:()=>calls.push(['close'])};
 vm.runInNewContext(src,context);
 const target={closest:q=>q==='#story-overlay'?true:null};
 listeners.touchstart({target,touches:[{clientX:290,clientY:150}]});
 listeners.touchend({target,changedTouches:[{clientX:90,clientY:155}]});
 listeners.touchstart({target,touches:[{clientX:50,clientY:155}]});
 listeners.touchend({target,changedTouches:[{clientX:210,clientY:145}]});
 listeners.touchstart({target,touches:[{clientX:120,clientY:150}]});
 listeners.touchend({target,changedTouches:[{clientX:125,clientY:248}]});
 assert.deepEqual(calls,[['step',1],['step',-1],['close']]);
});

test('Mobil ekran geçişleri erişilebilir, kaydırma snap güvenli ve animasyonları kapatılabilir',()=>{
 assert.match(css,/#app-root>\.mobile-bottom\{/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/#app-root>\.mobile-bottom>\.mobile-nav-btn\.active::before/);
 assert.match(css,/#app-root>\.mobile-bottom>\.mobile-nav-btn:focus-visible/);
 assert.match(css,/#main-content\.pati-view-enter/);
 assert.match(css,/@keyframes pati-screen-enter/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/#app-root>\.mobile-fab\{display:none!important\}/);
 assert.match(css,/scroll-snap-stop:always/);
 assert.match(html,/id="mobile-nav"/);
});
test('Çift dokunarak beğenme ve iyimser sayaç güncellemesi korunur',()=>{
 assert.match(app,/function heartOnPhoto\(el\)/);
 assert.match(app,/lastPhotoTap\.id===el\.dataset\.postId/);
 assert.match(app,/run\(\(\)=>doToggle\('post_likes'/);
 assert.match(app,/pati-post-like-summary'\)\.forEach\(summary=>summary\.textContent=count\+' beğeni'/);
 assert.match(app,/aria-pressed="'\+liked\.has\(p\.id\)/);
});
