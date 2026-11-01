/* Patiyiz Explore: saved shortcut + personalized / random media browsing. */
(()=>{'use strict';
const main=document.getElementById('main-content');if(!main)return;
const KEY='patiyiz-explore-interest-v1';let history={};try{history=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){}
let mode='for-you', menuOpen=false, scheduled=false, internal=false;
const icons={
 save:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M5 3.5h14v17l-7-5-7 5V3.5Z"/></svg>',
 dots:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="4" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="20" cy="12" r="1.7"/></svg>'
};
function mark(id){if(!id)return;history[id]=Math.min(100,(history[id]||0)+1);try{localStorage.setItem(KEY,JSON.stringify(history))}catch(_){}}
function arrange(section){
 const gallery=section.querySelector('.pati-explore-gallery');if(!gallery)return;
 const tiles=[...gallery.querySelectorAll(':scope > .pati-explore-media[data-id]')];
 if(tiles.length<2)return;
 const ranked=tiles.map((el,i)=>({el,i,id:el.dataset.id||'',n:history[el.dataset.id]||0}));
 if(mode==='for-you')ranked.sort((a,b)=>b.n-a.n||a.i-b.i);
 else {
  const seed=Math.floor(Date.now()/180000);
  const hash=id=>{let h=seed;for(const ch of id)h=(Math.imul(h,31)+ch.charCodeAt(0))|0;return (h>>>0)/4294967295};
  ranked.sort((a,b)=>a.n-b.n||hash(a.id)-hash(b.id));
 }
 internal=true;
 for(const row of ranked)gallery.appendChild(row.el);
 internal=false;
}
function enhance(){
 scheduled=false;
 const section=main.querySelector('.pati-explore-media-screen');
 if(!section)return;
 const search=section.querySelector('.pati-explore-search-launch');
 if(!section.querySelector('.pati-explore-custom-top')){
  const bar=document.createElement('div');bar.className='pati-explore-custom-top';
  bar.innerHTML='<button type="button" class="pati-explore-custom-search" aria-label="Ara" data-explore-custom="search">⌕ <span>Ara</span></button><button type="button" class="pati-explore-custom-icon" aria-label="Kaydedilenleri aç" title="Kaydedilenler" data-explore-custom="saved">'+icons.save+'</button><div class="pati-explore-custom-menu-wrap"><button type="button" class="pati-explore-custom-icon" aria-label="Keşfet akışını seç" aria-haspopup="true" aria-expanded="false" data-explore-custom="menu">'+icons.dots+'</button><div class="pati-explore-custom-menu" hidden><button type="button" data-explore-custom="for-you">Senin İçin <small>İlgilendiğin paylaşımlar</small></button><button type="button" data-explore-custom="random">Rastgele <small>Daha önce açmadığın içerikler</small></button></div></div>';
  section.insertBefore(bar,section.firstChild);
 }
 if(search)search.hidden=true;
 const bar=section.querySelector('.pati-explore-custom-top');
 const popup=bar?.querySelector('.pati-explore-custom-menu');
 if(popup)popup.hidden=!menuOpen;
 const menuButton=bar?.querySelector('[data-explore-custom="menu"]');if(menuButton)menuButton.setAttribute('aria-expanded',String(menuOpen));
 for(const button of bar?.querySelectorAll('[data-explore-custom="for-you"],[data-explore-custom="random"]')||[])button.classList.toggle('is-selected',button.dataset.exploreCustom===mode);
 const oldSort=section.querySelector('.pati-explore-sort');if(oldSort)oldSort.hidden=true;
 arrange(section);
}
function schedule(){if(!scheduled&&!internal){scheduled=true;requestAnimationFrame(enhance)}}
document.addEventListener('click',event=>{
 const action=event.target.closest('[data-explore-custom]');if(action){
  const value=action.dataset.exploreCustom;
  event.preventDefault();event.stopImmediatePropagation();
  if(value==='search'){main.querySelector('.pati-explore-search-launch')?.click();return}
  if(value==='saved'){const target=document.createElement('button');target.type='button';target.hidden=true;target.dataset.action='saved-posts';main.appendChild(target);target.click();target.remove();return}
  if(value==='menu'){menuOpen=!menuOpen;schedule();return}
  if(value==='for-you'||value==='random'){mode=value;menuOpen=false;schedule();return}
 }
 const tile=event.target.closest('.pati-explore-media-screen .pati-explore-media[data-id]');
 if(tile)mark(tile.dataset.id);
 if(menuOpen&&!event.target.closest('.pati-explore-custom-menu-wrap')){menuOpen=false;schedule()}
},true);
new MutationObserver(records=>{if(!internal&&records.some(r=>r.addedNodes.length))schedule()}).observe(main,{childList:true,subtree:true});
schedule();
})();