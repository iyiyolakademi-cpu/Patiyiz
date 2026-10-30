/* Patiyiz: searchable, accessible full-screen professional title picker.
   Selections are stored in the existing profiles.professional_title text field. */
(function(){
 'use strict';
 const GROUPS=[
  ['Girişim ve iş dünyası',['Girişimci','Kurucu','Kurucu Ortak','İş İnsanı','İşletme Sahibi','CEO','Genel Müdür','Yönetici','Proje Yöneticisi','Ürün Yöneticisi','Marka Yöneticisi','Pazarlama Uzmanı','Dijital Pazarlama Uzmanı','Satış Uzmanı','E-Ticaret Uzmanı','Yatırımcı','Danışman','Finans Uzmanı','Muhasebeci','İnsan Kaynakları Uzmanı','Ekonomist','Serbest Çalışan','Freelancer','Sosyal Girişimci']],
  ['Sosyal medya ve yaratıcılık',['İçerik Üreticisi','Dijital İçerik Üreticisi','Yazar','Blog Yazarı','Köşe Yazarı','Gazeteci','Editör','Şair','Hikâye Anlatıcısı','Fotoğrafçı','Videograf','Video Editörü','Yayıncı','Podcaster','YouTuber','Influencer','Sosyal Medya Yöneticisi','Grafik Tasarımcı','Tasarımcı','UX/UI Tasarımcısı','İllüstratör','Animatör','Sanatçı','Ressam','Müzisyen','Şarkıcı','Oyuncu','Yönetmen','Modellik','Moda Tasarımcısı']],
  ['Hayvanlar ve doğa',['Hayvansever','Hayvan Dostu','Evcil Hayvan Sahibi','Kedi Sever','Köpek Sever','Veteriner Hekim','Veteriner Teknikeri','Veteriner Sağlık Teknikeri','Hayvan Eğitmeni','Köpek Eğitmeni','Hayvan Bakıcısı','Pet Kuaförü','Hayvan Hakları Savunucusu','Hayvan Kurtarma Gönüllüsü','Gönüllü','Doğa Sever','Çevre Aktivisti','Biyolog','Zoolog','Ekolog']],
  ['Teknoloji ve mühendislik',['Yazılım Geliştirici','Yazılımcı','Frontend Geliştirici','Backend Geliştirici','Mobil Uygulama Geliştiricisi','Full Stack Geliştirici','Oyun Geliştiricisi','Bilgisayar Mühendisi','Yazılım Mühendisi','Yapay Zekâ Uzmanı','Veri Bilimci','Veri Analisti','Siber Güvenlik Uzmanı','Sistem Yöneticisi','Web Tasarımcısı','Mühendis','Elektrik Elektronik Mühendisi','Makine Mühendisi','Endüstri Mühendisi','Mimar','İç Mimar','Teknisyen']],
  ['Eğitim ve bilim',['Öğrenci','Üniversite Öğrencisi','Öğretmen','Eğitimci','Akademisyen','Araştırmacı','Bilim İnsanı','Profesör','Öğretim Görevlisi','Eğitim Danışmanı','Matematikçi','Fizikçi','Kimyager','Çevirmen','Dil Eğitmeni','Kişisel Gelişim Eğitmeni','Yaşam Koçu']],
  ['Sağlık ve danışmanlık',['Doktor','Hekim','Diş Hekimi','Hemşire','Ebe','Psikolog','Psikolojik Danışman','Diyetisyen','Fizyoterapist','Eczacı','Sağlık Çalışanı','Beslenme Uzmanı','Spor Eğitmeni','Pilates Eğitmeni','Yoga Eğitmeni','Terapist','Sosyal Hizmet Uzmanı']],
  ['Yaşam ve spor',['Sporcu','Profesyonel Sporcu','Futbolcu','Basketbolcu','Voleybolcu','Koşucu','Fitness Eğitmeni','Yüzücü','Bisikletçi','Gezgin','Seyahat Yazarı','Kampçı','Macera Sever','Gurme','Şef','Aşçı','Pastacı','Kahve Tutkunu','Kitapsever','Oyunsever','Anne','Baba','Ebeveyn']],
  ['Diğer meslekler',['Avukat','Hukukçu','Noter','Memur','Polis','İtfaiyeci','Pilot','Kabin Memuru','Denizci','Çiftçi','Ziraat Mühendisi','Emlak Danışmanı','İnşaat Mühendisi','Elektrikçi','Elektronik Teknisyeni','Otomotiv Teknisyeni','Esnaf','Berber','Kuaför','Güzellik Uzmanı','Organizatör','Etkinlik Yöneticisi','Müşteri Temsilcisi']]
 ];
 const MAX_COUNT=4,MAX_LENGTH=60,MAX_ITEM=40;
 let active=null;
 const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
 const fold=v=>clean(v).toLocaleLowerCase('tr-TR').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const split=v=>clean(v).split(/\s+·\s+/).map(clean).filter(Boolean);
 const validAdd=(set,title)=>{if(!title||title.length>MAX_ITEM)return 'Unvan 1–40 karakter olmalı.';if(set.length>=MAX_COUNT)return 'En fazla 4 unvan seçebilirsin.';if([...set,title].join(' · ').length>MAX_LENGTH)return 'Unvanların toplamı 60 karakteri geçemez.';return '';};
 function close(){
  if(!active)return;
  const state=active;active=null;
  state.overlay.remove();
  document.body.classList.remove('pati-title-picker-open');
  document.removeEventListener('keydown',onKey,true);
  if(state.origin?.isConnected)state.origin.focus({preventScroll:true});
 }
 function onKey(e){
  if(!active)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return}
  if(e.key!=='Tab')return;
  const nodes=[...active.overlay.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(x=>x.getClientRects().length);
  if(!nodes.length)return;
  const first=nodes[0],last=nodes[nodes.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
 function open(trigger){
  const form=trigger.closest('#profile-form');
  const field=form?.querySelector('input[name="professional_title"]');
  if(!form||!field)return;
  if(active)close();
  const chosen=split(field.value);
  const overlay=document.createElement('section');
  overlay.className='pati-title-picker';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','pati-title-picker-heading');
  overlay.innerHTML='<div class="pati-title-picker-shell">'+
   '<header class="pati-title-picker-header"><button type="button" data-picker-close aria-label="Seçiciyi kapat" class="pati-title-picker-back">←</button>'+
   '<div><span>PROFİL BİLGİLERİ</span><h2 id="pati-title-picker-heading">Unvanlarını seç</h2></div>'+
   '<button type="button" data-picker-apply class="pati-title-picker-apply-top">Bitti</button></header>'+
   '<div class="pati-title-picker-scroll">'+
   '<div class="pati-title-picker-intro"><p>Profilinde görünecek unvanları seç veya kendin yaz.</p>'+
   '<div class="pati-title-picker-selected" data-picker-selected aria-live="polite"></div>'+
   '<div class="pati-title-picker-counter" data-picker-counter></div></div>'+
   '<label class="pati-title-picker-search"><span aria-hidden="true">⌕</span><input type="search" data-picker-search placeholder="Girişimci, yazar, veteriner…" autocomplete="off" aria-label="Unvanlarda ara"></label>'+
   '<div class="pati-title-picker-results" data-picker-results></div>'+
   '<section class="pati-title-picker-custom"><h3>İstediğin unvanı ekle</h3><div class="pati-title-picker-custom-row">'+
   '<input type="text" data-picker-custom maxlength="40" placeholder="Özel unvan yaz" aria-label="Özel unvan">'+
   '<button type="button" data-picker-add>+ Ekle</button></div></section>'+
   '<p class="pati-title-picker-error" data-picker-error role="status" aria-live="polite"></p>'+
   '</div><footer class="pati-title-picker-footer"><button type="button" class="pati-title-picker-clear" data-picker-clear>Temizle</button>'+
   '<button type="button" data-picker-apply class="pati-title-picker-save">Seçimi tamamla</button></footer></div>';
  document.body.append(overlay);
  document.body.classList.add('pati-title-picker-open');
  active={overlay,origin:trigger,field,chosen:chosen.slice(),query:''};
  const status=overlay.querySelector('[data-picker-error]');
  const warn=msg=>{status.textContent=msg||''};
  const draw=()=>{
   if(!active||active.overlay!==overlay)return;
   const state=active;const search=fold(state.query);
   overlay.querySelector('[data-picker-selected]').innerHTML=state.chosen.length?
    state.chosen.map(x=>'<span class="pati-title-picked">'+escapeHTML(x)+'<button type="button" data-picker-remove="'+escapeHTML(x)+'" aria-label="'+escapeHTML(x)+' seçimini kaldır">×</button></span>').join(''):
    '<span class="pati-title-picker-no-selection">Henüz unvan seçilmedi.</span>';
   overlay.querySelector('[data-picker-counter]').textContent=state.chosen.length+'/'+MAX_COUNT+' seçildi · '+state.chosen.join(' · ').length+'/'+MAX_LENGTH+' karakter';
   const chunks=GROUPS.map(([name,items])=>{
    const filtered=items.filter(x=>!search||fold(x).includes(search));
    if(!filtered.length)return '';
    return '<section class="pati-title-picker-category"><h3>'+escapeHTML(name)+'</h3><div class="pati-title-picker-options">'+
     filtered.map(x=>'<label class="pati-title-picker-item'+(state.chosen.includes(x)?' is-selected':'')+'">'+
     '<input type="checkbox" data-picker-option="'+escapeHTML(x)+'" '+(state.chosen.includes(x)?'checked':'')+'>'+
     '<span class="pati-title-picker-item-name">'+escapeHTML(x)+'</span><span class="pati-title-picker-check" aria-hidden="true">'+(state.chosen.includes(x)?'✓':'')+'</span></label>').join('')+
     '</div></section>';
   }).filter(Boolean);
   overlay.querySelector('[data-picker-results]').innerHTML=chunks.length?chunks.join(''):'<p class="pati-title-picker-no-result">Aradığın unvan bulunamadı. Aşağıdan özel unvan ekleyebilirsin.</p>';
  };
  overlay.addEventListener('input',e=>{if(e.target.matches('[data-picker-search]')){active.query=e.target.value;warn('');draw();}});
  overlay.addEventListener('change',e=>{
   const opt=e.target.closest('[data-picker-option]');if(!opt)return;
   const title=opt.dataset.pickerOption;
   if(opt.checked&&!active.chosen.includes(title)){const err=validAdd(active.chosen,title);if(err){opt.checked=false;warn(err);return;}active.chosen.push(title);}
   else if(!opt.checked)active.chosen=active.chosen.filter(t=>t!==title);
   warn('');draw();
  });
  const custom=()=>{
   const input=overlay.querySelector('[data-picker-custom]');const title=clean(input.value);
   if(!title){warn('Eklemek için unvanını yaz.');return}
   if(active.chosen.includes(title)){warn('Bu unvan zaten seçili.');return}
   const err=validAdd(active.chosen,title);if(err){warn(err);return}
   active.chosen.push(title);input.value='';warn('');draw();input.focus();
  };
  overlay.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.matches('[data-picker-close]')){close();return}
   if(b.matches('[data-picker-apply]')){
    const updated=active.chosen.join(' · ');
    if(updated.length>MAX_LENGTH){warn('Unvanların toplamı 60 karakteri geçemez.');return}
    field.value=updated;
    const label=form.querySelector('[data-pati-profile-title-current]');
    if(label)label.textContent=updated||'Unvan seç';
    field.dispatchEvent(new Event('input',{bubbles:true}));
    close();return;
   }
   if(b.matches('[data-picker-clear]')){active.chosen=[];warn('');draw();return}
   if(b.matches('[data-picker-remove]')){active.chosen=active.chosen.filter(t=>t!==b.dataset.pickerRemove);warn('');draw();return}
   if(b.matches('[data-picker-add]'))custom();
  });
  overlay.querySelector('[data-picker-custom]').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();custom()}});
  draw();
  overlay.querySelector('[data-picker-search]').focus({preventScroll:true});
 }
 document.addEventListener('click',e=>{
  const trigger=e.target.closest('[data-pati-profile-title-open]');
  if(!trigger)return;
  e.preventDefault();
  open(trigger);
 });
 window.PatiyizProfileTitlePicker={open,close,get optionsCount(){return GROUPS.reduce((n,g)=>n+g[1].length,0)}};
})();