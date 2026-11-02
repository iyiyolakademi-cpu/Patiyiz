/* Buchee - full-screen permanent story composer with image selection, preview and crop.
   No original story or gallery file is modified. Database writes stay in app.js callbacks. */
(function(global){
'use strict';
var root=null,state=null;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
function clean(){if(state&&state.fileUrl)URL.revokeObjectURL(state.fileUrl);state=null;if(root){root.remove();root=null}document.body.classList.remove('buchee-highlight-editor-open')}
function source(story){
 if(!story)return {url:'',video:false};
 var photo=story.image_url||story.video_cover_url||story.shared_cover_url||'';
 if(photo)return {url:photo,video:false};
 return {url:story.video_url||'',video:!!story.video_url};
}
function artwork(story,extra){
 var src=source(story),cl=extra||'';
 if(!src.url)return '<span class="bh-missing" aria-label="Bu hikâyenin görseli kullanılamıyor"><span>▧</span><small>Önizleme yok</small></span>';
 if(src.video)return '<video class="'+cl+'" src="'+esc(src.url)+'#t=0.15" preload="metadata" muted playsinline aria-label="Video hikâyesi"></video>';
 return '<img class="'+cl+'" src="'+esc(src.url)+'" alt="Hikâye kapağı" loading="lazy" decoding="async">';
}
function storyById(id){return state.stories.find(function(s){return s.id===id})}
function selectedStories(){return state.stories.filter(function(s){return state.selected.has(s.id)})}
function error(message){
 if(!root)return;var el=root.querySelector('.bh-error');if(el){el.hidden=!message;el.textContent=message||''}
}
function open(options){
 clean();state={options:options,owner:options.owner,stories:[],selected:new Set(options.selectedIds||[]),title:options.title||'',album:options.album||null,coverStoryId:options.coverStoryId||options.initialStoryId||'',coverUrl:options.coverUrl||'',file:null,fileUrl:'',zoom:Number(options.zoom)||1,dx:Number(options.panX)||0,dy:Number(options.panY)||0,stage:'loading',saving:false};
 root=document.createElement('section');root.id='buchee-highlight-flow';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Kalıcı hikâyeler');
 document.body.appendChild(root);document.body.classList.add('buchee-highlight-editor-open');
 root.addEventListener('click',onClick);
 root.addEventListener('input',onInput);
 root.addEventListener('change',onChange);
 root.addEventListener('pointerdown',startDrag);
 root.addEventListener('error',function(e){if(e.target&&e.target.tagName==='IMG'){var img=e.target;var fallback=document.createElement('span');fallback.className='bh-missing';fallback.textContent='Görsel açılamadı';img.replaceWith(fallback)}},true);
 root.innerHTML='<div class="bh-loading" role="status">Hikâye arşivi açılıyor…</div>';
 Promise.resolve().then(options.loadStories).then(function(stories){
  if(!root||!state||state.options!==options)return;
  state.stories=Array.isArray(stories)?stories:[];
  if(state.album){
   if(!state.coverStoryId)state.coverStoryId=selectedStories().find(function(s){return !!source(s).url})?.id||'';
   state.stage='edit';renderEdit();
  }else{
   if(options.initialStoryId)state.selected.add(options.initialStoryId);
   state.stage='pick';renderPicker();
  }
 }).catch(function(e){if(root)root.innerHTML='<header class="bh-head"><button type="button" data-bh="close" aria-label="Kapat">×</button><strong>Öne çıkanlara ekle</strong><span></span></header><p class="bh-failure" role="alert">Arşiv açılamadı: '+esc(e.message||e)+'</p>'});
}
function header(title,sub,back){return '<header class="bh-head"><button type="button" data-bh="'+(back?'back':'close')+'" aria-label="'+(back?'Önceki adıma dön':'Kapat')+'">'+(back?'←':'×')+'</button><strong>'+esc(title)+'</strong><span class="bh-head-right">'+esc(sub||'')+'</span></header>'}
function card(story,selected){
 var d=new Date(story.created_at||Date.now()),date=Number.isFinite(+d)?d.toLocaleDateString('tr-TR',{day:'numeric',month:'short'}):'Hikâye';
 return '<button class="bh-archive-card'+(selected?' is-selected':'')+'" type="button" data-bh="toggle" data-id="'+esc(story.id)+'" aria-pressed="'+selected+'" aria-label="'+esc(date)+' hikâyesini seç"><span class="bh-archive-media">'+artwork(story,'bh-archive-asset')+'</span><span class="bh-archive-date">'+esc(date)+'</span>'+(source(story).video?'<span class="bh-video-icon">▶</span>':'')+'<span class="bh-check">'+(selected?'✓':'')+'</span></button>';
}
function renderPicker(){
 if(!root||!state)return;
 state.stage='pick';
 root.innerHTML=header('Öne çıkanlara ekle','',false)+
 '<p class="bh-intro">Profiline kalıcı eklemek istediğin eski hikâyeleri seç. Birden fazla seçebilirsin.</p>'+
 '<div class="bh-scroll bh-archive-scroll"><div class="bh-archive-grid">'+state.stories.map(function(story){return card(story,state.selected.has(story.id))}).join('')+'</div>'+
 (state.stories.length?'':'<div class="bh-empty">Arşivinde henüz hikâye yok. Önce bir hikâye paylaş.</div>')+'</div>'+
 '<div class="bh-footer"><span class="bh-selected-count">'+state.selected.size+' hikâye seçildi</span><button type="button" class="bh-primary" data-bh="next"'+(state.selected.size?'':' disabled')+'>İleri <span aria-hidden="true">→</span></button></div><p class="bh-error" role="alert" hidden></p>';
}
function renderEdit(){
 if(!root||!state)return;
 state.stage='edit';
 if(!state.coverStoryId)state.coverStoryId=selectedStories().find(function(s){return !!source(s).url})?.id||'';
 var opts=selectedStories().map(function(story){
  return '<button type="button" class="bh-cover-option'+(!state.file&&state.coverStoryId===story.id?' active':'')+'" data-bh="cover-story" data-id="'+esc(story.id)+'" aria-pressed="'+(!state.file&&state.coverStoryId===story.id)+'">'+artwork(story,'bh-cover-thumb')+'</button>';
 }).join('');
 root.innerHTML=header(state.album?'Kalıcı hikâyeyi düzenle':'Yeni kalıcı hikâye','',!state.album)+
 '<div class="bh-scroll bh-editor-scroll"><div class="bh-editor-inner"><div class="bh-editor-kicker">KALICI HİKÂYE DÜZENLEYİCİ</div><h2>Albümünü kişiselleştir</h2>'+
 '<p class="bh-editor-sub">İsim ve kapak fotoğrafını seç. Fotoğrafı sürükleyip yakınlaştırarak kırpabilirsin.</p>'+
 '<label class="bh-label" for="bh-title">Albüm adı</label><input id="bh-title" class="bh-title" type="text" maxlength="32" minlength="1" required placeholder="Örn. Anılarım" value="'+esc(state.title)+'">'+
 '<div class="bh-cover-label"><strong>Kapak resmi</strong><span>Önizleme</span></div>'+
 '<div class="bh-preview-outer"><div class="bh-preview" id="bh-preview" aria-label="Kapak kırpma alanı"></div></div>'+
 '<label class="bh-zoom-label" for="bh-zoom">Yakınlaştır <small>Sürükleyerek kapağı konumlandır</small></label>'+
 '<input type="range" id="bh-zoom" class="bh-zoom" min="1" max="3" step="0.05" value="'+state.zoom+'">'+
 '<div class="bh-cover-tools"><button type="button" data-bh="reset" class="bh-outline">Kırpmayı sıfırla</button><label class="bh-upload">Galeriden kapak seç<input id="bh-file" type="file" accept="image/*,.heic,.heif" hidden></label></div>'+
 '<div class="bh-cover-label"><strong>Hikâyelerinden kapak seç</strong><span>'+state.selected.size+' hikâye</span></div>'+
 '<div class="bh-cover-choices">'+opts+'</div></div></div>'+
 '<div class="bh-footer"><span class="bh-selected-count">'+state.selected.size+' hikâye</span><button type="button" class="bh-primary" data-bh="save">Kaydet</button></div><p class="bh-error" role="alert" hidden></p>';
 updatePreview();
}
function updatePreview(){
 if(!root||!state)return;
 var area=root.querySelector('#bh-preview');if(!area)return;
 var src=state.fileUrl?{url:state.fileUrl,video:false}:state.coverUrl&&!state.coverStoryId?{url:state.coverUrl,video:false}:source(storyById(state.coverStoryId));
 if(src.url){
  var transform='translate('+state.dx*100+'%, '+state.dy*100+'%) scale('+state.zoom+')';
  area.innerHTML=src.video?'<video src="'+esc(src.url)+'#t=0.15" playsinline muted preload="metadata"></video>':'<img src="'+esc(src.url)+'" alt="Kapak önizlemesi">';
  var asset=area.firstElementChild;asset.style.transform=transform;
 }else area.innerHTML='<span class="bh-missing">Kapak seç</span>';
 var range=root.querySelector('#bh-zoom');if(range)range.value=String(state.zoom);
}
function onClick(e){
 var b=e.target.closest('[data-bh]');if(!b||!root||!root.contains(b)||!state)return;
 var action=b.dataset.bh;
 if(action==='close'){clean();return}
 if(action==='back'){state.stage='pick';renderPicker();return}
 if(action==='toggle'){
  var id=b.dataset.id;if(state.selected.has(id))state.selected.delete(id);else state.selected.add(id);
  renderPicker();return;
 }
 if(action==='next'){
  if(!state.selected.size)return;
  if(!state.coverStoryId||!state.selected.has(state.coverStoryId))state.coverStoryId=selectedStories().find(function(s){return !!source(s).url})?.id||selectedStories()[0]?.id||'';
  state.stage='edit';renderEdit();return;
 }
 if(action==='cover-story'){
  state.coverStoryId=b.dataset.id;state.coverUrl='';state.file=null;
  if(state.fileUrl){URL.revokeObjectURL(state.fileUrl);state.fileUrl=''}
  state.dx=state.dy=0;state.zoom=1;renderEdit();return;
 }
 if(action==='reset'){state.zoom=1;state.dx=state.dy=0;updatePreview();return}
 if(action==='save')void save();
}
function onInput(e){if(!state)return;if(e.target.id==='bh-title')state.title=e.target.value;if(e.target.id==='bh-zoom'){state.zoom=Number(e.target.value)||1;updatePreview()}}
function onChange(e){
 if(e.target.id!=='bh-file'||!state)return;
 var file=e.target.files&&e.target.files[0];if(!file)return;
 if(!file.type.startsWith('image/')||file.size>20*1024*1024){error('20 MB altındaki bir fotoğraf seç.');return}
 if(state.fileUrl)URL.revokeObjectURL(state.fileUrl);
 state.file=file;state.fileUrl=URL.createObjectURL(file);state.coverStoryId='';state.coverUrl='';
 state.dx=state.dy=0;state.zoom=1;renderEdit();
}
function startDrag(e){
 if(!state||state.stage!=='edit'||!e.target.closest('#bh-preview'))return;
 if(e.pointerType==='mouse'&&e.button!==0)return;
 var area=e.target.closest('#bh-preview'),startX=e.clientX,startY=e.clientY,dx=state.dx,dy=state.dy,width=Math.max(1,area.getBoundingClientRect().width);
 area.setPointerCapture?.(e.pointerId);e.preventDefault();
 function move(v){state.dx=Math.min(.5,Math.max(-.5,dx+(v.clientX-startX)/width));state.dy=Math.min(.5,Math.max(-.5,dy+(v.clientY-startY)/width));updatePreview()}
 function stop(){area.removeEventListener('pointermove',move);area.removeEventListener('pointerup',stop);area.removeEventListener('pointercancel',stop)}
 area.addEventListener('pointermove',move);area.addEventListener('pointerup',stop);area.addEventListener('pointercancel',stop);
}
function loadImage(url){
 return new Promise(function(resolve,reject){
  var img=new Image();img.onload=function(){resolve(img)};img.onerror=function(){reject(Error('Kapak fotoğrafı açılamadı. Başka fotoğraf seç.'))};img.src=url;
 });
}
async function croppedFile(){
 if(!state.file)return null;
 var img=await loadImage(state.fileUrl),size=640;
 var base=Math.max(size/img.naturalWidth,size/img.naturalHeight),scale=base*state.zoom;
 var width=img.naturalWidth*scale,height=img.naturalHeight*scale;
 var xcap=Math.max(0,(width-size)/2),ycap=Math.max(0,(height-size)/2);
 var x=Math.max(-xcap,Math.min(xcap,state.dx*size)),y=Math.max(-ycap,Math.min(ycap,state.dy*size));
 var canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 var ctx=canvas.getContext('2d');if(!ctx)throw Error('Fotoğraf kırpma desteklenmiyor.');
 ctx.fillStyle='#f4f4f4';ctx.fillRect(0,0,size,size);ctx.drawImage(img,(size-width)/2+x,(size-height)/2+y,width,height);
 var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/jpeg',.86)});
 if(!blob)throw Error('Kapak hazırlanamadı.');
 return new File([blob],'buchee-kalici-kapak.jpg',{type:'image/jpeg'});
}
async function save(){
 if(!root||!state||state.saving)return;
 var title=state.title.trim(),stories=selectedStories();
 if(!title||title.length>32){error('Albüm adı 1–32 karakter olmalı.');root.querySelector('#bh-title')?.focus();return}
 if(!stories.length){error('En az bir hikâye seç.');return}
 if(state.coverStoryId&&!storyById(state.coverStoryId)){error('Geçerli bir kapak seç.');return}
 var s=state;state.saving=true;
 var btn=root.querySelector('[data-bh="save"]');if(btn){btn.disabled=true;btn.textContent='Kaydediliyor…'}
 error('');
 try{
  var file=await croppedFile();
  await s.options.onSave({title:title,selectedIds:stories.map(function(x){return x.id}),coverStoryId:s.coverStoryId||null,coverFile:file,panX:file?0:s.dx,panY:file?0:s.dy,zoom:file?1:s.zoom,coverAudience:file?'everyone':storyById(s.coverStoryId)?.audience||'everyone',album:s.album});
  if(state===s)clean();
 }catch(e){error(e.message||'Kaydedilemedi. Tekrar dene.');if(state===s){state.saving=false;var button=root.querySelector('[data-bh="save"]');if(button){button.disabled=false;button.textContent='Kaydet'}}}
}
global.BucheeHighlightFlow={open:open,close:clean};
})(window);
