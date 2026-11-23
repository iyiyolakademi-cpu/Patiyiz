/* Buchee story gestures — additive, no database changes.
 * Existing story-prev/story-next/story-close actions remain authoritative.
 */
(()=>{'use strict';
const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const style=document.createElement('style');
style.textContent=`
#story-overlay .story-player{will-change:transform;touch-action:pan-y}
#story-overlay.buchee-story-drag .story-player{transition:none!important}
#story-overlay.buchee-story-settle .story-player{transition:transform 220ms cubic-bezier(.2,.8,.2,1),opacity 220ms ease!important}
@media(prefers-reduced-motion:reduce){#story-overlay .story-player{transition:none!important}}
`;document.head.append(style);
let active=null,origin=null,preloadedUrl='',preloadVideo=null;
const overlay=()=>document.getElementById('story-overlay');
function reset(){active=null}
function interactive(el){return !!el?.closest('button,input,textarea,select,a,[role="button"],.story-viewers-sheet,.buchee-story-reply')}
function onStart(e){
const root=overlay();if(!root||!root.contains(e.target)||e.touches?.length!==1||interactive(e.target))return;
const t=e.touches[0];active={x:t.clientX,y:t.clientY,time:Date.now(),moved:false};
}
function onMove(e){
const root=overlay(),player=root?.querySelector('.story-player');
if(!active||!player||e.touches.length!==1)return;
const t=e.touches[0],dx=t.clientX-active.x,dy=t.clientY-active.y;
if(Math.abs(dx)>Math.abs(dy)||dy<0)return;
if(dy>12)active.moved=true;
if(!active.moved)return;
if(e.cancelable)e.preventDefault();
root.classList.add('buchee-story-drag');
if(!reduce()){const offset=Math.min(210,dy);player.style.transform='translate3d(0,'+offset+'px,0) scale('+(1-Math.min(.15,offset/1300))+')';player.style.opacity=String(1-Math.min(.4,offset/550))}
}
function onEnd(e){
const root=overlay(),player=root?.querySelector('.story-player');if(!active||!root||!player){reset();return}
const t=e.changedTouches?.[0];const dy=t?t.clientY-active.y:0,dx=t?t.clientX-active.x:0;
const close=active.moved&&dy>105&&Math.abs(dy)>Math.abs(dx)*1.3;
reset();root.classList.remove('buchee-story-drag');
if(close){root.querySelector('[data-action="story-close"]')?.click();return}
root.classList.add('buchee-story-settle');player.style.transform='';player.style.opacity='';
setTimeout(()=>root.classList.remove('buchee-story-settle'),240);
}
document.addEventListener('touchstart',onStart,{passive:true});
document.addEventListener('touchmove',onMove,{passive:false});
document.addEventListener('touchend',onEnd,{passive:true});
document.addEventListener('touchcancel',()=>{const p=overlay()?.querySelector('.story-player');if(p){p.style.transform='';p.style.opacity=''}reset()},{passive:true});
function observe(){
const root=overlay();
if(root&&!origin){const main=document.getElementById('main-content');origin={main,top:main?.scrollTop||0,windowY:window.scrollY};}
if(!root&&origin){const saved=origin;origin=null;requestAnimationFrame(()=>{if(saved.main?.isConnected&&Math.abs(saved.main.scrollTop-saved.top)>4)saved.main.scrollTop=saved.top;if(Math.abs(window.scrollY-saved.windowY)>4)window.scrollTo({top:saved.windowY,behavior:'instant'})})}
if(!root){preloadedUrl='';if(preloadVideo){preloadVideo.removeAttribute('src');preloadVideo.load();preloadVideo=null}return}
const nextImage=root.querySelector('.story-big-photo');if(nextImage)nextImage.decoding='async';
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;observe()})}).observe(document.body,{childList:true,subtree:true});observe();
})();