#!/usr/bin/env node
// Patiyiz Android/PWA checks. Offline by default; --online checks public HTTPS.
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const errs=[],warnings=[],ok=[];
const pass=(message)=>ok.push(message);
const fail=(message)=>errs.push(message);
const warn=(message)=>warnings.push(message);
const isOnline=process.argv.includes('--online');

let app, web;
try{app=JSON.parse(read('android/twa-manifest.json'));}catch(e){fail('android/twa-manifest.json eksik veya geçersiz: '+e.message)}
try{web=JSON.parse(read('manifest.webmanifest'));}catch(e){fail('manifest.webmanifest eksik veya geçersiz: '+e.message)}
const expectedHost='patiyiz.com';
const packageRegex=/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/;
if(app){
 if(!packageRegex.test(app.packageId||''))fail('Android paket kimliği geçersiz.');
 else pass('Paket kimliği: '+app.packageId);
 if(app.host!==expectedHost)fail('Android host patiyiz.com ile aynı olmalı.');
 else pass('Android adresi: https://'+app.host+app.startUrl);
 if(app.startUrl!=='/'||app.fullScopeUrl!=='https://patiyiz.com/')fail('TWA kök yolu/scope beklenen değerden farklı.');
 if(app.webManifestUrl!=='https://patiyiz.com/manifest.webmanifest')fail('TWA manifest URL yanlış.');
 if(!/^https:\/\/patiyiz\.com\//.test(app.iconUrl||''))fail('TWA iconUrl farklı origin kullanıyor.');
 if(app.enableNotifications!==true)warn('TWA bildirim özelliği kapalı.');
 if(app.appVersionCode!==1||app.appVersion!=='1.0.0')warn('Android sürümü ilk paket sürümüyle eşleşmiyor; Play güncellemelerinde versionCode artmalı.');
 if(!app.signingKey?.alias||!app.signingKey?.path)fail('Signing key yolu/takma adı tanımsız.');
 if(app.fingerprints?.some(f=>!/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/i.test(f.value||'')))fail('TWA fingerprints girdilerinden biri hatalı.');
}
if(web){
 if(web.name!=='BucheeSocial'||web.display!=='standalone')fail('BucheeSocial PWA adı/görünümü uygun değil.');
 if(!['/','./'].includes(web.start_url)||!['/','./'].includes(web.scope))fail('PWA başlangıç ve scope kök alan adıyla uyumsuz.');
 const pngIcons=(web.icons||[]).filter(icon=>icon.type==='image/png');
 for(const size of [192,512]){
  const icon=pngIcons.find(x=>x.sizes?.split(' ').includes(size+'x'+size));
  if(!icon){fail('PWA '+size+'x'+size+' PNG simgesi bulunamadı.');continue;}
  const file=icon.src.split('?')[0];
  try{
   const bytes=fs.readFileSync(path.join(root,file));
   if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG değil');
   if(bytes.readUInt32BE(16)!==size||bytes.readUInt32BE(20)!==size)throw Error('Dosya gerçek boyutları farklı');
   pass(size+'x'+size+' PWA simgesi doğrulandı.');
  }catch(e){fail(size+'x'+size+' simgesi geçersiz: '+file+' ('+e.message+')')}
 }
}
if(read('CNAME').trim()!==expectedHost)fail('CNAME patiyiz.com olmalı.');
else pass('Alan adı konfigürasyonu doğru.');
for(const page of ['index.html','privacy.html','terms.html','delete-account.html']){
 if(!fs.existsSync(path.join(root,page)))fail(page+' bulunamadı.');else pass(page+' mevcut.');
}
const assetPath=path.join(root,'.well-known','assetlinks.json');
if(fs.existsSync(assetPath)){
 try{
  const links=JSON.parse(fs.readFileSync(assetPath,'utf8'));
  if(!Array.isArray(links)||!links.some(x=>x?.target?.package_name===app?.packageId&&x?.target?.sha256_cert_fingerprints?.length))
   fail('Yayınlanan assetlinks.json geçerli paket ve sertifika içermiyor.');
  else pass('Digital Asset Links taslağı gerçek fingerprint ile oluşturulmuş.');
 }catch(e){fail('Digital Asset Links JSON geçersiz: '+e.message)}
}else warn('Digital Asset Links henüz oluşturulmadı. Play App Signing SHA-256 alınınca android/generate-assetlinks.mjs ile üret.');
if(fs.existsSync(path.join(root,'android','app','build.gradle'))){
 const gradle=read('android/app/build.gradle');
 if(!/targetSdk(?:Version)?\s+36\b/.test(gradle))fail('Android Gradle targetSdk en az API 36 olmalı.');
 else pass('Üretilen Android projesi API 36 hedefliyor.');
}else warn('Android Gradle projesi henüz üretilmedi; Bubblewrap veya PWABuilder aşamasında API 36 doğrula.');
if(isOnline){
 const targets=['https://patiyiz.com/','https://patiyiz.com/manifest.webmanifest','https://patiyiz.com/patiyiz-app-icon-512.png','https://patiyiz.com/privacy.html','https://patiyiz.com/delete-account.html'];
 for(const url of targets){
  try{
   const r=await fetch(url,{method:'GET',signal:AbortSignal.timeout(12000),redirect:'follow'});
   if(!r.ok)fail(url+' -> HTTP '+r.status);
   else if(new URL(r.url).origin!=='https://patiyiz.com')fail(url+' başka origin’e yönlendiriyor: '+r.url);
   else pass('Canlı HTTPS erişilebilir: '+url);
   await r.arrayBuffer();
  }catch(e){fail('Canlı site doğrulanamadı: '+url+' ('+e.message+')')}
 }
}
for(const m of ok)console.log('OK  '+m);
for(const m of warnings)console.log('UYARI  '+m);
for(const m of errs)console.error('HATA  '+m);
console.log('\nPatiyiz Android hazırlık sonucu: '+ok.length+' doğrulandı, '+warnings.length+' bekleyen adım, '+errs.length+' hata.');
if(errs.length)process.exitCode=1;
