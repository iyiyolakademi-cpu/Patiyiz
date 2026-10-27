/* Private, on-device video preparation. Supabase Free cannot store objects >50MB.
 * Where browser codecs permit, reduce video locally and preserve its audio.
 * If unavailable, report the limitation instead of claiming an upload succeeded. */
(()=>{
 'use strict';
 const LIMIT=50*1024*1024,SAFE=48*1024*1024,MAX_SOURCE=500*1024*1024,MAX_DURATION=600;
 const chooseMime=()=>{
  if(typeof MediaRecorder==='undefined'||typeof MediaRecorder.isTypeSupported!=='function')return '';
  for(const mime of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm'])
   if(MediaRecorder.isTypeSupported(mime))return mime;
  return '';
 };
 function fail(message){return new Error(message||'Video dönüştürülemedi. Daha düşük çözünürlükte MP4 olarak kaydet.')}
 async function prepare(file,progress=()=>{}){
  if(!file?.size||file.size<=LIMIT)return file;
  if(file.size>MAX_SOURCE)throw fail('Video 500 MB üzerinde. Telefonda daha küçük MP4 olarak dışa aktar.');
  const mime=chooseMime();
  if(!mime||typeof document==='undefined'||typeof HTMLCanvasElement==='undefined'||!HTMLCanvasElement.prototype.captureStream)
   throw fail('Bu cihazda otomatik video sıkıştırma desteklenmiyor. Videoyu 720p MP4 olarak kaydet.');
  const url=URL.createObjectURL(file),video=document.createElement('video');
  let canvasStream=null,originalStream=null,context=null,recorder=null,raf=0,timeout=null,done=false;
  const close=()=>{
   done=true;if(raf)cancelAnimationFrame(raf);if(timeout)clearTimeout(timeout);
   if(recorder?.state==='recording')try{recorder.stop()}catch(_){}
   for(const stream of [canvasStream,originalStream])stream?.getTracks().forEach(t=>t.stop());
   video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);
   void context?.close?.().catch(()=>{});
  };
  try{
   video.playsInline=true;video.preload='metadata';video.src=url;
   progress('Video okunuyor…');
   await new Promise((resolve,reject)=>{
    timeout=setTimeout(()=>reject(fail('Video açılamadı. MP4 olarak kaydedip yeniden dene.')),20000);
    video.onloadedmetadata=()=>{clearTimeout(timeout);timeout=null;resolve()};
    video.onerror=()=>reject(fail('Video biçimi bu cihazda okunamadı.'));
    video.load();
   });
   const duration=video.duration;
   if(!Number.isFinite(duration)||duration<=0||duration>MAX_DURATION)
    throw fail('Otomatik sıkıştırma en fazla 10 dakikalık videoları destekliyor. Daha uzun videoyu kısalt.');
   const canvas=document.createElement('canvas');
   const ratio=Math.min(1,720/Math.max(1,video.videoWidth),1280/Math.max(1,video.videoHeight));
   canvas.width=Math.max(2,Math.round(video.videoWidth*ratio/2)*2);
   canvas.height=Math.max(2,Math.round(video.videoHeight*ratio/2)*2);
   const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw fail();
   canvasStream=canvas.captureStream(24);
   // Native media-element capture is not present on all iPhones. Web Audio
   // provides an optional audio path without uploading soundless "success".
   let audioTracks=[];
   if(typeof video.captureStream==='function'){
    try{originalStream=video.captureStream();audioTracks=originalStream.getAudioTracks().filter(t=>!t.muted)}catch(_){}
   }
   if(!audioTracks.length){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw fail('Bu iPhone videonun sesini koruyarak sıkıştıramıyor. 720p MP4 olarak dışa aktar.');
    context=new Audio();
    if(typeof context.createMediaElementSource!=='function'||typeof context.createMediaStreamDestination!=='function')
     throw fail('Ses dönüştürme bu cihazda kullanılamıyor.');
    const source=context.createMediaElementSource(video),destination=context.createMediaStreamDestination();
    source.connect(destination);audioTracks=destination.stream.getAudioTracks();
    if(!audioTracks.length)throw fail('Video sesi hazırlanamadı.');
    if(context.state!=='running')await context.resume();
    if(context.state!=='running')throw fail('Ses işleme izni gerekli. Videoyu telefonunda 720p MP4 olarak kaydet.');
   }
   for(const track of audioTracks)canvasStream.addTrack(track);
   // The source element is routed only through the captured audio graph;
   // no speakers need to be enabled while processing.
   video.muted=false;
   const bits=Math.max(330000,Math.min(1800000,Math.floor((SAFE*8/duration)-128000)));
   const chunks=[];
   recorder=new MediaRecorder(canvasStream,{mimeType:mime,videoBitsPerSecond:bits,audioBitsPerSecond:96000});
   recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
   const output=new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(error,data)=>{
     if(settled)return;settled=true;
     if(error)reject(error);else resolve(data);
    };
    recorder.onerror=()=>finish(fail('Video cihazda dönüştürülemedi. 720p MP4 olarak kaydet.'));
    recorder.onstop=()=>finish(null,new Blob(chunks,{type:recorder.mimeType.split(';')[0]}));
    timeout=setTimeout(()=>finish(fail('Video işleme zaman aşımına uğradı.')),(duration+50)*1000);
   });
   // A tiny hidden video may still be blocked by autoplay policy on iOS.
   video.style.cssText='position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0;pointer-events:none';
   video.setAttribute('aria-hidden','true');
   document.body.appendChild(video);
   recorder.start(1000);
   const draw=()=>{
    if(done||video.ended)return;
    if(video.readyState>=2)try{ctx.drawImage(video,0,0,canvas.width,canvas.height)}catch(_){}
    raf=requestAnimationFrame(draw);
   };
   draw();
   video.onended=()=>{if(recorder?.state==='recording')recorder.stop()};
   progress('Video cihazında sıkıştırılıyor…');
   await video.play().catch(()=>{throw fail('iPhone videoyu otomatik oynatamadı. Galeride 720p MP4 olarak dışa aktar.')});
   const blob=await output;
   if(!blob.size||blob.size>LIMIT)throw fail('Video 50 MB altına indirilemedi. Videoyu 720p MP4 olarak kaydet.');
   progress('Video hazır, güvenli yükleme başlıyor…');
   return new File([blob],'patiyiz-'+Date.now()+(blob.type==='video/mp4'?'.mp4':'.webm'),{type:blob.type,lastModified:Date.now()});
  }finally{close();video.remove()}
 }
 window.PatiyizVideoPrepare={prepare,LIMIT,MAX_SOURCE,MAX_DURATION,chooseMime};
})();