const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-direct-reposts-dm-media-20261030.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');

test('Repost tab renders full cards, including text, images and videos, rather than thumbnails',()=>{
 new vm.Script(app);
 const profile=app.slice(app.indexOf('function profilePage(){'),app.indexOf('function formField(',app.indexOf('function profilePage(){')));
 assert.match(profile,/profilePostsTab==='reposts'\?patiRepostedPosts\(p.id\)/);
 assert.match(profile,/const repostFeed=profilePostsTab==='reposts'/);
 assert.match(profile,/active\.map\(\(post,i\)=>'<div class="pati-profile-repost-item" role="article">'\+postCard\(post,i===0\)/);
 assert.match(profile,/profilePostsTab==='reposts'\?repostFeed/);
 assert.match(css,/\.pati-profile-reposts-feed/);
});
test('DM shared post shows original video with controls, photos, and text',()=>{
 const fn=app.slice(app.indexOf('function patiDmSharedCard(message){'),app.indexOf('async function patiDmHydrateSharedPosts(',app.indexOf('function patiDmSharedCard(message){')));
 assert.match(fn,/video_url\|\|videos\[0\]/);
 assert.match(fn,/controls playsinline webkit-playsinline preload="metadata"/);
 assert.match(fn,/pati-dm-shared-images/);
 assert.match(fn,/pati-dm-shared-text/);
 assert.match(fn,/data-action="dm-open-shared-post"/);
 assert.doesNotMatch(fn,/pati-dm-shared-placeholder/);
 assert.match(app,/media_videos,post_format,selfie_mirrored'\)\.in\('id',ids\)/);
 assert.match(app,/patiDmSharedPostId\(x.body\)\?' pati-dm-shared-message'/);
 assert.match(css,/\.pati-dm-shared-card \.pati-dm-shared-video/);
 assert.match(css,/html\[data-pati-theme="dark"\] \.pati-dm-shared-card/);
});
test('Web PWA and native Android both include the new media styles',()=>{
 assert.match(html,/patiyiz-direct-reposts-dm-media-20261030\.css\?v=1/);
 assert.match(html,/direct_share_media=20261030/);
 assert.match(native,/'patiyiz-direct-reposts-dm-media-20261030\.css'/);
});
