#!/usr/bin/env node
// Create a production Digital Asset Links document only from real certificate SHA-256s.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const args=process.argv.slice(2);
const fingerprints=[];
for(let i=0;i<args.length;i++){
 if(args[i]==='--fingerprint'){
  if(!args[i+1]){console.error('Eksik SHA-256: --fingerprint "<SHA-256>"');process.exit(2)}
  fingerprints.push(args[++i]);
 }else{
  console.error('Bilinmeyen argüman: '+args[i]);process.exit(2);
 }
}
if(fingerprints.length===0){
 console.error('Gerçek sertifika SHA-256 olmadan Digital Asset Links üretilemez.');
 console.error('Örnek: node android/generate-assetlinks.mjs --fingerprint "AA:BB:...(32 çift)"');
 console.error('Önce Play Console > App integrity > App signing key certificate SHA-256 alın.');
 process.exit(2);
}
const pattern=/^([a-fA-F0-9]{2}:){31}[a-fA-F0-9]{2}$/;
for(const v of fingerprints)if(!pattern.test(v)){
 console.error('Geçersiz SHA-256 fingerprint: 32 hex çifti, iki nokta ile ayrılmış olmalı.');
 process.exit(2);
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'android','twa-manifest.json'),'utf8'));
const unique=[...new Set(fingerprints.map(v=>v.toUpperCase()))];
const doc=[{
 relation:['delegate_permission/common.handle_all_urls'],
 target:{namespace:'android_app',package_name:manifest.packageId,sha256_cert_fingerprints:unique}
}];
const folder=path.join(root,'.well-known');fs.mkdirSync(folder,{recursive:true});
const target=path.join(folder,'assetlinks.json');
fs.writeFileSync(target,JSON.stringify(doc,null,2)+'\n',{flag:'w'});
console.log('Hazır: .well-known/assetlinks.json');
console.log('Paket: '+manifest.packageId+', geçerli SHA-256 sayısı: '+unique.length);
console.log('Yayınlandıktan sonra: https://'+manifest.host+'/.well-known/assetlinks.json');
console.log('Bu dosya yalnız gerçek sertifika SHA-256ları ile üretilmelidir; imza anahtarı içermez.');
