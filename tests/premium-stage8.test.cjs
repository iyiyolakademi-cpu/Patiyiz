const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
test('Premium scripts and styles are absent from all public routes',()=>{
 assert.doesNotMatch(app,/premiumPage\(|premiumPortal|\['premium',/);
 assert.doesNotMatch(html,/premium-stage8\.css|premium-academy\.js/);
 assert.equal(fs.existsSync('premium-academy.js'),false);
 assert.equal(fs.existsSync('premium-stage8.css'),false);
});
test('Follower rewards and standard education survive feature retirement',()=>{
 assert.match(app,/function patiRewardsPage\(\)/);
 assert.match(app,/function educationPage\(\)/);
 assert.match(app,/patiyiz_my_follower_milestones/);
});
