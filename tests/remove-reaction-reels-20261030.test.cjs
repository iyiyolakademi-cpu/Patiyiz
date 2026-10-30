const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
test('Reaction Reels sharing feature is removed while ordinary posting and shares remain',()=>{
 new vm.Script(app);
 assert.doesNotMatch(app,/pati-reaction-reel/);
 assert.doesNotMatch(app,/Bu gönderiye tepki Reels çek/);
 assert.doesNotMatch(app,/if\(form\.dataset\.sourcePost\)/);
 assert.match(app,/function openPatiShareModal\(postId\)/);
 assert.match(app,/modal\('Paylaş',preview\+search/);
 assert.match(app,/data-action="send-post-dm"/);
 assert.match(app,/function patiSharePostToStory\(postId\)|async function patiSharePostToStory\(postId\)/);
 assert.match(app,/function reelsPage\(\)/);
 assert.match(app,/case 'pati-share-story'/);
 assert.match(app,/case 'share-post'/);
});
test('Existing posts with a source credit remain accessible rather than deleted',()=>{
 assert.match(app,/const sourcePost=p\.source_post_id\?/);
 assert.match(app,/data-action="profile-open-post"/);
});
