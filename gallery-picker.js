/* Patiyiz permission-based mobile gallery preview for files chosen by the user.
 * Browser security intentionally prevents reading the complete device photo library. */
(()=>{
 'use strict';
 let session=null;
 function close(){
  if(!session)return;
  session.urls.forEach(url=>URL.revokeObjectURL(url));
  session.root.remove();session=null;
 }
 function open(files,options={}){
  close();
  const items=Array.from(files||[]).filter(f=>f&&f.size>0&&(String(f.type||'').startsWith('image/')||/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name||'')));
  if(!items.length)return false;
  const multiple=options.multiple===true,max=Math.max(1,Number(options.max||1)),chosen=new Set(multiple?items.slice(0,max).map((_,i)=>i):[0]);
  const root=document.createElement('div');
  root.id='pati-gallery-overlay';root.className='pati-gallery-overlay';
  root.innerHTML='<div class="pati-gallery-shade" data-gallery="close"></div><section class="pati-gallery-sheet" role="dialog" aria-modal="true" aria-label="Fotoğraf seçimi">'+
   '<div class="pati-gallery-grabber"></div><div class="pati-gallery-header"><button type="button" class="pati-gallery-back" data-gallery="close" aria-label="Kapat">×</button>'+
   '<strong>Son Seçilenler</strong><span class="pati-gallery-hd">HD</span></div>'+
   '<p class="pati-gallery-hint">Telefonundan izin verdiğin fotoğraflar. Görsel seçmek için üzerine dokun.</p>'+
   '<div class="pati-gallery-grid" role="group" aria-label="Fotoğraf önizlemeleri"></div>'+
   '<div class="pati-gallery-bottom"><button type="button" class="pati-gallery-reselect" data-gallery="reopen">Galeriden başka seç</button>'+
   '<button type="button" class="pati-gallery-continue" data-gallery="confirm"></button></div></section>';
  document.body.appendChild(root);
  const urls=items.map(f=>URL.createObjectURL(f));session={root,urls,chosen,items,options};
  const grid=root.querySelector('.pati-gallery-grid'),confirm=root.querySelector('.pati-gallery-continue');
  function draw(){
   grid.replaceChildren();
   items.forEach((file,i)=>{
    const tile=document.createElement('button');tile.type='button';tile.className='pati-gallery-tile'+(chosen.has(i)?' selected':'');
    tile.dataset.index=String(i);tile.setAttribute('aria-label','Fotoğraf '+(i+1)+(chosen.has(i)?' seçili':''));tile.setAttribute('aria-pressed',String(chosen.has(i)));
    const img=document.createElement('img');img.src=urls[i];img.alt=file.name||'Galeri fotoğrafı';img.loading=i<9?'eager':'lazy';img.decoding='async';
    const check=document.createElement('span');check.className='pati-gallery-check';check.textContent=chosen.has(i)?String([...chosen].sort((a,b)=>a-b).indexOf(i)+1):'';
    tile.append(img,check);grid.append(tile);
   });
   confirm.textContent=(multiple?'Devam et':'Fotoğrafı gönder')+' ('+chosen.size+')';
   confirm.disabled=chosen.size===0;
  }
  draw();
  root.addEventListener('click',async e=>{
   const choice=e.target.closest('[data-gallery]'),tile=e.target.closest('.pati-gallery-tile');
   if(tile){
    const i=Number(tile.dataset.index);if(!Number.isInteger(i)||i<0||i>=items.length)return;
    if(chosen.has(i))chosen.delete(i);else{if(!multiple)chosen.clear();if(chosen.size<max)chosen.add(i)}
    draw();return;
   }
   if(!choice)return;
   if(choice.dataset.gallery==='close'){close();return}
   if(choice.dataset.gallery==='reopen'){const callback=options.onReopen;close();if(callback)callback();return}
   if(choice.dataset.gallery==='confirm'&&chosen.size){
    const selected=[...chosen].sort((a,b)=>a-b).map(i=>items[i]);choice.disabled=true;
    const original=choice.textContent;choice.textContent='Hazırlanıyor…';
    try{
     const result=await options.onConfirm?.(selected);
     if(result!==false)close();else{choice.disabled=false;choice.textContent=original}
    }catch(err){
     const status=root.querySelector('.pati-gallery-hint');status.textContent=err.message||'Fotoğraf işlenemedi.';
     status.setAttribute('role','alert');choice.disabled=false;choice.textContent=original;
    }
   }
  });
  return true;
 }
 window.PatiyizGalleryPicker={open,close,get active(){return !!session}};
})();
