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
 /* Confirmed like and save feedback comes from app.js after server verification. */
 if(/^(react|message-react|dm-react|pati-message-react|pati-dm-react)$/.test(action))bounce(el);
},true);

/* Swipe down only from the header of dedicated bottom sheets. Content scrolling is untouched. */
let gesture=null;
document.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'||e.button!==0)return;
 const head=e.target.closest?.('.buchee-poll-panel>header,.buchee-share-panel>header,.buchee-share-sheet>header');
 if(!head||e.target.closest('button,input,textarea,select,a'))return;
 const panel=head.parentElement;
 if(!panel||panel.getBoundingClientRect().top<window.innerHeight*.25)return;
 gesture={id:e.pointerId,y:e.clientY,x:e.clientX,panel};
},{passive:true});
document.addEventListener('pointerup',e=>{
 if(!gesture||gesture.id!==e.pointerId)return;
 const g=gesture;gesture=null;
 if(e.clientY-g.y<115||Math.abs(e.clientX-g.x)>90)return;
 const close=g.panel.querySelector('[data-action="buchee-poll-close"],[data-action="close"],[data-action="buchee-share-close"],.close-modal');
 if(close)close.click();
},{passive:true});
document.addEventListener('pointercancel',()=>{gesture=null},{passive:true});

window.addEventListener('buchee:motion',e=>{
 const {kind,id}=e.detail||{};
 if(kind==='published'){success();return}
 if(kind==='like'||kind==='save'){
  const buttons=[...document.querySelectorAll('[data-action="'+(kind==='like'?'like':'save')+'"][data-id="'+CSS.escape(String(id||''))+'"]')];
  if(buttons.length){bounce(buttons[0]);if(kind==='like')hearts(buttons[0])}
 }
 if(kind==='poll'){document.querySelectorAll('.buchee-poll-result-area[data-poll="'+CSS.escape(String(id||''))+'"] .buchee-poll-result i').forEach(el=>{el.style.animation='none';void el.offsetWidth;el.style.animation='bmFill .5s cubic-bezier(.2,.8,.2,1) both'})}
});
let oldView='',lastModal=false,lastMainKey='';
const seen=new WeakSet();
let lastSuccess=0;
function update(){
 const main=document.querySelector('#main-content');
 const view=document.body?.dataset?.view||document.querySelector('#app-root')?.dataset?.view||'';const key=main?.dataset?.bucheeHomeIdentity||'';
 if((view&&view!==oldView)||(key&&key!==lastMainKey)){oldView=view;lastMainKey=key;if(main&&!reduce()){main.classList.remove('bm-page-enter');void main.offsetWidth;main.classList.add('bm-page-enter');later(()=>main.classList.remove('bm-page-enter'),230)}}
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
