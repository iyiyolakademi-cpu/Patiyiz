/* Patiyiz reliable uploads: use Supabase resumable TUS for large public media.
 * Standard SDK upload is retained as a compatibility fallback.
 * No secrets, direct Storage writes, or user data are stored here. */
(()=>{
 'use strict';
 const CHUNK=6*1024*1024;
 const RETRIES=[0,3000,5000,10000,20000];
 function storageEndpoint(projectUrl){
  const origin=new URL(projectUrl);
  if(!/^[a-z0-9-]+\.supabase\.co$/i.test(origin.hostname))throw Error('Güvenli Storage adresi bulunamadı.');
  origin.hostname=origin.hostname.replace(/\.supabase\.co$/i,'.storage.supabase.co');
  origin.pathname='/storage/v1/upload/resumable';
  origin.search='';origin.hash='';
  return origin.href;
 }
 async function upload({sb,projectUrl,bucket,key,file,contentType,onProgress}){
  if(!sb||!bucket||!key||!file?.size)throw Error('Yüklenecek dosya bulunamadı.');
  if(navigator.onLine===false)throw Error('İnternet bağlantısı yok. Bağlanınca yeniden dene.');
  const caps={'patiyiz-media':2*1024*1024,'patiyiz-videos':8*1024*1024,
   'patiyiz-private-posts':8*1024*1024,'patiyiz-close-stories':8*1024*1024,
   'patiyiz-private-messages':2*1024*1024,'patiyiz-group-avatars':1024*1024,
   'buchee-brand-avatars':1024*1024,'patiyiz-voice-comments':1024*1024,
   'patiyiz-health-private':2*1024*1024,'buchee-capsules':8*1024*1024};
  const cap=caps[bucket]||8*1024*1024;
  if(file.size>cap)throw new Error('Dosya bu sürümde en fazla '+Math.floor(cap/1024/1024)+' MB olabilir. Daha küçük bir dosya seç.');
  const mime=contentType||file.type||'application/octet-stream';
  // Public uploads use unique, non-overwritten paths: cache them longer.
  // Private buckets retain the shorter cache lifetime.
  const publicBuckets=new Set(['patiyiz-media','patiyiz-videos','buchee-brand-avatars','patiyiz-group-avatars','patiyiz-voice-comments']);
  const cacheSeconds=publicBuckets.has(bucket)?'2592000':'604800';
  // Large files use resumable transfers only when the pinned TUS library is available.
  if(file.size>CHUNK&&window.tus?.Upload){
   const {data,error}=await sb.auth.getSession();
   if(error)throw error;
   if(!data?.session?.access_token)throw Error('Oturum sona erdi. Yeniden giriş yap.');
   return new Promise((resolve,reject)=>{
    let finished=false;
    const done=(err)=>{
     if(finished)return;finished=true;
     if(err)reject(err);else resolve({error:null});
    };
    const transfer=new window.tus.Upload(file,{
     endpoint:storageEndpoint(projectUrl),
     headers:{authorization:'Bearer '+data.session.access_token},
     uploadDataDuringCreation:true,
     removeFingerprintOnSuccess:true,
     retryDelays:RETRIES,
     chunkSize:CHUNK,
     metadata:{bucketName:bucket,objectName:key,contentType:mime,cacheControl:cacheSeconds},
     onProgress:(sent,total)=>{if(total>0&&typeof onProgress==='function')onProgress(Math.min(99,Math.floor(sent*100/total)))},
     onError:err=>done(err instanceof Error?err:new Error(String(err))),
     onSuccess:()=>{onProgress?.(100);done(null)}
    });
    // Do not reuse a stored fingerprint: each publication owns a distinct random path.
    try{transfer.start()}catch(err){done(err)}
   });
  }
  // Small files and older browsers preserve the proven SDK path.
  const result=await sb.storage.from(bucket).upload(key,file,{contentType:mime,cacheControl:cacheSeconds,upsert:false});
  if(!result.error)onProgress?.(100);
  return result;
 }
 window.PatiyizReliableUpload={upload,storageEndpoint,CHUNK};
})();