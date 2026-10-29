/* Patiyiz network-aware runtime; no personal data, no offline queued private actions. */
(()=>{
 'use strict';
 const connect=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 function refresh(){
  const offline=navigator.onLine===false;
  const reduced=!!connect?.saveData||['slow-2g','2g'].includes(connect?.effectiveType||'');
  document.documentElement.classList.toggle('pati-low-data',reduced||offline);
  let bar=document.getElementById('pati-quality-network');
  if(!bar){
   bar=document.createElement('div');bar.id='pati-quality-network';
   bar.className='pati-quality-status';bar.setAttribute('role','status');
   bar.setAttribute('aria-live','polite');bar.hidden=true;
   document.body.appendChild(bar);
  }
  if(offline){bar.textContent='Bağlantı yok · Paylaşım ve mesaj göndermek için internet gerekli';bar.hidden=false}
  else{bar.textContent='';bar.hidden=true}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
 else refresh();
 window.addEventListener('online',refresh);
 window.addEventListener('offline',refresh);
 connect?.addEventListener?.('change',refresh);
})();
