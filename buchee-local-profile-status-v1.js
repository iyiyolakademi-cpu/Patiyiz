/* Only show the local account's activity while this tab is actually active.
   Remote users need an authorized realtime presence service and privacy controls. */
(()=>{'use strict';
 const root=document.getElementById('main-content');
 if(!root)return;
 let queued=false;
 const sync=()=>{
  queued=false;
  const active=!document.hidden&&navigator.onLine!==false;
  for(const el of root.querySelectorAll('.pati-ig-avatar.buchee-self-profile')){
   el.classList.toggle('buchee-self-active',active);
   el.setAttribute('title',active?'Bu cihazda çevrim içisin':'');
  }
 };
 const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(sync)};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',schedule);
 window.addEventListener('online',schedule);
 window.addEventListener('offline',schedule);
 sync();
})();