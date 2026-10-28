const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-story-view-time-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const a=app.indexOf('function patiStoryLastViewedLabel(');
const b=app.indexOf('\nfunction closeStory(',a);
if(a<0||b<0)throw Error('Timestamp formatter not found');
const formatter=vm.runInNewContext(app.slice(a,b)+'\npatiStoryLastViewedLabel;',{Date,Intl,Number,clearInterval(){}});
test('today: a viewer always shows the stored local time, to the minute',()=>{
 const today=new Date('2026-10-29T13:00:00Z');
 const time=formatter('2026-10-29T12:32:00Z',today.getTime());
 assert.match(time,/^\d{2}:\d{2}$/);
 assert.notEqual(formatter('2026-10-29T12:32:00Z',today.getTime()),formatter('2026-10-29T12:33:00Z',today.getTime()));
});
test('earlier dates: show date plus time, never pretend an old view happened today',()=>{
 const now=new Date('2026-10-29T13:00:00Z');
 const label=formatter('2026-10-27T11:15:00Z',now.getTime());
 assert.match(label,/27/);
 assert.match(label,/ · \d{2}:\d{2}$/);
 assert.equal(formatter('invalid',now.getTime()),'Saat bilgisi yok');
});
test('story views already use a secure server RPC, which refreshes last_viewed_at on each open',()=>{
 assert.match(app,/async function recordStoryView\(x\)/);
 assert.match(app,/sb\.rpc\('patiyiz_record_story_view',\{p_story_id:x\.id\}\)/);
 assert.match(app,/if\(!x\.pati_pet_highlight\)recordStoryView\(x\)/);
 assert.match(app,/\.from\('patiyiz_story_views'\)\.select\('viewer_id,last_viewed_at'\)\.eq\('story_id',x\.id\)\.order\('last_viewed_at',\{ascending:false\}\)/);
 assert.match(app,/class="pati-story-view-last">Son görülme: <time datetime="/);
 assert.match(app,/patiStoryLastViewedLabel\(v\.last_viewed_at\)/);
 assert.match(app,/class="pati-story-view-like"/);
});
test('visible movement list refreshes and preserves scroll, focus and other actions',()=>{
 assert.match(app,/async function showStoryViewers\(options=\{\}\)/);
 assert.match(app,/const silent=options\.silent===true/);
 assert.match(app,/setInterval\(\(\)=>\{if\(!document\.hidden\)void showStoryViewers\(\{silent:true\}\)\},20000\)/);
 assert.match(app,/sheet\.dataset\.patiStorySignature===signature/);
 assert.match(app,/if\(list\)list\.scrollTop=oldScroll/);
 assert.match(app,/button\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(app,/case 'story-viewers-close':\{patiStopStoryActivityRefresh\(\)/);
 assert.match(app,/function closeStory\(resume=true\)\{\s*patiStopStoryActivityRefresh\(\)/);
 assert.match(app,/data-action="story-viewer-profile"/);
 assert.match(app,/data-action="story-viewer-chat"/);
});
test('timestamp colors contrast in both light and dark mode, packaged with native build',()=>{
 assert.match(css,/#story-overlay \.pati-story-view-person>\.pati-story-view-last/);
 assert.match(css,/html\[data-pati-theme="dark"\] #story-overlay \.pati-story-view-person>\.pati-story-view-last/);
 assert.match(html,/patiyiz-story-view-time-20261029\.css\?v=1/);
 assert.match(html,/story-last-view-clock=20261029/);
 assert.match(native,/'patiyiz-story-view-time-20261029\.css'/);
});
