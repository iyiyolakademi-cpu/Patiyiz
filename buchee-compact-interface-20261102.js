/* Buchee: non-destructive enhancements to dynamically rendered screens. */
(()=>{'use strict';
const $=(s,root=document)=>root.querySelector(s);
let pending=false;
function enhance(){
 pending=false;
 const word=$('#pati-feed-menu-trigger .brand-word');
 if(word&&!word.querySelector('.buchee-inline-chevron')){const arrow=document.createElement('span');arrow.className='buchee-inline-chevron';arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>';word.appendChild(arrow)}
 const coins=$('#pati-header-coins');
 if(coins){const title=$('.pati-balance-title',coins);if(title&&title.textContent!=='Bakiyem')title.textContent='Bakiye'}

}
function schedule(){if(!pending){pending=true;requestAnimationFrame(enhance)}}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();