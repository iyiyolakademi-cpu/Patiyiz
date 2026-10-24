/* Patiyiz Photo Studio: user-selected photos only; no device library access. */
(()=>{
'use strict';
const PRESETS=[
 ['Normal','none'],['Canlı','vivid'],['Güneşli','sunny'],['Yumuşak Tüy','soft'],
 ['Siyah Beyaz','mono'],['Sonbahar','autumn'],['Soğuk','cool'],['Film','film']
];
const CROPS={'original':null,'1:1':1,'4:5':4/5,'9:16':9/16,'16:9':16/9};
const CONTROLS=[
 ['exposure','Pozlama',-100,100,1],['contrast','Kontrast',-100,100,1],
 ['highlights','Parlak alanlar',-100,100,1],['shadows','Gölgeler',-100,100,1],
 ['saturation','Doygunluk',-100,100,1],['warmth','Sıcaklık',-100,100,1],
 ['sharpness','Netlik',0,100,1]
];
const $=(root,s)=>root.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const initial=()=>({crop:'original',rotate:0,straight:0,zoom:1,panX:0,panY:0,
 preset:'none',strength:100,exposure:0,contrast:0,highlights:0,shadows:0,saturation:0,warmth:0,sharpness:0});
function plan(img,state,long=720){
 const turn=((state.rotate%4)+4)%4;
 const rotated=turn%2===1;
 const naturalW=rotated?img.naturalHeight:img.naturalWidth;
 const naturalH=rotated?img.naturalWidth:img.naturalHeight;
 const r=CROPS[state.crop]||naturalW/naturalH;
 const safeMax=Math.max(1,long);
 const width=Math.max(1,Math.round(r>=1?safeMax:safeMax*r));
 const height=Math.max(1,Math.round(r>=1?safeMax/r:safeMax));
 return {width,height,ratio:r};
}
function filterFor(state){
 const preset={
  none:[1,1,1,0,0],vivid:[1.05,1.1,1.27,0,0],
  sunny:[1.08,1.06,1.15,13,0],soft:[1.035,.93,.91,0,0],
  mono:[1,1.12,0,0,1],autumn:[1.04,1.08,1.04,22,0],
  cool:[1.01,1.08,1.1,-9,0],film:[.97,1.12,.89,6,0]
 }[state.preset]||[1,1,1,0,0];
 const mix=(v,original=1)=>original+(v-original)*(state.strength/100);
 const bright=clamp((mix(preset[0])*(1+state.exposure/170)),.2,2.8);
 const contrast=clamp((mix(preset[1])*(1+state.contrast/130)),.25,2.7);
 const saturated=clamp((mix(preset[2])*(1+state.saturation/110)),0,3);
 return 'brightness('+bright.toFixed(3)+') contrast('+contrast.toFixed(3)+') saturate('+saturated.toFixed(3)+') hue-rotate('+(mix(preset[3],0)+state.warmth/12).toFixed(1)+'deg) grayscale('+(mix(preset[4],0)*100).toFixed(1)+'%)';
}
function draw(canvas,img,state,long=720){
 const layout=plan(img,state,long);
 canvas.width=layout.width;canvas.height=layout.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:!!(state.highlights||state.shadows||state.warmth||state.sharpness)});
 if(!ctx)throw Error('Fotoğraf düzenleyici bu tarayıcıda kullanılamıyor.');
 ctx.save();ctx.fillStyle='#080a10';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.translate(canvas.width/2+state.panX*canvas.width,canvas.height/2+state.panY*canvas.height);
 ctx.rotate(((state.rotate*90)+state.straight)*Math.PI/180);
 const turn=((state.rotate%4)+4)%4;
 const twisted=turn%2===1;
 const radians=state.straight*Math.PI/180;
 const aw=twisted?img.naturalHeight:img.naturalWidth,ah=twisted?img.naturalWidth:img.naturalHeight;
 const outwardW=Math.abs(aw*Math.cos(radians))+Math.abs(ah*Math.sin(radians));
 const outwardH=Math.abs(ah*Math.cos(radians))+Math.abs(aw*Math.sin(radians));
 const scale=Math.max(canvas.width/aw,canvas.height/ah,canvas.width/outwardW,canvas.height/outwardH)*clamp(state.zoom,1,3);
 ctx.filter=filterFor(state);
 ctx.drawImage(img,-img.naturalWidth*scale/2,-img.naturalHeight*scale/2,img.naturalWidth*scale,img.naturalHeight*scale);
 ctx.restore();
 if(state.highlights||state.shadows||state.warmth){
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),bytes=pixels.data;
  for(let i=0;i<bytes.length;i+=4){
   const luminance=(bytes[i]*.213+bytes[i+1]*.715+bytes[i+2]*.072)/255;
   const shadow=state.shadows/100*(1-luminance)*(1-luminance)*95;
   const highlight=state.highlights/100*luminance*luminance*80;
   bytes[i]=clamp(bytes[i]+shadow+highlight+state.warmth*.15,0,255);
   bytes[i+1]=clamp(bytes[i+1]+shadow+highlight,0,255);
   bytes[i+2]=clamp(bytes[i+2]+shadow+highlight-state.warmth*.17,0,255);
  }
  ctx.putImageData(pixels,0,0);
 }
 // Export and preview use the same effect pipeline.
 return layout;
}
let active=null;
async function open(files,options={}){
 if(active)return false;
 const items=Array.from(files||[]).filter(f=>f&&f.size&&(String(f.type||'').startsWith('image/')||/\.(heic|heif|jpg|jpeg|png|webp)$/i.test(f.name||'')));
 if(!items.length)return false;
 const session={root:null,items,images:[],urls:[],states:items.map(initial),index:0,tab:'filters',history:[],redo:[],busy:false};
 active=session;
 const root=document.createElement('div');root.id='pati-photo-studio';root.className='pati-photo-studio';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Fotoğraf Stüdyosu');
 root.innerHTML='<div class="pati-studio-shell">'+
 '<header class="pati-studio-header"><button type="button" data-studio="cancel" class="pati-studio-exit" aria-label="İptal">×</button><div class="pati-studio-title"><strong>Foto Stüdyosu</strong><small id="pati-studio-caption">Normal</small></div>'+
 '<button type="button" data-studio="undo" class="pati-studio-undo" aria-label="Geri al">↶</button><button type="button" data-studio="redo" class="pati-studio-undo" aria-label="İleri al">↷</button><button type="button" data-studio="next" class="pati-studio-next">İleri</button></header>'+
 '<div class="pati-studio-stage"><div class="pati-studio-picture"><canvas id="pati-studio-canvas" aria-label="Düzenlenen fotoğrafın önizlemesi"></canvas><div class="pati-studio-crop-grid" hidden></div></div><div class="pati-studio-pages" id="pati-studio-pages"></div></div>'+
 '<section class="pati-studio-bottom"><div class="pati-studio-controls" id="pati-studio-controls"></div><nav class="pati-studio-tabs" aria-label="Fotoğraf araçları"><button data-studio="tab" data-tab="filters">✦ Filtre</button><button data-studio="tab" data-tab="adjust">☷ Ayarla</button><button data-studio="tab" data-tab="crop">◰ Kırp</button></nav><button class="pati-studio-reset" data-studio="reset">↺ Sıfırla</button><div class="pati-studio-message" role="status" aria-live="polite"></div></section></div>';
 document.body.appendChild(root);document.body.classList.add('pati-studio-open');session.root=root;
 const canvas=$(root,'#pati-studio-canvas');
 const state=()=>session.states[session.index];
 const message=(x,bad=false)=>{const el=$(root,'.pati-studio-message');el.textContent=x;el.dataset.error=String(bad)};
 const save=()=>{session.history.push({index:session.index,state:{...state()}});if(session.history.length>50)session.history.shift();session.redo=[]};
 const refresh=()=>{
  if(active!==session||!session.images[session.index])return;
  try{draw(canvas,session.images[session.index],state(),Math.min(780,Math.max(380,Math.round(window.innerWidth*.94))))}catch(e){message(e.message,true)}
  $(root,'#pati-studio-caption').textContent=(PRESETS.find(x=>x[1]===state().preset)?.[0]||'Normal')+(session.items.length>1?' · '+(session.index+1)+'/'+session.items.length:'');
  $(root,'[data-studio="undo"]').disabled=session.history.length===0;
  $(root,'[data-studio="redo"]').disabled=session.redo.length===0;
  $(root,'[data-studio="next"]').textContent=session.index===session.items.length-1?'İleri':'Sonraki';
  $(root,'.pati-studio-crop-grid').hidden=session.tab!=='crop';
  $(root,'#pati-studio-pages').innerHTML=session.items.length>1?session.items.map((_,i)=>'<button type="button" data-studio="page" data-index="'+i+'" class="'+(session.index===i?'active':'')+'">'+(i+1)+'</button>').join(''):'';
 };
 const drawControls=()=>{
  const c=$(root,'#pati-studio-controls'),v=state();
  $(root,'.pati-studio-tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tab===session.tab));
  if(session.tab==='filters'){
   c.innerHTML='<div class="pati-studio-presets">'+PRESETS.map(([label,key])=>'<button type="button" data-studio="preset" data-value="'+key+'" class="'+(v.preset===key?'active':'')+'"><span class="pati-studio-filter-thumb">'+escape(label.slice(0,1))+'</span><small>'+escape(label)+'</small></button>').join('')+'</div>'+
   '<label class="pati-studio-slider">Güç <input type="range" data-field="strength" min="0" max="100" value="'+v.strength+'"><output>'+v.strength+'%</output></label>';
  }else if(session.tab==='adjust'){
   c.innerHTML='<div class="pati-studio-adjust-pills">'+CONTROLS.map(([key,label])=>'<button type="button" data-studio="control" data-value="'+key+'" class="'+((session.control||'exposure')===key?'active':'')+'">'+escape(label)+'</button>').join('')+'</div>';
   const setting=CONTROLS.find(x=>x[0]===(session.control||'exposure'))||CONTROLS[0];
   c.insertAdjacentHTML('beforeend','<label class="pati-studio-slider">'+setting[1]+' <input type="range" data-field="'+setting[0]+'" min="'+setting[2]+'" max="'+setting[3]+'" step="'+setting[4]+'" value="'+v[setting[0]]+'"><output>'+(v[setting[0]]>0?'+':'')+v[setting[0]]+'</output></label>');
  }else{
   c.innerHTML='<div class="pati-studio-crops">'+Object.keys(CROPS).map(key=>'<button type="button" data-studio="ratio" data-value="'+key+'" class="'+(v.crop===key?'active':'')+'"><span>▭</span><small>'+(key==='original'?'Orijinal':key)+'</small></button>').join('')+
   '<button type="button" data-studio="rotate"><span>⟳</span><small>Döndür</small></button></div>'+
   '<label class="pati-studio-slider">Düzleştir <input type="range" data-field="straight" min="-20" max="20" step="1" value="'+v.straight+'"><output>'+v.straight+'°</output></label>'+
   '<label class="pati-studio-slider">Yakınlaştır <input type="range" data-field="zoom" min="1" max="3" step=".05" value="'+v.zoom+'"><output>'+v.zoom+'×</output></label><p class="pati-studio-tip">Görüntüyü sürükle · İki parmakla yakınlaştır</p>';
  }
  refresh();
 };
 const leave=()=>{if(active!==session)return;active=null;document.removeEventListener('keydown',escapeKey,true);session.urls.forEach(u=>URL.revokeObjectURL(u));root.remove();document.body.classList.remove('pati-studio-open')};
 const apply=async()=>{
  if(session.busy)return;
  session.busy=true;const next=$(root,'[data-studio="next"]');next.disabled=true;
  try{
   if(session.index<session.items.length-1){session.index++;session.history=[];session.redo=[];drawControls();return}
   message('Fotoğraflar hazırlanıyor…');
   const results=[];
   for(let i=0;i<session.items.length;i++){
    const output=document.createElement('canvas');
    draw(output,session.images[i],session.states[i],2048);
    const blob=await new Promise(resolve=>output.toBlob(resolve,'image/jpeg',.89));
    if(!blob||blob.size===0)throw Error('Fotoğraf dışa aktarılamadı.');
    results.push(new File([blob],'patiyiz-studio-'+(i+1)+'-'+Date.now()+'.jpg',{type:'image/jpeg'}));
   }
   await options.onApply?.(results);leave();
  }catch(e){message(e.message||'Fotoğraf işlenemedi.',true)}
  finally{session.busy=false;next.disabled=false}
 };
 let sliderStart=null;
 root.addEventListener('click',e=>{
  const b=e.target.closest('[data-studio]');if(!b||session.busy)return;
  switch(b.dataset.studio){
   case 'cancel':leave();options.onCancel?.();break;
   case 'next':void apply();break;
   case 'tab':session.tab=b.dataset.tab;drawControls();break;
   case 'preset':save();state().preset=b.dataset.value;drawControls();break;
   case 'control':session.control=b.dataset.value;drawControls();break;
   case 'ratio':save();state().crop=b.dataset.value;drawControls();break;
   case 'rotate':save();state().rotate=(state().rotate+1)%4;drawControls();break;
   case 'reset':save();session.states[session.index]=initial();drawControls();break;
   case 'page':{const index=Number(b.dataset.index);if(index>=0&&index<session.items.length){session.index=index;session.history=[];session.redo=[];drawControls()}break}
   case 'undo':if(session.history.length){session.redo.push({index:session.index,state:{...state()}});const prev=session.history.pop();session.index=prev.index;session.states[prev.index]=prev.state;drawControls()}break;
   case 'redo':if(session.redo.length){session.history.push({index:session.index,state:{...state()}});const next=session.redo.pop();session.index=next.index;session.states[next.index]=next.state;drawControls()}break;
  }
 });
 root.addEventListener('input',e=>{
  const field=e.target.dataset.field;if(!field)return;
  if(sliderStart===null)sliderStart={...state()};
  state()[field]=Number(e.target.value);
  const output=e.target.parentElement.querySelector('output');
  if(output)output.textContent=(state()[field]>0&&field!=='strength'&&field!=='zoom'?'+':'')+state()[field]+(field==='strength'?'%':field==='straight'?'°':field==='zoom'?'×':'');
  refresh();
 });
 root.addEventListener('change',e=>{
  if(!e.target.dataset.field)return;
  if(sliderStart){session.history.push({index:session.index,state:sliderStart});session.redo=[];sliderStart=null;refresh()}
 });
 const pointerMap=new Map();let drag=null;
 canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',e=>{
  if(session.busy)return;
  pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);
  if(pointerMap.size===1){drag={x:e.clientX,y:e.clientY,px:state().panX,py:state().panY,zoom:state().zoom,old:{...state()}}}
  else if(pointerMap.size===2){const pts=[...pointerMap.values()];drag={distance:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),zoom:state().zoom,old:drag?.old||{...state()}}}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!pointerMap.has(e.pointerId)||!drag)return;
  pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointerMap.size===2&&drag.distance){
   const pts=[...pointerMap.values()],distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
   state().zoom=clamp(drag.zoom*distance/Math.max(drag.distance,1),1,3);
  }else if(pointerMap.size===1&&drag.x!==undefined){
   state().panX=clamp(drag.px+(e.clientX-drag.x)/Math.max(120,canvas.clientWidth),-.8,.8);
   state().panY=clamp(drag.py+(e.clientY-drag.y)/Math.max(120,canvas.clientHeight),-.8,.8);
  }
  refresh();
 });
 const finish=e=>{
  if(!pointerMap.has(e.pointerId))return;
  pointerMap.delete(e.pointerId);
  if(pointerMap.size===0&&drag){
   if(JSON.stringify(state())!==JSON.stringify(drag.old)){session.history.push({index:session.index,state:drag.old});session.redo=[]}
   drag=null;refresh();
  }
 };
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
 const escapeKey=e=>{if(e.key==='Escape'&&active===session){e.preventDefault();e.stopImmediatePropagation();leave();options.onCancel?.();document.removeEventListener('keydown',escapeKey,true)}};
 document.addEventListener('keydown',escapeKey,true);
 // One active studio at a time; ensure callbacks cannot act on abandoned inputs.
 try{
  for(const file of items){
   const url=URL.createObjectURL(file);session.urls.push(url);
   const img=new Image();img.src=url;await img.decode();
   if(active!==session)return false;
   session.images.push(img);
  }
  drawControls();
 }catch(e){message('Bu fotoğraf açılamadı. JPG veya PNG olarak tekrar seçebilirsin.',true);$(root,'[data-studio="next"]').disabled=true}
 return true;
}
window.PatiyizPhotoStudio={open,close(){const button=active?.root?.querySelector('[data-studio="cancel"]');if(button)button.click()},get active(){return !!active},PRESETS,CROPS,plan,filterFor,draw};
})();
