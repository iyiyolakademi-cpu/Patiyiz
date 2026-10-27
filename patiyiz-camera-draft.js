/* Patiyiz private camera draft — client-only recovery after app interruption.
 * User-scoped, expiring IndexedDB records; never sends draft bytes to a server.
 */
(()=>{
 'use strict';
 const DB='patiyiz-camera-drafts',STORE='drafts',TTL=24*60*60*1000;
 const MAX_BYTES=120*1024*1024;
 function openDb(){
  return new Promise((resolve,reject)=>{
   if(typeof indexedDB==='undefined')return reject(Error('Taslak saklama desteklenmiyor.'));
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
   req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);
  });
 }
 async function action(user,verb,item){
  if(!user)return null;
  const db=await openDb();
  try{
   return await new Promise((resolve,reject)=>{
    const tr=db.transaction(STORE,verb==='load'?'readonly':'readwrite'),store=tr.objectStore(STORE);
    const req=verb==='load'?store.get(user):verb==='clear'?store.delete(user):store.put(item,user);
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>resolve(req.result??null);
   });
  }finally{db.close()}
 }
 async function save(user,mode,files,caption=''){
  const all=[...(files||[])];
  if(!user||!['post','story','reels'].includes(mode)||!all.length)return false;
  if(all.reduce((n,file)=>n+(file?.size||0),0)>MAX_BYTES)return false;
  try{await action(user,'save',{mode,files:all,caption:String(caption).slice(0,2000),saved:Date.now()});return true}
  catch(_){return false}
 }
 async function load(user){
  try{
   const item=await action(user,'load');if(!item)return null;
   if(Date.now()-(item.saved||0)>TTL){await clear(user);return null}
   if(!Array.isArray(item.files)||!item.files.length)return null;
   return item;
  }catch(_){return null}
 }
 async function clear(user){try{await action(user,'clear')}catch(_){}}
 window.PatiyizCameraDraft={save,load,clear,TTL};
})();