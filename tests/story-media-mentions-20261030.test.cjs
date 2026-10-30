const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-story-media-mentions-20261030.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const sql=fs.readFileSync('supabase/patiyiz-content-mentions-20261030.sql','utf8');

test('App parses and PWA/native include new asset',()=>{
 new vm.Script(app);
 assert.match(html,/patiyiz-story-media-mentions-20261030\.css\?v=1/);
 assert.match(html,/story_frame_sound_mentions=20261030/);
 assert.match(native,/'patiyiz-story-media-mentions-20261030\.css'/);
});
test('Story insights video has a real video source, requests an actual frame, and preview stays muted',()=>{
 const piece=app.slice(app.indexOf('async function showStoryViewers('),app.indexOf('async function patiSharePostToStory(',app.indexOf('async function showStoryViewers('))>0?app.indexOf('async function patiSharePostToStory(',app.indexOf('async function showStoryViewers(')):app.indexOf('function storyFrame(){'));
 assert.match(piece,/pati-story-activity-video-frame/);
 assert.match(piece,/src="\'+esc\(x\.video_url\)\+'#t=0\.2"/);
 assert.match(piece,/muted autoplay playsinline webkit-playsinline preload="metadata"/);
 assert.match(piece,/activityFrame\.addEventListener\('loadeddata',settle/);
 assert.match(css,/\.pati-story-activity-video-frame/);
});
test('Stories, Reels and feed request sound-on playback but honor controls/browser restrictions',()=>{
 assert.match(app,/let patiyizStorySoundEnabled=true/);
 assert.match(app,/let patiyizFeedSoundEnabled=true/);
 assert.match(app,/let patiyizReelsSoundEnabled=true/);
 assert.match(app,/case 'story-sound':\{[\s\S]*?patiyizStorySoundEnabled=video\.muted/);
 assert.match(app,/case 'video-sound':/);
 assert.match(app,/function reelToggleSound\(button\)/);
 assert.match(app,/video\?\.play\?\.\(\)\?\.catch\?\.\(error=>/);
});
test('Shared media opens its post; avatar or author name opens profile',()=>{
 const piece=app.slice(app.indexOf('function patiDmSharedCard('),app.indexOf('async function patiDmHydrateSharedPosts('));
 assert.match(piece,/data-action="view-user" data-id="\'+esc\(post\.author_id\)/);
 assert.match(piece,/data-action="dm-open-shared-post"/);
 assert.match(piece,/pati-dm-shared-video-wrap pati-dm-shared-media-open/);
 assert.match(piece,/pati-dm-shared-image-open/);
 assert.match(app,/case 'dm-open-shared-post':run\(\(\)=>patiDmOpenSharedPost\(id\)\)/);
});
test('Mentions are server-generated, owner-scoped and linked to post/comment',()=>{
 assert.match(sql,/create or replace function patiyiz_private\.notify_content_mentions_20261030\(\)/);
 assert.match(sql,/revoke all on function patiyiz_private\.notify_content_mentions_20261030\(\) from public,anon,authenticated/);
 assert.match(sql,/from public\.user_blocks b/);
 assert.match(sql,/comment_id/);
 assert.match(sql,/limit 5/);
 assert.match(sql,/after insert on public\.comments/);
 assert.match(sql,/after insert on public\.posts/);
 assert.match(app,/const notificationKinds=\{[\s\S]*?mentions:\['at-sign','Etiketlenme'\]/);
 assert.match(app,/async function patiOpenMentionNotification\(n\)/);
 assert.match(app,/patiyizCommentExpandedReplies\.add\(mentioned\.parent_id\)/);
 assert.match(app,/pati-comment-mention-highlight/);
 assert.match(app,/\.ilike\('handle','%'\+query\+'%'\)/);
});
