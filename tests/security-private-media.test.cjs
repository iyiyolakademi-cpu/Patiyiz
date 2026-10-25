const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const account=fs.readFileSync('supabase/functions/patiyiz-delete-account/index.ts','utf8');
const moderation=fs.readFileSync('supabase/functions/patiyiz-admin-moderate/index.ts','utf8');

test('Deleting an account first verifies session, password and protects admin accounts',()=>{
 assert.match(account,/userClient\.auth\.getUser\(\)/);
 assert.match(account,/passwordClient\.auth\.signInWithPassword/);
 assert.match(account,/passwordCheck\.user\?\.id!==uid/);
 assert.match(account,/adminRecord\)return answer\(403/);
 assert.match(account,/json\?\.confirmation!=="HESABIMI SIL"/);
});

test('Account deletion also removes the sender private DM photos and voice notes',()=>{
 assert.match(account,/for\(const bucket of \["patiyiz-media","patiyiz-voice-comments","patiyiz-videos","patiyiz-private-messages"\]\)/);
 assert.match(account,/\.list\(uid,\{limit:100,offset:0\}\)/);
 assert.match(account,/\.remove\(paths\)/);
 assert.ok(account.indexOf('patiyiz-private-messages') < account.indexOf('admin.auth.admin.deleteUser(uid)'));
 assert.match(account,/if\(removeError\)return answer\(503/);
});

test('Moderator authenticates and checks admin permissions BEFORE privileged access',()=>{
 const authorized=moderation.indexOf('actor.rpc("patiyiz_is_admin")');
 const privileged=moderation.indexOf('const service=createClient(url,role');
 assert.ok(authorized>0&&privileged>authorized);
 assert.match(moderation,/actor\.auth\.getUser\(\)/);
 assert.match(moderation,/if\(checkError\|\|isAdmin!==true\)/);
 assert.match(moderation,/const allowedOrigins=new Set/);
 assert.match(moderation,/https:\/\/patiyiz\.com/);
 assert.match(moderation,/https:\/\/www\.patiyiz\.com/);
});

test('Media cleanup includes every photo and cover and requires real owner path',()=>{
 assert.match(moderation,/author_id,image_url,images,video_url,video_cover_url/);
 assert.match(moderation,/Array\.isArray\(row\.images\)/);
 assert.match(moderation,/\[row\.video_url,"patiyiz-videos"\]/);
 assert.match(moderation,/\[row\.video_cover_url,"patiyiz-media"\]/);
 assert.match(moderation,/candidate\.origin!==storageOrigin/);
 assert.match(moderation,/path\.toLowerCase\(\)\.startsWith\(owner\+"\/"\)/);
 assert.match(moderation,/removals\.set\(bucket\+":"\+path/);
 assert.ok(moderation.indexOf('actor.rpc("patiyiz_admin_moderate"')<moderation.indexOf('for(const file of removals.values())'));
});

test('No account or live user is deleted by security regression tests',()=>{
 assert.doesNotMatch(account,/HARD_CODED_USER|ADMIN_TEST_ACCOUNT/);
 assert.doesNotMatch(moderation,/HARD_CODED_USER|ADMIN_TEST_ACCOUNT/);
});
