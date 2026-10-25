/* Patiyiz Premium Akademi: publicly visible teasers, server-protected learning.
 * Paid lesson bodies are intentionally NOT shipped in this public JS file.
 * No client-side entitlement creation, payment simulation or secret API keys. */
(()=>{
 'use strict';
 const plans=[
  {name:'Tek eğitim paketi',price:'149 TL',period:'tek seferlik · planlanan',desc:'Tek programa erişim için düşünülen taslak model. Tekil lisanslama ve ödeme altyapısı henüz mevcut değil.'},
  {name:'Patiyiz Premium',price:'149 TL',period:'/ay · planlanan',desc:'Üç programa erişim ve kişisel ilerleme için düşünülen taslak üyelik. Henüz satın alınamaz.'},
  {name:'Patiyiz Premium Yıllık',price:'1.190 TL',period:'/yıl · planlanan',desc:'Yıllık erişim için taslak fiyat; yenileme ve abonelik altyapısı henüz aktif değil.'}
 ];
 const samples={
  'dog-30':['İsme olumlu yanıt çalışması','Gevşek tasma ile güvenli yürüyüş','Geri çağırma ve günlük tekrar planı'],
  'cat-21':['Kedinin güvenli alanını düzenleme','Oyun ve stres işaretlerini gözlemleme','İletişim sınırlarına saygı'],
  'adopt-30':['İlk gün ev hazırlığı','Sağlık ve beslenme kayıtları','İlk ay sürdürülebilir bakım takvimi']
 };
 function create({sb,userId,notify,esc,onChange}){
  const state={loading:false,attempted:false,member:false,expiresAt:null,waitlisted:false,
   catalog:[],completed:new Set(),lessons:new Map(),selected:'',day:0,error:'',saving:false};
  const update=()=>{if(typeof onChange==='function')onChange()};
  function valid(){return !!userId&&!!sb}
  // Expiry is checked at every interaction, not only at first login.
  // Server RLS remains the authority for paid content and progress writes.
  function active(){
   if(!state.member)return false;
   if(state.expiresAt){
    const until=Date.parse(state.expiresAt);
    if(!Number.isFinite(until)||until<=Date.now()){
     state.member=false;state.lessons.clear();state.completed.clear();state.day=0;
     return false;
    }
   }
   return true;
  }
  function courseProgress(course){
   const days=Math.max(0,Number(course.days)||0);
   let count=0;
   for(let i=1;i<=days;i++)if(state.completed.has(course.id+':'+i))count++;
   return count;
  }
  function totalProgress(){
   const total=state.catalog.reduce((sum,c)=>sum+Math.max(0,Number(c.days)||0),0);
   const done=state.catalog.reduce((sum,c)=>sum+courseProgress(c),0);
   return {total,done,percent:total?Math.min(100,Math.round(done/total*100)):0};
  }
  async function load(){
   if(!valid()||state.loading)return;
   state.loading=true;state.attempted=true;state.error='';update();
   try{
    const [catalog,entitlement,waitlist]=await Promise.all([
     sb.from('patiyiz_premium_courses').select('id,title,subtitle,days,icon,tag').eq('published',true).order('id'),
     sb.from('patiyiz_premium_entitlements').select('expires_at').eq('user_id',userId).maybeSingle(),
     sb.from('patiyiz_premium_waitlist').select('user_id').eq('user_id',userId).maybeSingle()
    ]);
    for(const r of [catalog,entitlement,waitlist])if(r.error)throw r.error;
    state.catalog=catalog.data||[];
    state.waitlisted=!!waitlist.data;
    state.expiresAt=entitlement.data?.expires_at||null;
    state.member=!!entitlement.data&&(!state.expiresAt||Number.isFinite(Date.parse(state.expiresAt))&&Date.parse(state.expiresAt)>Date.now());
    state.lessons.clear();state.completed.clear();
    if(state.member){
     const progress=await sb.from('patiyiz_premium_progress').select('course_id,day_no').eq('user_id',userId);
     if(progress.error)throw progress.error;
     for(const record of progress.data||[])state.completed.add(record.course_id+':'+record.day_no);
    }
   }catch(error){
    // Never keep a previous session's paid course body visible after a failed entitlement refresh.
    console.warn('Premium Akademi:',error);
    state.member=false;state.expiresAt=null;state.day=0;
    state.completed.clear();state.lessons.clear();
    state.error='Premium bilgileri yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.';
   }finally{state.loading=false;update()}
  }
  const enrolled=()=>state.waitlisted;
  async function join(){
   if(!valid()||state.saving||active())return;
   state.saving=true;update();
   try{
    const r=await sb.from('patiyiz_premium_waitlist').upsert({user_id:userId},{onConflict:'user_id',ignoreDuplicates:true});
    if(r.error)throw r.error;
    state.waitlisted=true;notify('Premium duyuru listesine kaydoldun. Bu işlem ücretli üyelik başlatmaz.');
   }catch(e){notify('Duyuru kaydı yapılamadı. Yeniden dene.',true)}
   finally{state.saving=false;update()}
  }
  async function leave(){
   if(!valid()||state.saving||!state.waitlisted)return;
   state.saving=true;update();
   try{
    const r=await sb.from('patiyiz_premium_waitlist').delete().eq('user_id',userId);
    if(r.error)throw r.error;
    state.waitlisted=false;notify('Premium duyuru listesinden ayrıldın.');
   }catch(e){notify('Duyuru kaydı silinemedi. Yeniden dene.',true)}
   finally{state.saving=false;update()}
  }
  async function open(courseId){
   if(!state.catalog.some(c=>c.id===courseId))return;
   state.selected=courseId;state.day=0;state.error='';update();
   if(active()&&!state.lessons.has(courseId)){
    state.loading=true;update();
    try{
     const result=await sb.from('patiyiz_premium_lessons')
      .select('course_id,day_no,module_name,title,activity,reflection')
      .eq('course_id',courseId).order('day_no');
     if(result.error)throw result.error;
     state.lessons.set(courseId,result.data||[]);
    }catch(e){state.error='Dersler yüklenemedi. Bağlantını ve Premium erişimini kontrol et.'}
    finally{state.loading=false;update()}
   }
  }
  function openDay(n){
   if(!active()||!Number.isInteger(n))return;
   const lessons=state.lessons.get(state.selected)||[];
   if(!lessons.some(x=>x.day_no===n))return;
   state.day=n;update();
  }
  async function resume(courseId,preferredDay){
   await open(courseId);
   if(!active()||state.selected!==courseId)return;
   const rows=state.lessons.get(courseId)||[];
   const desired=rows.find(row=>row.day_no===preferredDay&&!state.completed.has(courseId+':'+row.day_no));
   const first=desired||rows.find(row=>!state.completed.has(courseId+':'+row.day_no))||rows[0];
   if(first)openDay(first.day_no);
  }
  async function complete(){
   if(!active()||state.saving||!state.day)return;
   const course=state.selected,day=state.day,code=course+':'+day;
   if(!(state.lessons.get(course)||[]).some(l=>l.day_no===day))return;
   if(state.completed.has(code))return;
   state.saving=true;update();
   try{
    // RLS requires active server-side entitlement for every completion.
    const r=await sb.from('patiyiz_premium_progress').upsert(
     {user_id:userId,course_id:course,day_no:day},
     {onConflict:'user_id,course_id,day_no',ignoreDuplicates:true}
    );
    if(r.error)throw r.error;
    state.completed.add(code);
    notify('Günlük eğitimin hesabına kaydedildi.');
   }catch(e){notify('İlerlemen sunucuya kaydedilemedi. Tekrar dene.',true)}
   finally{state.saving=false;update()}
  }
  function back(){
   if(state.day){state.day=0}else{state.selected='';state.error=''}
   update();
  }
  function render(){
   const safe=s=>esc(String(s??''));
   const member=active(),overall=totalProgress();
   const buttons=()=>state.waitlisted?
     '<button type="button" class="premium-soft-btn" data-action="premium-leave" '+(state.saving?'disabled':'')+'>Duyuru listesinden ayrıl</button>':
     '<button type="button" class="premium-primary-btn" data-action="premium-join" '+(state.saving?'disabled':'')+'>Açılıştan haberdar olmak istiyorum</button>';
   const expired=!!state.expiresAt&&Date.parse(state.expiresAt)<=Date.now();
   const status=member?'<span class="premium-status is-active">✦ Premium erişimin aktif</span>':
    '<span class="premium-status">'+(expired?'Premium erişimin sona erdi':'Ön tanıtım · Satışa henüz açılmadı')+'</span>';
   const head='<section class="pati-premium premium-v2"><div class="premium-topbar"><span>✦ PATİYİZ PREMIUM</span>'+status+'</div>';
   const error=state.error?'<div role="alert" class="premium-error">'+safe(state.error)+'</div>':'';
   if(!state.attempted||state.loading&&!state.catalog.length)return head+'<div class="premium-hero" role="status"><h1>Patiyiz Premium Akademi</h1><p>Üyelik ve eğitim bilgileri yükleniyor…</p></div></section>';
   if(state.error&&!state.catalog.length)return head+error+'<div class="premium-unavailable"><h2>Bilgilere ulaşılamadı</h2><p>Kurslarını ve üyelik durumunu yeniden yükleyebilirsin.</p><button type="button" data-action="premium-refresh">Tekrar dene</button></div></section>';
   if(state.selected){
    const course=state.catalog.find(c=>c.id===state.selected);
    if(!course)return head+'<p>Eğitim bulunamadı.</p></section>';
    let inner='<button type="button" class="premium-back" data-action="premium-back">← Tüm Premium eğitimler</button>'+
      '<div class="premium-course-hero"><span>'+safe(course.icon)+' '+safe(course.tag)+'</span><h1>'+safe(course.title)+'</h1><p>'+safe(course.subtitle)+'</p><small>'+course.days+' günlük uygulamalı program</small></div>'+error;
    if(!member){
     inner+='<h2>Bu programda neler var?</h2><div class="premium-preview">'+(samples[course.id]||[]).map((x,i)=>
       '<div class="premium-preview-row"><span>'+(i+1)+'</span><p>'+safe(x)+'</p></div>').join('')+'</div>'+
       '<div class="premium-lock"><b>🔒 Premium dersleri</b><p>Günlük çalışma yönergeleri ve ilerleme kaydı aktif Premium erişimi olan üyeler için sunucudan açılır. Ücret alınmıyor; satış sistemi henüz etkin değil.</p>'+
       buttons()+'</div>';
    }else{
     const rows=state.lessons.get(course.id)||[];
     if(!rows.length)inner+='<p class="premium-empty">Ücretli dersler henüz yüklenemedi. Üyelik durumunu yenileyip tekrar dene.</p><button data-action="premium-refresh">Yeniden dene</button>';
     else if(state.day){
      const lesson=rows.find(x=>x.day_no===state.day);
      if(!lesson)inner+='<p>Ders bulunamadı.</p>';
      else {
       const finished=state.completed.has(course.id+':'+lesson.day_no);
       const position=rows.findIndex(row=>row.day_no===lesson.day_no);
       const previous=rows[position-1],following=rows[position+1];
       inner+='<div class="premium-day-view"><small>'+safe(lesson.module_name)+' · Gün '+lesson.day_no+'/'+course.days+'</small><h2>'+safe(lesson.title)+'</h2>'+
        '<h3>Bugünün uygulaması</h3><p>'+safe(lesson.activity)+'</p><h3>Gün sonunda düşün</h3><p>'+safe(lesson.reflection)+'</p>'+
        (finished?'<p class="premium-completed">✓ Tamamlandı ve hesabına kaydedildi.</p>':
        '<button class="premium-primary-btn" data-action="premium-complete" '+(state.saving?'disabled':'')+'>✓ Bugünün görevini tamamladım</button>')+
        '<div class="premium-day-navigation"><button type="button" class="premium-soft-btn" data-action="premium-back">← Günlere dön</button>'
        +(previous?'<button type="button" class="premium-soft-btn" data-action="premium-day" data-id="'+previous.day_no+'">← Önceki gün</button>':'')
        +(following?'<button type="button" class="premium-primary-btn" data-action="premium-day" data-id="'+following.day_no+'">Sonraki gün →</button>':'')+'</div></div>';
      }
     }else{
      const done=courseProgress(course);
      inner+='<div class="premium-course-progress"><strong>'+done+' / '+course.days+' gün tamamlandı</strong><div class="premium-progress" role="progressbar" aria-label="Premium kurs ilerlemesi" aria-valuenow="'+done+'" aria-valuemin="0" aria-valuemax="'+course.days+'"><span style="width:'+Math.round(done/course.days*100)+'%"></span></div></div>'+
       '<div class="premium-days">'+rows.map(l=>'<button type="button" data-action="premium-day" data-id="'+l.day_no+'" aria-label="Gün '+l.day_no+': '+safe(l.title)+'" class="premium-day-btn '+(state.completed.has(course.id+':'+l.day_no)?'is-finished':'')+'"><small>'+safe(l.module_name)+'</small><strong>Gün '+l.day_no+' · '+safe(l.title)+'</strong><span>'+(state.completed.has(course.id+':'+l.day_no)?'✓ Bitti':'Derse gir →')+'</span></button>').join('')+'</div>';
     }
    }
    return head+inner+'</section>';
   }
   const cards=state.catalog.map(c=>{
    const progress=member?' · '+courseProgress(c)+'/'+c.days+' tamamlandı':'';
    return '<article class="premium-course-card"><div class="premium-course-icon">'+safe(c.icon)+'</div><small>'+safe(c.tag)+' · '+c.days+' gün</small>'+
     '<h3>'+safe(c.title)+'</h3><p>'+safe(c.subtitle)+'</p><span class="premium-mini-progress">'+(member?'Aktif eğitim'+progress:'🔒 Premium içerik')+'</span>'+
     '<button data-action="premium-open" data-id="'+safe(c.id)+'">'+(member?'Programa gir':'Programı incele')+' →</button></article>';
   }).join('');
   const offers=plans.map(p=>'<article class="premium-plan"><small>'+safe(p.name)+'</small><h3>'+safe(p.price)+'</h3><span>'+safe(p.period)+'</span><p>'+safe(p.desc)+'</p></article>').join('');
   const totalDays=overall.total;
   const completed=overall.done;
   const next=state.catalog.map(c=>({course:c,day:Array.from({length:c.days},(_,i)=>i+1).find(day=>!state.completed.has(c.id+':'+day))})).find(x=>x.day);
   const dashboard=member?'<section class="premium-dashboard"><div class="premium-dashboard-heading"><div><span>✦ PREMIUM KONTROL PANELİ</span><h2>Bugün hangi hedefe ilerliyoruz?</h2><p>Günlük eğitimlerini, tamamladığın görevleri ve başarılarını tek yerden takip et.</p></div><button data-action="premium-achievements">🏅 Başarı Belgelerim</button></div>'+
    '<div class="premium-dash-grid"><article><small>Aktif eğitimler</small><strong>'+state.catalog.length+'</strong></article><article><small>Tamamlanan görev</small><strong>'+completed+'</strong></article><article><small>Genel ilerleme</small><strong>%'+(totalDays?overall.percent:0)+'</strong></article></div>'+
    (next?'<div class="premium-next-step"><div><b>🎯 Bugünün önerilen görevi</b><h3>'+safe(next.course.title)+'</h3><p>Gün '+next.day+' / '+next.course.days+' · Eğitim planına devam et</p></div><button data-action="premium-resume" data-id="'+safe(next.course.id)+'" data-day="'+next.day+'">Derse devam et →</button></div>':
    '<p class="premium-completed">🎉 Tüm Premium programları tamamladın! Başarı belgelerine göz at.</p>')+'</section>':'';
   return head+error+dashboard+
    '<div class="premium-hero"><div class="premium-eyebrow">DİJİTAL EĞİTİM SERİSİ</div><h1>Patili dostun için daha iyi bir yol.</h1>'+
    '<p>101 ücretsiz Akademi dersinin ardından, günlük görevlerle ilerleyen üç kapsamlı özel program.</p>'+
    '<div class="premium-numbers"><div><strong>'+state.catalog.length+'</strong><small>Eğitim kampı</small></div><div><strong>'+overall.total+'</strong><small>Uygulamalı gün</small></div><div><strong>101</strong><small>Ücretsiz ders de açık</small></div></div>'+
    '<button type="button" class="premium-outline-btn" data-action="premium-free">101 ücretsiz derse dön →</button></div>'+
    '<div class="premium-heading"><div><span>PROGRAMLAR</span><h2>Hedefine uygun eğitimi seç</h2></div></div>'+
    '<div class="premium-course-grid">'+(cards||'<p>Program kataloğu yüklenemedi.</p>')+'</div>'+
    '<div class="premium-heading"><div><span>PLANLANAN FİYATLANDIRMA</span><h2>Üyelik ve kurs seçenekleri</h2></div></div>'+
    '<div class="premium-plan-grid">'+offers+'</div>'+
    '<div class="premium-signup"><h2>İlk duyuruyu kaçırma</h2><p>Premium satışları henüz açık değil. Dilersen yalnızca kullanıcı hesabını duyuru listesine kaydedebilirsin. İstediğin zaman ayrılabilirsin; bu işlem ödeme ya da üyelik oluşturmaz.</p>'+
    buttons()+(enrolled()?'<small>✓ İlgi listesine kayıtlısın.</small>':'')+'</div>'+
    '<p class="premium-pricing-note">Fiyatlar yalnızca taslaktır; satış, ücret tahsilatı veya otomatik yenileme şu anda yapılmamaktadır.</p><p class="premium-disclaimer">Bu eğitimler hayvan refahı ve pozitif eğitim hakkında genel bilgilendirme sunar. Veteriner muayenesi ve uzman davranış danışmanlığının yerine geçmez. İçeriklerin satın alınabilmesi için ödeme, tüketici bilgilendirmesi ve faturalama entegrasyonu ayrıca tamamlanmalıdır.</p></section>';
  }
  return {state,load,join,leave,open,openDay,resume,complete,back,render};
 }
 window.PatiyizPremiumAcademy={create};
})();
