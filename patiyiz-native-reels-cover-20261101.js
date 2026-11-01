/* Native Reels cover editor: keep original camera/gallery flow. */
(()=>{'use strict';
const $=(root,s)=>root?.querySelector(s);
let currentRoot=null, videoUrl='', photoUrl='', videoFile=null, chosen=null, mode='auto', captureToken=0, queued=false;
function cleanup(){captureToken++;if(videoUrl)URL.revokeObjectURL(videoUrl);if(photoUrl)URL.revokeObjectURL(photoUrl);videoUrl='';photoUrl='';videoFile=null;chosen=null;mode='auto';currentRoot=null}
function editor(root){return $(root,'#pati-native-cover-editor')}
function sync(){
 const root=document.getElementById('patiyiz-system-media');
 if(!root||root.dataset.mode!=='reels'){if(currentRoot)cleanup();return}
 if(root!==currentRoot){cleanup();currentRoot=root}
 const preview=$(root,'#pati-system-preview');
 if(!preview||preview.hidden)return;
 const panel=$(root,'.pati-system-edit-panel');if(!panel)return;
 if(!editor(root)){
 const section=document.createElement('section');section.id='pati-native-cover-editor';
 section.innerHTML='<div class="pati-native-cover-heading"><strong>Kapak fotoğrafı</strong><small>Reels profilinde görünecek fotoğrafı seç.</small></div><div class="pati-native-cover-main"><div class="pati-native-cover-image"><img alt="Reels kapak önizlemesi" hidden><span>Kapak önizlemesi</span></div><div class="pati-native-cover-choices"><button type="button" data-native-cover="gallery">Telefondan fotoğraf seç</button><button type="button" data-native-cover="frame">Videodan kare seç</button></div></div><div class="pati-native-cover-frame" hidden><video playsinline muted preload="metadata"></video><label>Kapak karesini belirle<input type="range" min="0" max="1000" value="0" step="1"></label><button type="button" data-native-cover="use-frame">Bu kareyi kapak yap</button></div><p class="pati-native-cover-status" role="status">Kapak seçmezsen videodan otomatik oluşturulur.</p><input type="file" accept="image/*,.heic,.heif" hidden>';
 panel.insertBefore(section,panel.firstChild);
 }
 const input=$('#post-form','input[name="video"]');
 const file=input?.files?.[0]||null;
 if(file&&file!==videoFile){videoFile=file;chosen=null;mode='auto';captureToken++;if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl=URL.createObjectURL(file);const v=$(editor(root),'video');v.src=videoUrl;v.load();const slider=$(editor(root),'input[type="range"]');slider.value='0';update()}
}
function update(){
 const el=editor(currentRoot);if(!el)return;
 const img=$(el,'.pati-native-cover-image img'),placeholder=$(el,'.pati-native-cover-image span');
 const valid=chosen?.file;
 if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=''}
 if(valid){photoUrl=URL.createObjectURL(chosen.file);img.src=photoUrl;img.hidden=false;placeholder.hidden=true}
 else{img.hidden=true;img.removeAttribute('src');placeholder.hidden=false}
 $(el,'.pati-native-cover-status').textContent=valid?'Kapak seçildi. Paylaşınca bu fotoğraf kullanılacak.':'Kapak seçmezsen videodan otomatik oluşturulur.';
 $(el,'.pati-native-cover-frame').hidden=mode!=='frame';
}
function commit(file){
 const form=document.getElementById('post-form'),input=$(form,'input[name="cover_photo"]');
 if(!input||!file)return;
 const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;
 chosen={file};update();
}
function capture(){
 const el=editor(currentRoot),v=$(el,'video');
 if(!v||!v.videoWidth||!v.videoHeight){$(el,'.pati-native-cover-status').textContent='Video karesi yüklenmedi. Videoyu başka bir saniyeye kaydırıp tekrar dene.';return}
 const canvas=document.createElement('canvas');canvas.width=540;canvas.height=960;
 const w=v.videoWidth,h=v.videoHeight,ratio=9/16,sw=w/h>ratio?h*ratio:w,sh=w/h>ratio?h:w/ratio;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 try{ctx.drawImage(v,(w-sw)/2,(h-sh)/2,sw,sh,0,0,540,960)}catch(e){return}
 canvas.toBlob(blob=>{if(blob?.size)commit(new File([blob],'reels-kapak.jpg',{type:'image/jpeg'}))},'image/jpeg',.86);
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-native-cover]');if(!btn)return;
 e.preventDefault();e.stopPropagation();
 const el=editor(currentRoot);if(!el)return;
 const name=btn.dataset.nativeCover;
 if(name==='gallery')$(el,'input[type="file"]')?.click();
 if(name==='frame'){mode='frame';update();const v=$(el,'video');if(v){v.controls=true;v.muted=true;v.playsInline=true;v.preload='auto';if(!v.src&&videoUrl)v.src=videoUrl;v.load();v.play().catch(()=>{$(el,'.pati-native-cover-status').textContent='Videoyu oynatmak için oynat simgesine dokun.'});}}
 if(name==='use-frame'){const v=$(el,'video');v?.pause();if(v?.seeking)v.addEventListener('seeked',capture,{once:true});else capture()}
},true);
document.addEventListener('change',e=>{
 const el=editor(currentRoot);if(!el)return;
 if(e.target===$(el,'input[type="file"]')){
 const file=e.target.files?.[0];if(file?.size&&file.type.startsWith('image/')){mode='gallery';commit(file)}
 }
},true);
document.addEventListener('input',e=>{
 const el=editor(currentRoot);if(!el||e.target!==$(el,'input[type="range"]'))return;
 const v=$(el,'video');if(v&&Number.isFinite(v.duration)&&v.duration>0){v.pause();v.currentTime=Math.min(Math.max(0,Number(e.target.value)/1000*v.duration),Math.max(0,v.duration-.03))}
},true);
const observer=new MutationObserver(records=>{if(!records.some(r=>r.addedNodes.length||r.target?.id==='pati-system-preview'))return;if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
sync();
})();