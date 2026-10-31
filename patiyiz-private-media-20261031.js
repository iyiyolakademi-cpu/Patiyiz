/* Patiyiz account-media privacy: references are never publicly fetchable URLs.
   A signed URL is transient and minted only after Storage RLS authorizes the viewer.
   Do not save signed URLs back to database records. */
(function(global){
 'use strict';
 const bucket='patiyiz-private-posts',prefix=bucket+':',seconds=300;
 const cache=new Map();
 let owner='',lastRefresh=0,refreshCallback=null,refreshBusy=false;
 const fields=['image_url','video_url','video_cover_url','images','media_videos'];
 const marker=value=>typeof value==='string'&&value.startsWith(prefix);
 function getPath(ref){
  if(!marker(ref))return null;
  const p=ref.slice(prefix.length);
  if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/i.test(p)||p.includes('..'))return null;
  return p;
 }
 function signedRefUrl(ref,user,sb){
  const path=getPath(ref);
  if(!path)return Promise.resolve(marker(ref)?'':ref);
  if(!user||!sb)return Promise.resolve('');
  if(owner!==user){owner=user;cache.clear();}
  const key=user+':'+path,found=cache.get(key);
  if(found&&found.expires>Date.now()+10000)return Promise.resolve(found.url);
  return sb.storage.from(bucket).createSignedUrl(path,seconds).then(({data,error})=>{
   if(error||!data?.signedUrl){cache.delete(key);return '';}
   const url=data.signedUrl;
   cache.set(key,{url,expires:Date.now()+seconds*1000});
   if(cache.size>400)cache.delete(cache.keys().next().value);
   return url;
  }).catch(()=>{cache.delete(key);return ''});
 }
 async function hydrateRows(rows,user,sb){
  if(!Array.isArray(rows)||!rows.length)return rows||[];
  return Promise.all(rows.map(async original=>{
   if(!original)return original;
   // Preserve immutable raw references in memory for repeat signing.
   const raw=original._patiPrivateRaw||Object.fromEntries(fields.map(key=>[key,original[key]]));
   const sourceFields=fields.filter(key=>Array.isArray(raw[key])?raw[key].some(marker):marker(raw[key]));
   if(!sourceFields.length)return original;
   const row={...original,_patiPrivateRaw:raw};
   await Promise.all(sourceFields.map(async key=>{
    const values=raw[key];
    row[key]=Array.isArray(values)?await Promise.all(values.map(v=>signedRefUrl(v,user,sb))):await signedRefUrl(values,user,sb);
   }));
   return row;
  }));
 }
 async function upload(file,kind,user,sb,options={}){
  if(!user||!sb||!file?.size)throw Error('Medya yükleme oturumu veya dosyası bulunamadı.');
  const mime=(file.type||'').split(';')[0];
  const ext=kind==='video'?(mime==='video/webm'?'webm':mime==='video/quicktime'?'mov':'mp4'):
   mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
  const allowed=kind==='video'?['video/mp4','video/webm','video/quicktime']:['image/jpeg','image/png','image/webp'];
  if(!allowed.includes(mime))throw Error('Medya biçimi desteklenmiyor.');
  if(file.size>(kind==='video'?50:30)*1024*1024)throw Error('Medya boyutu sınırı aşıldı.');
  const path=user+'/'+crypto.randomUUID()+'.'+ext;
  const result=global.PatiyizReliableUpload?.upload&&options.reliable!==false?
   await global.PatiyizReliableUpload.upload({sb,projectUrl:options.projectUrl,bucket,key:path,file,contentType:mime,onProgress:options.onProgress}):
   await sb.storage.from(bucket).upload(path,file,{contentType:mime,cacheControl:'60',upsert:false});
  if(result.error)throw result.error;
  return prefix+path;
 }
 function clear(){cache.clear();owner='';lastRefresh=0;}
 function onRefresh(cb){refreshCallback=cb;}
 // Refresh after prior links expire without saving bearer links in persistent storage.
 if(global.document&&global.setInterval)global.setInterval(async()=>{
  if(global.document.hidden||!refreshCallback||refreshBusy||!cache.size)return;
  if(Date.now()-lastRefresh<240000)return;
  lastRefresh=Date.now();refreshBusy=true;cache.clear();
  try{await refreshCallback()}catch(e){console.warn('Özel medya yenilenemedi.')}finally{refreshBusy=false}
 },60000);
 global.PatiyizPrivateMedia={bucket,prefix,marker,getPath,upload,hydrateRows,clear,onRefresh};
})(window);
