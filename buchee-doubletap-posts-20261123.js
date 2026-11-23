/* Double tap only on post media; never intercept navigation or rerender a feed. */
(()=>{'use strict';
let last=null;
function mediaTarget(target){return target?.closest?.('.pati-feed-card[data-post-id] img,.pati-feed-card[data-post-id] video,.pati-feed-card[data-post-id] .pati-post-media,.pati-feed-card[data-post-id] .pati-feed-media')||null}
function burst(card,x,y){const mark=document.createElement('span');mark.className='buchee-double-heart';mark.setAttribute('aria-hidden','true');mark.textContent='♥';const r=card.getBoundingClientRect();mark.style.left=Math.max(35,Math.min(r.width-35,x-r.left))+'px';mark.style.top=Math.max(35,Math.min(r.height-35,y-r.top))+'px';mark.style.pointerEvents='none';card.append(mark);setTimeout(()=>mark.remove(),820)}
document.addEventListener('pointerup',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 if(e.target.closest?.('button,a,input,textarea,select,[role="button"],[contenteditable],.pati-reel-item')){last=null;return}
 const media=mediaTarget(e.target);if(!media){last=null;return}
 const card=media.closest('.pati-feed-card[data-post-id]');if(!card)return;
 const id=card.dataset.postId,now=Date.now();
 if(last&&last.id===id&&now-last.at<330&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<45){
  last=null;const like=card.querySelector('[data-action="like"][data-id]');
  if(like){burst(card,e.clientX,e.clientY);if(like.getAttribute('aria-pressed')!=='true'&&!like.classList.contains('active'))like.click()}
 }else last={id,at:now,x:e.clientX,y:e.clientY};
},{passive:true});
})();
