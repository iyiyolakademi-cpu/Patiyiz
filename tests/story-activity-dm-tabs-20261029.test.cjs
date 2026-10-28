const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const dmCss=fs.readFileSync('dm-fullscreen.css','utf8');
const activityCss=fs.readFileSync('patiyiz-story-community-carousel-20261028.css','utf8');
const index=fs.readFileSync('index.html','utf8');
test('own story movement is at the bottom-left and opens a complete activity view',()=>{
 assert.match(app,/async function showStoryViewers\(options=\{\}\)/);
 assert.match(app,/data-action="story-viewers"/);
 assert.match(app,/class="pati-story-activity-list"/);
 assert.match(app,/patiyiz_story_views/);
 assert.match(app,/patiyiz_story_likes/);
 assert.match(app,/pati-story-activity-avatar/);
 assert.match(app,/pati-story-view-like/);
 assert.match(activityCss,/#story-overlay \.story-viewers-button[\s\S]*?bottom:calc\(12px/);
 assert.match(activityCss,/#story-overlay \.story-viewers-sheet\{[\s\S]*?height:100%!important/);
 assert.match(activityCss,/#story-overlay \.story-viewers-sheet\[hidden\]\{display:none!important\}/);
});
test('story viewer profile and direct message actions still route through app navigation',()=>{
 assert.match(app,/case 'story-viewer-profile'/);
 assert.match(app,/case 'story-viewer-chat'/);
 assert.match(app,/data-action="story-viewer-chat"/);
 assert.match(app,/case 'story-viewers-close':/);
 assert.match(app,/pati-story-viewers-open/);
});
test('messages show five-tab navigation only in inbox; chat and group chat are full-screen',()=>{
 assert.match(dmCss,/\.pati-dm-layout\.mobile-chat-list\)>\.mobile-bottom\{[\s\S]*?display:flex!important/);
 assert.match(dmCss,/\.pati-dm-layout\.mobile-chat-open\)>\.mobile-bottom\{[\s\S]*?display:none!important/);
 assert.match(dmCss,/@media\(min-width:741px\)/);
 assert.match(app,/mobileChatOpen&&\(personId\|\|patiActiveGroupId\)\?'mobile-chat-open':'mobile-chat-list'/);
 assert.match(app,/case 'chat-back':/);
 assert.match(app,/case 'pati-group-open'/);
});
test('browser cache version changes for HTML app and styles without removing original feature assets',()=>{
 assert.match(index,/dm-tabs-20261029=1/);
 assert.match(index,/story-activity-20261029=1/);
 assert.match(index,/story-activity-dm-tabs=20261029/);
 assert.match(index,/src="app\.js\?/);
});
