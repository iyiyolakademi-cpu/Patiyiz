/* Patiyiz profile photo editor.
   Self-contained: mobile drag, pinch zoom, corner-resize, 1080px square output.
   Only intercepts #profile-form photo choices; no other capture or share flow changes. */
(function(){
 'use strict';
 const approved=new WeakSet();
 let opening=false;
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const notify=message=>{if(typeof window.alert==='function')window.alert(message)};
 async function editPhoto(file){
  if(!file||!file.size)throw Error('Düzenlenecek fotoğraf seçilmedi.');
  if(file.size>30*1024*1024)throw Error('Profil fotoğrafı 30 MB sınırını aşamaz.');
  if(!file.type.startsWith('image/')&&!/\.(heic|heif)$/i.test(file.name))throw Error('Lütfen bir fotoğraf seç.');
  const url=URL.createObjectURL(file);
  let image;
  try{
   image=new Image();
   image.decoding='async';
   image.src=url;
   await image.decode();
   if(!image.naturalWidth||!image.naturalHeight)throw Error('Fotoğraf açılamadı.');
  }catch{
   URL.revokeObjectURL(url);
   throw Error('Bu fotoğraf açılamadı. JPG veya PNG biçiminde yeniden dene.');
  }
  return new Promise(resolve=>{
   const modal=document.createElement('div');
   modal.id='pati-avatar-crop-overlay';
   modal.className='pati-avatar-crop-overlay';
   modal.setAttribute('role','dialog');
   modal.setAttribute('aria-modal','true');
   modal.setAttribute('aria-label','Profil fotoğrafını kırp');
   modal.innerHTML='<div class="pati-avatar-crop-panel">'+
     '<header><button type="button" data-crop="cancel" aria-label="Vazgeç">Vazgeç</button><strong>Profil fotoğrafını düzenle</strong><button class="pati-avatar-crop-save" type="button" data-crop="save">Tamam</button></header>'+
     '<p class="pati-avatar-crop-help">Fotoğrafı sürükleyerek yerleştir, iki parmakla yakınlaştır veya kareyi köşelerinden ayarla.</p>'+
     '<div class="pati-avatar-crop-stage"><canvas aria-label="Fotoğraf kırpma önizlemesi"></canvas><div class="pati-avatar-crop-square" aria-hidden="true">'+
     '<span class="pati-avatar-crop-grid"></span><i class="corner top-left" data-corner="-1,-1"></i><i class="corner top-right" data-corner="1,-1"></i>'+
     '<i class="corner bottom-left" data-corner="-1,1"></i><i class="corner bottom-right" data-corner="1,1"></i></div></div>'+
     '<footer><span>Yakınlaştır</span><input type="range" min="1" max="4" step="0.01" value="1" aria-label="Yakınlaştırma miktarı">'+
     '<small>Kare kesilecek, profilinde yuvarlak görünecek.</small></footer></div>';
   document.body.appendChild(modal);
   const previousFocus=document.activeElement;
   document.body.classList.add('pati-avatar-crop-open');
   const stage=modal.querySelector('.pati-avatar-crop-stage');
   const canvas=stage.querySelector('canvas');
   const square=stage.querySelector('.pati-avatar-crop-square');
   const zoomInput=modal.querySelector('input[type="range"]');
   const ctx=canvas.getContext('2d',{alpha:false});
   let stageW=0,stageH=0,side=0,maxSide=0,zoom=1,dx=0,dy=0,finished=false;
   let sizing=null,drag=null;
   const pointers=new Map();
   let pinch=null;
   const minimumSide=()=>Math.min(120,maxSide);
   function metrics(){
    const base=Math.max(side/image.naturalWidth,side/image.naturalHeight);
    const w=image.naturalWidth*base*zoom,h=image.naturalHeight*base*zoom;
    dx=clamp(dx,-Math.max(0,(w-side)/2),Math.max(0,(w-side)/2));
    dy=clamp(dy,-Math.max(0,(h-side)/2),Math.max(0,(h-side)/2));
    return {w,h};
   }
   function draw(){
    if(!stageW||!stageH||!ctx)return;
    const ratio=Math.min(window.devicePixelRatio||1,2);
    const cw=Math.round(stageW*ratio),ch=Math.round(stageH*ratio);
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.fillStyle='#151619';ctx.fillRect(0,0,stageW,stageH);
    const {w,h}=metrics();
    ctx.drawImage(image,(stageW-w)/2+dx,(stageH-h)/2+dy,w,h);
    square.style.width=side+'px';square.style.height=side+'px';
   }
   function measure(first=false){
    const r=stage.getBoundingClientRect();
    stageW=r.width;stageH=r.height;
    const oldMax=maxSide;
    maxSide=Math.max(80,Math.min(stageW-42,stageH-42,390));
    side=first?maxSide:clamp(side||maxSide,minimumSide(),maxSide);
    if(!first&&oldMax>0)side=clamp(side/oldMax*maxSide,minimumSide(),maxSide);
    draw();
   }
   const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>measure()):null;
   function close(result){
    if(finished)return;
    finished=true;
    resizeObserver?.disconnect();
    window.removeEventListener('resize',onResize);
    document.removeEventListener('keydown',onKey);
    URL.revokeObjectURL(url);
    modal.remove();
    document.body.classList.remove('pati-avatar-crop-open');
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    resolve(result);
   }
   function onResize(){measure()}
   function onKey(event){if(event.key==='Escape'){event.preventDefault();close(null)}}
   document.addEventListener('keydown',onKey);
   window.addEventListener('resize',onResize);
   resizeObserver?.observe(stage);
   function distance(){
    const p=[...pointers.values()];
    return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
   }
   function handleDown(event){
    if(finished||event.button>0)return;
    event.preventDefault();
    const c=event.target.closest('[data-corner]');
    if(c){
     const [signX,signY]=c.dataset.corner.split(',').map(Number);
     sizing={startX:event.clientX,startY:event.clientY,startSide:side,signX,signY,pointerId:event.pointerId};
     c.setPointerCapture?.(event.pointerId);
     return;
    }
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    stage.setPointerCapture?.(event.pointerId);
    if(pointers.size===1){drag={x:event.clientX,y:event.clientY};pinch=null;}
    else if(pointers.size===2){drag=null;pinch={distance:distance(),zoom};}
   }
   function handleMove(event){
    if(finished)return;
    if(sizing&&sizing.pointerId===event.pointerId){
     event.preventDefault();
     const ddx=event.clientX-sizing.startX,ddy=event.clientY-sizing.startY;
     side=clamp(sizing.startSide+(sizing.signX*ddx+sizing.signY*ddy)/2,minimumSide(),maxSide);
     draw();return;
    }
    if(!pointers.has(event.pointerId))return;
    event.preventDefault();
    const old=pointers.get(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size>=2){
     if(!pinch)pinch={distance:distance(),zoom};
     if(pinch.distance>0){zoom=clamp(pinch.zoom*distance()/pinch.distance,1,4);zoomInput.value=zoom.toFixed(2);}
     drag=null;
    }else{
     dx+=event.clientX-old.x;dy+=event.clientY-old.y;drag={x:event.clientX,y:event.clientY};
    }
    draw();
   }
   function handleUp(event){
    if(sizing?.pointerId===event.pointerId){sizing=null;return;}
    pointers.delete(event.pointerId);
    if(pointers.size<2)pinch=null;
    if(pointers.size===1){const p=[...pointers.values()][0];drag={x:p.x,y:p.y};}
    if(pointers.size===0)drag=null;
   }
   stage.addEventListener('pointerdown',handleDown);
   stage.addEventListener('pointermove',handleMove);
   stage.addEventListener('pointerup',handleUp);
   stage.addEventListener('pointercancel',handleUp);
   stage.addEventListener('lostpointercapture',handleUp);
   zoomInput.addEventListener('input',()=>{
    zoom=clamp(Number(zoomInput.value)||1,1,4);draw();
   });
   async function save(){
    const button=modal.querySelector('[data-crop="save"]');button.disabled=true;button.textContent='Hazırlanıyor…';
    try{
     const size=1080;
     const output=document.createElement('canvas');output.width=size;output.height=size;
     const context=output.getContext('2d',{alpha:false});
     if(!context)throw Error('Fotoğraf düzenleyici açılamadı.');
     const {w,h}=metrics(),factor=size/side;
     const left=(stageW-side)/2,top=(stageH-side)/2;
     context.fillStyle='#fff';context.fillRect(0,0,size,size);
     context.drawImage(image,((stageW-w)/2+dx-left)*factor,((stageH-h)/2+dy-top)*factor,w*factor,h*factor);
     const blob=await new Promise(done=>output.toBlob(done,'image/jpeg',0.9));
     if(!blob?.size)throw Error('Kırpılmış fotoğraf oluşturulamadı.');
     close(new File([blob],'patiyiz-profil-'+Date.now()+'.jpg',{type:'image/jpeg',lastModified:Date.now()}));
    }catch(e){
     button.disabled=false;button.textContent='Tamam';
     modal.querySelector('.pati-avatar-crop-help').textContent=e.message||'Kırpma başarısız. Tekrar dene.';
    }
   }
   modal.addEventListener('click',event=>{
    const a=event.target.closest('[data-crop]')?.dataset.crop;
    if(a==='cancel')close(null);
    if(a==='save')void save();
   });
   requestAnimationFrame(()=>{measure(true);modal.querySelector('[data-crop="cancel"]')?.focus({preventScroll:true})});
  });
 }
 document.addEventListener('change',async event=>{
  const input=event.target;
  if(!input?.matches?.('#profile-form input[name="photo"]'))return;
  if(approved.has(input)){approved.delete(input);return;}
  const file=input.files?.[0];if(!file)return;
  event.stopImmediatePropagation();
  if(opening){input.value='';return;}
  opening=true;
  try{
   const cropped=await editPhoto(file);
   if(!cropped||!input.isConnected){input.value='';return;}
   if(typeof DataTransfer!=='function')throw Error('Bu cihaz dosya aktarımını desteklemiyor. Tarayıcıyı güncelleyip yeniden dene.');
   const data=new DataTransfer();data.items.add(cropped);
   input.files=data.files;
   approved.add(input);
   input.dispatchEvent(new Event('change',{bubbles:true}));
  }catch(e){input.value='';notify(e.message||'Profil fotoğrafı düzenlenemedi.');}
  finally{opening=false;}
 },true);
 window.PatiyizProfileCrop=Object.freeze({version:'20261030-square-corners'});
})();