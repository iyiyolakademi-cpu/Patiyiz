/* Patiyiz • Reels cover selection.
   Image uploads remain local until the existing authenticated publish flow.
   Video-frame captures use canvas on the user's device. */
(()=>{
 'use strict';
 let active=null;
 const q=(root,selector)=>root?.querySelector(selector);
 const msg=(state,content,error=false)=>{
  const el=q(state.form,'.pati-cover-message');
  if(el){el.textContent=content;el.classList.toggle('is-error',!!error)}
 };
 const revoke=(value)=>{if(value)try{URL.revokeObjectURL(value)}catch(_){ }};
 function dispose(){
  if(!active)return;
  active.token++;
  const v=q(active.form,'.pati-reel-cover-player');
  if(v){v.pause();v.removeAttribute('src');v.load()}
  revoke(active.videoUrl);revoke(active.photoUrl);
  if(active.frame)revoke(active.frame.url);
  active=null;
 }
 function get(form){
  if(!form||form.dataset.mode!=='reels'||!q(form,'[data-pati-cover-root]'))return null;
  if(active?.form===form)return active;
  dispose();
  active={form,file:null,videoUrl:'',photoUrl:'',mode:'auto',frame:null,token:0,pending:null,time:0};
  syncVideo(active);
  return active;
 }
 function selected(state,mode){
  state.mode=mode;
  const root=q(state.form,'[data-pati-cover-root]');
  root.dataset.coverMode=mode;
  for(const button of root.querySelectorAll('[data-pati-cover-action="frame"],[data-pati-cover-action="gallery"]')){
   button.setAttribute('aria-pressed',String(button.dataset.patiCoverAction===mode));
  }
  const pane=q(root,'.pati-reel-cover-frame-panel');
  if(pane)pane.hidden=mode!=='frame';
  if(mode==='frame')syncVideo(state);
  updateVisual(state);
 }
 function syncVideo(state){
  if(state!==active)return;
  const file=q(state.form,'input[name="video"]')?.files?.[0]||null;
  if(file===state.file)return;
  state.token++;
  const v=q(state.form,'.pati-reel-cover-player');
  if(v){v.pause();v.removeAttribute('src');v.load()}
  revoke(state.videoUrl);state.videoUrl='';state.file=file;
  if(state.frame)revoke(state.frame.url);
  state.frame=null;state.pending=null;state.time=0;
  const range=q(state.form,'.pati-reel-cover-timeline');if(range)range.value='0';
  if(!file){
   msg(state,'Önce Reels videonu seç. Ardından kapağı belirleyebilirsin.');
   updateVisual(state);return;
  }
  state.videoUrl=URL.createObjectURL(file);
  if(v){v.src=state.videoUrl;v.muted=true;v.playsInline=true;v.preload='auto';v.load()}
  msg(state,'Galeriden bir görsel seçebilir veya video üzerinde kare belirleyebilirsin.');
  updateVisual(state);
 }
 function updateVisual(state){
  if(state!==active)return;
  const img=q(state.form,'.pati-reel-cover-image');
  const empty=q(state.form,'.pati-reel-cover-placeholder');
  if(!img||!empty)return;
  const photo=q(state.form,'input[name="cover_photo"]')?.files?.[0];
  const url=state.mode==='gallery'&&photo?.size?state.photoUrl:
             state.mode==='frame'&&state.frame?state.frame.url:'';
  img.hidden=!url;
  empty.hidden=!!url;
  if(url&&img.src!==url)img.src=url;
  if(!url)img.removeAttribute('src');
  empty.textContent=state.mode==='frame'?'Videodan kapak karesi seç':
                   state.mode==='gallery'?'Galeriden seçtiğin görsel burada görünecek':'Kapak önizlemesi';
 }
 async function capture(state){
  if(!state||state!==active||state.mode!=='frame')return null;
  syncVideo(state);
  const video=q(state.form,'.pati-reel-cover-player');
  if(!video?.videoWidth||!video?.videoHeight)return null;
  const token=++state.token,at=video.currentTime;
  const canvas=document.createElement('canvas');canvas.width=540;canvas.height=960;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  const srcW=video.videoWidth,srcH=video.videoHeight,ratio=9/16,actual=srcW/srcH;
  const w=actual>ratio?srcH*ratio:srcW,h=actual>ratio?srcH:srcW/ratio;
  try{ctx.drawImage(video,(srcW-w)/2,(srcH-h)/2,w,h,0,0,540,960)}
  catch(err){msg(state,'Bu video karesi okunamadı. Galeriden kapak seçebilirsin.',true);return null}
  const task=new Promise(resolve=>canvas.toBlob(blob=>{
   if(!blob?.size){resolve(null);return}
   resolve(new File([blob],'patiyiz-reels-kapak.jpg',{type:'image/jpeg'}));
  },'image/jpeg',.86));
  state.pending=task;
  const file=await task;
  if(active!==state||token!==state.token||state.mode!=='frame')return null;
  if(!file){msg(state,'Kapak karesi oluşturulamadı. Farklı bir kare dene.',true);return null}
  const url=URL.createObjectURL(file);
  if(state.frame)revoke(state.frame.url);
  state.frame={file,url,time:at};state.time=at;state.pending=null;
  updateVisual(state);
  msg(state,'Kapak karesi seçildi · '+at.toFixed(1)+' sn. Paylaşmadan önce değiştirebilirsin.');
  return file;
 }
 function revealFrame(state){
  syncVideo(state);
  const video=q(state.form,'.pati-reel-cover-player');
  if(!state.file?.size){msg(state,'Önce Reels için video seç.',true);return}
  selected(state,'frame');
  video?.pause();
  if(video?.readyState>=2)void capture(state);
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-pati-cover-action]');
  if(!button)return;
  const form=button.closest('#post-form');
  const state=get(form);if(!state)return;
  event.preventDefault();event.stopPropagation();
  const choice=button.dataset.patiCoverAction;
  if(choice==='gallery'){q(form,'input[name="cover_photo"]')?.click();return}
  if(choice==='frame'){revealFrame(state);return}
  if(choice==='play'){
   const video=q(form,'.pati-reel-cover-player');if(!video)return;
   if(video.paused)video.play().catch(()=>msg(state,'Video oynatılamadı. Zaman çubuğunu kullan.',true));
   else video.pause();
  }
 },true);
 document.addEventListener('change',event=>{
  const input=event.target;
  if(!input?.matches?.('#post-form input[name="cover_photo"],#post-form input[name="video"]'))return;
  const form=input.closest('#post-form'),state=get(form);if(!state)return;
  if(input.name==='video'){
   revoke(state.photoUrl);state.photoUrl='';
   const gallery=q(form,'input[name="cover_photo"]');if(gallery)gallery.value='';
   state.mode='auto';syncVideo(state);selected(state,'auto');return
  }
  const file=input.files?.[0];
  revoke(state.photoUrl);state.photoUrl='';
  if(!file){selected(state,'auto');return}
  if(!file.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name||'')){
   input.value='';msg(state,'Kapak için fotoğraf seçmelisin.',true);return;
  }
  if(file.size>20*1024*1024){
   input.value='';msg(state,'Kapak fotoğrafı en fazla 20 MB olabilir.',true);return;
  }
  state.photoUrl=URL.createObjectURL(file);selected(state,'gallery');
  msg(state,'Galeriden seçilen kapak hazır. İstersen videodan başka bir kare seç.');
 },true);
 document.addEventListener('input',event=>{
  const input=event.target;if(!input?.matches?.('#post-form .pati-reel-cover-timeline'))return;
  const state=get(input.closest('#post-form'));if(!state)return;
  revealFrame(state);
  const v=q(state.form,'.pati-reel-cover-player');
  if(!v||!Number.isFinite(v.duration)||v.duration<=0)return;
  const t=Math.min(Math.max(0,v.duration-.05),Number(input.value)/1000*v.duration);
  v.currentTime=Math.max(0,t);
  msg(state,'Kare seçiliyor · '+t.toFixed(1)+' sn');
 },true);
 document.addEventListener('change',event=>{
  const input=event.target;if(!input?.matches?.('#post-form .pati-reel-cover-timeline'))return;
  const state=get(input.closest('#post-form'));if(state)void capture(state);
 },true);
 document.addEventListener('loadeddata',event=>{
  const video=event.target;if(!video?.matches?.('#post-form .pati-reel-cover-player'))return;
  const state=get(video.closest('#post-form'));
  if(state?.mode==='frame')void capture(state);
 },true);
 document.addEventListener('seeked',event=>{
  const video=event.target;if(!video?.matches?.('#post-form .pati-reel-cover-player'))return;
  const state=get(video.closest('#post-form'));
  if(state?.mode==='frame')void capture(state);
 },true);
 document.addEventListener('pause',event=>{
  const video=event.target;if(!video?.matches?.('#post-form .pati-reel-cover-player'))return;
  const state=get(video.closest('#post-form'));if(state?.mode==='frame')void capture(state);
 },true);
 document.addEventListener('timeupdate',event=>{
  const video=event.target;if(!video?.matches?.('#post-form .pati-reel-cover-player'))return;
  const range=q(video.closest('#post-form'),'.pati-reel-cover-timeline');
  if(range&&Number.isFinite(video.duration)&&video.duration>0){
   range.value=String(Math.round(1000*video.currentTime/video.duration));
  }
 },true);
 async function getSelectedCover(form){
  const state=get(form);if(!state)return null;
  syncVideo(state);
  if(state.mode==='gallery'){
   const file=q(form,'input[name="cover_photo"]')?.files?.[0];
   if(!file?.size)throw Error('Kapak fotoğrafını yeniden seç.');
   return file;
  }
  if(state.mode==='frame'){
   const v=q(form,'.pati-reel-cover-player');if(!v?.videoWidth)throw Error('Video kapağı için video henüz hazır değil. Kısa süre sonra tekrar dene.');
   if(state.pending)await state.pending;
   const file=await capture(state);
   if(!file?.size)throw Error('Seçilen video karesi kapak olarak hazırlanamadı. Başka kare seç.');
   return file;
  }
  return null; // Default: the original automatic video thumbnail is retained.
 }
 window.PatiyizReelsCover={getSelectedCover,dispose};
})();