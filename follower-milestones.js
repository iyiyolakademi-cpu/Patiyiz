/* Patiyiz follower milestones: presentation only. All eligibility and PatiCoin
 * balances are verified server-side; no browser code can award currency. */
(()=>{
 'use strict';
 const tiers=[
  {need:1000,coins:100,title:'İlk Bin Pati',icon:'🐾',kind:'Bronz'},
  {need:5000,coins:300,title:'Gümüş Pati',icon:'🥈',kind:'Gümüş'},
  {need:10000,coins:700,title:'Altın Pati',icon:'🥇',kind:'Altın'},
  {need:50000,coins:1500,title:'Platin Pati',icon:'💎',kind:'Platin'},
  {need:100000,coins:3000,title:'Elmas Pati',icon:'👑',kind:'Elmas'}
 ];
 const number=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('tr-TR');
 const countOf=n=>Math.max(0,Math.floor(Number(n)||0));
 function nextTarget(count){return tiers.find(t=>count<t.need)||null}
 function profileHint(count){
  const c=countOf(count),next=nextTarget(c);
  if(!next)return '<span class="pati-follower-hint-title">👑 Elmas Pati</span><span>100.000 takipçi başarısına ulaştın!</span>';
  const previous=tiers.filter(t=>t.need<=c).at(-1)?.need||0;
  const percent=Math.min(100,Math.max(0,(c-previous)/(next.need-previous)*100));
  return '<span class="pati-follower-hint-title">🏅 Sıradaki hedef: '+number(next.need)+' takipçi</span>'+
   '<span class="pati-follower-progress"><i style="width:'+percent.toFixed(2)+'%"></i></span>'+
   '<small>'+number(c)+' / '+number(next.need)+' · '+number(next.need-c)+' takipçi kaldı</small>';
 }
 function renderPanel(followerCount,claims){
  const hasCount=followerCount!==null&&followerCount!==undefined;
  const c=countOf(followerCount),earned=new Set(Array.isArray(claims)?claims:[]);
  const next=nextTarget(c);
  const head='<div class="pati-follower-header"><span class="pati-follower-eyebrow">🏆 TOPLULUK BAŞARILARI</span><h2>Takipçi ödülleri</h2><p>Gerçek takipçi sayına ulaşınca kalıcı rozet ve bir defaya mahsus PatiCoin kazanırsın. Mavi tik bu ödüllere dahil değildir.</p></div>';
  const banner=hasCount?'<div class="pati-follower-summary"><strong>'+number(c)+'</strong><span>Güncel takipçin</span><small>'+(next?'Sıradaki hedef: '+number(next.need)+' takipçi':'Bütün hedefleri tamamladın!')+'</small></div>':'<p class="pati-follower-loading">Takipçi sayın doğrulanıyor…</p>';
  const cards=tiers.map(t=>{
    const won=earned.has('followers_'+t.need);
    const pct=hasCount?Math.min(100,c/t.need*100):0;
    const status=won?'✓ Kazanıldı':hasCount&&c>=t.need?'Doğrulanıyor':'Hedefe '+number(Math.max(0,t.need-c))+' kaldı';
    return '<article class="pati-follower-tier '+(won?'is-earned':'')+'"><div class="pati-follower-tier-icon" aria-hidden="true">'+t.icon+'</div><div class="pati-follower-tier-copy"><span>'+t.kind+' rozet</span><h3>'+number(t.need)+' takipçi</h3><strong>'+t.title+'</strong></div><span class="pati-follower-coin">'+(won?'✓':'+'+number(t.coins))+' 🪙</span><div class="pati-follower-track"><i style="width:'+pct.toFixed(2)+'%"></i></div><small>'+status+'</small></article>';
  }).join('');
  return '<section class="pati-follower-milestones" aria-label="Takipçi başarı ödülleri">'+head+banner+'<div class="pati-follower-grid">'+cards+'</div><p class="pati-follower-terms">Ödüller hesabına otomatik ve yalnızca bir kez işlenir. Takipten çıkma ve tekrar takip etme ikinci ödül kazandırmaz. Sahte hesap ve otomatik takip davranışları denetlenebilir; rozetler kimlik doğrulaması yerine geçmez.</p></section>';
 }
 window.PatiyizFollowerMilestones={tiers,renderPanel,profileHint};
})();