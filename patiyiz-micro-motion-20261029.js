/* Patiyiz Motion: presentation-only feedback after confirmed app operations. */
(function(){
 'use strict';
 const coinAsset='pati-coin.svg?v=20261025-brand-1';
 const reduce=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const pawHTML='<span class="pati-motion-paws" aria-hidden="true"><span>🐾</span><span>🐾</span><span>🐾</span></span>';
 const queue=cb=>window.requestAnimationFrame?requestAnimationFrame(()=>requestAnimationFrame(cb)):setTimeout(cb,30);
 function heart(el){
  if(!el||reduce())return;
  const node=el.matches?.('.pati-heart-burst,.pati-reel-heart-burst')?el:el.querySelector?.('.pati-heart-burst,.pati-reel-heart-burst');
  if(!node)return;
  node.classList.remove('pop');void node.offsetWidth;node.classList.add('pop');
 }
 function coin(amount,titles=[]){
  const value=Number(amount);
  if(!Number.isFinite(value)||value<=0)return;
  document.querySelectorAll('.pati-motion-coin-toast,.pati-motion-flying-coin').forEach(el=>el.remove());
  const toast=document.createElement('div');
  toast.className='pati-motion-coin-toast';toast.setAttribute('role','status');
  const img=document.createElement('img');img.src=coinAsset;img.alt='';
  const detail=document.createElement('div'),heading=document.createElement('strong'),info=document.createElement('span');
  heading.textContent='+'+value.toLocaleString('tr-TR')+' PatiCoin';
  info.textContent=Array.isArray(titles)&&titles.length?titles.filter(Boolean).slice(0,2).join(' · '):'Görev ödülün hesabına eklendi';
  detail.append(heading,info);toast.append(img,detail);document.body.append(toast);
  setTimeout(()=>toast.remove(),2200);
  if(reduce())return;
  const targets=['#pati-header-coins','#pati-desktop-coins'];
  const dest=targets.map(s=>document.querySelector(s)).find(el=>el?.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  if(!dest)return;
  const end=dest.getBoundingClientRect();
  const flying=document.createElement('img');flying.className='pati-motion-flying-coin';flying.src=coinAsset;flying.alt='';flying.setAttribute('aria-hidden','true');
  const start=toast.getBoundingClientRect();const sx=start.left+21,sy=start.top+start.height/2;
  flying.style.left=sx-14+'px';flying.style.top=sy-14+'px';document.body.append(flying);
  const dx=end.left+end.width/2-sx,dy=end.top+end.height/2-sy;
  if(typeof flying.animate==='function'){
   const animation=flying.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+dx*.45+'px,'+(dy*.45-18)+'px) scale(1.15)',opacity:1},{transform:'translate('+dx+'px,'+dy+'px) scale(.4)',opacity:0}],{duration:750,easing:'cubic-bezier(.15,.65,.27,1)',fill:'forwards'});
   animation.finished.catch(()=>{}).finally(()=>flying.remove());
  }else flying.remove();
 }
 function loading(form){
  const status=form?.querySelector('.pati-upload-status');
  if(status&&!status.querySelector('.pati-motion-paws'))status.insertAdjacentHTML('afterbegin',pawHTML);
 }
 function messageSent(id,group=false){
  if(!id||reduce())return;
  queue(()=>{
   const nodes=[...document.querySelectorAll(group?'#main-content [data-group-message-id]':'#main-content [data-message-id]')];
   const bubble=nodes.find(el=>(group?el.dataset.groupMessageId:el.dataset.messageId)===id&&el.classList.contains('mine'));
   if(!bubble)return;
   bubble.classList.remove('pati-motion-message-enter');void bubble.offsetWidth;bubble.classList.add('pati-motion-message-enter');
   bubble.addEventListener('animationend',()=>bubble.classList.remove('pati-motion-message-enter'),{once:true});
  });
 }
 function petAdded(id){
  if(!id||reduce())return;
  let attempts=0;
  const find=()=>{
   const cards=[...document.querySelectorAll('#main-content [data-pet-id],#main-content .p4-pet-thumb[data-id]')];
   const el=cards.find(node=>(node.dataset.petId||node.dataset.id)===id);
   if(el){el.classList.add('pati-motion-pet-enter');el.addEventListener('animationend',()=>el.classList.remove('pati-motion-pet-enter'),{once:true});return}
   if(++attempts<5)setTimeout(find,220);
  };
  queue(find);
 }
 function boot(){
  const splash=document.querySelector('#startup .pati-splash-center');
  if(splash&&!splash.querySelector('.pati-motion-paws')){
   const wrap=document.createElement('div');wrap.className='pati-motion-splash-paws';wrap.innerHTML=pawHTML;splash.append(wrap);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 window.PatiyizMotion=Object.freeze({heart,coin,loading,messageSent,petAdded});
})();
