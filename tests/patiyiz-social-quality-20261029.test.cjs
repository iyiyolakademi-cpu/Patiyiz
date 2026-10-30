const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-social-safety-insights-groups-20261029.sql','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const sw=fs.readFileSync('patiyiz-sw.js','utf8');
test('Private account server rules include follow approvals, posts, stories and secure viewer RPCs',()=>{
 for(const s of ['patiyiz_follow_requests','patiyiz_follow_action','patiyiz_follow_decide',
 'drop policy if exists posts_select','drop policy if exists patiyiz_stories_read',
 'patiyiz_record_story_view','patiyiz_record_post_view'])assert.ok(sql.includes(s),s);
 assert.match(sql,/s\.author_id=v_viewer or not pr\.is_private or exists/);
 assert.match(sql,/patiyiz_users_blocked\(v_viewer,s\.author_id\)/);
 assert.match(sql,/patiyiz_is_close_friend/);
 assert.match(sql,/create policy follows_insert[\s\S]*not exists\(select 1 from public\.profiles p where p\.id=followee_id and p\.is_private\)/);
});
test('Message safety and comment limits are enforced in the database, not only client',()=>{
 for(const s of ['patiyiz_restricted_accounts','patiyiz_dm_allowed_20261029',
 'messages_insert','patiyiz_guard_comment_20261029','blocked_words','35'])
 assert.ok(sql.includes(s),s);
 assert.match(sql,/patiyiz_dm_allowed_20261029\(sender_id,receiver_id\)/);
 assert.match(sql,/patiyiz_guard_comment_insert_20261029 before insert/);
});
test('Group operations require creator for role grants and existing admin for photo upload',()=>{
 assert.match(sql,/v_owner<>v_creator/);
 assert.match(sql,/role='admin'/);
 assert.match(sql,/patiyiz-group-avatars/);
 for(const s of ['patiyiz_group_set_photo','patiyiz_group_set_role','patiGroupPhotoUpload','data-pati-group-avatar','pati-group-role'])
 assert.ok((app+sql).includes(s),s);
});
test('Creator stats are aggregated per current account; crash telemetry excludes raw error content',()=>{
 for(const s of ['patiyiz_creator_insights','patiyiz_profile_visit_daily','patiyiz_reel_watch_daily',
 'patiyiz_client_error_daily','patiyiz_track_client_error','patiCreatorInsights','patiWatchReelAttach'])
 assert.ok((sql+app).includes(s),s);
 assert.match(sql,/v_user uuid := auth\.uid\(\)/);
 assert.match(sql,/first_seen_at>=v_cutoff/);
 assert.match(app,/patiTrackClientError\('promise'\)/);
 assert.doesNotMatch(sql,/stack_trace|error_body|exception_message/i);
});
test('Existing reaction Reels remain credited while no new reaction Reels can be created',()=>{
 for(const s of ['source_post_id','pati-source-credit','patiToggleRepost'])assert.ok(app.includes(s),s);
 assert.ok(!app.includes('pati-reaction-reel'));
 assert.match(sql,/patiyiz_guard_reaction_insert_20261029/);
 assert.match(sql,/not public\.patiyiz_users_blocked\(new\.author_id,p\.author_id\)/);
});
test('PWA and Android ship network and mobile quality assets while maintaining push',()=>{
 for(const name of ['patiyiz-social-quality-20261029.css','patiyiz-social-quality-20261029.js']){
  assert.ok(html.includes(name),name);assert.ok(native.includes(name),name);
 }
 assert.match(sw,/addEventListener\('push'/);
 assert.match(app,/case 'follow':run\(\(\)=>doToggle\('follows'/);
});
test('SQL is additive and RLS enabled on each new exposed table',()=>{
 const tables=['patiyiz_follow_requests','patiyiz_profile_visit_daily','patiyiz_reel_watch_daily',
 'patiyiz_restricted_accounts','patiyiz_client_error_daily'];
 for(const table of tables)assert.ok(sql.includes('alter table public.'+table+' enable row level security'),table);
 assert.doesNotMatch(sql,/\b(?:DROP TABLE|TRUNCATE|DELETE FROM public\.posts|DELETE FROM public\.profiles)\b/i);
});
