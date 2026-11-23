/* Double-tap post likes: visual heart, reuse existing like action. */
(()=>{
'use strict';
let last=null;
function burst(card,x,y){
 const mark=document.createElement('span');mark.className='buchee-double-heart';mark.setAttribute('aria-hidden','true');
 mark.innerHTML='<svg viewBox="0 0 24 24"><path d="M20.8 8.5c0 4.1-5.1 8.1-8.8 11-3.7-2.9-8.8-6.9-8.8-11a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6Z" fill="currentColor"/></svg>';
 const rect=card.getBoundingClientRect();mark.style.left=Math.max(35,Math.min(rect.width-35,x-rect.left))+'px';mark.style.top=Math.max(35,Math.min(rect.height-35,y-rect.top))+'px';
 card.append(mark);setTimeout(()=>mark.remove(),820);
}
document.addEventListener('pointerup',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 if(e.target.closest?.('button,a,input,textarea,select,[role="button"],[contenteditable],.pati-reel-item'))return;
 const card=e.target.closest?.('.pati-feed-card[data-post-id]');if(!card)return;
 const id=card.dataset.postId,now=Date.now();
 if(last&&last.id===id&&now-last.at<360&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<65){
  last=null;
  const like=card.querySelector('[data-action="like"][data-id]');
  if(like){burst(card,e.clientX,e.clientY);if(like.getAttribute('aria-pressed')!=='true'&&!like.classList.contains('active'))like.click()}
 }else last={id,at:now,x:e.clientX,y:e.clientY};
},{passive:true});
})();
