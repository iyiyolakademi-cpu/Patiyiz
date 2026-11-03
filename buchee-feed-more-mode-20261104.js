/* Buchee: four-line caption preview and compact Twit / Gönderi mode switch.
   No changes to posts, reposts, creator actions or stored content. */
(()=>{
 'use strict';
 const expanded=new Set();
 let scheduled=false;
 const doc=document.documentElement;
 const home=()=>doc.dataset.patiView==='home';
 const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>';
 let shortcut,menu;
 let selectedMode='text';
 function updateSelection(){
  if(!menu)return;
  for(const item of menu.querySelectorAll('[data-buchee-mode]')){
   item.setAttribute('aria-checked',String(item.dataset.bucheeMode===selectedMode));
  }
 }
 function close(){
  if(!menu||!shortcut)return;
  menu.hidden=true;shortcut.setAttribute('aria-expanded','false');
 }
 function mountShortcut(){
  const header=document.querySelector('#app-root > .mobile-header');
  if(!header)return;
  if(!shortcut||!shortcut.isConnected)shortcut=header.querySelector('#buchee-feed-shortcut');
  if(!menu||!menu.isConnected)menu=header.querySelector('#buchee-feed-shortcut-menu');
  if(shortcut&&menu)return;
  shortcut=document.createElement('button');
  shortcut.type='button';shortcut.id='buchee-feed-shortcut';
  shortcut.innerHTML=icon;
  shortcut.setAttribute('aria-label','Twit veya Gönderi akışına geç');
  shortcut.setAttribute('title','Akış türünü değiştir');
  shortcut.setAttribute('aria-haspopup','menu');
  shortcut.setAttribute('aria-controls','buchee-feed-shortcut-menu');
  shortcut.setAttribute('aria-expanded','false');
  menu=document.createElement('div');menu.id='buchee-feed-shortcut-menu';
  menu.setAttribute('role','menu');menu.setAttribute('aria-label','Akış türünü seç');
  menu.hidden=true;
  menu.innerHTML='<button type="button" role="menuitemradio" data-buchee-mode="text" aria-checked="true">Twit</button><button type="button" role="menuitemradio" data-buchee-mode="media" aria-checked="false">Gönderi</button>';
  const notifications=header.querySelector('.pati-header-actions');
  header.insertBefore(shortcut,notifications||null);
  header.appendChild(menu);
  shortcut.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   if(!home())return;
   if(menu.hidden){
    document.querySelector('#pati-feed-menu')?.setAttribute('hidden','');
    document.querySelector('#pati-feed-menu-trigger')?.setAttribute('aria-expanded','false');
    selectedMode=/gönderi/i.test(document.querySelector('#pati-feed-menu-trigger .pati-feed-current')?.textContent||'')?'media':'text';
    updateSelection();menu.hidden=false;shortcut.setAttribute('aria-expanded','true');
   }else close();
  });
  menu.addEventListener('click',event=>{
   const option=event.target.closest('[data-buchee-mode]');
   if(!option||!menu.contains(option))return;
   event.preventDefault();event.stopPropagation();
   const mode=option.dataset.bucheeMode;
   if(mode!=='text'&&mode!=='media')return;
   selectedMode=mode;updateSelection();close();
   window.dispatchEvent(new CustomEvent('patiyiz:feed-mode',{detail:{mode}}));
   shortcut.focus({preventScroll:true});
  });
  menu.addEventListener('keydown',event=>{
   if(!['ArrowUp','ArrowDown'].includes(event.key))return;
   event.preventDefault();
   const opts=[...menu.querySelectorAll('[data-buchee-mode]')];
   const n=opts.indexOf(document.activeElement);
   opts[(n+(event.key==='ArrowDown'?1:-1)+opts.length)%opts.length]?.focus();
  });
  document.addEventListener('click',event=>{
   if(!menu.hidden&&!menu.contains(event.target)&&!shortcut.contains(event.target))close();
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!menu.hidden){close();shortcut.focus({preventScroll:true});event.preventDefault();}
  });
  window.addEventListener('patiyiz:feed-mode-changed',event=>{
   selectedMode=event.detail?.mode==='media'?'media':'text';updateSelection();close();
  });
  window.addEventListener('resize',close);
  updateSelection();
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
