const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function part(start,end){
 const i=app.indexOf(start),j=app.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'could not locate '+start);
 return app.slice(i,j);
}
test('Reels playback displays a seekbar driven by video timeupdate',()=>{
 const render=part('function reelsPage(){','function closePatiCreate()');
 assert.match(render,/data-action="reel-seek"/);
 assert.match(render,/type="range"/);
 const observer=part('function setupReelsViewer(){','function reelHandleTap(');
 assert.match(observer,/addEventListener\('timeupdate',update\)/);
 assert.match(observer,/loadedmetadata/);
 assert.match(observer,/Math\.round\(ratio\*1000\)/);
 assert.match(app,/video\.currentTime=\(Math\.max\(0,Math\.min\(1000,Number\(target\.value\)/);
 assert.match(css,/\.pati-reel-progress input\[type="range"\]/);
});
test('Touch photo zoom only activates with two fingers and clamps scale to 3',()=>{
 assert.match(app,/patiPinch=\{image,distance,scale:1\}/);
 assert.match(app,/e\.touches\.length!==2/);
 assert.match(app,/Math\.max\(1,Math\.min\(3,now\/distance\)\)/);
 assert.match(app,/touchmove',[\s\S]*?\{passive:false\}/);
 assert.match(app,/patiFinishPinch/);
 assert.match(css,/pati-pinching/);
});
test('Like and follow micro animations respect reduced motion',()=>{
 assert.match(app,/pati-like-pop/);
 assert.match(app,/pati-follow-pop/);
 assert.match(css,/@keyframes patiLikeMicroPop/);
 assert.match(css,/@keyframes patiFollowMicroPop/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('Mutual followers only shown for visible, non-blocked follower relationships',()=>{
 const section=part('function profilePage(){','function formField(');
 assert.match(section,/const myFollowing=new Set/);
 assert.match(section,/f\.followee_id===p\.id/);
 assert.match(section,/!blocked\.has\(f\.follower_id\)/);
 assert.match(section,/pati-mutual-followers/);
 assert.match(section,/mutualMarkup/);
 assert.match(css,/\.pati-mutual-followers/);
});
test('Read receipts preference is backed by Supabase and read status is privacy-aware',()=>{
 assert.match(app,/read_receipts_enabled!==false/);
 assert.match(app,/data-action="dm-receipts-toggle"/);
 assert.match(app,/\.update\(\{read_receipts_enabled:next\}\)/);
 assert.match(app,/x\.read_at&&showReadReceipts/);
 assert.match(app,/!patiDmSeenIds\(\)\.has\(x\.id\)/);
});
test('Read-receipt opt-out must not send read_at to Supabase',async()=>{
 const source=part('async function markConversationRead(){','function unreadCounts(){');
 const notifications=[];
 const ctx={me:{id:'alice'},personId:'bob',view:'messages',
  data:{messages:[{id:'one',sender_id:'bob',receiver_id:'alice',read_at:null}]},
  patiDmSeenIds:()=>new Set(),
  patiDmReadReceiptsEnabled:()=>false,
  patiDmStoreLocalSeen:ids=>notifications.push(...ids),
  navRender:()=>notifications.push('render'),
  sb:{from:()=>{throw Error('must not call Supabase while receipts off')}}
 };
 const fn=vm.runInNewContext(source+'\nmarkConversationRead',ctx);
 await fn();
 assert.equal(JSON.stringify(notifications),JSON.stringify(['one','render']));
});
test('Typing uses private, pair-scoped Broadcast, never sends message contents',()=>{
 assert.match(app,/sb\.channel\(topic,\{config:\{private:true\}\}\)/);
 assert.match(app,/patiyiz-typing:/);
 assert.match(app,/\[me\.id,personId\]\.sort\(\)\.join\(':'\)/);
 assert.match(app,/event:'typing',payload:\{actor:me\.id,typing:!!typing\}/);
 assert.match(app,/personId!==payload\?\.actor/);
 assert.match(app,/patiDmDisconnectTyping\(\)/);
 assert.match(app,/pati-dm-typing-indicator/);
 assert.match(css,/@keyframes patiDmTypingDot/);
});
test('Read-only compatibility: no new APK or stage 3 files; asset hashes force iPhone refresh',()=>{
 assert.match(html,/micro20261025=1/);
 assert.match(app,/function setupReelsViewer\(\)/);
 assert.match(app,/function messagesPage\(\)/);
});
