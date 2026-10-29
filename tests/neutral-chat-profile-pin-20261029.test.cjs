const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-neutral-chat-profile-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const migration=fs.readFileSync('supabase/patiyiz-post-pins-reliability-20261029.sql','utf8');

test('App syntax and chat composition remain valid',()=>{
 assert.doesNotThrow(()=>new vm.Script(app));
 const conversation=app.slice(app.indexOf('function messagesPage(){'),app.indexOf('function pushKeyBytes('));
 assert.match(conversation,/pati-dm-attach-menu/);
 assert.match(conversation,/name="dm_gallery"/);
 assert.match(conversation,/name="dm_camera"/);
 assert.match(conversation,/data-action="dm-sticker-open"/);
 assert.match(conversation,/data-action="dm-gif-open"/);
 assert.match(conversation,/data-action="dm-record"/);
 assert.doesNotMatch(conversation,/data-action="dm-theme-open"/);
 assert.doesNotMatch(conversation,/data-action="dm-schedule-open"/);
 assert.match(conversation,/pati-dm-theme-classic/);
});
test('Profile has three bold icons and a separate pinned marker',()=>{
 const profile=app.slice(app.indexOf('function profilePage(){'),app.indexOf('function formField(',app.indexOf('function profilePage(){')));
 assert.match(profile,/const iconTabs=\[\['media',gridTabIcon/);
 assert.match(profile,/\['reels',reelsTabIcon/);
 assert.match(profile,/\['reposts',repostTabIcon/);
 assert.match(profile,/pati-profile-tab-icon/);
 assert.match(profile,/aria-label="Sabitlenmiş gönderi">📌/);
 assert.match(profile,/post_format!=='reels'/);
});
test('Profile pins fetch authoritative state before direct toggle',()=>{
 const pin=app.slice(app.indexOf('async function patiTogglePin('),app.indexOf('function postCard('));
 assert.match(pin,/patiyiz_post_pins'\)\.select\('\*'\)\.eq\('owner_id',owner\)/);
 assert.match(pin,/\(current\.data\|\|\[\]\)\.length>=3/);
 assert.match(pin,/closeModal\(true\);render\(\)/);
 assert.match(migration,/CREATE TRIGGER patiyiz_guard_post_pin_limit/);
 assert.match(migration,/SECURITY INVOKER/);
 assert.doesNotMatch(migration,/WITH CHECK\s*\([\s\S]*FROM public\.patiyiz_post_pins/i);
});
test('Neutral colors and media without colored chat bubbles ship on web and Android',()=>{
 assert.match(css,/--p3-chat-mine:#dff5dc/);
 assert.match(css,/bubble-chat:has\(\.pati-dm-audio\)/);
 assert.match(css,/bubble-chat:has\(\.pati-dm-image-open\)/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(html,/patiyiz-neutral-chat-profile-20261029\.css/);
 assert.match(native,/'patiyiz-neutral-chat-profile-20261029\.css'/);
});
