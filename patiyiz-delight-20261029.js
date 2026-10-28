/* Patiyiz Delight — small, accessible motion layers; no database writes or reward mutations. */
(function(){
 'use strict';
 const mascot='patiyiz-mascot.svg?v=20261029-1';
 const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const safeNumber=v=>Math.max(0,Math.min(99999,Number.isFinite(Number(v))?Math.trunc(Number(v)):0));
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
 const mascotImage=(label='Patiyiz maskotu')=>'<img class="pati-delight-mascot" src="'+mascot+'" alt="'+esc(label)+'" decoding="async" width="105" height="105">';
 function streakMarkup(state={}){
  const ready=!!state.ready,days=ready?safeNumber(state.count):0,best=ready?safeNumber(state.best):0;
  const title=ready?days+' günlük seri':'Günlük giriş serin';
  const detail=!ready?'Giriş serin hesabınla eşitleniyor.':
   days===1?'Başlangıç yaptın! Yarın yeniden uğra.':
   days<7?'Harika gidiyorsun! Her gün uğradıkça serin büyüyor.':
   'Harika bir alışkanlık! Patili dostların seni bekliyor.';
  const milestones=[1,3,7,14,30],last=Math.max(0,...milestones.filter(n=>n<=days)),next=milestones.find(n=>n>days);
  const hint=ready?(next?next+' güne '+(next-days)+' gün kaldı.':'30 günlük hedefe ulaştın!'):'Başarıların korunur; serin görünür hâle gelecek.';
  return '<section class="pati-delight-card" data-pati-streak-card aria-label="Günlük giriş serisi">'+
   '<span class="pati-delight-art" aria-hidden="true">'+mascotImage('')+'</span>'+
   '<span class="pati-delight-details"><span class="pati-delight-eyebrow">🐾 HER GÜN PATİYİZ</span><strong>'+title+'</strong><small>'+detail+'</small>'+
   '<span class="pati-delight-streak-dots" aria-label="'+(ready?last+' gün dönüm noktası tamamlandı':'Seri yükleniyor')+'">'+milestones.map(n=>'<span class="'+(ready&&days>=n?'is-done':'')+'" title="'+n+' gün">'+n+'</span>').join('')+'</span>'+
   '<span class="pati-delight-next">'+hint+(ready?' · En uzun seri: '+best+' gün':'')+'</span></span></section>';
 }
 function academyIntro(count=0,total=101){
  return '<div class="pati-delight-academy" role="note">'+mascotImage()+
  '<div><strong>Her ders, yeni bir pati izi!</strong><span>'+(safeNumber(count))+' / '+(safeNumber(total))+' ders tamamlandı. Sonraki adımı açmak için mini sınavı bitir.</span></div></div>';
 }
 function toast(title,message){
  document.querySelector('.pati-delight-celebration')?.remove();
  const el=document.createElement('div');
  el.className='pati-delight-celebration';el.setAttribute('role','status');
  const img=document.createElement('img');img.src=mascot;img.alt='';
  const text=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
  strong.textContent=title;small.textContent=message;text.append(strong,small);el.append(img,text);
  document.body.appendChild(el);
  if(!reduced())requestAnimationFrame(()=>el.classList.add('is-shown'));
  else el.classList.add('is-shown');
  window.setTimeout(()=>{el.classList.remove('is-shown');window.setTimeout(()=>el.remove(),240)},2400);
 }
 function lessonCompleted(){
  toast('Harika, başardın!','Ders tamamlandı. Yeni bir adım açıldı.');
  const node=document.querySelector('#main-content .pati-edu-feedback.edu-v2-success');
  if(node&&!reduced())node.classList.add('pati-delight-lesson-success');
 }
 function followConfirmed(rect,isFollowing){
  if(!rect||!Number.isFinite(rect.left)||rect.width<=0||reduced())return;
  const old=document.querySelector('.pati-delight-follow-pop');old?.remove();
  const el=document.createElement('div');el.className='pati-delight-follow-pop';
  el.textContent=isFollowing?'✓ Takip ediliyor':'✓ Güncellendi';
  el.setAttribute('aria-hidden','true');el.style.left=Math.max(6,Math.min(window.innerWidth-170,rect.left+rect.width/2-70))+'px';
  el.style.top=Math.max(7,Math.min(window.innerHeight-47,rect.top-36))+'px';
  document.body.appendChild(el);
  el.addEventListener('animationend',()=>el.remove(),{once:true});
  window.setTimeout(()=>el.remove(),1200);
 }
 window.PatiyizDelight=Object.freeze({streakMarkup,academyIntro,lessonCompleted,followConfirmed,mascotImage});
})();
