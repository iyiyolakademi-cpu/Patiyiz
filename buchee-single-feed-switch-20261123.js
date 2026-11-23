/* Remove only the obsolete duplicate home feed switch.
   Keep the real #pati-feed-menu-trigger and its event handlers untouched. */
(()=>{
 'use strict';
 function cleanup(){
   const header=document.querySelector('#app-root > header.mobile-header');
   if(!header)return;
   header.querySelectorAll('#buchee-home-feed-switch,.buchee-home-feed-switch,.buchee-extra-feed-switch').forEach(el=>el.remove());
   const main=header.querySelector('#pati-feed-menu-trigger');
   if(main){
     main.setAttribute('aria-haspopup','menu');
     main.setAttribute('aria-controls','pati-feed-menu');
     main.title='Akış seç: Tümü, Gönderiler ve Reels, Yazılar ve Sorular';
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup,{once:true});else cleanup();
 const observer=new MutationObserver(()=>cleanup());
 const begin=()=>{
   const root=document.querySelector('#app-root');
   if(root)observer.observe(root,{subtree:true,childList:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
})();
