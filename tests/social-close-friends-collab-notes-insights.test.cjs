const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const ext=fs.readFileSync('patiyiz-social-extras.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const span=(start,end)=>{
 const i=app.indexOf(start),j=app.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,start);
 return app.slice(i,j);
};
test('Only text-only close-friends posts can be created and selected',()=>{
 const composer=span('function compose(post,mode=', 'function uploadStatus(');
 const publish=span('async function createPostPublication(', 'async function createStoryPublication(');
 assert.match(composer,/name="audience"/);
 assert.match(composer,/Yakın Arkadaşlar/);
 assert.match(publish,/audience==='close_friends'&&\(hasVideo\|\|photoFiles\.length\)/);
 assert.match(publish,/const record=\{body,species:.*audience\}/);
 assert.match(app,/p\.audience==='close_friends'/);
 assert.doesNotMatch(span('function createStoryPublication(', 'function composeQuestion('),/audience:'close_friends'/);
});
test('New tables are fetched and available in the first authenticated paint',()=>{
 assert.match(app,/closeFriends:\[\],profileNotes:\[\],postCollabs:\[\]/);
 assert.match(app,/\['patiyiz_close_friends','closeFriends',500\]/);
 assert.match(app,/\['patiyiz_profile_notes','profileNotes',400\]/);
 assert.match(app,/\['patiyiz_post_collabs','postCollabs',500\]/);
 assert.match(app,/profileNotes:'patiyiz_profile_notes'/);
 assert.match(app,/window\.PatiyizSocial\?\.profileTools/);
 assert.match(app,/window\.PatiyizSocial\?\.collabProfilePosts/);
 assert.match(app,/window\.PatiyizSocial\?\.noteStrip/);
});
test('Close friends membership writes only owner-scoped rows and never grants media visibility',()=>{
 assert.match(ext,/owner_id:me\.id,friend_id:id/);
 assert.match(ext,/\.eq\('owner_id',me\.id\)\.eq\('friend_id',id\)/);
 assert.match(ext,/photoğraf ve video özel paylaşımı|Fotoğraf ve video özel paylaşımı/i);
 assert.match(ext,/data\.closeFriends=data\.closeFriends\.filter/);
 assert.match(css,/\.pati-close-badge/);
});
test('Collab asks for consent and only accepted collaborations appear on both profiles',()=>{
 assert.match(ext,/data\.postCollabs\.filter\(c=>c\.status==='accepted'/);
 assert.match(ext,/\.insert\(\{post_id:postId,collaborator_id:id,invited_by:me\.id,status:'pending'\}\)/);
 assert.match(ext,/\.eq\('collaborator_id',me\.id\)\.eq\('status','pending'\)/);
 assert.match(ext,/case 'collab-accept'/);
 assert.match(ext,/case 'collab-decline'/);
 assert.match(app,/data-social-action="collab-open"/);
});
test('Profile notes are temporary, audience-scoped, escaped and user-authored',()=>{
 assert.match(ext,/new Date\(n\.expires_at\)\.getTime\(\)>Date\.now\(\)/);
 assert.match(ext,/new Date\(Date\.now\(\)\+86400000\)/);
 assert.match(ext,/\['followers','close_friends'\]/);
 assert.match(ext,/onConflict:'author_id'/);
 assert.match(ext,/clean\(n\.body\)/);
 assert.match(app,/window\.PatiyizSocial\?\.profileNote/);
});
test('Professional insights use saved actual counts, never fake watch time',()=>{
 assert.match(ext,/patiyiz_post_view_totals/);
 assert.match(ext,/sb\.from\('post_likes'\)/);
 assert.match(ext,/sb\.from\('comments'\)/);
 assert.match(ext,/video izleme süresi veya tahmini erişim değildir/);
 assert.match(ext,/collabs\(postId\)/);
});
test('Native includes extras and iOS refreshes the app bundle',()=>{
 assert.match(native,/'patiyiz-social-extras\.js'/);
 assert.match(html,/social20261025=1/);
 assert.match(html,/patiyiz-social-extras\.js\?v=/);
 assert.ok(html.indexOf('app.js?')<html.indexOf('patiyiz-social-extras.js?'));
});
test('Social module initializes with safe, post-init methods',()=>{
 const listeners=[];
 const mock={
  window:{},document:{addEventListener:(name,fn,capture)=>listeners.push([name,fn,capture])},
  data:{profileNotes:[],postCollabs:[],closeFriends:[]},
  me:{id:'11111111-1111-1111-1111-111111111111'},
  blocked:new Set(),followed:new Set(),
  esc:s=>String(s),profile:id=>({id,display_name:'Viewer'}),
  avatar:()=>'',cut:s=>s
 };
 vm.runInNewContext(ext,mock);
 assert.ok(mock.window.PatiyizSocial);
 assert.equal(typeof mock.window.PatiyizSocial.profileTools,'function');
 assert.equal(typeof mock.window.PatiyizSocial.collabProfilePosts,'function');
 assert.equal(typeof mock.window.PatiyizSocial.openInsights,'function');
 assert.equal(mock.window.PatiyizSocial.collabProfilePosts('any').length,0);
 assert.equal(listeners.length,2);
});
