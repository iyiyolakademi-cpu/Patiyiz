const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-unified-social-design-20261031.css','utf8');
const app=fs.readFileSync('app.js','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');

test('Unified design is the last loaded stylesheet and automatically packed for native',()=>{
 const link='patiyiz-unified-social-design-20261031.css?v=1';
 assert.ok(html.includes(link));
 assert.ok(html.indexOf(link)>html.indexOf('patiyiz-interaction-polish-20261031.css'));
 assert.match(native,/const referenced=\[\.\.\.htmlSource\.matchAll/);
 assert.match(native,/for\(const file of referenced\)/);
 assert.ok(fs.existsSync('patiyiz-unified-social-design-20261031.css'));
});

test('Four screens have scoped layout rules and mobile breakpoints',()=>{
 for(const selector of [
  '#main-content>.stories-section',
  '#main-content .pati-feed-card .pati-social-actions',
  '#main-content .pati-home-question',
  '#main-content .pati-reel-item .pati-reel-video',
  '#main-content .pati-reel-item .pati-reel-caption',
  '#main-content .pati-ig-profile .pati-ig-summary',
  '#main-content .pati-ig-profile .pati-ig-grid',
  '#main-content .pati-dm-layout .chat-history',
  '#main-content .pati-dm-layout .chat-form'
 ])assert.ok(css.includes(selector),'Missing '+selector);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
});

test('Previously requested profile white design is preserved',()=>{
 assert.match(css,/#main-content \.pati-ig-profile\{[\s\S]*?background:#fff!important/);
 assert.match(css,/#main-content \.pati-ig-profile \.pati-ig-about\{[\s\S]*?background:#fff!important/);
 assert.match(css,/html\[data-pati-theme="dark"\]/);
});

test('Existing home, reels and messaging controls remain connected',()=>{
 for(const action of ['like','comment','pati-repost','share-post','save']) {
  assert.ok(app.includes('data-action="'+action+'"'),'Missing existing '+action);
 }
 for(const action of ['reel-play','reel-sound','reel-seek','chat-back','dm-reply-jump']){
  assert.ok(app.includes('data-action="'+action+'"'),'Missing '+action);
 }
 assert.match(app,/mobile-chat-open/);
 assert.match(app,/patiEnsurePageBack/);
 assert.doesNotMatch(css,/\.chat-history\s*\{[^}]*height:\s*100vh/);
});

test('CSS blocks are balanced and no forced hiding of interactive controls was introduced',()=>{
 let depth=0;
 for(const chr of css){if(chr==='{')depth++;if(chr==='}')depth--;assert.ok(depth>=0)}
 assert.equal(depth,0);
 assert.doesNotMatch(css,/\.pati-reel-rail[^{}]*\{[^}]*display:none/);
 assert.doesNotMatch(css,/\.chat-form[^{}]*\{[^}]*display:none/);
 assert.doesNotMatch(css,/\.pati-ig-tabs[^{}]*\{[^}]*display:none/);
});
