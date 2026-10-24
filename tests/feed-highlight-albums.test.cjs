const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const section=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing '+a);return app.slice(i,j)};

test('PatiCoin profil kısayolları sarı yerine modern lavanta tonlarında',()=>{
 assert.match(css,/#main-content \.paticoin-profile-link button\{/);
 assert.match(css,/background:linear-gradient\(145deg,#edf1fa,#e9e6f6\)!important/);
 assert.match(css,/background:linear-gradient\(145deg,#f0ebf9,#e7eefa\)!important/);
 assert.match(css,/\.paticoin-profile-link button:nth-child\(2\)/);
});

test('İlk açılışta gönderiler ve hikâyeler önce gelir; ekrandan çıkmadan yeniden çizilir',()=>{
 const loader=section("async function load(mode='all')","async function refreshKeys(");
 const home=section('function homePage(){','function explorePage(){');
 const display=section('function showApp(){','const authBusy=');
 assert.match(loader,/mode==='initial'/);
 assert.match(loader,/mode==='feed'/);
 assert.match(loader,/patiyiz_highlight_albums/);
 assert.match(loader,/patiyiz_highlight_items/);
 assert.match(display,/await load\('feed'\);redraw\(initial,true\)/);
 assert.match(display,/await load\('deferred'\);redraw\(later\)/);
 assert.ok(display.indexOf("await load('feed')")<display.indexOf("await load('deferred')"));
 assert.match(home,/Gönderiler yükleniyor/);
 assert.match(home,/postCard\(p,i<5\)/);
 assert.match(html,/app\.js\?v=20261024-feed-highlights-1/);
});

test('Hikâyede sabitle yerine sol tarafta Öne çıkar düğmesi',()=>{
 const screen=section('function showStoryFrame(){','async function syncStoryLike(');
 assert.match(screen,/data-action="story-highlight-choose"/);
 assert.match(screen,/✦ Öne çıkar/);
 assert.doesNotMatch(screen,/data-action="story-highlight-toggle"/);
 assert.match(screen,/data-action="story-delete"/);
 assert.match(css,/\.story-fullscreen \.story-highlight-toggle/);
 assert.match(css,/left:14px!important/);
 assert.match(css,/\.story-fullscreen \.story-delete/);
 assert.match(css,/right:14px!important/);
});

test('Öne çıkar penceresinde mevcut 3-4 ayrı albüm ve yeni albüm seçeneği açılır',()=>{
 const code=section('function chooseStoryHighlight(storyId){','function manageHighlightAlbums(){');
 let title='',body='',kind='';
 const stories=[{id:'s1',author_id:'owner',image_url:'https://example.org/s1.png',is_highlight:false,caption:'Kedim'}];
 const albums=Array.from({length:4},(_,i)=>({id:'a'+i,owner_id:'owner',title:'Albüm '+(i+1)}));
 const ctx={data:{stories,highlightAlbums:albums,highlightItems:[]},me:{id:'owner'},
  storyTimer:null,clearTimeout(){},document:{querySelector(){return{remove(){}}}},
  modal:(t,b,k)=>{title=t;body=b;kind=k},esc:String,day:()=>'',cut:s=>s,
  Set,notify(){},console};
 const chosen=vm.runInNewContext(code+'\nchooseStoryHighlight',ctx);
 chosen('s1');
 assert.equal(title,'Hikâyeyi öne çıkar');assert.equal(kind,'highlight-picker-form');
 for(const alb of albums)assert.ok(body.includes(alb.title),alb.title);
 assert.equal((body.match(/data-action="story-highlight-album"/g)||[]).length,4);
 assert.match(body,/data-action="story-highlight-new"/);
 assert.match(body,/data-story="s1"/);
});

test('Sahip olduğu hikâye albüme kaydedilir, isteğin RLS koşuluyla uyumlu olması için önce kalıcı yapılır',async()=>{
 const code=section('async function addStoryToHighlightAlbum(storyId,albumId){','function manageHighlightAlbums(){');
 const story={id:'s1',author_id:'owner',is_highlight:false};
 const params=[],state={refreshes:0,notified:''};
 const sb={from(table){
  if(table==='patiyiz_stories'){
   return {update(row){
    params.push({table,row});
    const query={eq(){return query},then(onFulfilled){return Promise.resolve({error:null}).then(onFulfilled)}};
    return query;
   }};
  }
  if(table==='patiyiz_highlight_items'){
   return {async upsert(row,opts){params.push({table,row,opts});return {error:null}}};
  }
  throw Error('Wrong table '+table);
 }};
 const ctx={me:{id:'owner'},data:{stories:[story],highlightAlbums:[{id:'a1',owner_id:'owner',title:'Geziler'}]},storyItems:[],
  sb,closeModal(){},refresh:async()=>{state.refreshes++},notify:s=>state.notified=s,Error};
 const add=vm.runInNewContext(code+'\naddStoryToHighlightAlbum',ctx);
 await add('s1','a1');
 assert.equal(story.is_highlight,true);
 assert.equal(params[0].table,'patiyiz_stories');
 assert.equal(params[1].table,'patiyiz_highlight_items');
 assert.equal(params[1].opts.onConflict,'album_id,story_id');
 assert.equal(state.refreshes,1);assert.match(state.notified,/Geziler/);
 await assert.rejects(()=>add('s1','another'),/Hikâye veya albüm/);
});

test('Profilde bağımsız albümler yan yana kaydırılır, yeni albüm düğmesi ve eski hikâye içeriği korunur',()=>{
 const profile=section('function profilePage(){','function formField(');
 assert.match(profile,/data-action="highlight-album-new"/);
 assert.match(profile,/albums\.map\(/);
 assert.match(profile,/assignedIds/);
 assert.match(profile,/highlightItems/);
 assert.match(css,/scroll-snap-type:x proximity/);
 assert.match(css,/flex:0 0 77px!important/);
 assert.match(css,/pati-highlight-destinations/);
 assert.match(app,/case 'highlight-album-form':/);
 assert.match(app,/case 'highlight-album-add-form':/);
 assert.match(app,/case 'story-highlight-album'/);
});
