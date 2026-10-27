const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const between=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing '+a);return s.slice(i,j)};
test('Login does not show repeated vaccine/care/food reminder toasts',()=>{
 const fn=between(app,'function patiWellnessAlerts(){','async function patiWellnessFetch(');
 assert.doesNotMatch(fn,/notify\(/);
 assert.match(fn,/Do not display automatic vaccine/);
 const fetch=between(app,'async function patiWellnessFetch(','function patiWellnessDayKey()');
 assert.doesNotMatch(fetch,/setInterval\(\(\)=>\{if\(me&&document\.visibilityState/);
 assert.match(fetch,/patiyiz_pet_reminders/);
 assert.match(fetch,/patiyiz_pet_weights/);
 assert.match(app,/function patiWellnessRemindersFor\(/);
});
test('Feed calculates each post aspect ratio from media metadata rather than forcing 4:5',()=>{
 const helper=between(app,'function setupFeedMediaRatios(){','function setupFeedVideos(){');
 assert.match(helper,/videoWidth/);
 assert.match(helper,/videoHeight/);
 assert.match(helper,/loadedmetadata/);
 assert.match(helper,/naturalWidth/);
 assert.match(helper,/naturalHeight/);
 assert.match(helper,/img\.addEventListener\('load',update\)/);
 assert.match(helper,/track\.scrollLeft\/Math\.max\(1,track\.clientWidth\)/);
 assert.match(helper,/--pati-feed-aspect/);
 assert.match(app,/\)\(\);setupFeedMediaRatios\(\);setupFeedVideos\(\);setupReelsViewer\(\)/);
});
test('Portrait video fills feed width without black bars, square and landscape adapt too',()=>{
 const patch=css.slice(css.lastIndexOf('/* Feed media ratio fix:'));
 assert.ok(patch.length>900);
 assert.match(patch,/\.pati-video-frame\{[\s\S]*?aspect-ratio:var\(--pati-feed-aspect,9 \/ 16\)!important/);
 assert.match(patch,/\.pati-video-frame \.pati-post-video\{[\s\S]*?object-fit:cover!important/);
 assert.match(patch,/\.pati-video-frame \.pati-post-video\{[\s\S]*?background:transparent!important/);
 assert.match(patch,/\.pati-carousel\{[\s\S]*?aspect-ratio:var\(--pati-feed-aspect,4 \/ 5\)!important/);
 assert.match(patch,/\.pati-carousel-slide \.pati-photo\{[\s\S]*?aspect-ratio:auto!important/);
 assert.match(patch,/\.pati-reel-video\{[\s\S]*?object-fit:cover!important/);
});
test('Video lazily loads after intersection to avoid unnecessary Supabase bandwidth',()=>{
 assert.match(app,/data-pati-video-src/);
 assert.match(app,/const attach=video=>/);
 assert.match(app,/const playVideo=video=>/);
 assert.match(app,/new IntersectionObserver/);
});
test('New media layout and alert changes use a fresh URL cache version',()=>{
 assert.match(html,/patiyiz-inspired\.css\?v=[^"]*mediaratio=20261027/);
 assert.match(html,/app\.js\?v=[^"]*mediaratio=20261027/);
});