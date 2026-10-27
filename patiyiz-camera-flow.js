/* Patiyiz camera-first composer — post, story and Reels share one entry point.
 * User permission is required for camera and gallery access. Browser photo libraries
 * are opened through their native picker; Android MediaStore thumbnails are permission-gated.
 */
(function(){
'use strict';
let state=null;
const native=()=>!!window.PatiyizNativeGallery;
const isVideo=f=>!!f&&(/^video\//.test(f.type||'')||/\.(mp4|mov|webm|m4v)$/i.test(f.name||''));
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
// Post is square; Stories and Reels have a 9:16 portrait camera.
const targetFrame=mode=>mode==='post'?{w:1080,h:1080}:{w:1080,h:1920};
function drawCameraFrame(ctx,video,width,height,selfie){
 const vw=video.videoWidth||width,vh=video.videoHeight||height;
 // A front-facing selfie should show more of the subject instead of forcing
 // another digital zoom to fill the post square.
 const scale=selfie?Math.min(width/vw,height/vh):Math.max(width/vw,height/vh);
 const dw=vw*scale,dh=vh*scale;
 ctx.fillStyle='#090a0e';ctx.fillRect(0,0,width,height);
 ctx.save();
 if(selfie){ctx.translate(width,0);ctx.scale(-1,1)}
 ctx.drawImage(video,(width-dw)/2,(height-dh)/2,dw,dh);
 ctx.restore();
}

function showMessage(message){
 const el=state?.root.querySelector('#pati-camera-alert');
 if(el){el.textContent=String(message);el.hidden=false}
}
function stopCamera(){
 if(!state)return;
 state.stream?.getTracks().forEach(track=>track.stop());state.stream=null;
 const video=state.root.querySelector('#pati-camera-live');if(video)video.srcObject=null;
 if(state.previewFrame){cancelAnimationFrame(state.previewFrame);state.previewFrame=0}
}
function stopRecorder(){
 if(!state)return;
 if(state.recordLimitTimer){clearTimeout(state.recordLimitTimer);state.recordLimitTimer=null}
 if(state.recorder?.state==='recording')state.recorder.stop();
}
function cleanup(){
 if(!state)return;
 if(state.recordLimitTimer)clearTimeout(state.recordLimitTimer);
 if(state.recorder?.state==='recording')state.recorder.stop();
 state.recordStream?.getVideoTracks().forEach(t=>t.stop());state.recordStream=null;
 stopCamera();
 state.urls.forEach(u=>URL.revokeObjectURL(u));
 state.root.remove();document.body.classList.remove('pati-camera-active');state=null;
}
function renderSelected(){
 if(!state)return;
 const root=state.root,img=root.querySelector('#pati-camera-chosen-image');
 const clip=root.querySelector('#pati-camera-chosen-video'),live=root.querySelector('#pati-camera-live');
 const last=state.selected[state.selected.length-1],has=!!last,video=isVideo(last);
 img.hidden=!has||video;clip.hidden=!has||!video;live.hidden=has;
 if(has){if(video){clip.src=state.urls[state.urls.length-1];clip.load()}else{clip.pause();clip.removeAttribute('src');img.src=state.urls[state.urls.length-1]}}
 const text=!has?(state.captureType==='video'?'Video çek veya sol alttan galeriyi aç':'Fotoğraf çek veya sol alttan galeriyi aç'):
 video?'Video seçildi · Devam ederek paylaş':state.selected.length+' fotoğraf seçildi';
 root.querySelector('#pati-camera-selected-count').textContent=text;
 root.querySelector('#pati-camera-publish').disabled=!has;
}
async function startCamera(){
 if(!state)return;
 const current=state;stopCamera();
 try{
  if(native())await window.PatiyizNativeGallery.ensureCamera();
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Kamera desteklenmiyor.');
  const stream=await navigator.mediaDevices.getUserMedia({
   video:{facingMode:{ideal:current.facing},width:{ideal:1080},height:{ideal:1920},
    aspectRatio:{ideal:current.mode==='post'?1:9/16},resizeMode:'none'},
   audio:current.captureType==='video'
  });
  if(state!==current){stream.getTracks().forEach(t=>t.stop());return}
  current.stream=stream;
  // Some mobile cameras start with digital zoom enabled. Ask for the lowest
  // supported zoom; unsupported browsers keep their native lens field of view.
  if(current.facing==='user'){
   const track=stream.getVideoTracks()[0],cap=track?.getCapabilities?.();
   if(Number.isFinite(cap?.zoom?.min)&&cap.zoom.min>=0){
    try{await track.applyConstraints({advanced:[{zoom:cap.zoom.min}]})}catch(_){}
   }
  }
  current.root.classList.toggle('pati-camera-selfie',current.facing==='user');
  const video=current.root.querySelector('#pati-camera-live');
  video.srcObject=stream;video.hidden=current.selected.length>0;
  void video.play().catch(()=>{});
  current.root.querySelector('#pati-camera-camera-fallback').hidden=true;
 }catch(err){
  if(state===current){
   current.root.querySelector('#pati-camera-camera-fallback').hidden=false;
   showMessage('Kamera açılamadı. Kamera/mikrofon izni verebilir ya da sol alttan galeriyi seçebilirsin.');
  }
 }
}
function resetSelection(){
 if(!state)return;
 state.urls.forEach(u=>URL.revokeObjectURL(u));state.urls=[];state.selected=[];
 const v=state.root.querySelector('#pati-camera-chosen-video');
 v.pause();v.removeAttribute('src');v.load();
 state.root.querySelector('#pati-camera-chosen-image').removeAttribute('src');
 renderSelected();
}
async function accept(file){
 if(!state)return;
 if(!file?.size){showMessage('Dosya seçilemedi.');return}
 const video=isVideo(file);
 if(video&&file.size>200*1024*1024){showMessage('Video çok büyük. 200 MB altındaki bir video seçip sıkıştırmayı deneyebilirsin.');return}
 if(video&& !/^video\/(mp4|webm|quicktime)$/.test(file.type||'') && !/\.(mp4|mov|webm)$/i.test(file.name||'')){showMessage('MP4, MOV veya WebM videosu seç.');return}
 if(!video&&!(/^image\//.test(file.type||'')||/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name||''))){showMessage('Fotoğraf ya da video seçmelisin.');return}
 if(state.mode==='reels'&&!video){showMessage('Reels için video seç.');return}
 if(video){resetSelection();state.selected=[file]}
 else {
  if(state.selected.some(isVideo))resetSelection();
  if(state.selected.length>=(state.mode==='post'?10:1)){showMessage('En fazla '+(state.mode==='post'?10:1)+' fotoğraf seçebilirsin.');return}
  state.selected.push(file);
 }
 stopCamera();state.urls.push(urlFor(file));
 state.root.querySelector('#pati-camera-gallery-panel').hidden=true;
 state.root.querySelector('#pati-camera-alert').hidden=true;
 const selected=[...state.selected];
 try{
  if(typeof state.onMedia==='function')state.onMedia(selected,video?'video':'photo');
  else if(!video)state.onPhotos(selected);
 }catch(err){showMessage(err?.message||'Medya eklenemedi.');return}
 renderSelected();
}
async function capture(){
 if(!state)return;
 const v=state.root.querySelector('#pati-camera-live');
 if(!state.stream||!v.videoWidth){showMessage('Kamera henüz hazır değil.');return}
 const {w,h}=targetFrame(state.mode);
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;
 drawCameraFrame(cv.getContext('2d'),v,w,h,state.facing==='user');
 const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/jpeg',.88));
 if(blob)await accept(new File([blob],'patiyiz-kamera-'+Date.now()+'.jpg',{type:'image/jpeg'}));
}
function bestRecorderMime(){
 if(typeof MediaRecorder==='undefined')return '';
 for(const type of ['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp8,opus','video/webm']){
  if(MediaRecorder.isTypeSupported(type))return type;
 }
 return '';
}
function toggleRecord(){
 if(!state)return;
 const current=state,button=current.root.querySelector('#pati-camera-shutter');
 if(current.recorder?.state==='recording'){stopRecorder();return}
 if(!current.stream?.getVideoTracks().length){showMessage('Kameraya erişilemedi. Galeriden video seçebilirsin.');return}
 const mime=bestRecorderMime();
 if(!mime){current.root.querySelector('#pati-camera-video-fallback').click();return}
 try{
  const chunks=[];
  // Record the same square/portrait frame displayed to the user. Retain mic
  // audio tracks; older browsers fall back to the original camera stream.
  const {w,h}=targetFrame(current.mode);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});
  const canCapture=!!ctx&&typeof canvas.captureStream==='function'&&typeof requestAnimationFrame==='function';
  const output=canCapture?canvas.captureStream(24):current.stream;
  if(canCapture){
   current.recordStream=output;
   current.stream.getAudioTracks().forEach(track=>output.addTrack(track));
   const paint=()=>{if(state!==current||!current.recorder||current.recorder.state!=='recording')return;
    drawCameraFrame(ctx,current.root.querySelector('#pati-camera-live'),w,h,current.facing==='user');
    current.previewFrame=requestAnimationFrame(paint)};
   current.drawRecordedFrame=paint;
  }
  const recorder=new MediaRecorder(output,{mimeType:mime,videoBitsPerSecond:1600000,audioBitsPerSecond:96000});
  current.recorder=recorder;
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  recorder.onerror=()=>showMessage('Kayıt tamamlanamadı. Galeriden video seçebilirsin.');
  recorder.onstop=()=>{
   button.classList.remove('recording');
   if(current.previewFrame){cancelAnimationFrame(current.previewFrame);current.previewFrame=0}
   current.recordStream?.getVideoTracks().forEach(t=>t.stop());current.recordStream=null;
   if(state!==current)return;
   if(current.recordLimitTimer){clearTimeout(current.recordLimitTimer);current.recordLimitTimer=null}
   const blob=new Blob(chunks,{type:mime.split(';')[0]});
   current.recorder=null;
   if(blob.size){
    const ext=blob.type==='video/mp4'?'mp4':'webm';
    void accept(new File([blob],'patiyiz-kamera-'+Date.now()+'.'+ext,{type:blob.type}));
   }else showMessage('Video kaydedilemedi. Tekrar dene.');
  };
  recorder.start(1000);button.classList.add('recording');
  current.drawRecordedFrame?.();
  const maxSeconds=current.mode==='reels'?90:current.mode==='story'?120:180;
  current.recordLimitTimer=setTimeout(()=>{if(state===current)stopRecorder()},maxSeconds*1000);
  showMessage('Kayıt başladı. Durdurmak için kırmızı düğmeye yeniden dokun.');
 }catch(err){showMessage('Video kaydı kullanılamıyor. Galeriden veya cihaz kamerasından video seçebilirsin.')}
}
function galleryFallback(kind){
 if(!state)return;
 const current=state;
 if(kind==='video'||current.mode==='reels')current.root.querySelector('#pati-camera-video-fallback').click();
 else current.root.querySelector('#pati-camera-file-fallback').click();
}
async function loadGallery(){
 if(!state||state.loading||!native())return;
 const current=state;current.loading=true;
 const hint=current.root.querySelector('#pati-camera-gallery-state');hint.textContent='Fotoğraflar yükleniyor…';
 try{
  const r=await window.PatiyizNativeGallery.getPhotos({offset:current.offset,limit:36});
  if(state!==current)return;
  const grid=current.root.querySelector('#pati-camera-gallery-grid');
  for(const photo of r.photos||[]){
   const b=document.createElement('button');b.type='button';b.className='pati-camera-grid-cell';
   b.dataset.photoId=photo.id;b.setAttribute('aria-label','Galeriden fotoğraf seç');
   const img=document.createElement('img');img.src=photo.thumbnail;img.alt='';img.loading='lazy';
   b.appendChild(img);grid.appendChild(b);
  }
  current.offset+=(r.photos||[]).length;
  current.more=!!r.hasMore&&(r.photos||[]).length>0;
  hint.textContent=current.offset?current.offset+' fotoğraf · '+(current.more?'Aşağı kaydırarak devam et':'Tüm fotoğraflar yüklendi'):'Galeride fotoğraf bulunamadı.';
  if(current.offset===1&&r.photos?.[0])current.root.querySelector('#pati-camera-gallery-thumb').src=r.photos[0].thumbnail;
 }catch(err){
  if(state===current){hint.textContent='Galeri izni verilemedi. Sistem galerisiyle devam et.';current.root.querySelector('#pati-camera-gallery-fallback').hidden=false}
 }finally{if(state===current)current.loading=false}
}
async function toggleGallery(){
 if(!state)return;
 if(state.mode==='reels'){galleryFallback('video');return}
 if(!native()){galleryFallback('photo');return}
 const panel=state.root.querySelector('#pati-camera-gallery-panel');
 panel.hidden=!panel.hidden;
 if(!panel.hidden&&!state.offset)await loadGallery();
}
function setCaptureType(type){
 if(!state||state.mode==='reels'&&type!=='video'||!['video','photo'].includes(type))return;
 if(state.recorder?.state==='recording')return;
 if(state.captureType===type)return;
 state.captureType=type;
 state.root.querySelector('#pati-camera-shutter').classList.toggle('video-mode',type==='video');
 state.root.querySelectorAll('[data-camera-mode]').forEach(x=>{
  const selected=x.dataset.cameraMode===type;x.classList.toggle('active',selected);x.setAttribute('aria-pressed',String(selected))
 });
 resetSelection();void startCamera();
}
function open({mode='post',onMedia,onPhotos,onPublish,onCancel,onEdit}={}){
 if(state)return;
 if(!['post','story','reels'].includes(mode))mode='post';
 if((typeof onMedia!=='function'&&typeof onPhotos!=='function')||typeof onPublish!=='function')throw Error('Kamera paylaşım formuna bağlanmalı.');
 const reel=mode==='reels',title=reel?'Yeni Reels':mode==='story'?'Yeni hikâye':'Yeni gönderi';
 const root=document.createElement('section');
 root.id='patiyiz-camera-screen';root.setAttribute('role','dialog');
 root.setAttribute('aria-modal','true');root.setAttribute('aria-label',title);
 root.innerHTML='<header class="pati-camera-head"><button type="button" data-camera="cancel" aria-label="Geri">×</button><strong>'+title+'</strong><span>patiyiz</span></header>'+
 '<div class="pati-camera-stage"><div class="pati-camera-viewfinder"><video id="pati-camera-live" autoplay playsinline muted></video><img id="pati-camera-chosen-image" alt="Seçilen fotoğraf" hidden><video id="pati-camera-chosen-video" playsinline controls preload="metadata" hidden></video><div class="pati-camera-unavailable" id="pati-camera-camera-fallback" hidden><strong>Kamerana erişilemiyor</strong><button type="button" data-camera="retry">Kamerayı yeniden aç</button></div></div></div>'+
 '<div id="pati-camera-alert" class="pati-camera-alert" role="status" hidden></div>'+
 '<section id="pati-camera-gallery-panel" class="pati-camera-gallery-panel" hidden><div class="pati-camera-gallery-title"><strong>Fotoğraflarım</strong><button type="button" data-camera="toggle">⌄ Kapat</button></div><div class="pati-camera-gallery-scroll"><div id="pati-camera-gallery-grid" class="pati-camera-gallery-grid"></div><p id="pati-camera-gallery-state">Fotoğraflar yükleniyor…</p><button id="pati-camera-gallery-fallback" data-camera="fallback" type="button" hidden>Sistem galerisinden seç</button><button type="button" data-camera="video-gallery">Videoları aç</button><button type="button" data-camera="more">Daha fazla fotoğraf</button></div></section>'+
 '<div class="pati-camera-bottom">'+(reel?'':'<div class="pati-camera-modes"><button type="button" data-camera-mode="photo" data-camera="mode" class="active" aria-pressed="true">Fotoğraf</button><button type="button" data-camera-mode="video" data-camera="mode" aria-pressed="false">Video</button></div>')+
 '<div class="pati-camera-controls"><button data-camera="toggle" type="button" class="pati-camera-recent" aria-label="Tüm fotoğraf ve videoları gör"><img id="pati-camera-gallery-thumb" alt="" src="patiyiz-app-icon-192.png"></button><button data-camera="shutter" type="button" id="pati-camera-shutter" class="pati-camera-shutter'+(reel?' video-mode':'')+'" aria-label="'+(reel?'Video kaydet':'Fotoğraf çek')+'"><span></span></button><button data-camera="flip" type="button" class="pati-camera-flip" aria-label="Kamerayı çevir">⟳</button></div>'+
 '<div id="pati-camera-selected-count" class="pati-camera-selected-count">Fotoğraf çek veya galeriden seç</div><textarea id="pati-camera-caption" maxlength="2000" rows="2" placeholder="Bir açıklama ekle…"></textarea>'+
 '<div class="pati-camera-actions"><button type="button" id="pati-camera-publish" data-camera="publish" disabled>Paylaş</button></div></div>'+
 '<input id="pati-camera-file-fallback" type="file" accept="image/*,video/*,.mov,.heic,.heif" '+(mode==='post'?'multiple':'')+' hidden>'+
 '<input id="pati-camera-video-fallback" type="file" accept="video/mp4,video/webm,video/quicktime,video/*,.mov" hidden>';
 document.body.appendChild(root);document.body.classList.add('pati-camera-active');
 state={root,stream:null,recordStream:null,previewFrame:0,recorder:null,recordLimitTimer:null,mode,captureType:reel?'video':'photo',facing:'user',selected:[],urls:[],offset:0,more:false,loading:false,onMedia,onPhotos,onPublish,onCancel,publishing:false};
 root.dataset.captureAspect=mode==='post'?'square':'portrait';
 const current=state;
 root.addEventListener('click',async e=>{
  const b=e.target.closest('[data-camera]');if(!b||state!==current)return;
  const action=b.dataset.camera;
  if(action==='cancel'){const cb=state.onCancel;cleanup();cb?.();return}
  if(action==='retry'){await startCamera();return}
  if(action==='toggle'){await toggleGallery();return}
  if(action==='fallback'){galleryFallback('photo');return}
  if(action==='video-gallery'){galleryFallback('video');return}
  if(action==='more'){if(state.more)await loadGallery();return}
  if(action==='mode'){setCaptureType(b.dataset.cameraMode);return}
  if(action==='shutter'){if(state.captureType==='video')toggleRecord();else await capture();return}
  if(action==='flip'){state.facing=state.facing==='environment'?'user':'environment';await startCamera();return}
  if(action==='publish'){
   if(state.publishing||!state.selected.length||state.recorder?.state==='recording')return;
   state.publishing=true;b.disabled=true;b.textContent='Paylaşım hazırlanıyor…';
   try{await state.onPublish(state.root.querySelector('#pati-camera-caption').value)}
   catch(err){if(state===current){showMessage(err?.message||'Paylaşım hazırlanamadı.');state.publishing=false;b.disabled=false;b.textContent='Paylaş'}}
  }
 });
 root.addEventListener('click',async e=>{
  const b=e.target.closest('[data-photo-id]');if(!b||state!==current)return;
  b.disabled=true;
  try{const photo=await window.PatiyizNativeGallery.readPhoto(b.dataset.photoId);await accept(bytesToFile(photo.base64,photo.name))}
  catch(err){showMessage(err?.message||'Fotoğraf açılamadı.')}finally{b.disabled=false}
 });
 root.querySelector('#pati-camera-file-fallback').addEventListener('change',async e=>{
  const files=[...(e.target.files||[])].slice(0,mode==='post'?10:1);
  for(const file of files){if(state!==current)break;await accept(file)}
  e.target.value='';
 });
 root.querySelector('#pati-camera-video-fallback').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(file&&state===current)await accept(file);e.target.value='';
 });
 root.querySelector('.pati-camera-gallery-scroll').addEventListener('scroll',e=>{
  if(state!==current||!state.more||state.loading)return;
  const el=e.target;if(el.scrollTop+el.clientHeight>=el.scrollHeight-350)void loadGallery();
 });
 if(native()){
  window.PatiyizNativeGallery.getPhotos({offset:0,limit:1,previewOnly:true}).then(r=>{
   if(state===current&&r.photos?.length)state.root.querySelector('#pati-camera-gallery-thumb').src=r.photos[0].thumbnail;
  }).catch(()=>{});
 }
 void startCamera();
}
window.PatiyizCameraFlow={open,close:cleanup,cancel(){if(!state)return;const cb=state.onCancel;cleanup();cb?.()},get active(){return !!state}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state){const cb=state.onCancel;cleanup();cb?.()}});
})();