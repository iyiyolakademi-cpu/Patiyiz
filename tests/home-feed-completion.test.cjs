const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const segment=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};

test('Ana akış eski 50 gönderiyi hedefli sorguyla alır; diğer tablolar yeniden yüklenmez',async()=>{
 const calls=[];
 const cursor={id:'00000000-0000-0000-0000-000000000010',created_at:'2026-10-25T12:00:00Z'};
 const rows=Array.from({length:50},(_,i)=>({id:'00000000-0000-0000-0000-'+String(i+30).padStart(12,'0'),created_at:new Date(Date.parse('2026-10-25T11:00:00Z')-i*1000).toISOString()}));
 const ctx={
  me:{id:'viewer'},patiyizLoadToken:7,
  pageLimits:{posts:40,messages:150,notifications:150},pageMore:{posts:true},
  data:{posts:[{...cursor},{id:'saved',created_at:'2020-01-01T00:00:00Z'}]},
  patiHomeFeedIds:new Set([cursor.id]),patiHomeFeedCursor:cursor,patiHomeLoadError:'', navRender(){},render(){},async refresh(){throw Error('Full refresh must not occur')},
  sb:{from(table){calls.push({table});return{
   select(){return this},
   order(column,opt){calls.push({order:column,asc:opt?.ascending});return this},
   limit(size){calls.push({limit:size});return this},
   or(where){calls.push({where});return Promise.resolve({data:rows,error:null})}
  }}}
 };
 const loadMore=vm.runInNewContext(segment('async function loadMore(key){','function formatPatiPostBody(')+'\nloadMore',ctx);
 await loadMore('posts');
 assert.equal(ctx.data.posts.length,52);
 assert.equal(ctx.patiHomeFeedIds.size,51);
 assert.equal(ctx.patiHomeFeedCursor.id,rows[49].id);
 assert.equal(ctx.pageLimits.posts,90);
 assert.equal(ctx.pageMore.posts,true);
 assert.equal(calls.filter(x=>x.table).length,1);
 assert.equal(calls[0].table,'posts');
 assert.match(calls.find(x=>x.where).where,/created_at\.lt\.2026-10-25T12:00:00Z/);
 assert.doesNotMatch(calls.find(x=>x.where).where,/2020-01-01/);
 assert.ok(calls.some(x=>x.order==='id'));
});

test('Gönderi yükleme hatasında önceki kartlar ve yükleme sınırı korunur',async()=>{
 const ctx={
  me:{id:'viewer'},patiyizLoadToken:3,
  pageLimits:{posts:40},pageMore:{posts:true},
  data:{posts:[{id:'one',created_at:'2026-10-25T12:00:00Z'}]},
  patiHomeFeedIds:new Set(['one']),patiHomeFeedCursor:{id:'one',created_at:'2026-10-25T12:00:00Z'},patiHomeLoadError:'',
  render(){},navRender(){},console,
  sb:{from(){return{select(){return this},order(){return this},limit(){return this},or(){return Promise.resolve({data:null,error:new Error('Bağlantı yok')})}}}}
 };
 const loadMore=vm.runInNewContext(segment('async function loadMore(key){','function formatPatiPostBody(')+'\nloadMore',ctx);
 await assert.rejects(()=>loadMore('posts'),/Bağlantı yok/);
 assert.equal(ctx.pageLimits.posts,40);
 assert.equal(ctx.data.posts.length,1);
 assert.match(ctx.patiHomeLoadError,/yüklenemedi/);
 assert.equal(ctx.pageMore.posts,true);
});

test('Ana sayfa kaydedilmiş ama akışa yüklenmemiş başka gönderiyi yanlışlıkla akışa katmaz',()=>{
 const data={posts:[
  {id:'newest',created_at:'2026-10-25T12:00:00Z'},
  {id:'saved-ancient',created_at:'2020-01-01T12:00:00Z'}]};
 const ctx={data,patiHomeContentMode:'media',blocked:new Set(),selectedPostId:'',main:{innerHTML:''},
  patiHomeFeedIds:new Set(['newest']),patiHomeLoadError:'',
  patiyizProgressCard:()=>'',storiesStrip:()=>'<section id="stories"></section>',patiLeaderBoard:()=>'',postCard:p=>'<article>'+p.id+'</article>',
  pageMore:{posts:false},patiyizLoadedTables:new Set(['posts']),empty:()=>'',button:()=>'',header:()=>''};
 const homepage=vm.runInNewContext(segment('function homePage(){','function explorePage(){')+'\nhomePage',ctx);
 homepage();
 assert.match(ctx.main.innerHTML,/<article>newest<\/article>/);
 assert.doesNotMatch(ctx.main.innerHTML,/saved-ancient/);
});

test('Fotoğraf sayacı kaydırarak ve oklarla ilerleyince aktif fotoğrafı gösterir',()=>{
 const func=vm.runInNewContext(segment('function patiUpdateCarouselCounter(','document.addEventListener(\'scroll\',event=>')+'\npatiUpdateCarouselCounter',{Math});
 const label={textContent:''};
 const box={querySelector:()=>label};
 const slides=[{clientWidth:300},{clientWidth:300},{clientWidth:300}];
 const track={clientWidth:300,scrollLeft:0,closest:()=>box,querySelectorAll:()=>slides};
 func(track);assert.equal(label.textContent,'1 / 3');
 track.scrollLeft=299;func(track);assert.equal(label.textContent,'2 / 3');
 track.scrollLeft=600;func(track);assert.equal(label.textContent,'3 / 3');
 track.scrollLeft=10000;func(track);assert.equal(label.textContent,'3 / 3');
 assert.match(app,/document\.addEventListener\('scroll',event=>/);
 assert.match(app,/patiUpdateCarouselCounter\(track\)/);
});

test('Ana sayfa hata durumunda yeniden deneme sunar ve sıralama kararlıdır',()=>{
 const homepage=segment('function homePage(){','function explorePage(){');
 assert.match(homepage,/home-retry/);
 assert.match(homepage,/patiHomeLoadError/);
 assert.match(homepage,/localeCompare\(String\(a\.id\)\)/);
 assert.match(app,/case 'home-retry':run\(\(\)=>refresh\(\)\)/);
 assert.match(app,/pageLimits=\{posts:40,messages:150,notifications:150\}/);
 const loader=segment("async function load(mode='all')",'async function refreshKeys(');
 assert.match(loader,/if\(table==='posts'\)req=req\.order\('id',\{ascending:false\}\)/);
 assert.match(loader,/patiHomeFeedIds=new Set\(val\.map\(p=>p\.id\)\)/);
});
