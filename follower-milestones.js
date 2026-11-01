/* Patiyiz follower milestones: presentation only. All eligibility and PatiCoin
 * balances are verified server-side; no browser code can award currency. */
(()=>{
 'use strict';
 const tiers=[
  {need:1000,coins:100,title:'İlk Hedef',icon:'🐾',kind:'Bronz'},
  {need:5000,coins:300,title:'Gümüş Seviye',icon:'🥈',kind:'Gümüş'},
  {need:10000,coins:100,title:'Altın Seviye',icon:'🥇',kind:'Altın'},
  {need:50000,coins:500,title:'Platin Seviye',icon:'💎',kind:'Platin'},
  {need:100000,coins:1000,title:'Elmas Seviye',icon:'👑',kind:'Elmas'}
 ];
 const number=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('tr-TR');
 const countOf=n=>Math.max(0,Math.floor(Number(n)||0));
 function nextTarget(count){return tiers.find(t=>count<t.need)||null}
 function profileHint(count){
  const c=countOf(count),next=nextTarget(c);
  if(!next)return '<span class="pati-goal-header"><img class="pati-goal-logo" src="patiyiz-selected-logo.svg?v=20261024-new-p-logo-1" alt="" aria-hidden="true"><span><small>TÜM HEDEFLER TAMAMLANDI</small><strong>Elmas Seviye</strong></span><span class="pati-goal-arrow" aria-hidden="true">↗</span></span><span class="pati-goal-subtitle">100.000 takipçi başarısına ulaştın. Tebrikler!</span>';
  const previous=tiers.filter(t=>t.need<=c).at(-1)?.need||0;
  const percent=Math.min(100,Math.max(0,(c-previous)/(next.need-previous)*100));
  return '<span class="pati-goal-header"><img class="pati-goal-logo" src="patiyiz-selected-logo.svg?v=20261024-new-p-logo-1" alt="" aria-hidden="true"><span><small>SIRADAKİ HEDEF</small><strong>'+number(next.need)+' takipçi</strong></span><span class="pati-goal-arrow" aria-hidden="true">↗</span></span>'+
   '<span class="pati-goal-subtitle">'+next.title+' rozetine ilerliyorsun</span>'+
   '<span class="pati-goal-stats"><span>'+number(c)+' takipçi</span><strong>%'+Math.floor(percent)+'</strong></span>'+
   '<span class="pati-follower-progress" role="progressbar" aria-label="Sıradaki hedefe ilerleme" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent.toFixed(0)+'"><i style="width:'+percent.toFixed(2)+'%"></i></span>'+
   '<span class="pati-goal-foot"><small>'+number(next.need-c)+' takipçi kaldı</small><small>Ödülleri gör →</small></span>';
 }
 function renderPanel(followerCount,claims,cashClaims=[]){
  const hasCount=followerCount!==null&&followerCount!==undefined;
  const c=countOf(followerCount),earned=new Set(Array.isArray(claims)?claims:[]),cashByTier=new Map((Array.isArray(cashClaims)?cashClaims:[]).map(x=>[Number(x.threshold),x]));
  const next=nextTarget(c);
  const head='<div class="pati-follower-header"><span class="pati-follower-eyebrow">🏆 TOPLULUK BAŞARILARI</span><h2>Takipçi ödülleri</h2><p>Gerçek takipçi hedeflerine ulaşınca bir defalık puan ödülü ve başarı rozeti kazanırsın. Ödüller sunucu tarafından doğrulanır; mavi tik veya nakit ödül verilmez.</p></div>';
  const banner=hasCount?'<div class="pati-follower-summary"><strong>'+number(c)+'</strong><span>Güncel takipçin</span><small>'+(next?'Sıradaki hedef: '+number(next.need)+' takipçi':'Bütün hedefleri tamamladın!')+'</small></div>':'<p class="pati-follower-loading">Takipçi sayın doğrulanıyor…</p>';
  const cards=tiers.map(t=>{
    const won=earned.has('followers_'+t.need);
    const pct=hasCount?Math.min(100,c/t.need*100):0;
    const status=won?'✓ Puan kazanıldı':hasCount&&c>=t.need?'Doğrulanıyor':'Hedefe '+number(Math.max(0,t.need-c))+' kaldı';
    const cashInfo='';
    return '<article class="pati-follower-tier '+(won?'is-earned':'')+'"><div class="pati-follower-tier-icon" aria-hidden="true">'+t.icon+'</div><div class="pati-follower-tier-copy"><span>'+t.kind+' rozet</span><h3>'+number(t.need)+' takipçi</h3><strong>'+t.title+'</strong></div><span class="pati-follower-coin">'+(won?'✓':'+'+number(t.coins))+' <img class="pati-coin-icon" src="pati-coin.svg?v=20261025-brand-1" alt="" aria-hidden="true"></span><div class="pati-follower-track"><i style="width:'+pct.toFixed(2)+'%"></i></div><small>'+status+'</small>'+cashInfo+'</article>';
  }).join('');
  return '<section class="pati-follower-milestones" aria-label="Takipçi başarı ödülleri">'+head+banner+'<div class="pati-follower-grid">'+cards+'</div><p class="pati-follower-terms">Puan ödülleri sunucuda doğrulanıp bir kez verilir. Sahte takipçi ödül hakkı oluşturmaz. Rozetler kimlik doğrulaması yerine geçmez. Daha önce yapılmış nakit başvurularının mevcut durumları ayrıca korunur.</p></section>';
 }
 window.PatiyizFollowerMilestones={tiers,renderPanel,profileHint};
})();