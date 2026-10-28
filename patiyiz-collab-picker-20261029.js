/* Patiyiz — interactive, account-verified collaborator picker.
   Use the authenticated profiles RLS; never trust a free-typed username as a collaborator.
   Accessible suggestion buttons work with touch, mouse and keyboard. */
(function(){
 'use strict';
 const HIGHLIGHT_MAX=10, SEARCH_DELAY=230;
 function normal(v){return String(v||'').trim().replace(/^@/,'').toLocaleLowerCase('tr-TR')}
 function safeQuery(v){return normal(v).replace(/[^\p{L}\p{N}._ -]/gu,'').slice(0,35).trim()}
 function makeMarkup(inputId){
  const resultsId=inputId+'-results',hintId=inputId+'-hint';
  return '<div class="pati-collab-picker" data-pati-collab-picker>'+
    '<label for="'+inputId+'">Ortak paylaşım için kullanıcı seç'+(inputId==='collab-handle'?'':' (isteğe bağlı)')+'</label>'+
    '<input type="search" id="'+inputId+'" name="collab_handle" maxlength="40" placeholder="Kullanıcı adı veya isim ara" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="'+resultsId+'" aria-describedby="'+hintId+'">'+
    '<input type="hidden" name="collab_user_id" value="">'+
    '<div class="pati-collab-search-results" id="'+resultsId+'" role="listbox" aria-label="Ortak seçilecek profiller" hidden></div>'+
    '<div class="pati-collab-selected" aria-live="polite" hidden></div>'+
    '<small id="'+hintId+'" class="pati-collab-hint">Kullanıcı adını yaz, çıkan profiller arasından doğru kişiyi seç. Davet kabul edilirse gönderi iki profilde görünür.</small>'+
   '</div>';
 }
 function mount(form,options){
  if(!form||!options?.sb||!options.userId)return;
  const wrap=form.querySelector('[data-pati-collab-picker]');
  if(!wrap||wrap.dataset.mounted==='true')return;
  wrap.dataset.mounted='true';
  const input=wrap.querySelector('input[name="collab_handle"]');
  const idField=wrap.querySelector('input[name="collab_user_id"]');
  const results=wrap.querySelector('.pati-collab-search-results');
  // On mobile iOS, a touch can blur the input before the click is dispatched.
  // Capture the approval at pointer/touch start so the result cannot vanish first.
  const selected=wrap.querySelector('.pati-collab-selected');
  let sequence=0,timer=null,items=[],active=-1,approving=false;
  const knownProfiles=new Map();
  const escape=options.escape||((v)=>String(v));
  const filter=profiles=>[...new Map(profiles.filter(p=>p&&p.id&&p.id!==options.userId&&!options.blocked?.has(p.id)&&p.handle).map(p=>[p.id,p])).values()]
   .sort((a,b)=>Number(String(b.handle).toLocaleLowerCase('tr-TR').startsWith(safeQuery(input.value))) - Number(String(a.handle).toLocaleLowerCase('tr-TR').startsWith(safeQuery(input.value))) || String(a.handle).localeCompare(String(b.handle),'tr'));
  const clearSelection=()=>{idField.value='';wrap.dataset.selectedHandle='';selected.hidden=true;selected.innerHTML=''};
  const reset=()=>{clearSelection();sequence++;if(timer)clearTimeout(timer);items=[];active=-1;results.innerHTML='';results.hidden=true;input.setAttribute('aria-expanded','false')};
  const resultMarkup=()=>{
   for(const p of items)knownProfiles.set(p.id,p);
   results.innerHTML=items.map((p,i)=>'<div class="pati-collab-option'+(i===active?' is-highlighted':'')+'">'+
    '<span class="pati-collab-avatar">'+(options.avatar?options.avatar(p,'s'):'<span class="avatar">🐾</span>')+'</span>'+
    '<span class="pati-collab-user"><strong>'+escape(p.display_name||p.handle)+'</strong><small>@'+escape(p.handle)+'</small></span>'+
    '<button type="button" role="option" data-pati-approve-id="'+escape(p.id)+'" aria-selected="'+(i===active?'true':'false')+'" class="pati-collab-approve" aria-label="'+escape(p.handle)+' hesabını ortak olarak onayla">Onayla</button></div>').join('');
   if(!items.length)results.innerHTML='<p class="pati-collab-no-result" role="status">Bu aramaya uygun profil bulunamadı.</p>';
   results.hidden=false;input.setAttribute('aria-expanded','true');
  };
  const choose=p=>{
   if(!p?.id||p.id===options.userId||options.blocked?.has(p.id))return false;
   approving=true;
   // The query can be just a fragment; the confirmed handle and UUID replace it.
   input.value='@'+String(p.handle||'');
   idField.value=p.id;wrap.dataset.selectedHandle=normal(p.handle);
   selected.hidden=false;
   selected.innerHTML='<span class="pati-collab-picked-avatar">'+(options.avatar?options.avatar(p,'s'):'🐾')+'</span>'+
    '<span class="pati-collab-picked-text"><strong>'+escape(p.display_name||p.handle)+'</strong><small>@'+escape(p.handle)+' · Seçildi</small></span>'+
    '<button type="button" class="pati-collab-unselect" aria-label="Ortak kullanıcı seçimini kaldır">×</button>';
   results.hidden=true;results.innerHTML='';input.setAttribute('aria-expanded','false');
   items=[];active=-1;sequence++;
   input.blur?.();
   approving=false;
   return true;
  };
  const search=async()=>{
   const q=safeQuery(input.value),seq=++sequence;
   if(!q||idField.value){results.hidden=true;input.setAttribute('aria-expanded','false');return}
   const local=filter((options.localProfiles||[]).filter(p=>normal(p.handle).includes(q)||normal(p.display_name).includes(q))).slice(0,HIGHLIGHT_MAX);
   items=local;active=-1;
   if(local.length)resultMarkup();
   else{results.innerHTML='<p class="pati-collab-searching" role="status">Profiller aranıyor…</p>';results.hidden=false;input.setAttribute('aria-expanded','true')}
   if(q.length<2){if(!local.length){results.innerHTML='<p class="pati-collab-searching" role="status">Bir harf daha yazabilir veya aramaya devam edebilirsin.</p>'}return}
   try{
    // Match fragments anywhere in the username/display name, not just prefixes.
    // Escape LIKE wildcards in user input so underscores are treated literally.
    const pattern='%'+q.replace(/[\\%_]/g,c=>'\\'+c)+'%';
    const [byHandle,byName]=await Promise.all([
     options.sb.from('profiles').select('id,handle,display_name,avatar_url,is_verified').ilike('handle',pattern).limit(HIGHLIGHT_MAX),
     options.sb.from('profiles').select('id,handle,display_name,avatar_url,is_verified').ilike('display_name',pattern).limit(HIGHLIGHT_MAX)
    ]);
    if(seq!==sequence||!wrap.isConnected||idField.value||safeQuery(input.value)!==q)return;
    if(byHandle.error&&byName.error)throw byHandle.error;
    items=filter([...local,...(byHandle.data||[]),...(byName.data||[])]).slice(0,HIGHLIGHT_MAX);
    active=-1;resultMarkup();
   }catch(error){
    if(seq!==sequence||!wrap.isConnected)return;
    if(!items.length)results.innerHTML='<p class="pati-collab-no-result" role="status">Arama yapılamadı. Tekrar deneyebilirsin.</p>';
    console.warn('Ortak profili aranamadı:',error?.message||error);
   }
  };
  input.addEventListener('input',()=>{
   clearSelection();if(timer)clearTimeout(timer);
   sequence++;items=[];active=-1;
   results.hidden=!safeQuery(input.value);input.setAttribute('aria-expanded',String(!results.hidden));
   results.innerHTML=results.hidden?'':'<p class="pati-collab-searching" role="status">Profiller aranıyor…</p>';
   timer=setTimeout(search,SEARCH_DELAY);
  });
  input.addEventListener('keydown',event=>{
   if(event.key==='Escape'){results.hidden=true;input.setAttribute('aria-expanded','false');return}
   if(!items.length)return;
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();active=(active+(event.key==='ArrowDown'?1:items.length-1))%items.length;resultMarkup();
    results.querySelectorAll('[role="option"]')[active]?.scrollIntoView({block:'nearest'});return;
   }
   if(event.key==='Enter'&&active>=0){event.preventDefault();choose(items[active])}
  });
  const approveFromEvent=event=>{
   const approve=event.target?.closest?.('button[data-pati-approve-id]');
   if(!approve||!results.contains(approve))return false;
   const p=knownProfiles.get(approve.dataset.patiApproveId);
   if(!p)return false;
   event.preventDefault?.();
   event.stopPropagation?.();
   choose(p);
   return true;
  };
  // pointerdown precedes focusout on modern iOS/Android and desktop.
  // touchstart covers older iOS. Click/keyboard activation remains a fallback.
  results.addEventListener('pointerdown',approveFromEvent);
  results.addEventListener('touchstart',approveFromEvent,{passive:false});
  results.addEventListener('click',approveFromEvent);
  selected.addEventListener('click',event=>{
   if(!event.target.closest('.pati-collab-unselect'))return;
   input.value='';reset();input.focus();
  });
  wrap.addEventListener('focusout',event=>{
   if(approving||results.contains(event.relatedTarget)||wrap.contains(event.relatedTarget))return;
   // An iOS keyboard dismissal often reports relatedTarget=null during a tap.
   // Don't remove clickable results until after the touch/click has completed.
   window.setTimeout(()=>{
    if(approving||selected.hidden===false)return;
    if(wrap.contains(document.activeElement))return;
    results.hidden=true;input.setAttribute('aria-expanded','false');
   },280);
  });
  wrap.dataset.selectedHandle='';
 }
 function selectedId(form,required=false){
  const wrap=form?.querySelector('[data-pati-collab-picker]');
  const input=wrap?.querySelector('input[name="collab_handle"]');
  const selected=wrap?.querySelector('input[name="collab_user_id"]');
  if(!wrap||!input)return '';
  const typed=normal(input.value),id=selected?.value||'';
  if(!typed&&!required)return '';
  if(!typed||!id||typed!==wrap.dataset.selectedHandle)throw new Error('Ortak paylaşım için çıkan profillerden bir kullanıcı seçmelisin.');
  return id;
 }
 window.PatiyizCollabPicker=Object.freeze({makeMarkup,mount,selectedId,normal});
})();
