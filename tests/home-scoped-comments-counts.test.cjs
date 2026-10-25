const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8'),sql=fs.readFileSync('supabase/patiyiz-home-post-counts-20261025.sql','utf8');
function part(a,b){const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing boundary '+a);return app.slice(i,j)}

test('Post counts SQL uses authenticated SECURITY INVOKER and preserves comment RLS',()=>{
 assert.match(sql,/security invoker/i);
 assert.doesNotMatch(sql.slice(sql.indexOf('language sql'),sql.indexOf('as $$')),/security definer/i);
 assert.match(sql,/from public\.posts p/);
 assert.match(sql,/from public\.post_likes l/);
 assert.match(sql,/from public\.comments c/);
 assert.match(sql,/revoke all on function public\.patiyiz_feed_post_counts\(uuid\[\]\) from public,anon/);
 assert.match(sql,/grant execute on function public\.patiyiz_feed_post_counts\(uuid\[\]\) to authenticated/);
});

test('Home count verification batches 125 posts into bounded calls and updates visible cards',async()=>{
 const ids=Array.from({length:125},(_,i)=>'post'+i),calls=[],shown=[];
 const ctx={
  me:{id:'viewer'},patiyizLoadToken:7,view:'home',Date,Set,Map,console,
  patiHomeCountCache:new Map(),patiHomeCountsLoading:new Set(),
  patiApplyHomePostCounts(id,row){shown.push([id,row.like_count,row.comment_count])},
  sb:{async rpc(fn,args){calls.push({fn,args});return{data:args.p_post_ids.map(id=>({post_id:id,like_count:12,comment_count:7}))}}}
 };
 const fn=vm.runInNewContext(part('async function patiSyncHomePostCounts(posts){','function homePage(){')+'\npatiSyncHomePostCounts',ctx);
 await fn(ids.map(id=>({id})));
 assert.deepEqual(calls.map(c=>c.args.p_post_ids.length),[60,60,5]);
 assert.ok(calls.every(c=>c.fn==='patiyiz_feed_post_counts'));
 assert.equal(ctx.patiHomeCountCache.size,125);
 assert.equal(shown.length,125);
 assert.equal(ctx.patiHomeCountsLoading.size,0);
 await fn(ids.map(id=>({id})));
 assert.equal(calls.length,3,'recent cached counters must not re-fetch on every render');
});

test('Only selected post comments are fetched in 100-record pages; no global cache truncate',async()=>{
 const uuid='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 const rows=Array.from({length:121},(_,i)=>({id:String(i+1).padStart(36,'0'),post_id:uuid,author_id:'a',body:'Yorum '+i,created_at:new Date(Date.parse('2026-10-25T12:00:00Z')-i*1000).toISOString()}));
 const calls=[];
 const ctx={me:{id:'owner'},sb:{from(table){calls.push({table});return{
  select(){return this},eq(col,id){calls.push({col,id});return this},order(){return this},limit(){return this},
  or(cursor){calls.push({cursor});return this},
  then(done,fail){const old=calls.some(x=>x.cursor);return Promise.resolve({data:old?rows.slice(100):rows.slice(0,100),error:null}).then(done,fail)}
 }}},patiyizLoadToken:0,patiPostCommentPages:new Map(),data:{comments:[{id:'other',post_id:'unrelated'}]},
  console,Date,Map,Set,Promise,document:{getElementById:()=>null},showComments(){throw Error('hidden modal should not redraw')}};
 const fn=vm.runInNewContext(part('async function patiFetchPostComments(postId,more=false){','function showComments(postId){')+'\npatiFetchPostComments',ctx);
 await fn(uuid);
 assert.equal(ctx.patiPostCommentPages.get(uuid).rows.length,100);
 assert.equal(ctx.patiPostCommentPages.get(uuid).hasMore,true);
 assert.ok(ctx.data.comments.some(x=>x.id==='other'),'other posts comments preserved');
 await fn(uuid,true);
 assert.equal(ctx.patiPostCommentPages.get(uuid).rows.length,121);
 assert.equal(ctx.patiPostCommentPages.get(uuid).hasMore,false);
 assert.ok(calls.some(x=>x.cursor),'older comments fetched by cursor');
 assert.ok(!calls.some(x=>x.table&&x.table!=='comments'));
});

test('Comment window uses post-scoped data and pagination while preserving its draft',()=>{
 const src=part('function showComments(postId){','function modal(');
 assert.match(src,/scoped\?\.ready\?scoped\.rows:data\.comments\.filter/);
 assert.match(src,/const draft=same\?previous\.querySelector/);
 assert.match(src,/comment-more/);
 assert.match(app,/case 'comment':showComments\(id\);void patiFetchPostComments\(id\)/);
 assert.match(app,/case 'comment-more':void patiFetchPostComments\(id,true\)/);
 assert.match(app,/patiPostCommentPages\.get\(postId\)/);
 assert.match(app,/patiHomeCountCache\.delete\(postId\)/);
 assert.match(app,/patiPostCommentPages\.clear\(\)/);
});
