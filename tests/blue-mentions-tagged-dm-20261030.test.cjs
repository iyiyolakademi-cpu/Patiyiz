const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-blue-mentions-dm-20261030.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const sql=fs.readFileSync('supabase/patiyiz-mention-dm-delivery-20261030.sql','utf8');

const postId='11111111-1111-1111-1111-111111111111';
const commentId='22222222-2222-2222-2222-222222222222';
const mentionBody='🔖 Seni etiketledi: https://patiyiz.com/#post-'+postId+'?comment='+commentId;

test('Blue Etiketle label is visible in comment and post composer, JS compiles',()=>{
 new vm.Script(app);
 assert.match(app,/class="pati-comment-mention"[^>]*><span aria-hidden="true">@<\/span> Etiketle<\/button>/);
 assert.match(app,/class="pati-mention-open"[^>]*><span aria-hidden="true">@<\/span> Etiketle<\/button>/);
 assert.match(css,/#comment-form \.pati-comment-editor-row \.pati-comment-mention/);
 assert.match(css,/color:#2388fa!important/);
 assert.match(css,/html\[data-pati-theme="dark"\]/);
});
test('Comment and post @handles are blue clickable links, including profiles not yet cached',()=>{
 const text=app.slice(app.indexOf('function patiMentionsHTML(body){'),app.indexOf('function patiMentionOpen(mode){'));
 assert.match(text,/class="pati-mention-link"/);
 assert.match(text,/pati-mention-profile/);
 assert.match(text,/async function patiOpenMentionProfile\(handle,knownId=''\)/);
 assert.match(app,/case 'pati-mention-profile':e\.preventDefault\(\);void patiOpenMentionProfile\(target\.dataset\.handle,target\.dataset\.id\|\|''\)/);
 assert.match(css,/\.pati-mention-link/);
 assert.match(css,/color:#1683f6!important/);
});
test('Tagged direct-message parser resolves source post and exact comment, without treating ordinary messages as tags',()=>{
 const start=app.indexOf('function patiDmMentionDetails(body){'),end=app.indexOf('function patiDmHasActiveStory(userId){',start);
 assert.ok(start>0&&end>start);
 const fn=new Function(app.slice(start,end)+'return {mention:patiDmMentionDetails,id:patiDmSharedPostId};')();
 assert.deepEqual(fn.mention(mentionBody),{postId,commentId});
 assert.equal(fn.id(mentionBody),postId);
 assert.equal(fn.mention('Merhaba, seni etiketledim'),null);
 assert.equal(fn.id('📨 Paylaşım: https://patiyiz.com/#post-'+postId),postId);
 assert.equal(fn.id('Merhaba'), '');
});
test('Message card shows tagged content with a direct link to comment and blue explanation',()=>{
 const part=app.slice(app.indexOf('function patiDmSharedCard(message){'),app.indexOf('async function patiDmHydrateSharedPosts(messages,peer){'));
 assert.match(part,/patiDmMentionDetails\(message\?\.body\)/);
 assert.match(part,/data-comment/);
 assert.match(part,/seni etiketledi/);
 assert.match(part,/pati-dm-mention-label/);
 assert.match(app,/case 'dm-open-shared-post':run\(\(\)=>patiDmOpenSharedPost\(id,target\.dataset\.comment\|\|''\)\)/);
 assert.match(app,/async function patiDmOpenSharedPost\(id,commentId=''\)/);
 assert.match(app,/patiyizCommentExpandedReplies\.add\(mentioned\.parent_id\)/);
 assert.match(css,/\.pati-dm-mention-label/);
});
test('Mention notification creates direct message only when user privacy, blocks and post visibility permit it',()=>{
 assert.match(sql,/create or replace function patiyiz_private\.send_mention_dm_20261030\(\)/);
 assert.match(sql,/security definer/);
 assert.match(sql,/set search_path = ''/);
 assert.match(sql,/from public\.user_blocks/);
 assert.match(sql,/from public\.patiyiz_restricted_accounts/);
 assert.match(sql,/v_policy='following'/);
 assert.match(sql,/v_private and v_post_author<>new\.owner_id/);
 assert.match(sql,/count\(\*\) from public\.messages/);
 assert.match(sql,/insert into public\.messages\(sender_id,receiver_id,body\)/);
 assert.match(sql,/revoke all on function patiyiz_private\.send_mention_dm_20261030\(\)/);
 assert.match(sql,/after insert on public\.notifications/);
});
test('Web and Android include late mobile-visible blue styling while preserving final crop styles last',()=>{
 assert.match(html,/patiyiz-blue-mentions-dm-20261030\.css\?v=2/);
 assert.match(html,/blue_dm_mentions=20261030/);
 assert.match(native,/'patiyiz-blue-mentions-dm-20261030\.css'/);
 assert.ok(html.indexOf('patiyiz-blue-mentions-dm-20261030.css')>html.indexOf('patiyiz-mention-mobile-fix-20261030.css'));
 assert.ok(html.indexOf('patiyiz-blue-mentions-dm-20261030.css')<html.indexOf('patiyiz-crop-insights-mobile-final-20261029.css'));
});
