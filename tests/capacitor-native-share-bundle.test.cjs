const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const web=read('app.js');
const nativeBuild=read('native-capacitor/scripts/build-web.mjs');

test('Android shares real patiyiz.com URLs rather than its localhost WebView origin',()=>{
 assert.ok(web.includes("case 'profile-share':{const u=location.origin+location.pathname;"));
 assert.ok(web.includes("location.origin+location.pathname+'#post-'"));
 assert.ok(nativeBuild.includes("case 'profile-share':{const u='https://patiyiz.com/';"));
 assert.ok(nativeBuild.includes("app=app.replaceAll(nativePostShareSource,\"'https://patiyiz.com/#post-'\")"));
 assert.ok(nativeBuild.includes("app.includes('location.origin+location.pathname')"));
});

test('Android packaging checks that referenced web assets are actually included',()=>{
 assert.match(nativeBuild,/Missing bundled Android asset/);
 assert.match(nativeBuild,/Invalid bundled asset path/);
 assert.match(nativeBuild,/await access\(local\)/);
 assert.match(nativeBuild,/Unexpected remote SDK/);
 assert.match(nativeBuild,/vendor\/supabase-compat\.js/);
 assert.match(nativeBuild,/vendor\/tus-compat\.js/);
});
