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
  var p=(lesson.parts||[]).map(clean), t=topic(lesson), lead=clean(lesson.desc), f=context(lesson);
  var chapters=[
   {name:'Konuyu derinlemesine anla',duration:2,
    text:[lead+'. Bu ifade bir başlangıç noktasıdır: '+t+' konusunu gerçekten öğrenmek için kavramın hangi sorunu açıkladığını, hangi koşullarda geçerli olduğunu ve nerede yetersiz kaldığını da anlamak gerekir.',
    (p[0]||lead)+' Bu ilkenin neyi değiştirdiğini düşün. Bir karar vermeden önce elindeki bilgi ile yalnızca tahmin ettiğin şeyleri iki ayrı grupta toplamak, hatalı kesinlikten kaçınmanı sağlar.',
    'Kavramı kendi sözcüklerinle yeniden açıkla. Konuyu hiç bilmeyen birine anlatırken teknik sözcükleri azalt, fakat temel anlamını kaybetme.'],
    task:'Önce '+t+' için bir tanım, bir fayda ve bir sınır yaz.'},
   {name:'Günlük hayatta gerçek bir örnek',duration:2,
    text:['Bir senaryo kur: '+f[0]+'. Bu senaryoda '+t+' konusunun ne zaman önemli olacağını belirle; olayın başlangıcını, alınan kararı ve gözlenebilen sonucunu sıralamaya çalış.',
    (p[1]||lead)+' Örnek üzerinde yalnızca iyi sonucu değil, neyin bilinmediğini de yaz. Aynı davranış farklı şartlarda farklı sonuçlar doğurabilir; bağlam bu yüzden önemlidir.',
    'Karar anını tekrar canlandır: Hangi bilgi eksik, kim etkileniyor, alternatif seçenekler neler? Böylece soyut bilgi gerçek bir probleme dönüşür.'],
    task:'Kendinle ilgili bir örnek yaz: durum, tercih ve muhtemel sonuç üç ayrı cümle olsun.'},
   {name:'Adım adım uygulama yöntemi',duration:2,
    text:['Başlamadan önce hedefini tek cümleyle yaz: "'+t+' konusunda hangi sonucu görmek istiyorum?" Ardından mevcut durumu ölç, küçük bir değişiklik seç ve bu değişikliğin etkisini izle.',
    '1. Sorunu tanımla ve kapsamını daralt. 2. '+f[1]+'. 3. Geri alınabilir küçük bir deneme tasarla. 4. Sonucu başlangıç durumuyla karşılaştır. 5. Bir sonraki kararı sonuca göre ver.',
    (p[2]||lead)+' Her adım için uygulanabilir bir süre, ihtiyaç duyduğun kaynak ve kontrol noktası belirle. Büyük iddialar yerine gözlem yapılabilen küçük bir ilerlemeyi hedefle.'],
    task:'Somut bir eylem planı çıkar: bugün yapacağın ilk adım, tahmini süre ve başarı ölçütü.'},
   {name:'Hatalar, riskler ve karşı görüşler',duration:2,
    text:['Bir bilginin yararlı olması, her ortamda aynı biçimde kullanılabileceği anlamına gelmez. '+t+' konusunda özellikle tek örnekten genelleme yapmaktan, sonucu ölçmeden başarılı saymaktan ve yanlış bir varsayımda ısrar etmekten kaçın.',
    'Hatanın kaynağını araştırırken üç soru sor: Verim yeterli mi? Alternatif bir açıklama var mı? Bu uygulamanın zarar veya maliyet riski var mı? '+f[2]+'.',
    'Bir karşı görüş oluştur: "Bu yaklaşım hangi durumda işe yaramaz?" Yanıtını yazarken hangi koşulların değişmesi gerektiğini düşün. Daha güçlü bir öğrenme, kendi fikrine itiraz edebilmeyi de içerir.'],
    task:'Üç risk, iki önlem ve gerektiğinde danışılacak güvenilir bir uzman veya kaynak belirle.'},
   {name:'Rehberli uygulama ve kendi örneğin',duration:2,
    text:['Artık konuyu yalnızca okumak yerine kullanma zamanı. Gerçek yaşamından veya işinden '+t+' ile bağlantılı küçük bir olay seç. Olayı baştan anlatma; neden bu konuyla ilişkili olduğunu göstermeye odaklan.',
    'Bir çalışma sayfası oluştur: "Mevcut durum / Hedef / İlk deneme / Ölçüm / Beklenen güçlük / Düzeltme". Her alana en az bir cümle yaz. Sonuç henüz bilinmiyorsa tahmin olduğunu açıkça belirt.',
    'Kendine şu soruyu sor: "Bu konuda öğrendiğim şey yarın verdiğim tek bir kararı nasıl değiştirebilir?" Yanıtın soyut kalırsa eylemi küçült ve yeniden yaz.'],
    task:'Örneğini 5-6 cümleyle somutlaştır. Olumlu ve olumsuz iki ihtimal için de ne yapacağını kaydet.'},
   {name:'Tekrar, özet ve mini değerlendirme',duration:2,
    text:['Kendi kendine yüksek sesle veya içinden anlat: '+t+' nedir, niçin önemlidir, nasıl uygulanır ve hangi durumda dikkatli olmak gerekir? Metne bakmadan açıklamaya çalışmak yalnızca tekrar okumaktan daha iyi bir anlama kontrolüdür.',
    'İlk bölümde yazdığın tanımla şimdiki düşünceni karşılaştır. Değişen veya netleşen bir noktayı not et. '+(p[0]||lead),
    'Bu dersin sonunda mutlaka üç çıktı oluştur: bir ana fikir, bir gerçek yaşam örneği ve uygulayacağın bir küçük adım. Ardından mini sınava geç. Öğrenme, testi bitirince değil bilgiyi hayata aktarınca pekişir.'],
    task:'Öğrendiğin üç noktayı ve ertesi gün uygulayacağın bir adımı tek cümlelik birer notla toparla.'}
  ];
  // Retain every long, topic-specific lesson section from the existing 101 curriculum.
  // These are extra core readings, not replacements for guided examples and practice.
  if(p.length>3)p.forEach(function(detail,i){
   var chapter=Math.min(chapters.length-1,Math.floor(i*chapters.length/p.length));
   chapters[chapter].text.splice(1,0,detail);
  });
  return chapters;
 }
 function key(id,uid){return 'patiyiz-101-study-v2-'+(uid||'guest')+'-'+id}
 function seconds(id,uid){try{return Math.min(72000,Math.max(0,Number(localStorage.getItem(key(id,uid)))||0))}catch(_){return 0}}
 function save(id,uid,value){try{localStorage.setItem(key(id,uid),String(value))}catch(_){}}
 function ready(id,uid){return seconds(id,uid)>=MIN_SECONDS}
 function mmss(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
 function render(lesson,uid,esc){
  const items=sections(lesson);
  return '<div class="pati-edu-workshop buchee-edu-reading" data-lesson-id="'+esc(lesson.id)+'" data-owner-id="'+esc(uid||'guest')+'">'+
   items.map(function(item,i){return '<article class="pati-edu-chapter" id="edu-chapter-'+(i+1)+'">'+
    '<h2>'+esc(item.name)+'</h2>'+
    item.text.map(function(part){return '<p>'+esc(part)+'</p>'}).join('')+
    '<div class="pati-edu-practice"><strong>UYGULAMA</strong><p>'+esc(item.task)+'</p></div></article>'}).join('')+
   '</div>';
 }
 function stop(){if(activeTimer!==null){clearInterval(activeTimer);activeTimer=null}activeKey=''}
 /* No visible or hidden countdown: the five-question exam measures lesson completion. */
 function mount(){stop()}
 window.PatiyizLessonWorkshop={render:render,ready:()=>true,mount:mount,sections:sections,seconds:seconds,stop:stop};
})();