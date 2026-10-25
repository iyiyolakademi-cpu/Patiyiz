const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const part=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};

test('Keşfet medya yüklemesi ilk 45 ve sonraki 45 kaydı yalnız gönderilerden getirir',async()=>{
 const rows=Array.from({length:94},(_,i)=>({id:'post-'+i,author_id:'me',image_url:'photo-'+i+'.jpg',created_at:new Date(Date.UTC(2026,9,25,1,0,94-i)).toISOString()}));
 const queries=[];
 const ctx={me:{id:'me'},patiyizLoadToken:8,view:'home',exploreTab:'media',console,Set,Map,Promise,
  PATI_EXPLORE_MEDIA_PAGE:45,patiExploreMedia:{owner:'',rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''},
  data:{posts:[],profiles:[{id:'me'}]},explorePage(){},
  sb:{from(table){queries.push({table});return{select(){return this},or(filter){queries.push({filter});return this},order(){return this},
   range(a,b){queries.push({a,b});return Promise.resolve({data:rows.slice(a,b+1),error:null})}}}}
 };
 const fn=vm.runInNewContext(part('async function patiExploreLoadMedia(','async function patiExploreLookup(')+'\npatiExploreLoadMedia',ctx);
 await fn(true);await fn();await fn();
 assert.equal(ctx.patiExploreMedia.rows.length,94);
 assert.equal(ctx.patiExploreMedia.hasMore,false);
 assert.equal(ctx.data.posts.length,94);
 assert.equal(ctx.patiExploreMedia.offset,94);
 assert.deepEqual(queries.filter(x=>'a'in x).map(x=>[x.a,x.b]),[[0,44],[45,89],[90,134]]);
 assert.ok(queries.every(q=>!q.table||q.table==='posts'));
 assert.ok(queries.some(q=>q.filter==='image_url.not.is.null,video_url.not.is.null'));
});

test('Arama hem kullanıcı adında hem görünen isimde sunucu sorgusu yapar',async()=>{
 const calls=[];
 const ctx={me:{id:'owner'},patiyizLoadToken:3,view:'home',exploreTab:'users',data:{profiles:[]},blocked:new Set(),
  patiExploreUsers:{},Map,Set,Promise,console,
  sb:{from(table){calls.push(table);return {select(){return this},ilike(field,val){calls.push([field,val]);return this},
   limit(){return Promise.resolve({data:[{id:'u1',handle:'patikedi',display_name:'Kedi dostu'}],error:null})}}}}
 };
 const fn=vm.runInNewContext(part('async function patiExploreLookup(','function patiExploreQueueSearch(')+'\npatiExploreLookup',ctx);
 await fn('kedi');
 assert.equal(ctx.patiExploreUsers.ready,true);
 assert.equal(ctx.patiExploreUsers.rows.length,1);
 assert.equal(ctx.data.profiles.length,1);
 assert.deepEqual(calls.filter(x=>Array.isArray(x)).map(x=>x[0]),['handle','display_name']);
 assert.ok(calls.every(c=>Array.isArray(c)||c==='profiles'));
});

test('Oturum değiştiğinde gecikmiş arama sonuçları yeni hesaba yazılmaz',async()=>{
 let release;
 const delayed=new Promise(resolve=>release=resolve);
 const ctx={me:{id:'owner'},patiyizLoadToken:1,view:'home',exploreTab:'users',data:{profiles:[]},blocked:new Set(),
  patiExploreUsers:{},Map,Set,Promise,console,
  sb:{from(){return {select(){return this},ilike(){return this},limit(){return delayed}}}}
 };
 const fn=vm.runInNewContext(part('async function patiExploreLookup(','function patiExploreQueueSearch(')+'\npatiExploreLookup',ctx);
 const pending=fn('patiler');
 ctx.me={id:'new-user'};ctx.patiyizLoadToken++;
 release({data:[{id:'from-old-user',handle:'patiler'}],error:null});
 await pending;
 assert.equal(ctx.data.profiles.length,0);
});

test('Keşfet başlangıcı üç sütunlu medya ızgarasıdır, kullanıcı araması isteğe bağlıdır',()=>{
 const src=part('function explorePage(){','function communityPage(){');
 assert.match(src,/pati-explore-media-screen/);
 assert.match(src,/pati-explore-gallery/);
 assert.match(src,/data-action="pati-search-open"/);
 assert.match(src,/explore-more/);
 assert.match(src,/video_url/);
 assert.match(src,/i<9\?'eager':'lazy'/);
 assert.match(src,/i<3\?'fetchpriority="high"'/);
 assert.match(css,/#main-content \.pati-explore-media-screen \.pati-explore-gallery/);
 assert.match(app,/if\(to==='explore'&&previous!=='explore'\)void patiExploreLoadMedia\(true\)/);
 assert.match(app,/case 'pati-search-open':search='';exploreTab='users';explorePage\(\);requestAnimationFrame/);
 assert.match(app,/void patiExploreLookup\(''\)/);
});

test('Keşfet videoları görünene dek yüklenmez ve açılan gönderiden Keşfet’e dönülür',()=>{
 const src=part('function explorePage(){','function communityPage(){');
 assert.match(src,/preload="none" data-explore-preview/);
 const lazy=part('function patiExploreLazyVideos(){','function explorePage(){');
 assert.match(lazy,/new IntersectionObserver/);
 assert.match(lazy,/video\.preload='metadata'/);
 assert.match(app,/patiExploreReturnTo=view==='explore';selectedPostId=id;navigate\('home'\)/);
 assert.match(app,/case 'post-back':\{selectedPostId='';const back=patiExploreReturnTo\?'explore':'home'/);
});
