/* Buchee: four-line caption preview and compact Twit / Gönderi mode switch.
   No changes to posts, reposts, creator actions or stored content. */
(()=>{
 'use strict';
 const expanded=new Set();
 let scheduled=false;
 const doc=document.documentElement;
 const home=()=>doc.dataset.patiView==='home';
 const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>';
 let shortcut;
 function close(){
  const oldMenu=document.getElementById('pati-feed-menu');
  const oldTrigger=document.getElementById('pati-feed-menu-trigger');
  if(oldMenu&&!oldMenu.hidden&&oldTrigger)oldTrigger.click();
  if(shortcut)shortcut.setAttribute('aria-expanded','false');
 }
 function mountShortcut(){
  const header=document.querySelector('#app-root > .mobile-header');
  const oldTrigger=header?.querySelector('#pati-feed-menu-trigger');
  const oldMenu=header?.querySelector('#pati-feed-menu');
  if(!header||!oldTrigger||!oldMenu)return;
  if(!shortcut||!shortcut.isConnected)shortcut=header.querySelector('#buchee-feed-shortcut');
  if(shortcut)return;
  shortcut=document.createElement('button');
  shortcut.type='button';shortcut.id='buchee-feed-shortcut';
  shortcut.innerHTML=icon;
  shortcut.setAttribute('aria-label','Akış türünü değiştir');
  shortcut.setAttribute('title','Akış türünü değiştir');
  shortcut.setAttribute('aria-haspopup','menu');
  shortcut.setAttribute('aria-controls','pati-feed-menu');
  shortcut.setAttribute('aria-expanded','false');
  const notifications=header.querySelector('.pati-header-actions');
  header.insertBefore(shortcut,notifications||null);
  // The old, detailed menu is now opened ONLY by the rotating-arrow shortcut.
  // Keep the original trigger in DOM for compatibility with the existing menu controller.
  oldTrigger.tabIndex=-1;
  oldTrigger.addEventListener('click',event=>{
   if(event.isTrusted){
    event.preventDefault();event.stopImmediatePropagation();
   }
  },true);
  const sync=()=>shortcut?.setAttribute('aria-expanded',String(!oldMenu.hidden));
  shortcut.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   if(!home())return;
   oldTrigger.click();sync();
  });
  new MutationObserver(sync).observe(oldMenu,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',sync);
  window.addEventListener('patiyiz:feed-mode-changed',sync);
  window.addEventListener('resize',sync);
  sync();
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
