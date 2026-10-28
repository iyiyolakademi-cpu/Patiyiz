const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const media=fs.readFileSync('patiyiz-system-media.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-close-friends-group-chats-20261028.sql','utf8');
const css=fs.readFileSync('patiyiz-social-private-groups-20261028.css','utf8');
const html=fs.readFileSync('index.html','utf8');
test('The social expansion parses without replacing existing DM/story machinery',()=>{
 new vm.Script(app);new vm.Script(media);
 for(const marker of ["function messagesPage()","function createPostPublication(","function patiTogglePin(","function patiToggleRepost(","function patiDmSetReaction(","function patiSharePostToStory("])assert.ok(app.includes(marker),marker);
});
test('Story picker supports everyone and close friends; own private upload and short lived URLs',()=>{
 assert.match(media,/id="pati-system-audience"/);
 assert.match(media,/value="close_friends"/);
 assert.match(media,/state\.onPublish\(root\.querySelector\('#pati-system-caption'\)\.value\)/);
 assert.match(app,/form\.dataset\.storyAudience=audience/);
 assert.match(app,/async function patiCreateCloseFriendStory/);
 assert.match(app,/private_image_path:imagePath/);
 assert.match(app,/audience:'close_friends'/);
 assert.match(app,/patiyiz-close-stories/);
 assert.match(app,/createSignedUrl\(story\.private_image_path,300\)/);
 assert.doesNotMatch(app.slice(app.indexOf('async function patiCreateCloseFriendStory('),app.indexOf('function patiGroupList(')),/getPublicUrl/);
});
test('Close friends tables and story RLS protect private media server-side',()=>{
 assert.match(sql,/patiyiz_close_friends_no_self/);
 assert.match(sql,/owner_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/p_viewer=\(select auth\.uid\(\)\)/);
 assert.match(sql,/audience='close_friends' and image_url=''/);
 assert.match(sql,/create policy patiyiz_stories_read/);
 assert.match(sql,/public\.patiyiz_is_close_friend\(author_id/);
 assert.match(sql,/bucket_id='patiyiz-close-stories'/);
 assert.match(sql,/on conflict\(id\) do update set public=false/);
});
test('Group chat has separate tables, membership RLS and secured group RPC',()=>{
 assert.match(sql,/create table if not exists public\.patiyiz_group_chats/);
 assert.match(sql,/create table if not exists public\.patiyiz_group_members/);
 assert.match(sql,/create table if not exists public\.patiyiz_group_messages/);
 assert.match(sql,/patiyiz_group_is_member\(group_id,\(select auth\.uid\(\)\)/);
 assert.match(sql,/sender_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/v_owner uuid := auth\.uid\(\)/);
 assert.match(sql,/raise exception 'Group owner cannot be removed'/);
 assert.doesNotMatch(sql,/alter table public\.messages/);
});
test('Group and friend screens integrate without replacing 1:1 chat',()=>{
 for(const marker of ["pati-close-friends-open","pati-close-friend-toggle","pati-group-list","pati-group-create-form","pati-group-message-form","pati-group-remove","patiGroupMembersDialog"])assert.ok(app.includes(marker),marker);
 assert.match(css,/\.pati-group-history/);
 assert.match(css,/\.pati-social-person/);
 assert.match(html,/patiyiz-social-private-groups-20261028\.css/);
 assert.match(html,/close_groups=20261028/);
});
