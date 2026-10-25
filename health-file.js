/* Patiyiz private digital pet health file.
 * Authenticated, owner-only documents in a PRIVATE Supabase storage bucket.
 * Never creates public file URLs or permits another user's document IDs. */
(()=>{
 'use strict';
 const bucket='patiyiz-health-private';
 const types={vaccine:['💉','Aşı kaydı'],vet:['🩺','Veteriner muayenesi'],test:['🧪','Tahlil / sonuç'],medicine:['💊','İlaç / reçete'],other:['📄','Diğer sağlık kaydı']};
 const allowed=['application/pdf','image/jpeg','image/png','image/webp'];
 function create({sb,getUser,getPets,getReminders,getWeights,esc,notify,onChange}){
  const state={petId:'',docs:[],loading:false,loaded:false,attempted:false,saving:false,error:'',printView:false,editingId:'',query:'',typeFilter:'all'};
  const changed=()=>onChange?.();
  const pets=()=>getPets().filter(p=>p.owner_id===getUser()?.id);
  const current=()=>pets().find(p=>p.id===state.petId);
  const checked=()=>{if(!current())throw Error('Sağlık dosyasına erişmek için kendi hayvanını seçmelisin.');};
  const day=d=>{if(!dateValid(String(d||'')))return String(d||'');return new Date(d+'T12:00:00').toLocaleDateString('tr-TR')};
  const today=()=>new Date().toLocaleDateString('sv-SE');
  const dateValid=d=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))return false;const dt=new Date(d+'T12:00:00Z');return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===d};
  const fold=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
  const visibleDocs=()=>state.docs.filter(d=>d.owner_id===getUser()?.id&&d.pet_id===state.petId);
  const shownDocs=()=>visibleDocs().filter(d=>(state.typeFilter==='all'||d.doc_type===state.typeFilter)
   &&(!state.query||fold([d.title,d.notes,types[d.doc_type]?.[1]||'',d.document_date].join(' ')).includes(fold(state.query))));
  function selectType(kind){if(kind!=='all'&&!Object.hasOwn(types,kind))return;state.typeFilter=kind;changed()}
  function setSearch(query){state.query=String(query||'').slice(0,120);updateResults()}
  function edit(id){const d=visibleDocs().find(x=>x.id===id);if(!d)return;state.editingId=id;changed()}
  function cancelEdit(){state.editingId='';changed()}
  
  async function load(force=false){
   if(state.loading||state.loaded&&!force)return;
   const uid=getUser()?.id;if(!uid)return;
   state.loading=true;state.attempted=true;state.error='';changed();
   try{
    const r=await sb.from('patiyiz_health_documents').select('id,owner_id,pet_id,doc_type,title,notes,document_date,object_path,mime_type,byte_size,created_at').eq('owner_id',uid).order('document_date',{ascending:false}).limit(200);
    if(r.error)throw r.error;
    if(getUser()?.id!==uid)return;
    state.docs=r.data||[];state.loaded=true;
   }catch(e){console.warn('Patiyiz sağlık dosyası:',e);state.error='Sağlık kayıtları yüklenemedi. Lütfen yeniden dene.'}
   finally{state.loading=false;changed()}
  }
  function selectPet(id){if(!pets().some(p=>p.id===id))return;state.petId=id;state.printView=false;state.editingId='';state.query='';state.typeFilter='all';changed()}
  async function save(form){
   if(state.saving)return;
   if(!state.petId)state.petId=pets()[0]?.id||'';
   checked();
   const uid=getUser().id,petId=state.petId;
   const editing=state.editingId?visibleDocs().find(d=>d.id===state.editingId):null;
   if(state.editingId&&!editing){notify('Bu sağlık kaydını düzenleme yetkin yok.',true);return}
   const file=form.querySelector('[name="health-file"]')?.files?.[0]||null;
   const title=String(form.querySelector('[name="health-title"]')?.value||'').trim();
   const kind=form.querySelector('[name="health-type"]')?.value;
   const document_date=form.querySelector('[name="health-date"]')?.value;
   const notes=String(form.querySelector('[name="health-notes"]')?.value||'').trim();
   if(title.length<2||title.length>100||notes.length>1000||!Object.hasOwn(types,kind)||!dateValid(document_date)||document_date>today()){
    notify('Başlık, kategori, tarih veya açıklamayı kontrol et. Gelecekteki tarihler kabul edilmez.',true);return;
   }
   if(file&&(!allowed.includes(file.type)||file.size>10*1024*1024||file.size===0)){
    notify('Yalnızca PDF, JPG, PNG, WEBP ve en fazla 10 MB dosya yüklenebilir.',true);return;
   }
   state.saving=true;changed();
   let uploadedPath=null;
   try{
    const payload={doc_type:kind,title,notes,document_date};
    if(!editing){payload.owner_id=uid;payload.pet_id=petId;payload.object_path=null;payload.mime_type=null;payload.byte_size=null}
    if(file){
     const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
     uploadedPath=uid+'/'+petId+'/'+crypto.randomUUID()+'.'+ext;
     const result=await sb.storage.from(bucket).upload(uploadedPath,file,{contentType:file.type,upsert:false});
     if(result.error)throw result.error;
     payload.object_path=uploadedPath;payload.mime_type=file.type;payload.byte_size=file.size;
    }
    const saved=editing?
     await sb.from('patiyiz_health_documents').update(payload).eq('id',editing.id).eq('owner_id',uid).eq('pet_id',petId).select('id'):
     await sb.from('patiyiz_health_documents').insert(payload).select('id');
    if(saved.error)throw saved.error;
    if(!saved.data?.length)throw Error('Sağlık kaydı sunucuda doğrulanamadı.');
    if(editing&&uploadedPath&&editing.object_path&&editing.object_path!==uploadedPath){
     const old=await sb.storage.from(bucket).remove([editing.object_path]);
     if(old.error)console.warn('Eski sağlık belgesi depodan temizlenemedi:',old.error);
    }
    uploadedPath=null;
    form.reset();state.editingId='';state.loaded=false;
    notify(editing?'Sağlık kaydı güncellendi.':'Sağlık kaydı özel dosyana eklendi.');
    await load(true);
   }catch(e){
    if(uploadedPath){try{const cleanup=await sb.storage.from(bucket).remove([uploadedPath]);if(cleanup.error)console.warn('Sağlık yüklemesi geri alınamadı:',cleanup.error)}catch(err){console.warn('Sağlık yükleme temizleme:',err)}}
    console.warn('Patiyiz sağlık kaydı kaydedilemedi:',e);
    notify('Sağlık kaydı kaydedilemedi. Dosya ve bağlantı izinlerini kontrol et.',true);
   }finally{state.saving=false;changed()}
  }
  async function openFile(id){
   const record=state.docs.find(d=>d.id===id&&d.owner_id===getUser()?.id&&d.pet_id===state.petId&&d.object_path);
   if(!record)return notify('Dosya bulunamadı.',true);
   const result=await sb.storage.from(bucket).createSignedUrl(record.object_path,90);
   if(result.error||!result.data?.signedUrl)return notify('Özel dosya açılamadı.',true);
   window.open(result.data.signedUrl,'_blank','noopener,noreferrer');
  }
  async function remove(id){
   const rec=state.docs.find(x=>x.id===id&&x.owner_id===getUser()?.id&&x.pet_id===state.petId);
   if(!rec)return;
   if(!confirm('Bu sağlık kaydını kalıcı olarak silmek istiyor musun?'))return;
   try{
    const result=await sb.from('patiyiz_health_documents').delete().eq('id',id).eq('owner_id',getUser().id).eq('pet_id',state.petId).select('id');
    if(result.error)throw result.error;
    if(!result.data?.length)throw Error('Silinecek kayıt sunucuda doğrulanamadı.');
    if(rec.object_path){
     const removed=await sb.storage.from(bucket).remove([rec.object_path]);
     if(removed.error)console.warn('Sağlık belgesinin depodan temizlenmesi ertelendi:',removed.error);
    }
    state.docs=state.docs.filter(x=>x.id!==id);if(state.editingId===id)state.editingId='';notify('Kayıt silindi.');changed();
   }catch(e){notify('Kayıt silinemedi.',true)}
  }
  function report(){
   checked();
   const pet=current();
   const list=state.docs.filter(x=>x.pet_id===pet.id);
   const weights=(getWeights()||[]).filter(x=>x.pet_id===pet.id).slice(0,18);
   const reminders=(getReminders()||[]).filter(x=>x.pet_id===pet.id).slice(0,24);
   const safe=val=>esc(String(val??''));
   const print=document.createElement('section');
   print.id='pati-health-print-report';print.className='pati-health-print-report';
   print.innerHTML='<header><strong>🐾 Patiyiz · Kişisel Sağlık Dosyası</strong><span>'+safe(new Date().toLocaleDateString('tr-TR'))+'</span></header>'+
    '<h1>'+safe(pet.name)+'</h1><p>'+safe(pet.species)+' · '+safe(pet.breed||'')+' · '+safe(pet.age||'')+'</p>'+
    '<h2>Sağlık kayıtları ('+list.length+')</h2>'+
    (list.map(d=>'<article><b>'+safe(day(d.document_date))+' · '+safe(d.title)+'</b><p>'+safe(types[d.doc_type]?.[1]||'Kayıt')+' · '+safe(d.notes||'')+'</p></article>').join('')||'<p>Henüz sağlık kaydı eklenmedi.</p>')+
    '<h2>Kilo geçmişi</h2>'+(weights.map(w=>'<p>'+safe(w.measured_on)+' · '+safe(w.weight_kg)+' kg</p>').join('')||'<p>Ölçüm bulunmuyor.</p>')+
    '<h2>Bakım takvimi</h2>'+(reminders.map(r=>'<p>'+safe(new Date(r.due_at).toLocaleDateString('tr-TR'))+' · '+safe(r.title)+' · '+(r.completed_at?'Tamamlandı':'Planlandı')+'</p>').join('')||'<p>Hatırlatma bulunmuyor.</p>')+
    '<footer>Bu rapor kişisel takip amaçlıdır, resmî veteriner sağlık belgesi değildir. Ek dosyalar ve PDF tahliller gizlilik nedeniyle rapora eklenmez.</footer>';
   document.getElementById('pati-achievement-print')?.remove();document.getElementById(print.id)?.remove();document.body.append(print);
   window.print();
  }
  function recordCards(list){
   const safe=v=>esc(String(v??''));
   if(!list.length)return '<div class="hf-empty" role="status"><strong>Bu filtrelerde sağlık kaydı bulunamadı.</strong><p>Başka bir kategori seçebilir veya ilk kaydını oluşturabilirsin.</p><button type="button" data-health-clear>Tüm kayıtları göster</button></div>';
   return list.map(d=>'<article class="hf-record"><div class="hf-record-details"><div class="hf-record-tag">'+safe(types[d.doc_type]?.[0]||'📄')+' '+safe(types[d.doc_type]?.[1]||'Kayıt')+'</div>'
    +'<strong>'+safe(d.title)+'</strong><small>'+safe(day(d.document_date))+(d.object_path?' · 🔒 Özel belge':' · Not kaydı')+'</small>'
    +(d.notes?'<p>'+safe(d.notes)+'</p>':'')+'</div>'
    +'<div class="hf-record-actions">'+(d.object_path?'<button type="button" data-health-open="'+safe(d.id)+'">Belgeyi aç</button>':'')
    +'<button type="button" data-health-edit="'+safe(d.id)+'">Düzenle</button><button type="button" data-health-delete="'+safe(d.id)+'" class="hf-delete">Sil</button></div></article>').join('');
  }
  function updateResults(){
   const el=document.getElementById('hf-record-list'),counter=document.getElementById('hf-record-count');
   const records=shownDocs();
   if(el)el.innerHTML=recordCards(records);
   if(counter)counter.textContent=records.length+' kayıt';
  }
  function render(){
   const safe=v=>esc(String(v??''));
   const animals=pets();
   if(!state.petId||!animals.some(p=>p.id===state.petId))state.petId=animals[0]?.id||'';
   const active=current();
   if(!active)return '<section class="health-file health-stage13"><div class="hf-header"><span>🔒 YALNIZCA SANA ÖZEL</span><h1>Dijital Pati Sağlık Dosyası</h1><p>Sağlık dosyasını oluşturmak için önce bir hayvan profili ekle.</p></div><div class="hf-empty"><button type="button" data-action="health-add-pet" class="hf-primary">Hayvan ekle</button></div></section>';
   const docs=visibleDocs(),weights=(getWeights()||[]).filter(x=>x.pet_id===active.id),reminders=(getReminders()||[]).filter(x=>x.pet_id===active.id);
   const editing=state.editingId?docs.find(x=>x.id===state.editingId):null;
   if(state.editingId&&!editing)state.editingId='';
   const filtered=shownDocs();
   return '<section class="health-file health-stage13">'
    +'<div class="hf-header"><span>🔒 YALNIZCA SANA ÖZEL</span><h1>Dijital Pati Sağlık Dosyası</h1><p>Aşı kartlarını, tahlilleri ve veteriner notlarını yalnızca kendi hesabında sakla.</p></div>'
    +'<div class="hf-controls"><div class="hf-pets" role="group" aria-label="Hayvan seç">'+animals.map(p=>'<button type="button" class="'+(p.id===active.id?'active':'')+'" data-health-pet="'+safe(p.id)+'" aria-pressed="'+String(p.id===active.id)+'">'+safe(p.name)+'</button>').join('')+'</div>'
    +'<button type="button" data-health-print class="hf-report">🖨️ Yazdır / PDF kaydet</button></div>'
    +'<div class="hf-metrics"><div><strong>'+docs.length+'</strong><small>Sağlık kaydı</small></div><div><strong>'+docs.filter(d=>!!d.object_path).length+'</strong><small>Özel belge</small></div><div><strong>'+weights.length+'</strong><small>Kilo kaydı</small></div><div><strong>'+reminders.length+'</strong><small>Hatırlatma</small></div></div>'
    +'<p class="hf-privacy">🔐 Dosyalar özel depolama alanında saklanır. Sağlık belgeleri yalnızca kısa süreli, yetkili bağlantıyla açılır. Yazdırma raporuna belge ekleri dahil edilmez.</p>'
    +'<div class="hf-columns"><div class="hf-card hf-compose"><div class="hf-section-title"><h2>'+(editing?'✎ Sağlık kaydını düzenle':'＋ Yeni sağlık kaydı')+'</h2>'+(editing?'<button type="button" data-health-cancel>Vazgeç</button>':'')+'</div>'
    +'<p>'+(editing?'Yeni belge seçmezsen mevcut belge korunur.':'PDF ya da fotoğraf yüklemek isteğe bağlıdır. Belge olmadan da veteriner notu ekleyebilirsin.')+'</p>'
    +'<form id="pati-health-record-form"><label>Kayıt türü<select name="health-type" required>'+Object.entries(types).map(([k,v])=>'<option value="'+safe(k)+'"'+((editing?.doc_type||'vaccine')===k?' selected':'')+'>'+safe(v[0])+' '+safe(v[1])+'</option>').join('')+'</select></label>'
    +'<label>Başlık<input name="health-title" minlength="2" maxlength="100" value="'+safe(editing?.title||'')+'" placeholder="Örn. Yıllık aşı kontrolü" required></label>'
    +'<label>Kayıt tarihi<input type="date" name="health-date" max="'+today()+'" value="'+safe(editing?.document_date||today())+'" required></label>'
    +'<label>Notlar<textarea name="health-notes" maxlength="1000" rows="4" placeholder="Veteriner notları, gözlem ve kontroller">'+safe(editing?.notes||'')+'</textarea></label>'
    +(editing?.object_path?'<p class="hf-existing-file">🔒 Mevcut özel belge saklanıyor. Yeni dosya seçersen eskisinin yerine geçer.</p>':'')
    +'<label>Belge / fotoğraf (isteğe bağlı, en fazla 10 MB)<input name="health-file" type="file" accept=".pdf,image/jpeg,image/png,image/webp,application/pdf"></label>'
    +'<button class="hf-primary" type="submit" '+(state.saving?'disabled':'')+'>'+(state.saving?'Kaydediliyor…':editing?'Değişiklikleri kaydet':'Kaydı güvenle sakla')+'</button></form></div>'
    +'<div class="hf-card hf-history"><div class="hf-section-title"><h2>🗂️ Sağlık geçmişi</h2><span id="hf-record-count" aria-live="polite">'+filtered.length+' kayıt</span></div>'
    +(state.loading?'<p role="status">Sağlık geçmişi yükleniyor…</p>':'')
    +(state.error?'<p class="hf-error" role="alert">'+safe(state.error)+'</p><button data-health-retry type="button">Tekrar dene</button>':'')
    +'<label class="hf-search-label" for="hf-search">Sağlık kayıtlarında ara</label><input type="search" id="hf-search" value="'+safe(state.query)+'" placeholder="Başlık, not veya kayıt türü…" autocomplete="off" aria-controls="hf-record-list">'
    +'<div class="hf-filters" role="group" aria-label="Sağlık dosyası türü">'
    +[['all','Tümü'],...Object.entries(types).map(([k,v])=>[k,v[1]])].map(([k,label])=>'<button type="button" data-health-filter="'+safe(k)+'" class="'+(state.typeFilter===k?'active':'')+'" aria-pressed="'+String(state.typeFilter===k)+'">'+safe(label)+'</button>').join('')+'</div>'
    +'<div id="hf-record-list" class="hf-record-list">'+recordCards(filtered)+'</div></div></div>'
    +'<p class="hf-disclaimer">Sağlık dosyası kişisel takip içindir; resmî veteriner sağlık belgesi veya veteriner muayenesinin yerini almaz. Belgeye erişim izinli kullanıcılarla sınırlıdır.</p></section>';
  }
  return {state,load,selectPet,selectType,setSearch,edit,cancelEdit,shownDocs,updateResults,save,openFile,remove,report,render};
 }
 window.PatiyizHealthFile={create};
})();
