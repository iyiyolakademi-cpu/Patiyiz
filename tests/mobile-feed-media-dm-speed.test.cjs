const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('patiyiz-inspired.css','utf8'),html=fs.readFileSync('index.html','utf8');
function part(start,end){const i=app.indexOf(start),j=app.indexOf(end,i+start.length);assert.ok(i>=0&&j>i,'source block: '+start);return app.slice(i,j)}

test('Medya gönderisinin üst bilgisi, görseli, etkileşimleri ve açıklaması Instagram benzeri sırada görünür',()=>{
 const code=part('function postCard(','function openPost(');
 const data={posts:[],likes:[{post_id:'a'}],comments:[{post_id:'a'}],pets:[]};
 const ctx={me:{id:'owner'},data,blocked:new Set(),liked:new Set(),saved:new Set(),
  userRow:()=>'<button class="pati-profile-row">Üye</button>',ico:n=>'<svg>'+n+'</svg>',
  profile:()=>({display_name:'Ayşe'}),displayName:()=>'<b>Ayşe</b>',
  esc:String,photo:(u,f,priority)=>'<figure data-eager="'+priority+'">'+u+'</figure>',
  day:()=> '24 Eki',formatPatiPostBody:s=>s,petIcon:()=>''};
 const fn=vm.runInNewContext(code+'\npostCard',ctx);
 const media=fn({id:'a',author_id:'owner',image_url:'https://example.org/pic.jpg',body:'Kedimin ilk günü',created_at:'2026-10-24'},true);
 for(const selector of ['pati-feed-card-header','pati-carousel','pati-social-actions','pati-post-details','pati-post-caption','pati-post-time','pati-post-more'])assert.ok(media.includes(selector),selector);
 assert.ok(media.indexOf('pati-feed-card-header')<media.indexOf('pati-carousel'));
 assert.ok(media.indexOf('pati-carousel')<media.indexOf('pati-social-actions'));
 assert.ok(media.indexOf('pati-social-actions')<media.indexOf('pati-post-caption'));
 assert.match(media,/data-eager="true"/);
 assert.doesNotMatch(media,/data-action="edit-post"|data-action="post-pin"|data-action="post-repost"/);
 const plain=fn({id:'b',author_id:'owner',body:'Sadece yazı',created_at:'2026-10-24'});
 assert.match(plain,/pati-feed-text-content/);
 assert.doesNotMatch(plain,/pati-carousel|pati-post-video/);
});

test('İlk fotoğraf hemen, sonraki fotoğraflar ihtiyaç oldukça yüklenir',()=>{
 const photo=vm.runInNewContext(part('const photo=','const starter=')+'\nphoto',{esc:String});
 assert.match(photo('a.jpg','',true),/loading="eager" decoding="async" fetchpriority="high"/);
 assert.match(photo('b.jpg'),/loading="lazy" decoding="async" fetchpriority="low"/);
 const home=part('function homePage(){','function explorePage()');
 assert.match(home,/list\.map\(\(p,i\)=>postCard\(p,i===0\)\)/);
});

test('Reels ekranında ilk video öncelikli hazırlanır; videonun tamamı kırpılmaz',()=>{
 const code=part('function reelsPage(){','function closePatiCreate()');
 const posts=[0,1,2].map(i=>({id:'p'+i,author_id:'owner',video_url:'https://example.com/v'+i+'.mp4',created_at:'2026-10-24',video_cover_url:'cover'+i+'.jpg'}));
 const main={innerHTML:''};
 const data={posts,likes:[],comments:[]};
 const ctx={main,data,blocked:new Set(),liked:new Set(),saved:new Set(),profile:()=>({id:'owner',display_name:'Test',handle:'test'}),
  avatar:()=>'<span></span>',displayName:()=>'<b>Test</b>',ico:n=>'<svg>'+n+'</svg>',esc:String,cut:s=>s};
 const fn=vm.runInNewContext(code+'\nreelsPage',ctx);fn();
 assert.equal((main.innerHTML.match(/class="pati-reel-video"/g)||[]).length,3);
 assert.match(main.innerHTML,/preload="auto"/);
 assert.match(main.innerHTML,/preload="metadata"/);
 assert.match(main.innerHTML,/preload="none"/);
 assert.match(main.innerHTML,/poster="cover0.jpg"/);
 const cssEnd=css.slice(css.indexOf('/* Instagram-inspired 2026 social feed'));
 assert.match(cssEnd,/#main-content \.pati-reels-viewport,/);
 assert.match(cssEnd,/height:calc\(100dvh - 132px/);
 assert.match(cssEnd,/object-fit:contain!important/);
 assert.match(cssEnd,/#main-content \.pati-reels-head\{display:none!important/);
});

test('Reels gözlemcisi komşu videoyu veri tasarruflu olarak hazırlıyor',()=>{
 const source=part('function setupReelsViewer(){','function reelTogglePlay(');
 const videos=[{preload:'auto',readyState:3,pause(){},play(){return Promise.resolve()},dataset:{}},{preload:'none',readyState:0,load(){this.loaded=true},pause(){},play(){return Promise.resolve()},dataset:{}}];
 let observerCb=null,opts=null;
 const doc={querySelectorAll:()=>videos,querySelector:()=>({})};
 const sandbox={patiyizReelsObserver:null,document:doc,window:{matchMedia:()=>({matches:false}),IntersectionObserver:function(){}},IntersectionObserver:function(cb,options){observerCb=cb;opts=options;this.observe=()=>{};this.disconnect=()=>{}}};
 const fn=vm.runInNewContext(source+'\nsetupReelsViewer',sandbox);fn();
 assert.equal(opts.rootMargin,'70% 0px 70% 0px');
 observerCb([{target:videos[1],isIntersecting:true,intersectionRatio:.1}]);
 assert.equal(videos[1].preload,'metadata');assert.equal(videos[1].loaded,true);
});

test('Sohbetlerde arama kutusu var ve medya erişim bağlantıları yeniden kullanılabiliyor',async()=>{
 const source=part('const patiDmSignedCache=new Map();','async function sendDmImage(');
 let calls=0;
 const element={dataset:{privatePath:'alice/snap.jpg'},isConnected:true,src:'',tagName:'IMG'};
 const ctx={Map,Promise,Date,document:{querySelectorAll:()=>[element]},me:{id:'alice'},
  sb:{storage:{from:()=>({createSignedUrl:async()=>{calls++;return{data:{signedUrl:'https://example.org/signed.jpg'}}}})}}};
 const load=vm.runInNewContext(source+'\nloadDmMedia',ctx);
 await load();await load();
 assert.equal(calls,1);
 assert.equal(element.src,'https://example.org/signed.jpg');
 assert.equal(element.decoding,'async');
 const dm=part('function messagesPage(){','function pushKeyBytes(');
 assert.match(dm,/id="pati-dm-search"/);
 assert.match(dm,/data-search=/);
 assert.match(dm,/chatSearch\?\.addEventListener\('input'/);
 assert.match(css,/#main-content \.pati-dm-searchbar/);
 assert.match(css,/#main-content \.pati-dm-layout \.bubble-chat/);
 assert.match(app,/patiDmSignedCache\.clear\(\);me=null/);
});

test('İlk oturum yalnız gerekli tabloları yükler ve medya ağırlıklı ekranları arka planda yeniden çizmez',()=>{
 const script=part('async function load(mode=', 'async function refreshKeys(');
 const m=script.match(/if\(mode==='initial'\)specs=specs\.filter\(\(\[table\]\)=>\[([^\]]+)\]/);
 assert.ok(m);
 assert.doesNotMatch(m[1],/patiyiz_reposts|patiyiz_post_pins|patiyiz_highlight_items|patiyiz_story_responses/);
 for(const essential of ['profiles','posts','post_likes','post_saves','comments','patiyiz_stories','messages','notifications'])assert.ok(m[1].includes("'"+essential+"'"));
 assert.match(app,/view!=='home'&&view!=='reels'&&!document\.activeElement/);
 assert.match(html,/rel="preconnect" href="https:\/\/tqnvvrgrsxrvzxbjbsgl\.supabase\.co"/);
});
