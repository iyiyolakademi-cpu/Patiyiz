/* Disable the site's portrait-only warning; keep app usable in both orientations. */
(()=>{'use strict';const pattern=/^(?:📱\s*)?(?:lütfen\s+)?(?:telefonu|cihazı|ekranı)\s+(?:dik|dikey)\s+konuma\s+(?:getir(?:in|iniz)?|çevir(?:in|iniz)?|döndür(?:ün|ünüz)?)[.!\s]*$/i;
function unlock(){document.documentElement.classList.add('buchee-any-orientation');document.body&&document.body.classList.add('buchee-any-orientation');for(const el of document.querySelectorAll('body *')){if(el.children.length>2||el.matches('script,style,textarea,input,button'))continue;const t=(el.textContent||'').trim();if(t.length>110||!pattern.test(t))continue;let node=el;for(let i=0;i<4&&node.parentElement&&node.parentElement!==document.body;i++){const p=node.parentElement;const st=getComputedStyle(p);if(st.position==='fixed'||st.position==='absolute'||p.getAttribute('role')==='dialog'){node=p;break}node=p}if(node!==document.body&&node.id!=='app-root'&&node.id!=='auth-root'){node.style.setProperty('display','none','important');node.setAttribute('aria-hidden','true')}}}
function syncRotation(){
 const angle=Number(screen.orientation?.angle ?? window.orientation ?? 90);
 document.body?.classList.toggle('buchee-landscape-left',angle===90||angle===-270);
}
let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;unlock();syncRotation()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{unlock();syncRotation();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true})},{once:true});else{unlock();syncRotation();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true})}
// Request portrait lock where the OS/browser permits it (usually installed/fullscreen apps).
// Ordinary mobile browser tabs may reject this; never show a rotate-device warning.
if(screen.orientation&&typeof screen.orientation.lock==='function'){
  const lock=()=>{Promise.resolve().then(()=>screen.orientation.lock('portrait')).catch(()=>{})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lock,{once:true});else lock();
}
window.addEventListener('orientationchange',schedule);window.addEventListener('resize',schedule);
})();