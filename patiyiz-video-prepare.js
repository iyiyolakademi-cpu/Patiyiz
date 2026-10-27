/* Patiyiz optional on-device video reduction for clips larger than the Free Storage
 * per-object limit. Original videos below the limit are never re-encoded.
 * Only compress if the browser can capture audio as well as video; otherwise
 * refuse to silently strip sound. No third-party API is used. */
(()=>{
 'use strict';
 const LIMIT=50*1024*1024;
 const MAX_SOURCE=300*1024*1024;
 const chooseMime=()=>{
  if(typeof MediaRecorder==='undefined'||!MediaRecorder.isTypeSupported)return '';
  for(const mime of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm']){
   if(MediaRecorder.isTypeSupported(mime))return mime;
  }
  return '';
 };
 async function metadata(video){
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Video okunamadı; 720p MP4 olarak dışa aktar.')),15000);
   video.onloadedmetadata=()=>{clearTimeout(timer);resolve()};
   video.onerror=()=>{clearTimeout(timer);reject(Error('Video biçimi bu cihazda açılamadı.'))};
   video.load();
  });
 }
 async function prepare(file,progress=()=>{}){
  if(!file?.size)return file;
  if(file.size<=LIMIT)return file;
  if(file.size>MAX_SOURCE)throw Error('Bu video çok büyük. 720p MP4 olarak kısaltıp tekrar dene.');
  const mime=chooseMime();
  if(!mime||!HTMLCanvasElement.prototype.captureStream||!HTMLMediaElement.prototype.captureStream){
   throw Error('Cihazın bu videoyu otomatik sıkıştıramıyor. Galeride 720p MP4 olarak dışa aktarıp tekrar dene.');
  }
  const url=URL.createObjectURL(file),video=document.createElement('video');
  let source=null,renderStream=null,recorder=null,frame=0,finished=false;
  const clear=()=>{
   finished=true;if(frame)cancelAnimationFrame(frame);
   if(recorder?.state==='recording')try{recorder.stop()}catch(_){}
   for(const stream of [renderStream,source])stream?.getTracks().forEach(t=>t.stop());
   video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);
  };
  try{
   video.src=url;video.muted=true;video.playsInline=true;video.preload='metadata';
   await metadata(video);
   if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>180)
    throw Error('Otomatik sıkıştırma en fazla 3 dakikalık videoları destekliyor. Daha uzun videoyu MP4 olarak küçült.');
   progress('Video cihazında hazırlanıyor…');
   await video.play().catch(()=>{throw Error('Video oynatılamadı. 720p MP4 olarak dışa aktar.')});
   source=video.captureStream();
   const tracks=source.getAudioTracks();
   // Never generate an apparently successful silent substitute for a voiced video.
   if(!tracks.length||tracks.some(t=>t.muted))
    throw Error('Bu tarayıcı videonun sesini koruyarak sıkıştıramıyor. 720p MP4 olarak dışa aktar.');
   const canvas=document.createElement('canvas');
   const ratio=Math.min(1,720/Math.max(1,video.videoWidth),1280/Math.max(1,video.videoHeight));
   canvas.width=Math.max(2,Math.round(video.videoWidth*ratio/2)*2);
   canvas.height=Math.max(2,Math.round(video.videoHeight*ratio/2)*2);
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw Error('Video dönüştürülemedi.');
   const draw=()=>{
    if(finished||video.ended)return;
    try{ctx.drawImage(video,0,0,canvas.width,canvas.height)}catch(_){}
    frame=requestAnimationFrame(draw);
   };
   draw();
   renderStream=canvas.captureStream(24);
   tracks.forEach(track=>renderStream.addTrack(track));
   const chunks=[];
   const blob=await new Promise((resolve,reject)=>{
    let timer=null,settled=false;
    const done=(err,value)=>{
     if(settled)return;settled=true;clearTimeout(timer);
     if(err)reject(err);else resolve(value);
    };
    try{
     recorder=new MediaRecorder(renderStream,{mimeType:mime,videoBitsPerSecond:1600000,audioBitsPerSecond:96000});
     recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
     recorder.onerror=()=>done(Error('Video sıkıştırılamadı.'));
     recorder.onstop=()=>done(null,new Blob(chunks,{type:recorder.mimeType.split(';')[0]}));
     video.onended=()=>{if(recorder.state==='recording')recorder.stop()};
     recorder.start(1000);
     timer=setTimeout(()=>done(Error('Video sıkıştırma zaman aşımına uğradı.')),(video.duration+30)*1000);
    }catch(err){done(err)}
   });
   if(!blob.size||blob.size>=LIMIT)throw Error('Video yeterince küçültülemedi. Galeride 720p MP4 kaydet.');
   const ext=blob.type==='video/mp4'?'mp4':'webm';
   progress('Video sıkıştırıldı, yüklemeye geçiliyor…');
   return new File([blob],'patiyiz-video-'+Date.now()+'.'+ext,{type:blob.type,lastModified:Date.now()});
  }finally{clear()}
 }
 window.PatiyizVideoPrepare={prepare,LIMIT};
})();