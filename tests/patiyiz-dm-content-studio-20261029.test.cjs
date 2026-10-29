const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-dm-content-studio-20261029.sql','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const css=fs.readFileSync('patiyiz-dm-content-studio-20261029.css','utf8');

test('Extended app remains valid JavaScript and chat index remains isolated',()=>{
 new vm.Script(app);
 const before=app.indexOf('function patiIndexDmHistory(');
 const after=app.indexOf('function messagesPage(){',before);
 assert.ok(before>=0&&after>before,'Index boundaries intact');
 const isolated=app.slice(before,after)+'\npatiIndexDmHistory';
 const fn=vm.runInNewContext(isolated,{Map,Date,patiDmLastVisible:()=>true});
 const rows=[{id:'a',sender_id:'u',receiver_id:'b',created_at:'2026-10-29T12:00:00Z'}];
 assert.equal(fn(rows,'u',new Set(),new Set()).peers.size,1);
 assert.equal(app.split('function messagesPage(){').length,2);
});

test('Chat search only queries the two authorized participants',()=>{
 assert.match(app,/async function patiDmSearchMessages\(peer,query\)/);
 assert.match(app,/\.or\('and\(sender_id\.eq\.'\+uid/);
 assert.match(app,/\.ilike\('body','%'\+escaped\+'%'\)/);
 assert.match(app,/async function patiDmSearchJump\(peer,id\)/);
 assert.match(app,/row\.sender_id===owner&&row\.receiver_id===peer/);
});

test('Scheduling is sender-owned, cancellation is pending-only, cron rechecks privacy',()=>{
 assert.match(sql,/create table if not exists public\.patiyiz_scheduled_messages/);
 assert.match(sql,/grant select,insert,delete on table public\.patiyiz_scheduled_messages to authenticated/);
 assert.match(sql,/sender_id=\(select auth\.uid\(\)\) and status='pending'/);
 assert.match(sql,/for update skip locked/);
 assert.match(sql,/patiyiz_users_blocked\(m\.sender_id,m\.receiver_id\)/);
 assert.match(sql,/patiyiz_restricted_accounts r/);
 assert.match(sql,/create or replace function patiyiz_private\.dispatch_scheduled_messages\(\)/);
 assert.match(sql,/revoke all on function patiyiz_private\.dispatch_scheduled_messages\(\) from public,anon,authenticated/);
 assert.match(sql,/cron\.schedule\('patiyiz-scheduled-dms'/);
 assert.match(app,/case 'pati-dm-schedule-form':/);
 assert.match(app,/case 'dm-scheduled-cancel':/);
});

test('Themes, stickers, media zoom, GIF upload and read receipts remain supported',()=>{
 assert.match(sql,/patiyiz_dm_themes/);
 assert.match(sql,/for update to authenticated using\(viewer_id=\(select auth\.uid\(\)\)\)/);
 for(const name of ['patiDmThemeDialog','patiDmScheduleOpen','patiDmStickerDialog','patiDmSearchOpen','data-dm-zoom','dm-gif-open','dm-sticker-send'])assert.ok(app.includes(name),name);
 assert.doesNotMatch(app,/name="dm_gif" accept="image\/gif,\.gif"/);
 assert.match(app,/from\('patiyiz-private-messages'\)/);
 assert.match(app,/case 'dm-receipts-toggle':/);
 assert.match(sql,/image\/gif/);
});

test('Comments retain reply and like and add server-owned pinning and mention',()=>{
 assert.match(app,/data-action="comment-reply"/);
 assert.match(app,/data-action="comment-like"/);
 assert.match(app,/case 'comment-pin':/);
 assert.match(app,/function patiMentionsHTML\(body\)/);
 assert.match(app,/const plain=esc\(body\|\|''\)/);
 assert.match(app,/case 'pati-mention-select':/);
 assert.match(sql,/create table if not exists public\.patiyiz_comment_pins/);
 assert.match(sql,/one pinned comment per post/i);
 assert.match(sql,/owner_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/c\.id=comment_id and c\.post_id=post_id/);
});

test('Post composer can reorder/remove photos and videos and preserve original aspect',()=>{
 for(const name of ['patiComposerReorder','pati-media-prev','pati-media-next','pati-media-remove','name="cover_photo"'])
 assert.ok(app.includes(name),name);
 assert.match(app,/const transfer=new DataTransfer\(\)/);
 assert.match(app,/str\('aspect'\)==='original'\?await preparePhoto/);
 assert.match(app,/videoFiles\.length>4/);
 assert.match(app,/record\.media_videos\.push/);
 assert.match(app,/pati-video-carousel/);
 assert.match(sql,/media_videos text\[\] not null default/);
 assert.match(sql,/cardinality\(media_videos\)<=4/);
});

test('Reels and posts have separate profile views without removing saved/pinned posts',()=>{
 assert.match(sql,/post_format text not null default 'post'/);
 assert.match(app,/profilePostsTab==='reels'/);
 assert.match(app,/profilePostsTab==='reposts'/);
 assert.match(app,/patiOwnPin/);
 assert.match(app,/patiTogglePin/);
});

test('Both browser and Android ship the new stylesheet in the correct order',()=>{
 assert.match(html,/patiyiz-dm-content-studio-20261029\.css\?v=1/);
 assert.match(native,/'patiyiz-dm-content-studio-20261029\.css'/);
 assert.ok(html.indexOf('patiyiz-polish-collab-dm-story-20261029.css')<html.indexOf('patiyiz-dm-content-studio-20261029.css'));
 assert.match(css,/@media\(max-width:720px\)/);
 assert.doesNotMatch(css,/filter\s*:\s*invert\(/i);
});
