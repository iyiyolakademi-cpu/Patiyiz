const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-profile-chat-repair-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
function between(a,b){
 const i=app.indexOf(a),j=app.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,'Missing source section: '+a);
 return app.slice(i,j);
}
test('Original Patiyiz five content sections are still available and individually filtered',()=>{
 assert.doesNotThrow(()=>new vm.Script(app));
 const section=between('function profilePage(){','function formField(');
 for(const kind of ['media','reels','videos','text','reposts']){
  assert.ok(section.includes("['"+kind+"',"),kind);
 }
 assert.match(section,/gridTabIcon/);
 assert.match(section,/reelsTabIcon/);
 assert.match(section,/videoTabIcon/);
 assert.match(section,/textTabIcon/);
 assert.match(section,/repostTabIcon/);
 assert.match(section,/profilePostsTab==='videos'/);
 assert.match(section,/profilePostsTab==='text'/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
});
test('Profile story ring appears only for an active story and opens the real story',()=>{
 const profile=between('function profilePage(){','function formField(');
 assert.match(profile,/liveProfileStory=stories\.some/);
 assert.match(profile,/pati-profile-has-story/);
 assert.match(profile,/pati-profile-story-view/);
 assert.match(profile,/data-action="story-view"/);
 assert.match(profile,/data-action="story-view" data-id=/);
 assert.match(profile,/data-action="story-create"/);
 assert.match(css,/linear-gradient\(35deg,#ffb831/);
 assert.match(css,/pati-profile-story-view:focus-visible/);
});
test('Chat header has no search control; voice contains sender avatar and playback',()=>{
 const messages=between('function messagesPage(){','function pushKeyBytes(');
 assert.doesNotMatch(messages,/data-action="dm-search-open"/);
 assert.doesNotMatch(messages,/data-action="dm-sticker-open"/);
 assert.doesNotMatch(messages,/data-action="dm-gif-open"/);
 assert.match(messages,/data-action="pati-dm-gallery-open"/);
 assert.match(messages,/name="dm_camera"/);
 assert.match(messages,/data-action="dm-record"/);
 assert.match(messages,/pati-dm-voice-card/);
 assert.match(messages,/avatar\(profile\(x\.sender_id\),'s'\)/);
 assert.match(messages,/class="pati-dm-audio"/);
 assert.match(css,/grid-template-columns:40px 46px minmax\(0,1fr\) auto/);
 assert.match(css,/pati-dm-voice-avatar/);
 assert.match(css,/filter:none!important/);
});
test('Insights stays inside dedicated dashboard and can recover from backend errors',async()=>{
 const section=between('function patiInsightsClose(){','function patiRecordProfileVisit(');
 const state={dialog:null,open:false};
 const dom={
  getElementById:()=>state.dialog,
  createElement:()=>({
   dataset:{},isConnected:true,innerHTML:'',className:'',setAttribute(){},
   addEventListener(){},querySelector(){return {focus(){}};},remove(){state.dialog=null;}
  }),
  body:{
   appendChild(dialog){state.dialog=dialog;},
   classList:{add(){state.open=true;},remove(){state.open=false;}}
  }
 };
 const ctx={
  document:dom,
  me:{id:'test-user'},view:'profile',profileId:'',
  sb:{rpc:async(name)=>name==='patiyiz_creator_insights'?
    {data:{views:10,likes:3,saves:1,reposts:0,daily:[]}}:{error:new Error('Demographics currently unavailable')}},
  console:{warn(){},error(){}},
  esc:String,
  patiInsightsMetric:x=>String(x),
  patiInsightsBarChart:()=>'<div>chart</div>',
  patiInsightsTrend:()=>[],
  patiMetric:x=>String(x),
  Intl,Number,Math,Date,Promise,Array,
 };
 vm.createContext(ctx);
 vm.runInContext(section+'\nglobalThis.testDashboard=patiCreatorInsights;globalThis.testClose=patiInsightsClose;',ctx);
 await ctx.testDashboard(30);
 assert.match(state.dialog.innerHTML,/Genel bakış/);
 assert.match(state.dialog.innerHTML,/Profil ziyaretleri/);
 assert.doesNotMatch(state.dialog.innerHTML,/İstatistikler yüklenemedi/);
 ctx.sb.rpc=async()=>({error:new Error('Temporarily offline')});
 await ctx.testDashboard(30);
 assert.match(state.dialog.innerHTML,/İstatistikler yüklenemedi/);
 assert.match(state.dialog.innerHTML,/data-action="pati-insights-period"/);
 ctx.testClose();
 assert.equal(state.dialog,null);
 assert.equal(state.open,false);
 assert.match(app,/case 'profile-posts-tab':patiInsightsClose\(\)/);
});
test('Final styles ship after preceding layers in web and Android',()=>{
 assert.match(html,/patiyiz-profile-chat-repair-20261029\.css\?v=1/);
 assert.match(native,/'patiyiz-profile-chat-repair-20261029\.css'/);
 const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(styles.at(-1).includes('patiyiz-creator-crop-20261029.css'));
 assert.match(html,/profile_chat_repair=20261029/);
});
