/* Buchee motion v1. Presentation only; no database writes or navigation overrides. */
(()=>{'use strict';
const reduce=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const later=(fn,ms)=>setTimeout(fn,ms);
const recent=new WeakMap();
function bounce(el){if(!el||reduce())return;el.classList.remove('bm-bounce');void el.offsetWidth;el.classList.add('bm-bounce');later(()=>el.classList.remove('bm-bounce'),360)}
function hearts(el){if(!el||reduce())return;const r=el.getBoundingClientRect();if(!r.width)return;for(let i=0;i<5;i++){const h=document.createElement('span');h.className='bm-heart-particle';h.textContent='♥';h.setAttribute('aria-hidden','true');h.style.left=(r.left+r.width/2+(i-2)*4)+'px';h.style.top=(r.top+r.height/2)+'px';h.style.setProperty('--bm-x',((i-2)*16)+'px');h.style.setProperty('--bm-r',((i-2)*15)+'deg');document.body.append(h);later(()=>h.remove(),740)}}
function success(){if(reduce())return;document.querySelector('.bm-success-toast')?.remove();const n=document.createElement('div');n.className='bm-success-toast';n.textContent='✓ Paylaşıldı';n.setAttribute('role','status');document.body.append(n);later(()=>n.remove(),1600)}
const buttonAction=(el)=>el?.closest?.('[data-action]')?.dataset?.action||'';
document.addEventListener('click',e=>{
 const el=e.target.closest?.('[data-action]');if(!el)return;
 const action=buttonAction(el);
 if(action==='like'&&el.getAttribute('aria-pressed')!=='true'){hearts(el);bounce(el)}
 if(/^(save|save-post|toggle-save|pati-save|bookmark|pati-bookmark)$/.test(action))bounce(el);
 if(/^(react|message-react|dm-react|pati-message-react|pati-dm-react)$/.test(action))bounce(el);
},true);
let oldView='',lastModal=false;
const seen=new WeakSet();
let lastSuccess=0;
function update(){
 const main=document.querySelector('#main-content');
 const view=document.body?.dataset?.view||document.querySelector('#app-root')?.dataset?.view||'';
 if(view&&view!==oldView){oldView=view;if(main&&!reduce()){main.classList.remove('bm-page-enter');void main.offsetWidth;main.classList.add('bm-page-enter');later(()=>main.classList.remove('bm-page-enter'),230)}}
 const modal=document.querySelector('#modal-root .modal');
 if(modal&&!lastModal)seen.add(modal);
 lastModal=!!modal;
 document.querySelectorAll('.buchee-poll-result i').forEach(el=>{if(seen.has(el))return;seen.add(el);if(!reduce()){el.style.animation='none';void el.offsetWidth;el.style.animation=''}});
 document.querySelectorAll('.bubble-chat.mine,.pati-group-bubble.mine').forEach(el=>{if(seen.has(el))return;seen.add(el);if(!reduce()){el.classList.add('bm-message-enter');later(()=>el.classList.remove('bm-message-enter'),260)}});
 document.querySelectorAll('.pati-notification-item,.notification-item').forEach(el=>{if(seen.has(el))return;seen.add(el);if(!reduce()){el.classList.add('bm-notification-enter');later(()=>el.classList.remove('bm-notification-enter'),280)}});
}
let scheduled=false;
const observer=new MutationObserver(records=>{
 if(records.some(r=>r.type==='childList'&&r.addedNodes.length)){
  for(const r of records)for(const node of r.addedNodes){
   if(node.nodeType!==1)continue;
   const el=node;
   const text=(el.textContent||'').trim();
   if(el.matches?.('#toasts .toast,.toast-stack .toast')&&/paylaş(ım|ıldı|tın|ıldı|ıldı başarı)/i.test(text)&&!/hata|başarısız|yüklenemedi/i.test(text)&&Date.now()-lastSuccess>2200){lastSuccess=Date.now();success()}
  }
 }
 if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update()});
});
function init(){if(!document.body)return;observer.observe(document.body,{subtree:true,childList:true});update()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
