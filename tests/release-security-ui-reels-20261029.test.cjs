const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const reel=fs.readFileSync('reels-editor.js','utf8');
const css=fs.readFileSync('patiyiz-polish-collab-dm-story-20261029.css','utf8');
const sw=fs.readFileSync('patiyiz-sw.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-release-security-indexes-20261029.sql','utf8');

test('Security definer story logging checks view permissions before insert',()=>{
 assert.match(sql,/SECURITY DEFINER/);
 assert.match(sql,/s\.expires_at > now\(\)/);
 assert.match(sql,/s\.audience = 'everyone'/);
 assert.match(sql,/s\.audience = 'close_friends'/);
 assert.match(sql,/patiyiz_is_close_friend\(s\.author_id, v_viewer\)/);
 assert.match(sql,/NOT public\.patiyiz_users_blocked\(v_viewer, s\.author_id\)/);
 assert.ok(sql.indexOf('patiyiz_is_close_friend')<sql.indexOf('INSERT INTO public.patiyiz_story_views'));
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.patiyiz_record_story_view\(uuid\) FROM PUBLIC, anon/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.patiyiz_record_story_view\(uuid\) TO authenticated/);
});

test('Six targeted FK indexes, existing data and RLS preserved',()=>{
 const targets=['patiyiz_close_friends(friend_id)','patiyiz_dm_hidden_threads(peer_id)',
 'patiyiz_dm_message_pins(peer_id)','patiyiz_group_chats(creator_id)',
 'patiyiz_group_messages(sender_id)','patiyiz_post_collaborators(invited_by)'];
 for(const table of targets)assert.ok(sql.includes(table),table);
 assert.doesNotMatch(sql,/\b(?:DROP TABLE|DELETE FROM|TRUNCATE|ALTER TABLE .* DISABLE ROW LEVEL SECURITY)\b/i);
});

test('Reels editor keeps source-quality passthrough but exports safer 720p 30fps',()=>{
 assert.match(reel,/WIDTH=720,HEIGHT=1280,TARGET_FPS=30/);
 assert.match(reel,/MAX_EXPORT_BYTES=48\*1024\*1024/);
 assert.match(reel,/canvas\.captureStream\(TARGET_FPS\)/);
 assert.match(reel,/targetVideoBps=Math\.max\(900000,Math\.min\(3000000/);
 assert.match(reel,/if\(!needsRender\(\)&&s\.clips\.length===1\)return s\.clips\[0\]\.file/);
 assert.match(reel,/if\(blob\.size>MAX_EXPORT_BYTES\)/);
});

test('App styles preserve photo/video coloring and support iPhone inputs',()=>{
 assert.match(css,/--pati-final-field-bg/);
 assert.match(css,/--pati-final-field-text/);
 assert.match(css,/pointer:coarse/);
 assert.match(css,/font-size:16px!important/);
 assert.match(css,/content-visibility:auto/);
 assert.doesNotMatch(css,/\b(?:filter|transform):\s*(?:invert|grayscale)\(/i);
});

test('Worker caches only same-origin static files and keeps push notification functionality',()=>{
 assert.match(sw,/self\.addEventListener\('push'/);
 assert.match(sw,/self\.addEventListener\('notificationclick'/);
 assert.match(sw,/self\.addEventListener\('fetch'/);
 assert.match(sw,/url\.origin!==self\.location\.origin/);
 assert.match(sw,/request\.mode==='navigate'/);
 assert.match(sw,/\(\?:css\|js\|svg\|png\|webp\|woff2\|webmanifest\)/);
 assert.match(sw,/caches\.delete/);
});
