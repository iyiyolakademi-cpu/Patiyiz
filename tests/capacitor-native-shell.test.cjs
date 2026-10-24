const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const cfg=JSON.parse(read('native-capacitor/capacitor.config.json'));
const pkg=JSON.parse(read('native-capacitor/package.json'));
const web=read('native-capacitor/scripts/build-web.mjs');
const shell=read('native-capacitor/src/native-shell.js');
const workflow=read('.github/workflows/capacitor-android.yml');

test('Patiyiz Android uses its own signed-app identity, not remote URL wrapping',()=>{
 assert.equal(cfg.appId,'com.patiyiz.app');
 assert.equal(cfg.appName,'Patiyiz');
 assert.equal(cfg.webDir,'www');
 assert.equal(cfg.server?.url,undefined);
 assert.equal(cfg.server?.cleartext,false);
 assert.ok(pkg.dependencies['@capacitor/android'].startsWith('^8.'));
 assert.ok(!fs.existsSync(path.join(base,'native-capacitor','android')),
  'Generated native project must not be committed over the PWA');
});
test('Native web build includes the current social app, auth, courses and media upload modules',()=>{
 for(const name of ['index.html','app.js','premium-academy.js','achievements.js',
 'academy-101-part1.js','academy-101-part2.js','gallery-picker.js','patiyiz-upload.js'])
  assert.match(web,new RegExp("'"+name.replace(/\./g,'\\.')+"'"));
 assert.match(web,/await cp\(path\.join\(root,name\)/);
 assert.match(web,/vendor\/supabase-compat\.js/);
 assert.match(web,/vendor\/tus-compat\.js/);
 assert.match(web,/native-shell\.js/);
 assert.match(web,/return s\.replace\(a,b\)/);
});
test('Native shell uses Capacitor Android activity title and handles back instead of Chrome tab',()=>{
 for(const part of ['@capacitor/app','@capacitor/status-bar','@capacitor/keyboard',
 "App.addListener('backButton'","App.minimizeApp()","patiyiz:native-back"])
  assert.ok(shell.includes(part),part);
 assert.match(web,/patiyiz:native-back/);
 assert.match(web,/mobileChatOpen/);
 assert.match(web,/closePatiCreate/);
 assert.match(web,/closeStory/);
 assert.match(web,/closeModal/);
});
test('Native build communicates limitations accurately instead of faking push and billing',()=>{
 assert.match(web,/Firebase\/FCM/);
 assert.match(web,/https:\/\/patiyiz\.com\//);
 assert.match(web,/password/);
 assert.ok(!pkg.dependencies['@capacitor/push-notifications'],
  'Native push must not be enabled without Firebase/FCM server integration.');
 assert.equal(pkg.private,true);
});
test('QA APK workflow uses Java 21, API 36 and no release credentials',()=>{
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/java-version: "21"/);
 assert.match(workflow,/android-36/);
 assert.match(workflow,/npm run build:web/);
 assert.match(workflow,/npx cap add android/);
 assert.match(workflow,/assembleDebug/);
 assert.match(workflow,/app-debug\.apk/);
 assert.doesNotMatch(workflow,/ANDROID_KEYSTORE_PASSWORD|assembleRelease|bundleRelease/);
 assert.match(read('.gitignore'),/native-capacitor\/android/);
});
test('Native JavaScript source passes syntax parsing and official Android target',()=>{
 for(const name of ['native-capacitor/src/native-shell.js',
  'native-capacitor/scripts/build-web.mjs',
  'native-capacitor/scripts/prepare-icons.mjs',
  'native-capacitor/scripts/check-native.mjs']){
  const source=read(name);
  assert.ok(source.length>100,name);
  const child=spawnSync(process.execPath,['--check',path.join(base,name)],{encoding:'utf8'});
  assert.equal(child.status,0,name+': '+child.stderr);
 }
});
