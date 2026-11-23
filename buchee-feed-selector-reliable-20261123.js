/* Buchee reliable three-way home feed selector.
   Capture-phase delegation survives rerenders and prevents legacy click interceptors. */
(()=>{
 'use strict';
 const modes=[
  ['all','Tümü','Gönderiler, Reels, yazılar ve sorular'],
  ['media','Gönderiler ve Reels','Fotoğraf, video ve Reels'],
  ['text','Yazılar ve Sorular','Yazılı paylaşımlar ve soru-cevaplar']
 ];
 let active='text',open=false;
 const trigger=()=>document.getElementById('pati-feed-menu-trigger');
 const menu=()=>document.getElementById('pati-feed-menu');
 function sync(){
  const m=menu(),t=trigger();if(!m||!t)return;
  m.hidden=!open;m.style.setProperty('display',open?'grid':'none','important');
  t.setAttribute('aria-expanded',String(open));
  for(const b of m.querySelectorAll('[data-pati-feed-choice]')){
   const selected=b.dataset.patiFeedChoice===active;
   b.setAttribute('aria-checked',String(selected));
  }
 }
 function select(mode){
  if(!modes.some(x=>x[0]===mode))return;
  active=mode;open=false;sync();
  window.dispatchEvent(new CustomEvent('patiyiz:feed-mode',{detail:{mode}}));
  document.documentElement.classList.remove('buchee-feed-changing');
  void document.documentElement.offsetWidth;
  document.documentElement.classList.add('buchee-feed-changing');
  clearTimeout(window.__bucheeFeedTransitionTimer);
  window.__bucheeFeedTransitionTimer=setTimeout(()=>document.documentElement.classList.remove('buchee-feed-changing'),650);
 }
 document.addEventListener('click',event=>{
  const t=event.target.closest?.('#pati-feed-menu-trigger');
  const choice=event.target.closest?.('#pati-feed-menu [data-pati-feed-choice]');
  if(t){
   event.preventDefault();event.stopImmediatePropagation();
   open=!open;sync();return;
  }
  if(choice){
   if(choice.hasAttribute('data-buchee-stream'))return;
   event.preventDefault();event.stopImmediatePropagation();
   select(choice.dataset.patiFeedChoice);return;
  }
  if(open&&!event.target.closest?.('#pati-feed-menu')){open=false;sync();}
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&open){open=false;sync();trigger()?.focus();}
 },true);
 window.addEventListener('patiyiz:feed-mode-changed',event=>{
  const mode=event.detail?.mode;
  if(modes.some(x=>x[0]===mode)){active=mode;sync();}
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
