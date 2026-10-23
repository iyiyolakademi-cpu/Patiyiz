const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const style=fs.readFileSync('patiyiz-inspired.css','utf8');
const extract=(start,end)=>{const i=app.indexOf(start),j=app.indexOf(end,i+start.length);assert.ok(i>=0&&j>i,'Expected source: '+start);return app.slice(i,j)};

test('Paylaşım menüsü profesyonel SVG simgelerle ve doğru işlemlerle çalışır',()=>{
 for(const symbol of ['i-post-create','i-story-create','i-reels-create','i-gauge'])assert.match(html,new RegExp('<symbol id="'+symbol+'"'));
 for(const [act,symbol]of [['pati-create-post','i-post-create'],['pati-create-story','i-story-create'],['pati-create-reels','i-reels-create']]){
  const re=new RegExp('data-action="'+act+'"[^>]*>[\\s\\S]{0,180}#'+symbol);
  assert.match(html,re);
 }
 assert.match(style,/#pati-create-sheet \.pati-choice-icon svg\.icon/);
});
function progressFixture(storage=new Map()){
 const timeouts=[],nodes=[{removed:false,remove(){this.removed=true}}];
 const profile={avatar_url:'https://example.com/avatar.jpg',bio:'Patiler'};
 const data={pets:[],posts:[],stories:[],follows:[]};
 const ctx={Map,Set,Date,console,me:{id:'tester'},data,
  current:()=>profile,esc:String,ico:n=>'<svg>'+n+'</svg>',
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  setTimeout:(fn,ms)=>{timeouts.push({fn,ms});return timeouts.length},
  document:{querySelectorAll:sel=>sel==='.pati-onboarding-thanks'?nodes:[]}
 };
 const src=extract('const patiyizOnboardingThankYouUntil=','let patiyizReelsObserver=null;');
 const render=vm.runInNewContext(src+'\npatiyizProgressCard',ctx);
 return {render,data,ctx,storage,timeouts,nodes};
}
test('Görevler bitene dek liste gösterilir; tüm görevler tamamlanınca teşekkür çıkar ve silinir',()=>{
 const f=progressFixture();
 assert.match(f.render(),/pati-progress-card/);
 f.data.pets.push({owner_id:'tester'});
 f.data.posts.push({author_id:'tester'});
 f.data.stories.push({author_id:'tester'});
 const first=f.render();
 assert.doesNotMatch(first,/pati-progress-card/);
 assert.match(first,/Teşekkür ederiz!/);
 assert.match(first,/pati-onboarding-thanks/);
 assert.equal(f.storage.get('patiyiz-onboarding-finished-v1:tester'),'1');
 assert.equal(f.timeouts.length,1);
 assert.equal(f.timeouts[0].ms,4600);
 assert.match(f.render(),/Teşekkür ederiz!/);
 assert.equal(f.timeouts.length,1);
 f.timeouts[0].fn();
 assert.ok(f.nodes[0].removed);
 assert.equal(f.render(),'');
});
test('Teşekkür bildirimi aynı kullanıcı için sonraki oturumda tekrarlanmaz',()=>{
 const storage=new Map([['patiyiz-onboarding-finished-v1:tester','1']]);
 const f=progressFixture(storage);
 f.data.pets.push({owner_id:'tester'});
 f.data.posts.push({author_id:'tester'});
 f.data.stories.push({author_id:'tester'});
 assert.equal(f.render(),'');
 assert.equal(f.timeouts.length,0);
});
test('Reels simgeleri SVG olarak render edilir; beğeni ve kayıt durumu doğru görünür',()=>{
 const code=extract('function reelsPage(){','function closePatiCreate()');
 const main={innerHTML:''};
 const p={id:'post1',author_id:'member',video_url:'https://example.com/movie.mp4',body:'Oyun',created_at:new Date().toISOString()};
 const ctx={Date,main,data:{posts:[p],likes:[{post_id:'post1'}],comments:[{post_id:'post1'}]},
  blocked:new Set(),liked:new Set(['post1']),saved:new Set(['post1']),
  profile:()=>({id:'member',display_name:'Patiyiz Üyesi',handle:'pati'}),
  esc:String,cut:(s,len)=>String(s).slice(0,len),avatar:()=>'<span class="avatar"></span>',
  displayName:()=>'<b>Patili</b>',ico:n=>'<svg><use href="#i-'+(n==='message-circle'?'comment':n)+'"></use></svg>'};
 const render=vm.runInNewContext(code+'\nreelsPage',ctx);
 render();
 for(const icon of ['heart','comment','send','bookmark','gauge','volume-x'])assert.ok(main.innerHTML.includes('#i-'+icon),icon);
 for(const act of ['like','comment','share-post','save','reel-speed','reel-sound'])assert.ok(main.innerHTML.includes('data-action="'+act+'"'),act);
 assert.match(main.innerHTML,/pati-reel-action active" data-action="like"/);
 assert.match(main.innerHTML,/data-action="save"[^>]*aria-pressed="true"/);
 assert.match(main.innerHTML,/pati-reel-count">1/);
});
test('Reels ses düğmesi SVG simgesini korur ve erişilebilir durumunu günceller',()=>{
 const src=extract('function reelToggleSound(button){','function reelsPage(){');
 const video={muted:true};
 const attrs={};
 const button={innerHTML:'',closest:()=>({querySelector:()=>video}),setAttribute:(a,b)=>attrs[a]=b};
 const fn=vm.runInNewContext(src+'\nreelToggleSound',{ico:n=>'<svg>'+n+'</svg>'});
 fn(button);
 assert.equal(video.muted,false);
 assert.match(button.innerHTML,/volume/);
 assert.equal(attrs['aria-pressed'],'true');
 fn(button);
 assert.equal(video.muted,true);
 assert.match(button.innerHTML,/volume-x/);
 assert.equal(attrs['aria-pressed'],'false');
});
