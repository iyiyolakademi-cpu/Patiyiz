const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const activeCSS=require('./helpers/active-css.cjs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-mobile-rewards-shop-20261025.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sql=fs.readFileSync('supabase/patiyiz-fidan-bagisi-20261025.sql','utf8');
const part=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing '+a);return app.slice(i,j)};
test('Hikâye görüntüleyicisinde bildir butonu yoktur; ana ekran sesi durur',()=>{
 const frame=part('function showStoryFrame(){','async function syncStoryLike(');
 assert.match(frame,/data-action="story-like"/);
 assert.doesNotMatch(frame,/data-kind="story" data-id/);
 assert.match(frame,/patiPauseStoryBackgroundMedia\(\)/);
 assert.match(app,/function patiPauseStoryBackgroundMedia\(\)/);
 assert.match(app,/document\.querySelectorAll\('video,audio'\)/);
 assert.match(app,/document\.getElementById\?\.\('story-overlay'\)/);
});
test('Hikâye oluşturma ekranında büyük boş önizleme ve anketler yoktur',()=>{
 const composer=part('function storyPhotoField(){','function imageField(');
 const open=part('function openStoryComposer(','async function renderEditedStoryFile(');
 assert.doesNotMatch(composer,/Hikâye önizlemesi burada görünecek/);
 assert.match(composer,/id="story-photo-preview" hidden/);
 assert.match(open,/return compose\(null,'story',autoPick\)/);
 const unified=part("function compose(post,mode='post',autoPick=true){",'function uploadStatus(');
 assert.match(unified,/postMediaField\(mode\)/);
 assert.match(unified,/openComposerMediaPicker\('gallery'\)/);
 assert.doesNotMatch(open,/name="interaction_mode"/);
 assert.match(css,/#story-form #story-photo-preview\[hidden\]/);
});
test('Tamamlanan coin görevleri listenin altına ayrılır ve mağaza fidan bağısını gösterir',()=>{
 const tasks=part('function patiRewardsPage(){','let patiShopFilter=');
 assert.match(tasks,/missionList\(group,true\)/);
 assert.match(tasks,/paticoin-done-zone/);
 assert.match(app,/patiShopFilter='all'/);
 assert.match(app,/p\.kind==='donation'/);
 assert.match(app,/value="environment" checked/);
 assert.match(sql,/fidan-bagisi/);
 assert.match(sql,/stock_available\)/);
});
test('Kalıcı hikâye rafı gizlenir, Keşfet popüler ve yeniler arasında geçer',()=>{
 assert.match(css,/#main-content \.pati-ig-highlight-section\{display:none!important\}/);
 assert.match(app,/patiExploreScore\(p,mode\)/);
 assert.match(app,/\['popular','Öne çıkanlar'\]/);
 assert.match(app,/\['views','Çok izlenen'\]/);
 assert.match(app,/\['likes','Çok beğenilen'\]/);
 assert.match(app,/case 'explore-sort'/);
 assert.ok(activeCSS(html,'patiyiz-mobile-rewards-shop-20261025.css'));
});
