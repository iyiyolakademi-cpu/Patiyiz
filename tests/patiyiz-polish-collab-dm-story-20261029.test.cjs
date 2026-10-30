const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-polish-collab-dm-story-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
test('New coauthor, timeline and story preview scripts preserve syntax',()=>new vm.Script(app));
test('Joint posts show two avatars and clickable names centered only after acceptance',()=>{
 assert.match(app,/function patiCollabHeader\(post,accepted\)/);
 assert.match(app,/if\(!accepted\?\.user_id\)return userRow\(post\.author_id,''\)/);
 assert.match(app,/class="pati-collab-dual-header"/);
 assert.match(app,/class="pati-collab-dual-avatars"/);
 assert.match(app,/class="pati-collab-dual-authors"/);
 assert.match(app,/patiCollabHeader\(p,collaborator\)/);
 assert.match(app,/function patiCollabAccepted\(postId\)/);
 assert.match(app,/x\.status==='accepted'/);
 assert.match(css,/grid-column:2!important/);
 assert.match(css,/justify-content:center/);
 assert.match(css,/\.pati-collab-dual-authors \.pati-collab-author/);
});
test('DM messages use chronological separators without altering message transport',()=>{
 const b=app.indexOf('function patiDmTimelineDivider(');
 const e=app.indexOf('\nfunction messagesPage()',b);
 assert.ok(b>=0&&e>b);
 const formatter=vm.runInNewContext(app.slice(b,e)+'\npatiDmTimelineDivider',{Intl,Date,esc:v=>String(v)});
 const msgs=[
  {created_at:'2026-10-29T00:30:00Z'},
  {created_at:'2026-10-29T00:31:00Z'},
  {created_at:'2026-10-29T01:14:00Z'}
 ];
 assert.match(formatter(msgs,0),/pati-dm-time-divider/);
 assert.equal(formatter(msgs,1),'');
 assert.match(formatter(msgs,2),/pati-dm-time-divider/);
 assert.match(app,/conv\.map\(\(x,i\)=>\x60\$\{patiDmTimelineDivider\(conv,i\)\}/);
 assert.match(app,/class="chat-form"/);
 assert.match(app,/class="bubble-chat/);
 for(const x of ['.chat-window','.chat-history','.bubble-chat.mine','.pati-dm-time-divider','.chat-form input[name="body"]'])assert.ok(css.includes(x),x);
});
test('Owner story preview only uses real authorized viewer records and shows a verified empty state',()=>{
 assert.match(app,/function patiStoryPreviewRender\(storyId\)/);
 assert.match(app,/async function patiStoryPreviewLoad\(storyId\)/);
 assert.match(app,/patiyiz_story_views'\)\.select\('viewer_id,last_viewed_at',\{count:'exact'\}\)/);
 assert.match(app,/\.eq\('story_id',storyId\)\.order\('last_viewed_at',\{ascending:false\}\)\.limit\(3\)/);
 assert.match(app,/if\(result\.total===0\)/);
 assert.match(app,/Henüz görüntüleyen yok/);
 assert.match(app,/Görüntüleyenler yükleniyor/);
 assert.match(app,/patiStoryPreviewCache\.set\(x\.id/);
 assert.match(app,/if\(x\.author_id===me\.id&&!x\.pati_pet_highlight\)void patiStoryPreviewLoad\(x\.id\)/);
 assert.match(app,/data-action="story-viewers"/);
 assert.match(app,/data-action="story-viewer-profile"/);
 assert.match(app,/data-action="story-viewer-chat"/);
 assert.match(app,/class="pati-story-view-last">Son görülme: <time/);
 assert.match(css,/\.pati-story-viewer-preview-stack/);
 assert.match(css,/\.pati-story-viewer-empty-paw/);
});
test('Polish light and dark colors, responsive and no filters over user media',()=>{
 assert.match(css,/html\[data-pati-theme="light"\]/);
 assert.match(css,/html\[data-pati-theme="dark"\]/);
 assert.match(css,/@media\(max-width:410px\)/);
 assert.match(css,/@media\(max-width:340px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/filter\s*:\s*(invert|grayscale)\(/);
});
test('Polished components load after the unified theme and ship to native',()=>{
 const sheets=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(sheets.some(x=>x.includes('patiyiz-crop-insights-mobile-final-20261029.css')), 'final profile and chat fixes should load last');
 assert.ok(sheets.findIndex(x=>x.includes('patiyiz-polish-collab-dm-story-20261029.css'))<sheets.findIndex(x=>x.includes('patiyiz-dm-content-studio-20261029.css')), 'new design follows and preserves existing theme');
 assert.match(native,/'patiyiz-polish-collab-dm-story-20261029\.css'/);
 assert.match(html,/collab_dual_dm_story_activity=20261029/);
});
