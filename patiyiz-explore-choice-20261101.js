/* Buchee phase 2: one Explore toolbar, clear sorting and session-only discovery history. */
(()=>{'use strict';
const main=document.getElementById('main-content');if(!main)return;
const opened=new Map();
const seed=Math.floor(Date.now()/60000);
let mode='for-you',scheduled=false,arranging=false;
const searchIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.6" cy="10.6" r="6.7"/><path d="m16 16 5 5"/></svg>';
const saveIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M5 3.5h14v17l-7-5-7 5V3.5Z"/></svg>';
const choices=[['for-you','Senin için'],['fresh','Yeni keşifler'],['recent','En yeni'],['views','Çok izlenen'],['likes','Çok beğenilen']];
function recordOpen(id){
 if(!id)return;
 if(opened.has(id)){const count=opened.get(id);opened.delete(id);opened.set(id,Math.min(4,count+1));}
 else opened.set(id,1);
 if(opened.size>140)opened.delete(opened.keys().next().value);
}
function hash(id){
 let n=seed|0;for(const c of id)n=(Math.imul(n,31)+c.charCodeAt(0))|0;
 return (n>>>0)/4294967295;
}
function diversify(items){
 // Avoid back-to-back cards by one author within a nearby rank window.
 const result=[],pending=items.slice();
 while(pending.length){
  const previous=result[result.length-1]?.author;
  let choice=0;
  if(previous&&pending[0]?.author===previous){
   const next=pending.findIndex((item,i)=>i>0&&i<=3&&item.author&&item.author!==previous);
   if(next>0)choice=next;
  }
  result.push(pending.splice(choice,1)[0]);
 }
 return result;
}
function arrange(section){
 const gallery=section.querySelector('.pati-explore-gallery');if(!gallery)return;
 const tiles=[...gallery.querySelectorAll(':scope > .pati-explore-media[data-id]')];
 if(tiles.length<2||!['for-you','fresh'].includes(mode))return;
 const items=tiles.map((el,i)=>({el,id:el.dataset.id||'',author:el.dataset.exploreAuthor||'',following:el.dataset.exploreFollowing==='true',rank:Number(el.dataset.exploreRank??i),opened:opened.get(el.dataset.id)||0}));
 if(mode==='for-you'){
  // Respect backend popularity order. Minor follow boost; opened cards move down rather than up.
  items.sort((a,b)=>(a.rank+(a.opened*12)-(a.following?2:0))-(b.rank+(b.opened*12)-(b.following?2:0))||a.rank-b.rank);
 }else{
  // Stable for this session: prefer unseen content without reshuffling during scrolling.
  items.sort((a,b)=>(a.opened>0?1:0)-(b.opened>0?1:0)||hash(a.id)-hash(b.id)||a.rank-b.rank);
 }
 const ranked=diversify(items);
 if(ranked.some((item,i)=>item.el!==tiles[i])){
  arranging=true;
  for(const item of ranked)gallery.appendChild(item.el);
  arranging=false;
 }
}
function enhance(){
 scheduled=false;
 const section=main.querySelector('.pati-explore-media-screen');if(!section)return;
 if(!section.querySelector('.pati-explore-custom-top')){
  const top=document.createElement('div');top.className='pati-explore-custom-top';
  top.innerHTML='<button type="button" class="pati-explore-custom-search" data-action="pati-search-open" aria-label="Kullanıcı ara">'+searchIcon+'<span>Kullanıcı ara</span></button>'+
   '<button type="button" class="pati-explore-custom-icon" data-action="saved-posts" aria-label="Kaydedilenleri aç" title="Kaydedilenler">'+saveIcon+'</button>';
  section.insertBefore(top,section.firstChild);
  const tabs=document.createElement('div');tabs.className='buchee-explore-switch';
  tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Keşfet içerik sıralaması');
  tabs.innerHTML=choices.map(([id,label])=>'<button type="button" data-explore-custom="'+id+'" aria-pressed="false">'+label+'</button>').join('');
  top.insertAdjacentElement('afterend',tabs);
 }
 const search=section.querySelector(':scope > .pati-explore-search-launch');if(search)search.hidden=true;
 const nativeSort=section.querySelector(':scope > .pati-explore-sort');if(nativeSort)nativeSort.hidden=true;
 for(const tab of section.querySelectorAll('.buchee-explore-switch [data-explore-custom]')){
  const active=tab.dataset.exploreCustom===mode;
  tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active));
 }
 arrange(section);
}
function schedule(){
 if(scheduled||arranging)return;
 scheduled=true;requestAnimationFrame(enhance);
}
document.addEventListener('click',event=>{
 const tab=event.target.closest?.('.pati-explore-media-screen .buchee-explore-switch [data-explore-custom]');
 if(tab){
  event.preventDefault();event.stopImmediatePropagation();
  const next=tab.dataset.exploreCustom;
  if(!choices.some(([id])=>id===next)||next===mode)return;
  mode=next;
  const selected=['recent','views','likes'].includes(mode)?mode:'popular';
  const native=main.querySelector('.pati-explore-media-screen .pati-explore-sort [data-action="explore-sort"][data-id="'+selected+'"]');
  if(native&&native.getAttribute('aria-pressed')!=='true'){native.click();return}
  schedule();
  return;
 }
 const tile=event.target.closest?.('.pati-explore-media-screen .pati-explore-media[data-id]');
 if(tile)recordOpen(tile.dataset.id);
},true);
new MutationObserver(records=>{
 if(arranging)return;
 if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!(r.target instanceof Element&&r.target.matches('.pati-explore-gallery')))))schedule();
}).observe(main,{childList:true,subtree:true});
schedule();
})();