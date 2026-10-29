const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-profile-chat-photo-polish-20261028.css','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const segment=(a,b)=>{
 const i=app.indexOf(a),j=app.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,'Missing '+a);
 return app.slice(i,j);
};

test('Profile and message JavaScript still parses and new styles load after existing overrides',()=>{
 new vm.Script(app,{filename:'app.js'});
 const before=html.indexOf('patiyiz-centered-logo-profile-story-dm-images-20261028.css');
 const after=html.indexOf('patiyiz-profile-chat-photo-polish-20261028.css');
 assert.ok(before>=0&&after>before);
 assert.match(html,/profile_chat_photo=20261028/);
});

test('DM list hides the deletion command in a compact optional menu',()=>{
 const page=segment('function messagesPage(){','function pushKeyBytes(');
 assert.match(page,/<details class="pati-dm-row-actions">/);
 assert.match(page,/<summary aria-label="Sohbet seçenekleri"/);
 assert.match(page,/data-action="dm-delete-thread"/);
 assert.match(app,/case 'dm-delete-thread':run\(\(\)=>patiDmDeleteConversation\(id\)\)/);
 assert.match(css,/\.pati-dm-row-actions:not\(\[open\]\) \.pati-dm-row-menu/);
 assert.match(css,/\.pati-dm-row-actions \.pati-dm-delete-thread/);
});

test('Message photo opens in full-screen native dialog with a private signed URL',()=>{
 const src=segment('function patiDmOpenPhoto(messageId){','function messagesPage(){');
 assert.match(src,/photo\.dataset\.privatePath!==message\.attachment_path/);
 assert.match(src,/document.createElement\('dialog'\)/);
 assert.match(src,/dialog\.showModal\(\)/);
 assert.match(src,/esc\(url\)/);
 assert.match(src,/dialog\.addEventListener\('close'/);
 assert.doesNotMatch(src,/createSignedUrl|window\.open/);
 assert.match(css,/dialog\.pati-dm-lightbox/);
 assert.match(css,/\.pati-dm-lightbox-stage>img/);
 assert.match(css,/object-fit:contain!important/);
});

test('Profile uses three portrait thumbnail columns with overlay media badges and counts',()=>{
 const profile=segment('function profilePage(){','function formField(');
 assert.match(profile,/const cover=x\.video_url/);
 assert.match(profile,/pati-profile-play/);
 assert.match(profile,/pati-profile-multi/);
 assert.match(profile,/pati-profile-view-count/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/aspect-ratio:3 \/ 4!important/);
 assert.match(css,/justify-content:flex-start!important/);
 assert.match(profile,/data-action="profile-open-post"/);
 assert.match(app,/case 'profile-open-post':\{const selected=patiFindSocialPost\(id\)/);\n assert.match(app,/openPost\(id\);break;\}/);
});

test('Opened posts keep original media proportions and native build includes styles',()=>{
 assert.match(css,/\.pati-detail-screen \.pati-feed-card \.pati-carousel-slide/);
 assert.match(css,/object-fit:contain!important/);
 assert.match(native,/patiyiz-profile-chat-photo-polish-20261028\.css/);
 assert.match(native,/getElementById\('pati-dm-lightbox'\)\?\.open/);
});
