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
 function enhanceCaptions(){
  if(!home())return;
  const main=document.getElementById('main-content');
  if(!main)return;
  for(const caption of main.querySelectorAll('.pati-feed-card .buchee-feed-caption')){
   if(caption.dataset.bucheeExcerptReady==='1')continue;
   caption.dataset.bucheeExcerptReady='1';
   const card=caption.closest('.pati-feed-card');
   const postId=card?.dataset.postId||'';
   if(postId&&expanded.has(postId))continue;
   caption.classList.add('buchee-caption-collapsed');
   const chars=(caption.textContent||'').trim().length;
   if(chars<115 || (caption.scrollHeight<=caption.clientHeight+2 && chars<170)){
    caption.classList.remove('buchee-caption-collapsed');continue;
   }
   const more=document.createElement('button');
   more.type='button';more.className='buchee-caption-more';
   more.textContent='Devamı';
   more.setAttribute('aria-label','Yazının devamını göster');
   more.setAttribute('aria-expanded','false');
   caption.insertAdjacentElement('afterend',more);
  }
 }
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
