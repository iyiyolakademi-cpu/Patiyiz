const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const css=fs.readFileSync('patiyiz-social-phase1-20261028.css','utf8');
const dmSql=fs.readFileSync('supabase/patiyiz-dm-emoji-reactions-20261028.sql','utf8');
const storySql=fs.readFileSync('supabase/patiyiz-story-shared-post-20261028.sql','utf8');
function between(a,b){const start=app.indexOf(a),end=app.indexOf(b,start+a.length);assert.ok(start>=0&&end>start,'section '+a);return app.slice(start,end)}

test('App code parses, new styles are bundled on web and native',()=>{
 new vm.Script(app,{filename:'app.js'});
 assert.match(html,/patiyiz-social-phase1-20261028\.css\?v=1/);
 assert.match(html,/instagram_social_phase1=20261028/);
 assert.match(native,/patiyiz-social-phase1-20261028\.css/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
});
test('Repost keeps original ownership, prevents own reposts and supports undo',()=>{
 const social=between('/* Social features: repost and pinned profile posts. */','function postCard(');
 assert.match(social,/patiyiz_reposts/);
 assert.match(social,/Kendi gönderini yeniden paylaşamazsın/);
 assert.match(social,/user_id:owner,post_id:postId/);
 assert.match(social,/\.delete\(\)\.eq\('user_id',owner\)\.eq\('post_id',postId\)/);
 const card=between('function postCard(','function patiDetailCandidates(');
 assert.match(card,/data-action="pati-repost"/);
 assert.match(app,/case 'pati-repost':run\(\(\)=>patiToggleRepost\(id\)\)/);
});
test('Profile pins own posts only and caps pinned count to three',()=>{
 const social=between('/* Social features: repost and pinned profile posts. */','function postCard(');
 assert.match(social,/post.author_id!==me.id/);
 assert.match(social,/\(current\.data\|\|\[\]\)\.length>=3/);
 assert.match(social,/\.from\('patiyiz_post_pins'\)/);
 const profile=between('function profilePage(){','function formField(');
 assert.match(profile,/data.pins.find\(x=>x.owner_id===p.id/);
 assert.match(profile,/pati-profile-pin/);
 assert.match(profile,/\['reposts',repostTabIcon,'Yeniden paylaşılanlar'\]/);
 assert.match(app,/case 'pati-pin':run\(\(\)=>patiTogglePin\(id\)\)/);
});
test('Following feed includes reposts by followed, non-blocked accounts',()=>{
 const home=between('function homePage(){','let savedPostsLoading=');
 assert.match(home,/const friendReposts=/);
 assert.match(home,/followed.has\(r.user_id\)/);
 assert.match(home,/pati-repost-context/);
 assert.match(home,/\.sort\(\(a,b\)=>/);
});
test('DM reaction table only exposes authorized message participants',()=>{
 assert.match(dmSql,/alter table public\.patiyiz_dm_reactions enable row level security/);
 assert.match(dmSql,/revoke all on table public\.patiyiz_dm_reactions from public,anon,authenticated/);
 assert.match(dmSql,/m.sender_id=\(select auth.uid\(\)\) or m.receiver_id=\(select auth.uid\(\)\)/);
 assert.match(dmSql,/patiyiz_users_blocked/);
 assert.match(dmSql,/primary key \(message_id,user_id\)/);
 assert.match(dmSql,/with check \(user_id=\(select auth.uid\(\)\)/);
 const dm=between('const patiDmEmojis=','function messagesPage(){');
 assert.match(dm,/patiDmReactionMarkup/);
 assert.match(dm,/patiDmSetReaction/);
 assert.match(dm,/update\(\{emoji\}\)/);
 assert.doesNotMatch(dm,/\.upsert\(\{message_id:messageId,user_id:owner,emoji\}/);
 assert.match(app,/case 'dm-react-set':run\(\(\)=>patiDmSetReaction/);
});
test('Story share attributes original, retains source link and original media',()=>{
 const story=between('/* Share an existing public post to a story','function showStoryFrame(){');
 assert.match(story,/shared_post_id:post.id/);
 assert.doesNotMatch(story,/expires_at:new Date/); // database default controls the 24-hour expiry
 assert.match(story,/data.posts.push\(post\)/);
 assert.match(story,/closeStory\(false\);openPost\(postId\)/);
 assert.match(storySql,/add column if not exists shared_post_id uuid references public.posts\(id\) on delete set null/);
 assert.match(app,/if\(original&&!original\.shared_post_id\)await deleteOwnedMedia\(original\)/);
 assert.match(app,/data-action="pati-story-open-post"/);
 assert.match(app,/case 'pati-share-story':if\(confirm/);
 assert.match(css,/pati-story-shared-source/);
});
