/* BucheeSocial PWA auto-update: runs in Safari and installed Home Screen app. */
(()=>{'use strict';
 // Capacitor bundles its own assets; a web service worker must not override an installed APK.
 if(window.PatiyizNative?.isNative||window.PATIYIZ_ANDROID_NATIVE)return;
 if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
 let checking=false;let lastReload=0;
 // Keep existing automatic update detection. Do not replace data stored by the app.
 const version='20261103-release-phase6-1';
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
  // A controller switch must never discard unsent messages, media composition,
  // active dialogs, editing forms or an ongoing camera/story operation.
  const active=document.activeElement;
  const typing=!!active?.matches?.('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),textarea,[contenteditable="true"]');
  const overlay=!!document.querySelector('#pati-create-sheet:not([hidden]),#story-overlay,#modal-root .modal,#pati-creator-dashboard,#patiyiz-system-media:not([hidden]),.pati-reels-editor');
  const message=document.querySelector('#message-form input[name="body"],#message-form textarea[name="body"]');
  const draft=!!String(message?.value||'').trim();
  if(document.visibilityState==='visible'&&!typing&&!overlay&&!draft){
   try{sessionStorage.setItem(key,String(now))}catch(_){}
   window.location.reload();
  }
 });
 window.addEventListener('load',()=>{void check()},{once:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void check()});
 window.addEventListener('pageshow',()=>{void check()});
})();
