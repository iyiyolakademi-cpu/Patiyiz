/* Buchee - full-screen permanent story composer with image selection, preview and crop.
   No original story or gallery file is modified. Database writes stay in app.js callbacks. */
(function(global){
'use strict';
var root=null,state=null,mediaObserver=null,touchGesture=null;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
function clean(){touchGesture=null;if(mediaObserver){mediaObserver.disconnect();mediaObserver=null}if(state&&state.fileUrl)URL.revokeObjectURL(state.fileUrl);state=null;if(root){root.remove();root=null}document.body.classList.remove('buchee-highlight-editor-open')}
function source(story){
 if(!story)return {url:'',video:false,poster:''};
 var poster=story.image_url||story.video_cover_url||story.shared_cover_url||'';
 if(story.video_url)return {url:story.video_url,video:true,poster:poster};
 return {url:poster,video:false,poster:''};
}
function artwork(story,extra){
 var src=source(story),cl=extra||'';
 if(!src.url)return '<span class="bh-missing" aria-label="Hikâye kaydı mevcut; medya dosyası bulunamadı"><span>▧</span><small>Görsel bulunamadı</small></span>';
 if(src.video&&src.poster)return '<img class="'+cl+'" src="'+esc(src.poster)+'" data-video-fallback="'+esc(src.url)+'" alt="Video hikâyesinin kapak fotoğrafı" loading="lazy" decoding="async" draggable="false">';
 if(src.video)return '<video class="'+cl+' bh-lazy-video" data-src="'+esc(src.url)+'" preload="none" muted playsinline webkit-playsinline aria-label="Video hikâyesi"></video>';
 return '<img class="'+cl+'" src="'+esc(src.url)+'" alt="Hikâye kapağı" loading="lazy" decoding="async" draggable="false">';
}
function storyById(id){return state.stories.find(function(s){return s.id===id})}
function selectedStories(){return state.order.filter(function(id){return state.selected.has(id)}).map(storyById).filter(Boolean)}
function updateSelectionButtons(){
 if(!root||!state)return;
 root.querySelectorAll('.bh-selected-count').forEach(function(el){el.textContent=state.selected.size+' hikâye seçildi'});
 var next=root.querySelector('[data-bh="next"]');if(next)next.disabled=!state.selected.size;
 root.querySelectorAll('[data-bh="toggle"]').forEach(function(card){
  var active=state.selected.has(card.dataset.id);
  card.classList.toggle('is-selected',active);card.setAttribute('aria-pressed',String(active));
  var check=card.querySelector('.bh-check');if(check)check.textContent=active?'✓':'';
 });
 applyPickerFilter();
}
function applyPickerFilter(){
 if(!root||state?.stage!=='pick')return;
 var month=state.month||'',only=!!state.onlySelected;
 root.querySelectorAll('.bh-archive-card').forEach(function(card){
  card.hidden=!!((month&&card.dataset.month!==month)||(only&&!state.selected.has(card.dataset.id)));
 });
 var visible=[...root.querySelectorAll('.bh-archive-card')].filter(el=>!el.hidden).length;
 var empty=root.querySelector('.bh-filter-empty');
 if(empty)empty.hidden=visible>0;
}
function activateLazyVideos(){
 if(mediaObserver){mediaObserver.disconnect();mediaObserver=null}
 var videos=root?.querySelectorAll('.bh-lazy-video')||[];
 function activate(v){
  if(v.dataset.src&&!v.src){
   v.src=v.dataset.src;v.preload='metadata';
   v.addEventListener('loadedmetadata',function(){
    if(Number.isFinite(v.duration)&&v.duration>.15)try{v.currentTime=Math.min(.45,v.duration-.05)}catch(_){}
   },{once:true});
  }
 }
 if(typeof IntersectionObserver!=='function'){videos.forEach(activate);return}
 mediaObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){activate(entry.target);mediaObserver?.unobserve(entry.target)}})},{root:root?.querySelector('.bh-scroll')||null,rootMargin:'180px'});
 videos.forEach(function(v){mediaObserver.observe(v)});
}
function error(message){
 if(!root)return;var el=root.querySelector('.bh-error');if(el){el.hidden=!message;el.textContent=message||''}
}
function open(options){
 clean();state={options:options,owner:options.owner,stories:[],selected:new Set(options.selectedIds||[]),order:[...(options.selectedIds||[])],month:'',onlySelected:false,returnToEdit:!!options.album,title:options.title||'',album:options.album||null,coverStoryId:options.coverStoryId||options.initialStoryId||'',coverUrl:options.coverUrl||'',file:null,fileUrl:'',zoom:Number(options.zoom)||1,dx:Number(options.panX)||0,dy:Number(options.panY)||0,stage:'loading',saving:false};
 root=document.createElement('section');root.id='buchee-highlight-flow';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Kalıcı hikâyeler');
 document.body.appendChild(root);document.body.classList.add('buchee-highlight-editor-open');
 root.addEventListener('click',onClick);
 root.addEventListener('input',onInput);
 root.addEventListener('change',onChange);
 root.addEventListener('pointerdown',startDrag);
 root.addEventListener('touchstart',startTouchDrag,{passive:false});
 root.addEventListener('touchmove',moveTouchDrag,{passive:false});
 root.addEventListener('touchend',finishTouchDrag,{passive:false});
 root.addEventListener('touchcancel',finishTouchDrag,{passive:false});
 root.addEventListener('contextmenu',stopNativeSelection,{capture:true});
 root.addEventListener('selectstart',stopNativeSelection,{capture:true});
 root.addEventListener('dragstart',stopNativeSelection,{capture:true});
 root.addEventListener('error',function(e){
  var media=e.target;if(!media||!['IMG','VIDEO'].includes(media.tagName))return;
  if(media.dataset.videoFallback&&!media.dataset.triedVideo){
   var video=document.createElement('video');video.className=media.className+' bh-lazy-video';
   video.dataset.src=media.dataset.videoFallback;video.preload='none';video.muted=true;video.playsInline=true;
   media.replaceWith(video);activateLazyVideos();return;
  }
  var fallback=document.createElement('span');fallback.className='bh-missing';
  fallback.innerHTML='<span>▧</span><small>Görsel açılamadı</small>';
  media.replaceWith(fallback);
 },true);
 root.innerHTML='<div class="bh-loading" role="status">Hikâye arşivi açılıyor…</div>';
 Promise.resolve().then(options.loadStories).then(function(stories){
  if(!root||!state||state.options!==options)return;
  state.stories=Array.isArray(stories)?stories:[];
  state.order=state.order.filter(function(id){return state.stories.some(function(story){return story.id===id})});
  state.selected=new Set(state.order);
  if(state.album){
   if(!state.coverStoryId&&!state.coverUrl)state.coverStoryId=selectedStories().find(function(s){return !!source(s).url})?.id||'';
   if(options.openPicker){state.stage='pick';renderPicker()}else{state.stage='edit';renderEdit()}
  }else{
   if(options.initialStoryId){state.selected.add(options.initialStoryId);if(!state.order.includes(options.initialStoryId))state.order.push(options.initialStoryId)}
   state.stage='pick';renderPicker();
  }
 }).catch(function(e){if(root)root.innerHTML='<header class="bh-head"><button type="button" data-bh="close" aria-label="Kapat">×</button><strong>Öne çıkanlara ekle</strong><span></span></header><p class="bh-failure" role="alert">Arşiv açılamadı: '+esc(e.message||e)+'</p>'});
}
function header(title,sub,back){return '<header class="bh-head"><button type="button" data-bh="'+(back?'back':'close')+'" aria-label="'+(back?'Önceki adıma dön':'Kapat')+'">'+(back?'←':'×')+'</button><strong>'+esc(title)+'</strong><span class="bh-head-right">'+esc(sub||'')+'</span></header>'}
function card(story,selected){
 var d=new Date(story.created_at||Date.now()),valid=Number.isFinite(+d);
 var date=valid?d.toLocaleDateString('tr-TR',{day:'numeric',month:'short'}):'Hikâye';
 var month=valid?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'):'';
 var image=artwork(story,'bh-archive-asset');
 return '<button class="bh-archive-card'+(selected?' is-selected':'')+'" type="button" data-bh="toggle" data-id="'+esc(story.id)+'" data-month="'+esc(month)+'" aria-pressed="'+selected+'" aria-label="'+esc(date)+' hikâyesini seç"><span class="bh-archive-media">'+image+'</span><span class="bh-archive-date">'+esc(date)+'</span>'+(source(story).video?'<span class="bh-video-icon">▶</span>':'')+'<span class="bh-check">'+(selected?'✓':'')+'</span></button>';
}
function renderPicker(){
 if(!root||!state)return;
 state.stage='pick';if(mediaObserver){mediaObserver.disconnect();mediaObserver=null}
 var dates=[...new Set(state.stories.map(function(story){var d=new Date(story.created_at);return Number.isFinite(+d)?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'):''}).filter(Boolean))];
 var months=dates.map(function(key){var parts=key.split('-');var d=new Date(+parts[0],+parts[1]-1,1);return '<option value="'+esc(key)+'"'+(state.month===key?' selected':'')+'>'+esc(d.toLocaleDateString('tr-TR',{month:'long',year:'numeric'}))+'</option>'}).join('');
 root.innerHTML=header(state.album?'Albümdeki hikâyeler':'Öne çıkanlara ekle','',!!state.album)+
 '<div class="bh-picker-tools"><label for="bh-month" class="bh-filter-label">Tarih <select id="bh-month" aria-label="Hikâyeleri tarihe göre filtrele"><option value="">Tüm tarihler</option>'+months+'</select></label>'+
 '<button type="button" data-bh="selected-only" class="bh-only-selected'+(state.onlySelected?' active':'')+'" aria-pressed="'+state.onlySelected+'">Seçilenler</button></div>'+
 '<div class="bh-scroll bh-archive-scroll"><div class="bh-archive-grid">'+state.stories.map(function(story){return card(story,state.selected.has(story.id))}).join('')+'</div>'+
 '<p class="bh-filter-empty" hidden>Bu filtrede hikâye bulunamadı.</p>'+
 (!state.stories.length?'<div class="bh-empty">Arşivinde henüz hikâye yok. Hikâyelerin silinmedikçe burada kalır.</div>':'')+'</div>'+
 '<div class="bh-footer"><span class="bh-selected-count">'+state.selected.size+' hikâye seçildi</span><button type="button" class="bh-primary" data-bh="next"'+(state.selected.size?'':' disabled')+'>İleri <span aria-hidden="true">→</span></button></div><p class="bh-error" role="alert" hidden></p>';
 applyPickerFilter();activateLazyVideos();
}
function renderEdit(){
 if(!root||!state)return;
 state.stage='edit';
 if(!state.coverStoryId&&!state.coverUrl)state.coverStoryId=selectedStories().find(function(s){return !!source(s).url})?.id||'';
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
 '<div class="bh-cover-label"><strong>Hikâyelerinden kapak seç</strong><button type="button" class="bh-text-link" data-bh="edit-stories">Hikâyeleri düzenle</button></div>'+
 '<div class="bh-cover-choices">'+opts+'</div><div class="bh-order-heading"><strong>Albüm sırası</strong><span>Oklarla sırala veya albümden çıkar</span></div><div class="bh-order-list">'+selectedStories().map(function(story,index){return '<div class="bh-order-row"><span class="bh-order-index">'+(index+1)+'</span><span class="bh-order-thumb">'+artwork(story)+'</span><strong>'+esc(new Date(story.created_at).toLocaleDateString('tr-TR',{day:'numeric',month:'short'}))+'</strong><button type="button" data-bh="move-up" data-id="'+esc(story.id)+'" aria-label="Yukarı taşı"'+(index===0?' disabled':'')+'>↑</button><button type="button" data-bh="move-down" data-id="'+esc(story.id)+'" aria-label="Aşağı taşı"'+(index===state.order.length-1?' disabled':'')+'>↓</button><button type="button" class="bh-unlink" data-bh="remove-story" data-id="'+esc(story.id)+'" aria-label="Albümden çıkar, arşivde kalsın">×</button></div>'}).join('')+'</div></div></div>'+
 '<div class="bh-footer"><span class="bh-selected-count">'+state.selected.size+' hikâye</span><button type="button" class="bh-primary" data-bh="save">Kaydet</button></div><p class="bh-error" role="alert" hidden></p>';
 updatePreview();activateLazyVideos();
}
function clampCover(){if(!state)return;state.zoom=Math.max(1,Math.min(3,Number(state.zoom)||1));var max=(state.zoom-1)/2;state.dx=Math.max(-max,Math.min(max,Number(state.dx)||0));state.dy=Math.max(-max,Math.min(max,Number(state.dy)||0))}
function updatePreview(){clampCover();
 if(!root||!state)return;
 var area=root.querySelector('#bh-preview');if(!area)return;
 var src=state.fileUrl?{url:state.fileUrl,video:false}:state.coverUrl&&!state.coverStoryId?{url:state.coverUrl,video:false}:source(storyById(state.coverStoryId));
 if(src.url){
  // Do not replace the image element during each finger move: iOS otherwise begins
  // the native image select/copy interaction and breaks pointer capture.
  if(area.dataset.currentSource!==src.url||area.dataset.isVideo!==String(src.video)||!area.firstElementChild){
   var media=document.createElement(src.video?'video':'img');
   if(src.video){media.muted=true;media.playsInline=true;media.setAttribute('playsinline','');media.preload='metadata';if(src.poster)media.poster=src.poster;media.src=src.url;media.addEventListener('loadeddata',()=>{media.currentTime=Math.min(.5,Math.max(0,(media.duration||1)-.01))},{once:true})}
   else{media.src=src.url;media.alt='Kapak önizlemesi';media.draggable=false}
   area.replaceChildren(media);area.dataset.currentSource=src.url;area.dataset.isVideo=String(src.video);
  }
  var asset=area.firstElementChild;
  asset.style.transform='translate('+state.dx*100+'%, '+state.dy*100+'%) scale('+state.zoom+')';
 }else{
  area.replaceChildren();area.innerHTML='<span class="bh-missing">Kapak seç</span>';
  area.dataset.currentSource='';area.dataset.isVideo='';
 }
 var range=root.querySelector('#bh-zoom');if(range)range.value=String(state.zoom);
}
function stopNativeSelection(e){
 if(e.target.closest?.('#bh-preview'))e.preventDefault();
}
function startTouchDrag(e){
 if(!state||state.stage!=='edit'||!e.target.closest('#bh-preview')||!e.touches.length)return;
 if(e.cancelable)e.preventDefault();
 setupTouchGesture(e.touches);
}
function setupTouchGesture(touches){
 var area=root?.querySelector('#bh-preview');if(!area||!state)return;
 var width=Math.max(1,area.getBoundingClientRect().width);
 if(touches.length>=2){
  var a=touches[0],b=touches[1],distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  touchGesture={kind:'pinch',distance:Math.max(1,distance),zoom:state.zoom,dx:state.dx,dy:state.dy,
   centerX:(a.clientX+b.clientX)/2,centerY:(a.clientY+b.clientY)/2,width:width};
 }else{
  touchGesture={kind:'pan',x:touches[0].clientX,y:touches[0].clientY,dx:state.dx,dy:state.dy,width:width};
 }
}
function moveTouchDrag(e){
 if(!touchGesture||!state||state.stage!=='edit')return;
 if(e.cancelable)e.preventDefault();
 var g=touchGesture;
 if(e.touches.length>=2){
  if(g.kind!=='pinch'){setupTouchGesture(e.touches);g=touchGesture}
  var a=e.touches[0],b=e.touches[1],dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  var centerX=(a.clientX+b.clientX)/2,centerY=(a.clientY+b.clientY)/2;
  state.zoom=Math.max(1,Math.min(3,g.zoom*dist/g.distance));
  state.dx=g.dx+(centerX-g.centerX)/g.width;
  state.dy=g.dy+(centerY-g.centerY)/g.width;
 }else if(e.touches.length===1){
  if(g.kind!=='pan'){setupTouchGesture(e.touches);g=touchGesture}
  var pt=e.touches[0];state.dx=g.dx+(pt.clientX-g.x)/g.width;state.dy=g.dy+(pt.clientY-g.y)/g.width;
 }else return;
 updatePreview();
}
function finishTouchDrag(e){
 if(!touchGesture)return;
 if(e.touches.length){setupTouchGesture(e.touches)}
 else touchGesture=null;
}
function onClick(e){
 var b=e.target.closest('[data-bh]');if(!b||!root||!root.contains(b)||!state)return;
 var action=b.dataset.bh;
 if(action==='close'){clean();return}
 if(action==='back'){if(state.stage==='pick'&&state.album){state.stage='edit';renderEdit()}else{state.stage='pick';renderPicker()}return}
 if(action==='toggle'){
  var id=b.dataset.id;if(state.selected.has(id)){state.selected.delete(id);state.order=state.order.filter(function(v){return v!==id})}else{state.selected.add(id);state.order.push(id)}
  if(!state.selected.has(state.coverStoryId)&&!state.file&&!state.coverUrl)state.coverStoryId='';
  updateSelectionButtons();return;
 }
 if(action==='selected-only'){state.onlySelected=!state.onlySelected;b.classList.toggle('active',state.onlySelected);b.setAttribute('aria-pressed',String(state.onlySelected));applyPickerFilter();return}
 if(action==='edit-stories'){state.month='';state.onlySelected=false;state.stage='pick';renderPicker();return}
 if(action==='remove-story'){var savedScroll=root.querySelector('.bh-editor-scroll')?.scrollTop||0;state.selected.delete(b.dataset.id);state.order=state.order.filter(function(id){return id!==b.dataset.id});if(state.coverStoryId===b.dataset.id)state.coverStoryId=selectedStories()[0]?.id||'';renderEdit();if(root.querySelector('.bh-editor-scroll'))root.querySelector('.bh-editor-scroll').scrollTop=savedScroll;return}
 if(action==='move-up'||action==='move-down'){var i=state.order.indexOf(b.dataset.id),j=i+(action==='move-up'?-1:1);if(i>=0&&j>=0&&j<state.order.length){var savedScroll=root.querySelector('.bh-editor-scroll')?.scrollTop||0;[state.order[i],state.order[j]]=[state.order[j],state.order[i]];renderEdit();if(root.querySelector('.bh-editor-scroll'))root.querySelector('.bh-editor-scroll').scrollTop=savedScroll}return}
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
function onInput(e){if(!state)return;if(e.target.id==='bh-title')state.title=e.target.value;if(e.target.id==='bh-zoom'){state.zoom=Number(e.target.value)||1;clampCover();updatePreview()}}
function onChange(e){
 if(e.target.id==='bh-month'&&state){state.month=e.target.value;applyPickerFilter();return}
 if(e.target.id!=='bh-file'||!state)return;
 var file=e.target.files&&e.target.files[0];if(!file)return;
 if(!file.type.startsWith('image/')||file.size>20*1024*1024){error('20 MB altındaki bir fotoğraf seç.');return}
 if(state.fileUrl)URL.revokeObjectURL(state.fileUrl);
 state.file=file;state.fileUrl=URL.createObjectURL(file);state.coverStoryId='';state.coverUrl='';
 state.dx=state.dy=0;state.zoom=1;renderEdit();
}
function startDrag(e){
 if(!state||state.stage!=='edit'||!e.target.closest('#bh-preview'))return;
 if(e.pointerType==='touch'||(e.pointerType==='mouse'&&e.button!==0))return;
 var area=e.target.closest('#bh-preview'),startX=e.clientX,startY=e.clientY,dx=state.dx,dy=state.dy,width=Math.max(1,area.getBoundingClientRect().width);
 area.setPointerCapture?.(e.pointerId);e.preventDefault();
 function move(v){state.dx=dx+(v.clientX-startX)/width;state.dy=dy+(v.clientY-startY)/width;updatePreview()}
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
 }catch(e){var msg=String(e.message||'');error(/permission denied|row.level security|patiyiz_highlight_items/i.test(msg)?'Kalıcı hikâye kaydedilemedi. Tekrar dene veya oturumunu yenile.':msg||'Kaydedilemedi. Tekrar dene.');if(state===s){state.saving=false;var button=root.querySelector('[data-bh="save"]');if(button){button.disabled=false;button.textContent='Kaydet'}}}
}
global.BucheeHighlightFlow={open:open,close:clean};
})(window);
