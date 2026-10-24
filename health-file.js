/* Patiyiz private digital pet health file.
 * Authenticated, owner-only documents in a PRIVATE Supabase storage bucket.
 * Never creates public file URLs or permits another user's document IDs. */
(()=>{
 'use strict';
 const bucket='patiyiz-health-private';
 const types={vaccine:['💉','Aşı kaydı'],vet:['🩺','Veteriner muayenesi'],test:['🧪','Tahlil / sonuç'],medicine:['💊','İlaç / reçete'],other:['📄','Diğer sağlık kaydı']};
 const allowed=['application/pdf','image/jpeg','image/png','image/webp'];
 function create({sb,getUser,getPets,getReminders,getWeights,esc,notify,onChange}){
  const state={petId:'',docs:[],loading:false,loaded:false,attempted:false,saving:false,error:'',printView:false};
  const changed=()=>onChange?.();
  const pets=()=>getPets().filter(p=>p.owner_id===getUser()?.id);
  const current=()=>pets().find(p=>p.id===state.petId);
  const checked=()=>{if(!current())throw Error('Sağlık dosyasına erişmek için kendi hayvanını seçmelisin.');};
  const day=d=>{try{return new Date((d||'')+'T12:00:00').toLocaleDateString('tr-TR')}catch{return d}};
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
  function selectPet(id){if(!pets().some(p=>p.id===id))return;state.petId=id;state.printView=false;changed()}
  async function save(form){
   if(state.saving)return;
   if(!state.petId)state.petId=pets()[0]?.id||'';
   checked();
   const uid=getUser().id,petId=state.petId;
   const file=form.querySelector('[name="health-file"]')?.files?.[0]||null;
   const title=String(form.querySelector('[name="health-title"]')?.value||'').trim();
   const kind=form.querySelector('[name="health-type"]')?.value;
   const document_date=form.querySelector('[name="health-date"]')?.value;
   const notes=String(form.querySelector('[name="health-notes"]')?.value||'').trim();
   if(title.length<2||title.length>100||notes.length>1000||!types[kind]||!/^\d{4}-\d{2}-\d{2}$/.test(document_date)){
    notify('Başlık, kategori, tarih veya açıklamayı kontrol et.',true);return;
   }
   if(file&&(!allowed.includes(file.type)||file.size>10*1024*1024||file.size===0)){
    notify('Yalnızca PDF, JPG, PNG, WEBP ve en fazla 10 MB dosya yüklenebilir.',true);return;
   }
   state.saving=true;changed();
   let object_path=null;
   try{
    if(file){
     const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
     object_path=uid+'/'+petId+'/'+crypto.randomUUID()+'.'+ext;
     const uploaded=await sb.storage.from(bucket).upload(object_path,file,{contentType:file.type,upsert:false});
     if(uploaded.error)throw uploaded.error;
    }
    const saved=await sb.from('patiyiz_health_documents').insert({
     owner_id:uid,pet_id:petId,doc_type:kind,title,notes,document_date,
     object_path,mime_type:file?.type||null,byte_size:file?.size||null
    });
    if(saved.error)throw saved.error;
    form.reset();state.loaded=false;notify('Sağlık kaydı özel dosyana eklendi.');
    await load(true);
   }catch(e){
    if(object_path){try{await sb.storage.from(bucket).remove([object_path])}catch(_){}}
    console.warn('Patiyiz sağlık kaydı yüklenemedi:',e);
    notify('Sağlık kaydı eklenemedi. Dosya ve bağlantı izinlerini kontrol et.',true);
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
    const result=await sb.from('patiyiz_health_documents').delete().eq('id',id).eq('owner_id',getUser().id);
    if(result.error)throw result.error;
    if(rec.object_path){
     const removed=await sb.storage.from(bucket).remove([rec.object_path]);
     if(removed.error)console.warn('Sağlık belgesinin depodan temizlenmesi ertelendi:',removed.error);
    }
    state.docs=state.docs.filter(x=>x.id!==id);notify('Kayıt silindi.');changed();
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
  function render(){
   const safe=v=>esc(String(v??''));
   const animals=pets();
   if(!state.petId||!animals.some(p=>p.id===state.petId))state.petId=animals[0]?.id||'';
   const active=current();
   if(!active)return '<section class="health-file"><h1>🐾 Dijital Pati Sağlık Dosyası</h1><p>Özel sağlık dosyası oluşturmak için önce bir hayvan profili ekle.</p><button data-action="health-add-pet" class="hf-primary">Hayvan ekle</button></section>';
   const docs=state.docs.filter(x=>x.pet_id===active.id);
   const weights=getWeights().filter(x=>x.pet_id===active.id);
   const reminders=getReminders().filter(x=>x.pet_id===active.id);
   return '<section class="health-file"><div class="hf-header"><span>🔒 YALNIZCA SANA ÖZEL</span><h1>Dijital Pati Sağlık Dosyası</h1><p>Aşı kartları, tahliller, veteriner notları ve sağlık geçmişini güvenle sakla.</p></div>'+
    '<div class="hf-controls"><div class="hf-pets">'+animals.map(p=>'<button type="button" class="'+(p.id===active.id?'active':'')+'" data-health-pet="'+safe(p.id)+'">'+safe(p.name)+'</button>').join('')+'</div>'+
    '<button type="button" data-health-print class="hf-report">🖨️ Sağlık raporu / PDF oluştur</button></div>'+
    '<div class="hf-metrics"><div><strong>'+docs.length+'</strong><small>Sağlık belgesi</small></div><div><strong>'+weights.length+'</strong><small>Kilo kaydı</small></div><div><strong>'+reminders.length+'</strong><small>Bakım hatırlatıcısı</small></div></div>'+
    '<div class="hf-columns"><div class="hf-card"><h2>➕ Sağlık kaydı ekle</h2><p>PDF veya fotoğraf eklemek isteğe bağlıdır. Kayıtları yalnız hesabından görebilirsin.</p>'+
    '<form id="pati-health-record-form"><label>Kayıt türü<select name="health-type" required>'+Object.entries(types).map(([k,v])=>'<option value="'+k+'">'+v[0]+' '+v[1]+'</option>').join('')+'</select></label>'+
    '<label>Başlık<input name="health-title" minlength="2" maxlength="100" placeholder="Örn. Yıllık aşı kontrolü" required></label>'+
    '<label>Kayıt tarihi<input type="date" name="health-date" value="'+new Date().toISOString().slice(0,10)+'" required></label>'+
    '<label>Notlar<textarea name="health-notes" maxlength="1000" rows="3" placeholder="Veteriner notu, gözlem veya açıklama (isteğe bağlı)"></textarea></label>'+
    '<label>Belge / fotoğraf (isteğe bağlı, en fazla 10 MB)<input name="health-file" type="file" accept=".pdf,image/jpeg,image/png,image/webp,application/pdf"></label>'+
    '<button class="hf-primary" type="submit" '+(state.saving?'disabled':'')+'>'+(state.saving?'Kaydediliyor…':'Kaydı güvenle sakla')+'</button></form></div>'+
    '<div class="hf-card"><h2>🗂️ Sağlık geçmişi</h2>'+ (state.loading?'<p>Sağlık geçmişi yükleniyor…</p>':'')+
    (state.error?'<p role="alert">'+safe(state.error)+'</p><button data-health-retry type="button">Tekrar dene</button>':'')+
    (docs.map(d=>'<article class="hf-record"><div><strong>'+safe(types[d.doc_type]?.[0]||'📄')+' '+safe(d.title)+'</strong><small>'+safe(day(d.document_date))+' · '+safe(types[d.doc_type]?.[1]||'Kayıt')+'</small><p>'+safe(d.notes||'')+'</p></div><div class="hf-record-actions">'+(d.object_path?'<button type="button" data-health-open="'+safe(d.id)+'">Belgeyi aç</button>':'')+'<button type="button" data-health-delete="'+safe(d.id)+'">Sil</button></div></article>').join('')||'<p class="hf-empty">Henüz sağlık kaydın yok. İlk belgeyi soldan ekleyebilirsin.</p>')+
    '</div></div><p class="hf-disclaimer">Özel dosyalara erişim Supabase yetki kontrolüyle sınırlandırılır. Paylaşılabilir açık bağlantı üretilmez. Bu kayıtlar veteriner teşhisi veya resmî aşı kartı yerine geçmez.</p></section>';
  }
  return {state,load,selectPet,save,openFile,remove,report,render};
 }
 window.PatiyizHealthFile={create};
})();
