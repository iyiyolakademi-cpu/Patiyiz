'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const choice=fs.readFileSync('patiyiz-explore-choice-20261101.js','utf8');
const css=fs.readFileSync('buchee-explore-phase2-20261103.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const explore=app.slice(app.indexOf('function explorePage(){'),app.indexOf('function communityPage(){',app.indexOf('function explorePage(){')));
test('explore has five clear sort controls without a redundant overflow menu',()=>{
 assert.match(choice,/Senin için/);
 assert.match(choice,/Yeni keşifler/);
 assert.match(choice,/Çok izlenen/);
 assert.match(choice,/Çok beğenilen/);
 assert.match(choice,/data-action="saved-posts"/);
 assert.match(choice,/data-action="pati-search-open"/);
 assert.doesNotMatch(choice,/pati-explore-custom-menu-wrap/);
 assert.doesNotMatch(choice,/createElement\('button'\).*saved-posts/);
 assert.match(choice,/native\.click\(\)/);
 assert.match(html,/patiyiz-explore-choice-20261101\.js\?v=20261103-phase2-v1/);
 assert.match(html,/patiyiz-explore-choice-20261101\.css\?v=20261103-phase2-v1/);
});
test('ranking is stable within the visit and recently opened posts are deprioritized',()=>{
 assert.match(choice,/const opened=new Map\(\)/);
 assert.match(choice,/const seed=Math\.floor\(Date\.now\(\)\/60000\)/);
 assert.match(choice,/a\.opened\*12/);
 assert.match(choice,/a\.opened>0/);
 assert.match(choice,/function diversify\(items\)/);
 assert.doesNotMatch(choice,/localStorage/);
 assert.doesNotMatch(choice,/\/180000/);
});
test('gallery shows each media post once, including a video without a separate video_url',()=>{
 const posts=[
  {id:'photo',author_id:'a',image_url:'p.jpg',created_at:'2026-11-02'},
  {id:'clip',author_id:'a',media_videos:['c.mp4'],created_at:'2026-11-03'},
  {id:'blocked',author_id:'blocked',image_url:'b.jpg',created_at:'2026-11-01'},
  {id:'text',author_id:'c',body:'only text',created_at:'2026-11-04'},
  {id:'photo',author_id:'a',image_url:'p.jpg',created_at:'2026-11-02'}
 ];
 const context={exploreTab:'media',me:{id:'me'},main:{innerHTML:''},data:{posts,profiles:[]},
  blocked:new Set(['blocked']),followed:new Set(['a']),esc:String,ico:()=>'<svg></svg>',empty:()=>'<p>Empty</p>'};
 const render=vm.runInNewContext(explore+'\nexplorePage',context);
 render();
 const body=context.main.innerHTML;
 assert.equal((body.match(/data-action="explore-open-post"/g)||[]).length,2);
 assert.match(body,/data-id="clip"/);
 assert.match(body,/data-explore-following="true"/);
 assert.match(body,/data-explore-author="a"/);
 assert.doesNotMatch(body,/data-id="blocked"/);
 assert.doesNotMatch(body,/only text/);
 assert.match(body,/role="img" aria-label="Video önizlemesi"/);
});
test('search has separate accessible actions for opening and removing a recent profile',()=>{
 assert.match(explore,/class="pati-search-user-row"/);
 assert.match(explore,/<button type="button" class="pati-search-remove"/);
 assert.doesNotMatch(explore,/<span class="pati-search-remove" role="button"/);
 assert.match(explore,/placeholder="Kullanıcı adı veya isim ara"/);
 assert.match(explore,/Henüz arama geçmişin yok/);
 assert.match(css,/min-height:44px/);
});
test('styles are scoped to Explore with three equal media columns',()=>{
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.pati-explore-media-screen/);
 assert.match(css,/\.pati-search-screen/);
 assert.match(css,/\.buchee-explore-switch/);
 new vm.Script(app);new vm.Script(choice);
});
