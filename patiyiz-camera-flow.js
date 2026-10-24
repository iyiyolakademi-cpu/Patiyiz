/* One-screen Instagram-style camera / gallery / post composer.
 * Android: PatiyizGallery MediaStore bridge. Browser: system picker fallback.
 * Original post publication, crop, Supabase validation and attachments stay intact.
 */
(function(){
 'use strict';
 let state=null;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const native=()=>!!window.PatiyizNativeGallery;
 const bytesToFile=(str,name='patiyiz-fotograf.jpg')=>{
  const raw=atob(str),chunks=[];
  for(let i=0;i<raw.length;i+=32768){
   const slice=raw.slice(i,i+32768),arr=new Uint8Array(slice.length);
   for(let j=0;j<slice.length;j++)arr[j]=slice.charCodeAt(j);
   chunks.push(arr);
  }
  return new File(chunks,name,{type:'image/jpeg',lastModified:Date.now()});
 };
 const urlFor=f=>URL.createObjectURL(f);
 const showMessage=(message)=>{
  const el=document.querySelector('#pati-camera-alert');
  if(el){el.textContent=message;el.hidden=false;}
 };
 const stopCamera=()=>{
  if(!state)return;
  state.stream?.getTracks().forEach(track=>track.stop());
  state.stream=null;
  const video=state.root.querySelector('#pati-camera-live');
  if(video)video.srcObject=null;
 };
 const cleanup=()=>{
  if(!state)return;
  stopCamera();
  state.urls.forEach(url=>URL.revokeObjectURL(url));
  state.root.remove();document.body.classList.remove('pati-camera-active');
  state=null;
 };
 const startCamera=async()=>{
  if(!state)return;
  const current=state;
  stopCamera();
  try{
   if(native())await window.PatiyizNativeGallery.ensureCamera();
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Bu cihaz kamera önizlemesini desteklemiyor.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:current.facing},width:{ideal:1280},height:{ideal:1920}}});
   if(state!==current){stream.getTracks().forEach(t=>t.stop());return;}
   current.stream=stream;
   const video=current.root.querySelector('#pati-camera-live');
   video.srcObject=stream;video.hidden=false;
   video.play().catch(()=>{});
   current.root.querySelector('#pati-camera-camera-fallback').hidden=true;
  }catch(e){
   if(state===current){
    current.root.querySelector('#pati-camera-camera-fallback').hidden=false;
    showMessage('Kamera izni gerekli. Galeriyi açabilir veya kamerayı tekrar deneyebilirsin.');
   }
  }
 };
 const renderSelected=()=>{
  if(!state)return;
  const img=state.root.querySelector('#pati-camera-chosen-image');
  const live=state.root.querySelector('#pati-camera-live');
  if(state.selected.length){
   img.hidden=false;img.src=state.urls[state.urls.length-1];
   live.hidden=true;
   state.root.querySelector('#pati-camera-selected-count').textContent=state.selected.length+' fotoğraf seçildi';
   state.root.querySelector('#pati-camera-publish').disabled=false;
  }else{
   img.hidden=true;live.hidden=false;
   state.root.querySelector('#pati-camera-selected-count').textContent='Fotoğraf çek veya galeriden seç';
   state.root.querySelector('#pati-camera-publish').disabled=true;
  }
 };
 const accept=async file=>{
  if(!state||state.selected.length>=10)return;
  if(!file||!file.type.startsWith('image/')){showMessage('Yalnızca fotoğraf seçebilirsin.');return;}
  state.selected.push(file);const u=urlFor(file);state.urls.push(u);
  state.root.querySelector('#pati-camera-gallery-panel').hidden=true;
  renderSelected();
  try{state.onPhotos([...state.selected]);}catch(e){showMessage('Fotoğraf eklenemedi.');}
 };
 const capture=async()=>{
  if(!state)return;
  const v=state.root.querySelector('#pati-camera-live');
  if(!state.stream||!v.videoWidth){showMessage('Kamera henüz hazır değil.');return;}
  const width=Math.min(v.videoWidth,1600);
  const height=Math.round(width*v.videoHeight/v.videoWidth);
  const cv=document.createElement('canvas');cv.width=width;cv.height=height;
  cv.getContext('2d').drawImage(v,0,0,width,height);
  const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/jpeg',.9));
  if(blob)await accept(new File([blob],'patiyiz-kamera-'+Date.now()+'.jpg',{type:'image/jpeg'}));
 };
 const galleryFallback=()=>{
  if(!state)return;
  state.root.querySelector('#pati-camera-file-fallback').click();
 };
 const loadGallery=async()=>{
  if(!state||state.loading||!native())return;
  const current=state;current.loading=true;
  const hint=current.root.querySelector('#pati-camera-gallery-state');
  hint.textContent='Fotoğraflar yükleniyor…';
  try{
   const r=await window.PatiyizNativeGallery.getPhotos({offset:current.offset,limit:36});
   if(state!==current)return;
   const grid=current.root.querySelector('#pati-camera-gallery-grid');
   for(const photo of r.photos||[]){
    const b=document.createElement('button');b.type='button';
    b.className='pati-camera-grid-cell';b.dataset.photoId=photo.id;
    b.setAttribute('aria-label','Galeriden fotoğraf seç');
    const img=document.createElement('img');img.src=photo.thumbnail;img.alt='';img.loading='lazy';
    b.appendChild(img);grid.appendChild(b);
   }
   current.offset+=(r.photos||[]).length;
   current.more=!!r.hasMore&&(r.photos||[]).length>0;
   hint.textContent=current.offset?current.offset+' fotoğraf · '+(current.more?'Aşağı kaydırarak devam et':'Tüm fotoğraflar yüklendi'):'Galeride fotoğraf bulunamadı.';
   if(current.offset===1)current.root.querySelector('#pati-camera-gallery-thumb').src=r.photos[0].thumbnail;
  }catch(e){
   if(state===current){hint.textContent='Galeriye erişilemedi. Sistem galerisiyle devam edebilirsin.';current.root.querySelector('#pati-camera-gallery-fallback').hidden=false;}
  }finally{if(state===current)current.loading=false;}
 };
 const toggleGallery=async()=>{
  if(!state)return;
  if(!native()){galleryFallback();return;}
  const panel=state.root.querySelector('#pati-camera-gallery-panel');
  panel.hidden=!panel.hidden;
  if(!panel.hidden&&!state.offset)await loadGallery();
 };
 const open=({onPhotos,onPublish,onCancel}={})=>{
  if(state)return;
  if(typeof onPhotos!=='function'||typeof onPublish!=='function')throw Error('Kamera akışı paylaşım formuna bağlanmalı.');
  const root=document.createElement('section');
  root.id='patiyiz-camera-screen';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Patiyiz yeni fotoğraf paylaşımı');
  root.innerHTML='<header class="pati-camera-head"><button type="button" data-camera="cancel" aria-label="Geri">×</button><strong>Yeni gönderi</strong><span>patiyiz</span></header>'+
   '<div class="pati-camera-stage"><video id="pati-camera-live" autoplay playsinline muted></video><img id="pati-camera-chosen-image" alt="Paylaşacağın fotoğraf" hidden><div class="pati-camera-unavailable" id="pati-camera-camera-fallback" hidden><strong>Kamerana erişilemiyor</strong><button type="button" data-camera="retry">Kamerayı aç</button></div></div>'+
   '<div id="pati-camera-alert" class="pati-camera-alert" role="status" hidden></div>'+
   '<section id="pati-camera-gallery-panel" class="pati-camera-gallery-panel" hidden><div class="pati-camera-gallery-title"><strong>Fotoğraflarım</strong><button type="button" data-camera="toggle">⌄ Kapat</button></div><div class="pati-camera-gallery-scroll"><div id="pati-camera-gallery-grid" class="pati-camera-gallery-grid"></div><p id="pati-camera-gallery-state">Fotoğraflar yükleniyor…</p><button id="pati-camera-gallery-fallback" data-camera="fallback" type="button" hidden>Sistem galerisinden seç</button><button type="button" data-camera="more">Daha fazla fotoğraf</button></div></section>'+
   '<div class="pati-camera-bottom"><div class="pati-camera-controls"><button data-camera="toggle" type="button" class="pati-camera-recent" aria-label="Galeriye git"><img id="pati-camera-gallery-thumb" alt="" src="patiyiz-app-icon-192.png"></button><button data-camera="shutter" type="button" class="pati-camera-shutter" aria-label="Fotoğraf çek"><span></span></button><button data-camera="flip" type="button" class="pati-camera-flip" aria-label="Kamerayı çevir">⟳</button></div><div id="pati-camera-selected-count" class="pati-camera-selected-count">Fotoğraf çek veya galeriden seç</div><textarea id="pati-camera-caption" maxlength="2000" rows="2" placeholder="Bir açıklama ekle…"></textarea><button type="button" id="pati-camera-publish" data-camera="publish" disabled>Paylaş</button></div><input id="pati-camera-file-fallback" type="file" accept="image/*,.heic,.heif" multiple hidden>';
  document.body.appendChild(root);document.body.classList.add('pati-camera-active');
  state={root,stream:null,facing:'environment',selected:[],urls:[],offset:0,more:false,loading:false,onPhotos,onPublish,onCancel,publishing:false};
  root.addEventListener('click',async e=>{
   const b=e.target.closest('[data-camera]');if(!b||!state)return;
   const action=b.dataset.camera;
   if(action==='cancel'){const cb=state.onCancel;cleanup();cb?.();return;}
   if(action==='retry'){await startCamera();return;}
   if(action==='toggle'){await toggleGallery();return;}
   if(action==='fallback'){galleryFallback();return;}
   if(action==='more'){if(state.more)await loadGallery();return;}
   if(action==='shutter'){await capture();return;}
   if(action==='flip'){state.facing=state.facing==='environment'?'user':'environment';await startCamera();return;}
   if(action==='publish'){
    if(state.publishing||!state.selected.length)return;
    state.publishing=true;b.disabled=true;b.textContent='Yayınlanıyor…';
    try{await state.onPublish(state.root.querySelector('#pati-camera-caption').value);}
    catch(err){showMessage(err?.message||'Paylaşım hazırlanamadı.');state.publishing=false;b.disabled=false;b.textContent='Paylaş';}
   }
  });
  root.addEventListener('click',async e=>{
   const b=e.target.closest('[data-photo-id]');if(!b||!state)return;
   b.disabled=true;
   try{
    const photo=await window.PatiyizNativeGallery.readPhoto(b.dataset.photoId);
    await accept(bytesToFile(photo.base64,photo.name));
   }catch(err){showMessage(err?.message||'Fotoğraf açılamadı.');}finally{b.disabled=false;}
  });
  root.querySelector('#pati-camera-file-fallback').addEventListener('change',async e=>{
   const files=[...(e.target.files||[])].slice(0,10);
   for(const file of files){if(!state)break;await accept(file);}
   e.target.value='';
  });
  root.querySelector('.pati-camera-gallery-scroll').addEventListener('scroll',e=>{
   if(!state||!state.more||state.loading)return;
   const node=e.target;
   if(node.scrollTop+node.clientHeight>=node.scrollHeight-350)void loadGallery();
  });
  if(native()){
   window.PatiyizNativeGallery.getPhotos({offset:0,limit:1}).then(r=>{
    if(state&&r.photos?.length)state.root.querySelector('#pati-camera-gallery-thumb').src=r.photos[0].thumbnail;
   }).catch(()=>{});
  }
  void startCamera();
 };
 window.PatiyizCameraFlow={open,close:cleanup,get active(){return !!state;}};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state){const cb=state.onCancel;cleanup();cb?.();}});
})();
