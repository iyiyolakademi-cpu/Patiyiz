/* Profile actions: preserve Edit, add wallet shortcut immediately to its right. */
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
 edit.classList.remove('buchee-wallet-shortcut');
 if(edit.textContent.trim()==='Bakiyen')edit.textContent='Düzenle';
 if(edit.getAttribute('aria-label')==='Bakiyeni görüntüle')edit.setAttribute('aria-label','Profili düzenle');
 var shortcut=actions.querySelector('.buchee-wallet-shortcut');
 if(!shortcut){
  shortcut=document.createElement('button');shortcut.type='button';
  shortcut.className='buchee-wallet-shortcut';shortcut.textContent='Bakiyen';
  shortcut.setAttribute('aria-label','Bakiyeni görüntüle');
  shortcut.addEventListener('click',function(e){
   var target=Array.from(profile.querySelectorAll('.buchee-simple-earn button,.buchee-simple-earn [role="button"],.buchee-simple-earn a')).find(function(el){return /bakiye|cüzdan|kazanç/i.test(el.textContent||'')});
   if(target){e.preventDefault();target.click();}
  });
  edit.insertAdjacentElement('afterend',shortcut);
 }
 if(shortcut.previousElementSibling!==edit)edit.insertAdjacentElement('afterend',shortcut);
 profile.classList.add('buchee-wallet-compact-ready');
 var tabs=profile.querySelector('.pati-ig-tabs');
 if(tabs){var visible=Array.from(tabs.querySelectorAll('button')).filter(function(b){return !b.hidden&&getComputedStyle(b).display!=='none'});var value='repeat('+Math.max(1,visible.length)+',minmax(0,1fr))';if(tabs.style.gridTemplateColumns!==value)tabs.style.setProperty('grid-template-columns',value,'important');}
}
var pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(function(){pending=false;update()})}
function start(){update();var root=document.getElementById('main-content');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
