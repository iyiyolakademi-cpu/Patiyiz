/* Unified home stream menu: all, following, explore. Preserve legacy feed logic. */
(()=>{
'use strict';
function setup(){
 const menu=document.getElementById('pati-feed-menu');
 if(!menu)return;
 const rows=[...menu.querySelectorAll('[data-pati-feed-choice]')];
 if(rows.length<3)return;
 const modes=[['all','Tümü','Bütün paylaşımlar'],['following','Takip Ettiklerin','Takip ettiğin hesapların paylaşımları'],['explore','Keşfet','Yeni içerikler keşfet']];
 rows.slice(0,3).forEach((b,i)=>{
  b.dataset.bucheeStream=modes[i][0];
  const strong=b.querySelector('strong'),small=b.querySelector('small');
  if(strong)strong.textContent=modes[i][1];
  if(small)small.textContent=modes[i][2];
 });
 const current=document.querySelector('.buchee-home-feed-filters [aria-pressed="true"]')?.dataset.id||'all';
 rows.forEach(b=>b.setAttribute('aria-checked',String(b.dataset.bucheeStream===current)));
}
document.addEventListener('click',e=>{
 const item=e.target.closest?.('#pati-feed-menu [data-buchee-stream]');
 if(!item)return;
 e.preventDefault();e.stopImmediatePropagation();
 const mode=item.dataset.bucheeStream;
 const menu=document.getElementById('pati-feed-menu'),trigger=document.getElementById('pati-feed-menu-trigger');
 if(menu){menu.hidden=true;menu.style.setProperty('display','none','important')}
 trigger?.setAttribute('aria-expanded','false');
 if(mode==='explore'){
  document.querySelector('[data-view="explore"]')?.click();
 }else{
  if(mode==='all')window.dispatchEvent(new CustomEvent('patiyiz:feed-mode',{detail:{mode:'all'}}));
  const btn=document.querySelector('.buchee-home-feed-filters [data-action="home-feed-tab"][data-id="'+mode+'"]');
  btn?.click();
 }
 requestAnimationFrame(setup);
},true);
const observer=new MutationObserver(()=>{if(!document.getElementById('pati-feed-menu'))return;setup()});
function start(){setup();const root=document.getElementById('app-root');if(root)observer.observe(root,{childList:true,subtree:false})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
