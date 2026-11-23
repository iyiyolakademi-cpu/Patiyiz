/* Force an actual visible heart, not a font glyph or inherited icon. */
(()=>{
'use strict';
const HEART='<svg class="buchee-visible-heart" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path d="M20.84 8.61c0 4.18-5.15 8.13-8.84 11.02C8.31 16.74 3.16 12.79 3.16 8.61a4.85 4.85 0 0 1 8.84-2.69 4.85 4.85 0 0 1 8.84 2.69Z" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function fix(){
 const header=document.querySelector('#app-root > header.mobile-header');if(!header)return;
 const heart=header.querySelector('#pati-header-notifications'),message=header.querySelector('#buchee-header-messages');
 if(!heart||!message)return;
 if(!heart.querySelector('.buchee-visible-heart'))heart.innerHTML=HEART;
 for(const b of [heart,message]){
  for(const [k,v] of Object.entries({display:'flex',visibility:'visible',opacity:'1',background:'#111',backgroundColor:'#111',color:'#fff',width:'44px',height:'44px',minWidth:'44px',minHeight:'44px',borderRadius:'12px',alignItems:'center',justifyContent:'center',padding:'8px',border:'1px solid #111',filter:'none'}))b.style.setProperty(k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v,'important');
  const svg=b.querySelector('svg');
  if(svg)for(const [k,v] of Object.entries({display:'block',visibility:'visible',opacity:'1',width:'26px',height:'26px',stroke:'#fff',color:'#fff',fill:'none',filter:'none'}))svg.style.setProperty(k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v,'important');
 }
 heart.dataset.view='notifications';heart.setAttribute('aria-label','Hareketler');
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fix()})}
function start(){fix();const header=document.querySelector('#app-root > header.mobile-header');if(header)new MutationObserver(schedule).observe(header,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
