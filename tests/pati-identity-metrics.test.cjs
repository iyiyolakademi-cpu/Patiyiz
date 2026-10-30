const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'patiyiz-insights-metrics.js'),'utf8');
const context={window:{}};
vm.runInNewContext(src,context);
const m=context.window.PatiyizInsightsMetrics;
test('unknown metrics stay unknown rather than zero',()=>{
 assert.equal(m.count(null),null);
 assert.equal(m.count(undefined),null);
 assert.equal(m.count(''),null);
 assert.equal(m.count(0),0);
 assert.equal(m.count(5),5);
 assert.equal(m.change(null,10).direction,'unknown');
 assert.equal(m.change(10,null).label,'Veri yok');
});
test('real increase, decrease and new periods',()=>{
 assert.equal(m.change(20,10).direction,'increase');
 assert.equal(m.change(3,10).direction,'decrease');
 assert.equal(m.change(3,0).label,'Yeni');
});
test('follower net requires complete loss history',()=>{
 assert.equal(m.followerChange(10,4,false).net,null);
 assert.equal(m.followerChange(10,4,true).net,6);
});
test('Pati Kimliği is isolated and protects public route',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const page=fs.readFileSync(path.join(root,'pati-kimligi.html'),'utf8');
 const owner=fs.readFileSync(path.join(root,'pati-identity-owner.js'),'utf8');
 assert.ok(app.includes("'pati-identity':()=>"));
 assert.ok(page.includes('name="referrer" content="no-referrer"'));
 assert.ok(page.includes('name="robots" content="noindex,nofollow"'));
 assert.ok(owner.includes("window")||owner.includes("global.PatiyizPatiIdentity"));
});
