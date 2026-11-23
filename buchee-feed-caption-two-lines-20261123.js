/* All Buchee home-feed captions: two lines until Devamı is tapped. */
(()=>{
 'use strict';
 const expanded=new Set();
 let queued=false;
 function refresh(){
  queued=false;
  const root=document.getElementById('main-content');
  if(!root)return;
  for(const caption of root.querySelectorAll('.pati-feed-card .buchee-feed-caption')){
   const card=caption.closest('.pati-feed-card');
   const key=card?.dataset.postId;
   if(!key)continue;
   const holder=caption.parentElement;
   if(!holder)continue;
   let more=holder.querySelector(':scope > .buchee-caption-expand-two-lines');
   if(expanded.has(key)){
    caption.classList.remove('buchee-two-line-caption');
    more?.remove();continue;
   }
   caption.classList.add('buchee-two-line-caption');
   if(!more){
    more=document.createElement('button');
    more.type='button';
    more.className='buchee-caption-expand-two-lines';
    more.textContent='Devamı';
    more.setAttribute('aria-label','Gönderi açıklamasının tamamını göster');
    more.setAttribute('aria-expanded','false');
    caption.insertAdjacentElement('afterend',more);
   }
   // Hide Devamı on short captions that fit in two rendered lines.
   const overflow=caption.scrollHeight>caption.clientHeight+3;
   more.hidden=!overflow;
  }
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(refresh);}
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('.buchee-caption-expand-two-lines');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const caption=button.previousElementSibling;
  const card=button.closest('.pati-feed-card');
  if(!caption||!card)return;
  if(card.dataset.postId)expanded.add(card.dataset.postId);
  caption.classList.remove('buchee-two-line-caption');
  button.remove();
 },true);
 function start(){
  const root=document.getElementById('main-content');
  if(!root)return;
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  window.addEventListener('resize',schedule,{passive:true});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
