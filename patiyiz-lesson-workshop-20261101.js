/* Guided 101-series workshop: actual active study time, rich topic-specific practice, no server data or tracking. */
(function(){
 'use strict';
 var MIN_SECONDS=600, activeTimer=null, activeKey='';
 var frames={
  '101 Girişimcilik':['bir kullanıcıya gerçekten değer sağlayan küçük bir ürün tasarladığını düşün','kullanıcı ihtiyacını, gözlemi ve ölçülebilir sonucu birbirinden ayır','küçük bir deneme, gerçek geri bildirim ve sonraki karar'],
  '101 Finans':['gelir ve giderleri değişen bir kişinin karar vermesi gerektiğini düşün','nakit akışı, süre, risk ve toplam maliyeti ayrı değerlendir','rakamların nereden geldiğini ve hangi varsayımlara dayandığını kontrol et'],
  '101 Teknoloji ve Yapay Zekâ':['günlük kullanılan bir dijital hizmetin nasıl çalıştığını düşün','girdi, işlem, çıktı, hata ve gizlilik sınırlarını ayırt et','gerçek dışı varsayımları test verisi ve güvenlik kontrolüyle sınama'],
  '101 Sosyal Medya ve Pazarlama':['aynı mesajı farklı kitlelere ulaştırmak isteyen bir içerik üreticisini düşün','erişim, anlamlı etkileşim ve dönüşüm sonuçlarını birbirinden ayır','bir varsayımı küçük bir içerik deneyi ile karşılaştır'],
  '101 Yazılım ve Tasarım':['bir kullanıcının telefonda bir görevi tamamlamak istediğini düşün','ekrandaki her adımın amacını, hata durumunu ve erişilebilirliğini kontrol et','gerçek cihazda tek bir işi denetleyerek gereksiz adımları azalt'],
  '101 Psikoloji ve İletişim':['iki kişinin aynı olayı farklı yorumladığı bir konuşmayı düşün','gözlem, yorum, ihtiyaç ve karşı tarafın seçimini ayırt et','kesin yargı yerine açık sorular ve saygılı sınırlar kullan'],
  '101 Kişisel Gelişim':['çok önemli bir işi sürekli erteleyen birinin gününü düşün','hedefi, engeli, en küçük adımı ve ilerlemeyi ayrı ayrı tanımla','bir gün boyunca uygulanabilir ve ölçülebilir bir rutin dene'],
  '101 Bilim ve Genel Kültür':['internette karşılaştığın dikkat çekici bir iddiayı düşün','kanıt, yöntem, örneklem ve alternatif açıklamaları ayır','aynı bilgiyi bağımsız ve güvenilir kaynaklarla karşılaştır'],
  '101 Kariyer ve İş Hayatı':['yeni bir sorumluluk üstlenen bir çalışanın karar verdiğini düşün','beklentiyi, mevcut beceriyi, iletişimi ve başarı ölçütünü ayır','konuyla ilgili örnek bir iş planı ve geribildirim sorusu hazırla'],
  '101 Hayvan':['bir hayvanın bakımında günlük bir karar alındığını düşün','hayvanın türüne, güvenliğine, rutinine ve gözlemlenebilir belirtilere odaklan','riskli veya tıbbi durumlarda bir veterinerden türüne özel yardım al']
 };
 function clean(value){return String(value||'').replace(/\s*\(\s*\d+\s*dk\s*\)/gi,'').replace(/\b(?:yaklaşık|ortalama)\s+\d+\s*dk\b/gi,'').replace(/\s+/g,' ').trim()}
 function topic(lesson){return clean(lesson.name).split(' — ')[0].replace(/^101\. Ders — /,'')}
 function context(lesson){return frames[lesson.cat]||frames['101 Bilim ve Genel Kültür']}
 function sections(lesson){
  const editorial=window.BucheeAcademyEditorial?.forLesson(lesson);
  const authored=window.BucheeAcademyGuides?.build(lesson,editorial);
  if(authored){
   // Preserve the three original safety-focused teaching notes for animal care.
   if(lesson.cat==='101 Hayvan'){
    const source=(lesson.parts||[]).slice(0,3).map(x=>clean(x).replace(/^(?:TEMEL BİLGİ|GÜNLÜK ÖRNEK VE GÖZLEM|GÜVENLİK VE SINIRLAR)\s*—\s*/,'').trim());
    if(source[0])authored[0].text.unshift(source[0]);
    if(source[1])authored[2].text.unshift(source[1]);
    if(source[2])authored[4].text.unshift(source[2]);
   }
   return authored.map(chapter=>({...chapter,author:editorial}));
  }
  const raw=(lesson.parts||[]).map(clean).filter(Boolean);
  const voice=window.BucheeAcademyEditorial?.forLesson(lesson);
  const headings=voice?.headings||['Temel bilgi','Konuyu bir örnekle düşün','Nasıl çalışır?','Bir adım uygula','Dikkat edilecek noktalar','Kısa değerlendirme'];
  const sources=raw.length>=6?raw.slice(0,6):Array.from({length:6},(_,i)=>raw[i]||clean(lesson.desc));
  return sources.map((part,i)=>({
   name:headings[i]||'Bölüm '+(i+1),
   text:[part.replace(/^\s*(?:\d{1,2}[.)]\s*)?(?:KAVRAMA DERİNLİK KAT|DURUMU ANALİZ ET|YÖNTEMİ KUR|UYGULAMALI ÇALIŞMA|DEĞERLENDİRME VE PEKİŞTİRME|MİNİ SINAVA HAZIRLIK|TEMEL İLKE|KAVRAMI AÇIKLA|ÖRNEK ÜZERİNDEN DÜŞÜN|UYGULAMA PLANI|SINIRLAR VE HATALAR|ÖZET VE PEKİŞTİRME|TEMEL BİLGİ|GÜNLÜK ÖRNEK VE GÖZLEM|GÜVENLİK VE SINIRLAR|SOMUT KONTROL|ÖZET|UYGULAMA)\s*(?:\.\s*|—\s*)/, '').trim()],
   example:i===1?voice?.example:'',
   task:i===3?(voice?.example?
     ['Bu örnekte en önemli karar hangisi?','Örnekteki durumu değiştirebilecek tek bir ayrıntı belirle.','Kararı verirken hangi bilgiye ihtiyaç var?','Bu koşulları güvenli veya ölçülebilir biçimde nasıl kontrol edersin?'][(Number(lesson.order||1)-1)%4]:
     'Bu dersten gerçek yaşamına uygun bir küçük adım seç.'):'',
   author:voice
  }));
 }
 function key(id,uid){return 'patiyiz-101-study-v2-'+(uid||'guest')+'-'+id}
 function seconds(id,uid){try{return Math.min(72000,Math.max(0,Number(localStorage.getItem(key(id,uid)))||0))}catch(_){return 0}}
 function save(id,uid,value){try{localStorage.setItem(key(id,uid),String(value))}catch(_){}}
 function ready(id,uid){return seconds(id,uid)>=MIN_SECONDS}
 function mmss(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
 function render(lesson,uid,esc){
  const chapters=sections(lesson);
  const voice=window.BucheeAcademyEditorial?.forLesson(lesson);
  return '<div class="pati-edu-workshop buchee-edu-reading" data-lesson-id="'+esc(lesson.id)+'" data-owner-id="'+esc(uid||'guest')+'">'+
   (voice?'<div class="buchee-edu-editorial-credit"><strong>'+esc(voice.name)+'</strong><span>Buchee Eğitim · '+esc(voice.area)+'</span></div>':'')+
   (voice?.intro?'<p class="buchee-edu-editorial-welcome">'+esc(voice.intro)+'</p>':'')+
   chapters.map(function(chapter,i){return '<article class="pati-edu-chapter" id="edu-chapter-'+(i+1)+'">'+
    '<h2>'+esc(chapter.name)+'</h2>'+
    chapter.text.map(part=>'<p>'+esc(part)+'</p>').join('')+
    (chapter.example?'<div class="buchee-edu-editorial-example"><strong>Günlük yaşamdan bir örnek</strong><p>'+esc(chapter.example)+'</p></div>':'')+
    (chapter.task?'<div class="pati-edu-practice"><strong>BİRLİKTE DÜŞÜNELİM</strong><p>'+esc(chapter.task)+'</p></div>':'')+
    '</article>'}).join('')+
   '</div>';
 }
 function stop(){if(activeTimer!==null){clearInterval(activeTimer);activeTimer=null}activeKey=''}
 /* No visible or hidden countdown: the five-question exam measures lesson completion. */
 function mount(){stop()}
 window.PatiyizLessonWorkshop={render:render,ready:()=>true,mount:mount,sections:sections,seconds:seconds,stop:stop};
})();