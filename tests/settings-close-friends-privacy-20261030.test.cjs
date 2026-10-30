const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8'),media=fs.readFileSync('patiyiz-system-media.js','utf8'),styles=fs.readFileSync('patiyiz-settings-private-20261030.css','utf8'),html=fs.readFileSync('index.html','utf8'),native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
test('Settings code is rendered as HTML and contains real actions, not template fragments',()=>{
 const block=app.slice(app.indexOf('function settingsPage(){'),app.indexOf('const profileCountCache'));
 assert.doesNotMatch(block,/\+\(current\(\)\.is_private/);
 for(const name of ['pati-private-toggle','pati-dm-policy','pati-comment-filter','pati-close-friends-open','settings-password','logout'])assert.match(block,new RegExp(name));
 assert.match(block,/pati-settings-v2/);
});
test('Close Friends chooser requires explicit confirmation before private publish',()=>{
 assert.match(app,/async function patiCloseFriendsPicker\(\)/);
 assert.match(app,/data-cf-action="confirm"/);
 assert.match(app,/aria-modal.*true/);
 assert.match(app,/patiyiz_close_friends/);
 assert.match(app,/async onBeforePublish\(audience\)/);
 assert.match(media,/await state\.onBeforePublish/);
 assert.match(media,/approved!==true/);
 assert.match(media,/state\.editing=true/);
});
test('Settings and chooser CSS ships for web and native',()=>{
 assert.match(html,/patiyiz-settings-private-20261030\.css/);
 assert.match(native,/'patiyiz-settings-private-20261030\.css'/);
 assert.match(styles,/#pati-close-picker/);
 assert.match(styles,/html\[data-pati-theme="dark"\]/);
 assert.doesNotThrow(()=>new Function(app));
 assert.doesNotThrow(()=>new Function(media));
});
