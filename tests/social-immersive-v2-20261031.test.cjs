const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-social-immersive-v2-20261031.css','utf8');
const html=fs.readFileSync('index.html','utf8');

function between(start,end){
 const i=app.indexOf(start),j=app.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'section missing: '+start);
 return app.slice(i,j);
}
test('Profile header shows @username for own and public profiles without losing menu',()=>{
 const profile=between('function profilePage(){','function formField(');
 assert.match(profile,/pati-profile-topbar-title/);
 assert.match(profile,/pati-profile-visitor-username/);
 assert.match(profile,/@'\+esc\(p\.handle\|\|'patiyiz'\)/);
 assert.match(profile,/class="pati-profile-menu-trigger" data-action="tools"/);
 assert.match(profile,/class="pati-profile-more-wrap"/);
 assert.match(profile,/button\('Hesabı bildir','report'/);
 assert.match(profile,/PatiCoin bakiyen/);
 assert.match(css,/\.pati-ig-profile :is\(\.pati-profile-topbar,\.pati-profile-visitor-topbar\)/);
});
test('Profile is white, three-column portrait grid is 3:4 with clean tile gaps',()=>{
 assert.match(css,/\.pati-ig-profile\{[\s\S]*?background:#fff!important/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/aspect-ratio:3 \/ 4!important/);
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/\.pati-ig-tabs/);
 assert.match(css,/pati-ig-stats/);
});
test('Home feed hierarchy is redesigned without disabling likes, comments or carousel',()=>{
 const post=between('function postCard(','function patiDetailCandidates(');
 for(const action of ['like','comment','pati-repost','share-post','save','carousel-prev','carousel-next'])
  assert.ok(post.includes('data-action="'+action+'"'),action+' lost');
 assert.match(css,/\.pati-feed-card-header/);
 assert.match(css,/\.pati-social-actions/);
 assert.match(css,/\.pati-post-details/);
 assert.match(css,/\.pati-post-caption/);
 assert.match(css,/\.pati-feed-text-only/);
 assert.match(css,/var\(--pati-social-surface/);
});
test('Reels video full bleeds; actionable rail is narrower while all controls remain',()=>{
 const reels=between('function reelsPage(){','function closePatiCreate()');
 for(const action of ['like','comment','pati-repost','share-post','save','reel-speed','reel-sound','reel-play','reel-seek'])
  assert.ok(reels.includes('data-action="'+action+'"'),action+' lost');
 assert.match(css,/\.pati-reel-item>\.pati-reel-video/);
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/width:46px!important;min-width:46px!important;max-width:46px!important/);
 assert.match(css,/button\.pati-reel-tool/);
 assert.match(css,/\.pati-reel-author/);
 assert.match(css,/\.pati-reel-caption/);
 assert.match(css,/@media\(max-height:650px\)/);
});
test('Story progress bars, caption, compact footer and close action use existing event API',()=>{
 const frame=between('function showStoryFrame(){','async function syncStoryLike(');
 for(const action of ['story-close','story-delete','story-viewers','story-like','story-prev','story-next']){
  assert.ok(frame.includes('data-action="'+action+'"'),action+' lost');
 }
 assert.match(frame,/story-progress/);
 assert.match(frame,/pati-own-story-footer/);
 assert.match(css,/\.story-progress>\.story-track/);
 assert.match(css,/height:3px!important/);
 assert.match(css,/\.story-player-head \.story-close/);
 assert.match(css,/\.pati-own-story-footer>\.story-viewers-button/);
 assert.match(css,/\.pati-own-story-footer>\.story-delete/);
 // The swipe-up behaviour must not accidentally revert.
 assert.match(app,/if\(diff<0\)\{if\(storyItems\[storyIndex\]\?\.author_id===me\.id\)showStoryViewers\(\)/);
});
test('New layer is loaded last, scripts parse and CSS safe areas remain valid',()=>{
 assert.match(html,/patiyiz-social-immersive-v2-20261031\.css\?v=1/);
 assert.ok(html.indexOf('patiyiz-social-immersive-v2-20261031.css?v=1')>html.indexOf('patiyiz-reels-controls-media-icons-20261031.css?v=1'));
 assert.doesNotMatch(css,/env\([^\n]*\) \+ \d+px\)/);
 assert.match(css,/calc\(env\(safe-area-inset-top/);
 new vm.Script(app);
 let braces=0;
 for(const char of css){if(char==='{')braces++;if(char==='}')braces--;assert.ok(braces>=0,'closing brace out of sequence')}
 assert.equal(braces,0,'CSS braces mismatch');
});
