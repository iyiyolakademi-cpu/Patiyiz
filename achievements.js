/* Patiyiz participation badges and completion certificates.
 * Not official veterinary or professional qualifications. Verified against account progress. */
(()=>{
 'use strict';
 const levels=[
  {need:1,label:'İlk Adım',icon:'🌱',desc:'İlk ücretsiz dersi tamamla'},
  {need:10,label:'Meraklı Pati',icon:'🐾',desc:'10 dersi tamamla'},
  {need:25,label:'Bilgi Kaşifi',icon:'🔎',desc:'25 dersi tamamla'},
  {need:50,label:'Bakım Ustası',icon:'⭐',desc:'50 dersi tamamla'},
  {need:101,label:'Akademi Mezunu',icon:'🎓',desc:'101 dersin tamamını bitir'}
 ];
 function create({esc,notify}){
  const safe=s=>esc(String(s??''));
  const programs=[['dog-30','Köpek Eğitim Kampı','🐕',30],['cat-21','Kedimi Anlıyorum','🐈',21],['adopt-30','Sahiplenme Rehberi','🏡',30]];
  const premiumValidCount=(completed,id,total)=>Array.from({length:total},(_,i)=>id+':'+(i+1)).filter(key=>completed?.has?.(key)).length;
  function render({freeCompleted,premiumCompleted,premiumMember=false,memberName='Patiyiz üyesi',cloudReady=false}={}){
   const count=cloudReady?Math.min(101,freeCompleted?.size||0):0;
   const badges=levels.map(l=>'<article class="pati-badge '+(count>=l.need?'earned':'locked')+'"><div class="pati-badge-icon">'+l.icon+'</div><h3>'+safe(l.label)+'</h3><p>'+safe(l.desc)+'</p><small>'+(count>=l.need?'✓ Kazanıldı':Math.min(count,l.need)+' / '+l.need+' ders')+'</small></article>').join('');
   const premium=programs.map(([id,name,icon,total])=>{
    const done=premiumValidCount(premiumCompleted,id,total),unlocked=premiumMember&&done===total;
    return '<article class="pati-cert-card '+(unlocked?'earned':'locked')+'"><strong>'+icon+' '+safe(name)+'</strong><small>'+done+'/'+total+' görev</small>'+
     '<button type="button" data-achievement-print="'+safe(id)+'" '+(!unlocked?'disabled':'')+'>'+(unlocked?'Belgeyi oluştur / PDF':'Eğitimi tamamlayınca açılır')+'</button></article>';
   }).join('');
   const freeUnlocked=cloudReady&&count>=101;
   return '<section class="pati-achievements"><div class="pati-achievements-hero"><span>🏅 PATİYİZ AKADEMİ</span><h1>Başarı Rozetlerin ve Belgelerin</h1><p>Öğrendikçe rozet kazan, eğitimi tamamladığında kişisel katılım belgeni PDF olarak kaydet.</p>'+
   '<div><strong>'+(cloudReady?count+'/101':'Doğrulanıyor…')+'</strong><small>Hesabındaki ücretsiz ders ilerlemesi</small></div></div>'+
   '<h2>Ücretsiz Akademi rozetleri</h2><div class="pati-badge-grid">'+badges+'</div>'+
   '<h2>Ücretsiz Akademi tamamlanma belgesi</h2><article class="pati-cert-card '+(freeUnlocked?'earned':'locked')+'"><strong>🎓 Patiyiz Akademi · 101 Ders</strong><p>Katılım belgesi: 101 dersin tamamı hesabında kayıtlı olmalı.</p>'+
   '<button type="button" data-achievement-print="free-101" '+(!freeUnlocked?'disabled':'')+'>'+(freeUnlocked?'Belgeyi oluştur / PDF':'101 dersi tamamlayınca açılır')+'</button></article>'+
   '<h2>Premium Program katılım belgeleri</h2><div class="pati-cert-grid">'+premium+'</div>'+
   '<p class="pati-cert-notice">Belgeler kişisel katılım amaçlıdır; resmî meslek, veterinerlik veya kamu onaylı sertifika niteliğinde değildir. Oluşturulan belgeyi cihazının yazdırma menüsünden PDF olarak kaydedebilirsin.</p></section>';
  }
  function print({kind,user,freeCompleted,premiumCompleted,cloudReady,member}){
   const target=kind==='free-101'?{label:'101 Derslik Patiyiz Akademi',check:cloudReady&&freeCompleted?.size===101}:
    programs.some(x=>x[0]===kind)?{label:programs.find(x=>x[0]===kind)[1],check:member&&premiumValidCount(premiumCompleted,kind,programs.find(x=>x[0]===kind)[3])===programs.find(x=>x[0]===kind)[3]}:null;
   if(!target||!target.check)return notify('Katılım belgesi için ilgili eğitimleri hesabında tamamlamalısın.',true);
   document.querySelector('#pati-achievement-print')?.remove();
   const report=document.createElement('section');report.id='pati-achievement-print';report.className='pati-achievement-print';
   report.innerHTML='<div class="pati-cert-document"><div class="pati-cert-mark">🐾 PATİYİZ AKADEMİ</div>'+
    '<div class="pati-cert-flourish">✦</div><h1>KATILIM BELGESİ</h1><p class="pati-cert-muted">Bu belge</p><h2>'+safe(user)+'</h2>'+
    '<p>adına <strong>'+safe(target.label)+'</strong> programının eğitim görevlerini tamamladığı için düzenlenmiştir.</p>'+
    '<small>Düzenlenme tarihi: '+safe(new Date().toLocaleDateString('tr-TR'))+'</small>'+
    '<footer>Yalnızca uygulama içi eğitim katılım belgesidir. Resmî mesleki yeterlilik, veteriner sağlık belgesi veya akredite sertifika değildir.</footer></div>';
   document.getElementById('pati-health-print-report')?.remove();document.body.append(report);window.print();
  }
  return {render,print};
 }
 window.PatiyizAchievements={create};
})();
