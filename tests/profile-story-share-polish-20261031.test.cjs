const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const colorful=fs.readFileSync('patiyiz-colorful-camera-chooser-20261031.css','utf8');
const ui=fs.readFileSync('patiyiz-share-profile-story-polish-20261031.css','utf8');
const media=fs.readFileSync('patiyiz-system-media.js','utf8');

test('Profile does not show extra back buttons and holds live PatiCoin by Edit profile',()=>{
 assert.match(app,/if\(view==='messages'\|\|view==='profile'\)return/);
 const profile=app.slice(app.indexOf('function profilePage(){'),app.indexOf('function formField('));
 assert.doesNotMatch(profile,/class="pati-profile-back"/);
 assert.match(profile,/Profili düzenle/);
 assert.match(profile,/PatiCoin bakiyen/);
 assert.match(profile,/pati-profile-balance/);
 assert.match(profile,/patiCoinState\.balance/);
 assert.match(app,/profileBalance\.textContent=Number\(patiCoinState\.balance/);
 assert.match(ui,/\.pati-profile-coin-balance/);
 assert.match(ui,/\.pati-ig-actions:has\(\.pati-profile-coin-balance\)/);
});
test('Inner page back controls share the same visual tokens',()=>{
 for(const selector of ['.pati-page-back','.pati-dm-inbox-back','.mobile-chat-back','.pati-story-activity-top button[data-action="story-viewers-close"]'])assert.ok(ui.includes(selector),selector);
 assert.match(ui,/min-height:44px!important/);
});
test('Own story viewer opens only on upward swipe',()=>{
 assert.match(app,/if\(diff<0\)\{if\(storyItems\[storyIndex\]\?\.author_id===me\.id\)showStoryViewers\(\)/);
 assert.doesNotMatch(app,/if\(diff>65&&Math\.abs\(diff\)>Math\.abs\(side\)\*1\.25\)\{if\(storyItems/);
});
test('Post menu removes direct story share, share modal offers it and top quick actions',()=>{
 const menu=app.slice(app.indexOf("case 'post-menu':"),app.indexOf("case 'collab-invite-open':"));
 assert.ok(menu.length>100);
 assert.doesNotMatch(menu,/pati-share-story|Hikâyemde paylaş/);
 const share=app.slice(app.indexOf('function openPatiShareModal('),app.indexOf('// Reconcile exact per-post totals'));
 assert.match(share,/pati-share-to-story/);
 assert.match(share,/data-action="pati-share-story"/);
 assert.ok(share.indexOf('preview+shareQuick+search')>=0);
 assert.match(app,/case 'pati-share-story':/);
 assert.match(ui,/\.pati-share-quick/);
});
test('Fullscreen share modal is closable at the top and the lower actions move up',()=>{
 assert.match(ui,/#modal-root:has\(#share-post-form\) \.modal-backdrop/);
 assert.match(ui,/height:100dvh!important/);
 assert.match(ui,/\.modal-header \.close-modal/);
 assert.match(ui,/#share-post-form \.pati-share-quick/);
 assert.match(app,/class="close-modal" data-action="close"/);
});
test('Only camera choice icons have colors, and crop affordance uses a crop icon',()=>{
 assert.match(colorful,/button\[data-system="camera-photo"\] \.pati-system-option-photo/);
 assert.match(colorful,/button\[data-system="camera-video"\] \.pati-system-option-video/);
 assert.match(colorful,/button\[data-system="gallery"\] \.pati-system-option-gallery/);
 assert.doesNotMatch(colorful,/\.pati-system-panel|\.pati-system-modes|radial-gradient/);
 assert.doesNotMatch(media,/✂ Fotoğrafı kırp ve düzenle/);
 assert.match(media,/pati-system-crop-icon/);
 assert.match(ui,/\.pati-system-crop-icon svg/);
});
test('Publish chime triggers only after successful publication notification',()=>{
 assert.match(app,/function patiPlayPublishChime\(\)/);
 assert.match(app,/context\.createOscillator\(\)/);
 assert.match(app,/if\(!bad&&\/\^Paylaşım yayınlandı/);
 assert.match(app,/notify\('Paylaşım yayınlandı\.'/);
});
test('New polish CSS is last in the web entrypoint',()=>{
 assert.ok(html.includes('patiyiz-share-profile-story-polish-20261031.css?v=1'));
 assert.ok(html.indexOf('patiyiz-share-profile-story-polish-20261031.css')>html.indexOf('patiyiz-colorful-camera-chooser-20261031.css'));
 for(const [name,css] of [['ui',ui],['colorful',colorful]]){
  let depth=0;for(const c of css){if(c==='{')depth++;if(c==='}')depth--;assert.ok(depth>=0,name+' premature brace');}assert.equal(depth,0,name+' unbalanced CSS');
 }
});
