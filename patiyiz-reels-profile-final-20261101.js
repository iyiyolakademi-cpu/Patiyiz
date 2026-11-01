/* Resilient enhancements for profile views and save alignment, mobile first. */
(()=>{'use strict';
 const eye='<svg class="pati-eye-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.25 12s3.55-6.2 9.75-6.2 9.75 6.2 9.75 6.2-3.55 6.2-9.75 6.2S2.25 12 2.25 12Z"/><circle cx="12" cy="12" r="3.1"/></svg>';
 const main=document.getElementById('main-content');if(!main)return;
 let pending=false;
 function apply(){
  pending=false;
  for(const counter of main.querySelectorAll('.pati-profile-view-count:not([data-eye-upgraded])')){
   counter.dataset.eyeUpgraded='1';
   const textNodes=[...counter.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE);
   for(const n of textNodes){n.textContent=n.textContent.replace(/[◉◎]/g,'').trim();}
   counter.insertAdjacentHTML('afterbegin',eye);
  }
  for(const bar of main.querySelectorAll('.pati-feed-card .pati-actionbar.pati-social-actions')){
   const save=bar.querySelector(':scope > button[data-action="save"]');
   if(save&&bar.lastElementChild!==save)bar.appendChild(save);
  }
 }
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(apply)}};
 new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length&&r.target!==null))schedule()}).observe(main,{childList:true,subtree:true});
 schedule();
})();