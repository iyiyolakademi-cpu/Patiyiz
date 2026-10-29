const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const js=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-story-seen-dark-final-20261029.css','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const policy=fs.readFileSync('supabase/patiyiz-story-seen-viewer-policy-20261029.sql','utf8');
function between(a,b){
 const i=js.indexOf(a),j=js.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,'Expected code: '+a);
 return js.slice(i,j);
}
function fixture(){
 const source=between('/* Story rings track unseen ACTIVE story IDs','function patiPauseStoryBackgroundMedia(){')+
 '\n'+between('function storiesStrip(){','function openStory(');
 const storage=new Map();
 const now=Date.now();
 const day=new Date(now+3600000*6).toISOString();
 const story=(id,author,created)=>({id,author_id:author,created_at:created,expires_at:day,image_url:id+'.jpg'});
 const stories=[
  story('own-1','me','2026-10-29T13:00:00Z'),
  story('friend-a','alice','2026-10-29T12:00:00Z'),
  story('friend-b','alice','2026-10-29T13:10:00Z'),
  story('friend-c','bob','2026-10-29T12:15:00Z')
 ];
 const s={
  me:{id:'me'},data:{stories},blocked:new Set(),sb:null,view:'home',
  Date,Set,Map,Math,JSON,localStorage:{
   getItem:key=>storage.get(key)||null,
   setItem:(key,val)=>storage.set(key,val)
  },current:()=>({id:'me'}),profile:id=>({display_name:id}),
  avatar:()=>'<span class="avatar"></span>',esc:String,
  document:{getElementById:()=>null},console,
  render:()=>{},queueMicrotask
 };
 vm.createContext(s);
 vm.runInContext(source+'\nglobalThis.storyApi={storiesStrip,patiStorySeen,patiStoryIsSeen,patiHasUnseenStory,patiBuildLiveStorySequence,patiStorySeenInit}',s);
 return {s,story:stories,api:s.storyApi,storage};
}
test('Story ring marks own newly posted story as new then clears after preview without deleting story',()=>{
 const {story,api}=fixture();
 const before=api.storiesStrip();
 assert.match(before,/story-own-photo has-story/);
 assert.equal(api.patiHasUnseenStory('me'),true);
 api.patiStorySeen(story[0]);
 const after=api.storiesStrip();
 assert.match(after,/story-own-photo has-viewed-story/);
 assert.equal(api.patiHasUnseenStory('me'),false);
 assert.equal(story.length,4);
});
test('Viewed story stays in strip, moves to end, remaining new story retains ring',()=>{
 const {story,api}=fixture();
 api.patiStorySeen(story[3]);
 let markup=api.storiesStrip();
 assert.ok(markup.indexOf('data-id="bob"')>markup.indexOf('data-id="alice"'));
 assert.match(markup,/story-person has-viewed-story" data-action="story-view" data-id="bob"/);
 api.patiStorySeen(story[1]);
 assert.equal(api.patiHasUnseenStory('alice'),true);
 api.patiStorySeen(story[2]);
 assert.equal(api.patiHasUnseenStory('alice'),false);
 markup=api.storiesStrip();
 assert.match(markup,/data-id="alice"/);
 assert.match(markup,/data-id="bob"/);
});
test('Open from first unseen of selected account, never remove watched content',()=>{
 const {story,api}=fixture();
 api.patiStorySeen(story[1]);
 const sequence=api.patiBuildLiveStorySequence('alice');
 assert.equal(sequence.items[sequence.index].id,'friend-b');
 assert.ok(sequence.items.some(x=>x.id==='friend-a'));
});
test('Personal story receipts isolated by account and persisted, never leak to other user',()=>{
 const {story,api,s,storage}=fixture();
 api.patiStorySeen(story[1]);
 assert.ok(storage.get('patiyiz-story-seen:me').includes('friend-a'));
 s.me={id:'other'};
 api.patiStorySeenInit();
 assert.equal(api.patiStoryIsSeen(story[1]),false);
});
test('Story viewed flag sync is backed by the signed-in viewer RLS policy',()=>{
 assert.ok(js.includes(".from('patiyiz_story_views').select('story_id').eq('viewer_id',owner)"));
 assert.ok(policy.includes('FOR SELECT TO authenticated'));
 assert.ok(policy.includes('viewer_id=(SELECT auth.uid())'));
 assert.ok(!policy.includes('TO anon'));
});
test('Self reaction controls disabled in post, reel, DM and story while incoming DM reaction stays',()=>{
 assert.ok(js.includes('Kendi paylaşımına tepki veremezsin'));
 assert.ok(js.includes("p.author_id===me.id)?'disabled'"));
 assert.ok(js.includes('msg.sender_id===me.id||msg.receiver_id!==me.id'));
 assert.ok(js.includes('x.sender_id!==me.id?'));
 assert.ok(js.includes('data-action="dm-react-open"'));
 assert.ok(js.includes('data-action="dm-react-set"'));
 assert.ok(js.includes('data-action="story-like"'));
});
test('Main menu avoids home duplicates but Patiler remains discoverable in menu',()=>{
 const nav=between('const allowed=','const cfg=');
 assert.doesNotMatch(nav,/\['pets','Patiler','heart'\]/);
 const menu=between('function openMobileFeaturesMenu(){','const patiCoinTasks=');
 assert.doesNotMatch(menu,/\['messages','Mesajlar','message'\]/);
 assert.match(menu,/\['pets','Patileri keşfet','paw'\]/);
});
test('Final dark mode owns all common surfaces, text and forms without mutating media',()=>{
 for(const token of ['--pui-paper:#1a1c21','--pui-text:#f7f8fb',
  '.pati-profile-text-feed','.pati-dm-layout','.pati-feature-group',
  '.stories-section','input:not([type="checkbox"])','.pati-reel-item','filter:none!important'])
  assert.ok(css.includes(token),'Missing theme rule: '+token);
 const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(styles.at(-1).includes('patiyiz-crop-insights-mobile-final-20261029.css'));
 assert.match(native,/'patiyiz-story-seen-dark-final-20261029\.css'/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
