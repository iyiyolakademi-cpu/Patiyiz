const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'..','follower-milestones.js'),'utf8');
const ctx={window:{}};vm.runInNewContext(script,ctx);
const api=ctx.window.PatiyizFollowerMilestones;
test('five follower goals and rewards are defined',()=>{
 assert.deepEqual(Array.from(api.tiers,t=>t.need),[1000,5000,10000,50000,100000]);
 assert.deepEqual(Array.from(api.tiers,t=>t.coins),[100,300,700,1500,3000]);
});
test('rewards are marked earned only by the server claim ledger',()=>{
 assert.match(api.renderPanel(50000,[]),/Doğrulanıyor/);
 const html=api.renderPanel(50000,['followers_1000','followers_5000']);
 assert.equal((html.match(/is-earned/g)||[]).length,2);
 assert.match(html,/Elmas Pati/);
});
test('profile hint progress and finish state are stable',()=>{
 assert.match(api.profileHint(999),/1 takipçi kaldı/);
 assert.match(api.profileHint(5000),/10.000 takipçi/);
 assert.match(api.profileHint(100000),/Bütün/);
});
