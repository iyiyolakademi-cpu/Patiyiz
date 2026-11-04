/* Buchee Kaydedilenler — personal saved library.
   Reuses existing post_saves, post data and green/orange/red importance values.
   No personal data is copied into another table. */
(()=>{
 'use strict';
 let ctx=null;
 let importanceFilter='all',typeFilter='all',sort='new',layout='grid',query='';
 let selecting=false,busy=false,choiceId=null,confirming=false;
 let selected=new Set(),expanded=new Set(),lastFetchKey='';
 const levels={
  green:{name:'Yeşil',desc:'Daha sonra incelemek için',color:'#309966'},
  orange:{name:'Turuncu',desc:'Yakında tekrar bakacağım',color:'#e7a041'},
  red:{name:'Kırmızı',desc:'Öncelikli ve önemli',color:'#d75b67'}
 };
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalized=x=>String(x??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const rows=()=>((ctx?.data?.saves)||[]).filter(r=>r.user_id===ctx?.me?.id&&ctx.saved.has(r.post_id));
 const saves=()=>new Map(rows().map(r=>[r.post_id,r]));
 const importance=id=>levels[saves().get(id)?.importance]?saves().get(id).importance:'green';
 const kind=post=>{
  if(post.post_format==='reels'||post.video_url||post.media_videos?.some?.(Boolean))return 'reels';
  if(post.image_url||post.images?.some?.(Boolean))return 'media';
  return 'text';
 };
 const label=post=>({reels:'Reels',media:'Gönderi',text:'Yazı'})[kind(post)];
 const userName=post=>{
  const profile=ctx?.data?.profiles?.find(p=>p.id===post.author_id);
  return profile?.display_name||profile?.name||profile?.username||'Buchee kullanıcısı';
 };
 const dateShort=value=>{try{return new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value))}catch(e){return ''}};
 const timeOf=(post,times)=>new Date(times.get(post.id)||post.created_at||0).getTime()||0;
 function allSavedPosts(){
  if(!ctx?.me?.id)return[];
  const saveTimes=new Map(rows().map(x=>[x.post_id,x.created_at]));
  return ctx.data.posts.filter(post=>ctx.saved.has(post.id)&&!ctx.blocked.has(post.author_id))
   .sort((a,b)=>(sort==='old'?timeOf(a,saveTimes)-timeOf(b,saveTimes):timeOf(b,saveTimes)-timeOf(a,saveTimes))||String(b.id).localeCompare(String(a.id)));
 }
 function visiblePosts(){
  const q=normalized(query.trim());
  return allSavedPosts().filter(post=>(importanceFilter==='all'||importance(post.id)===importanceFilter)
   &&(typeFilter==='all'||kind(post)===typeFilter)
   &&(!q||normalized([post.body,post.caption,post.title,userName(post)].join(' ')).includes(q)));
 }
 function postMedia(post,index,id){
  const images=[...new Set([...(Array.isArray(post.images)?post.images:[]),post.image_url].filter(Boolean))];
  const videos=[...new Set([post.video_url,...(Array.isArray(post.media_videos)?post.media_videos:[])].filter(Boolean))];
  const cover=post.video_cover_url||images[0]||'';
  if(!images.length&&!videos.length)return '';
  const videoHtml=videos.map((url,i)=>'<video class="buchee-saved-inline-video" controls playsinline preload="none"'+(i===0&&cover?' poster="'+esc(cover)+'"':'')+' src="'+esc(url)+'" aria-label="Kaydedilen video '+(i+1)+'"></video>').join('');
  const imageHtml=images.length?'<div class="buchee-saved-inline-images">'+images.map((url,i)=>'<button type="button" class="buchee-saved-photo-open" data-saved-action="'+(selecting?'toggle':'open')+'" data-id="'+id+'" aria-label="'+(selecting?'İçeriği seç':'Görseli gönderide aç')+'"><img src="'+esc(url)+'" alt="Kaydedilen görsel '+(i+1)+'" loading="'+(index<2?'eager':'lazy')+'" decoding="async"></button>').join('')+'</div>':'';
  return '<div class="buchee-saved-post-media">'+videoHtml+imageHtml+'</div>';
 }
 function tile(post,index){
  const id=esc(post.id),level=importance(post.id),checked=selected.has(post.id);
  const description=String(post.body||post.caption||post.title||'').trim();
  const record=saves().get(post.id);
  const expandedPost=expanded.has(post.id);
  const author=esc(userName(post));
  return '<article class="buchee-saved-item '+(checked?'is-selected':'')+'" data-kind="'+kind(post)+'" data-importance="'+level+'" role="listitem">'+
   '<div class="buchee-saved-post-top"><button type="button" class="buchee-saved-post-author" data-saved-action="'+(selecting?'toggle':'open')+'" data-id="'+id+'"><strong>'+author+'</strong><small>'+esc(dateShort(record?.created_at||post.created_at))+'</small></button>'+
   (selecting?'<button type="button" class="buchee-saved-post-check" data-saved-action="toggle" data-id="'+id+'" aria-pressed="'+checked+'">'+(checked?'✓ Seçildi':'○ Seç')+'</button>':'')+'</div>'+
   postMedia(post,index,id)+
   (description?'<div class="buchee-saved-post-copy"><p class="buchee-saved-description'+(expandedPost?'':' is-collapsed')+'" data-id="'+id+'">'+esc(description)+'</p>'+
    '<button type="button" class="buchee-saved-more" data-saved-action="expand" data-id="'+id+'" aria-expanded="'+expandedPost+'">'+(expandedPost?'Daha az':'Devam')+'</button></div>':'')+
   '<div class="buchee-saved-post-bottom"><span class="buchee-saved-post-kind">'+esc(label(post))+'</span>'+
   '<button type="button" class="buchee-saved-open" data-saved-action="'+(selecting?'toggle':'open')+'" data-id="'+id+'">'+(selecting?'Seç':'Gönderiyi aç')+'</button>'+
   '<button type="button" class="buchee-saved-priority" data-saved-action="priority" data-id="'+id+'" aria-label="Önem derecesi: '+levels[level].name+'. Değiştir" '+(selecting?'disabled':'')+'>'+
   '<span class="buchee-saved-priority-dot buchee-saved-'+level+'"></span><span>'+levels[level].name+'</span><span aria-hidden="true">⌄</span></button></div>'+
   '</article>';
 }
 function render(arg){
  if(arg)ctx=arg;
  if(!ctx?.me?.id)return;
  const root=document.getElementById('main-content');if(!root)return;
  const all=allSavedPosts(),list=visiblePosts(),missing=[...ctx.saved].filter(id=>!ctx.data.posts.some(p=>p.id===id));
  // Discard selections that are no longer saved.
  for(const id of selected)if(!ctx.saved.has(id))selected.delete(id);
  root.innerHTML='<section class="pati-saved-screen buchee-saved-library" aria-label="Kaydedilenler">'+
   '<header class="buchee-saved-header"><button type="button" class="pati-page-back buchee-saved-back" data-action="pati-page-back" aria-label="Geri">← Geri</button>'+
   '<h1>Kaydedilenler</h1><button type="button" class="buchee-saved-select-mode" data-saved-action="selection">'+(selecting?'Vazgeç':'Seç')+'</button></header>'+
   '<div class="buchee-saved-search-row"><label class="buchee-saved-search"><span aria-hidden="true">⌕</span>'+
   '<input type="search" id="buchee-saved-search" placeholder="Kaydedilenlerde ara" autocomplete="off" value="'+esc(query)+'" aria-label="Kaydedilen içeriklerde ara"></label></div>'+
   '<div class="buchee-saved-priority-filters" role="group" aria-label="Önem derecesi filtreleri">'+
   [['all','Tümü'],['green','Yeşil'],['orange','Turuncu'],['red','Kırmızı']].map(([level,name])=>
    '<button type="button" data-saved-action="importance-filter" data-level="'+level+'" class="'+(importanceFilter===level?'is-active':'')+'" aria-pressed="'+(importanceFilter===level)+'">'+(level==='all'?'':'<span class="buchee-saved-priority-dot buchee-saved-'+level+'"></span>')+name+'</button>').join('')+'</div>'+
   '<div class="buchee-saved-list-count">'+list.length+' kaydedilen içerik</div>'+
   (selecting?'<div class="buchee-saved-selectionbar"><span>'+selected.size+' içerik seçildi</span>'+
    '<button type="button" data-saved-action="select-all">'+(selected.size&&selected.size===list.length?'Seçimi kaldır':'Tümünü seç')+'</button>'+
    '<button type="button" class="is-destructive" data-saved-action="remove-selected" '+(selected.size?'':'disabled')+'>Listemden kaldır</button></div>':'')+
   (missing.length?'<div class="buchee-saved-loading" role="status">'+missing.length+' kayıt yükleniyor veya erişilemiyor. <button type="button" data-saved-action="refresh">Yeniden dene</button></div>':'')+
   (list.length?'<div class="buchee-saved-results is-list" role="list">'+list.map(tile).join('')+'</div>':
    '<div class="buchee-saved-empty"><span aria-hidden="true">▣</span><h2>'+(ctx.saved.size?'Bu filtrede içerik yok':'Henüz kayıtlı içerik yok')+'</h2>'+
    '<p>'+(ctx.saved.size?'Başka bir önem filtresi veya arama dene.':'Akıştan bir gönderi kaydederek burada görebilirsin.')+'</p>'+
    '<button type="button" data-saved-action="'+(ctx.saved.size?'reset':'back')+'">'+(ctx.saved.size?'Filtreleri temizle':'Akışa dön')+'</button></div>')+
   '</section>';
  root.querySelectorAll('.buchee-saved-description').forEach(p=>{
   const btn=p.nextElementSibling;
   if(btn&&btn.classList.contains('buchee-saved-more'))
    btn.hidden=(!expanded.has(p.dataset.id)&&p.scrollHeight<=p.clientHeight+2);
  });
  const key=ctx.me.id+'|'+missing.slice().sort().join(',');
  if(missing.length&&key!==lastFetchKey){lastFetchKey=key;void ctx.fetchMissingSavedPosts();}
 }
 function closeOverlay(){
  document.getElementById('buchee-saved-overlay')?.remove();choiceId=null;confirming=false;
 }
 function modalOpen(html,title){
  closeOverlay();
  const cover=document.createElement('div');cover.id='buchee-saved-overlay';cover.className='buchee-saved-overlay';
  cover.innerHTML='<div class="buchee-saved-scrim" data-saved-action="dismiss"></div>'+
   '<section class="buchee-saved-sheet" role="dialog" aria-modal="true" aria-label="'+esc(title)+'">'+html+'</section>';
  document.body.appendChild(cover);
  cover.querySelector('button')?.focus({preventScroll:true});
 }
 function openChoice(id){
  if(!ctx?.me?.id||!ctx.saved.has(id))return;
  const current=importance(id);
  choiceId=id;
  const content='<header><div><span>ÖNEM LİSTESİ</span><h2>Önem derecesini seç</h2></div><button type="button" data-saved-action="dismiss" aria-label="Kapat">×</button></header>'+
   '<p>Bu içeriğe yeniden ne zaman bakmak istiyorsun?</p>'+
   Object.entries(levels).map(([key,v])=>'<button type="button" class="buchee-saved-level-option" data-saved-action="assign" data-level="'+key+'" aria-pressed="'+(current===key)+'">'+
   '<span class="buchee-saved-priority-dot buchee-saved-'+key+'"></span><span><strong>'+v.name+'</strong><small>'+v.desc+'</small></span>'+
   (current===key?'<b aria-hidden="true">✓</b>':'')+'</button>').join('');
  modalOpen(content,'Önem derecesi');
  choiceId=id;
 }
 async function saveImportance(level){
  const id=choiceId,owner=ctx?.me?.id;
  if(busy||!id||!owner||!levels[level]||!ctx.saved.has(id))return;
  busy=true;
  const buttons=[...document.querySelectorAll('.buchee-saved-level-option')];buttons.forEach(b=>b.disabled=true);
  try{
   const r=await ctx.sb.from('post_saves').update({importance:level}).eq('user_id',owner).eq('post_id',id).select('post_id,importance').single();
   if(r.error)throw r.error;
   if(ctx?.me?.id!==owner)return;
   if(r.data?.post_id!==id||r.data.importance!==level)throw Error('Değişiklik doğrulanamadı.');
   const current=ctx.data.saves.find(x=>x.user_id===owner&&x.post_id===id);
   if(current)current.importance=level;
   closeOverlay();render();ctx.notify('Önem derecesi '+levels[level].name+' olarak güncellendi.');
  }catch(e){if(ctx?.me?.id===owner){ctx.notify('Kaydedilemedi: '+String(e?.message||e),true);buttons.forEach(b=>b.disabled=false)}}
  finally{busy=false}
 }
 function askRemove(){
  if(!selected.size||busy)return;
  confirming=true;
  modalOpen('<header><div><span>SEÇİLEN KAYITLAR</span><h2>Listemden kaldır</h2></div><button type="button" data-saved-action="dismiss" aria-label="Kapat">×</button></header>'+
   '<p><b>'+selected.size+'</b> kaydı listenizden kaldırmak üzeresiniz. Paylaşımların asılları silinmez.</p>'+
   '<div class="buchee-saved-confirm-actions"><button type="button" data-saved-action="dismiss">Vazgeç</button>'+
   '<button type="button" class="is-destructive" data-saved-action="confirm-remove">Kayıtlardan kaldır</button></div>','Kayıtlardan kaldır');
  confirming=true;
 }
 async function removeSelected(){
  if(!confirming||!selected.size||busy||!ctx?.me?.id)return;
  const uid=ctx.me.id,ids=[...selected].filter(id=>ctx.saved.has(id));
  if(!ids.length)return;
  busy=true;
  document.querySelectorAll('#buchee-saved-overlay button').forEach(b=>b.disabled=true);
  const removed=[];
  const reconcile=()=>{
   if(ctx?.me?.id!==uid)return;
   const gone=new Set(removed);
   for(const id of gone){ctx.saved.delete(id);selected.delete(id);}
   ctx.data.saves=ctx.data.saves.filter(x=>!(x.user_id===uid&&gone.has(x.post_id)));
  };
  try{
   for(let i=0;i<ids.length;i+=80){
    const batch=ids.slice(i,i+80);
    const r=await ctx.sb.from('post_saves').delete().eq('user_id',uid).in('post_id',batch).select('post_id');
    if(r.error)throw r.error;
    for(const row of r.data||[])removed.push(row.post_id);
   }
   if(ctx?.me?.id!==uid)return;
   if(!removed.length)throw Error('Hiçbir kayıt kaldırılamadı. Yetkilerini kontrol et.');
   reconcile();selecting=false;selected.clear();closeOverlay();
   ctx.rerender();ctx.notify(removed.length+' kayıt listenden kaldırıldı.');
  }catch(e){
   if(ctx?.me?.id===uid){
    if(removed.length)reconcile();
    closeOverlay();ctx.rerender();
    ctx.notify((removed.length?removed.length+' kayıt kaldırıldı; kalanlar işlenemedi. ':'')+
      'İşlem tamamlanamadı: '+String(e?.message||e),true);
   }
  }finally{busy=false}
 }
 function handleClick(event){
  const b=event.target.closest('[data-saved-action]');if(!b)return;
  const act=b.dataset.savedAction;
  if(busy&&act!=='dismiss')return;
  switch(act){
   case 'open':ctx?.openPost(b.dataset.id);break;
   case 'expand':{
    const id=b.dataset.id;
    if(expanded.has(id))expanded.delete(id);else expanded.add(id);
    const p=b.previousElementSibling;
    if(p?.classList.contains('buchee-saved-description')){
     p.classList.toggle('is-collapsed',!expanded.has(id));
     b.textContent=expanded.has(id)?'Daha az':'Devam';
     b.setAttribute('aria-expanded',String(expanded.has(id)));
    }
    break;
   }
   case 'priority':openChoice(b.dataset.id);break;
   case 'assign':void saveImportance(b.dataset.level);break;
   case 'dismiss':if(!busy)closeOverlay();break;
   case 'importance-filter':importanceFilter=b.dataset.level;selected.clear();render();break;
   case 'type-filter':typeFilter=b.dataset.type;selected.clear();render();break;
   case 'layout':layout=layout==='grid'?'list':'grid';render();break;
   case 'selection':selecting=!selecting;selected.clear();render();break;
   case 'toggle':if(selected.has(b.dataset.id))selected.delete(b.dataset.id);else selected.add(b.dataset.id);render();break;
   case 'select-all':{const shown=visiblePosts().map(x=>x.id);if(selected.size===shown.length)selected.clear();else {selected.clear();shown.forEach(id=>selected.add(id));}render();break;}
   case 'remove-selected':askRemove();break;
   case 'confirm-remove':void removeSelected();break;
   case 'reset':importanceFilter='all';typeFilter='all';query='';render();break;
   case 'back':ctx?.navigate('home');break;
   case 'refresh':lastFetchKey='';void ctx?.fetchMissingSavedPosts();break;
  }
 }
 document.addEventListener('click',handleClick);
 document.addEventListener('input',event=>{
  if(event.target.id!=='buchee-saved-search')return;
  const input=event.target;query=input.value;
  const start=input.selectionStart||0;
  render();
  const next=document.getElementById('buchee-saved-search');
  if(next){next.focus({preventScroll:true});try{next.setSelectionRange(start,start)}catch(e){}}
 });
 document.addEventListener('change',event=>{
  if(event.target.id==='buchee-saved-sort'){sort=event.target.value==='old'?'old':'new';render();}
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.getElementById('buchee-saved-overlay')&&!busy){closeOverlay();}
 });
 document.addEventListener('error',event=>{
  const img=event.target;
  if(!(img instanceof HTMLImageElement)||!img.closest('.buchee-saved-media'))return;
  const parent=img.parentElement;if(!parent||parent.dataset.bucheeError)return;
  parent.dataset.bucheeError='1';img.replaceWith(Object.assign(document.createElement('span'),{className:'buchee-saved-image-fallback',textContent:'Görsel yüklenemedi'}));
 },true);
 // Keep compatibility with every save button elsewhere in the app.
 window.PatiyizSavedV2={render,visiblePosts,choose(id,context){if(context)ctx=context;openChoice(id)}};
})();