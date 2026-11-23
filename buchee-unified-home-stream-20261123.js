/* Single photo/text/question home feed: switch only between all users and followed users. */
(()=>{
'use strict';
function setup(){
 const menu=document.getElementById('pati-feed-menu');if(!menu)return;
 const original=[...menu.querySelectorAll(':scope > button[data-pati-feed-choice]')];
 original.forEach(b=>b.remove());
 // Keep only the two primary destinations in the header selector.
 menu.querySelectorAll('[data-buchee-account-filter]').forEach(b=>b.remove());
 for(const [action,title,description] of [['buchee-blog-home','İçerikler','Gönderiler, anketler ve paylaşımlar'],['buchee-blog-directory','Blog','Yazılar ve uzun okumalar']]){
  let b=menu.querySelector('[data-action="'+action+'"]');
  if(!b){b=document.createElement('button');b.type='button';b.dataset.action=action;b.setAttribute('role','menuitem');menu.appendChild(b)}
  b.innerHTML='<span class="pati-feed-menu-label"><strong>'+title+'</strong><small>'+description+'</small></span>';
 }
 const trigger=document.getElementById('pati-feed-menu-trigger');
 if(trigger){trigger.title='Akışı değiştir: İçerikler veya Blog';trigger.setAttribute('aria-label','Akışı değiştir: Tümü veya Takip Ettiklerim');}
 menu.setAttribute('aria-label','Akışı değiştir');
 
}
function start(){
 setup();
 const header=document.querySelector('#app-root > header.mobile-header');
 if(header)new MutationObserver(()=>{if(document.getElementById('pati-feed-menu'))setup()}).observe(header,{childList:true,subtree:false});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
