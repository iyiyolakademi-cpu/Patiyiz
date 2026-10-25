const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const part=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'Missing '+a);return app.slice(i,j)};

test('Follower list has server-side, 40-record pages and hydrates missing profiles',async()=>{
 const source=part('async function patiLoadFollowPage(','function followListPage(){');
 const entries=Array.from({length:85},(_,i)=>({follower_id:'f'+i,followee_id:'owner',created_at:new Date(Date.UTC(2026,0,1,0,0,i)).toISOString()}));
 const calls=[];
 const sb={from(table){return{
  select(fields){this.fields=fields;return this},
  eq(k,v){this.filter=[k,v];return this},
  order(){return this},
  in(k,ids){calls.push({table,action:'in',ids:[...ids]});return Promise.resolve({data:table==='profiles'?ids.map(id=>({id,display_name:id})):[],error:null})},
  range(lo,hi){calls.push({table,action:'range',lo,hi,filter:this.filter});return Promise.resolve({data:entries.slice(lo,hi+1),error:null})}
 }}};
 const sandbox={sb,me:{id:'viewer'},followListId:'owner',followListMode:'followers',
  PATI_FOLLOW_PAGE_SIZE:40,patiFollowerListState:null,patiFollowPageState:{key:'',rows:[],next:0,hasMore:true,loading:false,error:'',viewerFollowing:new Set()},
  patiyizLoadToken:0,view:'follows-list',data:{profiles:[]},followListPage(){},console,Map,Set,Promise};
 const load=vm.runInNewContext(source+'\npatiLoadFollowPage',sandbox);
 await load(true);await load();await load();
 assert.equal(sandbox.patiFollowPageState.rows.length,85);
 assert.equal(sandbox.data.profiles.length,85);
 assert.equal(sandbox.patiFollowPageState.next,85);
 assert.equal(sandbox.patiFollowPageState.hasMore,false);
 const r=calls.filter(c=>c.action==='range');
 assert.deepEqual(r.map(x=>[x.lo,x.hi]),[[0,39],[40,79],[80,119]]);
 assert.ok(r.every(x=>x.table==='follows'&&x.filter[0]==='followee_id'&&x.filter[1]==='owner'));
 assert.ok(!calls.some(c=>!['follows','profiles'].includes(c.table)));
});

test('Following list scopes the query to the selected profile and uses an explicit status lookup',()=>{
 const source=part('async function patiLoadFollowPage(','function followListPage(){');
 assert.match(source,/\.eq\(followers\?'followee_id':'follower_id',owner\)/);
 assert.match(source,/\.in\('followee_id',ids\)/);
 assert.match(source,/me\?\.id!==uid\|\|loadToken!==patiyizLoadToken\|\|patiFollowPageState!==state/);
 assert.match(source,/if\(missing\.length\)/);
 const page=part('function followListPage(){','function settingsPage(){');
 assert.match(page,/state\.rows/);
 assert.match(page,/data-action="followers-back"/);
 assert.match(page,/button\(state\.error\?'Yeniden dene':'Daha fazla kullanıcı yükle','follow-load-more'\)/);
 const nav=part('function navigate(to){','function userRow(');
 assert.match(nav,/if\(to==='follows-list'\)void patiLoadFollowPage\(true\)/);
});

test('Load-more queries only messages instead of refreshing all app tables',async()=>{
 const source=part('async function loadMore(key){','function formatPatiPostBody(');
 const queried=[];
 const ctx={pageLimits:{posts:40,messages:150,notifications:150},pageMore:{messages:true,notifications:true},
  data:{messages:[{id:'new',created_at:'2026-10-25T10:00:00Z'}],notifications:[]},
  me:{id:'u'},patiyizLoadToken:5,console,rendered:0,refreshed:0,
  navRender(){},render(){this.rendered++},async refresh(){this.refreshed++},
  sb:{from(table){queried.push(table);return{
   select(){return this},order(){return this},limit(){return this},lt(field,value){queried.push([field,value]);return this},
   then(ok,bad){return Promise.resolve({data:[{id:'old',created_at:'2026-10-25T09:00:00Z'}],error:null}).then(ok,bad)}
  }}}};
 const fn=vm.runInNewContext(source+'\nloadMore',ctx);
 await fn('messages');
 assert.equal(ctx.data.messages.length,2);
 assert.equal(ctx.pageLimits.messages,151);
 assert.equal(ctx.pageMore.messages,false);
 assert.equal(ctx.refreshed,0);
 assert.deepEqual(queried,['messages',['created_at','2026-10-25T10:00:00Z']]);
});

test('Paginated fetch failures restore page size and do not drop prior records',async()=>{
 const source=part('async function loadMore(key){','function formatPatiPostBody(');
 const ctx={pageLimits:{messages:150},pageMore:{messages:true},data:{messages:[{id:'safe',created_at:'2026-10-25T10:00:00Z'}]},
 me:{id:'u'},patiyizLoadToken:0,console,refresh(){},navRender(){},render(){},
 sb:{from(){return{select(){return this},order(){return this},limit(){return this},lt(){return this},then(ok,bad){return Promise.resolve({error:new Error('offline')}).then(ok,bad)}}}}};
 const fn=vm.runInNewContext(source+'\nloadMore',ctx);
 await assert.rejects(()=>fn('messages'),/offline/);
 assert.equal(ctx.pageLimits.messages,150);
 assert.equal(ctx.data.messages[0].id,'safe');
 assert.equal(ctx.pageMore.messages,true);
});

test('Session signout discards paginated follow state and follow action refreshes it',()=>{
 const session=part('function resetSessionState(){','async function boot(){');
 assert.match(session,/patiFollowPageState=\{key:'',rows:\[\],next:0,hasMore:true,loading:false,error:'',viewerFollowing:new Set\(\)\}/);
 const mutation=part('async function doToggle(','async function deleteOwnedMedia(');
 assert.match(mutation,/patiFollowPageState\.viewerFollowing\.delete\(rowKey\)/);
 assert.match(mutation,/if\(view==='follows-list'\)void patiLoadFollowPage\(true\)/);
});
