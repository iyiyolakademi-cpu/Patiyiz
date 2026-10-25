const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const part=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'Boundary missing '+a);return app.slice(i,j)};

test('Feed/Reels counters use one index per render with blocked authors excluded',()=>{
 const code=part('function patiBuildPostStats(','function render(){');
 const fn=vm.runInNewContext(code+'\npatiBuildPostStats',{Map});
 const likes=[{post_id:'p1'},{post_id:'p1'},{post_id:'p2'}];
 const comments=[{post_id:'p1',author_id:'a'},{post_id:'p1',author_id:'blocked'},{post_id:'p2',author_id:'a'}];
 const stats=fn(likes,comments,new Set(['blocked']));
 assert.equal(stats.get('p1').likes,2);
 assert.equal(stats.get('p1').comments,1);
 assert.equal(stats.get('p2').likes,1);
 assert.equal(stats.get('p2').comments,1);
 assert.equal(stats.get('not-there'),undefined);
 const render=part('function render(){','async function load(mode');
 assert.match(render,/patiPostRenderStats=\['home','reels','profile','explore','saved-posts'\]\.includes\(view\)\?patiBuildPostStats\(data.likes,data.comments,blocked\):null/);
 const card=part('function postCard(','function openPost(');
 assert.match(card,/indexed\.get\(p.id\)\?\.comments\|\|0/);
 assert.match(card,/indexed\.get\(p.id\)\?\.likes\|\|0/);
 const reel=part('function reelsPage(){','function closePatiCreate()');
 assert.match(reel,/cached\.get\(p.id\)\?\.likes\|\|0/);
 assert.match(reel,/cached\.get\(p.id\)\?\.comments\|\|0/);
});

test('Conversation index traverses messages once and preserves incoming/read counts',()=>{
 const source=part('function patiIndexDmHistory(','function messagesPage(){');
 const fn=vm.runInNewContext(source+'\npatiIndexDmHistory',{Map,Date});
 const rows=[
 {id:'m1',sender_id:'self',receiver_id:'alice',created_at:'2026-10-25T10:00:00Z',body:'hello'},
 {id:'m2',sender_id:'alice',receiver_id:'self',created_at:'2026-10-25T10:02:00Z',body:'hi'},
 {id:'m3',sender_id:'bob',receiver_id:'self',created_at:'2026-10-25T10:03:00Z',body:'yo'},
 {id:'m4',sender_id:'alice',receiver_id:'self',created_at:'2026-10-25T10:04:00Z',body:'seen',read_at:'2026-10-25T10:05:00Z'},
 {id:'m5',sender_id:'bob',receiver_id:'self',created_at:'2026-10-25T10:06:00Z',body:'hidden'},
 {id:'m6',sender_id:'other',receiver_id:'someone',created_at:'2026-10-25T10:07:00Z',body:'private'}];
 const indexed=fn(rows,'self',new Set(['m5']),new Set(['m2']));
 assert.equal(indexed.peers.size,2);
 assert.equal(indexed.unreadTotal,1);
 assert.equal(indexed.peers.get('alice').unread,0);
 assert.equal(indexed.peers.get('alice').last.id,'m4');
 assert.equal(indexed.peers.get('alice').incoming,true);
 assert.equal(indexed.peers.get('alice').items.length,3);
 assert.equal(indexed.peers.get('bob').last.id,'m3');
 assert.equal(indexed.peers.get('bob').unread,1);
 assert.equal(indexed.peers.has('other'),false);
});

test('Thousands of messages with hundreds of conversations are indexed without per-peer scans',()=>{
 const source=part('function patiIndexDmHistory(','function messagesPage(){');
 const fn=vm.runInNewContext(source+'\npatiIndexDmHistory',{Map,Date});
 const rows=Array.from({length:12000},(_,i)=>({id:'m'+i,sender_id:i%2?'self':'u'+(i%500),receiver_id:i%2?'u'+(i%500):'self',created_at:'2026-10-25T10:00:00Z',read_at:null}));
 const out=fn(rows,'self',new Set(),new Set());
 assert.equal(out.peers.size,500);
 assert.equal(out.unreadTotal,6000);
 assert.equal([...out.peers.values()].reduce((n,x)=>n+x.items.length,0),12000);
 const page=part('function messagesPage(){','function pushKeyBytes(');
 assert.match(page,/patiIndexDmHistory\(data.messages,me.id,hiddenIds,patiDmSeenIds\(\)\)/);
 assert.match(page,/peers\.get\(id\)/);
 assert.doesNotMatch(page,/all\.filter\(x=>x.sender_id===id/);
});

test('Feed video is not eagerly downloaded when far below screen',()=>{
 const card=part('function postCard(','function openPost(');
 assert.match(card,/isPriority\?'metadata':'none'/);
 assert.doesNotMatch(card,/isPriority\?'auto':'metadata'/);
 const observer=part('function setupFeedVideos(){',"document.addEventListener('visibilitychange'");
 assert.match(observer,/if\(video\.preload==='none'\)video\.preload='metadata'/);
});
