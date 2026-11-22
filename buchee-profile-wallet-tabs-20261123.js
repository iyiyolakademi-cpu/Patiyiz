/* Compact profile wallet. Reuse existing wallet navigation; do not touch balances. */
(function(){
 'use strict';
 function update(){
  var profile=document.querySelector('#app-root #main-content .pati-ig-profile');
  if(!profile)return;
  var actions=profile.querySelector('.pati-own-profile-actions');
  var edit=actions&&actions.querySelector('[data-action="edit-profile"]');
  var earn=profile.querySelector('.buchee-simple-earn');
  if(!edit||!earn)return;
  var wallet=Array.from(earn.querySelectorAll('button,[role="button"],a')).find(function(el){return /bakiye|cüzdan|kazanç/i.test(el.textContent||'')});
  if(!wallet)return;
  edit.classList.add('buchee-wallet-shortcut');profile.classList.add('buchee-wallet-compact-ready');
  if(edit.textContent.trim()!=='Bakiyen')edit.textContent='Bakiyen';
  if(edit.getAttribute('aria-label')!=='Bakiyeni görüntüle')edit.setAttribute('aria-label','Bakiyeni görüntüle');
  if(!edit.dataset.bucheeWalletBound){
   edit.dataset.bucheeWalletBound='1';
   edit.addEventListener('click',function(event){
    if(!edit.classList.contains('buchee-wallet-shortcut'))return;
    var target=Array.from(profile.querySelectorAll('.buchee-simple-earn button,.buchee-simple-earn [role="button"],.buchee-simple-earn a')).find(function(el){return /bakiye|cüzdan|kazanç/i.test(el.textContent||'')});
    if(!target)return;
    event.preventDefault();event.stopImmediatePropagation();target.click();
   },true);
  }
  var tabs=profile.querySelector('.pati-ig-tabs');
  if(tabs){
   var visible=Array.from(tabs.querySelectorAll('button')).filter(function(b){return !b.hidden&&getComputedStyle(b).display!=='none'});
   tabs.style.setProperty('grid-template-columns','repeat('+Math.max(1,visible.length)+',minmax(0,1fr))','important');
  }
 }
 var pending=false;
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(function(){pending=false;update()})}
 function start(){update();var root=document.getElementById('main-content');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
