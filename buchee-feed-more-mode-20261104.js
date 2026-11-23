/* Buchee: four-line caption preview and compact Twit / Gönderi mode switch.
   No changes to posts, reposts, creator actions or stored content. */
(()=>{
 'use strict';
 const expanded=new Set();
 let scheduled=false;
 const doc=document.documentElement;
 const home=()=>doc.dataset.patiView==='home';
 // Legacy extra switch removed. Keep the caption expansion feature below.
 function close(){}
 function mountShortcut(){
   const header=document.querySelector('#app-root > .mobile-header');
   header?.querySelector('#buchee-feed-shortcut')?.remove();
   const trigger=header?.querySelector('#pati-feed-menu-trigger');
   if(trigger)trigger.removeAttribute('tabindex');
 }
 function enhanceCaptions(){/* Two-line caption controller supersedes legacy four-line preview. */}
 function refresh(){
  scheduled=false;mountShortcut();enhanceCaptions();if(!home())close();
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh);}
 document.addEventListener('click',event=>{
  const more=event.target.closest('.buchee-caption-more');
  if(!more)return;
  event.preventDefault();event.stopPropagation();
  const caption=more.previousElementSibling;
  if(!caption?.classList.contains('buchee-feed-caption'))return;
  const postId=caption.closest('.pati-feed-card')?.dataset.postId;
  if(postId)expanded.add(postId);
  caption.classList.remove('buchee-caption-collapsed');
  more.remove();
 },true);
 function start(){
  const main=document.getElementById('main-content');
  if(main)new MutationObserver(schedule).observe(main,{childList:true,subtree:true});
  new MutationObserver(schedule).observe(doc,{attributes:true,attributeFilter:['data-pati-view','data-pati-screen']});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
