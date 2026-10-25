const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
test('Premium Academy user-facing route and scripts are retired',()=>{
 assert.doesNotMatch(app,/Premium Akademi|premiumPage\(|premiumPortal|case 'premium-/);
 assert.doesNotMatch(html,/premium-academy\.js|premium-stage8\.css/);
 assert.equal(fs.existsSync('premium-academy.js'),false);
 assert.equal(fs.existsSync('premium-stage8.css'),false);
});
test('Free Academy lessons remain available',()=>{
 assert.match(app,/function educationPage\(\)/);
 for(const f of ['academy-curriculum.js','academy-101-part1.js','academy-101-part2.js'])assert.ok(html.includes(f));
});
