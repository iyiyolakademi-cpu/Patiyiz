/* Patiyiz system camera + gallery publisher.
 * No in-browser camera stream: the OS owns camera focus, exposure, lenses and
 * gallery permissions. User chooses a file and Patiyiz only previews/publishes it.
 */
(()=>{
 'use strict';
 let state=null;
 const isVideo=f=>!!f&&(/^video\//i.test(f.type||'')||/\.(mp4|mov|m4v|webm)$/i.test(f.name||''));
 const isPhoto=f=>!!f&&(/^image\//i.test(f.type||'')||/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name||''));
 const title=mode=>mode==='story'?'Yeni hikâye':mode==='reels'?'Yeni Reels':'Yeni gönderi';
 const kind=mode=>mode==='reels'?'video':'mixed';
 // Compact native-style icons; local inline vectors, no icon-font/network dependency.
 const optionIcons={
  photo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7.5h3l1.6-2h6.8l1.6 2H20a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z"/><circle cx="12" cy="13" r="3.4"/><path d="M18 10.5h.01"/></svg>',
  video:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5.5" width="14" height="13" rx="3"/><path d="m17 10 4-2.3v8.6L17 14"/><path d="m9 9.5 4 2.5-4 2.5Z" fill="currentColor" stroke="none"/></svg>',
  gallery:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5.5" y="5.5" width="15.5" height="15.5" rx="2.3"/><path d="M3 17.3V4.9A1.9 1.9 0 0 1 4.9 3H17"/><circle cx="15.6" cy="10.3" r="1.6"/><path d="m7.2 17.3 4.1-4.6 3.2 3.1 2.4-2.4 3.3 3.7"/></svg>'
 };

 const fmtSize=bytes=>bytes>=1048576?Math.round(bytes/1048576)+' MB':Math.max(1,Math.round(bytes/1024))+' KB';
 function error(message){
  if(!state)return;
  const node=state.root.querySelector('#pati-system-error');
  node.textContent=String(message);node.hidden=false;
 }
 function clearError(){
  if(!state)return;
  const node=state.root.querySelector('#pati-system-error');node.hidden=true;node.textContent='';
 }
 function freeURLs(current){
  for(const url of current.urls)URL.revokeObjectURL(url);
  current.urls.length=0;
 }
 function close(){
  if(!state)return;
  const current=state;state=null;
  freeURLs(current);
  current.root.remove();
  document.body.classList.remove('pati-system-media-active');
 }
 function showPreview(){
  if(!state)return;
  const current=state,root=current.root;
  const files=current.files,first=files[0],chosen=!!files.length;
  const chooser=root.querySelector('#pati-system-chooser'),preview=root.querySelector('#pati-system-preview');
  chooser.hidden=chosen;preview.hidden=!chosen;
  if(!chosen)return;
  const media=root.querySelector('#pati-system-preview-media');
  media.replaceChildren();
  freeURLs(current);
  const video=isVideo(first);
  if(video){
   const el=document.createElement('video');
   el.src=URL.createObjectURL(first);
   current.urls.push(el.src);
   el.playsInline=true;el.controls=true;el.preload='metadata';
   el.setAttribute('aria-label','Seçilen videonun önizlemesi');
   el.classList.toggle('pati-selfie-mirrored',current.mirrorSelfie);
   media.appendChild(el);
  }else{
   for(const f of files.slice(0,10)){
    const image=document.createElement('img');
    image.src=URL.createObjectURL(f);current.urls.push(image.src);
    image.alt='Seçilen fotoğraf';image.loading='lazy';
    media.appendChild(image);
   }
  }
  media.classList.toggle('multiple',files.length>1);
  const option=root.querySelector('#pati-system-mirror-option'),toggle=root.querySelector('#pati-system-mirror');
  option.hidden=!video;toggle.checked=video&&current.mirrorSelfie;
  const info=root.querySelector('#pati-system-summary');
  info.textContent=files.length>1?files.length+' fotoğraf seçildi':(video?'Video':'Fotoğraf')+' seçildi · '+fmtSize(first.size);
  const publish=root.querySelector('#pati-system-publish');
  publish.disabled=false;publish.textContent='Paylaş';
  // Let the person view their selected media before choosing to type a caption.
 }
 async function acceptFiles(files,source='gallery'){
  if(!state)return;
  const current=state,incoming=[...files].filter(f=>f?.size);
  const append=current.mode==='post'&&current.appendMode&&current.files.length&&current.files.every(isPhoto)&&incoming.every(isPhoto);
  const selected=append?[...current.files,...incoming]:incoming;
  current.appendMode=false;
  if(!selected.length)return;
  if(selected.length>10){error('Bir gönderide en fazla 10 fotoğraf seçebilirsin.');return}
  const videos=selected.filter(isVideo),photos=selected.filter(isPhoto);
  if(photos.length+videos.length!==selected.length){error('Yalnızca fotoğraf veya video seçebilirsin.');return}
  if(current.mode==='reels'&&(!videos.length||selected.length!==1)){error('Reels için tek bir video seç.');return}
  if(current.mode==='story'&&selected.length!==1){error('Hikâye için tek bir fotoğraf veya video seç.');return}
  if(videos.length&&(videos.length>1||photos.length)){error('Videoyu fotoğraflardan ayrı paylaşmalısın.');return}
  if(videos[0]?.size>500*1024*1024){error('Video 500 MB sınırını aşıyor. Galeride küçültüp yeniden dene.');return}
  clearError();
  try{
   await current.onMedia(selected,videos.length?'video':'photo');
  }catch(err){
   if(state===current)error(err?.message||'Seçilen medya paylaşıma hazırlanamadı.');
   return;
  }
  if(state!==current)return;
  current.files=selected;
  // Web capture does not reveal which physical lens was used. Start mirrored
  // for a camera recording and let people turn it off for rear-camera clips.
  current.mirrorSelfie=!!videos.length&&source==='camera-video';
  current.onMirrorChange?.(current.mirrorSelfie);
  void window.PatiyizCameraDraft?.save(current.userId,current.mode,selected,current.root.querySelector('#pati-system-caption')?.value||'');
  showPreview();
 }
 function launchPicker(name){
  if(!state||state.publishing)return;
  const current=state,input=current.root.querySelector('#pati-system-'+name);
  if(!input)return;
  input.value='';
  // Capacitor native Camera opens the real Android photo-camera activity.
  // Video capture and web/iOS use the platform file capture UI.
  if(name==='camera-photo'&&window.PatiyizNative?.isNative&&typeof window.PatiyizNative.pickPhotoForInput==='function'){
   void window.PatiyizNative.pickPhotoForInput(input,'camera',false).catch(err=>{
    if(state===current)error(err?.message||'Telefon kamerası açılamadı.');
   });
   return;
  }
  try{input.click()}catch(err){error('Telefonun kamera/galeri seçicisi açılamadı. Cihaz izinlerini kontrol et.')}
 }
 async function restoreDraft(){
  if(!state)return;
  const current=state,restore=current.root.querySelector('#pati-system-restore');
  const saved=await window.PatiyizCameraDraft?.load(current.userId);
  if(state!==current||!saved||saved.mode!==current.mode)return;
  restore.hidden=false;
  restore.onclick=async()=>{
   if(state!==current)return;
   const caption=current.root.querySelector('#pati-system-caption');
   caption.value=saved.caption||'';
   await acceptFiles(saved.files,'gallery');
   restore.hidden=true;
  };
 }
 function open({mode='post',userId,onMedia,onMirrorChange,onPublish,onCancel,onSwitch,onStoryPhotoCamera}={}){
  if(state)return;
  if(!['post','story','reels'].includes(mode))mode='post';
  if(typeof onMedia!=='function'||typeof onPublish!=='function')throw Error('Paylaşım bağlanamadı.');
  const root=document.createElement('section');
  root.id='patiyiz-system-media';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label',title(mode));
  root.dataset.mode=mode;
  root.innerHTML=
   '<div class="pati-system-panel">'+
   '<header class="pati-system-head"><button type="button" data-system="close" aria-label="Vazgeç">×</button><strong>'+title(mode)+'</strong><span>patiyiz</span></header>'+
   '<div id="pati-system-error" class="pati-system-error" role="alert" hidden></div>'+
   '<div id="pati-system-chooser">'+
   '<div class="pati-system-intro"><div class="pati-system-intro-symbol">＋</div><h2>Nasıl paylaşmak istersin?</h2><p>Telefonunun kamerasını veya galerisini kullan.</p></div>'+
   '<div class="pati-system-options">'+
   (mode==='reels'?'':
    '<button type="button" data-system="camera-photo"><span class="pati-system-option-icon pati-system-option-photo" aria-hidden="true">'+optionIcons.photo+'</span><span><strong>Fotoğraf çek</strong><small>Telefonun normal kamerası</small></span></button>')+
   '<button type="button" data-system="camera-video"><span class="pati-system-option-icon pati-system-option-video" aria-hidden="true">'+optionIcons.video+'</span><span><strong>Video çek</strong><small>Telefonun video kamerası</small></span></button>'+
   '<button type="button" data-system="gallery"><span class="pati-system-option-icon pati-system-option-gallery" aria-hidden="true">'+optionIcons.gallery+'</span><span><strong>Galeriden seç</strong><small>'+(mode==='reels'?'Fotoğraf arşivinden video seç':'Fotoğraf veya video seç')+'</small></span></button>'+
   '</div><button id="pati-system-restore" class="pati-system-restore" type="button" hidden>Önceki seçimi geri getir</button></div>'+
   '<div id="pati-system-preview" hidden>'+
   '<div id="pati-system-preview-media" class="pati-system-preview-media"></div>'+
   '<p id="pati-system-summary" class="pati-system-summary"></p>'+ 
   '<label id="pati-system-mirror-option" class="pati-system-mirror-option" hidden><input id="pati-system-mirror" type="checkbox"><span><strong>Selfie gibi göster</strong><small>Ön kamerada ekranda gördüğün ayna yönünü paylaşımda koru. Arka kamerada kapat.</small></span></label>'+
   '<label class="pati-system-caption-label" for="pati-system-caption">Açıklama (isteğe bağlı)</label>'+
   '<textarea id="pati-system-caption" maxlength="2000" rows="3" placeholder="Bir açıklama yaz…"></textarea>'+
   '<div class="pati-system-publish-actions">'+
   (mode==='post'?'<button type="button" data-system="add-camera-photo">＋ Fotoğraf çek</button><button type="button" data-system="add-gallery">＋ Galeriden ekle</button>':'')+
   '<button type="button" data-system="rechoose">Başka seç</button><button type="button" id="pati-system-publish" data-system="publish">Paylaş</button></div>'+
   '</div>'+
   '<nav class="pati-system-modes" aria-label="İçerik türü">'+
   ['post','story','reels'].map(m=>'<button type="button" data-system="switch" data-mode="'+m+'"'+(m===mode?' aria-current="page" class="active"':'')+'>'+(m==='post'?'GÖNDERİ':m==='story'?'HİKÂYE':'REELS')+'</button>').join('')+'</nav>'+
   '</div>'+
   '<input id="pati-system-camera-photo" type="file" accept="image/*" capture="environment" hidden>'+
   '<input id="pati-system-camera-video" type="file" accept="video/*,.mp4,.mov,.webm,.m4v" capture="environment" hidden>'+
   '<input id="pati-system-gallery" type="file" accept="'+(kind(mode)==='video'?'video/*,.mov,.mp4,.webm,.m4v':'image/*,video/*,.heic,.heif,.mov,.mp4,.webm,.m4v')+'"'+(mode==='post'?' multiple':'')+' hidden>';
  document.body.appendChild(root);
  document.body.classList.add('pati-system-media-active');
  state={root,mode,userId,onMedia,onMirrorChange,onPublish,onCancel,onSwitch,onStoryPhotoCamera,publishing:false,files:[],urls:[],mirrorSelfie:false,appendMode:false};
  const current=state;
  for(const n of ['camera-photo','camera-video','gallery']){
   root.querySelector('#pati-system-'+n).addEventListener('change',async event=>{
    if(state!==current)return;
    const selected=[...(event.target.files||[])];
    event.target.value='';
    await acceptFiles(selected,n);
   });
  }
  root.querySelector('#pati-system-mirror').addEventListener('change',e=>{
   if(state!==current||state.publishing||!state.files.some(isVideo))return;
   state.mirrorSelfie=!!e.target.checked;
   state.root.querySelector('#pati-system-preview-media video')?.classList.toggle('pati-selfie-mirrored',state.mirrorSelfie);
   state.onMirrorChange?.(state.mirrorSelfie);
  });
  root.addEventListener('click',async e=>{
   if(state!==current)return;
   const btn=e.target.closest('[data-system]');
   if(!btn)return;
   const action=btn.dataset.system;
   if(action==='close'){if(state.publishing)return;const cb=state.onCancel;close();cb?.();return}
   if(action==='switch'){
    if(state.publishing)return;
    const next=btn.dataset.mode;if(next===state.mode)return;
    const cb=state.onSwitch;close();cb?.(next);return;
   }
   if(action==='add-camera-photo'||action==='add-gallery'){
    if(state.mode!=='post'||state.publishing)return;
    if(state.files.some(isVideo)){error('Video paylaşımına fotoğraf eklenemez.');return}
    if(state.files.length>=10){error('En fazla 10 fotoğraf ekleyebilirsin.');return}
    state.appendMode=true;launchPicker(action==='add-camera-photo'?'camera-photo':'gallery');return;
   }
   if(['camera-photo','camera-video','gallery'].includes(action)){state.appendMode=false;launchPicker(action);return}
   if(action==='rechoose'){
    if(state.publishing)return;
    freeURLs(state);state.files=[];state.appendMode=false;state.mirrorSelfie=false;state.onMirrorChange?.(false);
    root.querySelector('#pati-system-preview').hidden=true;
    root.querySelector('#pati-system-chooser').hidden=false;clearError();
    return;
   }
   if(action==='publish'){
    if(state.publishing||!state.files.length)return;
    state.publishing=true;
    const publish=root.querySelector('#pati-system-publish');
    publish.disabled=true;publish.textContent='Paylaşılıyor…';clearError();
    try{await state.onPublish(root.querySelector('#pati-system-caption').value)}
    catch(err){
     if(state===current){
      error(err?.message||'Paylaşım yüklenemedi. Tekrar dene.');
      state.publishing=false;publish.disabled=false;publish.textContent='Tekrar paylaş';
     }
    }
   }
  });
  void restoreDraft();
 }
 window.PatiyizSystemMediaFlow={open,close,get active(){return !!state}};
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&state&&!state.publishing){const cb=state.onCancel;close();cb?.()}
 });
})();