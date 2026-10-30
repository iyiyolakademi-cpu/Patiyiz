const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-crop-insights-mobile-final-20261029.css','utf8');
const index=fs.readFileSync('index.html','utf8');

test('Own story no longer offers any self-like action, even through stale callbacks',()=>{
 const frame=app.slice(app.indexOf('function showStoryFrame(){'),app.indexOf('async function syncStoryLike('));
 assert.doesNotMatch(frame,/pati-story-like-own/);
 assert.doesNotMatch(frame,/Hikâyeni beğen/);
 assert.match(frame,/x.author_id===me.id\?'<button type="button" class="story-delete"/);
 assert.match(frame,/x.author_id!==me.id\)void syncStoryLike\(x.id\)/);
 assert.match(app,/if\(!story\|\|story.author_id===me\?\.id\)return/);
 assert.match(frame,/aria-label="Hikâyeyi beğen"/); // other users keep the heart
});
test('Hareketler is in bottom-left row alongside Delete, not above it',()=>{
 const frame=app.slice(app.indexOf('function showStoryFrame(){'),app.indexOf('async function syncStoryLike('));
 assert.match(frame,/foot.appendChild\(viewers\);[\s\S]*?foot.appendChild\(deleteButton\)/);
 assert.doesNotMatch(frame,/row.appendChild\(viewers\)/);
 assert.match(css,/#story-overlay\.pati-story-own \.pati-own-story-footer\{[\s\S]*?justify-content:space-between!important/);
 assert.match(css,/#story-overlay\.pati-story-own \.pati-own-story-footer > \.story-viewers-button\{[\s\S]*?position:relative!important/);
 assert.match(css,/#story-overlay\.pati-story-own \.pati-own-story-stack > \.story-caption\{/);
 assert.match(css,/#story-overlay\.pati-story-own \.pati-own-story-footer > \.story-delete\{/);
});
test('Hide the visitor disclosure on other profiles without removing profile statistics',()=>{
 assert.doesNotMatch(app,/Profil ziyaretleri hesap sahibi tarafından görülebilir/);
 assert.match(app,/patiProfileLinksHTML\(p\)\+mutualMarkup/);
 assert.match(app,/data-pati-count="followers"/);
});
test('New main JS and CSS are cache-busted for iOS while parsing',()=>{
 assert.match(index,/own_story_activity_no_like=20261030/);
 assert.match(index,/activity_bottom_left_no_like=20261030/);
 assert.doesNotThrow(()=>new Function(app));
});
