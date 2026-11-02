/* Buchee: non-destructive enhancements to dynamically rendered screens. */
(()=>{'use strict';
const $=(s,root=document)=>root.querySelector(s);
let pending=false;
function enhance(){
 pending=false;
 const word=$('#pati-feed-menu-trigger .brand-word');
 if(word&&!$('.buchee-feed-chevron',word)){const span=document.createElement('span');span.className='buchee-feed-chevron';span.setAttribute('aria-hidden','true');span.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>';word.appendChild(span)}
 const coins=$('#pati-header-coins');
 if(coins){const title=$('.pati-balance-title',coins);if(title&&title.textContent!=='Bakiyem')title.textContent='Bakiyem'}
 const actions=$('.pati-dm-top-actions');
 if(actions&&!actions.classList.contains('buchee-chat-actions')){
  const originals=[...actions.querySelectorAll('[data-action="dm-new"],[data-action="pati-group-create-open"]')];
  if(originals.length===2){
   actions.classList.add('buchee-chat-actions');
   originals.forEach(n=>n.hidden=true);
   const btn=document.createElement('button');btn.type='button';btn.className='buchee-chat-menu-button';btn.setAttribute('aria-label','Yeni mesaj seçenekleri');btn.setAttribute('aria-haspopup','menu');btn.setAttribute('aria-expanded','false');btn.textContent='⋯';
   const pop=document.createElement('div');pop.className='buchee-chat-popover';pop.setAttribute('role','menu');pop.hidden=true;
   pop.innerHTML='<button type="button" role="menuitem" data-buchee-message="dm-new">＋ Yeni sohbet</button><button type="button" role="menuitem" data-buchee-message="pati-group-create-open">♧ Yeni grup</button>';
   actions.append(btn,pop);
  }
 }
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(enhance)}}
document.addEventListener('click',e=>{
 const option=e.target.closest('[data-buchee-message]');
 if(option){const wrap=option.closest('.buchee-chat-actions');const original=wrap?.querySelector('[data-action="'+option.dataset.bucheeMessage+'"]');wrap.querySelector('.buchee-chat-popover').hidden=true;wrap.querySelector('.buchee-chat-menu-button').setAttribute('aria-expanded','false');original?.click();return}
 const button=e.target.closest('.buchee-chat-menu-button');
 if(button){const p=button.parentElement.querySelector('.buchee-chat-popover');const next=p.hidden;document.querySelectorAll('.buchee-chat-popover').forEach(el=>el.hidden=true);p.hidden=!next;button.setAttribute('aria-expanded',String(next));return}
 if(!e.target.closest('.buchee-chat-popover'))document.querySelectorAll('.buchee-chat-popover').forEach(p=>{p.hidden=true;p.parentElement.querySelector('.buchee-chat-menu-button')?.setAttribute('aria-expanded','false')})
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.buchee-chat-popover').forEach(p=>{p.hidden=true;p.parentElement.querySelector('.buchee-chat-menu-button')?.setAttribute('aria-expanded','false')})});
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();