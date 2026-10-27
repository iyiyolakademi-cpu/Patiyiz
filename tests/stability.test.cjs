const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');

const pick=(start,end)=>{
 const begin=app.indexOf(start),finish=app.indexOf(end,begin+start.length);
 assert.ok(begin>=0&&finish>begin,'Expected function source: '+start);
 return app.slice(begin,finish);
};
const loadSource=pick("async function load(mode='all')","async function refreshKeys(");
const mediaSource=pick("async function deleteOwnedMedia(record)","async function remove(");
const videoSource=pick("async function uploadVideo(file)","async function upload(file)");
const statsSource=pick("const profileCountCache=new Map()","function profilePage(){");

function fakeSelect(table,onRead){
 const q={from:table,start:0,end:249,select(){return this},order(){return this},
 range(a,b){this.start=a;this.end=b;return this},
 then(resolve,reject){return Promise.resolve(onRead(this.from,this.start,this.end)).then(resolve,reject)}};
 return q;
}
function makeLoadContext(){
 const keys=[...new Set([...app.matchAll(/\['[a-z_]+','([a-zA-Z]+)',\d+\]/g)].map(x=>x[1]))];
 const ctx={
  me:{id:'current'},data:Object.fromEntries(keys.map(k=>[k,[]])),
  pageLimits:{posts:100,messages:150,notifications:150},pageMore:{},
  patiyizLoadedTables:new Set(),patiyizLoadToken:0,Set,console,
  liked:new Set(),saved:new Set(),followed:new Set(),voted:new Set(),favorites:new Set(),blocked:new Set()
 };
 const calls=[],faults=new Set();
 ctx.sb={from(t){return fakeSelect(t,(table,start,end)=>{
  calls.push({table,start,end});
  if(faults.has(table))return {error:{message:'network unavailable'}};
  const length=table==='posts'?700:table==='profiles'?450:0;
  return {data:Array.from({length:Math.max(0,Math.min(end+1,length)-start)},(_,i)=>({id:table+'-'+(start+i),author_id:'current',user_id:'current',follower_id:'current',followee_id:'friend'}))};
 })}};
 const load=vm.runInNewContext(loadSource+'\nload',ctx);
 return {ctx,load,calls,faults};
}

test('Gerçek sorgu sınırları uygulanır, 5.000 satırlık gereksiz tarama yapılmaz',async()=>{
 const {ctx,load,calls}=makeLoadContext();
 await load('initial');
 const postCalls=calls.filter(x=>x.table==='posts');
 assert.deepEqual(postCalls.map(c=>[c.start,c.end]),[[0,99]]);
 assert.equal(ctx.data.posts.length,100);
 assert.equal(ctx.pageMore.posts,true);
 const profileCalls=calls.filter(x=>x.table==='profiles');
 assert.deepEqual(profileCalls.map(c=>[c.start,c.end]),[[0,249],[250,499]]);
 assert.equal(ctx.data.profiles.length,450);
});
test('Başarısız tablo sorgusu başarıyla yüklendi sayılmaz; tekrar denenebilir',async()=>{
 const {ctx,load,calls,faults}=makeLoadContext();
 faults.add('questions');
 await load('all');
 assert.equal(ctx.patiyizLoadedTables.has('questions'),false);
 faults.delete('questions');
 await load('deferred');
 assert.equal(ctx.patiyizLoadedTables.has('questions'),true);
 assert.equal(calls.filter(c=>c.table==='questions').length,2);
});
test('Profil sayaçları gerçek veritabanı count sonuçlarını yansıtır',async()=>{
 const labels={posts:{textContent:''},followers:{textContent:''},following:{textContent:''}};
 const container={querySelector(sel){const m=sel.match(/data-pati-count="([^"]+)"/);return labels[m?.[1]]||null}};
 const ctx={Set,Map,Date,console,me:{id:'owner'},view:'profile',profileId:'author',
 main:{querySelector(sel){return sel==='.pati-ig-stats'?container:null}},
 sb:{from(table){return {select(){return this},eq(field){this.field=field;return Promise.resolve({count:table==='posts'?18:this.field==='followee_id'?23:6})}}}}};
 const loadStats=vm.runInNewContext(statsSource+'\nsyncProfileCounts',ctx);
 await loadStats('author');
 assert.equal(labels.posts.textContent,18);
 assert.equal(labels.followers.textContent,23);
 assert.equal(labels.following.textContent,6);
});
test('Gönderi görselleri ve Reels kapakları yalnız dosya sahibince temizlenir',async()=>{
 const id='be82a90f-8d50-4921-a184-beea0b21a736';
 const origin='https://tqnvvrgrsxrvzxbjbsgl.supabase.co';
 const file=name=>origin+'/storage/v1/object/public/patiyiz-media/'+id+'/'+name;
 const removed=[];
 const ctx={URL,Set,console,me:{id},cfg:{supabaseUrl:origin},data:{posts:[],stories:[]},
 sb:{storage:{from(bucket){return {async remove(keys){removed.push({bucket,keys});return {error:null}}}}}}};
 const cleanup=vm.runInNewContext(mediaSource+'\ndeleteOwnedMedia',ctx);
 await cleanup({id:'post1',author_id:id,images:[file('one.jpg')],video_cover_url:file('cover.jpg'),image_url:'https://foreign.invalid/img.jpg'});
 assert.deepEqual(removed.map(x=>x.keys[0]),[id+'/one.jpg',id+'/cover.jpg']);
 await cleanup({id:'post2',author_id:'other',images:[file('secret.jpg')]});
 assert.equal(removed.length,2);
 ctx.data.posts.push({id:'other-post',image_url:file('shared.jpg')});
 await cleanup({id:'post3',author_id:id,images:[file('shared.jpg')]});
 assert.equal(removed.length,2);
});
test('Video yükleme geçici ağ hatasında bir kez daha denenir',async()=>{
 let tries=0;
 const ctx={navigator:{onLine:true},crypto:{randomUUID(){return '1234'}},me:{id:'current'},console,
 uploadStatus(){},setTimeout(fn){fn()},
 sb:{storage:{from(){return {async upload(){tries++;return tries===1?{error:{message:'network timeout'}}:{error:null}},getPublicUrl(){return {data:{publicUrl:'https://storage.invalid/success.mp4'}}}}}}}};
 const upload=vm.runInNewContext(videoSource+'\nuploadVideo',ctx);
 const url=await upload({name:'example.mp4',size:1200,type:'video/mp4'});
 assert.equal(tries,2);assert.equal(url,'https://storage.invalid/success.mp4');
 ctx.navigator.onLine=false;
 await assert.rejects(()=>upload({name:'example.mp4',size:1200,type:'video/mp4'}),/İnternet bağlantısı yok/);
 await assert.rejects(()=>upload({name:'too-big.mp4',size:30*1024*1024,type:'video/mp4'}),/15 MB/);
});
