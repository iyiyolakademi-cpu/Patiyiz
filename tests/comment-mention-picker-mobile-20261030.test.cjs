const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-mention-mobile-fix-20261030.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const mention=app.slice(app.indexOf('function patiMentionOpen(mode){'),app.indexOf('\nfunction showComments(postId){'));

test('Patiyiz app JavaScript still compiles',()=>new vm.Script(app));
test('Mention search in comments is a separate full-width flex child, never squeezed between composer controls',()=>{
 assert.match(mention,/const editor=mode==='comment'\?target\.closest\('\.pati-comment-editor-row'\):null/);
 assert.match(mention,/editor\.insertAdjacentElement\('beforebegin',panel\)/);
 assert.match(mention,/else target\.insertAdjacentElement\('afterend',panel\)/);
 assert.match(mention,/class="pati-mention-header"/);
 assert.match(mention,/class="pati-mention-close"/);
 assert.match(mention,/autocomplete="off"/);
 assert.match(mention,/pati-mention-person-name/);
 assert.match(app,/case 'pati-mention-select':/);
 assert.match(app,/case 'pati-mention-open':/);
});
test('Composer stays compact with keyboard, results are scrollable, names not clipped, and panel can close',()=>{
 assert.match(css,/#modal-root #comment-form \.modal-footer > \.pati-mention-picker/);
 assert.match(css,/max-width:100%!important/);
 assert.match(css,/#comment-form \.modal-footer > \.pati-mention-picker \.pati-mention-results/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/#comment-form \.modal-footer:has\(> \.pati-mention-picker\) \.pati-comment-quick/);
 assert.match(css,/html\.pati-keyboard-open #modal-root \.modal-backdrop\.pati-instagram-comments-backdrop/);
 assert.match(css,/--pati-keyboard-inset,0px/);
 assert.match(css,/text-overflow:ellipsis!important/);
});
test('iPhone PWA and Android bundle load the final override and new JS cache key',()=>{
 assert.match(html,/patiyiz-mention-mobile-fix-20261030\.css\?v=1/);
 assert.match(html,/mention_ios_layout_fix=20261030/);
 assert.ok(html.indexOf('patiyiz-mention-mobile-fix-20261030.css')<html.indexOf('patiyiz-crop-insights-mobile-final-20261029.css'));
 assert.ok(html.indexOf('patiyiz-mention-mobile-fix-20261030.css')>html.indexOf('patiyiz-story-media-mentions-20261030.css'));
 assert.match(native,/'patiyiz-mention-mobile-fix-20261030\.css'/);
});
