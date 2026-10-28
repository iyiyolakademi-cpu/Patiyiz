const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-close-friends-group-chat-foundation-20261028.sql','utf8');
test('Four pre-existing social capabilities are preserved',()=>{
 for(const marker of ['function patiToggleRepost(','function patiTogglePin(','function patiDmOpenReactionPicker(','async function patiSharePostToStory(','case \'pati-repost\'','case \'pati-pin\'','case \'pati-share-story\'','case \'dm-react-open\''])
  assert.ok(app.includes(marker),marker);
});
test('Close friends list has owner-only RLS and no self-follow',()=>{
 assert.match(sql,/create table if not exists public\.patiyiz_close_friends/);
 assert.match(sql,/constraint patiyiz_close_friends_no_self/);
 assert.match(sql,/create policy patiyiz_close_friends_select[\s\S]*?owner_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/p_viewer=auth\.uid\(\) or p_owner=auth\.uid\(\)/);
});
test('Group messages are isolated from existing one-to-one message table',()=>{
 assert.match(sql,/create table if not exists public\.patiyiz_group_messages/);
 assert.match(sql,/patiyiz_group_is_member\(group_id,\(select auth\.uid\(\)\)/);
 assert.match(sql,/sender_id=\(select auth\.uid\(\)\)/);
 assert.doesNotMatch(sql,/alter table public\.messages/);
 assert.doesNotMatch(sql,/alter table public\.patiyiz_stories/);
});
test('Group membership modification is confined to checked RPCs',()=>{
 assert.match(sql,/grant select on public\.patiyiz_group_members/);
 assert.doesNotMatch(sql,/grant .*insert.* on public\.patiyiz_group_members/);
 assert.match(sql,/Only group admins can add members/);
 assert.match(sql,/p_user=auth\.uid\(\)/);
});
