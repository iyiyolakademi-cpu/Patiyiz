const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const studio=fs.readFileSync('reels-editor.js','utf8');
const between=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)+1));
test('Kaydettiklerim is only in menu, not a large profile link',()=>{
 const profile=between('function profilePage(){','function formField(');
 const menu=between('function openMobileFeaturesMenu(){','const patiCoinTasks=');
 assert.doesNotMatch(profile,/paticoin-profile-link|Kaydettiklerim/);
 assert.match(menu,/\['saved-posts','Kaydettiklerim','bookmark'\]/);
 assert.match(app,/function savedPostsPage\(\)/);
});
test('Profile edit keeps existing FormData keys and custom photo',()=>{
 const edit=between('function editProfile(){','function editPet(');
 for(const x of ['name="photo"','formField(\'display_name\'','formField(\'handle\'','textField(\'bio\'','formField(\'city\'','profile-form','pati-profile-edit-modal','Bitti']){
  assert.ok(edit.includes(x),x);
 }
 assert.match(app,/case 'profile-form':\{let handle=/);
 assert.match(css,/\.pati-profile-edit-modal/);
 assert.match(css,/\.pati-edit-avatar/);
});
test('Like hearts are red; bookmarks black and follow back blue',()=>{
 assert.match(css,/pati-social-actions button\[data-action="like"\]\.active svg\.icon/);
 assert.match(css,/fill:#ff3040!important/);
 assert.match(css,/pati-social-actions button\[data-action="save"\]\.active svg\.icon/);
 assert.match(css,/fill:#131313!important/);
 assert.match(css,/data-follow-back="true"/);
 assert.match(css,/background:#1877f2!important/);
 const profile=between('function profilePage(){','function formField(');
 assert.match(profile,/followBack\?'Sen de takip et'/);
 assert.match(app,/followsMe=id=>/);
});
test('Reels Studio allows 90-second clips and rejects longer exports',()=>{
 assert.match(studio,/MAX_SECONDS=90/);
 assert.match(studio,/90 saniye/);
 assert.match(studio,/duration\(s\.clips\)>MAX_SECONDS\+\.05/);
 assert.match(app,/90 saniyeye kadar/);
 assert.match(html,/reels90=1/);
 assert.match(html,/profile20261025=1/);
});

test('Incoming follower notifications include an actionable blue follow-back, never for non-follow alerts',()=>{
 const notifications=between('function notificationsPage(){','async function openNotification(');
 assert.match(notifications,/n\.kind==='follows'/);
 assert.match(notifications,/data\.follows\.some\(f=>f\.follower_id===actor\.id&&f\.followee_id===me\.id\)/);
 assert.match(notifications,/data-action="follow"/);
 assert.match(notifications,/pati-alert-follow-back/);
 assert.match(css,/\.pati-alert-row \.pati-alert-follow-back/);
});
