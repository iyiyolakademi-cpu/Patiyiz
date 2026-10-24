const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const from=f=>fs.readFileSync(path.join(root,f),'utf8');
const config=JSON.parse(from('android/twa-manifest.json'));
const pwa=JSON.parse(from('manifest.webmanifest'));

test('Android TWA matches the production Patiyiz domain and package identity',()=>{
 assert.equal(from('CNAME').trim(),'patiyiz.com');
 assert.equal(config.host,'patiyiz.com');
 assert.equal(config.packageId,'com.patiyiz.app');
 assert.equal(config.name,'Patiyiz');
 assert.equal(config.startUrl,'/');
 assert.equal(config.fullScopeUrl,'https://patiyiz.com/');
 assert.equal(config.webManifestUrl,'https://patiyiz.com/manifest.webmanifest');
 assert.ok(config.iconUrl.startsWith('https://patiyiz.com/'));
 assert.ok(config.maskableIconUrl.startsWith('https://patiyiz.com/'));
 assert.equal(config.enableNotifications,true);
 assert.equal(config.appVersionCode,1);
 assert.ok(!JSON.stringify(config).includes('service_role'));
});
test('PWA has HTTPS-compatible standalone launch and two usable PNG icons',()=>{
 assert.equal(pwa.name,'Patiyiz');
 assert.equal(pwa.display,'standalone');
 assert.ok(['/','./'].includes(pwa.start_url));
 const icons=pwa.icons.filter(x=>x.type==='image/png');
 for(const n of [192,512]){
  const icon=icons.find(x=>x.sizes.split(' ').includes(n+'x'+n));
  assert.ok(icon,'Missing '+n+'x'+n+' PNG icon');
  const bytes=fs.readFileSync(path.join(root,icon.src.split('?')[0]));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),n);
  assert.equal(bytes.readUInt32BE(20),n);
 }
});
test('Offline Android readiness passes and missing DAL is explicitly flagged as pending',()=>{
 const result=spawnSync(process.execPath,['android/check-readiness.mjs'],{cwd:root,encoding:'utf8',timeout:15000});
 assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
 assert.match(result.stdout,/Patiyiz Android hazırlık sonucu/);
 assert.match(result.stdout,/Digital Asset Links/);
});
test('Digital Asset Links generator rejects missing or counterfeit SHA-256 fingerprints',()=>{
 const missing=spawnSync(process.execPath,['android/generate-assetlinks.mjs'],{cwd:root,encoding:'utf8'});
 assert.equal(missing.status,2);
 assert.match(missing.stderr,/Gerçek sertifika SHA-256/);
 const short=spawnSync(process.execPath,['android/generate-assetlinks.mjs','--fingerprint','TEST123'],{cwd:root,encoding:'utf8'});
 assert.equal(short.status,2);
 assert.match(short.stderr,/Geçersiz SHA-256/);
});
test('Signing workflow runs only manually and never commits keystores to the repository',()=>{
 const yaml=from('.github/workflows/android-package.yml');
 const ignore=from('.gitignore');
 assert.match(yaml,/workflow_dispatch:/);
 assert.doesNotMatch(yaml,/pull_request:/);
 assert.match(yaml,/ANDROID_KEYSTORE_BASE64/);
 assert.match(yaml,/ANDROID_KEYSTORE_PASSWORD/);
 assert.match(yaml,/ANDROID_KEY_PASSWORD/);
 assert.match(yaml,/ANDROID_KEY_ALIAS/);
 assert.match(yaml,/android-36/);
 assert.match(yaml,/--signingKeyPath/);
 assert.match(yaml,/app-release-bundle\.aab/);
 assert.match(yaml,/app-release-signed\.apk/);
 assert.match(ignore,/\/android\/\*\.keystore/);
 assert.match(ignore,/\/android\/\*\.aab/);
});
test('Release guide explains Play signing SHA, fingerprint verification and manual device tests',()=>{
 const guide=from('android/README.md');
 for(const item of ['App signing key','SHA-256','API 36','Google Play','APK','AAB','patiyiz.com/.well-known/assetlinks.json','mesaj']){
  assert.ok(guide.includes(item),'Missing Android guide topic: '+item);
 }
 assert.equal(fs.existsSync(path.join(root,'.well-known/assetlinks.json')),false,
   'Do not ship Digital Asset Links without a real signing certificate.');
});
