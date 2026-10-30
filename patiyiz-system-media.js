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
  current.previewVersion=(current.previewVersion||0)+1;
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
 function updateCarouselControls(current){
  if(!current||state!==current)return;
  const root=current.root,files=current.files;
  const count=root.querySelector('#pati-system-carousel-count');
  if(count)count.textContent=(current.previewIndex+1)+' / '+files.length;
  for(const [name,edge] of [['prev',0],['next',files.length-1]]){
   const button=root.querySelector('[data-system="preview-'+name+'"]');
   if(button)button.disabled=files.length<2||current.previewIndex===edge;
  }
  for(const thumb of root.querySelectorAll('[data-system="photo-select"]')){
   const selected=Number(thumb.dataset.index)===current.previewIndex;
   thumb.classList.toggle('active',selected);thumb.setAttribute('aria-pressed',String(selected));
  }
  const actions=root.querySelector('#pati-system-photo-actions');
  if(actions){actions.hidden=current.mode!=='post'||!files.length||!files.every(isPhoto);
   const previous=actions.querySelector('[data-system="photo-move-prev"]'),next=actions.querySelector('[data-system="photo-move-next"]');
   if(previous)previous.disabled=current.previewIndex===0;
   if(next)next.disabled=current.previewIndex>=files.length-1;
  }
  const dots=root.querySelector('#pati-system-carousel-dots');
  if(dots)dots.innerHTML=files.length>1?files.map((_,index)=>'<i class="'+(index===current.previewIndex?'active':'')+'" aria-hidden="true"></i>').join(''):'';
 }
 async function showCroppedPreviews(current){
  if(!state||state!==current||!current.files.every(isPhoto)||!window.PatiyizCropMedia?.preview)return;
  const version=current.previewVersion;
  const media=current.root.querySelector('#pati-system-preview-media');
  for(const [index,file] of current.files.entries()){
   if(!window.PatiyizCropMedia.has(file))continue;
   try{
    const output=await window.PatiyizCropMedia.preview(file);
    if(!output?.size)throw Error('Düzenlenen fotoğraf gösterilemiyor.');
    if(state!==current||current.previewVersion!==version)return;
    const url=URL.createObjectURL(output);current.urls.push(url);
    const main=media.querySelector('img[data-file-index="'+index+'"]');
    const thumb=current.root.querySelector('[data-system="photo-select"][data-index="'+index+'"] img');
    if(main)main.src=url;
    if(thumb)thumb.src=url;
   }catch(err){
    if(state!==current||current.previewVersion!==version)return;
    error('Düzenlenen fotoğraf önizlenemedi. Kırpma ekranından yeniden dene.');
    current.previewError=true;
    const button=current.root.querySelector('#pati-system-publish');
    if(button)button.disabled=true;
    console.warn('Kırpma önizleme hatası:',err);
    return;
   }
  }
 }
 function showPreview(){
  if(!state)return;
  const current=state,root=current.root;
  const files=current.files,first=files[0],chosen=!!files.length;
  current.previewIndex=Math.max(0,Math.min(files.length-1,current.previewIndex||0));
  const chooser=root.querySelector('#pati-system-chooser'),preview=root.querySelector('#pati-system-preview');
  chooser.hidden=chosen;preview.hidden=!chosen;
  if(!chosen){freeURLs(current);root.querySelector('#pati-system-thumbnails').replaceChildren();return}
  const media=root.querySelector('#pati-system-preview-media');
  media.replaceChildren();
  freeURLs(current);
  const video=isVideo(first);
  if(video){
   for(const [index,file] of files.entries()){
    const el=document.createElement('video');
    el.src=URL.createObjectURL(file);current.urls.push(el.src);
    el.playsInline=true;el.controls=true;el.preload='metadata';
    el.setAttribute('aria-label',(index+1)+'. videonun önizlemesi');
    el.classList.toggle('pati-selfie-mirrored',current.mirrorSelfie);
    media.appendChild(el);
   }
  }else{
   for(const [index,file] of files.slice(0,10).entries()){
    const image=document.createElement('img');
    image.src=URL.createObjectURL(file);current.urls.push(image.src);
    image.dataset.fileIndex=String(index);
    image.alt=(index+1)+'. fotoğraf önizlemesi';image.loading=index===current.previewIndex?'eager':'lazy';
    media.appendChild(image);
   }
  }
  media.classList.toggle('multiple',files.length>1);
  root.querySelector('#pati-system-photo-review').hidden=current.mode!=='post'||!files.every(isPhoto);
  const thumbs=root.querySelector('#pati-system-thumbnails');
  thumbs.hidden=current.mode!=='post'||!files.every(isPhoto);
  thumbs.replaceChildren();
  if(!thumbs.hidden){
   files.forEach((file,i)=>{
    const wrap=document.createElement('div');wrap.className='pati-system-thumb-item';
    const select=document.createElement('button');select.type='button';select.dataset.system='photo-select';select.dataset.index=String(i);
    select.className='pati-system-thumb-select';select.setAttribute('aria-label','Fotoğraf '+(i+1)+' seç');
    const img=document.createElement('img');img.src=current.urls[i];img.alt='Fotoğraf '+(i+1);select.appendChild(img);
    const label=document.createElement('span');label.textContent=String(i+1);select.appendChild(label);
    const remove=document.createElement('button');remove.type='button';remove.dataset.system='photo-remove';remove.dataset.index=String(i);
    remove.className='pati-system-thumb-remove';remove.setAttribute('aria-label','Fotoğraf '+(i+1)+' kaldır');remove.textContent='×';
    wrap.append(select,remove);thumbs.appendChild(wrap);
   });
  }
  const controls=root.querySelector('#pati-system-carousel-controls');
  controls.hidden=files.length<2;
  updateCarouselControls(current);
  if(files.length>1)queueMicrotask(()=>{if(state===current)media.scrollLeft=media.clientWidth*current.previewIndex});
  current.previewError=false;
  const cropButton=root.querySelector('[data-system="photo-crop"]');
  if(cropButton)cropButton.hidden=video||!files.length;
  void showCroppedPreviews(current);
  const option=root.querySelector('#pati-system-mirror-option'),toggle=root.querySelector('#pati-system-mirror');
  option.hidden=!video;toggle.checked=video&&current.mirrorSelfie;
  const info=root.querySelector('#pati-system-summary');
  info.textContent=files.length>1?files.length+' '+(video?'video':'fotoğraf')+' seçildi':(video?'Video':'Fotoğraf')+' seçildi · '+fmtSize(first.size);
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
  if(videos.length&&(photos.length||(current.mode!=='post'&&videos.length>1)||videos.length>4)){error('Gönderide en fazla 4 video seçebilir, fotoğraflarla karıştıramazsın.');return}
  if(videos[0]?.size>500*1024*1024){error('Video 500 MB sınırını aşıyor. Galeride küçültüp yeniden dene.');return}
  clearError();
  try{
   await current.onMedia(selected,videos.length?'video':'photo');
  }catch(err){
   if(state===current)error(err?.message||'Seçilen medya paylaşıma hazırlanamadı.');
   return;
  }
  if(state!==current)return;
  current.previewIndex=append?Math.max(0,selected.length-incoming.length):0;
  current.files=selected;
  // Web capture does not reveal which physical lens was used. Start mirrored
  // for a camera recording and let people turn it off for rear-camera clips.
  current.mirrorSelfie=!!videos.length&&source==='camera-video';
  current.onMirrorChange?.(current.mirrorSelfie);
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
   '<header class="pati-system-head"><button type="button" data-system="close" aria-label="Vazgeç">×</button><strong>'+title(mode)+'</strong><span class="pati-system-head-spacer" aria-hidden="true"></span></header>'+
   '<div id="pati-system-error" class="pati-system-error" role="alert" hidden></div>'+
   '<div id="pati-system-chooser">'+
   '<div class="pati-system-intro"><div class="pati-system-intro-symbol">＋</div><h2>Nasıl paylaşmak istersin?</h2><p>Telefonunun kamerasını veya galerisini kullan.</p></div>'+
   '<div class="pati-system-options">'+
   (mode==='reels'?'':
    '<button type="button" data-system="camera-photo"><span class="pati-system-option-icon pati-system-option-photo" aria-hidden="true">'+optionIcons.photo+'</span><span><strong>Fotoğraf çek</strong><small>Telefonun normal kamerası</small></span></button>')+
   '<button type="button" data-system="camera-video"><span class="pati-system-option-icon pati-system-option-video" aria-hidden="true">'+optionIcons.video+'</span><span><strong>Video çek</strong><small>Telefonun video kamerası</small></span></button>'+
   '<button type="button" data-system="gallery"><span class="pati-system-option-icon pati-system-option-gallery" aria-hidden="true">'+optionIcons.gallery+'</span><span><strong>Galeriden seç</strong><small>'+(mode==='reels'?'Fotoğraf arşivinden video seç':'Fotoğraf veya video seç')+'</small></span></button>'+
   '</div></div>'+
   '<div id="pati-system-preview" hidden>'+
   '<div class="pati-system-preview-wrap"><div id="pati-system-preview-media" class="pati-system-preview-media" tabindex="0" aria-label="Seçilen fotoğraflar, kaydırarak gezebilirsin"></div>'+ 
   '<div id="pati-system-carousel-controls" class="pati-system-carousel-controls" hidden><button type="button" data-system="preview-prev" aria-label="Önceki fotoğraf">‹</button><span id="pati-system-carousel-count" aria-live="polite">1 / 1</span><button type="button" data-system="preview-next" aria-label="Sonraki fotoğraf">›</button></div></div>'+ 
   '<div id="pati-system-carousel-dots" class="pati-system-carousel-dots" aria-hidden="true"></div>'+ 
   '<div id="pati-system-photo-review" class="pati-system-photo-review" hidden><strong>Fotoğraflarını kontrol et</strong><small>Her fotoğrafa dokunarak aç, × ile kaldır. Sırasını değiştirebilirsin.</small></div>'+ 
   '<div id="pati-system-thumbnails" class="pati-system-thumbnails" aria-label="Seçilen fotoğraflar" hidden></div>'+ 
   '<div id="pati-system-photo-actions" class="pati-system-photo-actions" hidden><button type="button" data-system="photo-move-prev">← Sola taşı</button><button type="button" data-system="photo-move-next">Sağa taşı →</button></div>'+
   '<p id="pati-system-summary" class="pati-system-summary"></p><section class="pati-system-edit-panel" aria-label="Medya düzenleme ve paylaşım"><button type="button" class="pati-system-crop-entry" data-system="photo-crop" hidden>✂ Fotoğrafı kırp ve düzenle <span aria-hidden="true" class="pati-system-crop-chevron">›</span></button>'+ 
   '<label id="pati-system-mirror-option" class="pati-system-mirror-option" hidden><input id="pati-system-mirror" type="checkbox"><span><strong>Selfie gibi göster</strong><small>Ön kamerada ekranda gördüğün ayna yönünü paylaşımda koru. Arka kamerada kapat.</small></span></label>'+
   (mode==='story'?'<label class="pati-system-audience" for="pati-system-audience">Kimler görebilir?<select id="pati-system-audience"><option value="everyone">Herkes</option><option value="close_friends">Yakın Arkadaşlar</option></select></label>':'')+
   '<label class="pati-system-caption-label" for="pati-system-caption">Açıklama (isteğe bağlı)</label>'+
   '<textarea id="pati-system-caption" maxlength="'+(mode==='story'?'300':'1500')+'" rows="3" placeholder="İstersen açıklama yazabilirsin…"></textarea>'+
   '<div class="pati-system-publish-actions">'+
   (mode==='post'?'<button type="button" data-system="add-camera-photo">＋ Fotoğraf çek</button><button type="button" data-system="add-gallery">＋ Galeriden ekle</button>':'')+
   '<button type="button" data-system="rechoose">Başka seç</button><button type="button" id="pati-system-publish" data-system="publish">Paylaş</button></div></section>'+
   '</div>'+
   '<nav class="pati-system-modes" aria-label="İçerik türü">'+
   ['post','story','reels'].map(m=>'<button type="button" data-system="switch" data-mode="'+m+'"'+(m===mode?' aria-current="page" class="active"':'')+'>'+(m==='post'?'GÖNDERİ':m==='story'?'HİKÂYE':'REELS')+'</button>').join('')+'</nav>'+
   '</div>'+
   '<input id="pati-system-camera-photo" type="file" accept="image/*" capture="environment" hidden>'+
   '<input id="pati-system-camera-video" type="file" accept="video/*,.mp4,.mov,.webm,.m4v" capture="environment" hidden>'+
   '<input id="pati-system-gallery" type="file" accept="'+(kind(mode)==='video'?'video/*,.mov,.mp4,.webm,.m4v':'image/*,video/*,.heic,.heif,.mov,.mp4,.webm,.m4v')+'"'+(mode==='post'?' multiple':'')+' hidden>';
  document.body.appendChild(root);
  document.body.classList.add('pati-system-media-active');
  state={root,mode,userId,onMedia,onMirrorChange,onPublish,onCancel,onSwitch,onStoryPhotoCamera,publishing:false,editing:false,files:[],urls:[],previewVersion:0,previewError:false,previewIndex:0,mirrorSelfie:false,appendMode:false};
  const current=state;
  for(const n of ['camera-photo','camera-video','gallery']){
   root.querySelector('#pati-system-'+n).addEventListener('change',async event=>{
    if(state!==current)return;
    const selected=[...(event.target.files||[])];
    event.target.value='';
    await acceptFiles(selected,n);
   });
  }
  root.querySelector('#pati-system-preview-media').addEventListener('scroll',()=>{
   if(state!==current||current.files.length<2)return;
   const media=current.root.querySelector('#pati-system-preview-media');
   const index=Math.max(0,Math.min(current.files.length-1,Math.round(media.scrollLeft/Math.max(1,media.clientWidth))));
   if(index!==current.previewIndex){current.previewIndex=index;updateCarouselControls(current)}
  },{passive:true});
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
   if(action==='preview-prev'||action==='preview-next'){
    if(state.publishing||state.editing||state.files.length<2)return;
    const direction=action==='preview-next'?1:-1;
    state.previewIndex=Math.max(0,Math.min(state.files.length-1,state.previewIndex+direction));
    updateCarouselControls(state);
    const media=root.querySelector('#pati-system-preview-media');
    media.scrollTo({left:state.previewIndex*media.clientWidth,behavior:'smooth'});
    return;
   }
   if(action==='photo-select'){
    const index=Number(btn.dataset.index);
    if(!Number.isInteger(index)||index<0||index>=state.files.length||state.publishing||state.editing)return;
    state.previewIndex=index;updateCarouselControls(state);
    const viewport=root.querySelector('#pati-system-preview-media');
    viewport.scrollTo({left:index*viewport.clientWidth,behavior:'smooth'});
    return;
   }
   if(action==='photo-crop'){
     if(state.publishing||state.editing||!state.files.length||!state.files.every(isPhoto))return;
     if(!window.PatiyizCropMedia?.open){error('Fotoğraf düzenleyici henüz yüklenemedi. Sayfayı yeniden aç.');return}
     state.editing=true;clearError();
     try{
      await window.PatiyizCropMedia.open(()=>{
       if(state!==current)return;
       state.editing=false;
       showPreview();
      });
     }catch(err){if(state===current){state.editing=false;error(err?.message||'Kırpma ekranı açılamadı. Tekrar dene.')}}
     // Cancel must also restore the share action, without committing edits.
     const popup=document.getElementById('pati-full-crop-dialog');
     popup?.addEventListener('close',()=>{if(state===current)state.editing=false},{once:true});
     return;
    }
    if(['photo-remove','photo-move-prev','photo-move-next'].includes(action)){
    if(state.publishing||state.editing||state.mode!=='post'||!state.files.every(isPhoto))return;
    const oldIndex=state.previewIndex,at=action==='photo-remove'?Number(btn.dataset.index):oldIndex;
    if(!Number.isInteger(at)||at<0||at>=state.files.length)return;
    const next=state.files.slice();let nextIndex=oldIndex;
    if(action==='photo-remove'){
     next.splice(at,1);
     if(at<oldIndex)nextIndex=oldIndex-1;
     else if(at===oldIndex)nextIndex=Math.min(oldIndex,next.length-1);
    }else{
     const to=at+(action==='photo-move-prev'?-1:1);
     if(to<0||to>=next.length)return;
     [next[at],next[to]]=[next[to],next[at]];
     nextIndex=to;
    }
    state.editing=true;clearError();
    try{
     await state.onMedia(next,'photo');
     if(state!==current)return;
     state.files=next;state.previewIndex=Math.max(0,nextIndex);state.appendMode=false;
     showPreview();
    }catch(err){if(state===current)error(err?.message||'Fotoğraf güncellenemedi. Tekrar dene.')}
    finally{if(state===current)state.editing=false}
    return;
   }
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
    if(state.publishing||state.editing||state.previewError||!state.files.length)return;
    state.publishing=true;
    const publish=root.querySelector('#pati-system-publish');
    publish.disabled=true;publish.textContent='Paylaşılıyor…';
    clearError();
    try{await state.onPublish(root.querySelector('#pati-system-caption').value)}
    catch(err){
     if(state===current){
      error(err?.message||'Paylaşım yüklenemedi. Tekrar dene.');
      state.publishing=false;publish.disabled=false;publish.textContent='Tekrar paylaş';
     }
    }
   }
  });
 }
 window.PatiyizSystemMediaFlow={open,close,get active(){return !!state}};
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&state&&!state.publishing){const cb=state.onCancel;close();cb?.()}
 });
})();