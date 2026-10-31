const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const s=fs.readFileSync('app.js','utf8');
const part=(a,b)=>{let i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing '+a);return s.slice(i,j)};
test('Topluluk: kategori filtresi 82 soruyu 40+40+2 yükler',async()=>{
 const rows=Array.from({length:82},(_,i)=>({id:'q'+i,author_id:'u',category:'Sağlık',created_at:'2026-10-25T10:00:00Z'}));let ranges=[],filters=[];
 const ctx={me:{id:'viewer'},patiyizLoadToken:7,view:'home',communityCategory:'Sağlık',PATI_COMMUNITY_PAGE:40,
 patiCommunityPage:{owner:'',category:'',rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''},
 data:{questions:[],profiles:[{id:'u'}]},Map,Set,Promise,console,
 sb:{from(t){assert.equal(t,'questions');return{select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},range(a,b){ranges.push([a,b]);return Promise.resolve({data:rows.slice(a,b+1),error:null})}}}}};
 const fn=vm.runInNewContext(part('async function patiLoadCommunity(','async function patiLoadQuestionReplies(')+'\npatiLoadCommunity',ctx);
 await fn(true);await fn();await fn();
 assert.equal(ctx.patiCommunityPage.rows.length,82);
 assert.equal(ctx.patiCommunityPage.hasMore,false);
 assert.equal(ctx.data.questions.length,82);
 assert.deepEqual(ranges,[[0,39],[40,79],[80,119]]);
 assert.ok(filters.every(v=>v[0]==='category'&&v[1]==='Sağlık'));
});
test('Topluluk: her sorunun eski cevapları sadece o sorudan sayfalanır',async()=>{
 const all=Array.from({length:67},(_,i)=>({id:'r'+i,question_id:'q1',author_id:'u',created_at:'2026-10-25T10:00:00Z'}));let calls=[];
 const ctx={me:{id:'viewer'},patiyizLoadToken:1,view:'home',patiCommunityReplyPages:new Map(),data:{replies:[]},Map,Set,Promise,console,PATI_COMMUNITY_REPLY_PAGE:60,
 document:{querySelector(){return null}},
 sb:{from(t){calls.push(t);return{select(){return this},eq(k,v){calls.push([k,v]);return this},order(){return this},range(a,b){calls.push([a,b]);return Promise.resolve({data:all.slice(a,b+1),error:null})}}}}};
 const fn=vm.runInNewContext(part('async function patiLoadQuestionReplies(','function communityPage(){')+'\npatiLoadQuestionReplies',ctx);
 await fn('q1');await fn('q1',true);
 assert.equal(ctx.patiCommunityReplyPages.get('viewer:q1').rows.length,67);
 assert.equal(ctx.patiCommunityReplyPages.get('viewer:q1').hasMore,false);
 assert.ok(calls.every(x=>x==='replies'||Array.isArray(x)));
 assert.deepEqual(calls.filter(x=>Array.isArray(x)&&typeof x[0]==='number'),[[0,59],[60,119]]);
});
test('Topluluk: yükleme hatası kayıtları silmez ve tekrar denenebilir',async()=>{
 const initial={owner:'viewer',category:'Tümü',rows:[{id:'q1'}],offset:1,hasMore:true,ready:true,loading:false,error:''};
 const ctx={me:{id:'viewer'},patiyizLoadToken:0,view:'home',communityCategory:'Tümü',patiCommunityPage:initial,PATI_COMMUNITY_PAGE:40,Map,Set,Promise,console,
 data:{questions:[],profiles:[]},sb:{from(){return {select(){return this},order(){return this},range(){return Promise.resolve({error:new Error('offline')})}}}}};
 const fn=vm.runInNewContext(part('async function patiLoadCommunity(','async function patiLoadQuestionReplies(')+'\npatiLoadCommunity',ctx);
 await fn();assert.equal(initial.rows.length,1);assert.equal(initial.offset,1);assert.equal(initial.hasMore,true);assert.match(initial.error,/Tekrar/);
});
test('Topluluk: soru, kategori, oy, cevap ve bildir eylemleri korunur',()=>{
 const page=part('function communityPage(){','const knowledge=');
 for(const k of ["data-action=\"replies\"","data-action=\"report\"","community-filter","community-more","patiQuestionVoteButtons(q)"])assert.ok(page.includes(k),k);
 assert.match(s,/function patiQuestionVoteButtons\(q\)/);
 assert.match(s,/data-action="vote"/);
 assert.match(s,/data-action="vote-negative"/);
 const replies=part('function questionReplies(id){','/* Never display');
 assert.match(replies,/community-replies-more/);
 assert.match(replies,/const previous=(?:\$\('#reply-form'\)|document\.getElementById\('reply-form'\))/);
 assert.match(s,/case 'community-more':void patiLoadCommunity\(\)/);
 assert.match(s,/case 'replies':questionReplies\(id\);void patiLoadQuestionReplies\(id\)/);
 assert.match(s,/case 'community-filter':communityCategory=id;render\(\);void patiLoadCommunity\(true\)/);
 assert.match(s,/case 'question-form':\{const title=str\('title'\)/);
 assert.match(s,/case 'reply-form':\{/);
});
