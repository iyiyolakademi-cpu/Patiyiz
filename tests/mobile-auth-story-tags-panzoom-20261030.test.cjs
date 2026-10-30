const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const auth=fs.readFileSync('patiyiz-mobile-auth-redesign-20261030.css','utf8');
const shares=fs.readFileSync('patiyiz-clean-story-dm-shares-20261030.css','utf8');
const zoom=fs.readFileSync('patiyiz-pan-zoom-photos-20261030.css','utf8');
test('Entire JS compiles after responsive sign-in/story/photo edits',()=>new vm.Script(app));
test('Mobile login and signup reuse actual Patiyiz logo and keep real working auth form',()=>{
 const form=app.slice(app.indexOf('function showAuth(msg='),app.indexOf('async function checkAdmin()',app.indexOf('function showAuth(msg=')));
 assert.match(form,/class="auth-story-icon" aria-label="Patiyiz logosu"/);
 assert.match(form,/patiyiz-selected-logo\.svg\?v=20261024-new-p-logo-1/);
 assert.doesNotMatch(form,/<svg viewBox="0 0 64 64"/);
 assert.match(form,/class="auth-tabs"/);
 assert.match(form,/data-auth="login"/);
 assert.match(form,/data-auth="signup"/);
 assert.match(form,/id="auth-form"/);
 assert.match(form,/id="email"/);
 assert.match(form,/name="first_name"/); assert.match(form,/name="last_name"/);
 assert.match(form,/name="age_accepted"/);
 assert.match(form,/name="terms_accepted"/);
 assert.match(form,/\$\{ico\('eye'\)\}/);
 assert.match(app,/data-auth-toggle-password/);
 assert.match(auth,/#auth-root \.auth-story\{display:flex!important/);
 assert.match(auth,/#auth-root \.auth-pane\{display:block!important/);
 assert.match(auth,/border-radius:25px 25px 0 0!important/);
 assert.match(auth,/font-size:16px!important/);
 assert.match(auth,/safe-area-inset-bottom/);
});
test('Shared story card uses actual source author avatar and strongly visible open button',()=>{
 const section=app.slice(app.indexOf('function patiStorySharedPostCard(x){'),app.indexOf('function showStoryFrame(){'));
 assert.match(section,/pati-story-share-profile/);
 assert.match(section,/pati-story-share-author/);
 assert.match(section,/avatar\(original,'s'\)/);
 assert.match(section,/pati-story-shared-source/);
 assert.match(section,/Gönderiyi aç/);
 assert.match(app,/case 'pati-story-share-author':if\(id&&!blocked\.has\(id\)\)\{closeStory\(false\);patiOpenProfileOnly\(id\)\}/);
 assert.match(shares,/pati-story-share-card-heading/);
 assert.match(shares,/min-height:44px!important/);
 assert.match(shares,/background:#111216!important/);
});
test('No black bubble around tagged/shared media; normal dark messages unaffected',()=>{
 assert.match(shares,/\.bubble-chat\.mine\.pati-dm-shared-message/);
 assert.match(shares,/background:transparent!important/);
 assert.match(shares,/\.pati-dm-shared-card/);
 assert.match(shares,/\.pati-dm-shared-video/);
 const old=fs.readFileSync('patiyiz-black-outgoing-messages-20261030.css','utf8');
 assert.match(old,/#0a0b0e/);
});
test('Full photo viewer supports pinch, pan, wheel and double tap without exposing signed photo URL',()=>{
 const part=app.slice(app.indexOf('function patiDmOpenPhoto(messageId){'),app.indexOf('const patiDmEmojis='));
 assert.match(part,/stage\.setPointerCapture/);
 assert.match(part,/points\.size===1&&zoom>1/);
 assert.match(part,/points\.size===2/);
 assert.match(part,/tx\+=next\.x-prev\.x/);
 assert.match(part,/ty\+=next\.y-prev\.y/);
 assert.match(part,/const zoomAt=/);
 assert.match(part,/stage\.addEventListener\('dblclick'/);
 assert.match(part,/signed media URL/i);
 assert.match(zoom,/touch-action:none!important/);
 assert.match(zoom,/cursor:grabbing!important/);
 const pinch=app.slice(app.indexOf('let patiPinch=null;'),app.indexOf("document.addEventListener('input',e=>{",app.indexOf('let patiPinch=null;')));
 assert.match(pinch,/p\.tx\+=touch\.clientX-prev\.x/);
 assert.match(pinch,/p\.ty\+=touch\.clientY-prev\.y/);
 assert.match(pinch,/patiFeedImagePaint/);
});
test('PWA and native bundles include all updated styles and app cache versions',()=>{
 for(const path of ['patiyiz-mobile-auth-redesign-20261030.css','patiyiz-clean-story-dm-shares-20261030.css','patiyiz-pan-zoom-photos-20261030.css']){
  assert.ok(html.includes(path+'?v='),path);
  assert.ok(native.includes(path),path);
 }
 assert.match(html,/auth_story_pan_fix=20261030/);
});
