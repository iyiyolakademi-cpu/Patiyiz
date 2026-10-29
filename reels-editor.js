/* Patiyiz Reels Studio — local-only video editor. No third-party upload service. */
(function(){
'use strict';
const FILTERS={
 original:'none',
 canli:'saturate(1.34) contrast(1.09)',
 sicak:'sepia(.22) saturate(1.22) contrast(1.05)',
 siyahbeyaz:'grayscale(1) contrast(1.12)',
 sinema:'contrast(1.22) saturate(.77) brightness(.92)'
};
// Balance sharper video with on-device CPU and the 50 MB storage quota.
const MAX_CLIPS=6,MAX_SECONDS=90,WIDTH=720,HEIGHT=1280,TARGET_FPS=30,MAX_EXPORT_BYTES=48*1024*1024;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const clean=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seconds=n=>Number(n||0).toFixed(1)+' sn';
let state=null;
function duration(clips){return clips.reduce((t,c)=>t+Math.max(0,c.end-c.start)/c.speed,0)}
function supportsExport(){
 const c=document.createElement('canvas');
 return !!(window.MediaRecorder&&c.captureStream&&window.requestAnimationFrame);
}
function bestMime(){
 for(const type of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/mp4','video/webm']){
  if(MediaRecorder.isTypeSupported(type))return type;
 }
 return '';
}
function clipHtml(c,i){
 return '<div class="prs-clip'+(state.selected===i?' active':'')+'" data-clip="'+i+'">'+
 '<button type="button" class="prs-pick" data-prs="select" data-index="'+i+'"><span class="prs-num">'+(i+1)+'</span><span>'+clean(c.file.name)+'</span><small>'+seconds((c.end-c.start)/c.speed)+'</small></button>'+
 '<div class="prs-clip-buttons"><button type="button" data-prs="up" data-index="'+i+'" aria-label="Öne al">↑</button><button type="button" data-prs="down" data-index="'+i+'" aria-label="Arkaya al">↓</button><button type="button" data-prs="remove" data-index="'+i+'" aria-label="Klibi kaldır">×</button></div></div>';
}
function controls(c){
 const disabled=!c?' disabled':'';
 return '<div class="prs-times"><label>Başlangıç (sn)<input data-prs-field="start" type="number" step=".1" min="0" max="'+(c?c.end.toFixed(1):'0')+'" value="'+(c?c.start.toFixed(1):'0')+'"'+disabled+'></label>'+
 '<label>Bitiş (sn)<input data-prs-field="end" type="number" step=".1" min="0" max="'+(c?c.duration.toFixed(1):'0')+'" value="'+(c?c.end.toFixed(1):'0')+'"'+disabled+'></label>'+
 '<label>Hız<select data-prs-field="speed"'+disabled+'>'+[.5,.75,1,1.25,1.5,2].map(n=>'<option value="'+n+'"'+(c?.speed===n?' selected':'')+'>'+n+'×</option>').join('')+'</select></label></div>';
}
function mount(form){
 dispose();
 const root=document.createElement('section');root.className='prs-studio';root.setAttribute('aria-label','Reels video stüdyosu');
 root.innerHTML='<div class="prs-head"><strong>✦ Reels Stüdyosu</strong><span>En fazla 6 klip · 90 saniye</span></div>'+
 '<div class="prs-screen"><video class="prs-preview" playsinline controls preload="metadata"></video><div class="prs-overlay"></div></div>'+
 '<div class="prs-clip-list" aria-label="Video klipleri"></div>'+
 '<div class="prs-current">Video seçerek başla</div>'+
 '<div class="prs-trim"></div><div class="prs-global">'+
 '<label>Filtre<select data-prs-global="filter"><option value="original">Orijinal</option><option value="canli">Canlı</option><option value="sicak">Sıcak</option><option value="siyahbeyaz">Siyah beyaz</option><option value="sinema">Sinema</option></select></label>'+
 '<label>Geçiş<select data-prs-global="transition"><option value="cut">Doğrudan kes</option><option value="fade">Yumuşak geçiş</option></select></label>'+
 '<label>Video üzerindeki yazı<input data-prs-global="overlay" maxlength="80" placeholder="Örneğin: Birlikte büyüyoruz 🐾"></label>'+
 '<label>Yazının konumu<select data-prs-global="position"><option value="bottom">Alt</option><option value="center">Orta</option><option value="top">Üst</option></select></label>'+
 '<label class="prs-mute"><input type="checkbox" data-prs-global="mute"> Videonun sesini kaldır</label></div>'+
 '<div class="prs-feedback" role="status">Düzenleme cihazında yapılır; videon yalnızca paylaşırken yüklenir.</div>';
 const anchor=form.querySelector('.pati-reels-editor')||form.querySelector('.pati-compose-media');
 if(anchor)anchor.insertAdjacentElement('afterend',root);else form.querySelector('.modal-content')?.appendChild(root);
 state={root,form,clips:[],selected:0,token:0,pending:Promise.resolve(),filter:'original',transition:'cut',overlay:'',position:'bottom',mute:false,exporting:false};
 root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('input',onInput);
 render();
 return root;
}
function get(){return state}
function dispose(){
 if(!state)return;
 state.token++;
 for(const c of state.clips){try{c.video.pause();c.video.removeAttribute('src');c.video.load()}catch(_){ }URL.revokeObjectURL(c.url)}
 const display=state.root.querySelector('.prs-preview');if(display){display.pause();display.removeAttribute('src');display.load()}
 state.root.remove();state=null;
}
function readMetadata(video,file){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{cleanup();reject(Error('Videonun süresi okunamadı. MP4 veya WebM deneyin.'))},12000);
  function cleanup(){clearTimeout(timer);video.removeEventListener('loadedmetadata',ready);video.removeEventListener('error',error)}
  function ready(){cleanup();const n=video.duration;if(!Number.isFinite(n)||n<=0)return reject(Error(file.name+': Süresi okunamadı.'));resolve(n)}
  function error(){cleanup();reject(Error(file.name+': Bu video tarayıcıda oynatılamıyor.'))}
  video.addEventListener('loadedmetadata',ready);video.addEventListener('error',error);video.load();
 });
}
async function setFiles(files){
 if(!state)return;
 const context=state,token=++context.token;
 for(const c of context.clips){try{c.video.pause()}catch(_){ }URL.revokeObjectURL(c.url)}
 context.clips=[];context.selected=0;render();setStatus('Videolar hazırlanıyor…');
 const chosen=Array.from(files||[]).filter(x=>x&&x.size);
 if(chosen.length>MAX_CLIPS){setStatus('En fazla '+MAX_CLIPS+' video seçebilirsin.',true);throw Error('En fazla '+MAX_CLIPS+' video seçebilirsin.')}
 const work=(async()=>{
  const ready=[];
  try{
   for(const file of chosen){
    if(!/^video\//.test(file.type)&&!/\.(mp4|mov|webm)$/i.test(file.name))throw Error('Yalnızca video seçebilirsin.');
    const url=URL.createObjectURL(file),video=document.createElement('video');
    video.preload='metadata';video.playsInline=true;video.src=url;
    try{const len=await readMetadata(video,file);ready.push({file,url,video,duration:len,start:0,end:len,speed:1})}
    catch(e){URL.revokeObjectURL(url);throw e}
   }
   if(context!==state||token!==context.token){ready.forEach(c=>URL.revokeObjectURL(c.url));return}
   context.clips=ready;
   if(duration(ready)>MAX_SECONDS){let remaining=MAX_SECONDS,keep=[];for(const c of ready){if(remaining<.2){URL.revokeObjectURL(c.url);continue}c.end=Math.min(c.duration,remaining);remaining-=c.end;if(c.end>=.2)keep.push(c);else URL.revokeObjectURL(c.url)}context.clips=keep}
   setStatus(ready.length+' klip hazır. Başlangıç ve bitişi seçerek düzenleyebilirsin.');
   render();
  }catch(e){ready.forEach(c=>URL.revokeObjectURL(c.url));if(context===state&&token===context.token){context.clips=[];render();setStatus(e.message,true)}throw e}
 })();
 context.pending=work;await work;
}
function setStatus(text,error=false){const el=state?.root.querySelector('.prs-feedback');if(el){el.textContent=text;el.classList.toggle('error',error)}}
function render(){
 const s=state;if(!s)return;
 const active=s.clips[s.selected];
 const list=s.root.querySelector('.prs-clip-list');list.innerHTML=s.clips.map(clipHtml).join('')||'<p class="prs-empty">Galeriden bir veya birkaç video seç.</p>';
 s.root.querySelector('.prs-current').textContent=active?'Klip '+(s.selected+1)+' · '+seconds(duration(s.clips))+' / '+MAX_SECONDS+' sn':'Video seçilmedi';
 s.root.querySelector('.prs-trim').innerHTML=controls(active);
 const preview=s.root.querySelector('.prs-preview');
 if(active){if(preview.src!==active.url)preview.src=active.url;preview.playbackRate=active.speed;preview.style.filter=FILTERS[s.filter];if(preview.readyState>0){try{preview.currentTime=active.start}catch(_){}}}
 else{preview.removeAttribute('src');preview.load()}
 s.root.querySelector('.prs-overlay').textContent=s.overlay;
 s.root.querySelector('.prs-overlay').dataset.position=s.position;
}
function updatePreview(){
 if(!state)return;const video=state.root.querySelector('.prs-preview');
 video.style.filter=FILTERS[state.filter];
 state.root.querySelector('.prs-overlay').textContent=state.overlay;
 state.root.querySelector('.prs-overlay').dataset.position=state.position;
}
function onClick(e){
 const b=e.target.closest('[data-prs]');if(!b||!state||state.exporting)return;
 const act=b.dataset.prs,i=Number(b.dataset.index);if(!Number.isInteger(i)||i<0||i>=state.clips.length)return;
 const s=state;
 if(act==='select')s.selected=i;
 if(act==='up'&&i>0){[s.clips[i-1],s.clips[i]]=[s.clips[i],s.clips[i-1]];s.selected=i-1}
 if(act==='down'&&i<s.clips.length-1){[s.clips[i+1],s.clips[i]]=[s.clips[i],s.clips[i+1]];s.selected=i+1}
 if(act==='remove'){const [clip]=s.clips.splice(i,1);clip.video.pause();URL.revokeObjectURL(clip.url);s.selected=Math.max(0,Math.min(s.selected,s.clips.length-1))}
 render();
}
function onInput(e){
 if(!state||state.exporting)return;
 const field=e.target.dataset.prsGlobal;if(field==='overlay'){state.overlay=e.target.value.slice(0,80);updatePreview()}
}
function onChange(e){
 if(!state||state.exporting)return;
 const s=state,field=e.target.dataset.prsField,global=e.target.dataset.prsGlobal,c=s.clips[s.selected];
 if(global){
  if(global==='filter'&&Object.hasOwn(FILTERS,e.target.value))s.filter=e.target.value;
  if(global==='transition'&&['cut','fade'].includes(e.target.value))s.transition=e.target.value;
  if(global==='overlay')s.overlay=e.target.value.slice(0,80);
  if(global==='position'&&['top','center','bottom'].includes(e.target.value))s.position=e.target.value;
  if(global==='mute')s.mute=e.target.checked;
  updatePreview();return;
 }
 if(c&&field){
  if(field==='start')c.start=clamp(e.target.value,0,c.end-.2);
  if(field==='end')c.end=clamp(e.target.value,c.start+.2,c.duration);
  if(field==='speed')c.speed=clamp(e.target.value,.5,2);
  if(duration(s.clips)>MAX_SECONDS){setStatus('Toplam süre 90 saniyeyi geçemez. Süreleri kısalt.',true)}
  render();
 }
}
function needsRender(){
 const s=state;if(!s)return false;
 return s.clips.length>1||s.clips.some(c=>c.start>.01||c.end<c.duration-.01||c.speed!==1)||s.filter!=='original'||s.transition!=='cut'||!!s.overlay.trim()||s.mute;
}
function drawFrame(ctx,video,s,fadeCanvas,progress){
 const w=ctx.canvas.width,h=ctx.canvas.height;
 ctx.fillStyle='#101014';ctx.fillRect(0,0,w,h);
 const vw=video.videoWidth||w,vh=video.videoHeight||h;
 const factor=Math.max(w/vw,h/vh),cw=vw*factor,ch=vh*factor;
 ctx.save();ctx.filter=FILTERS[s.filter]||'none';
 if(video.readyState>=2)ctx.drawImage(video,(w-cw)/2,(h-ch)/2,cw,ch);
 ctx.restore();
 if(fadeCanvas&&progress<1){ctx.globalAlpha=1-progress;ctx.drawImage(fadeCanvas,0,0,w,h);ctx.globalAlpha=1}
 if(s.overlay.trim()){
  const font=Math.round(w*.057),text=s.overlay.trim();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 '+font+'px system-ui, sans-serif';
  ctx.lineJoin='round';ctx.lineWidth=8;ctx.strokeStyle='#000c';ctx.fillStyle='#fff';
  const chunks=text.match(/.{1,25}/gu)||[text];const lines=chunks.slice(0,4);
  const y0=s.position==='top'?h*.17:s.position==='center'?h*.46:h*.77;
  lines.forEach((line,i)=>{const y=y0+(i-(lines.length-1)/2)*font*1.28;ctx.strokeText(line,w/2,y,w*.92);ctx.fillText(line,w/2,y,w*.92)});
 }
}
function waitFrame(){return new Promise(resolve=>requestAnimationFrame(resolve))}
function seek(video,time){
 return new Promise((resolve,reject)=>{
  if(Math.abs(video.currentTime-time)<.025&&video.readyState>=2)return resolve();
  const timer=setTimeout(()=>{cleanup();reject(Error('Video ileri sarılamadı.'))},10000);
  function cleanup(){clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('error',error)}
  function done(){cleanup();resolve()}function error(){cleanup();reject(Error('Video okunamadı.'))}
  video.addEventListener('seeked',done);video.addEventListener('error',error);video.currentTime=time;
 });
}
async function exportVideo(progress){
 const s=state;if(!s)throw Error('Reels editörü bulunamadı.');
 await s.pending;
 if(!s.clips.length)throw Error('Önce en az bir video seç.');
 if(duration(s.clips)>MAX_SECONDS+.05)throw Error('Reels en fazla '+MAX_SECONDS+' saniye olabilir. Klipleri kısalt.');
 if(!needsRender()&&s.clips.length===1)return s.clips[0].file;
 if(!supportsExport()||!bestMime())throw Error('Tarayıcın düzenlenmiş video oluşturmayı desteklemiyor. Güncel Chrome veya Android tarayıcısını dene.');
 if(s.exporting)throw Error('Video hazırlanıyor.');
 const snapshot={clips:s.clips.map(c=>({...c,video:null})),filter:s.filter,transition:s.transition,overlay:s.overlay,position:s.position,mute:s.mute};
 s.exporting=true;
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx){s.exporting=false;throw Error('Video düzenleme için grafik desteği yok.')}
 if(snapshot.filter!=='original'&&!('filter' in ctx)){s.exporting=false;throw Error('Bu tarayıcı filtre uygulanmış video kaydetmeyi desteklemiyor. Orijinal filtre seç.')}
 let recorder,audioContext,audioDest,stream,composite,stopResult,fail,recs=[];
 const total=duration(snapshot.clips);let elapsed=0,transitionFrame=null;
 try{
  for(const clip of snapshot.clips){const video=document.createElement('video');video.playsInline=true;video.preload='auto';video.src=clip.url;clip.video=video;await readMetadata(video,clip.file)}
  stream=canvas.captureStream(TARGET_FPS);
  if(!snapshot.mute){
   const AudioContext=window.AudioContext||window.webkitAudioContext;
   if(!AudioContext)throw Error('Bu tarayıcı sesli video birleştirmeyi desteklemiyor. Sesi kaldır seçeneğini kullanabilir veya başka tarayıcı deneyebilirsin.');
   audioContext=new AudioContext();audioDest=audioContext.createMediaStreamDestination();
   for(const clip of snapshot.clips){
    const node=audioContext.createMediaElementSource(clip.video);
    node.connect(audioDest);
   }
   await audioContext.resume();
  }
  composite=new MediaStream([...stream.getVideoTracks(),...(audioDest?audioDest.stream.getAudioTracks():[])]);
  const mime=bestMime();
  const targetVideoBps=Math.max(900000,Math.min(3000000,Math.floor(MAX_EXPORT_BYTES*8/Math.max(total,1))-128000));
  recorder=new MediaRecorder(composite,{mimeType:mime,videoBitsPerSecond:targetVideoBps,audioBitsPerSecond:96000});
  stopResult=new Promise((resolve,reject)=>{recorder.addEventListener('dataavailable',e=>{if(e.data?.size)recs.push(e.data)});recorder.addEventListener('stop',resolve,{once:true});recorder.addEventListener('error',()=>reject(Error('Video kodlama başarısız.')),{once:true})});
  recorder.start(500);
  for(let i=0;i<snapshot.clips.length;i++){
   const clip=snapshot.clips[i],v=clip.video;
   await seek(v,clip.start);v.playbackRate=clip.speed;v.muted=!!snapshot.mute;
   if(!snapshot.mute&&!audioContext)throw Error('Ses oluşturulamadı.');
   await v.play().catch(()=>{throw Error('Video oynatılamadı; tarayıcı video düzenlemeye izin vermiyor.')});
   const startWall=performance.now();let rendered=0;
   while(v.currentTime<clip.end-.02){
    if(!state||state!==s)throw Error('Düzenleme iptal edildi.');
    const secondsPlayed=Math.max(0,(v.currentTime-clip.start)/clip.speed);
    const alpha=transitionFrame&&snapshot.transition==='fade'?Math.min(1,secondsPlayed/.3):1;
    drawFrame(ctx,v,snapshot,transitionFrame,alpha);
    rendered++;if(progress&&rendered%12===0)progress(Math.min(98,Math.round((elapsed+secondsPlayed)*100/total)));
    if(performance.now()-startWall>Math.max(13000,(clip.end-clip.start)/clip.speed*3400))throw Error('Video işleme zaman aşımına uğradı. Daha kısa video deneyin.');
    if(v.ended)break;
    await waitFrame();
   }
   drawFrame(ctx,v,snapshot,null,1);v.pause();
   elapsed+=(clip.end-clip.start)/clip.speed;
   if(snapshot.transition==='fade'){
    transitionFrame=document.createElement('canvas');transitionFrame.width=WIDTH;transitionFrame.height=HEIGHT;
    transitionFrame.getContext('2d').drawImage(canvas,0,0);
   }else transitionFrame=null;
  }
  await waitFrame();recorder.stop();await stopResult;
  const type=recorder.mimeType?.split(';')[0]||'video/webm';
  const blob=new Blob(recs,{type});
  if(!blob.size)throw Error('Düzenlenmiş video oluşturulamadı.');
  if(blob.size>MAX_EXPORT_BYTES)throw Error('Düzenlenen video 48 MB sınırını aştı; süreyi kısalt veya daha az klip kullan.');
  progress?.(100);
  return new File([blob],'patiyiz-reels-'+Date.now()+(type==='video/mp4'?'.mp4':'.webm'),{type});
 }catch(e){if(recorder?.state==='recording'){recorder.stop();try{await stopResult}catch(_){}}throw e}
 finally{
  snapshot.clips.forEach(c=>{if(c.video){c.video.pause();c.video.removeAttribute('src');c.video.load()}});
  composite?.getTracks().forEach(t=>t.stop());stream?.getTracks().forEach(t=>t.stop());
  if(audioContext)try{await audioContext.close()}catch(_){}
  s.exporting=false;
 }
}
window.PatiyizReelsEditor={mount,setFiles,exportVideo,dispose,needsRender,get,filters:FILTERS,MAX_CLIPS,MAX_SECONDS};
})();
