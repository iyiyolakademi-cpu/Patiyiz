'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('buchee-home-feed-phase1-20261103.css','utf8');
const home=app.slice(app.indexOf('function homePage(){'),app.indexOf('let savedPostsLoading=',app.indexOf('function homePage(){')));
const combined=app.slice(app.indexOf('/* Separate social media from tweet-like text'),app.indexOf("let patiFeedReelTarget='';"));
test('home keeps tab selection, renders two filters, and supports switching',()=>{
 assert.doesNotMatch(home,/patiHomeTab='all';/);
 assert.match(home,/data-action="home-feed-tab"/);
 assert.match(home,/\['following','Takip Ettiklerim'\]/);
 assert.match(home,/patiHomeCombinedFeed\(visiblePosts,true\)/);
 assert.match(app,/if\(!\['all','following'\]\.includes\(id\)\|\|patiHomeTab===id\)break/);
 assert.match(app,/!patiFollowingState\.error&&/);
});
test('text-first and following timelines only show relevant items',()=>{
 assert.match(app,/let patiHomeContentMode='text';/);
 assert.match(combined,/function patiHomeCombinedFeed\(posts,followingOnly=false\)/);
 assert.match(combined,/\(!followingOnly\|\|followed\.has\(q\.author_id\)\)/);
 assert.match(combined,/posts\.filter\(p=>!patiHomeIsMediaPost\(p\)\)/);
 assert.match(combined,/posts\.filter\(patiHomeIsMediaPost\)/);
 assert.match(combined,/patiHomePostWithRepost/);
});
test('empty timelines offer navigation without changing data or permissions',()=>{
 assert.match(combined,/data-view="explore"/);
 assert.match(combined,/data-action="pati-create-open"/);
 assert.match(combined,/followingOnly\?'Takip ettiklerinden henüz/);
});
test('mobile home refinements retain poll choices, five controls and safe tapping',()=>{
 assert.match(html,/buchee-home-feed-phase1-20261103\.css\?v=20261103v1/);
 assert.match(css,/\.pati-daily-inline-options button\{/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(css,/pati-save-action/);
 assert.match(css,/\[data-pati-screen="feed"\]/);
 assert.doesNotMatch(css,/\.pati-daily-inline-options\{\s*display:none/);
});
