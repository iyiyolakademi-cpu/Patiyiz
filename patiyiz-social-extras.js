/* Patiyiz Social Extras — staged Instagram-inspired features.
   Close-friends privacy uses RLS and permits TEXT posts only; public storage URLs
   are never presented as private uploads.  */
(function(){
 'use strict';
 const api={};
 const clean=s=>esc(String(s??''));
 const activeNote=id=>data.profileNotes.find(n=>n.author_id===id&&new Date(n.expires_at).getTime()>Date.now());
 const ownFriends=()=>data.closeFriends.filter(x=>x.owner_id===me.id);
 const collabs=id=>data.postCollabs.filter(c=>c.post_id===id&&c.status==='accepted');
 const userName=id=>profile(id)?.display_name||'Patiyiz üyesi';
 const refreshSocial=async()=>{
  await refresh();
 };
 function makeModal(title,markup,id,list=false){
  modal(title,markup,id);
  document.querySelector('#modal-root .modal')?.classList.add('pati-social-modal');
  if(list)document.querySelector('#modal-root .modal')?.classList.add('pati-social-list-modal');
 }
 function actionLabel(action,id,label,cls=''){
  return '<button type="button" class="'+cls+'" data-social-action="'+action+'" data-id="'+clean(id||'')+'">'+label+'</button>';
 }
 api.profileTools=()=>'<div class="pati-social-profile-tools">'+
  actionLabel('friends','','<span>⭐</span> Yakın Arkadaşlar')+
  actionLabel('note','','<span>💬</span> Profil notu')+
  actionLabel('collab-inbox','','<span>🤝</span> Ortak paylaşım davetleri'+(data.postCollabs.some(c=>c.collaborator_id===me.id&&c.status==='pending')?' <b class="pati-social-dot">Yeni</b>':'') )+
  actionLabel('insights','','<span>▥</span> İstatistikler')+'</div>';
 api.noteStrip=()=>{
  if(!me)return '';
  const notes=data.profileNotes.filter(n=>new Date(n.expires_at).getTime()>Date.now()&&!blocked.has(n.author_id)&&(n.author_id===me.id||followed.has(n.author_id)));
  if(!notes.length)return '';
  return '<div class="pati-social-notes-strip" aria-label="24 saatlik profil notları">'+
   notes.slice(0,16).map(n=>'<button type="button" data-social-action="'+(n.author_id===me.id?'note':'note-open')+'" data-id="'+clean(n.author_id)+'">'+avatar(profile(n.author_id),'s')+'<span><b>'+clean(userName(n.author_id))+'</b><small>'+clean(cut(n.body,48))+'</small></span>'+(n.audience==='close_friends'?'⭐':'')+'</button>').join('')+
   '</div>';
 };
 api.profileNote=p=>{
  const n=activeNote(p.id);if(!n)return '';
  return '<div class="pati-social-profile-note">'+(n.audience==='close_friends'?'⭐ ':'💭 ')+clean(n.body)+
   (p.id===me.id?' '+actionLabel('note','', 'Düzenle'):'')+'</div>';
 };
 api.collabLabel=postId=>{
  const c=collabs(postId).filter(c=>!blocked.has(c.collaborator_id));
  if(!c.length)return '';
  return '<span class="pati-social-collab-label"> · 🤝 '+c.slice(0,2).map(x=>clean(userName(x.collaborator_id))).join(', ')+'</span>';
 };
 api.collabProfilePosts=id=>{
  const ids=new Set(data.postCollabs.filter(c=>c.status==='accepted'&&c.collaborator_id===id).map(c=>c.post_id));
  return (data.posts||[]).filter(p=>ids.has(p.id)&&p.audience==='public'&&!blocked.has(p.author_id));
 };
 api.openFriends=()=>{
  const picks=data.profiles.filter(p=>p.id!==me.id&&!blocked.has(p.id))
   .sort((a,b)=>Number(ownFriends().some(f=>f.friend_id===b.id))-Number(ownFriends().some(f=>f.friend_id===a.id)))
   .slice(0,150);
  makeModal('⭐ Yakın Arkadaşlar','<p class="pati-social-help">Yalnızca seçtiğin kişiler özel metin gönderilerini ve yakın arkadaşlara açık notlarını görür. Fotoğraf ve video özel paylaşımı henüz desteklenmiyor.</p>'+
   '<div class="pati-social-user-list">'+picks.map(p=>{
    const selected=ownFriends().some(f=>f.friend_id===p.id);
    return '<div class="pati-social-user">'+avatar(p,'s')+'<span><b>'+clean(p.display_name)+'</b><small>@'+clean(p.handle)+'</small></span>'+
    actionLabel('friend-toggle',p.id,selected?'✓ Eklendi':'+ Ekle',selected?'active':'')+'</div>';
   }).join('')+'</div>','pati-social-friends',true);
 };
 api.openNote=()=>{
  const n=data.profileNotes.find(x=>x.author_id===me.id);
  makeModal('24 saatlik profil notu','<p class="pati-social-help">Not 24 saat boyunca takipçilerine ya da seçtiğin yakın arkadaşlarına görünür.</p>'+
   '<label class="pati-social-field">Ne düşünüyorsun? <textarea name="body" maxlength="100" required rows="3" placeholder="Bugün pati dostumla parktayız...">'+clean(n?.body||'')+'</textarea></label>'+
   '<label class="pati-social-field">Kimler görsün?<select name="audience"><option value="followers"'+(n?.audience!=='close_friends'?' selected':'')+'>Takipçilerim</option><option value="close_friends"'+(n?.audience==='close_friends'?' selected':'')+'>⭐ Yakın Arkadaşlar</option></select></label>'+
   (n?actionLabel('note-delete','','Notu sil','pati-social-danger'):''),
   'pati-social-note');
 };
 api.openNoteInfo=id=>{
  const n=activeNote(id);if(!n)return notify('Notun süresi dolmuş.');
  makeModal(userName(id)+' · Not','<p class="pati-social-note-body">'+clean(n.body)+'</p>'+
   '<p class="pati-social-help">24 saatlik not'+(n.audience==='close_friends'?' · ⭐ Yakın Arkadaşlar':'')+'</p>',
   'pati-social-note-read',true);
 };
 api.openCollabInvite=postId=>{
  const p=data.posts.find(x=>x.id===postId);
  if(!p||p.author_id!==me.id||p.audience!=='public')return notify('Yalnızca kendi herkese açık gönderine ortak davet edebilirsin.',true);
  const existing=new Set(data.postCollabs.filter(c=>c.post_id===postId).map(c=>c.collaborator_id));
  const choices=data.profiles.filter(u=>u.id!==me.id&&!blocked.has(u.id)&&followed.has(u.id)&&!existing.has(u.id)).slice(0,100);
  makeModal('🤝 Ortak paylaşım daveti','<p class="pati-social-help">Takip ettiğin bir kişiyi davet et. Kabul ederse gönderi her iki profilde görünür. Davet otomatik kabul edilmez.</p>'+
   '<div class="pati-social-user-list">'+(choices.length?choices.map(u=>'<div class="pati-social-user">'+avatar(u,'s')+'<span>'+clean(u.display_name)+'</span>'+
    actionLabel('collab-invite',u.id,'Davet et','pati-social-invite')+'</div>').join(''):'<p>Yeni davet gönderebileceğin takip ettiğin kullanıcı bulunamadı.</p>')+'</div>',
   'pati-social-invites',true);
  const node=document.querySelector('#pati-social-invites');if(node)node.dataset.post=postId;
 };
 api.openCollabInbox=()=>{
  const list=data.postCollabs.filter(c=>c.collaborator_id===me.id&&c.status==='pending');
  makeModal('🤝 Ortak paylaşım davetleri',list.length?list.map(c=>{
   const p=data.posts.find(x=>x.id===c.post_id);
   return '<div class="pati-social-invitation"><strong>'+clean(userName(c.invited_by))+'</strong> seni bir gönderisine ortak olmaya davet etti.'+
   (p?'<p>'+clean(cut(p.body||'Fotoğraf veya video',130))+'</p>':'')+
   actionLabel('collab-accept',c.post_id,'✓ Kabul et')+' '+actionLabel('collab-decline',c.post_id,'Reddet','pati-social-danger')+'</div>';
  }).join(''):'<p class="pati-social-help">Şu an bekleyen ortak paylaşım davetin yok.</p>','pati-social-inbox',true);
 };
 api.openInsights=async()=>{
  const uid=me.id,posts=data.posts.filter(p=>p.author_id===uid),ids=posts.map(p=>p.id);
  makeModal('▥ İçerik istatistiklerim','<p class="pati-social-help">Görüntülenme ve etkileşimler yükleniyor…</p>',
   'pati-social-insights',true);
  if(!ids.length){document.querySelector('#pati-social-insights .modal-content').innerHTML='<p class="pati-social-help">Henüz paylaşımın yok.</p>';return}
  try{
   const results=await Promise.all([
    sb.from('patiyiz_post_view_totals').select('post_id,view_count').in('post_id',ids.slice(0,150)),
    sb.from('post_likes').select('post_id').in('post_id',ids.slice(0,150)),
    sb.from('comments').select('post_id').in('post_id',ids.slice(0,150))
   ]);
   if(me?.id!==uid)return;
   const views=results[0].error?[]:results[0].data||[];
   const likes=results[1].error?[]:results[1].data||[];
   const comments=results[2].error?[]:results[2].data||[];
   const vMap=new Map(views.map(v=>[v.post_id,Number(v.view_count)||0]));
   const total=ids.reduce((a,id)=>a+(vMap.get(id)||0),0);
   const sumLikes=likes.length,sumComments=comments.length;
   const followers=data.follows.filter(f=>f.followee_id===uid).length;
   const cards=[['Görüntülenme',total],['Beğeni',sumLikes],['Yorum',sumComments],['Takipçi',followers]];
   const top=[...posts].sort((a,b)=>(vMap.get(b.id)||0)-(vMap.get(a.id)||0)).slice(0,8);
   const body='<div class="pati-social-insights-grid">'+cards.map(([label,value])=>'<div><strong>'+Number(value).toLocaleString('tr-TR')+'</strong><small>'+label+'</small></div>').join('')+'</div>'+
    '<h4>Gönderi performansı</h4><div class="pati-social-insights-list">'+top.map(p=>'<div><span>'+clean(cut(p.body||'Medya paylaşımı',65))+'</span><b>◉ '+(vMap.get(p.id)||0).toLocaleString('tr-TR')+'</b></div>').join('')+'</div>'+
    '<p class="pati-social-help">Bunlar Patiyiz veritabanında kayıtlı sayılardır; video izleme süresi veya tahmini erişim değildir. Bir bölüme erişim hatası olursa sayı eksik kalabilir.</p>';
   const content=document.querySelector('#pati-social-insights .modal-content');if(content)content.innerHTML=body;
  }catch(error){const content=document.querySelector('#pati-social-insights .modal-content');if(content)content.textContent='İstatistikler getirilemedi: '+String(error?.message||error)}
 };
 api.handleAction=async(action,id,button)=>{
  if(!me)return;
  try{
   switch(action){
    case 'friends':return api.openFriends();
    case 'note':return api.openNote();
    case 'note-open':return api.openNoteInfo(id);
    case 'collab-inbox':return api.openCollabInbox();
    case 'insights':return api.openInsights();
    case 'collab-open':return api.openCollabInvite(id);
    case 'friend-toggle':{
     if(id===me.id)throw Error('Kendini ekleyemezsin.');
     const was=ownFriends().some(f=>f.friend_id===id);
     const req=was?sb.from('patiyiz_close_friends').delete().eq('owner_id',me.id).eq('friend_id',id):
      sb.from('patiyiz_close_friends').insert({owner_id:me.id,friend_id:id});
     const r=await req;if(r.error)throw r.error;
     if(was)data.closeFriends=data.closeFriends.filter(f=>!(f.owner_id===me.id&&f.friend_id===id));
     else data.closeFriends.push({owner_id:me.id,friend_id:id});
     button.textContent=was?'+ Ekle':'✓ Eklendi';button.classList.toggle('active',!was);
     notify(was?'Yakın Arkadaşlardan çıkarıldı.':'Yakın Arkadaşlara eklendi.');return;
    }
    case 'note-delete':{
     const r=await sb.from('patiyiz_profile_notes').delete().eq('author_id',me.id);
     if(r.error)throw r.error;
     data.profileNotes=data.profileNotes.filter(x=>x.author_id!==me.id);closeModal(true);render();notify('Notun silindi.');return;
    }
    case 'collab-invite':{
     const postId=button.closest('form')?.dataset.post;
     if(!postId)throw Error('Gönderi bulunamadı.');
     const r=await sb.from('patiyiz_post_collabs').insert({post_id:postId,collaborator_id:id,invited_by:me.id,status:'pending'});
     if(r.error)throw r.error;
     data.postCollabs.push({post_id:postId,collaborator_id:id,invited_by:me.id,status:'pending'});
     button.textContent='Davet gönderildi';button.disabled=true;notify('Ortak paylaşım daveti gönderildi.');return;
    }
    case 'collab-accept':
    case 'collab-decline':{
     const r=await sb.from('patiyiz_post_collabs').update({status:action==='collab-accept'?'accepted':'declined',responded_at:new Date().toISOString()})
      .eq('post_id',id).eq('collaborator_id',me.id).eq('status','pending').select('post_id,collaborator_id,status').single();
     if(r.error)throw r.error;
     const c=data.postCollabs.find(x=>x.post_id===id&&x.collaborator_id===me.id);if(c)c.status=r.data.status;
     api.openCollabInbox();notify(action==='collab-accept'?'Ortak paylaşım kabul edildi.':'Davet reddedildi.');return;
    }
   }
  }catch(error){notify(friendly(error),true)}
 };
 document.addEventListener('click',e=>{
  const el=e.target.closest?.('[data-social-action]');if(!el)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
  api.handleAction(el.dataset.socialAction,el.dataset.id,el);
 },true);
 document.addEventListener('submit',async e=>{
  const form=e.target;if(form.id!=='pati-social-note')return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
  const body=String(form.querySelector('[name="body"]')?.value||'').trim();
  const audience=form.querySelector('[name="audience"]')?.value;
  if(!body||body.length>100||!['followers','close_friends'].includes(audience))return notify('Not 1–100 karakter olmalı.',true);
  if(form.dataset.saving)return;
  form.dataset.saving='true';
  try{
   const n={author_id:me.id,body,audience,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()};
   const r=await sb.from('patiyiz_profile_notes').upsert(n,{onConflict:'author_id'}).select('*').single();
   if(r.error)throw r.error;
   data.profileNotes=[r.data,...data.profileNotes.filter(x=>x.author_id!==me.id)];
   closeModal(true);render();notify('Notun 24 saatliğine yayınlandı.');
  }catch(error){notify(friendly(error),true)}
  finally{delete form.dataset.saving}
 },true);
 window.PatiyizSocial=api;
})();
