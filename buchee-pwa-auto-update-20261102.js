/* BucheeSocial PWA auto-update: runs in Safari and installed Home Screen app. */
(()=>{'use strict';
 // Capacitor bundles its own assets; a web service worker must not override an installed APK.
 if(window.PatiyizNative?.isNative||window.PATIYIZ_ANDROID_NATIVE)return;
 if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
 let checking=false;let lastReload=0;
 // Keep existing automatic update detection. Do not replace data stored by the app.
 const version='20261104-single-neon-launch';
 async function check(){
  if(checking||!navigator.onLine)return;checking=true;
  try{
   const reg=await navigator.serviceWorker.register('./patiyiz-sw.js',{scope:'./',updateViaCache:'none'});
   await reg.update();
   if(reg.waiting&&navigator.serviceWorker.controller)reg.waiting.postMessage({type:'BUCHEE_SKIP_WAITING'});
  }catch(e){console.warn('BucheeSocial update check:',e)}finally{checking=false}
 }
 // Do not reload a live iPhone PWA when a new worker activates.
 // Reloading here restarts the splash and looks like several launch screens.
 // HTML and app assets are network-first; the next normal launch receives updates.
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  console.info('Buchee PWA güncellemesi etkin. Yeni sürüm sonraki normal açılışta kullanılacak.');
 });
 window.addEventListener('load',()=>{void check()},{once:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void check()});
 window.addEventListener('pageshow',()=>{void check()});
})();
