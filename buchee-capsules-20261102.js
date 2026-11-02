/* Buchee Kapsül — time-locked messages, photos & videos. Mobile-first.
   Locked content is served only when database RLS considers it unlocked. */
(function(global){
'use strict';
const BUCKET='buchee-capsules';
let client=null,viewer='',current=null,editor=null,objectUrl='',busy=false,visibleQuery=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>{try{return new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d))}catch(_){return 'Belirlenen tarih'}};
const validDate=d=>Number.isFinite(new Date(d).getTime());
function localInputDate(date){const n=new Date(date),p=v=>String(v).padStart(2,'0');return n.getFullYear()+'-'+p(n.getMonth()+1)+'-'+p(n.getDate())+'T'+p(n.getHours())+':'+p(n.getMinutes())}
function safeMedia(file){
 if(!file)return {kind:'text',mime:'',ext:'',file:null};
 const mime=(file.type||'').toLowerCase(),image=['image/jpeg','image/png','image/webp'],video=['video/mp4','video/webm','video/quicktime'];
 if(image.includes(mime)&&file.size<=15*1024*1024)return {kind:'image',mime,ext:mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg',file};
 if(video.includes(mime)&&file.size<=50*1024*1024)return {kind:'video',mime,ext:mime==='video/webm'?'webm':mime==='video/quicktime'?'mov':'mp4',file};
 throw Error('Fotoğraf en fazla 15 MB, video en fazla 50 MB olmalı. JPG, PNG, WebP, MP4, MOV veya WebM kullan.');
}
function icon(kind){return kind==='image'?'◈':kind==='video'?'▷':'✉'}
function section({sb,viewerId,profileId,own,locked}){
 if(!sb||!viewerId||!profileId||locked)return '';
 client=sb;viewer=viewerId;
 const markup='<section class="bc-section" data-bc-profile="'+esc(profileId)+'" data-bc-own="'+(own?'yes':'no')+'" aria-label="Buchee Kapsül">'+
 '<div class="bc-section-head"><div class="bc-section-heading"><span class="bc-spark">◈</span><div><strong>Buchee Kapsül</strong><small>Geleceğe bir iz bırak.</small></div></div>'+
 (own?'<button type="button" class="bc-archive-link" data-bc-action="legacy">Hikâye Arşivim</button>':'')+'</div>'+
 '<div class="bc-rail" role="list">'+(own?'<button role="listitem" type="button" class="bc-new-card" data-bc-action="create"><span class="bc-new-glyph">＋</span><strong>Yeni kapsül</strong><small>Geleceğe gönder</small></button>':'')+
 '<div class="bc-loading-card" role="status"><span class="bc-loading-circle"></span><small>Kapsüller yükleniyor…</small></div></div></section>';
 Promise.resolve().then(()=>{const root=document.querySelector('.bc-section[data-bc-profile="'+profileId+'"]');if(root)void hydrate(root,profileId,own)});
 return markup;
}
function showToast(msg,error=false){
 const h=document.querySelector('#toasts');
 if(h){const t=document.createElement('div');t.className='pati-toast'+(error?' error':'');t.textContent=msg;h.append(t);setTimeout(()=>t.remove(),4800)}
 else if(error)console.warn(msg);
}
function card(item,own){
 const open=new Date(item.unlock_at).getTime()<=Date.now();
 const label=item.audience==='only_me'?'Yalnızca ben':item.audience==='followers'?'Takipçiler':'Herkes';
 return '<button type="button" role="listitem" class="bc-card '+(open?'bc-open':'bc-locked')+'" data-bc-action="view" data-bc-id="'+esc(item.id)+'" aria-label="'+esc(item.title)+(open?', açıldı':', '+fmt(item.unlock_at)+' tarihinde açılacak')+'">'+
 '<span class="bc-card-top"><span class="bc-card-glyph">'+(open?'✧':'♢')+'</span><span class="bc-card-state">'+(open?'AÇILDI':'KİLİTLİ')+'</span></span>'+
 '<strong class="bc-card-title">'+esc(item.title)+'</strong>'+
 '<span class="bc-card-date">'+(open?'Açılma: ':'Açılacak: ')+esc(fmt(item.unlock_at))+'</span>'+
 (own?'<span class="bc-card-visibility">'+esc(label)+'</span>':'')+'</button>';
}
async function hydrate(root,profileId,own){
 const ticket=++visibleQuery;
 const rail=root.querySelector('.bc-rail');
 if(!rail)return;
 try{
  const result=await client.from('buchee_capsules').select('id,owner_id,title,unlock_at,audience,kind,created_at').eq('owner_id',profileId).order('created_at',{ascending:false}).limit(40);
  if(result.error)throw result.error;
  if(ticket!==visibleQuery||!root.isConnected||root.dataset.bcProfile!==profileId)return;
  const records=result.data||[];
  root.dataset.bcCount=String(records.length);
  rail.innerHTML=(own?'<button role="listitem" type="button" class="bc-new-card" data-bc-action="create"><span class="bc-new-glyph">＋</span><strong>Yeni kapsül</strong><small>Geleceğe gönder</small></button>':'')+
   (records.length?records.map(x=>card(x,own)).join(''):'<div class="bc-empty-rail">'+(own?'İlk zaman kapsülünü oluştur.':'Henüz paylaşılan kapsül yok.')+'</div>');
 }catch(e){
  if(!root.isConnected||ticket!==visibleQuery)return;
  rail.innerHTML=(own?'<button role="listitem" type="button" class="bc-new-card" data-bc-action="create"><span class="bc-new-glyph">＋</span><strong>Yeni kapsül</strong><small>Geleceğe gönder</small></button>':'')+
   '<div class="bc-empty-rail">Kapsüller yüklenemedi. <button type="button" data-bc-action="retry">Tekrar dene</button></div>';
  console.warn('Buchee Kapsül:',e?.message||e);
 }
}
function getOwnerRoot(){return document.querySelector('.bc-section[data-bc-own="yes"]')}
function clearEditor(){
 if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=''}
 editor?.remove();editor=null;busy=false;
 document.body.classList.remove('bc-editor-visible');
}
function makeOverlay(title,body,mode='create'){
 clearEditor();
 editor=document.createElement('section');
 editor.className='bc-overlay';editor.id='buchee-capsule-overlay';editor.setAttribute('role','dialog');
 editor.setAttribute('aria-modal','true');editor.setAttribute('aria-label',title);
 editor.dataset.mode=mode;
 editor.innerHTML='<div class="bc-window"><header class="bc-header"><button type="button" class="bc-header-back" data-bc-action="close" aria-label="Kapat">×</button><strong>'+esc(title)+'</strong><span class="bc-header-side">◈</span></header>'+body+'</div>';
 document.body.append(editor);document.body.classList.add('bc-editor-visible');
 return editor;
}
function openCreate(){
 if(!client||!viewer||!getOwnerRoot())return showToast('Kapsül oluşturmak için kendi profiline geç.',true);
 const defaultDate=localInputDate(Date.now()+7*24*60*60*1000);
 const minDate=localInputDate(Date.now()+7*60*1000),maxDate=localInputDate(Date.now()+10*365*24*60*60*1000);
 const html='<div class="bc-compose-scroll"><div class="bc-eyebrow">GELECEĞE BIRAK</div>'+
 '<div class="bc-compose-hero"><div class="bc-orb">✦</div><div><h2>Bugünden yarına bir mesaj.</h2><p>Bir anını, bir hayalini veya gelecekteki kendine söylemek istediklerini kilitle.</p></div></div>'+
 '<form id="bc-create-form" class="bc-form">'+
 '<label class="bc-label" for="bc-title">Kapsülün adı <span>2–64 karakter</span></label><input id="bc-title" name="title" maxlength="64" minlength="2" placeholder="Örn. 2027’deki bana…" required autocomplete="off">'+
 '<label class="bc-label" for="bc-message">İçine ne bırakalım?</label><textarea id="bc-message" name="message" maxlength="2000" rows="5" placeholder="Geleceğe bir not yaz. İstersen fotoğraf veya video da ekleyebilirsin."></textarea>'+
 '<label class="bc-media-picker" for="bc-file"><span class="bc-media-icon">▧</span><span><strong>Fotoğraf veya video ekle</strong><small>Fotoğraf en fazla 15 MB · Video en fazla 50 MB</small></span><span class="bc-media-plus">＋</span><input type="file" id="bc-file" name="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" hidden></label>'+
 '<div id="bc-media-preview" class="bc-media-preview" hidden></div>'+
 '<label class="bc-label" for="bc-unlock">Ne zaman açılsın?</label><input id="bc-unlock" type="datetime-local" name="unlock" required min="'+minDate+'" max="'+maxDate+'" value="'+defaultDate+'"><p class="bc-field-hint">Saat, telefonunun yerel saatine göre seçilir. Kapsül en az 5 dakika sonrasına ayarlanabilir.</p>'+
 '<label class="bc-label" for="bc-audience">Kimler görebilsin?</label><select id="bc-audience" name="audience"><option value="everyone">Herkes (profiline erişebilenler)</option><option value="followers">Yalnızca takipçilerim</option><option value="only_me">Yalnızca ben</option></select>'+
 '<p class="bc-seal-notice">Kapsül kapatıldıktan sonra mesaj ve medya düzenlenemez. Açılma zamanı gelene kadar içerik gizli kalır. Dilersen kapsülü tamamen silebilirsin.</p>'+
 '</form></div><div class="bc-footer"><span class="bc-form-error" role="alert" hidden></span><button type="button" class="bc-primary" data-bc-action="seal">◈ Kapsülü kilitle</button></div>';
 const root=makeOverlay('Yeni Buchee Kapsül',html);
 root.querySelector('#bc-title')?.focus({preventScroll:true});
}
async function seal(){
 if(!editor||busy||!client)return;
 const form=editor.querySelector('#bc-create-form'),message=form?.elements.message.value.trim()||'',title=form?.elements.title.value.trim()||'';
 const audience=form?.elements.audience.value,rawDate=form?.elements.unlock.value,file=form?.elements.file.files?.[0];
 let media;
 try{
  if(title.length<2||title.length>64)throw Error('Kapsül adı 2–64 karakter olmalı.');
  if(message.length>2000)throw Error('Mesaj en fazla 2000 karakter olabilir.');
  media=safeMedia(file);
  if(!message&&media.kind==='text')throw Error('Bir mesaj yaz veya fotoğraf/video ekle.');
  if(!validDate(rawDate))throw Error('Geçerli bir açılma tarihi seç.');
  const at=new Date(rawDate).getTime();
  if(at<Date.now()+6*60*1000||at>Date.now()+10*365*24*60*60*1000)throw Error('Açılma tarihi en az 6 dakika sonrası, en fazla 10 yıl sonrası olmalı.');
  if(!['everyone','followers','only_me'].includes(audience))throw Error('Görünürlük seçimi geçersiz.');
 }catch(e){formError(e.message);return}
 const btn=editor.querySelector('[data-bc-action="seal"]'),oldId=viewer,root=editor;
 busy=true;btn.disabled=true;btn.textContent='Kapsül mühürleniyor…';formError('');
 let id='',path='',completed=false;
 try{
  id=crypto.randomUUID();
  if(media.kind!=='text')path=oldId+'/'+id+'/'+crypto.randomUUID()+'.'+media.ext;
  const insert=await client.from('buchee_capsules').insert({id,owner_id:oldId,title,unlock_at:new Date(rawDate).toISOString(),audience,kind:media.kind,media_path:path||null}).select('id').single();
  if(insert.error)throw insert.error;
  if(path){
   const uploaded=await client.storage.from(BUCKET).upload(path,media.file,{contentType:media.mime,cacheControl:'60',upsert:false});
   if(uploaded.error)throw uploaded.error;
  }
  const content=await client.from('buchee_capsule_contents').insert({capsule_id:id,message,media_path:path||null});
  if(content.error)throw content.error;
  completed=true;
  if(editor===root){
   clearEditor();showToast('Kapsül mühürlendi! Açılma tarihinde görüntülenebilir.');
   const section=getOwnerRoot();if(section)void hydrate(section,oldId,true);
  }
 }catch(e){
  if(!completed&&id){
   try{await client.from('buchee_capsules').delete().eq('id',id).eq('owner_id',oldId)}catch(_){}
   if(path)try{await client.storage.from(BUCKET).remove([path])}catch(_){}
  }
  if(editor===root)formError(e.message||'Kapsül kaydedilemedi, yeniden dene.');
 }finally{
  if(editor===root){busy=false;btn.disabled=false;btn.textContent='◈ Kapsülü kilitle'}
 }
}
function formError(message){const host=editor?.querySelector('.bc-form-error');if(host){host.hidden=!message;host.textContent=message||''}}
function previewFile(input){
 const host=editor?.querySelector('#bc-media-preview');if(!host)return;
 if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=''}
 host.innerHTML='';host.hidden=true;
 const file=input.files?.[0];if(!file)return;
 try{const media=safeMedia(file);objectUrl=URL.createObjectURL(file);
  const node=document.createElement(media.kind==='image'?'img':'video');node.src=objectUrl;
  if(media.kind==='video'){node.controls=true;node.playsInline=true;node.muted=true}
  else{node.alt='Kapsüle eklenecek fotoğraf';node.draggable=false}
  host.append(node);host.hidden=false;
 }catch(e){input.value='';formError(e.message)}
}
function countdown(target){
 const diff=new Date(target).getTime()-Date.now();if(diff<=0)return 'Açılma zamanı geldi';
 const days=Math.floor(diff/86400000),hours=Math.floor((diff%86400000)/3600000),minutes=Math.floor((diff%3600000)/60000);
 return (days>0?days+' gün ':'')+hours+' saat '+minutes+' dakika kaldı';
}
async function showCapsule(id){
 if(!client||!id)return;
 const ownRoot=getOwnerRoot(),who=viewer;
 const root=makeOverlay('Buchee Kapsül','<div class="bc-detail-loading">Kapsül yükleniyor…</div>','view');
 const meta=await client.from('buchee_capsules').select('id,owner_id,title,unlock_at,audience,kind,media_path,created_at').eq('id',id).single();
 if(editor!==root)return;
 if(meta.error||!meta.data){root.querySelector('.bc-detail-loading').textContent='Bu kapsüle erişim iznin yok veya kapsül bulunamadı.';return}
 const item=meta.data,own=item.owner_id===who,unlocked=new Date(item.unlock_at).getTime()<=Date.now();
 let body='';
 if(!unlocked){
  body='<div class="bc-detail-wrap"><div class="bc-lock-splash">✦</div><span class="bc-detail-eyebrow">ZAMAN KAPSÜLÜ · MÜHÜRLÜ</span><h2>'+esc(item.title)+'</h2><p>Bu mesajın açılacağı zaman henüz gelmedi.</p><div class="bc-count-box">'+esc(countdown(item.unlock_at))+'</div><div class="bc-exact-date">'+esc(fmt(item.unlock_at))+'</div></div>';
 }else{
  const content=await client.from('buchee_capsule_contents').select('message,media_path').eq('capsule_id',id).maybeSingle();
  if(editor!==root)return;
  if(content.error||!content.data){root.querySelector('.bc-detail-loading').textContent='Kapsülün içeriği açılamadı. Sayfayı yenileyerek tekrar dene.';return}
  const text=content.data.message||'',path=content.data.media_path;
  let mediaHtml='';
  if(path){
   const signed=await client.storage.from(BUCKET).createSignedUrl(path,180);
   if(editor!==root)return;
   if(!signed.error&&signed.data?.signedUrl){
    const u=esc(signed.data.signedUrl);
    mediaHtml=item.kind==='video'?'<video class="bc-reveal-media" src="'+u+'" controls playsinline preload="metadata"></video>':
     '<img class="bc-reveal-media" src="'+u+'" alt="Kapsülden açılan fotoğraf">';
   }else mediaHtml='<p class="bc-media-unavailable">Medya şu anda açılamadı.</p>';
  }
  body='<div class="bc-detail-wrap bc-detail-open"><div class="bc-open-spark">✦</div><span class="bc-detail-eyebrow">KAPSÜL AÇILDI</span><h2>'+esc(item.title)+'</h2><p class="bc-opened-date">'+esc(fmt(item.unlock_at))+'</p>'+
   mediaHtml+(text?'<p class="bc-reveal-text">'+esc(text)+'</p>':'')+'</div>';
 }
 root.innerHTML='<div class="bc-window"><header class="bc-header"><button type="button" class="bc-header-back" data-bc-action="close" aria-label="Kapat">×</button><strong>Buchee Kapsül</strong><span class="bc-header-side">◈</span></header>'+
 '<div class="bc-detail-scroll">'+body+'</div>'+(own?'<div class="bc-footer bc-detail-footer"><button type="button" class="bc-danger-text" data-bc-action="delete" data-bc-id="'+esc(id)+'">Kapsülü sil</button></div>':'')+'</div>';
}
async function deleteCapsule(id){
 if(!client||!viewer||busy||!id||!confirm('Bu kapsül ve içindeki mesaj/medya tamamen silinsin mi? Bu işlem geri alınamaz.'))return;
 busy=true;const oldRoot=editor,section=getOwnerRoot();
 try{
  const res=await client.from('buchee_capsules').select('owner_id,media_path').eq('id',id).single();
  if(res.error)throw res.error;
  if(res.data.owner_id!==viewer)throw Error('Yalnızca kendi kapsülünü silebilirsin.');
  const del=await client.from('buchee_capsules').delete().eq('id',id).eq('owner_id',viewer).select('id');
  if(del.error)throw del.error;
  if(!del.data?.length)throw Error('Kapsül silinemedi.');
  if(res.data.media_path){
   const clean=await client.storage.from(BUCKET).remove([res.data.media_path]);
   if(clean.error)console.warn('Kapsül medya temizliği:',clean.error.message);
  }
  if(editor===oldRoot)clearEditor();
  showToast('Kapsül silindi.');if(section?.isConnected)void hydrate(section,viewer,true);
 }catch(e){showToast(e.message||'Kapsül silinemedi.',true)}
 finally{busy=false}
}
document.addEventListener('click',function(event){
 const b=event.target.closest?.('[data-bc-action]');
 if(!b)return;
 const action=b.dataset.bcAction;
 if(!['create','close','seal','view','delete','retry'].includes(action))return;
 event.preventDefault();event.stopPropagation();
 if(action==='create'){if(!busy)openCreate()}
 else if(action==='close'){if(!busy)clearEditor()}
 else if(action==='seal')void seal();
 else if(action==='view'){if(!busy)void showCapsule(b.dataset.bcId)}
 else if(action==='delete')void deleteCapsule(b.dataset.bcId);
 else if(action==='retry'){const section=b.closest('.bc-section');if(section)void hydrate(section,section.dataset.bcProfile,section.dataset.bcOwn==='yes')}
},true);
document.addEventListener('change',function(e){if(e.target?.id==='bc-file')previewFile(e.target)},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&editor&&!busy)clearEditor()});
document.addEventListener('visibilitychange',function(){
 if(!document.hidden){const root=document.querySelector('.bc-section');if(root)void hydrate(root,root.dataset.bcProfile,root.dataset.bcOwn==='yes')}
});
global.BucheeCapsules={section,refresh(){const root=document.querySelector('.bc-section');if(root)void hydrate(root,root.dataset.bcProfile,root.dataset.bcOwn==='yes')},close:clearEditor};
})(window);
