/* Patiyiz Delight — small, accessible motion layers; no database writes or reward mutations. */
(function(){
 'use strict';
 const mascot='patiyiz-mascot.svg?v=20261029-2';
 const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const safeNumber=v=>Math.max(0,Math.min(99999,Number.isFinite(Number(v))?Math.trunc(Number(v)):0));
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
 const mascotImage=(label='Patiyiz maskotu')=>'<img class="pati-delight-mascot" src="'+mascot+'" alt="'+esc(label)+'" decoding="async" width="105" height="105">';
 /* A user sees the centered, Duolingo-like daily card only once per Istanbul calendar day.
    The backend confirms the actual streak before this presentation runs. */
 const seenInPage=new Set();
 let streakActive=null,streakTimer=null;
 const flameSVG='<svg class="pati-streak-flame" viewBox="0 0 160 174" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
 '<defs><linearGradient id="pati-flame-gradient" x1="0" x2=".4" y1="0" y2="1"><stop stop-color="#ffc042"/><stop offset=".55" stop-color="#ff981f"/><stop offset="1" stop-color="#f35a21"/></linearGradient></defs>'+
 '<path d="M82 3c16 36-6 51-1 72 15-8 18-24 23-39 35 34 52 65 38 98-10 25-34 39-67 39-44 0-74-24-73-66C3 73 30 42 57 28c-5 31-2 46 13 52 8-25 26-42 12-77Z" fill="url(#pati-flame-gradient)"/>'+
 '<path d="M77 91c12 16 20 25 18 37 13-7 17-20 17-28 17 24 14 50-9 61-22 10-51 1-51-29 0-13 12-33 25-41Z" fill="#fff" />'+
 '<path d="M127 6v19m-10-9h19" stroke="#ffa51e" stroke-width="3" stroke-linecap="round"/><path d="M33 19v13m-7-7h14" stroke="#f9b52d" stroke-width="2.5" stroke-linecap="round"/>'+
 '</svg>';
 function streakWeekdays(state,day){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return '';
  const [year,month,date]=day.split('-').map(Number);
  const today=Date.UTC(year,month-1,date),dow=(new Date(today).getUTCDay()+6)%7;
  const count=safeNumber(state.count),start=today-(Math.max(count,1)-1)*86400000;
  const labels=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  return labels.map((label,i)=>{
   const current=today+(i-dow)*86400000,complete=current>=start&&current<=today&&count>0;
   return '<span class="pati-streak-day'+(complete?' is-done':'')+(current===today?' is-today':'')+'">'+
    '<span class="pati-streak-day-circle" aria-label="'+label+(complete?' tamamlandı':current>today?' henüz gelmedi':' tamamlanmadı')+'">'+(complete?'✓':'·')+'</span>'+
    '<span class="pati-streak-day-name">'+label+'</span></span>';
  }).join('');
 }
 function closeStreak(){
  const active=streakActive;
  if(!active)return;
  streakActive=null;
  if(streakTimer)clearTimeout(streakTimer);
  streakTimer=null;
  document.removeEventListener('keydown',streakEscape);
  active.classList.remove('is-visible');active.classList.add('is-closing');
  window.setTimeout(()=>active.remove(),reduced()?0:240);
 }
 function streakEscape(e){if(e.key==='Escape')closeStreak()}
 function showStreakOnce(state={},options={}){
  if(!state.ready||!state.count||!options.userId||!/^\d{4}-\d{2}-\d{2}$/.test(options.day||''))return false;
  const day=options.day,userId=options.userId,key='patiyiz-streak-popup:'+userId+':'+day;
  if(seenInPage.has(key)||streakActive||document.hidden)return false;
  try{if(localStorage.getItem(key)==='1'){seenInPage.add(key);return false}}catch(_){}
  seenInPage.add(key);
  try{localStorage.setItem(key,'1')}catch(_){}
  const days=safeNumber(state.count),best=safeNumber(state.best);
  const el=document.createElement('div');
  el.className='pati-streak-overlay';
  el.innerHTML='<div class="pati-streak-dialog" role="dialog" aria-label="Günlük giriş serin" aria-modal="false">'+
    '<button type="button" class="pati-streak-close" aria-label="Seri ekranını kapat">×</button>'+
    '<div class="pati-streak-sparkles" aria-hidden="true">'+flameSVG+'</div>'+
    '<div class="pati-streak-count">'+days.toLocaleString('tr-TR')+'</div>'+
    '<h2>günlük seri!</h2>'+
    '<p class="pati-streak-message">'+(days===1?'İlk patini bıraktın! Yarın tekrar görüşelim.':days<7?'Harika gidiyorsun! Her gün bir pati izi daha.':'Müthiş! Patili dostların seni her gün bekliyor.')+'</p>'+
    '<div class="pati-streak-week" role="group" aria-label="Bu haftaki giriş günleri">'+streakWeekdays(state,day)+'</div>'+
    '<div class="pati-streak-best">🏆 En uzun seri: '+best+' gün</div>'+
    '<div class="pati-streak-dismiss-note">Kısa süre sonra otomatik kapanır</div>'+
   '</div>';
  const button=el.querySelector('.pati-streak-close');
  button.addEventListener('click',closeStreak);
  el.addEventListener('click',e=>{if(e.target===el)closeStreak()});
  el.addEventListener('focusin',()=>{if(streakTimer){clearTimeout(streakTimer);streakTimer=null}});
  el.addEventListener('focusout',e=>{if(!el.contains(e.relatedTarget))scheduleStreakDismiss()});
  document.body.appendChild(el);
  streakActive=el;
  if(!reduced())requestAnimationFrame(()=>el.classList.add('is-visible'));
  else el.classList.add('is-visible');
  document.addEventListener('keydown',streakEscape);
  scheduleStreakDismiss();
  return true;
 }
 function scheduleStreakDismiss(){
  if(streakTimer)clearTimeout(streakTimer);
  if(streakActive)streakTimer=window.setTimeout(closeStreak,5100);
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
 window.PatiyizDelight=Object.freeze({showStreakOnce,closeStreak,academyIntro,lessonCompleted,followConfirmed,mascotImage});
})();
