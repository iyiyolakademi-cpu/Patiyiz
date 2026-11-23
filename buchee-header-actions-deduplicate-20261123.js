/* Exactly two header actions: activity heart left, messages right. */
(()=>{
 'use strict';
 let pending=false;
 function repair(){
  pending=false;
  const header=document.querySelector('#app-root > header.mobile-header');
  if(!header)return;
  const actions=header.querySelector('.pati-header-actions');
  if(!actions)return;
  const heart=header.querySelector('#pati-header-notifications');
  const message=header.querySelector('#buchee-header-messages');
  if(!heart||!message)return;
  // Remove obsolete message shortcuts, but never the approved right-hand button.
  header.querySelectorAll('button[data-view="messages"],button.buchee-header-messages,button.pati-header-messages').forEach(button=>{
   if(button!==message)button.remove();
  });
  heart.dataset.view='notifications';
  heart.setAttribute('aria-label','Hareketler');
  heart.title='Hareketler';
  heart.classList.add('buchee-header-activity');
  message.dataset.view='messages';
  message.setAttribute('aria-label','Mesajlar');
  message.title='Mesajlar';
  if(heart.parentElement!==actions)actions.prepend(heart);
  if(message.parentElement!==actions)actions.append(message);
  if(heart.nextElementSibling!==message)actions.insertBefore(heart,message);
  // Remove other obsolete action buttons while preserving the two real controls.
  for(const button of [...actions.querySelectorAll('button')]){
   if(button!==heart&&button!==message)button.remove();
  }
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(repair)}
 function start(){
  repair();
  const header=document.querySelector('#app-root > header.mobile-header');
  if(header)new MutationObserver(schedule).observe(header,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
