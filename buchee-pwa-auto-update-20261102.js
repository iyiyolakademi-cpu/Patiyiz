/* BucheeSocial PWA auto-update: runs in Safari and installed Home Screen app. */
(()=>{'use strict';
 if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
 let checking=false;let lastReload=0;
 const version='20261102-pwa-autoupdate-1';
 async function check(){
  if(checking||!navigator.onLine)return;checking=true;
  try{
   const reg=await navigator.serviceWorker.register('./patiyiz-sw.js',{scope:'./',updateViaCache:'none'});
   await reg.update();
   if(reg.waiting&&navigator.serviceWorker.controller)reg.waiting.postMessage({type:'BUCHEE_SKIP_WAITING'});
  }catch(e){console.warn('BucheeSocial update check:',e)}finally{checking=false}
 }
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(!navigator.serviceWorker.controller)return;
  const key='buchee-pwa-controller-refresh';
  const now=Date.now();
  try{lastReload=Number(sessionStorage.getItem(key)||0)}catch(_){}
  if(now-lastReload<30000)return;
  try{sessionStorage.setItem(key,String(now))}catch(_){}
  if(document.visibilityState==='visible'&&!document.querySelector('input:focus,textarea:focus'))window.location.reload();
 });
 window.addEventListener('load',()=>{void check()},{once:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void check()});
 window.addEventListener('pageshow',()=>{void check()});
})();
