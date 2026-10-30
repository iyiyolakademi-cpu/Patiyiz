const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const crop=fs.readFileSync('patiyiz-avatar-crop-20261030.js','utf8');
const css=fs.readFileSync('patiyiz-crop-insights-mobile-final-20261029.css','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');

test('Profile portrait image completely fills one circle without inset frame',()=>{
 assert.match(css,/#main-content \.pati-ig-profile \.pati-ig-avatar\s*\{\s*padding:0!important/);
 assert.match(css,/\.pati-ig-avatar \.avatar img,[\s\S]*?object-fit:cover!important/);
 assert.match(css,/\.pati-ig-avatar \.avatar img,[\s\S]*?object-position:center!important/);
 assert.match(app,/class="pati-ig-avatar/);
 assert.match(app,/avatar\(p,'l'\)/);
});
test('Own story caption remains above viewers and Delete aligned on the bottom row',()=>{
 assert.match(app,/const stack=document\.createElement\('div'\)/);
 assert.match(app,/stack\.className='pati-own-story-stack'/);
 assert.match(app,/if\(caption\)stack\.appendChild\(caption\)/);
 assert.match(app,/foot\.appendChild\(viewers\)/);
 assert.doesNotMatch(app,/pati-story-like-own/);
 assert.match(app,/foot\.appendChild\(deleteButton\)/);
 assert.match(css,/#story-overlay\.pati-story-own \.pati-own-story-stack/);
 assert.match(css,/flex-direction:column!important/);
 assert.match(css,/\.pati-own-story-stack > \.story-caption\{[\s\S]*?position:relative!important/);
 assert.match(css,/\.pati-own-story-footer > \.story-delete\{[\s\S]*?position:relative!important/);
 assert.match(css,/\.story-big-photo,[\s\S]*?object-fit:cover!important/);
 assert.match(app,/data-action="story-viewers"/);
 assert.match(app,/data-action="story-delete"/);
});
test('Profile editor opens before uploading, supports corner resize, drag and pinch',()=>{
 assert.match(crop,/#profile-form input\[name="photo"\]/);
 assert.match(crop,/event\.stopImmediatePropagation\(\)/);
 assert.match(crop,/data-corner="-1,-1"/);
 assert.match(crop,/data-corner="1,1"/);
 assert.match(crop,/stage\.setPointerCapture/);
 assert.match(crop,/Math\.hypot/);
 assert.match(crop,/pointercancel/);
 assert.match(crop,/type="range"/);
 assert.match(crop,/output\.width=size;output\.height=size/);
 assert.match(crop,/const size=1080/);
 assert.match(crop,/output\.toBlob\(done,'image\/jpeg',0\.9\)/);
 assert.match(crop,/new DataTransfer\(\)/);
 assert.match(crop,/approved\.add\(input\)/);
 assert.match(crop,/input\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
 assert.match(crop,/if\(a==='cancel'\)close\(null\)/);
 assert.doesNotThrow(()=>new Function(crop));
 assert.doesNotThrow(()=>new Function(app));
});
test('Works in GitHub Pages and packaged Capacitor without new CDN dependencies',()=>{
 assert.match(html,/patiyiz-avatar-crop-20261030\.js\?v=1/);
 assert.ok(html.indexOf('patiyiz-avatar-crop-20261030.js')<html.indexOf('<script src="app.js?'));
 assert.match(native,/'patiyiz-avatar-crop-20261030\.js'/);
 assert.match(html,/avatar_story_crop_fix=20261030/);
 assert.match(html,/story_profile_avatar_fix=20261030/);
 assert.match(crop,/pati-avatar-crop-open/);
 assert.doesNotMatch(crop,/https?:\/\/|cdn\.jsdelivr/);
});
