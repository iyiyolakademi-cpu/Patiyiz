const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
function source(from,to){const a=app.indexOf(from),b=app.indexOf(to,a+from.length);assert.ok(a>=0&&b>a,from);return app.slice(a,b)}
test('Post Story and Reels use one native gallery and crop composer',()=>{
 const maker=vm.runInNewContext(source('function postMediaField(mode){','function openComposerMediaPicker(kind){')+'\npostMediaField',{});
 for(const mode of ['post','story','reels']){
  const ui=maker(mode);
  for(const shared of ['pati-post-media-gallery','pati-media-picker-actions','pati-media-gallery','pati-media-camera','name="video"'])assert.ok(ui.includes(shared),mode+': '+shared);
 }
 assert.match(source("function compose(post,mode='post',autoPick=true){",'function uploadStatus('),/f\.dataset\.mode=story\?'story'/);
 assert.match(source("function openStoryComposer(","async function renderEditedStoryFile("),/compose\(null,'story',autoPick\)/);
});
test('Reels retains multiclips while one story image and one video can be published',()=>{
 const media=source('function postMediaField(mode){','function openComposerMediaPicker(kind){');
 assert.match(media,/!story&&!reel\?'multiple'/);
 assert.match(media,/reel\?' multiple'/);
 assert.match(app,/patiGenerateVideoCover\(video\)/);
 assert.match(app,/video_url=await send\(video,'video'\)/);
 assert.match(source('function showStoryFrame(){','async function syncStoryLike('),/story-big-video/);
 assert.match(app,/case 'story-sound'/);
});
test('Premium Academy badges and certificates are retired but free education remains',()=>{
 assert.doesNotMatch(app,/Premium Akademi|premiumPage\(|achievementsPage\(|achievementPortal/);
 for(const path of ['premium-academy.js','achievements.js','premium-stage8.css'])assert.equal(fs.existsSync(path),false,path);
 assert.doesNotMatch(html,/premium-academy\.js|achievements\.js|premium-stage8\.css/);
 assert.doesNotMatch(native,/premium-academy\.js|achievements\.js/);
 assert.match(app,/function educationPage\(\)/);
});
test('Follower milestones remain available only from menu and PatiCoin rewards',()=>{
 const profile=source('function profilePage(){','function formField(');
 const menu=source('function openMobileFeaturesMenu(){','const patiCoinTasks=');
 assert.doesNotMatch(profile,/pati-follower-hint/);
 assert.match(menu,/Pati Mağaza/);\n assert.match(source('function patiShopPage(){','function patiCoinShowCheckout('),/paticoin-rewards/);
 assert.match(source('function patiRewardsPage(){','let patiShopFilter='),/renderPanel\(patiFollowerRewardState/);
});
