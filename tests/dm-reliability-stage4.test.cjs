const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-dm-inbox-20261025.sql','utf8');
function part(a,b){const start=app.indexOf(a),end=app.indexOf(b,start+a.length);assert.ok(start>=0&&end>start,a);return app.slice(start,end)}

test('Server inbox is security invoker, authenticated-only and excludes hidden messages',()=>{
 assert.match(sql,/security invoker/);
 assert.doesNotMatch(sql,/security definer/i);
 assert.match(sql,/from public\.messages m/);
 assert.match(sql,/not exists \([\s\S]*from public\.message_hidden h/);
 assert.match(sql,/revoke all on function public\.patiyiz_dm_inbox\(integer,integer\) from public,anon/);
 assert.match(sql,/grant execute on function public\.patiyiz_dm_inbox\(integer,integer\) to authenticated/);
 assert.match(sql,/row_number\(\) over\(partition by peer/);
 assert.match(sql,/limit greatest\(1,least\(coalesce\(p_limit,80\),100\)\)/);
});

test('Inbox: all older conversations remain discoverable beyond recent message cap',async()=>{
 const inboxes=Array.from({length:92},(_,i)=>({peer_id:'peer'+i,message_id:'id'+i,last_body:'hi',last_created_at:new Date(Date.UTC(2026,9,25,0,i)).toISOString(),unread_count:i===0?2:0,has_incoming:true}));
 const used=[];
 const ctx={
  me:{id:'me'},patiyizLoadToken:4,sb:{
   rpc:async(name,args)=>{used.push({name,args});return{data:inboxes.slice(args.p_offset,args.p_offset+args.p_limit)}},
   from:()=>({select(){return this},in(_key,ids){return Promise.resolve({data:ids.map(id=>({id,display_name:id}))})}})
  },data:{profiles:[]},view:'home',console,Map,Set,Promise,
  patiDmInbox:{owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''},
  PATI_DM_INBOX_PAGE:80, patiDmSafeRender(){},patiDmThreads:new Map()
 };
 const fn=vm.runInNewContext(part('async function patiDmLoadInbox(','async function patiDmLoadThread(')+'\npatiDmLoadInbox',ctx);
 await fn(true,true);await fn(false,true);
 assert.equal(ctx.patiDmInbox.rows.length,92);
 assert.equal(ctx.patiDmInbox.offset,92);
 assert.equal(ctx.patiDmInbox.hasMore,false);
 assert.equal(ctx.data.profiles.length,92);
 assert.deepEqual(used.map(x=>x.args.p_offset),[0,80]);
 assert.ok(used.every(x=>x.name==='patiyiz_dm_inbox'));
});

test('History: only chosen conversation is requested, with older cursor and no global reload',async()=>{
 const uid='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',peer='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
 const messages=Array.from({length:73},(_,i)=>({id:'msg'+i,sender_id:uid,receiver_id:peer,created_at:new Date(Date.UTC(2026,9,25,0,0,73-i)).toISOString()}));
 let calls=[],cur={};
 const ctx={me:{id:uid},patiyizLoadToken:5,personId:peer,view:'home',console,Map,Set,Promise,PATI_DM_THREAD_PAGE:50,
  patiDmThreads:new Map(),patiDmSafeRender(){},
  patiDmThreadKey:p=>uid+':'+p,
  sb:{from(table){cur={table};return{
    select(){return this},or(v){cur.filter=v;return this},order(){return this},
    limit(v){cur.limit=v;return this},lt(k,v){cur.older=v;return this},
    then(ok,bad){calls.push({...cur});return Promise.resolve({data:cur.older?messages.slice(50):messages.slice(0,50)}).then(ok,bad)}
  }}}
 };
 const fn=vm.runInNewContext(part('async function patiDmLoadThread(','function patiIndexDmHistory(')+'\npatiDmLoadThread',ctx);
 await fn(peer,false,true);await fn(peer,true,true);
 const state=ctx.patiDmThreads.get(uid+':'+peer);
 assert.equal(state.rows.length,73);
 assert.equal(state.hasMore,false);
 assert.equal(state.ready,true);
 assert.equal(calls.length,2);
 assert.ok(calls.every(c=>c.table==='messages'&&c.filter.includes('sender_id.eq.'+uid)&&c.filter.includes('receiver_id.eq.'+peer)));
 assert.ok(calls[1].older);
 assert.equal(calls[1].limit,50);
});

test('Realtime deletion removes cached rows and reconnect reloads inbox + conversation safely',()=>{
 const source=part('function patiDmRemoveCached(','function patiDmSafeRender(');
 assert.match(source,/state\.rows=state\.rows\.filter\(row=>row\.id!==id\)/);
 const live=part('function startLive(){','function refreshOnReturn(){');
 assert.match(live,/patiyiz_dm_deletion_events/);
 assert.match(live,/patiDmRemoveCached\(payload\.new\.message_id\)/);
 const reload=part('function queueLiveUpdate(){','function startLive(){');
 assert.match(reload,/await patiDmLoadInbox\(true,true\)/);
 assert.match(reload,/await patiDmLoadThread\(personId,false,true\)/);
 assert.match(reload,/previousInbox!==nextInbox/);
 assert.match(reload,/next\.focus\(\{preventScroll:true\}\)/);
 const online=part("window.addEventListener('online'","function resetSessionState(){");
 assert.match(online,/patiDmLoadInbox\(true\)/);
 assert.match(online,/patiDmLoadThread\(personId\)/);
});

test('Old message actions and read markers cover selected thread, not global message cap',()=>{
 const ui=part('function messagesPage(){','function pushKeyBytes(');
 assert.match(ui,/const thread=patiDmThreads\.get\(patiDmThreadKey\(personId\)\)/);
 assert.match(ui,/patiIndexDmHistory\(\[\.\.\.merged\.values\(\)\]/);
 assert.match(ui,/dm-thread-older/);
 assert.match(ui,/dm-inbox-more/);
 assert.match(app,/case 'dm-thread-older':void patiDmLoadThread\(personId,true\)/);
 assert.match(app,/const m=patiDmFindMessage\(id\)/);
 const read=part('async function markConversationRead(){','function unreadCounts(){');
 assert.match(read,/\.eq\('sender_id',personId\)\.eq\('receiver_id',me\.id\)\.is\('read_at',null\)/);
 assert.match(read,/unread\.forEach\(x=>x\.read_at=now\);/);
 const reset=part('function resetSessionState(){','async function boot(){');
 assert.match(reset,/patiDmThreads\.clear\(\)/);
 assert.match(reset,/patiDmInbox=\{owner:'',rows:\[\]/);
});
