/* Single photo/text/question home feed: switch only between all users and followed users. */
(()=>{
'use strict';
function setup(){
 const menu=document.getElementById('pati-feed-menu');if(!menu)return;
 const original=[...menu.querySelectorAll(':scope > button[data-pati-feed-choice]')];
 original.forEach(b=>b.remove());
 const choices=[['all','Tümü','Resimli tweetler, yazılar ve sorular'],['following','Takip Ettiklerim','Takip ettiğin hesapların paylaşımları']];
 choices.forEach(([mode,title,description])=>{
  let b=menu.querySelector('[data-buchee-account-filter="'+mode+'"]');
  if(!b){
   b=document.createElement('button');b.type='button';b.setAttribute('role','menuitemradio');
   b.dataset.bucheeAccountFilter=mode;
   b.innerHTML='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-5 16-5 16 0" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="pati-feed-menu-label"><strong></strong><small></small></span><span class="pati-feed-selected" aria-hidden="true">✓</span>';
   menu.appendChild(b);
  }
  b.querySelector('strong').textContent=title;b.querySelector('small').textContent=description;
 });
 let blogButton=menu.querySelector('[data-action="buchee-blog-directory"]');
 if(!blogButton){blogButton=document.createElement('button');blogButton.type='button';blogButton.dataset.action='buchee-blog-directory';blogButton.setAttribute('role','menuitem');blogButton.innerHTML='<span class="pati-feed-menu-label"><strong>Blog</strong><small>Yalnızca blog yazılarını keşfet</small></span>';menu.appendChild(blogButton);}
 const current=document.querySelector('.buchee-home-feed-filters [aria-pressed="true"]')?.dataset.id||'all';
 const trigger=document.getElementById('pati-feed-menu-trigger');
 if(trigger){trigger.title='Akışı değiştir: Tümü veya Takip Ettiklerim';trigger.setAttribute('aria-label','Akışı değiştir: Tümü veya Takip Ettiklerim');}
 menu.setAttribute('aria-label','Akışı değiştir');
 menu.querySelectorAll('[data-buchee-account-filter]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.bucheeAccountFilter===current)));
}
document.addEventListener('click',e=>{
 const item=e.target.closest?.('#pati-feed-menu [data-buchee-account-filter]');if(!item)return;
 e.preventDefault();e.stopImmediatePropagation();
 const mode=item.dataset.bucheeAccountFilter;
 const menu=document.getElementById('pati-feed-menu'),trigger=document.getElementById('pati-feed-menu-trigger');
 if(menu){menu.hidden=true;menu.style.setProperty('display','none','important')}
 trigger?.setAttribute('aria-expanded','false');
 const btn=document.querySelector('.buchee-home-feed-filters [data-action="home-feed-tab"][data-id="'+mode+'"]');
 if(btn)btn.click();
 else document.querySelector('[data-view="home"]')?.click();
 requestAnimationFrame(setup);
},true);
function start(){
 setup();
 const header=document.querySelector('#app-root > header.mobile-header');
 if(header)new MutationObserver(()=>{if(document.getElementById('pati-feed-menu'))setup()}).observe(header,{childList:true,subtree:false});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
