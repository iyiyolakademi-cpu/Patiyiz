/* Text-post photo picker: iOS-safe selection and draggable 16:9 crop. */
(function(){
'use strict';
window.BucheeTwitPhotos={mount(form,edits,defaultCrop,paint,notify){
 if(!form||form.querySelector('.buchee-twit-photo-picker'))return;
 const field=form.querySelector('textarea[name="body"]');if(!field)return;
 const picker=document.createElement('section');picker.className='buchee-twit-photo-picker';
 picker.innerHTML='<div class="buchee-twit-picker-head"><strong>Fotoğraf ekle</strong><small>En fazla 4 fotoğraf · yatay 16:9</small></div><div class="buchee-twit-picker-actions"><button type="button" data-buchee-photo="gallery"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/></svg>Galeri</button><button type="button" data-buchee-photo="camera"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h4l2-2h4l2 2h4v12H4z"/><circle cx="12" cy="13" r="4"/></svg>Kamera</button></div><input type="file" name="photo" accept="image/*" multiple hidden><div class="buchee-twit-photo-preview" aria-live="polite"></div><div class="buchee-twit-crop" hidden><strong>Fotoğrafı kırp · 16:9</strong><p>Fotoğrafı sürükleyerek yukarı, aşağı veya yana taşı.</p><canvas width="640" height="360" aria-label="16:9 kırpma önizlemesi"></canvas><label>Yakınlaştır <input type="range" min="1" max="2.5" step=".05" value="1"></label><div class="buchee-twit-crop-actions"><button type="button" data-crop-cancel>Vazgeç</button><button type="button" data-crop-save>Uygula</button></div></div>';
 field.insertAdjacentElement('afterend',picker);
 const input=picker.querySelector('input[name="photo"]'),preview=picker.querySelector('.buchee-twit-photo-preview'),crop=picker.querySelector('.buchee-twit-crop'),canvas=crop.querySelector('canvas'),zoom=crop.querySelector('input[type="range"]');
 let selected=[],urls=[],cropIndex=-1,cropImage=null,cropUrl='',draft=null;
 form._bucheeTextPhotos=selected;
 function draw(){
  urls.forEach(URL.revokeObjectURL);urls=[];preview.replaceChildren();
  selected.forEach((file,index)=>{
   const url=URL.createObjectURL(file);urls.push(url);
   const tile=document.createElement('div');tile.className='buchee-twit-photo-tile';
   const img=document.createElement('img');img.src=url;img.alt='Seçilen fotoğraf '+(index+1);
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Fotoğrafı kaldır');
   remove.addEventListener('click',()=>{selected.splice(index,1);form._bucheeTextPhotos=selected;draw()});
   const edit=document.createElement('button');edit.type='button';edit.className='buchee-twit-crop-open';edit.textContent='Kırp';
   edit.addEventListener('click',()=>{void openCrop(index)});
   tile.append(img,remove,edit);preview.appendChild(tile);
  });
 }
 function repaint(){if(cropImage&&draft)paint(canvas,cropImage,draft,'preview')}
 function closeCrop(){crop.hidden=true;cropIndex=-1;cropImage=null;draft=null;if(cropUrl){URL.revokeObjectURL(cropUrl);cropUrl=''}}
 async function openCrop(index){
  closeCrop();cropIndex=index;const file=selected[index];if(!file)return;
  cropUrl=URL.createObjectURL(file);const img=new Image();img.src=cropUrl;
  try{await img.decode()}catch(e){closeCrop();notify('Fotoğraf açılamadı.',true);return}
  if(cropIndex!==index)return;
  cropImage=img;draft={...(edits.get(file)||defaultCrop(file,'16:9')),ratio:'16:9'};
  zoom.value=String(draft.zoom);crop.hidden=false;repaint();crop.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 picker.querySelectorAll('[data-buchee-photo]').forEach(btn=>btn.addEventListener('click',()=>{
  if(btn.dataset.bucheePhoto==='camera'){input.setAttribute('capture','environment');input.multiple=false}
  else{input.removeAttribute('capture');input.multiple=true}
  input.value='';input.click();
 }));
 input.addEventListener('change',()=>{
  const files=Array.from(input.files||[]).filter(f=>f.type.startsWith('image/')||/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
  if(selected.length+files.length>4)notify('En fazla 4 fotoğraf ekleyebilirsin.',true);
  selected=[...selected,...files].slice(0,4);form._bucheeTextPhotos=selected;draw();input.value='';
 });
 zoom.addEventListener('input',()=>{if(!draft)return;draft.zoom=Number(zoom.value);repaint()});
 let drag=null;
 canvas.addEventListener('pointerdown',e=>{if(!draft||!cropImage)return;drag={x:e.clientX,y:e.clientY,startX:draft.x,startY:draft.y};canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{
  if(!drag||!draft||!cropImage)return;
  const rect=canvas.getBoundingClientRect(),iw=cropImage.naturalWidth,ih=cropImage.naturalHeight;
  const scale=Math.max(640/iw,360/ih)*draft.zoom,excessX=iw*scale-640,excessY=ih*scale-360;
  draft.x=excessX>0?Math.max(0,Math.min(1,drag.startX-(e.clientX-drag.x)/rect.width*640/excessX)):.5;
  draft.y=excessY>0?Math.max(0,Math.min(1,drag.startY-(e.clientY-drag.y)/rect.height*360/excessY)):.5;
  repaint();
 });
 canvas.addEventListener('pointerup',()=>{drag=null});canvas.addEventListener('pointercancel',()=>{drag=null});
 crop.querySelector('[data-crop-cancel]').addEventListener('click',closeCrop);
 crop.querySelector('[data-crop-save]').addEventListener('click',()=>{if(cropIndex>=0&&selected[cropIndex]&&draft)edits.set(selected[cropIndex],{...draft});closeCrop()});
 const observer=new MutationObserver(()=>{if(!form.isConnected){urls.forEach(URL.revokeObjectURL);closeCrop();observer.disconnect()}});
 observer.observe(document.body,{childList:true});
}};
})();