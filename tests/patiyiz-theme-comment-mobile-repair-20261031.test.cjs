const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-interaction-polish-20261031.css','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');

test('Patiyiz application parses and loads updated CSS/JS cache keys',()=>{
 new vm.Script(app,{filename:'app.js'});
 assert.match(html,/patiyiz-interaction-polish-20261031\.css\?v=5-question-theme-mobile/);
 assert.match(html,/comment_theme_mobile_fix=20261031v1/);
 assert.match(native,/Include every referenced same-origin CSS\/JS\/image automatically/);
});

test('Q&A reply dialog matches the post comment sheet and keeps typing state',()=>{
 const start=app.indexOf('function questionReplies(id){');
 const end=app.indexOf('/* Never display a confirmed heart',start);
 assert.ok(start>=0&&end>start);
 const section=app.slice(start,end);
 assert.match(section,/pati-instagram-comments/);
 assert.match(section,/pati-question-comments/);
 assert.match(section,/pati-sheet-comment/);
 assert.match(section,/pati-comment-profile-avatar/);
 assert.match(section,/patiCommentAge\(x\.created_at\)/);
 assert.match(section,/patiMentionsHTML\(x\.body\|\|''\)/);
 assert.match(section,/pati-comment-editor-row/);
 assert.match(section,/\.scrollTop=scroll/);
 assert.match(section,/input\.value=draft/);
});

test('Reply actions use the question reply record and support safe post-send state',()=>{
 assert.match(app,/case 'question-reply-to':/);
 assert.match(app,/case 'question-reply-delete':/);
 assert.match(app,/sb\.from\('replies'\)\.delete\(\)\.eq\('id',id\)\.eq\('author_id',me\.id\)/);
 assert.match(app,/const fromComments=Boolean\(document\.getElementById\('comment-form'\)\|\|document\.getElementById\('reply-form'\)\)/);
 assert.match(app,/const editor=form\.querySelector\('textarea\[name="body"\]'\);if\(editor\)editor\.value='';/);
});

test('Question majority colors never confuse a minority personal selection',()=>{
 assert.match(app,/leader:positive>negative\?'positive':negative>positive\?'negative':'tie'/);
 assert.match(app,/btn\.classList\.toggle\('pati-vote-leading',vote\.leader===kind\)/);
 assert.match(css,/button\[data-action="vote"\]\.active:not\(\.pati-vote-leading\)/);
 assert.match(css,/button\[data-action="vote-negative"\]\.active:not\(\.pati-vote-leading\)/);
 assert.match(css,/\.active:not\(\.pati-vote-leading\)::after/);
});

test('Dark/light comment surfaces, messaging and stats are independently themed',()=>{
 assert.match(css,/html\[data-pati-theme="light"\]\{/);
 assert.match(css,/html\[data-pati-theme="dark"\]\{/);
 assert.match(css,/:is\(#comment-form,#reply-form\)/);
 assert.match(css,/html\[data-pati-theme="dark"\]\[data-pati-view="messages"\]/);
 assert.match(css,/html\[data-pati-theme="dark"\] #main-content \.pati-ig-profile/);
 assert.match(css,/\.pati-mention-link/);
});

test('Small phones retain actions, safe areas and non-overlapping reply editors',()=>{
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/#main-content \.pati-feed-card \.pati-social-actions/);
 assert.match(css,/#main-content \.pati-home-question-actions/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
 assert.match(css,/--pati-keyboard-inset,0px/);
});
