/* Patiyiz — GitHub Pages + Supabase, gerçek veri kullanan başlangıç sürümü */
(()=>{'use strict';
const $=s=>document.querySelector(s), main=$('#main-content'), rail=$('#right-rail'), authRoot=$('#auth-root'), appRoot=$('#app-root');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=d=>d?new Date(d).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):'';
const day=d=>d?new Date(d).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'}):'';
const cut=(s,n=80)=>String(s||'').length>n?String(s).slice(0,n)+'…':String(s||'');
const ico=(name)=>{const aliases={'message-circle':'comment','volume-x':'volume-x','volume':'volume','mic':'mic','trash-2':'trash','check-check':'check','message-square':'comment','user-plus':'user','smartphone':'user','heart-handshake':'heart','flag':'alert','pencil':'edit','play-circle':'up'};return `<svg class="icon" aria-hidden="true"><use href="#i-${aliases[name]||name}"></use></svg>`};
const button=(label,action,extra='',cls='soft-btn')=>`<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const empty=(title,desc='Henüz bir şey bulunamadı.')=>`<div class="empty"><strong>${esc(title)}</strong>${esc(desc)}</div>`;
const allowed=['home','explore','pets','reels','rewards','shop','community','knowledge','education','lost','adoption','care','wellness','messages','notifications','profile','blocked','settings','follows-list'];
const nav=[['home','Ana sayfa','home'],['explore','Keşfet','compass'],['pets','Patiler','heart'],['rewards','PatiCoin','paw'],['shop','Pati Mağaza','grid'],['reels','Reels','up'],['community','Topluluk','users'],['knowledge','Bilgi Merkezi','library'],['education','Eğitim','library'],['lost','Kayıp İlanları','location'],['adoption','Sahiplendirme','heart'],['care','Bakım Takvimi','calendar'],['wellness','Hayvan Sağlığı','heart'],['messages','Mesajlar','message'],['notifications','Bildirimler','bell'],['profile','Profilim','user'],['settings','Ayarlar ve Gizlilik','settings']];
const cfg=window.PATIYIZ_CONFIG||{};
const ready=String(cfg.supabaseUrl||'').startsWith('https://')&&!String(cfg.supabaseUrl).includes('BURAYA_')&&!!cfg.supabasePublishableKey&&!String(cfg.supabasePublishableKey).includes('BURAYA_')&&!!window.supabase?.createClient;
let liveChannel=null,liveReloadTimer=null,liveReconnectTimer=null,liveUserId=null,liveInitialized=false,pushPublicKey='',lastForegroundSync=0;
let communityCategory='Tümü',careFilter='all',followReturnList=false,blockedProfiles=[];let lastDetailView='',mobileKeyboardOpen=false;let mobileChatOpen=false,chatFilter='primary',profilePostsTab='media';let followListId='',followListMode='followers',phonePushActive=null;let sb,me,view='home',articleId='',personId='',profileId='',selectedPostId='',exploreTab='media',exploreAnimal='Tümü',exploreSort='latest',kbFilter='Tümü',kbSearch='',search='',authMode='login',busy=false;
let postCropX=.5,postCropY=.5,postCropRatio='4:5',postCropZoom=1,postCropObjectUrl='',dmMediaSending=false,postCropIndex=0;
let isAdmin=false;let pageLimits={posts:100,messages:150,notifications:150};let pageMore={posts:true,messages:true,notifications:true};let data={profiles:[],pets:[],posts:[],likes:[],saves:[],comments:[],commentLikes:[],follows:[],questions:[],replies:[],votes:[],lost:[],care:[],messages:[],notifications:[],bookmarks:[],blocks:[],adoption:[],messageHidden:[],stories:[],storyResponses:[],reposts:[],pins:[],highlightAlbums:[],highlightItems:[]};
let favorites=new Set(), followed=new Set(),liked=new Set(),saved=new Set(),voted=new Set(),blocked=new Set();
let patiyizLoadedTables=new Set(),patiyizDeferredLoading=null,patiyizLoadToken=0;
let likesChangeEpoch=0;const pendingPostLikes=new Set();
const notify=(msg,bad=false)=>{const host=$('#toasts');const el=document.createElement('div');el.className='pati-toast'+(bad?' error':'');el.textContent=msg;host.append(el);setTimeout(()=>el.remove(),4000)};
const friendly=e=>{const m=String(e?.message||e||'İşlem başarısız.');if(/Failed to fetch|NetworkError|network request failed|fetch failed/i.test(m))return 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.';if(/JWT expired|Invalid JWT|session expired/i.test(m))return 'Oturumun süresi doldu. Yeniden giriş yapmalısın.';if(/permission denied|row-level security policy/i.test(m))return 'Bu işlem için yetkin yok veya ilgili kayıt artık kullanılamıyor.';if(/Invalid login credentials/i.test(m))return 'E-posta veya şifre hatalı.';if(/Email not confirmed/i.test(m))return 'E-posta adresinizi gelen kutunuzdan doğrulayın.';if(/User already registered/i.test(m))return 'Bu e-posta zaten kayıtlı.';if(/Password should/i.test(m))return 'Şifreniz en az 6 karakter olmalı.';if(/questions_title_check/i.test(m))return 'Soru başlığı en az 5, en fazla 150 karakter olmalı.';if(/questions_body_check/i.test(m))return 'Soru açıklaması en az 5, en fazla 2000 karakter olmalı.';return m};
const run=async(fn,success)=>{if(busy)return;busy=true;try{await fn();if(success)notify(success)}catch(e){console.error(e);notify(friendly(e),true)}finally{busy=false}};
const profile=id=>data.profiles.find(p=>p.id===id)||{id,display_name:'Patiyiz üyesi',handle:'üye',bio:'',city:''};
const current=()=>profile(me?.id);
const verifiedBadge=p=>p?.is_verified?'<span class="pati-verified pati-verified-blue" role="img" aria-label="Doğrulanmış hesap" title="Doğrulanmış hesap"><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 1.6 14.8 3l3.12-.13 1.04 2.94L21.7 7.5l-.67 3.05 1.07 2.93-2.5 1.96-.64 3.09-3.15.32L12 21.1l-2.81-2.25-3.15-.32-.64-3.09-2.5-1.96 1.07-2.93L3.3 7.5l2.74-1.69 1.04-2.94L10.2 3Z" fill="#2196f3"/><path d="m7.55 11.8 2.9 2.85 5.95-6.05" fill="none" stroke="#fff" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"/></svg></span>':'';
const displayName=p=>esc(p?.display_name||'Patiyiz üyesi')+verifiedBadge(p);
const displayUser=id=>displayName(profile(id));
const avatar=(p,s='m')=>`<span class="avatar ${s}">${p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:esc((p.display_name||'P').slice(0,1).toUpperCase())}</span>`;
const petIcon=s=>({'Kedi':'🐱','Köpek':'🐶','Kuş':'🦜','Tavşan':'🐰','Balık':'🐠','Kemirgen':'🐹'}[s]||'🐾');
const photo=(url,fallback='🐾',priority=false)=>`<div class="pati-photo">${url?`<img src="${esc(url)}" alt="Hayvan fotoğrafı" loading="${priority===true?'eager':'lazy'}" decoding="async" ${priority===true?'fetchpriority="high"':'fetchpriority="low"'}>`:fallback}</div>`;
// Keep the branded opening screen visible for at least 2 seconds on initial launch.
const patiyizSplashStartedAt=performance.now();
let patiyizSplashExitTimer=null;
const starter=()=>{
  const startup=$('#startup');
  if(!startup||startup.classList.contains('hidden')||patiyizSplashExitTimer!==null)return;
  const remaining=Math.max(0,2000-(performance.now()-patiyizSplashStartedAt));
  if(remaining===0){startup.classList.add('hidden');return}
  patiyizSplashExitTimer=setTimeout(()=>{
    startup.classList.add('hidden');
    patiyizSplashExitTimer=null;
  },remaining);
};
const showSetup=()=>{starter();authRoot.classList.remove('hidden');authRoot.innerHTML=`<div class="auth-card setup-card"><div class="auth-brand"><div class="brand-icon"><img class="patiyiz-chosen-logo" src="patiyiz-selected-logo.svg?v=20261024-new-p-logo-1" alt="Patiyiz"></div><h1>Patiyiz</h1></div><h2>Kurulum gerekli</h2><p class="auth-sub">Uygulamanın güvenli kayıt sistemi için önce Supabase projesi oluşturulmalı.</p><p class="small-note">1. Supabase projesi oluşturun.<br>2. supabase_kurulum.sql dosyasını SQL Editor'da çalıştırın.<br>3. <b>config.js</b> dosyasına <b>Project URL</b> ve <b>publishable key</b> girin.<br>4. Dosyaları GitHub Pages'e yükleyin.<br><b>Secret/service_role anahtarını kesinlikle bu dosyaya koymayın.</b></p></div>`};
function showAuth(msg='') {starter();appRoot.classList.add('hidden');authRoot.classList.remove('hidden');let isSign=authMode==='signup',reset=authMode==='reset';authRoot.innerHTML=`<div class="auth-shell"><aside class="auth-story" aria-label="Patiyiz topluluğu"><div class="auth-story-top"><span class="auth-story-icon" aria-hidden="true"><svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><ellipse cx="13" cy="19" rx="6" ry="9" transform="rotate(-22 13 19)"/><ellipse cx="27" cy="11" rx="6" ry="9" transform="rotate(-7 27 11)"/><ellipse cx="43" cy="14" rx="6" ry="9" transform="rotate(15 43 14)"/><ellipse cx="54" cy="27" rx="5" ry="8" transform="rotate(32 54 27)"/><path d="M33 26c-6-1-9 5-14 10-5 4-10 10-7 17 3 8 11 7 19 4 4-2 9-1 14 1 9 3 16-2 13-10-2-6-8-10-12-15-4-5-7-7-13-7Z"/></svg></span><strong>patiyiz</strong><span class="auth-story-topline">BİRLİKTE DAHA GÜZEL</span></div><div class="auth-story-bottom"><span class="auth-story-label"><span class="auth-story-dot"></span> HAYVANSEVERLERİN DÜNYASI</span><h2>Onların hikâyesi,<br><em>bizim dünyamız.</em></h2><p>Patili dostlarınla anılarını paylaş, yeni arkadaşlıklar kur ve merak ettiklerini keşfet.</p></div></aside><div class="auth-pane"><div class="auth-card"><div class="auth-brand"><div class="brand-icon auth-matching-logo" aria-label="Patiyiz logosu"><img class="patiyiz-chosen-logo" src="patiyiz-selected-logo.svg?v=20261024-new-p-logo-1" alt="Patiyiz"></div><div><h1>patiyiz</h1><p>Hayvanseverlerin buluşma noktası</p></div></div>${reset?'':`<div class="auth-tabs"><button data-auth="login" class="${authMode==='login'?'active':''}">Giriş yap</button><button data-auth="signup" class="${isSign?'active':''}">Kayıt ol</button></div>`}<div class="auth-eyebrow">🐾 PATİYİZ'E HOŞ GELDİN</div><h2>${reset?'Şifreni yenileyelim':isSign?'Aramıza katıl':'Yeniden merhaba!'}</h2><p class="auth-sub">${reset?'E-posta adresini yaz, sana şifre yenileme bağlantısı gönderelim.':isSign?'Patili dostunla yeni bir dünyaya adım at. Üyelik ücretsiz.':'Patili dostların ve güzel hikâyeler burada seni bekliyor.'}</p>${msg?`<div class="pati-note">${esc(msg)}</div>`:''}<form id="auth-form">${isSign?`<div class="pati-field"><label for="display_name">Adın</label><input id="display_name" name="display_name" required minlength="2" maxlength="70" autocomplete="name" placeholder="Ad ve soyad"></div>`:''}<div class="pati-field"><label for="email">E-posta</label><input id="email" name="email" type="email" required autocomplete="email" placeholder="ornek@eposta.com"></div>${reset?'':`<div class="pati-field"><label for="password">Şifre</label><input id="password" name="password" type="password" required minlength="6" autocomplete="${isSign?'new-password':'current-password'}" placeholder="Şifreni gir"></div>`}<span class="pati-auth-terms">${isSign?'<label><input name="age_accepted" type="checkbox" value="yes" required> 18 yaşını doldurduğumu onaylıyorum.</label><label><input name="terms_accepted" type="checkbox" value="yes" required> <a href="terms.html" target="_blank" rel="noopener">Kullanım Şartlarını</a> ve <a href="privacy.html" target="_blank" rel="noopener">Gizlilik Politikasını</a> okudum, kabul ediyorum.</label>':'<a href="privacy.html" target="_blank" rel="noopener">Gizlilik Politikası</a> · <a href="terms.html" target="_blank" rel="noopener">Kullanım Şartları</a>'}</span><button class="primary-btn auth-submit" type="submit"><span>${reset?'Sıfırlama bağlantısı gönder':isSign?'Ücretsiz hesap oluştur':'Giriş yap'}</span><span aria-hidden="true">→</span></button></form><div class="auth-bottom"><button class="btn-link" data-auth="${reset?'login':'reset'}">${reset?'← Girişe dön':'Şifremi unuttum'}</button></div><p class="small-note"><span aria-hidden="true">🔒</span> E-posta doğrulama ve güvenli giriş. Gelen kutunu, gerekirse spam klasörünü kontrol et.</p></div></div></div>`}
async function checkAdmin(){if(!me||!sb){isAdmin=false;return}try{const {data,error}=await sb.rpc('patiyiz_is_admin');isAdmin=!error&&data===true}catch(e){isAdmin=false}if(!appRoot.classList.contains('hidden')){navRender();if(view==='settings')render()}}
function showApp(){starter();if(me)window.setTimeout(()=>patiInviteLoad(),1700);if(me){window.setTimeout(()=>patiPublicActivityInit(),750);window.setTimeout(()=>patiWellnessFetch(true),1300)}if(me)window.setTimeout(()=>patiCoinSync(true),1600);if(me)window.setTimeout(()=>educationCloudLoad(),1200);authRoot.classList.add('hidden');appRoot.classList.remove('hidden');navigate(view);startLive();routePendingNotification();checkAdmin();
 if(!patiyizDeferredLoading){
  const userId=me.id;
  const signature=()=>data.posts.map(x=>x.id).join(',')+'|'+data.stories.map(x=>x.id).join(',');
  const redraw=(before,force=false)=>{
   if(me?.id!==userId)return;
   navRender();
   if(document.activeElement?.matches?.('input,textarea,[contenteditable]'))return;
   if(view==='home'){
    if(force||signature()!==before||!patiyizLoadedTables.has('posts')||!patiyizLoadedTables.has('patiyiz_stories')){
     const y=window.scrollY;render();requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'}));
    }
   }else if(view!=='reels')render();
  };
  patiyizDeferredLoading=new Promise(resolve=>setTimeout(resolve,250)).then(async()=>{
   if(me?.id!==userId)return;
   const initial=signature();
   await load('feed');redraw(initial,true);
   if(me?.id!==userId)return;
   const later=signature();
   await load('deferred');redraw(later);
  }).catch(e=>console.warn('Akış yeniden yüklenemedi:',e))
   .finally(()=>{if(me?.id===userId)patiyizDeferredLoading=null});
 }
}
const authBusy=async(fn)=>{try{let r=await fn();if(r.error)throw r.error;return r.data}catch(e){notify(friendly(e),true);return null}};
authRoot.addEventListener('click',e=>{let b=e.target.closest('[data-auth]');if(!b)return;authMode=b.dataset.auth;showAuth()});
authRoot.addEventListener('submit',async(e)=>{if(e.target.id!=='auth-form')return;e.preventDefault();let fd=new FormData(e.target), email=String(fd.get('email')||'').trim(), password=String(fd.get('password')||'');if(authMode==='reset'){let res=await authBusy(()=>sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}));if(res!==null)showAuth('Şifre yenileme e-postasını kontrol edin.');return}if(authMode==='signup'){if(fd.get('age_accepted')!=='yes')return notify('Patiyiz şu anda 18 yaş ve üzeri kullanıcılar içindir.',true);if(fd.get('terms_accepted')!=='yes')return notify('Kayıt olmak için şartları kabul etmelisin.',true);let res=await authBusy(()=>sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname,data:{display_name:String(fd.get('display_name')||'Patiyiz Üyesi')}}}));if(res){if(res.session){if(me?.id!==res.user.id){stopLive();resetSessionState()}me=res.user;await load('initial');showApp()}else{authMode='login';showAuth('Hesabın oluşturuldu. Gelen e-postadan adresini doğrula, ardından giriş yap.')}}return}let res=await authBusy(()=>sb.auth.signInWithPassword({email,password}));if(res){if(me?.id!==res.user.id){stopLive();resetSessionState()}me=res.user;await load('initial');showApp()}});
function header(title,subtitle='',cta=''){return `<div class="page-intro"><div><div class="hello">PATİYİZ TOPLULUĞU</div><h1 class="page-title">${esc(title)}</h1>${subtitle?`<p style="font-size:12px;color:#7e9384;margin:5px 0 0">${esc(subtitle)}</p>`:''}</div><div class="top-actions">${cta}</div></div>`}

// Realtime: subscribe to authorized changes only. A debounce prevents duplicate refreshes.
function stopLive(){if(liveReloadTimer)clearTimeout(liveReloadTimer);liveReloadTimer=null;if(liveReconnectTimer)clearTimeout(liveReconnectTimer);liveReconnectTimer=null;if(liveChannel&&sb)sb.removeChannel(liveChannel);liveChannel=null;liveInitialized=false;liveUserId=null}
async function refreshLiveTables(){const userId=me?.id,loadToken=patiyizLoadToken;if(!userId)return false;const result=await Promise.all([sb.from('messages').select('*').order('created_at',{ascending:false}).limit(pageLimits.messages||150),sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(pageLimits.notifications||150)]);if(result[0].error)throw result[0].error;if(result[1].error)throw result[1].error;if(me?.id!==userId||patiyizLoadToken!==loadToken)return false;data.messages=result[0].data||[];data.notifications=result[1].data||[];return true}
function queueLiveUpdate(){if(liveReloadTimer)clearTimeout(liveReloadTimer);liveReloadTimer=setTimeout(async()=>{if(!me)return;const oldMessageCount=data.messages.filter(x=>x.receiver_id===me.id&&!x.read_at).length;const oldNoticeCount=data.notifications.filter(x=>x.owner_id===me.id&&!x.read).length;const previousConversation=view==='messages'?data.messages.filter(x=>(x.sender_id===me.id&&x.receiver_id===personId)||(x.sender_id===personId&&x.receiver_id===me.id)).map(x=>x.id+'_'+x.read_at).join('|'):'';try{if(!await refreshLiveTables()||!me)return;navRender();if(document.hidden)return;if(view==='messages'){const nextConversation=data.messages.filter(x=>(x.sender_id===me.id&&x.receiver_id===personId)||(x.sender_id===personId&&x.receiver_id===me.id)).map(x=>x.id+'_'+x.read_at).join('|');if(previousConversation!==nextConversation){const field=$('#message-form input[name="body"]');const draft=field?.value||'',focus=document.activeElement===field,position=field?.selectionStart??draft.length;render();const next=$('#message-form input[name="body"]');if(next){next.value=draft;if(focus){next.focus();next.setSelectionRange(position,position)}}}}else if(view==='notifications')render();const unread=data.messages.filter(x=>x.receiver_id===me.id&&!x.read_at).length;const notices=data.notifications.filter(x=>x.owner_id===me.id&&!x.read).length;if(unread>oldMessageCount||notices>oldNoticeCount)notify('Yeni bir Patiyiz bildirimin var 🐾');if(view==='messages')markConversationRead()}catch(err){console.warn('Canlı bildirim yenilemesi başarısız:',err.message)}},250)}
function startLive(){if(!me||!sb)return;if(liveUserId===me.id&&liveChannel)return;stopLive();liveUserId=me.id;
 const channel=sb.channel('patiyiz-live-'+me.id)
 .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:'receiver_id=eq.'+me.id},queueLiveUpdate)
 .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:'sender_id=eq.'+me.id},queueLiveUpdate)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'owner_id=eq.'+me.id},queueLiveUpdate);
 liveChannel=channel;
 channel.subscribe(status=>{
  if(liveChannel!==channel||me?.id!==liveUserId)return;
  if(status==='SUBSCRIBED'){liveInitialized=true;if(liveReconnectTimer){clearTimeout(liveReconnectTimer);liveReconnectTimer=null}return}
  if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
   liveInitialized=false;
   if(navigator.onLine===false||liveReconnectTimer)return;
   liveReconnectTimer=setTimeout(()=>{
    liveReconnectTimer=null;
    if(!me||me.id!==liveUserId||navigator.onLine===false)return;
    stopLive();startLive();queueLiveUpdate();
   },5000);
  }
 });
}
function refreshOnReturn(){
 if(!me||!sb||document.hidden||navigator.onLine===false)return;
 const now=Date.now();if(now-lastForegroundSync<6000)return;lastForegroundSync=now;
 if(!liveInitialized){stopLive();startLive()}
 queueLiveUpdate();
}
async function markConversationRead(){if(!me||view!=='messages'||!personId)return;const unread=data.messages.filter(x=>x.sender_id===personId&&x.receiver_id===me.id&&!x.read_at);if(!unread.length)return;
 const now=new Date().toISOString();const ids=unread.map(x=>x.id);const r=await sb.from('messages').update({read_at:now}).in('id',ids).eq('receiver_id',me.id);if(r.error){console.warn('Okundu bilgisi kaydedilemedi',r.error.message);return}
 unread.forEach(x=>x.read_at=now);navRender();if(view==='messages')render();
}
function unreadCounts(){const hidden=new Set(data.messageHidden.filter(x=>x.user_id===me?.id).map(x=>x.message_id));return {messages:data.messages.filter(x=>x.receiver_id===me?.id&&!x.read_at&&!blocked.has(x.sender_id)&&!hidden.has(x.id)).length,notifications:data.notifications.filter(x=>x.owner_id===me?.id&&!x.read&&!blocked.has(x.actor_id)).length}}
function unreadMessageSources(){const hidden=new Set(data.messageHidden.filter(x=>x.user_id===me?.id).map(x=>x.message_id));const messages=data.messages.filter(x=>x.receiver_id===me?.id&&!x.read_at&&!blocked.has(x.sender_id)&&!hidden.has(x.id));const tally=new Map();for(const m of messages)tally.set(m.sender_id,(tally.get(m.sender_id)||0)+1);return [...tally].sort((a,b)=>b[1]-a[1]).map(([id,count])=>({id,count,name:profile(id).display_name}))}
const countBadge=n=>n?`<span class="pati-count-badge" aria-label="${n} okunmamış">${n>99?'99+':n}</span>`:'';
function navRender(){const fab=$('#app-root>.mobile-fab');if(fab){fab.hidden=true;fab.style.display='none'}const sideCreate=$('.nav-create');if(sideCreate){const action=view==='community'?'question':view==='care'?'care-add':view==='lost'?'lost-add':view==='home'?'compose':'';sideCreate.hidden=!action;sideCreate.style.display=action?'':'none';if(action){sideCreate.dataset.action=action;sideCreate.innerHTML=ico('plus')+(view==='community'?' Soru sor':view==='care'?' Görev ekle':view==='lost'?' İlan oluştur':view==='adoption'?' Sahiplendirme ilanı':' Yeni paylaşım')}}const counts=unreadCounts();const topMessages=$('#pati-header-messages');if(topMessages){topMessages.innerHTML=ico('message')+countBadge(counts.messages);topMessages.classList.toggle('active',view==='messages');topMessages.setAttribute('aria-label',counts.messages?'Mesajlar, '+counts.messages+' okunmamış mesaj':'Mesajlar')}const topBell=$('#pati-header-notifications');if(topBell){topBell.innerHTML=ico('bell')+countBadge(counts.notifications);topBell.classList.toggle('active',view==='notifications')}let navItem=([id,label,icon])=>`<button class="nav-link ${view===id?'active':''}" data-view="${id}">${ico(icon)}${label}${id==='messages'?countBadge(counts.messages):id==='notifications'?countBadge(counts.notifications):''}</button>`;$('#desktop-nav').innerHTML=nav.map(navItem).join('')+(isAdmin?`<button class="nav-link patiyiz-admin-nav" type="button" data-action="open-admin">${ico('shield')}Yönetim Paneli</button>`:'');$('#mobile-nav').innerHTML=[['home','Akış','home'],['explore','Keşfet','search']].map(([id,label,icon])=>`<button type="button" class="mobile-nav-btn ${view===id?'active':''}" data-view="${id}" aria-label="${label}" aria-current="${view===id?'page':'false'}"><span class="pati-mobile-nav-glyph">${ico(icon)}</span><small>${label}</small></button>`).join('')+`<button type="button" class="mobile-nav-btn pati-create-nav" data-action="pati-create-open" aria-label="Yeni paylaşım oluştur"><span class="pati-mobile-nav-glyph">${ico('plus')}</span><small>Paylaş</small></button>`+[['reels','Reels','reels-tab'],['profile','Profil','user']].map(([id,label,icon])=>`<button type="button" class="mobile-nav-btn ${view===id?'active':''}" data-view="${id}" aria-label="${label}" aria-current="${view===id?'page':'false'}"><span class="pati-mobile-nav-glyph">${ico(icon)}</span><small>${label}</small></button>`).join('')
}
function openMobileFeaturesMenu(){
 const groups=[
  {title:'Sosyal',items:[['community','Topluluk','users'],['pets','Patiler','paw'],['rewards','PatiCoin & Görevler','paw'],['shop','Pati Mağaza','grid'],['messages','Mesajlar','message'],['notifications','Bildirimler','bell']]},
  {title:'Keşfet ve öğren',items:[['education','Eğitim / Akademi','library'],['knowledge','Bilgi Merkezi','info'],['lost','Kayıp İlanları','location'],['adoption','Sahiplendirme','heart']]},
  {title:'Hayvanlarım ve hesabım',items:[['care','Bakım Takvimi','calendar'],['wellness','Aşı, Veteriner & Sağlık','heart'],['settings','Ayarlar ve Gizlilik','settings'],['blocked','Engellenenler','shield']]}
 ];
 const sections=groups.map(group=>'<section class="pati-feature-group"><h3>'+esc(group.title)+'</h3><div class="pati-mobile-menu-list">'+
  group.items.map(([dest,label,icon])=>'<button type="button" class="pati-mobile-menu-item" data-view="'+dest+'" aria-label="'+esc(label)+'">'+ico(icon)+'<span>'+esc(label)+'</span>'+ico('arrow')+'</button>').join('')+
  '</div></section>').join('');
 const addPet='<div class="pati-feature-add-pet"><button type="button" class="pati-mobile-menu-item" data-action="pet-add">'+ico('plus')+'<span>Hayvan ekle</span>'+ico('arrow')+'</button></div>';
 const admin=isAdmin?'<section class="pati-feature-group"><h3>Yönetim</h3><button type="button" class="pati-mobile-menu-item" data-action="open-admin">'+ico('shield')+'<span>Yönetim Paneli</span>'+ico('arrow')+'</button></section>':'';
 modal('Tüm Özellikler','<div class="pati-features-list"><p class="pati-feature-intro">Patiyiz’in tüm bölümlerine buradan ulaşabilirsin.</p>'+sections+addPet+admin+'</div>','tools-form');
 $('#tools-form .modal-footer')?.remove();
}
const patiCoinTasks=[
 ['profile_complete','Profili tamamla',45,'Fotoğraf, kullanıcı adı ve en az 10 karakter biyografi'],
 ['pet_created','Patili dostunu ekle',35,'Hayvan profili oluştur'],
 ['first_post','İlk paylaşım',30,'Bir gönderi yayınla'],
 ['first_story','İlk hikâye',25,'Hikâye paylaş'],
 ['first_follow','İlk takip',15,'Bir kullanıcıyı takip et'],
 ['three_posts','3 gönderi',45,'Üç gönderi yayınla']
];
let patiCoinState={balance:0,earned:0,claims:[],items:[],orders:[],history:[],loading:false};
let patiCoinCheckoutItem=null;
let patiInviteState={code:'',invited_count:0,already_used:false,coins_each:50,loading:false};
async function patiInviteLoad(){
 if(!me||!sb||patiInviteState.loading)return;
 const uid=me.id;patiInviteState.loading=true;
 try{const result=await sb.rpc('patiyiz_my_invite_info');if(result.error)throw result.error;
 if(me?.id!==uid)return;patiInviteState={...result.data,loading:false};if(view==='rewards')render()}
 catch(e){console.warn('Davet kodu:',e);notify(friendly(e),true)}
 finally{patiInviteState.loading=false}
}
async function patiInviteRedeem(){
 const code=String(document.querySelector('#pati-invite-code')?.value||'').trim().toUpperCase();
 if(!/^P[A-F0-9]{8}$/.test(code))return notify('Geçerli bir davet kodu gir.',true);
 const button=document.querySelector('[data-action="paticoin-invite-redeem"]');if(button?.disabled)return;if(button)button.disabled=true;
 try{const result=await sb.rpc('patiyiz_redeem_invite',{p_code:code});if(result.error)throw result.error;
 await patiInviteLoad();await patiCoinSync(false);patiCoinAnimation(50,['Arkadaş daveti ödülü'])}
 catch(e){notify(friendly(e),true)}finally{if(button)button.disabled=false}
}
function patiInviteShare(){
 const code=patiInviteState.code;if(!code)return notify('Davet kodun hazırlanıyor.',true);
 const value='Patiyiz’e katıl! Davet kodum: '+code+' · https://patiyiz.com/';
 if(navigator.share){navigator.share({title:'Patiyiz davetim',text:value}).catch(()=>{});return}
 navigator.clipboard?.writeText(value).then(()=>notify('Davet mesajı kopyalandı.')).catch(()=>notify('Davet kodun: '+code));
}

async function patiCoinSync(withAnimation=false){
 if(!me||!sb||patiCoinState.loading)return;
 const uid=me.id;patiCoinState.loading=true;
 try{
  const claimed=await sb.rpc('patiyiz_claim_completed_tasks');
  if(claimed.error)throw claimed.error;
  if(me?.id!==uid)return;
  const [wallet,ledger,items,orders,history]=await Promise.all([
   sb.from('patiyiz_reward_wallets').select('balance,lifetime_earned').eq('user_id',uid).maybeSingle(),
   sb.from('patiyiz_reward_ledger').select('task_code').eq('user_id',uid).not('task_code','is',null),
   sb.from('patiyiz_reward_items').select('id,name,description,kind,coins,emoji').eq('enabled',true).order('sort_order'),
   sb.from('patiyiz_reward_redemptions').select('id,item_id,coins_spent,destination,status,created_at,admin_note,proof_url,reviewed_at,fulfilled_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(30),
   sb.from('patiyiz_reward_fulfillment_events').select('redemption_id,previous_status,next_status,note,created_at').order('created_at',{ascending:false}).limit(100)
  ]);
  for(const r of [wallet,ledger,items,orders,history])if(r.error)throw r.error;
  if(me?.id!==uid)return;
  patiCoinState={balance:wallet.data?.balance||0,earned:wallet.data?.lifetime_earned||0,
   claims:(ledger.data||[]).map(x=>x.task_code),items:items.data||[],orders:orders.data||[],history:history.data||[],loading:false};
  if(['rewards','shop'].includes(view))render();
  const newly=(claimed.data?.awarded||[]);
  if(withAnimation&&newly.length)patiCoinAnimation(newly.reduce((n,x)=>n+x.coins,0),newly.map(x=>x.title));
 }catch(e){console.warn('PatiCoin yüklenemedi:',e);if(withAnimation)notify('PatiCoin yüklenemedi: '+friendly(e),true)}
 finally{patiCoinState.loading=false}
}
function patiCoinAnimation(amount,titles){
 const old=document.getElementById('paticoin-celebration');if(old)old.remove();
 const el=document.createElement('div');el.id='paticoin-celebration';el.className='paticoin-celebration';
 el.innerHTML='<div class="paticoin-burst" aria-hidden="true">🪙 ✨ 🪙</div><div class="paticoin-won">+'+Number(amount)+' PatiCoin!</div><p>'+esc(titles.join(' · '))+'</p><button type="button" aria-label="Ödül bildirimini kapat">Harika!</button>';
 document.body.appendChild(el);
 const close=()=>el.remove();
 el.querySelector('button').addEventListener('click',close);
 // Coin overlay remains until the user taps Harika.
}
function patiRewardsPage(){
 const done=new Set(patiCoinState.claims);
 const tasks=patiCoinTasks.map(([code,title,coins,info])=>'<article class="paticoin-task"><div class="paticoin-task-icon">'+(done.has(code)?'✓':'🐾')+'</div><div><strong>'+esc(title)+'</strong><small>'+esc(info)+'</small></div><b class="'+(done.has(code)?'earned':'')+'">'+(done.has(code)?'Kazanıldı':'+'+coins+' 🪙')+'</b></article>').join('');
 const invite='<section class="paticoin-invite"><h2>🎁 Arkadaşını davet et</h2><p>Sen ve davet ettiğin kişi <b>50’şer PatiCoin</b> kazanırsınız. Her hesap yalnızca bir davet kodu kullanabilir.</p><div class="paticoin-invite-code"><strong>'+esc(patiInviteState.code||'Kod hazırlanıyor…')+'</strong><button data-action="paticoin-invite-share">Paylaş</button></div><small>Davet ettiğin kişi: '+(patiInviteState.invited_count||0)+'</small>'+(patiInviteState.already_used?'<p>✓ Davet kodu kullanma hakkını tamamladın.</p>':'<label class="paticoin-invite-entry">Arkadaşının kodu<input id="pati-invite-code" maxlength="9" autocomplete="off" placeholder="P1234ABCD"></label><button class="paticoin-invite-redeem" data-action="paticoin-invite-redeem">Kodu kullan · +50 🪙</button>')+'</section>';
 main.innerHTML='<section class="paticoin-page"><div class="paticoin-hero"><span>🐾 PATİYİZ ÖDÜLLERİ</span><h1>PatiCoin</h1><strong>🪙 '+patiCoinState.balance+' <small>PatiCoin</small></strong><p>Toplam kazanılan: '+patiCoinState.earned+' coin</p><div class="paticoin-actions"><button data-action="paticoin-claim">Görevleri kontrol et</button><button data-action="paticoin-shop">Pati Mağaza →</button></div></div><h2>Görevlerin</h2><div class="paticoin-tasks">'+tasks+'</div>'+invite+'<p class="paticoin-disclaimer"><b>Yeni ödül kuralları:</b> Hesabın en az 7 günlük olmalı, son 30 günde 3 farklı gün aktif olmalısın. 14 günde en fazla 1 ödül talebi oluşturabilirsin. Önceden kazandığın coinler korunur.</p></section>';
}
function patiShopPage(){
 const label={pending:'Talep alındı · Beklemede',approved:'Onaylandı · Stok ayrıldı',preparing:'Hazırlanıyor',fulfilled:'Teslim/bağış tamamlandı',cancelled:'İptal edildi · PatiCoin iade edildi'};
 const products=patiCoinState.items.map(p=>'<article class="paticoin-item"><span class="paticoin-item-icon">'+esc(p.emoji)+'</span><h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p><div><strong>🪙 '+p.coins+'</strong><button data-action="paticoin-buy" data-id="'+esc(p.id)+'">Seç</button></div></article>').join('');
 const orders=patiCoinState.orders.map(o=>{
  const entries=patiCoinState.history.filter(e=>e.redemption_id===o.id);
  const note=o.admin_note?'<p class="paticoin-order-note">Bilgi: '+esc(o.admin_note)+'</p>':'';
  const proof=o.status==='fulfilled'&&/^https:\/\//i.test(o.proof_url||'')?'<a href="'+esc(o.proof_url)+'" rel="noopener noreferrer" target="_blank">Teslimat / destek kanıtı ↗</a>':'';
  const timeline=entries.length?'<details class="paticoin-order-timeline"><summary>İşlem adımları ('+entries.length+')</summary>'+entries.map(e=>
   '<p>'+esc(label[e.next_status]||e.next_status)+' · '+day(e.created_at)+(e.note?' · '+esc(e.note):'')+'</p>').join('')+'</details>':'';
  return '<article class="paticoin-order"><b>'+esc(patiCoinState.items.find(p=>p.id===o.item_id)?.name||'Ürün')+'</b><span>'+(o.destination==='street_animals'?'Sokak hayvanları için':'Kendi hayvanım için')+' · 🪙 '+Number(o.coins_spent)+'</span><strong class="paticoin-order-status paticoin-order-'+esc(o.status)+'">'+esc(label[o.status]||'Beklemede')+'</strong>'+note+proof+timeline+'</article>';
 }).join('');
 main.innerHTML='<section class="paticoin-page"><div class="paticoin-shop-head"><div><h1>🛍️ Pati Mağaza</h1><p>PatiCoin ile ürün ve destek talebi oluştur. Ödül için 7 günlük hesap, 3 aktif gün ve 14 günlük talep aralığı gerekir.</p></div><button data-action="paticoin-rewards">🪙 '+patiCoinState.balance+' coin</button></div><div class="paticoin-items">'+(products||'<p>Ürünler hazırlanıyor…</p>')+'</div><p class="paticoin-disclaimer">Talepler önce yönetici onayı ve gerçek stok kontrolünden geçer. Teslimat veya bağış, yalnız kanıtlı işlem tamamlandığında gerçekleşmiş olarak işaretlenir.</p><div class="paticoin-shop-orders-heading"><h2>Talep ve teslimat geçmişim</h2><button class="paticoin-refresh" data-action="paticoin-refresh">↻ Güncelle</button></div><div class="paticoin-orders">'+(orders||'<p>Henüz talebin yok.</p>')+'</div></section>';
}
function patiCoinShowCheckout(id){
 const product=patiCoinState.items.find(p=>p.id===id);
 if(!product)return notify('Ürün artık mevcut değil.',true);
 if(patiCoinState.balance<product.coins)return notify('Yetersiz PatiCoin. Önce görevlerini tamamla.',true);
 patiCoinCheckoutItem=product.id;
 const pets=data.pets.filter(p=>p.owner_id===me.id);
 const content='<div class="paticoin-checkout"><div class="paticoin-checkout-item">'+esc(product.emoji)+' <b>'+esc(product.name)+'</b><span>🪙 '+product.coins+'</span></div><h3>Ürünü kimin için alıyorsun?</h3><label><input type="radio" name="paticoin-destination" value="own_pet" '+(pets.length?'checked':'disabled')+'> 🐶 Kendi hayvanım için</label><label><input type="radio" name="paticoin-destination" value="street_animals" '+(!pets.length?'checked':'')+'> 🐾 Sokak hayvanları için</label>'+
 '<div class="paticoin-pet-selector"><label for="paticoin-pet-id">Hayvanını seç</label><select id="paticoin-pet-id">'+pets.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></div><p class="paticoin-disclaimer">Onayladığında coin düşer ve teslimat/destek talebin beklemeye alınır. Bu işlem anında bağış veya kargo gönderimi değildir.</p><button type="button" class="paticoin-confirm" data-action="paticoin-confirm">🪙 '+product.coins+' coin kullan · Talep oluştur</button></div>';
 modal('PatiCoin ile al',content,'paticoin-checkout-form');
 const form=document.getElementById('paticoin-checkout-form');form.querySelector('.modal-footer')?.remove();
 const sync=()=>{const chosen=form.querySelector('input[name="paticoin-destination"]:checked')?.value;const selector=form.querySelector('.paticoin-pet-selector');if(selector)selector.hidden=chosen!=='own_pet'};
 form.querySelectorAll('input[name="paticoin-destination"]').forEach(input=>input.addEventListener('change',sync));sync();
}
async function patiCoinConfirm(){
 const product=patiCoinState.items.find(p=>p.id===patiCoinCheckoutItem);
 const form=document.getElementById('paticoin-checkout-form');
 const target=form?.querySelector('input[name="paticoin-destination"]:checked')?.value;
 if(!product||!target)return notify('Alıcı türünü seç.',true);
 const btn=form.querySelector('[data-action="paticoin-confirm"]');if(btn.disabled)return;
 const petId=target==='own_pet'?form.querySelector('#paticoin-pet-id')?.value:null;
 if(target==='own_pet'&&!petId)return notify('Önce kendi hayvanını seç.',true);
 btn.disabled=true;btn.textContent='Talep gönderiliyor…';
 try{
  const response=await sb.rpc('patiyiz_redeem_reward',{p_item_id:product.id,p_destination:target,p_pet_id:petId||null});
  if(response.error)throw response.error;
  closeModal(true);patiCoinCheckoutItem=null;
  await patiCoinSync();
  navigate('shop');notify('Talebin alındı. Teslimat/bağış onayı bekleniyor.');
 }catch(e){notify(friendly(e),true);btn.disabled=false;btn.textContent='Yeniden dene'}
}
function side(){let p=current();rail.innerHTML=`<div class="pati-card"><div class="pati-profile-row">${avatar(p)}<div><strong>${esc(p.display_name)}</strong><small>@${esc(p.handle)}</small></div></div><div class="pati-actionbar">${button('Profilim','my-profile')}</div></div><div class="pati-card" style="margin-top:15px"><h3>Güvenli topluluk</h3><p>Şikâyet veya engelleme özelliğini kötüye kullanım halinde kullan. Acil hayvan sağlığı sorunlarında veteriner hekime başvur.</p></div>`}
let patiyizVideoObserver=null;
function setupFeedVideos(){
 if(patiyizVideoObserver){patiyizVideoObserver.disconnect();patiyizVideoObserver=null}
 const videos=[...document.querySelectorAll('#main-content .pati-video-frame video')];
 if(!videos.length||!('IntersectionObserver' in window)||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 patiyizVideoObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){const video=entry.target;
   if(entry.isIntersecting&&entry.intersectionRatio>=.35&&!document.hidden&&!video.dataset.userPaused){
    videos.forEach(other=>{if(other!==video)other.pause()});
    video.play().catch(()=>{});
   }else video.pause();
  }
 },{threshold:[0,.2,.35,.65]});
 videos.forEach(v=>patiyizVideoObserver.observe(v));
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('.pati-post-video,.pati-reel-video').forEach(v=>v.pause());else{setupFeedVideos();setupReelsViewer();if(me&&sb)queueLiveUpdate()}});
function ensureViewData(to){const byView={community:[['questions','questions'],['replies','replies'],['question_votes','votes']],knowledge:[['kb_bookmarks','bookmarks']],lost:[['lost_reports','lost']],adoption:[['adoption_listings','adoption']],care:[['care_tasks','care']],messages:[['message_hidden','messageHidden']],profile:[],blocked:[['user_blocks','blocks']]};const missing=(byView[to]||[]).filter(([table])=>!patiyizLoadedTables.has(table));if(!missing.length)return;const requestedView=to;Promise.all(missing.map(async([table,key])=>{const req=sb.from(table).select('*');const r=await req.limit(350);if(r.error)throw r.error;return[table,key,r.data||[]]})).then(results=>{if(!me)return;for(const[table,key,rows]of results){if(!patiyizLoadedTables.has(table)){data[key]=rows;patiyizLoadedTables.add(table)}}if(view===requestedView)render()}).catch(e=>console.warn('Bölüm verileri yüklenemedi:',e))}
const patiMobileTabScroll=new Map();
let patiNavAnimationId=0;
function navigate(to){
 if(!allowed.includes(to))to='home';
 const previous=view,primary=['home','explore','reels'],reselect=previous===to&&primary.includes(to);
 if(reselect){
  if(to==='explore'&&exploreTab!=='media'){exploreTab='media';search='';render()}
  if(to==='reels'){const viewport=document.querySelector('.pati-reels-viewport');if(viewport)viewport.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
  else window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  patiMobileTabScroll.set(to,0);
  return;
 }
 if(primary.includes(previous)){
  const viewport=previous==='reels'?document.querySelector('.pati-reels-viewport'):null;
  patiMobileTabScroll.set(previous,viewport?viewport.scrollTop:window.scrollY||0);
 }
 if(to==='profile'&&view!=='profile'&&view!=='follows-list'&&!followReturnList)lastDetailView=view;
 view=to;
 if(view==='explore'){exploreTab='media';search=''}
 if(view==='blocked')loadBlockedNames();
 articleId='';search='';
 window.scrollTo(0,0);
 navRender();side();render();
 const currentView=view;
 if(primary.includes(to)){
  requestAnimationFrame(()=>{
   if(view!==currentView)return;
   const offset=patiMobileTabScroll.get(to)||0;
   if(to==='reels'){const viewport=document.querySelector('.pati-reels-viewport');if(viewport)viewport.scrollTop=offset}
   else window.scrollTo({top:offset,behavior:'instant'});
  });
 }else if(view==='profile'){
  requestAnimationFrame(()=>{window.scrollTo({top:0,left:0,behavior:'instant'});document.scrollingElement?.scrollTo(0,0)});
 }
 const mainElement=document.getElementById('main-content'),animationId=++patiNavAnimationId;
 if(mainElement&&to!=='reels'&&window.matchMedia?.('(max-width:740px)')?.matches&&!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
  mainElement.classList.remove('pati-view-enter');
  void mainElement.offsetWidth;
  mainElement.classList.add('pati-view-enter');
  setTimeout(()=>{if(animationId===patiNavAnimationId)mainElement.classList.remove('pati-view-enter')},230);
 }
 ensureViewData(view);
 if(view==='messages')markConversationRead();
}
function userRow(id,small=''){let p=profile(id);return `<button type="button" class="pati-profile-row" data-action="view-user" data-id="${esc(id)}" aria-label="${esc(p.display_name)} profilini aç" style="border:0;background:transparent;padding:0;text-align:left;width:100%;cursor:pointer;color:inherit;font:inherit">${avatar(p)}<span><strong>${displayName(p)}</strong><small style="display:block">@${esc(p.handle)} ${small?`· ${esc(small)}`:''}</small></span></button>`}
function render(){try{({home:homePage,explore:explorePage,reels:reelsPage,pets:petsPage,wellness:patiWellnessPage,rewards:patiRewardsPage,shop:patiShopPage,community:communityPage,knowledge:knowledgePage,education:educationPage,lost:lostPage,adoption:adoptionPage,care:carePage,messages:messagesPage,notifications:notificationsPage,profile:profilePage,blocked:blockedPage,settings:settingsPage,'follows-list':followListPage}[view]||homePage)();setupFeedVideos();setupReelsViewer()}catch(e){console.error(e);main.innerHTML=header('Bir hata oldu')+empty('Ekran açılamadı','Sayfayı yenile veya daha sonra tekrar dene.')}}
async function load(mode='all'){if(!me)return;const userId=me.id,loadToken=patiyizLoadToken,likesEpoch=(typeof likesChangeEpoch==='number'?likesChangeEpoch:0);let specs=[['profiles','profiles',800],['pets','pets',600],['posts','posts',200],['post_likes','likes',2000],['post_saves','saves',2000],['comments','comments',1500],['comment_likes','commentLikes',3000],['follows','follows',2000],['questions','questions',150],['replies','replies',1500],['question_votes','votes',2000],['lost_reports','lost',300],['adoption_listings','adoption',300],['patiyiz_stories','stories',250],['patiyiz_story_responses','storyResponses',1000],['patiyiz_reposts','reposts',600],['patiyiz_post_pins','pins',500],['patiyiz_highlight_albums','highlightAlbums',250],['patiyiz_highlight_items','highlightItems',500],['care_tasks','care',500],['messages','messages',1000],['message_hidden','messageHidden',1000],['notifications','notifications',500],['kb_bookmarks','bookmarks',300],['user_blocks','blocks',500]];if(mode==='initial')specs=specs.filter(([table])=>['profiles','pets','posts','post_likes','post_saves','patiyiz_stories','patiyiz_highlight_albums','patiyiz_highlight_items','user_blocks'].includes(table));else if(mode==='feed')specs=specs.filter(([table])=>['profiles','posts','post_likes','post_saves','patiyiz_stories','patiyiz_highlight_albums','patiyiz_highlight_items'].includes(table));else if(mode==='deferred')specs=specs.filter(([table])=>!patiyizLoadedTables.has(table));
const results=await Promise.all(specs.map(async([table,key,limit])=>{const chunks=[];const size=250,cap=Math.max(1,Math.min(5000,pageLimits[key]||limit));try{for(let start=0;start<cap;start+=size){let req=sb.from(table).select('*').range(start,Math.min(start+size-1,cap-1));if(['messages','notifications','comments','posts','replies','questions','lost_reports','patiyiz_stories','patiyiz_story_responses','adoption_listings'].includes(table))req=req.order('created_at',{ascending:false});const r=await req;if(r.error)throw r.error;chunks.push(...(r.data||[]));if((r.data||[]).length<size)break;}if(pageLimits[key])pageMore[key]=chunks.length>=cap;return[key,chunks,true]}catch(e){console.warn(table,'yüklenemedi:',e.message);return[key,data[key]||[],false]}}));if(me?.id!==userId||patiyizLoadToken!==loadToken)return;for(const [k,val,ok]of results){if(k==='likes'&&likesEpoch!==(typeof likesChangeEpoch==='number'?likesChangeEpoch:0))continue;data[k]=val;if(ok)patiyizLoadedTables.add(({profiles:'profiles',pets:'pets',posts:'posts',likes:'post_likes',saves:'post_saves',comments:'comments',commentLikes:'comment_likes',follows:'follows',questions:'questions',replies:'replies',votes:'question_votes',lost:'lost_reports',adoption:'adoption_listings',stories:'patiyiz_stories',storyResponses:'patiyiz_story_responses',reposts:'patiyiz_reposts',pins:'patiyiz_post_pins',highlightAlbums:'patiyiz_highlight_albums',highlightItems:'patiyiz_highlight_items',care:'care_tasks',messages:'messages',messageHidden:'message_hidden',notifications:'notifications',bookmarks:'kb_bookmarks',blocks:'user_blocks'})[k])}liked=new Set(data.likes.filter(x=>x.user_id===me.id).map(x=>x.post_id));saved=new Set(data.saves.filter(x=>x.user_id===me.id).map(x=>x.post_id));followed=new Set(data.follows.filter(x=>x.follower_id===me.id).map(x=>x.followee_id));voted=new Set(data.votes.filter(x=>x.user_id===me.id).map(x=>x.question_id));favorites=new Set(data.bookmarks.filter(x=>x.user_id===me.id).map(x=>x.article_id));blocked=new Set(data.blocks.filter(x=>x.blocker_id===me.id).map(x=>x.blocked_id))}
async function refreshKeys(specs){
 const userId=me?.id,loadToken=patiyizLoadToken;if(!userId)return;
 const results=await Promise.all(specs.map(async([table,key])=>{const r=await sb.from(table).select('*').order('created_at',{ascending:false}).limit(key==='messages'?400:key==='notifications'?150:200);if(r.error)throw r.error;return[key,r.data||[]]}));
 if(me?.id!==userId||patiyizLoadToken!==loadToken)return;
 for(const[k,rows]of results)data[k]=rows;
 navRender();render();
}
async function refresh(){const userId=me?.id,loadToken=patiyizLoadToken;if(!userId)return;await load();if(me?.id!==userId||patiyizLoadToken!==loadToken)return;navRender();render();if(view==='blocked')loadBlockedNames()}
async function loadMore(key){pageLimits[key]=(pageLimits[key]||100)+150;await refresh()}
function formatPatiPostBody(raw){
 return esc(raw||'').replace(/(^|[\s])#([\p{L}\p{N}_]{2,35})/gu,(_m,prefix,tag)=>prefix+'<button type="button" class="pati-hashtag" data-action="hashtag" data-id="'+tag+'">#'+tag+'</button>');
}
function postCard(p,priority=false){
 const own=p.author_id===me.id,comments=data.comments.filter(x=>x.post_id===p.id&&!blocked.has(x.author_id)),count=data.likes.filter(x=>x.post_id===p.id).length,pet=data.pets.find(x=>x.id===p.pet_id);
 const images=(p.images?.length?p.images:[p.image_url]).filter(Boolean),hasMedia=!!(images.length||p.video_url),isPriority=priority===true,body=String(p.body||'').trim();
 const media=p.video_url?'<div class="pati-video-frame"><video class="pati-post-video" playsinline muted loop preload="'+(isPriority?'auto':'metadata')+'"'+(p.video_cover_url?' poster="'+esc(p.video_cover_url)+'"':'')+' src="'+esc(p.video_url)+'" aria-label="Paylaşım videosu"></video><button type="button" class="pati-video-sound" data-action="video-sound" aria-label="Sesi aç">'+ico("volume-x")+'</button></div>':
 images.length?'<div class="pati-carousel" data-post-id="'+esc(p.id)+'"><div class="pati-carousel-track">'+images.map((url,i)=>'<div class="pati-carousel-slide pati-doubletap-photo" data-post-id="'+esc(p.id)+'">'+photo(url,'🐾',isPriority&&i===0)+'<span class="pati-heart-burst" aria-hidden="true">♥</span></div>').join('')+'</div>'+(images.length>1?'<span class="pati-carousel-count">1 / '+images.length+'</span><button type="button" data-action="carousel-prev" class="pati-carousel-arrow prev" aria-label="Önceki fotoğraf">‹</button><button type="button" data-action="carousel-next" class="pati-carousel-arrow next" aria-label="Sonraki fotoğraf">›</button>':'')+'</div>':'';
 const controls='<div class="pati-actionbar pati-social-actions"><button type="button" data-action="like" aria-label="Beğen" aria-pressed="'+liked.has(p.id)+'" data-id="'+esc(p.id)+'" class="'+(liked.has(p.id)?'active':'')+'">'+ico('heart')+' <span>'+count+'</span></button><button type="button" data-action="comment" aria-label="Yorum yap" data-id="'+esc(p.id)+'">'+ico('message-circle')+' <span>'+comments.length+'</span></button><button type="button" data-action="share-post" aria-label="Paylaş" data-id="'+esc(p.id)+'">'+ico('send')+'</button><button type="button" data-action="save" aria-label="Kaydet" aria-pressed="'+saved.has(p.id)+'" data-id="'+esc(p.id)+'" class="pati-save-action '+(saved.has(p.id)?'active':'')+'">'+ico('bookmark')+'</button></div>';
 const caption=body?'<p class="pati-post-caption">'+(hasMedia?'<strong>'+displayName(profile(p.author_id))+'</strong> ':'')+formatPatiPostBody(body)+'</p>':'';
 return '<article class="pati-card pati-feed-card '+(hasMedia?'pati-feed-has-media':'pati-feed-text-only')+'" data-post-id="'+esc(p.id)+'"><div class="pati-feed-card-header">'+userRow(p.author_id,'')+'<button type="button" class="pati-post-more" data-action="post-menu" data-id="'+esc(p.id)+'" aria-label="Gönderi seçenekleri">⋯</button></div>'+
 (pet?'<p class="pati-feed-pet">'+petIcon(pet.species)+' '+esc(pet.name)+' · '+esc(pet.species)+'</p>':'')+
 (hasMedia?media:'<div class="pati-feed-text-content">'+(caption||'<p class="pati-post-caption">🐾</p>')+'</div>')+
 controls+'<div class="pati-post-details"><strong class="pati-post-like-summary">'+count+' beğeni</strong>'+(hasMedia?caption:'')+'<time class="pati-post-time">'+esc(day(p.created_at))+'</time></div></article>';
}
function openPost(id){const post=data.posts.find(p=>p.id===id);if(!post){notify('Bu paylaşım artık bulunamıyor.',true);navigate('notifications');return}if(blocked.has(post.author_id)){notify('Bu paylaşım görüntülenemiyor.',true);return}selectedPostId=id;navigate('home')}
let storyItems=[],storyIndex=0,storyTimer=null,storyLikes=[];
function closeStory(){clearTimeout(storyTimer);storyTimer=null;storyItems=[];document.getElementById('story-overlay')?.remove();document.body.classList.remove('story-fullscreen-open');if(view==='profile')render()}
async function recordStoryView(x){if(!me||x.pati_pet_highlight||x.author_id===me.id)return;try{const r=await sb.rpc('patiyiz_record_story_view',{p_story_id:x.id});if(r.error)console.warn('Hikâye görüntülemesi kaydedilemedi:',r.error.message)}catch(err){console.warn('Hikâye görüntüleme ağ hatası:',err)}}
async function showStoryViewers(){const x=storyItems[storyIndex];if(!x||x.author_id!==me.id)return;clearTimeout(storyTimer);const [vr,lr]=await Promise.all([sb.from('patiyiz_story_views').select('viewer_id,last_viewed_at').eq('story_id',x.id).order('last_viewed_at',{ascending:false}),sb.from('patiyiz_story_likes').select('user_id').eq('story_id',x.id)]);if(vr.error){notify('Görüntüleyenler yüklenemedi.',true);return}if(lr.error)console.warn('Hikâye beğenileri yüklenemedi:',lr.error.message);const liked=new Set((lr.data||[]).map(v=>v.user_id));const list=(vr.data||[]).map(v=>'<div class="story-view-user">'+avatar(profile(v.viewer_id),'s')+'<div><strong>'+displayName(profile(v.viewer_id))+'</strong><small>'+new Date(v.last_viewed_at).toLocaleString('tr-TR',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})+'</small></div>'+(liked.has(v.viewer_id)?'<span class="pati-story-view-like" title="Hikâyeni beğendi">♥</span>':'')+'</div>').join('');const sheet=document.getElementById('story-viewers-sheet');if(sheet){sheet.innerHTML='<header>Görüntüleyenler ('+(vr.data||[]).length+') · ♥ '+liked.size+' <button data-action="story-viewers-close">×</button></header>'+(list||'<p>Henüz görüntüleyen yok.</p>');sheet.hidden=false}}
function showStoryFrame(){const root=document.getElementById('story-overlay'),x=storyItems[storyIndex];if(!root||!x)return;clearTimeout(storyTimer);const user=profile(x.author_id);if(!x.pati_pet_highlight)recordStoryView(x);if(!x.pati_pet_highlight&&x.author_id!==me.id)void syncStoryLike(x.id);root.innerHTML='<div class="story-player"><div class="story-progress">'+storyItems.map((_,i)=>'<span class="story-track"><span class="'+(i===storyIndex?'story-playing':'')+'" style="width:'+(i<storyIndex?'100':'0')+'%"></span></span>').join('')+'</div><div class="story-player-head">'+avatar(user,'s')+'<strong>'+displayName(user)+'</strong><button data-action="story-close" aria-label="Kapat" class="story-close">×</button></div>'+(x.image_url?'<img class="story-big-photo" src="'+esc(x.image_url)+'" alt="Hikâye">':'<div class="pati-story-no-photo">🐾</div>')+''+(x.caption?'<p class="story-caption">'+esc(x.caption)+'</p>':'')+'<button class="story-hit prev" data-action="story-prev" aria-label="Önceki"></button><button class="story-hit next" data-action="story-next" aria-label="Sonraki"></button>'+(x.pati_pet_highlight?'<span class="pati-saved-story-label">Kalıcı hikâye</span>':x.author_id===me.id?'<button class="story-highlight-toggle" data-action="story-highlight-choose" data-id="'+esc(x.id)+'">✦ Öne çıkar</button><button class="story-delete" data-action="story-delete" data-id="'+esc(x.id)+'">🗑 Sil</button><button class="story-viewers-button" data-action="story-viewers">👁 Hareketler</button>':'<button class="pati-story-like" data-action="story-like" data-id="'+esc(x.id)+'" aria-label="Hikâyeyi beğen">♡</button><button class="story-delete" data-action="report" data-kind="story" data-id="'+esc(x.id)+'">Bildir</button>')+(!x.pati_pet_highlight&&x.author_id!==me.id?'<div class="pati-story-interactive">'+(x.poll_question?'<b>'+esc(x.poll_question)+'</b><div>'+((x.poll_options||[]).map((opt,i)=>'<button data-action="story-poll" data-id="'+esc(x.id)+'" data-index="'+i+'">'+esc(opt)+'</button>').join(''))+'</div>':x.question_prompt?'<b>'+esc(x.question_prompt)+'</b><button data-action="story-question" data-id="'+esc(x.id)+'">Yanıtla</button>':'')+'<button data-action="story-emoji" data-id="'+esc(x.id)+'">🐾 Tepki ver</button></div>':'')+'<div id="story-viewers-sheet" class="story-viewers-sheet" hidden></div></div>';storyTimer=setTimeout(()=>stepStory(1),6000)}
async function syncStoryLike(id){
 const uid=me?.id;if(!uid)return;
 const r=await sb.from('patiyiz_story_likes').select('story_id').eq('story_id',id).eq('user_id',uid).maybeSingle();
 const btn=document.querySelector('.pati-story-like[data-id="'+id+'"]');
 if(!r.error&&btn&&!btn.disabled&&me?.id===uid){btn.textContent=r.data?'♥':'♡';btn.classList.toggle('active',!!r.data)}
}
async function toggleStoryLike(id){
 const btn=document.querySelector('.pati-story-like[data-id="'+id+'"]');if(!btn||btn.disabled)return;
 const uid=me.id,previous=btn.classList.contains('active');
 btn.disabled=true;
 try{
  const mutation=previous?await sb.from('patiyiz_story_likes').delete().eq('story_id',id).eq('user_id',uid):await sb.from('patiyiz_story_likes').upsert({story_id:id,user_id:uid},{onConflict:'story_id,user_id',ignoreDuplicates:true});
  if(mutation.error)throw mutation.error;
  const verified=await sb.from('patiyiz_story_likes').select('story_id').eq('story_id',id).eq('user_id',uid).maybeSingle();
  if(verified.error)throw verified.error;
  if(me?.id!==uid)return;
  const stored=!!verified.data;
  if(stored===previous)throw Error('Hikâye beğenisi sunucuda doğrulanamadı.');
  btn.classList.toggle('active',stored);btn.textContent=stored?'♥':'♡';
 }catch(e){notify('Hikâye beğenisi kaydedilemedi: '+friendly(e),true);await syncStoryLike(id)}
 finally{btn.disabled=false}
}
function storiesStrip(){const live=data.stories.filter(x=>new Date(x.expires_at).getTime()>Date.now()&&!blocked.has(x.author_id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));const seen=new Set(),people=[];for(const x of live)if(!seen.has(x.author_id)){seen.add(x.author_id);people.push(x)}const own=people.find(x=>x.author_id===me.id);return '<section class="stories-section"><div class="stories-heading"><strong>Hikâyeler</strong></div><div class="stories-strip"><div class="story-person story-own"><button class="story-own-photo '+(own?'has-story':'')+'" data-action="'+(own?'story-view':'story-create')+'" '+(own?'data-id="'+esc(me.id)+'"':'')+'>'+avatar(current(),'s')+'</button><button class="story-own-plus" data-action="story-create">+</button><small>'+(own?'Hikâyem':'Hikâye ekle')+'</small></div>'+people.filter(x=>x.author_id!==me.id).map(x=>'<button class="story-person" data-action="story-view" data-id="'+esc(x.author_id)+'"><span class="story-avatar">'+avatar(profile(x.author_id),'s')+'</span><small>'+esc(profile(x.author_id).display_name)+'</small></button>').join('')+'</div></section>'}
function openStory(id){const items=data.stories.filter(x=>x.author_id===id&&new Date(x.expires_at).getTime()>Date.now()).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));if(!items.length)return notify('Hikâye bulunamadı.');closeStory();storyItems=items;storyIndex=0;const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame()}
function openHighlightStory(id){
 const x=data.stories.find(x=>x.id===id&&x.is_highlight);
 if(!x)return notify('Kalıcı hikâye bulunamadı.',true);
 closeStory();storyItems=[x];storyIndex=0;const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame();
}
function openPetHighlight(id){
 const pet=data.pets.find(x=>x.id===id);
 if(!pet)return notify('Patili dost bulunamadı.',true);
 closeStory();storyItems=[{id:'pet-'+pet.id,author_id:pet.owner_id,image_url:pet.photo_url||'',caption:[pet.name,pet.species,pet.breed].filter(Boolean).join(' · '),pati_pet_highlight:true,is_highlight:true}];storyIndex=0;
 const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame();
}
function openHighlightAlbum(id){
 const album=data.highlightAlbums.find(x=>x.id===id);if(!album)return notify('Albüm bulunamadı.',true);
 const ids=new Set(data.highlightItems.filter(x=>x.album_id===id).map(x=>x.story_id));
 const items=data.stories.filter(x=>ids.has(x.id)&&x.is_highlight).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 if(!items.length)return notify('Bu albümde görüntülenebilir hikâye yok.',true);
 closeStory();storyItems=items;storyIndex=0;
 const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame();
}
function chooseStoryHighlight(storyId){
 const story=data.stories.find(x=>x.id===storyId&&x.author_id===me?.id);
 if(!story)return notify('Bu hikâyeyi öne çıkaramazsın.',true);
 clearTimeout(storyTimer);storyTimer=null;
 const albums=data.highlightAlbums.filter(x=>x.owner_id===me.id);
 const cards=albums.map(album=>{
  const ids=new Set(data.highlightItems.filter(x=>x.album_id===album.id).map(x=>x.story_id));
  const cover=data.stories.find(x=>ids.has(x.id))?.image_url||'';
  return '<button type="button" class="pati-highlight-destination" data-action="story-highlight-album" data-id="'+esc(album.id)+'" data-story="'+esc(story.id)+'"><span class="pati-highlight-destination-cover">'+(cover?'<img src="'+esc(cover)+'" alt="">':'✦')+'</span><strong>'+esc(album.title)+'</strong><small>'+ids.size+' hikâye</small></button>';
 }).join('');
 const create='<button type="button" class="pati-highlight-destination pati-highlight-new" data-action="story-highlight-new" data-id="'+esc(story.id)+'"><span class="pati-highlight-destination-cover">＋</span><strong>Yeni albüm</strong><small>Öne çıkanlar oluştur</small></button>';
 modal('Hikâyeyi öne çıkar','<p class="pati-highlight-help">Hikâyenin profilinde hangi öne çıkanlar bölümünde görünmesini istersin?</p><div class="pati-highlight-destinations">'+create+cards+'</div>','highlight-picker-form');
 document.querySelector('#highlight-picker-form .modal-footer')?.remove();
}
async function addStoryToHighlightAlbum(storyId,albumId){
 const story=data.stories.find(x=>x.id===storyId&&x.author_id===me?.id);
 const album=data.highlightAlbums.find(x=>x.id===albumId&&x.owner_id===me?.id);
 if(!story||!album)throw Error('Hikâye veya albüm bulunamadı.');
 if(!story.is_highlight){
  const marked=await sb.from('patiyiz_stories').update({is_highlight:true}).eq('id',storyId).eq('author_id',me.id);
  if(marked.error)throw marked.error;
  story.is_highlight=true;
  const showing=storyItems.find(x=>x.id===storyId);if(showing)showing.is_highlight=true;
 }
 const link=await sb.from('patiyiz_highlight_items').upsert({album_id:albumId,story_id:storyId},{onConflict:'album_id,story_id'});
 if(link.error)throw link.error;
 closeModal(true);await refresh();notify('Hikâye "'+album.title+'" albümüne eklendi.');
}
function newHighlightAlbum(storyId=''){
 const stories=data.stories.filter(x=>x.author_id===me.id);
 if(!stories.length)return notify('Önce bir hikâye paylaş.',true);
 const selected=storyId&&stories.some(x=>x.id===storyId)?storyId:stories[0].id;
 const options=stories.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===selected?'selected':'')+'>'+esc(cut(x.caption||('Hikâye · '+day(x.created_at)),50))+'</option>').join('');
 modal('Yeni öne çıkanlar albümü','<div class="pati-field"><label>Albüm adı</label><input name="title" maxlength="32" minlength="1" placeholder="Örn. Patim, Geziler, Anılar" required></div><div class="pati-field"><label>İlk hikâyeni seç</label><select name="story_id">'+options+'</select></div><p class="small-note">Profilinde diğer albümlerin yanında ayrı bir daire olarak gösterilir. Daha sonra birden fazla hikâye ekleyebilirsin.</p>','highlight-album-form');
}
function manageHighlightAlbums(){
 const albums=data.highlightAlbums.filter(x=>x.owner_id===me.id);
 modal('Kalıcı hikâyelerini yönet','<p class="small-note">Albümüne hikâye ekle veya albümü kaldır. Albümü kaldırınca hikâyelerin silinmez.</p>'+albums.map(x=>'<div class="pati-album-manage"><b>'+esc(x.title)+'</b><button type="button" data-action="highlight-album-add" data-id="'+esc(x.id)+'">Hikâye ekle</button><button type="button" data-action="highlight-album-delete" data-id="'+esc(x.id)+'">Sil</button></div>').join('')+(!albums.length?'<p>Henüz albüm yok.</p>':''),'highlight-album-manager');
}
function openHighlights(id){const items=data.stories.filter(x=>x.author_id===id&&x.is_highlight).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));if(!items.length)return notify('Öne çıkan hikâye bulunamadı.');closeStory();storyItems=items;storyIndex=0;const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame()}
function stepStory(n){if(!storyItems.length)return;clearTimeout(storyTimer);if(document.getElementById('story-viewers-sheet')?.hidden===false&&n===1)return;const next=storyIndex+n;if(next<0){showStoryFrame();return}if(next>=storyItems.length){closeStory();return}storyIndex=next;showStoryFrame()}

const patiyizOnboardingThankYouUntil=new Map(),patiyizOnboardingDismissed=new Set();
function patiyizProgressCard(){
 const p=current()||{},followingCount=data.follows.filter(x=>x.follower_id===me.id).length;
 const tasks=[
  {label:'Profil fotoğrafını ekle',info:'Profilinde görünecek bir fotoğraf seç',done:!!p.avatar_url,action:'edit-profile'},
  {label:'Hakkında yazını tamamla',info:'Kendini topluluğa kısaca tanıt',done:!!String(p.bio||'').trim(),action:'edit-profile'},
  {label:'Patili dostunu ekle',info:'En az bir hayvan profili oluştur',done:data.pets.some(x=>x.owner_id===me.id),action:'pet-add'},
  {label:'İlk paylaşımını yap',info:'Fotoğraf, video veya yazı paylaş',done:data.posts.some(x=>x.author_id===me.id),action:'compose'},
  {label:'İlk hikâyeni paylaş',info:'İstersen profilinde kalıcı olarak da göster',done:data.stories.some(x=>x.author_id===me.id),action:'story-create'}
 ];
 const count=tasks.filter(x=>x.done).length,complete=count===tasks.length;
 if(complete){
  const id=me.id,key='patiyiz-onboarding-finished-v1:'+id;
  const thanksUntil=patiyizOnboardingThankYouUntil.get(id);
  if(thanksUntil&&Date.now()>=thanksUntil){patiyizOnboardingThankYouUntil.delete(id);patiyizOnboardingDismissed.add(id);return ''}
  if(!thanksUntil){
   if(patiyizOnboardingDismissed.has(id))return '';
   try{if(localStorage.getItem(key)==='1'){patiyizOnboardingDismissed.add(id);return ''}}catch(e){console.warn('Görev durumu cihazda saklanamadı:',e.message)}
   const ms=4600;
   patiyizOnboardingThankYouUntil.set(id,Date.now()+ms);
   try{localStorage.setItem(key,'1')}catch(e){console.warn('Görev durumu cihazda saklanamadı:',e.message)}
   setTimeout(()=>{
    patiyizOnboardingThankYouUntil.delete(id);
    patiyizOnboardingDismissed.add(id);
    if(me?.id===id)document.querySelectorAll('.pati-onboarding-thanks').forEach(node=>node.remove());
   },ms);
  }
  return '<section class="pati-onboarding-thanks" role="status" aria-live="polite" aria-label="Profil görevleri tamamlandı"><span class="pati-onboarding-thanks-icon" aria-hidden="true">'+ico('check')+'</span><div><strong>Harika, profilini tamamladın!</strong><p>Teşekkür ederiz! Artık Patiyiz topluluğunun bir parçasısın. 🐾</p></div></section>';
 }
 return '<section class="pati-progress-card" aria-label="Profil tamamlama görevleri"><div class="pati-progress-top"><span class="pati-progress-flag">🐾</span><div><strong>'+(complete?'Profilin tamamlandı!':'Profilini tamamla')+'</strong><p>'+count+' / '+tasks.length+' görev tamamlandı</p></div><span class="pati-progress-count">'+count+'/'+tasks.length+'</span></div><div class="pati-progress-track" role="progressbar" aria-label="Profil tamamlama ilerlemesi" aria-valuemin="0" aria-valuemax="'+tasks.length+'" aria-valuenow="'+count+'"><div style="width:'+(count/tasks.length*100)+'%"></div></div><div class="pati-progress-actions">'+tasks.map(x=>'<button type="button" class="pati-progress-action '+(x.done?'is-done':'is-pending')+'" data-action="'+x.action+'" aria-label="'+esc(x.label)+(x.done?' tamamlandı':' tamamlanmadı')+'"><span class="pati-task-check" aria-hidden="true">'+(x.done?'✓':'+')+'</span><span><b>'+esc(x.label)+'</b><small>'+esc(x.done?'Tamamlandı · '+x.info:x.info)+'</small></span><i aria-hidden="true">'+(x.done?'✓':'›')+'</i></button>').join('')+'</div></section>';
}

let patiyizReelsObserver=null;
function setupReelsViewer(){
 if(patiyizReelsObserver){patiyizReelsObserver.disconnect();patiyizReelsObserver=null}
 const videos=[...document.querySelectorAll('#main-content .pati-reel-video')];
 if(!videos.length)return;
 if(!('IntersectionObserver'in window)){if(!document.hidden)videos[0].play().catch(()=>{});return}
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 patiyizReelsObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
   const v=entry.target;
   if(entry.isIntersecting&&v.preload==='none'){v.preload='metadata';if(v.readyState===0)v.load()}
   if(entry.isIntersecting&&entry.intersectionRatio>=.65&&!document.hidden&&!v.dataset.manualPause){
    videos.forEach(other=>{if(other!==v)other.pause()});
    v.play().catch(()=>{});
   }else v.pause();
  }
 },{root:document.querySelector('.pati-reels-viewport'),rootMargin:'70% 0px 70% 0px',threshold:[0,.25,.65,.9]});
 videos.forEach(v=>patiyizReelsObserver.observe(v));
}
function reelTogglePlay(button){
 const video=button.closest('.pati-reel-item')?.querySelector('video');if(!video)return;
 if(video.paused){delete video.dataset.manualPause;video.play().catch(()=>notify('Video oynatılamadı.',true))}
 else{video.dataset.manualPause='1';video.pause()}
}
function reelToggleSound(button){
 const video=button.closest('.pati-reel-item')?.querySelector('video');if(!video)return;
 video.muted=!video.muted;button.innerHTML=ico(video.muted?'volume-x':'volume')+'<span class="pati-reel-tool-label">'+(video.muted?'Sesi aç':'Sesi kapat')+'</span>';button.setAttribute('aria-label',video.muted?'Sesi aç':'Sesi kapat');button.setAttribute('aria-pressed',String(!video.muted));
}
function reelsPage(){
 const items=[...data.posts].filter(x=>x.video_url&&!blocked.has(x.author_id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 main.innerHTML='<section class="pati-reels-head"><h1>Reels</h1><button type="button" data-action="pati-create-reels">'+ico('plus')+'<span>Video paylaş</span></button></section><div class="pati-reels-viewport">'+(items.length?items.map((p,index)=>{
  const author=profile(p.author_id),count=data.likes.filter(x=>x.post_id===p.id).length,likedPost=liked.has(p.id),savedPost=saved.has(p.id);
  return '<article class="pati-reel-item" data-post="'+esc(p.id)+'"><video class="pati-reel-video" src="'+esc(p.video_url)+'"'+(p.video_cover_url?' poster="'+esc(p.video_cover_url)+'"':'')+' playsinline muted loop preload="'+(index===0?'auto':index===1?'metadata':'none')+'" aria-label="'+esc(author.display_name)+' videosu"></video>'+
  '<button type="button" class="pati-reel-tap" data-action="reel-play" aria-label="Videoyu oynat veya durdur"></button>'+
  '<div class="pati-reel-author">'+avatar(author,'s')+'<span><strong>'+displayName(author)+'</strong><small>@'+esc(author.handle||'patiyiz')+'</small></span><button type="button" data-action="view-user" data-id="'+esc(author.id)+'">Profil</button></div>'+
  '<div class="pati-reel-caption">'+esc(cut(p.video_subtitle||p.body||'',220))+'</div>'+
  '<div class="pati-reel-rail"><button type="button" class="pati-reel-action '+(likedPost?'active':'')+'" data-action="like" data-id="'+esc(p.id)+'" aria-label="Beğen" aria-pressed="'+likedPost+'">'+ico('heart')+'<span class="pati-reel-count">'+count+'</span></button>'+
  '<button type="button" class="pati-reel-action" data-action="comment" data-id="'+esc(p.id)+'" aria-label="Yorum yap">'+ico('message-circle')+'<span class="pati-reel-count">'+data.comments.filter(x=>x.post_id===p.id).length+'</span></button>'+
  '<button type="button" class="pati-reel-action" data-action="share-post" data-id="'+esc(p.id)+'" aria-label="Paylaş">'+ico('send')+'<span class="pati-reel-action-label">Paylaş</span></button>'+
  '<button type="button" class="pati-reel-action '+(savedPost?'active':'')+'" data-action="save" data-id="'+esc(p.id)+'" aria-label="Kaydet" aria-pressed="'+savedPost+'">'+ico('bookmark')+'<span class="pati-reel-action-label">Kaydet</span></button>'+
  '<button type="button" data-action="reel-speed" class="pati-reel-tool" aria-label="Oynatma hızı 1×">'+ico('gauge')+'<span class="pati-reel-tool-label">1×</span></button>'+
  '<button type="button" data-action="reel-sound" class="pati-reel-tool" aria-label="Sesi aç" aria-pressed="false">'+ico('volume-x')+'<span class="pati-reel-tool-label">Sesi aç</span></button></div></article>'
 }).join(''):'<div class="pati-reels-empty">Henüz Reels yok. İlk videoyu sen paylaş!</div>')+'</div>';
}

function closePatiCreate(){const el=$('#pati-create-sheet');if(el)el.hidden=true;document.body.classList.remove('pati-create-open')}
function openPatiCreate(){const el=$('#pati-create-sheet');if(!el)return;el.hidden=false;document.body.classList.add('pati-create-open');el.querySelector('.pati-create-dismiss')?.focus()}

function openPatiShareModal(postId){
 const post=data.posts.find(p=>p.id===postId);
 if(!post)return notify('Bu paylaşım artık bulunamıyor.',true);
 const people=data.profiles.filter(p=>p.id!==me.id&&!blocked.has(p.id)).sort((a,b)=>Number(followed.has(b.id))-Number(followed.has(a.id))||String(a.display_name||'').localeCompare(String(b.display_name||''),'tr'));
 const author=profile(post.author_id),cover=post.image_url||(post.images||[])[0]||post.video_cover_url||'',summary=cut(post.body||'Paylaşım',95);
 const preview='<div class="pati-share-preview">'+(cover?'<img src="'+esc(cover)+'" alt="Gönderi önizlemesi" loading="lazy">':'<span class="pati-share-preview-icon">'+ico(post.video_url?'up':'image')+'</span>')+'<span><b>'+displayName(author)+'</b><small>'+esc(summary)+'</small></span></div>';
 const search='<label class="pati-share-search"><span class="sr-only">Kişi ara</span>'+ico('search')+'<input id="pati-share-search" type="search" placeholder="Kişi ara" autocomplete="off" aria-label="Paylaşılacak kişiyi ara"></label>';
 const recipients=people.map(p=>'<button type="button" class="pati-share-person" data-action="send-post-dm" data-id="'+esc(p.id)+'" data-post="'+esc(postId)+'" data-name="'+esc((p.display_name||'')+' '+(p.handle||''))+'" aria-label="'+esc(p.display_name||'Patiyiz üyesi')+' kullanıcısına gönder"><span class="pati-share-avatar">'+avatar(p,'l')+'</span><span class="pati-share-person-name">'+esc(p.display_name||'Patiyiz üyesi')+'</span><small>@'+esc(p.handle||'patiyiz')+'</small></button>').join('');
 modal('Paylaş',preview+search+'<div class="pati-share-recipient-title">Kişilere gönder</div><div class="pati-share-people-grid">'+(recipients||'<p class="pati-share-empty">Henüz paylaşabileceğin kullanıcı yok.</p>')+'</div><p class="pati-share-no-match" hidden>Bu isimle kullanıcı bulunamadı.</p><div class="pati-share-quick"><button type="button" data-action="pati-copy-post" data-id="'+esc(postId)+'">'+ico('bookmark')+' Bağlantıyı kopyala</button><button type="button" data-action="pati-share-system" data-id="'+esc(postId)+'">'+ico('send')+' Diğer uygulamalarda paylaş</button></div>','share-post-form');
 const searchField=document.getElementById('pati-share-search');
 searchField?.addEventListener('input',()=>{
  const q=searchField.value.trim().toLocaleLowerCase('tr-TR');
  let visible=0;
  document.querySelectorAll('#share-post-form .pati-share-person').forEach(el=>{
   const matches=String(el.dataset.name||'').toLocaleLowerCase('tr-TR').includes(q);
   el.hidden=!matches;
   if(matches)visible++;
  });
  const noMatch=document.querySelector('#share-post-form .pati-share-no-match');
  if(noMatch)noMatch.hidden=visible>0||people.length===0;
 });
}
function homePage(){
 const list=[...data.posts].filter(p=>!blocked.has(p.author_id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 main.innerHTML=selectedPostId
  ?header('Paylaşım','Bildirimin ilgili olduğu paylaşım.',button('← Ana sayfaya dön','post-back'))+(list.find(p=>p.id===selectedPostId)?postCard(list.find(p=>p.id===selectedPostId)):empty('Paylaşım bulunamadı'))
  :patiyizProgressCard()+storiesStrip()+patiLeaderBoard()+'<div class="pati-feed-posts">'+(list.length?list.map((p,i)=>postCard(p,i<5)).join(''):empty(patiyizLoadedTables.has('posts')?'Henüz paylaşım yok':'Gönderiler yükleniyor…',patiyizLoadedTables.has('posts')?'İlk gönderiyi sen paylaş!':'Paylaşımların yeniden getiriliyor.'))+(pageMore.posts?'<div class="pati-load-more">'+button('Daha fazla paylaşım yükle','load-more','data-id="posts"')+'</div>':'')+'</div>';
}
function explorePage(){
 if(exploreTab==='users'){
  const q=String(search||'').trim().toLocaleLowerCase('tr-TR');
  const users=data.profiles.filter(p=>p.id!==me.id&&!blocked.has(p.id)&&(String(p.handle||'')+' '+String(p.display_name||'')+' '+String(p.city||'')).toLocaleLowerCase('tr-TR').includes(q))
   .sort((a,b)=>Number(followed.has(b.id))-Number(followed.has(a.id))||String(a.handle||a.display_name||'').localeCompare(String(b.handle||b.display_name||''),'tr'));
  main.innerHTML='<section class="pati-search-screen" aria-label="Kullanıcı ara"><form class="pati-search-top" id="pati-explore-form"><label class="pati-search-field">'+ico('search')+'<input type="search" id="explore-search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Kullanıcı ara" value="'+esc(search)+'" aria-label="Kullanıcı ara" autofocus></label><button type="button" class="pati-search-cancel" data-action="pati-search-cancel">İptal</button></form>'+
   '<div class="pati-search-results" aria-live="polite">'+(users.length?users.slice(0,150).map(p=>'<button type="button" class="pati-search-user" data-action="view-user" data-id="'+esc(p.id)+'">'+avatar(p,'l')+'<span class="pati-search-user-info"><strong>'+esc(p.handle||p.display_name||'Patiyiz üyesi')+'</strong><small>'+esc(p.display_name||'Patiyiz üyesi')+(followed.has(p.id)?' · Takiptesin':'')+'</small></span></button>').join(''):'<p class="pati-search-empty">'+(q?'Bu isimle eşleşen profil yok.':'Henüz görüntülenebilen profil yok.')+'</p>')+'</div>'+
   '<button type="button" class="pati-search-discover" data-action="pati-search-discover">Fotoğraf, video ve patili dostları keşfet '+ico('arrow')+'</button></section>';
  return;
 }
 if(exploreTab==='media'){
  const media=data.posts.filter(p=>!blocked.has(p.author_id)&&(p.image_url||p.images?.length||p.video_url)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const tiles=media.map((p,i)=>{
   const photo=p.image_url||(p.images||[])[0],video=!!p.video_url;
   const preview=photo?'<img src="'+esc(photo)+'" loading="'+(i<9?'eager':'lazy')+'" decoding="async" '+(i<3?'fetchpriority="high"':'')+' alt="Patili paylaşım">':
    p.video_cover_url?'<img src="'+esc(p.video_cover_url)+'" loading="'+(i<9?'eager':'lazy')+'" decoding="async" alt="Reels kapağı">':
    '<video src="'+esc(p.video_url)+'#t=0.1" muted playsinline preload="metadata" aria-label="Video önizlemesi"></video>';
   return '<button type="button" class="pati-explore-media" data-action="explore-open-post" data-id="'+esc(p.id)+'" aria-label="Paylaşımı aç">'+preview+(video?'<span class="pati-explore-video-icon">'+ico('up')+'</span>':'')+'</button>';
  }).join('');
  main.innerHTML='<section class="pati-explore-media-screen" aria-label="Keşfet gönderileri"><button type="button" class="pati-explore-search-launch" data-action="pati-search-open" aria-label="Kullanıcı ara">'+ico('search')+'<span>Kullanıcı ara</span></button>'+
   (media.length?'<div class="pati-explore-gallery">'+tiles+'</div>':empty('Henüz fotoğraf veya video yok','İlk paylaşımı sen yap!'))+'</section>';
  return;
 }
const lower=v=>String(v||'').toLocaleLowerCase('tr'),q=lower(search.trim());
const matches=(...v)=>!q||v.some(x=>lower(x).includes(q));
const animalOf=p=>data.pets.find(x=>x.id===p.pet_id)?.species||p.species||'';
const sameAnimal=v=>exploreAnimal==='Tümü'||lower(v)===lower(exploreAnimal);
const likesFor=id=>data.likes.filter(x=>x.post_id===id).length;
const commentsFor=id=>data.comments.filter(x=>x.post_id===id).length;
const people=data.profiles.filter(p=>p.id!==me.id&&!blocked.has(p.id)&&matches(p.display_name,p.handle,p.city,p.bio));
const pets=data.pets.filter(p=>!blocked.has(p.owner_id)&&sameAnimal(p.species)&&matches(p.name,p.species,p.breed,profile(p.owner_id).display_name));
let posts=data.posts.filter(p=>!blocked.has(p.author_id)&&sameAnimal(animalOf(p))&&matches(p.body,animalOf(p),data.pets.find(x=>x.id===p.pet_id)?.name,profile(p.author_id).display_name,profile(p.author_id).handle));
if(exploreTab==='photos')posts=posts.filter(p=>p.image_url);
if(exploreTab==='videos')posts=posts.filter(p=>p.video_url);
posts.sort((a,b)=>exploreSort==='recommended'?((likesFor(b.id)*3+commentsFor(b.id)*4+(followed.has(b.author_id)?6:0)+(data.pets.some(x=>x.owner_id===me.id&&x.species===animalOf(b))?9:0))-(likesFor(a.id)*3+commentsFor(a.id)*4+(followed.has(a.author_id)?6:0)+(data.pets.some(x=>x.owner_id===me.id&&x.species===animalOf(a))?9:0))):exploreSort==='popular'?(likesFor(b.id)*2+commentsFor(b.id)*3-likesFor(a.id)*2-commentsFor(a.id)*3)||(new Date(b.created_at)-new Date(a.created_at)):new Date(b.created_at)-new Date(a.created_at));
const media=posts.filter(p=>p.image_url||p.video_url);
const mediaTiles=media.map(p=>'<button type="button" class="pati-explore-media" data-action="explore-open-post" data-id="'+esc(p.id)+'" aria-label="Paylaşımı aç">'+(p.image_url?'<img loading="lazy" decoding="async" src="'+esc(p.image_url)+'" alt="'+esc(cut(p.body||'Patili paylaşım',70))+'">':'<video muted playsinline preload="metadata" src="'+esc(p.video_url)+'#t=0.1"></video>')+(p.video_url?'<span class="pati-explore-video-icon">▶</span>':'')+'<span class="pati-explore-tile-stats">♥ '+likesFor(p.id)+' · '+commentsFor(p.id)+' yorum</span></button>').join('');
const peopleTiles=people.map(p=>'<article class="pati-explore-person">'+avatar(p,'m')+'<div class="pati-explore-person-name"><strong>'+esc(p.display_name)+'</strong><small>@'+esc(p.handle)+(p.city?' · '+esc(p.city):'')+'</small></div><button type="button" class="pati-explore-person-follow" data-action="follow" data-id="'+esc(p.id)+'">'+(followed.has(p.id)?'Takiptesin':'Takip et')+'</button><button type="button" class="pati-explore-person-profile" data-action="view-user" data-id="'+esc(p.id)+'" aria-label="Profili gör">›</button></article>').join('');
const petTiles=pets.map(p=>'<button class="pati-explore-pet" data-action="view-user" data-id="'+esc(p.owner_id)+'"><span class="pati-explore-pet-picture">'+(p.photo_url?'<img loading="lazy" src="'+esc(p.photo_url)+'" alt="">':'🐾')+'</span><span><strong>'+esc(p.name||'Patili dost')+'</strong><small>'+esc(p.species||'Hayvan')+(p.breed?' · '+esc(p.breed):'')+'</small></span><span>›</span></button>').join('');
const tabs=[['media','Keşfet'],['photos','Fotoğraflar'],['videos','Videolar'],['pets','Patili dostlar']];
const animals=['Tümü','Kedi','Köpek','Kuş','Balık','Tavşan','Diğer'];
const mediaTab=['media','all','photos','videos'].includes(exploreTab);
const textPosts=exploreTab==='all'?posts.filter(p=>!p.image_url&&!p.video_url):[];
main.innerHTML='<section class="pati-explore-head"><h1>Keşfet 🐾</h1><p>Yeni dostlar, sevimli anlar ve keşfedilecek hikâyeler.</p></section>'
+'<button type="button" class="pati-explore-search pati-explore-search-launch" data-action="pati-search-open" aria-label="Kullanıcı ara">'+ico('search')+'<span>Kullanıcı ara</span></button>'
+'<nav class="pati-explore-tabs" aria-label="Keşfet kategorileri">'+tabs.map(t=>'<button type="button" data-action="explore-tab" data-id="'+t[0]+'" class="'+(exploreTab===t[0]?'active':'')+'" aria-pressed="'+(exploreTab===t[0])+'">'+t[1]+'</button>').join('')+'</nav>'
+'<div class="pati-explore-filter"><div class="pati-explore-animals">'+animals.map(name=>'<button type="button" data-action="explore-animal" data-id="'+name+'" class="'+(exploreAnimal===name?'active':'')+'">'+name+'</button>').join('')+'</div>'+(mediaTab?'<button type="button" class="pati-explore-sort" data-action="explore-sort">'+(exploreSort==='popular'?'★ Popüler':exploreSort==='recommended'?'✦ Sana özel':'◷ En yeni')+'</button>':'')+'</div>'
+(mediaTab?'<section class="pati-explore-section"><div class="pati-explore-section-title"><h2>'+(exploreSort==='popular'?'Popüler paylaşımlar':'Fotoğraf ve videolar')+'</h2><span>'+media.length+' paylaşım</span></div>'+(media.length?'<div class="pati-explore-gallery">'+mediaTiles+'</div>':empty('Uygun fotoğraf veya video bulunamadı','Başka bir arama veya filtre deneyebilirsin.'))+'</section>':'')
+(exploreTab==='all'&&textPosts.length?'<section class="pati-explore-section"><div class="pati-explore-section-title"><h2>Yazılı paylaşımlar</h2></div>'+textPosts.slice(0,6).map(postCard).join('')+'</section>':'')
+(['all','users'].includes(exploreTab)?'<section class="pati-explore-section"><div class="pati-explore-section-title"><h2>'+(exploreTab==='users'?'Hayvanseverler':'Önerilen kullanıcılar')+'</h2></div>'+(people.length?'<div class="pati-explore-people">'+peopleTiles+'</div>':empty('Kullanıcı bulunamadı'))+'</section>':'')
+(exploreTab==='pets'?'<section class="pati-explore-section"><div class="pati-explore-section-title"><h2>Patili dostlar</h2></div>'+(pets.length?'<div class="pati-explore-pets">'+petTiles+'</div>':empty('Patili dost bulunamadı'))+'</section>':'');
}
function communityPage(){let categories=['Tümü','Genel','Sağlık','Beslenme','Eğitim','Davranış','Bakım','Diğer'];let qs=[...data.questions].filter(x=>!blocked.has(x.author_id)&&(communityCategory==='Tümü'||x.category===communityCategory)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));main.innerHTML=header('Topluluk','Sorular, yanıtlar ve hayvansever deneyimleri.',button('+ Soru sor','question'))+`<div class="pati-filter-tabs">${categories.map(cat=>`<button type="button" data-action="community-filter" data-id="${cat}" class="${communityCategory===cat?'active':''}">${cat}</button>`).join('')}</div><div class="pati-list">${qs.map(q=>`<article class="pati-card"><div class="pati-row between">${userRow(q.author_id,day(q.created_at))}<span class="pati-pill">${esc(q.category)}</span></div><h3 style="margin-top:13px">${esc(q.title)}</h3><p>${esc(q.body)}</p><div class="pati-actionbar"><button data-action="vote" data-id="${q.id}" class="${voted.has(q.id)?'active':''}">▲ ${data.votes.filter(x=>x.question_id===q.id).length} Faydalı</button><button data-action="replies" data-id="${q.id}">💬 ${data.replies.filter(x=>x.question_id===q.id).length} cevap</button>${q.author_id===me.id?`<button class="danger" data-action="delete-question" data-id="${q.id}">Sil</button>`:`<button data-action="report" data-id="${q.id}" data-kind="question">Bildir</button>`}</div></article>`).join('')}</div>${qs.length?'':empty('Henüz soru yok','İlk soruyu sen sorabilirsin.')}`}
const knowledge=window.PATIYIZ_KNOWLEDGE||[];
function practicalGuide(a){const t=a.title.toLocaleLowerCase('tr'),sp=a.species;let urgent='Nefes almada güçlük, bayılma, nöbet, ciddi kanama veya belirgin halsizlik varsa beklemeden veteriner kliniğine başvurun.';let steps=[];
if(/kus|kusma|istifra|ishal|dışkı/.test(t)){steps=['İlk olarak ne zaman başladığını, kaç kez tekrarlandığını ve kusmuk/dışkının rengini not edin.','Hayvanın normal davranıp davranmadığını, su içmesini, iştahını ve tuvalet sıklığını izleyin.','Yabancı cisim, zehirli madde veya farklı yiyecek ihtimali varsa gecikmeden veterineri arayın.','Kendi kendinize insan ilacı, antibiyotik veya kusma ilacı vermeyin.'];urgent='Tekrarlayan kusma, kan, şiş karın, suyu tutamama, ağrı, yavru/yaşlı hayvan ya da halsizlik durumunda aynı gün veteriner desteği alın.'}
else if(/idrar|tuvalet|kum|işeme/.test(t)){steps=['Tuvalet kabını ve ortamın sessizliğini gözden geçirin; kabı günlük temizleyin.','İdrar veya dışkı sıklığında, miktarında ve zorlanmada değişiklik olup olmadığını not edin.','Evdeki tuvalet sayısını ve ulaşılabilirliği artırın; ani kum değişikliğinden kaçının.','Davranışı cezalandırmayın; ağrı veya hastalık nedenini veterinerle dışlayın.'];urgent='Özellikle kedilerde idrar yapmaya çalışıp yapamamak hayatı tehdit eden acildir; hemen veterinere gidin.'}
else if(/mama|beslen|su iç|iştah|kilo/.test(t)){steps=['Hayvanın yaşına, türüne ve sağlık durumuna uygun tam ve dengeli besin seçin.','Ölçülü porsiyon verin; ödülleri ve ek gıdaları günlük toplamdan sayın.','Yeni mamaya birkaç gün içinde kademeli geçin; dışkı, iştah ve su tüketimini izleyin.','Kilo ve vücut kondisyonunu düzenli kaydedip gerekirse veterinerle porsiyon planı oluşturun.'];urgent='24 saati aşan iştahsızlık, aşırı susama, hızlı kilo kaybı veya kusma ile birlikte yememe için veterinere başvurun; yavrularda daha erken davranın.'}
else if(/kork|stres|agres|ısır|havla|miyav|tı(r|r)|davran|eğitim/.test(t)){steps=['Davranışın başladığı anları, ortamı, sesi ve beden dilini kaydedin.','Zorlamayı ve cezalandırmayı bırakıp hayvana güvenli kaçış/dinlenme alanı sağlayın.','İstenen sakin davranışları kısa tekrarlarla ödüllendirin; tetikleyicilere aşamalı yaklaşın.','Ani değişim, ağrı şüphesi veya yaralanma riski varsa veteriner ve nitelikli davranış uzmanına danışın.'];urgent='Ani saldırganlık, ağrı, kendine zarar verme veya ciddi korku davranışı varsa sağlık nedenleri öncelikle değerlendirilmelidir.'}
else if(/zehir|toksik|çikolata|zambak|acil/.test(t)){steps=['Hayvanı tehlike kaynağından uzaklaştırın, kendi güvenliğinizi de koruyun.','Şüpheli ürünü, miktarı ve maruziyet saatini not edip ambalajı saklayın.','Hemen veterineri arayıp tür, kilo, belirtiler ve olası maddeyi iletin.','Veteriner istemedikçe kusturmayın, ağızdan ilaç/yağ/tuz vermeyin.'];urgent='Zehirlenme şüphesinde belirti başlamasını beklemeyin: hemen veterinerle görüşün.'}
else {steps=['Önce hayvanın normal rutinini, ortamını ve bu konudaki asıl değişikliği belirleyin.','Rehberdeki önerilerden bir veya ikisini güvenli biçimde uygulayın; her şeyi aynı anda değiştirmeyin.','İştah, su tüketimi, hareket, davranış ve tuvalet düzenini birkaç gün not edin.','İlerleme yoksa veya belirtiler kötüleşiyorsa veterinerden hayvanınıza özel değerlendirme isteyin.'];}
return '<div class="kb-action-plan"><h3>Adım adım ne yapmalı?</h3><ol>'+steps.map((x,i)=>'<li><strong>'+(i+1)+'. adım:</strong> '+esc(x)+'</li>').join('')+'</ol><h3>Ne zaman profesyonel destek gerekli?</h3><p>'+esc(urgent)+'</p><h3>Kontrol listesi</h3><p>İşlem sonrası gözlediğiniz değişiklikleri ve tarihlerini yazın. İyileşme yoksa ilk değerlendirmeyi tekrarlamak yerine veterinerden yardım alın.</p></div>'}

const patiyizLessons=[
{id:'intro',name:'Hayvanlarla güvenli iletişim',cat:'Genel',icon:'🤝',minutes:5,desc:'Farklı türlerin sınırlarına saygı duymak',parts:['Her hayvanın kendine özgü bir iletişim biçimi vardır. Yaklaşmadan önce beden dilini izle, sakin davran ve hayvanın uzaklaşmasına izin ver.','Tanımadığın bir hayvana aniden dokunma; hayvanın sahibi veya bakım vereninden izin al. Korku belirtilerinde teması durdur.','Hayvanın davranışlarını insan duygularıyla birebir eşitleme. İhtiyaçlarını türüne, yaşına ve ortamına göre değerlendir.'],q:'Tanımadığın ve tedirgin görünen bir hayvana nasıl davranmalısın?',opts:['Hemen kucağına almak','Mesafe bırakıp sakin kalmak','Yüksek sesle çağırmak'],answer:1},
{id:'cat',name:'Kedilerde güvenli ev ortamı',cat:'Kedi',icon:'🐈',minutes:6,desc:'Saklanma alanı, kum ve günlük rutin',parts:['Kedilerin saklanabilecekleri sessiz bir yere, tırmalama alanına ve kolay erişilebilir suya ihtiyacı vardır.','Kum kabını düzenli temizlemek ve sakin bir yere koymak önemlidir. Ani davranış değişimlerinde veteriner görüşü alın.','Pencere ve balkonları güvenli hâle getir; özellikle zambak gibi kediler için tehlikeli bitkileri erişimden uzak tut.'],q:'Kedi için güvenli ev ortamında hangisi önemlidir?',opts:['Korumasız açık balkon','Temiz kum ve saklanma alanı','İnsan ilacı bulundurmak'],answer:1},
{id:'dog',name:'Köpeklerde pozitif eğitim',cat:'Köpek',icon:'🐕',minutes:6,desc:'Ödül temelli temel iletişim',parts:['İstenilen davranışı gerçekleştiği anda ödüllendirmek öğrenmeyi destekler. Kısa ve tutarlı çalışmalarla başla.','Fiziksel ceza ve korkutma yöntemlerinden kaçın. Eğitim sırasında stres belirtilerini izle ve mola ver.','Yürüyüş, zihinsel uyarım ve kontrollü sosyalleşme bireyin ihtiyaçlarına göre planlanmalıdır.'],q:'Köpek eğitiminde hangi yaklaşım önerilir?',opts:['Korkutarak öğretmek','Tutarlı ve ödül temelli çalışma','Her hatada cezalandırmak'],answer:1},
{id:'bird',name:'Kuşlarda yaşam alanı',cat:'Kuş',icon:'🦜',minutes:5,desc:'Kafes, hava kalitesi ve zenginleştirme',parts:['Kuşların hareket etmesine uygun alan, türe uygun tünek ve güvenli oyuncaklar önemlidir.','Mutfak dumanı, sigara ve aşırı ısınmış yapışmaz tava kaplamalarından çıkan dumanlar kuşlar için tehlikeli olabilir.','Beslenme ihtiyaçları türlere göre değişir; yalnızca tek tip tohum vermek yeterli olmayabilir. Kuş veterinerinden öneri al.'],q:'Kuş bulunan ortamda hangisine dikkat edilmeli?',opts:['Temiz hava ve güvenli oyuncaklar','Mutfak dumanına maruz bırakmak','Yalnızca tek tip beslenme'],answer:0},
{id:'fish',name:'Akvaryumda dengeli bakım',cat:'Balık',icon:'🐠',minutes:5,desc:'Su kalitesi ve uygun tür seçimi',parts:['Balıklar için akvaryumun hacmi, filtre sistemi ve su parametreleri seçilen türün ihtiyaçlarına uygun olmalıdır.','Yeni kurulmuş akvaryumda biyolojik filtrasyonun olgunlaşması gerekir; balıkları hemen eklemek sorun yaratabilir.','Aşırı yemleme ve ani su parametresi değişimleri risklidir. Güvenilir bakım rehberlerinden türüne özel bilgi edin.'],q:'Sağlıklı akvaryum bakımında hangisi önemlidir?',opts:['Ani ve büyük değişimler','Uygun su koşulları ve filtreleme','Sürekli fazla yem vermek'],answer:1},
{id:'small',name:'Tavşan ve küçük memeliler',cat:'Diğer',icon:'🐇',minutes:6,desc:'Alan, beslenme ve stresin azaltılması',parts:['Tavşanlar ve küçük memeliler türlerine uygun geniş hareket alanına ve saklanma noktalarına ihtiyaç duyar.','Tavşanlarda uygun lif kaynağı önemlidir; yem seçimi ve yaşam koşullarını tür konusunda deneyimli veterinerle değerlendir.','Bu hayvanların bazıları av türüdür; zorla kucağa almak yoğun strese neden olabilir.'],q:'Küçük memeliler için hangisi daha uygundur?',opts:['Zorla tutmak','Türüne uygun alan ve sakin yaklaşım','Her türü aynı şekilde beslemek'],answer:1}
];
patiyizLessons.push(...(window.PATIYIZ_EXTRA_LESSONS||[]));
let educationCategory='Tümü',educationLesson='',educationAnswer={},educationSearch='';
let educationCloudDone=new Set(),educationCloudUser='';
function educationLocalDone(){try{return new Set(JSON.parse(localStorage.getItem('patiyiz-edu-'+(me?.id||'guest'))||'[]'))}catch{return new Set()}}
function educationDone(){return new Set([...educationLocalDone(),...(educationCloudUser===me?.id?educationCloudDone:[])])}
async function educationCloudLoad(){
 if(!me||!sb)return;
 const uid=me.id;
 try{
  const result=await sb.from('patiyiz_education_progress').select('lesson_id').eq('user_id',uid);
  if(result.error)throw result.error;
  if(me?.id!==uid)return;
  educationCloudUser=uid;educationCloudDone=new Set((result.data||[]).map(x=>x.lesson_id));
  const missing=[...educationLocalDone()].filter(id=>patiyizLessons.some(l=>l.id===id)&&!educationCloudDone.has(id));
  if(missing.length){
   const transfer=await sb.from('patiyiz_education_progress').upsert(missing.map(lesson_id=>({user_id:uid,lesson_id})),{onConflict:'user_id,lesson_id',ignoreDuplicates:true});
   if(transfer.error)throw transfer.error;
   if(me?.id!==uid)return;
   missing.forEach(id=>educationCloudDone.add(id));
  }
  if(view==='education')render();
 }catch(e){console.warn('Akademi ilerlemesi yüklenemedi:',e);if(view==='education')notify('Akademi ilerlemesi eşitlenemedi. Bağlantını kontrol et.',true)}
}
function educationMark(id){
 if(!me||!patiyizLessons.some(l=>l.id===id))return;
 const uid=me.id,done=educationDone();if(done.has(id))return;
 done.add(id);
 try{localStorage.setItem('patiyiz-edu-'+uid,JSON.stringify([...done]))}catch(_){}
 if(educationCloudUser===uid)educationCloudDone.add(id);
 void sb.from('patiyiz_education_progress')
  .upsert({user_id:uid,lesson_id:id},{onConflict:'user_id,lesson_id',ignoreDuplicates:true})
  .then(({error})=>{if(error)throw error})
  .catch(e=>{console.warn('Akademi kaydı:',e);if(me?.id===uid)notify('Ders ilerlemesi çevrimiçi kaydedilemedi. Yeniden bağlanınca eşitlenecek.',true)});
}
function educationPage(){
 const completed=educationDone();
 if(educationLesson){const l=patiyizLessons.find(x=>x.id===educationLesson);if(!l){educationLesson='';educationPage();return}
 const chosen=educationAnswer[l.id];const index=patiyizLessons.findIndex(x=>x.id===l.id),next=patiyizLessons[index+1];
 main.innerHTML='<section class="pati-edu"><button class="pati-edu-back" data-action="education-back">← Tüm eğitimler</button><div class="pati-edu-lesson-head"><span>'+l.icon+'</span><div><small>'+esc(l.cat)+' · '+l.minutes+' dakikalık okuma</small><h1>'+esc(l.name)+'</h1><p>'+esc(l.desc)+'</p></div></div><div class="pati-edu-lesson-body">'+l.parts.map((p,i)=>'<div class="pati-edu-step"><b>'+(i+1)+'</b><p>'+esc(p)+'</p></div>').join('')+'<div class="pati-edu-quiz"><strong>Bilgini test et</strong><p>'+esc(l.q)+'</p>'+l.opts.map((o,i)=>'<button class="'+(chosen===i?'selected':'')+'" data-action="education-answer" data-id="'+l.id+'" data-choice="'+i+'">'+esc(o)+'</button>').join('')+(chosen!==undefined?'<p class="pati-edu-feedback">'+(chosen===l.answer?'✓ Doğru! Dersi tamamladın.':'Bu seçenek doğru değil. Tekrar deneyebilirsin.')+'</p>':'')+'</div><div class="pati-edu-next">'+(next?'<button data-action="education-next" data-id="'+esc(next.id)+'">Sıradaki ders: '+esc(next.name)+' →</button>':'<button data-action="education-back">Tüm eğitimlere dön ✓</button>')+'</div><p class="pati-edu-notice">Eğitimler genel bilgilendirme amaçlıdır; veteriner muayenesi ve bireysel uzman görüşünün yerine geçmez.</p></div></section>';return}
 const query=educationSearch.trim().toLocaleLowerCase('tr-TR');
 const list=patiyizLessons.filter(l=>(educationCategory==='Tümü'||l.cat===educationCategory)&&(!query||[l.name,l.desc,l.cat].some(v=>v.toLocaleLowerCase('tr-TR').includes(query))));
 const completedCount=patiyizLessons.filter(l=>completed.has(l.id)).length;
 const progress=Math.round(completedCount*100/patiyizLessons.length);
 const duration=patiyizLessons.reduce((n,l)=>n+l.minutes,0);
 const nextLesson=patiyizLessons.find(l=>!completed.has(l.id));
 main.innerHTML='<section class="pati-edu"><div class="pati-edu-hero"><span>ÜCRETSİZ ÖĞRENME ALANI</span><h1>Patiyiz Akademi: Patili dostunu daha iyi tanı.</h1><p>10 konuda 101 ücretsiz ders, 101 mini sınav ve hesabına kaydedilen öğrenme ilerlemesi.</p><div class="pati-edu-summary"><b>'+completedCount+' / '+patiyizLessons.length+'</b><small>ders tamamlandı · '+duration+' dk toplam eğitim</small></div><div class="pati-edu-progressbar" role="progressbar" aria-label="Akademi tamamlanma oranı" aria-valuenow="'+progress+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+progress+'%"></span></div><p class="pati-edu-progress-text">İlerlemen: %'+progress+' · Sınavı doğru tamamlanan dersler hesabına kaydedilir.</p></div><div class="pati-edu-learning-toolbar"><label class="pati-edu-search-label" for="pati-academy-search">Ders ara</label><input id="pati-academy-search" type="search" placeholder="101 derste konu ara…" value="'+esc(educationSearch)+'" autocomplete="off" aria-label="Akademi derslerinde ara">'+(nextLesson?'<button type="button" data-action="education-continue" data-id="'+esc(nextLesson.id)+'">▶ Kaldığın yerden devam et</button>':'<span class="pati-edu-all-done">✓ Tüm dersleri bitirdin!</span>')+'</div><div class="pati-edu-categories">'+['Tümü',...new Set(patiyizLessons.map(l=>l.cat))].map(t=>'<button class="'+(educationCategory===t?'active':'')+'" data-action="education-filter" data-id="'+t+'">'+t+'</button>').join('')+'</div><div class="pati-edu-grid">'+list.map(l=>'<button class="pati-edu-card" data-action="education-open" data-id="'+l.id+'"><span class="pati-edu-emoji">'+l.icon+'</span><span class="pati-edu-card-body"><small>'+esc(l.cat)+' · '+l.minutes+' dk</small><strong>'+esc(l.name)+'</strong><span>'+esc(l.desc)+'</span></span><b class="pati-edu-status">'+(completed.has(l.id)?'✓ Tamamlandı':'Başla →')+'</b></button>').join('')+'</div>'+(!list.length?'<p class="pati-edu-empty">Aramana uygun ders bulunamadı. Başka bir kelime veya kategori dene.</p>':'')+'<p class="pati-edu-notice">Bu bölüm eğitim amaçlıdır. Acil sağlık durumlarında veteriner desteği alın.</p></section>';
}

/* Private pet wellness and public verified activity ranking */
let patiWellness={reminders:[],weights:[],loaded:false,loading:false,notified:new Set()};
let patiLeaderboard=[];
let patiWellnessHeartbeat=false;
const patiReminderNames={vaccine:'Aşı takvimi',vet:'Veteriner randevusu',food:'Mama / öğün',medicine:'İlaç hatırlatması'};
function patiWellnessOwnedPets(){return data.pets.filter(p=>p.owner_id===me?.id)}
function patiPetSelector(name='pet_id'){
 return '<label class="pati-wellness-field">Hayvanın<select name="'+name+'" required>'+patiWellnessOwnedPets().map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></label>';
}
function patiWellnessDueItems(){
 return patiWellness.reminders.filter(x=>!x.completed_at).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at));
}
function patiWellnessAlerts(){
 if(!me||!patiWellness.loaded)return;
 const now=Date.now();
 const due=patiWellnessDueItems().filter(x=>{
  const t=Date.parse(x.due_at);
  return Number.isFinite(t)&&t-(x.remind_minutes_before*60000)<=now&&!patiWellness.notified.has(x.id);
 }).slice(0,3);
 for(const x of due){patiWellness.notified.add(x.id);notify((patiReminderNames[x.kind]||'Bakım')+': '+x.title+' · '+(data.pets.find(p=>p.id===x.pet_id)?.name||'Patili dost'))}
}
async function patiWellnessFetch(silent=false){
 if(!me||!sb||patiWellness.loading)return;
 const uid=me.id;patiWellness.loading=true;
 try{
  const [a,b]=await Promise.all([
   sb.from('patiyiz_pet_reminders').select('id,pet_id,kind,title,note,due_at,remind_minutes_before,repeat_days,completed_at').eq('owner_id',uid).order('due_at',{ascending:true}).limit(250),
   sb.from('patiyiz_pet_weights').select('id,pet_id,weight_kg,measured_on,note').eq('owner_id',uid).order('measured_on',{ascending:false}).limit(150)
  ]);
  if(a.error)throw a.error;if(b.error)throw b.error;if(me?.id!==uid)return;
  patiWellness={...patiWellness,reminders:a.data||[],weights:b.data||[],loaded:true};
  if(view==='wellness')render();
  patiWellnessAlerts();
  if(!patiWellnessHeartbeat){
   patiWellnessHeartbeat=true;
   window.setInterval(()=>{if(me&&document.visibilityState==='visible')patiWellnessAlerts()},60000);
  }
 }catch(e){console.warn('Bakım takvimi yüklenemedi:',e);if(!silent)notify('Sağlık takvimi yüklenemedi: '+friendly(e),true)}
 finally{patiWellness.loading=false}
}
function patiWellnessPage(){
 if(!patiWellness.loaded&&!patiWellness.loading)void patiWellnessFetch();
 const pets=patiWellnessOwnedPets();
 const selectedId=patiWellnessPetId&&pets.some(p=>p.id===patiWellnessPetId)?patiWellnessPetId:(pets[0]?.id||'');
 patiWellnessPetId=selectedId;
 const weights=patiWellness.weights.filter(w=>w.pet_id===selectedId).slice(0,15);
 const latest=weights[0],previous=weights[1];
 const next=patiWellness.reminders.filter(x=>x.pet_id===selectedId&&!x.completed_at).sort((a,b)=>Date.parse(a.due_at)-Date.parse(b.due_at));
 const done=patiWellness.reminders.filter(x=>x.pet_id===selectedId&&x.completed_at).slice(0,10);
 const cards=next.map(x=>{
  const mins=Math.max(0,Date.parse(x.due_at)-Date.now())/60000;
  const urgency=mins<0?'Gecikti':mins<1440?'Yaklaşıyor':'Planlandı';
  const when=new Date(x.due_at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'});
  return '<article class="pati-wellness-event"><span class="pati-wellness-event-icon">'+({vaccine:'💉',vet:'🩺',food:'🥣',medicine:'💊'}[x.kind]||'🐾')+'</span><div><strong>'+esc(x.title)+'</strong><small>'+esc(patiReminderNames[x.kind]||'Bakım')+' · '+esc(when)+'</small><small>'+esc(x.note||'')+'</small><span class="pati-wellness-urgency">'+urgency+(x.repeat_days?' · Her '+x.repeat_days+' günde bir':'')+'</span></div><div class="pati-wellness-event-actions"><button data-action="wellness-reminder-done" data-id="'+esc(x.id)+'">✓ Tamamla</button><button data-action="wellness-reminder-delete" data-id="'+esc(x.id)+'" aria-label="Hatırlatmayı sil">×</button></div></article>';
 }).join('');
 const weightRows=weights.map(w=>'<div class="pati-wellness-weight-row"><span>'+esc(day(w.measured_on))+'</span><strong>'+Number(w.weight_kg).toLocaleString('tr-TR')+' kg</strong><button data-action="wellness-weight-delete" data-id="'+esc(w.id)+'" aria-label="Ölçümü sil">×</button></div>').join('');
 main.innerHTML='<section class="pati-wellness-page"><div class="pati-wellness-heading"><div><span>🐾 PATİYİZ BAKIM MERKEZİ</span><h1>Hayvan Sağlığı & Takvimi</h1><p>Aşı, veteriner, ilaç, beslenme ve kilo geçmişi.</p></div></div>'+
 (pets.length?'<div class="pati-wellness-pet-tabs">'+pets.map(p=>'<button type="button" data-action="wellness-pet" data-id="'+esc(p.id)+'" class="'+(p.id===selectedId?'active':'')+'">'+esc(p.name)+'</button>').join('')+'</div>'+
 '<div class="pati-wellness-actions"><button data-action="wellness-reminder-add">＋ Hatırlatma ekle</button><button data-action="wellness-weight-add">＋ Kilo kaydet</button></div>'+
 '<div class="pati-wellness-summary"><div><small>Yaklaşan görev</small><strong>'+next.length+'</strong></div><div><small>Son ölçüm</small><strong>'+(latest?Number(latest.weight_kg).toLocaleString('tr-TR')+' kg':'—')+'</strong></div><div><small>Kilo değişimi</small><strong>'+(latest&&previous?((Number(latest.weight_kg)-Number(previous.weight_kg))>0?'+':'')+(Number(latest.weight_kg)-Number(previous.weight_kg)).toFixed(2)+' kg':'—')+'</strong></div></div>'+
 '<h2>Yaklaşan hatırlatmalar</h2><div class="pati-wellness-events">'+(cards||'<p class="pati-wellness-empty">Bu hayvan için hatırlatma ekleyebilirsin.</p>')+'</div>'+
 '<h2>Kilo takibi</h2><div class="pati-wellness-weights">'+(weightRows||'<p class="pati-wellness-empty">Henüz kilo ölçümü eklenmedi.</p>')+'</div>'+
 (done.length?'<details class="pati-wellness-completed"><summary>Tamamlananlar ('+done.length+')</summary>'+done.map(x=>'<p>✓ '+esc(x.title)+' · '+esc(new Date(x.due_at).toLocaleDateString('tr-TR'))+'</p>').join('')+'</details>':'')+
 '<p class="pati-wellness-disclaimer">Hatırlatmalar, Patiyiz açıkken de gösterilir. Bildirimler bölümünden telefon bildirimlerine izin verirsen zamanı geldiğinde uygulama kapalıyken de bildirim gönderilebilir; teslimat cihaz ve bağlantı koşullarına bağlıdır. Aşı ve ilaç planını veterinerinle birlikte belirle.</p></section>':
 '<div class="pati-wellness-empty-card"><h2>Önce patili dostunu ekle 🐾</h2><p>Aşı, randevu, mama ve kilo takibi için hayvan profili gerekli.</p><button data-action="pet-add">＋ Hayvan ekle</button></div>')+'</section>';
}
function patiWellnessReminderDialog(){
 if(!patiWellnessOwnedPets().length)return notify('Önce hayvan profili ekle.',true);
 const defaultDate=new Date(Date.now()+86400000);const dateLocal=new Date(defaultDate.getTime()-defaultDate.getTimezoneOffset()*60000).toISOString().slice(0,16);
 modal('Yeni sağlık hatırlatması',patiPetSelector()+
 '<label class="pati-wellness-field">Hatırlatma türü<select name="kind">'+Object.entries(patiReminderNames).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('')+'</select></label>'+
 '<label class="pati-wellness-field">Başlık<input name="title" required minlength="2" maxlength="110" placeholder="Örn. Karma aşı, veteriner, akşam maması"></label>'+
 '<label class="pati-wellness-field">Tarih ve saat<input type="datetime-local" name="due_at" required value="'+dateLocal+'"></label>'+
 '<label class="pati-wellness-field">Ne kadar önce hatırlat?<select name="remind_minutes_before"><option value="0">Zamanında</option><option value="30">30 dakika önce</option><option value="60" selected>1 saat önce</option><option value="1440">1 gün önce</option><option value="2880">2 gün önce</option></select></label>'+
 '<label class="pati-wellness-field">Tekrar<select name="repeat_days"><option value="">Bir kere</option><option value="1">Her gün</option><option value="7">Her hafta</option><option value="30">30 günde bir</option><option value="365">Her yıl</option></select></label>'+
 '<label class="pati-wellness-field">Not (isteğe bağlı)<textarea name="note" maxlength="500" rows="2" placeholder="Doz, veteriner iletişim bilgisi vb."></textarea></label>','wellness-reminder-form');
 const select=document.querySelector('#wellness-reminder-form select[name="pet_id"]');if(select)select.value=patiWellnessPetId||patiWellnessOwnedPets()[0].id;
}
function patiWellnessWeightDialog(){
 if(!patiWellnessOwnedPets().length)return notify('Önce hayvan profili ekle.',true);
 modal('Kilo ölçümü kaydet',patiPetSelector()+
 '<label class="pati-wellness-field">Kilo (kg)<input name="weight_kg" type="number" min="0.01" max="300" step="0.01" required placeholder="Örn. 4.20"></label>'+
 '<label class="pati-wellness-field">Ölçüm tarihi<input name="measured_on" type="date" required value="'+new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)+'"></label>'+
 '<label class="pati-wellness-field">Not (isteğe bağlı)<input name="note" maxlength="250" placeholder="Örn. Veteriner kontrolü"></label>','wellness-weight-form');
 const select=document.querySelector('#wellness-weight-form select[name="pet_id"]');if(select)select.value=patiWellnessPetId||patiWellnessOwnedPets()[0].id;
}
async function patiWellnessSaveReminder(form,str){
 const petId=str('pet_id');if(!patiWellnessOwnedPets().some(p=>p.id===petId))throw Error('Kendi hayvanını seç.');
 const date=new Date(str('due_at'));if(!Number.isFinite(date.getTime()))throw Error('Hatırlatma tarihi geçersiz.');
 const repeat=str('repeat_days')?Number(str('repeat_days')):null;
 const r=await sb.from('patiyiz_pet_reminders').insert({owner_id:me.id,pet_id:petId,kind:str('kind'),title:str('title'),due_at:date.toISOString(),
  note:str('note'),remind_minutes_before:Number(str('remind_minutes_before')),repeat_days:repeat});
 if(r.error)throw r.error;closeModal(true);await patiWellnessFetch();notify('Hatırlatma kaydedildi.');
}
async function patiWellnessSaveWeight(form,str){
 const petId=str('pet_id');if(!patiWellnessOwnedPets().some(p=>p.id===petId))throw Error('Kendi hayvanını seç.');
 const weight=Number(str('weight_kg'));if(!Number.isFinite(weight)||weight<=0||weight>300)throw Error('0–300 kg arası ölçüm gerekli.');
 const r=await sb.from('patiyiz_pet_weights').insert({owner_id:me.id,pet_id:petId,weight_kg:weight,measured_on:str('measured_on'),note:str('note')});
 if(r.error)throw r.error;closeModal(true);await patiWellnessFetch();notify('Kilo ölçümü kaydedildi.');
}
async function patiWellnessToggle(id){
 const entry=patiWellness.reminders.find(x=>x.id===id);
 if(!entry)return;
 await run(async()=>{
  const r=await sb.rpc('patiyiz_complete_pet_reminder',{p_id:id});if(r.error)throw r.error;
  await patiWellnessFetch();notify(entry.repeat_days?'Tamamlandı. Bir sonraki hatırlatma oluşturuldu.':'Hatırlatma tamamlandı.');
 });
}
async function patiWellnessDelete(table,id){
 if(!confirm('Bu kaydı silmek istiyor musun?'))return;
 await run(async()=>{
  const r=await sb.from(table).delete().eq('id',id).eq('owner_id',me.id);if(r.error)throw r.error;
  await patiWellnessFetch();notify('Kayıt silindi.');
 });
}
let patiWellnessPetId='';
async function patiPublicActivityInit(){
 if(!me||!sb)return;const uid=me.id;
 try{
  const [track,leaders]=await Promise.all([sb.rpc('patiyiz_track_daily_active'),sb.rpc('patiyiz_active_top_five')]);
  if(track.error)console.warn('Günlük aktivite ölçümü:',track.error.message);
  if(leaders.error)throw leaders.error;
  if(me?.id!==uid)return;
  patiLeaderboard=Array.isArray(leaders.data)?leaders.data:[];
  const container=document.querySelector('#pati-active5');
  if(container)container.outerHTML=patiLeaderBoard();
 }catch(e){console.warn('En aktif üyeler:',e)}
}
function patiLeaderBoard(){
 const users=patiLeaderboard.filter(p=>p.user_id&&!blocked.has(p.user_id)).slice(0,5);
 return '<section class="pati-active-leaderboard" id="pati-active5"><div class="pati-active-heading"><div><strong>🏆 En Aktif 5 Pati</strong><small>Son 7 gün · herkese açık etkileşimler</small></div></div>'+
 '<div class="pati-active-users">'+(users.length?users.map((p,i)=>
 '<button class="pati-active-person" data-action="view-user" data-id="'+esc(p.user_id)+'"><span class="pati-active-rank">'+(i+1)+'</span>'+
 (p.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="" loading="lazy">':'<span class="pati-active-placeholder">🐾</span>')+
 '<strong>'+esc(p.display_name||p.handle||'Patiyiz üyesi')+'</strong><small>'+Number(p.score||0)+' puan</small></button>').join(''):'<p>Bu hafta henüz sıralama oluşmadı.</p>')+'</div></section>';
}
async function patiShareMetric(kind,uuid,status){
 if(!me||!sb||!uuid)return;
 try{const r=await sb.rpc('patiyiz_track_share',{p_attempt_id:uuid,p_kind:kind,p_status:status});if(r.error)console.warn('Paylaşım ölçümü:',r.error.message)}
 catch(e){console.warn('Paylaşım ölçümü:',e)}
}

function petsPage(){
 const own=data.pets.filter(p=>p.owner_id===me.id);
 const others=data.pets.filter(p=>p.owner_id!==me.id&&!blocked.has(p.owner_id));
 const petItem=(p,i)=>'<button type="button" class="pati-pets-tile" data-action="view-user" data-id="'+esc(p.owner_id)+'" aria-label="'+esc(p.name||'Patili dost')+' sahibinin profilini aç">'+
 '<div class="pati-pets-photo">'+(p.photo_url?'<img src="'+esc(p.photo_url)+'" alt="'+esc(p.name||'Patili dost')+'" loading="'+(i<6?'eager':'lazy')+'" decoding="async">':'<span>'+petIcon(p.species)+'</span>')+'</div>'+
 '<div class="pati-pets-info"><strong>'+esc(p.name||'Patili dost')+'</strong><small>'+esc(p.species||'Hayvan')+(p.breed?' · '+esc(p.breed):'')+'</small></div></button>';
 main.innerHTML='<section class="pati-pets-page"><div class="pati-pets-heading"><div><h1>Patiler</h1><p>Topluluğumuzdaki patili dostlarla tanış.</p></div><button type="button" class="pati-pets-add" data-action="pet-add" aria-label="Patili dost ekle">'+ico('plus')+' Hayvan ekle</button></div>'+
 '<h2>Benim Patilerim</h2><div class="pati-pets-grid">'+(own.length?own.map(petItem).join(''):'<p class="pati-pets-empty">Henüz hayvan profili eklemedin.</p>')+'</div>'+
 '<h2>Topluluktaki Patiler</h2><div class="pati-pets-grid">'+(others.length?others.map((p,i)=>petItem(p,i+own.length)).join(''):'<p class="pati-pets-empty">Henüz başka patili dost bulunmuyor.</p>')+'</div></section>';
}
function knowledgePage(){if(articleId){const a=knowledge.find(x=>x.id===articleId);if(!a){articleId='';knowledgePage();return}const src={'merck':'https://www.merckvetmanual.com/','aspca_food':'https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets','cat_litter':'https://www.aspca.org/pet-care/cat-care/common-cat-behavior-issues','lilies':'https://www.fda.gov/animal-veterinary/animal-health-literacy/lovely-lilies-and-curious-cats-dangerous-combination','dog_home':'https://www.rspca.org.uk/adviceandwelfare/pets/dogs'};main.innerHTML=`<button class="btn-link" data-action="knowledge-back">← Bilgi merkezine dön</button><div class="kb-article"><div class="kb-article-heading"><span class="kb-article-label">${esc(a.species)} · ${esc(a.category)}</span><h1>${esc(a.title)}</h1><p>${esc(a.excerpt)}</p></div><div class="kb-article-body"><h3>Bilmen gerekenler</h3><p>${esc(a.content)}</p><h3>Pratik öneriler</h3><ul>${(a.tips||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${practicalGuide(a)}<div class="kb-article-box">Bu bilgiler genel bilgilendirme amaçlıdır; veteriner teşhisi veya tedavisinin yerini almaz.</div><div class="kb-article-foot">${button(favorites.has(a.id)?'🔖 Kaydedildi':'🔖 Kaydet','kb-save',`data-id="${a.id}"`)}<a target="_blank" rel="noopener noreferrer" class="kb-source" href="${esc(src[a.source]||'https://www.merckvetmanual.com/')}">İlgili kaynağı incele ↗</a></div></div></div>`;return}
let list=knowledge.filter(a=>(kbFilter==='Tümü'||kbFilter==='Kaydedilenler'||a.species===kbFilter)&&((a.title+' '+a.excerpt+' '+a.category).toLocaleLowerCase('tr').includes(kbSearch.toLocaleLowerCase('tr'))));main.innerHTML=header('Hayvan Bilgi Merkezi',`${knowledge.length} bakım ve sağlık rehberi`)+`<div class="hero-online"><small>ÜCRETSİZ BİLGİ KÜTÜPHANESİ</small><h2>Daha bilinçli bir bakım için</h2><p>Kedi, köpek, kuş, tavşan, balık ve kemirgenler hakkında pratik rehberler.</p></div><div class="toolbar"><input class="input-search" id="kb-search" placeholder="Bilgi ara: mama, eğitim, sağlık..." value="${esc(kbSearch)}"><button class="soft-btn" data-action="kb-search">Ara</button></div><div class="segmented">${['Tümü','Kedi','Köpek','Kuş','Tavşan','Balık','Kemirgen','Genel','Kaydedilenler'].map(t=>`<button class="${kbFilter===t?'active':''}" data-action="kb-filter" data-id="${esc(t)}">${t}</button>`).join('')}</div><div class="knowledge-grid">${list.filter(a=>kbFilter!=='Kaydedilenler'||favorites.has(a.id)).map(a=>`<button class="knowledge-card" data-action="kb-read" data-id="${a.id}"><div class="kb-emoji">${petIcon(a.species)}</div><span class="pati-pill">${esc(a.category)}</span><strong>${esc(a.title)}</strong><p>${esc(a.excerpt)}</p></button>`).join('')}</div>${list.length?'':empty('Rehber bulunamadı')}`}
function lostPage(){const list=[...data.lost].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).filter(x=>x.name.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))||x.city.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));main.innerHTML=header('Kayıp hayvanlar','Kayıp dostları güvenli şekilde bulmaya yardımcı ol.',button('+ İlan oluştur','lost-add'))+`<div class="pati-note">Güvenlik için yalnızca şehir / ilçe ve yaklaşık konum yayınla; açık ev adresi veya telefon numarası yazma.</div><div class="toolbar"><input id="lost-search" class="input-search" placeholder="Şehir veya isim ara" value="${esc(search)}"><button class="soft-btn" data-action="lost-search">Ara</button></div><div class="pati-list">${list.map(x=>`<article class="pati-card"><div class="pati-row between"><span class="pati-pill">${x.found?'✅ Bulundu':'📍 Kayıp'}</span><span class="meta">${day(x.last_seen)}</span></div><h3>${petIcon(x.species)} ${esc(x.name)} · ${esc(x.species)}</h3><p>📍 ${esc(x.city)} / ${esc(x.district)}</p>${x.photo_url?photo(x.photo_url):''}<p>${esc(x.description)}</p><div class="pati-actionbar">${x.owner_id===me.id?`<button data-action="toggle-found" data-id="${x.id}">${x.found?'Yeniden kayıp':'Bulundu olarak işaretle'}</button><button data-action="delete-lost" data-id="${x.id}" class="danger">İlanı sil</button>`:button('Sahibine mesaj gönder','chat',`data-id="${x.owner_id}"`)+`<button data-action="report" data-id="${x.id}" data-kind="lost">Bildir</button>`}</div></article>`).join('')}</div>${list.length?'':empty('Henüz ilan yok')}`}
function adoptionPage(){const q=search.toLocaleLowerCase('tr'),list=[...data.adoption].filter(x=>!blocked.has(x.owner_id)&&[x.name,x.species,x.city,x.district].some(t=>String(t||'').toLocaleLowerCase('tr').includes(q))).sort((a,b)=>Number(a.adopted)-Number(b.adopted)||new Date(b.created_at)-new Date(a.created_at));main.innerHTML=header('Hayvan Sahiplendirme','Patili dostlara güvenli ve sevgi dolu yuvalar bulalım.',button('+ Sahiplendirme ilanı','adoption-add'))+`<div class="pati-note">Sahiplendirme ilanları ücretsizdir. Açık adresini ve telefon numaranı herkese açık açıklamaya yazma; iletişim için Patiyiz mesajlarını kullan.</div><div class="toolbar"><input class="input-search" id="adoption-search" placeholder="Hayvan, tür veya şehir ara" value="${esc(search)}"><button class="soft-btn" data-action="adoption-search">Ara</button></div><div class="pati-list">${list.map(x=>`<article class="pati-card adoption-card"><div class="pati-row between"><span class="pati-pill">${x.adopted?'✅ Sahiplendirildi':'🐾 Yuva arıyor'}</span><small>${day(x.created_at)}</small></div><h3>${petIcon(x.species)} ${esc(x.name)} · ${esc(x.species)}</h3><p>${esc(x.gender||'Bilinmiyor')}${x.age?' · '+esc(x.age):''} · 📍 ${esc(x.city)}${x.district?' / '+esc(x.district):''}</p>${x.photo_url?photo(x.photo_url):''}<p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(x.description)}</p><div class="pati-actionbar">${x.owner_id===me.id?button('Düzenle','adoption-edit',`data-id="${x.id}"`)+button(x.adopted?'Yeniden yayına al':'Sahiplendirildi','adoption-toggle',`data-id="${x.id}"`)+button('İlanı sil','adoption-delete',`data-id="${x.id}"`,'outline-btn'):(!x.adopted?button('İlan sahibine mesaj gönder','chat',`data-id="${x.owner_id}"`):'')}${x.owner_id!==me.id?userRow(x.owner_id)+button('İlanı bildir','report',`data-id="${x.id}" data-kind="adoption"`):''}</div></article>`).join('')}</div>${list.length?'':empty('Henüz sahiplendirme ilanı yok','İlk ilanı sen oluşturabilirsin.')}`}
function carePage(){let today=new Date().toLocaleDateString('sv-SE');let all=data.care.filter(x=>x.owner_id===me.id);let c=all.filter(x=>careFilter==='all'||(careFilter==='done'?x.done:careFilter==='late'?!x.done&&x.due_date<today:!x.done&&x.due_date>=today)).sort((a,b)=>a.due_date.localeCompare(b.due_date));main.innerHTML=header('Bakım Takvimi','Hayvanlarının önemli bakım günlerini takip et.',button('+ Görev ekle','care-add')+button('Aşı, kilo ve hatırlatmalar','wellness-open')) +`<div class="pati-filter-tabs">${[['all','Tümü'],['upcoming','Yaklaşan'],['late','Geciken'],['done','Tamamlanan']].map(([key,label])=>`<button type="button" data-action="care-filter" data-id="${key}" class="${careFilter===key?'active':''}">${label} (${all.filter(x=>key==='all'||(key==='done'?x.done:key==='late'?!x.done&&x.due_date<today:!x.done&&x.due_date>=today)).length})</button>`).join('')}</div><div class="pati-note">Bakım takvimi bu hesapta saklanır. Şu sürümde otomatik e-posta / telefon hatırlatması gönderilmez.</div><div class="pati-list">${c.map(x=>`<div class="pati-card"><div class="pati-row between"><div><span class="pati-pill">${esc(x.category)}</span><h3 style="margin-top:10px;${x.done?'text-decoration:line-through;opacity:.6':''}">${esc(x.title)}</h3><p>${day(x.due_date)} ${x.pet_id?'· '+esc(data.pets.find(p=>p.id===x.pet_id)?.name||''):''}</p></div><div class="pati-row">${button(x.done?'Yeniden aç':'✓ Tamamla','care-done',`data-id="${x.id}"`)}<button data-action="care-del" data-id="${x.id}" class="small-btn danger-btn">Sil</button></div></div></div>`).join('')}</div>${c.length?'':empty('Bakım görevi eklenmedi')}`}

let dmRecorder=null,dmParts=[],dmStream=null,dmCancel=false,dmRecipient=null;
async function uploadDmFile(file,type,receiver){if(!file?.size||file.size>8388608)throw Error('Dosya en fazla 8 MB olabilir.');const mime=file.type.split(';')[0];if(type==='image'&&!['image/jpeg','image/png','image/webp'].includes(mime))throw Error('JPG, PNG veya WebP seç.');if(type==='audio'&&!['audio/webm','audio/mp4','audio/ogg','audio/mpeg'].includes(mime))throw Error('Ses biçimi desteklenmiyor.');const ext=type==='image'?(mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'):(mime==='audio/mp4'?'m4a':mime==='audio/ogg'?'ogg':mime==='audio/mpeg'?'mp3':'webm');const author=me?.id;if(!author)throw Error('Mesaj göndermek için giriş yap.');const path=author+'/'+crypto.randomUUID()+'.'+ext;const up=await sb.storage.from('patiyiz-private-messages').upload(path,file,{contentType:mime});if(up.error)throw up.error;try{if(me?.id!==author)throw Error('Oturum değişti. Mesaj gönderilmedi.');const m=await sb.from('messages').insert({sender_id:author,receiver_id:receiver,body:type==='audio'?'🎤 Sesli mesaj':'📷 Fotoğraf',attachment_type:type,attachment_path:path});if(m.error)throw m.error}catch(error){try{await sb.storage.from('patiyiz-private-messages').remove([path])}catch(cleanup){console.warn('Gönderilemeyen medya temizlenemedi',cleanup)}throw error}}
const patiDmSignedCache=new Map();
async function loadDmMedia(){
 const items=[...document.querySelectorAll('[data-private-path]')],userId=me?.id;
 if(!userId)return;
 await Promise.all(items.map(async el=>{
  const path=el.dataset.privatePath;if(!path)return;
  const key=userId+':'+path,now=Date.now();
  let signed=patiDmSignedCache.get(key);
  if(!signed||signed.expires<=now){
   const res=await sb.storage.from('patiyiz-private-messages').createSignedUrl(path,1800);
   if(res.error||!res.data?.signedUrl)return;
   signed={url:res.data.signedUrl,expires:Date.now()+20*60*1000};
   if(patiDmSignedCache.size>150)patiDmSignedCache.clear();
   patiDmSignedCache.set(key,signed);
  }
  if(!el.isConnected||me?.id!==userId)return;
  if(el.src!==signed.url)el.src=signed.url;
  if(el.tagName==='IMG')el.decoding='async';
 }));
}
async function sendDmImage(file){if(!personId||dmMediaSending)return;dmMediaSending=true;const recipient=personId,history=document.querySelector('.chat-history'),temp=document.createElement('div'),local=URL.createObjectURL(file);temp.className='bubble-chat mine pati-dm-pending';temp.innerHTML='<img class="pati-dm-image" alt="Gönderiliyor"><small>Gönderiliyor…</small>';temp.querySelector('img').src=local;history?.appendChild(temp);if(history)history.scrollTop=history.scrollHeight;try{await uploadDmFile(file,'image',recipient);temp.remove();await refreshKeys([['messages','messages']])}catch(e){temp.querySelector('small').textContent='Gönderilemedi';throw e}finally{URL.revokeObjectURL(local);dmMediaSending=false}}
async function startDmRecord(){if(!personId||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Tarayıcı ses kaydını desteklemiyor.');if(dmRecorder)return;dmStream=await navigator.mediaDevices.getUserMedia({audio:true});const type=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));if(!type){dmStream.getTracks().forEach(t=>t.stop());throw Error('Ses biçimi desteklenmiyor.')}dmParts=[];dmCancel=false;dmRecipient=personId;dmRecorder=new MediaRecorder(dmStream,{mimeType:type});dmRecorder.ondataavailable=e=>{if(e.data.size)dmParts.push(e.data)};dmRecorder.onstop=async()=>{const blob=new Blob(dmParts,{type:type.split(';')[0]});dmStream?.getTracks().forEach(t=>t.stop());dmRecorder=null;dmStream=null;document.querySelector('.pati-dm-rec-state')?.setAttribute('hidden','');if(dmCancel||!blob.size||!me||!dmRecipient)return;try{await uploadDmFile(blob,'audio',dmRecipient);await refreshKeys([['messages','messages']])}catch(e){notify('Ses gönderilemedi: '+friendly(e),true)}};dmRecorder.start();document.querySelector('.pati-dm-rec-state')?.removeAttribute('hidden')}
function messagesPage(){
 let hiddenIds=new Set(data.messageHidden.filter(x=>x.user_id===me.id).map(x=>x.message_id));let all=data.messages.filter(x=>(x.sender_id===me.id||x.receiver_id===me.id)&&!hiddenIds.has(x.id));
 let userIds=[...new Set(all.map(x=>x.sender_id===me.id?x.receiver_id:x.sender_id).concat(personId?[personId]:[]))].filter(x=>x&&!blocked.has(x));
 userIds.sort((a,b)=>{let last=id=>Math.max(0,...all.filter(x=>x.sender_id===id||x.receiver_id===id).map(x=>new Date(x.created_at).getTime()));return last(b)-last(a)});
 if(!personId&&userIds.length)personId=userIds[0];
 let conv=all.filter(x=>(x.sender_id===me.id&&x.receiver_id===personId)||(x.sender_id===personId&&x.receiver_id===me.id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 const unreadTotal=all.filter(x=>x.receiver_id===me.id&&!x.read_at).length;const replyText=x=>{const orig=data.messages.find(m=>m.id===x.reply_to);return orig?'↳ '+cut(orig.body||'Medya',65):'Yanıt bulunamadı'};
 const filteredIds=userIds.filter(id=>chatFilter==='primary'?true:chatFilter==='requests'?!followed.has(id)&&all.some(x=>x.sender_id===id&&x.receiver_id===me.id):!followed.has(id)&&!all.some(x=>x.sender_id===id&&x.receiver_id===me.id));
 const tabs=['primary','requests','general'];const labels=['Birincil','İstekler','Genel'];const chatTabs='<div class="pati-dm-filters">'+tabs.map((t,i)=>'<button type="button" data-action="dm-tab" data-id="'+t+'" class="'+(chatFilter===t?'active':'')+'">'+labels[i]+'</button>').join('')+'</div>';

 main.innerHTML='<div class="pati-dm-top"><strong>Mesajlar</strong><div class="pati-dm-top-actions"><span>'+unreadTotal+' okunmamış</span><button type="button" class="pati-dm-new" data-action="dm-new">'+ico('plus')+' Yeni sohbet</button></div></div>'+chatTabs+'<label class="pati-dm-searchbar">'+ico('search')+'<input type="search" id="pati-dm-search" placeholder="Sohbetlerde ara" aria-label="Sohbetlerde ara" autocomplete="off"></label>'+`<div class="chat-layout modern-chat pati-dm-layout ${mobileChatOpen&&personId?'mobile-chat-open':'mobile-chat-list'}"><div class="chat-people"><div class="chat-list-heading">Sohbetler <span>${filteredIds.length}</span></div>${filteredIds.map(id=>{const messages=all.filter(x=>x.sender_id===id||x.receiver_id===id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));let last=messages[0],unread=messages.filter(x=>x.receiver_id===me.id&&!x.read_at).length;return `<button class="chat-person ${personId===id?'active':''}" data-action="chat" data-id="${esc(id)}" data-search="${esc(profile(id).display_name+' '+(profile(id).handle||''))}">${avatar(profile(id),'s')}<span class="chat-person-info"><strong>${displayUser(id)}</strong><small>${last?esc(cut(last.body,80)):'Sohbete başla'}</small></span><span class="chat-person-meta"><small>${last?clock(last.created_at):''}</small>${unread?`<b class="chat-unread">${unread>99?'99+':unread}</b>`:''}</span></button>`}).join('')||`<p style="padding:17px;color:#809181">Keşfet'ten bir kullanıcıya mesaj gönderebilirsin.</p>`}</div><div class="chat-window"><header>${personId?`<button type="button" class="mobile-chat-back" data-action="chat-back" aria-label="Sohbetlere dön">←</button><span class="chat-head-avatar">${avatar(profile(personId),'s')}</span><span><strong>${displayUser(personId)}</strong><small>Özel sohbet</small></span><button type="button" data-action="view-user" data-id="${esc(personId)}" class="soft-btn chat-view-profile">Profil</button>`:'Sohbet seç'}</header><div class="chat-history">${conv.map(x=>`<div class="bubble-chat ${x.sender_id===me.id?'mine':''}" data-message-id="${esc(x.id)}" title="Silmek için basılı tut veya sağ tıkla">${x.attachment_type==='image'?'<img class="pati-dm-image" data-private-path="'+esc(x.attachment_path)+'" alt="Özel fotoğraf">':x.attachment_type==='audio'?'<audio controls class="pati-dm-audio" data-private-path="'+esc(x.attachment_path)+'"></audio>':(x.reply_to?'<div class="pati-dm-reply-preview">'+esc(replyText(x))+'</div>':'')+esc(x.body)}<small>${x.edited_at?'Düzenlendi · ':''}${clock(x.created_at)} · ${x.sender_id===me.id?(x.read_at?'✓✓ Okundu':'✓ Gönderildi'):day(x.created_at)}</small><span class="pati-dm-msg-tools"><button type="button" data-action="dm-reply" data-id="${esc(x.id)}">↳ Yanıtla</button>${x.sender_id===me.id&&!x.attachment_path&&!x.attachment_type&&Date.now()-new Date(x.created_at).getTime()<900000?`<button type="button" data-action="dm-edit" data-id="${esc(x.id)}">Düzenle</button>`:''}</span></div>`).join('')||'<p style="color:#95a299;text-align:center;margin:auto">Henüz mesaj yok. İlk mesajı gönder! 🐾</p>'}</div>${personId?`<form id="message-form" class="chat-form"><label class="pati-dm-camera" aria-label="Fotoğraf çek">${ico('camera')}<input type="file" name="dm_camera" accept="image/*" capture="environment" hidden></label><input name="body" placeholder="Mesaj yaz..." maxlength="1000" autocomplete="off"><button type="button" data-action="dm-record" class="pati-dm-mic" aria-label="Ses kaydet">${ico('mic')}</button><button type="button" class="pati-dm-gallery" data-action="pati-dm-gallery-open" aria-label="Fotoğraf galerisi">${ico('image')}</button><input type="file" name="dm_gallery" accept="image/*" multiple hidden><button type="submit" class="primary-btn" aria-label="Gönder">${ico('send')}</button><div class="pati-dm-rec-state" hidden>🎙️ Ses kaydediliyor <button type="button" data-action="dm-record-stop">Gönder</button><button type="button" data-action="dm-record-cancel">İptal</button></div></form>`:''}</div></div>`;
 if(pageMore.messages){const box=main.querySelector('.chat-people');if(box)box.insertAdjacentHTML('beforeend',`<div class="pati-load-more">${button('Eski mesajları yükle','load-more','data-id="messages"')}</div>`)}const history=main.querySelector('.chat-history');if(history){history.scrollTop=history.scrollHeight;requestAnimationFrame(()=>{if(history.isConnected)history.scrollTop=history.scrollHeight});setTimeout(()=>{if(history.isConnected)history.scrollTop=history.scrollHeight},180)}const chatSearch=main.querySelector('#pati-dm-search');
 chatSearch?.addEventListener('input',()=>{
  const q=chatSearch.value.trim().toLocaleLowerCase('tr-TR');
  main.querySelectorAll('.pati-dm-layout .chat-person').forEach(el=>el.hidden=!String(el.dataset.search||'').toLocaleLowerCase('tr-TR').includes(q));
 });
 loadDmMedia();
}

function pushKeyBytes(base64){const b64=base64.replace(/-/g,'+').replace(/_/g,'/');const str=atob(b64.padEnd(Math.ceil(b64.length/4)*4,'='));return Uint8Array.from(str,c=>c.charCodeAt(0))}
async function disablePhonePush(){if(!me)throw Error('Önce giriş yapmalısın.');if(!('serviceWorker' in navigator))throw Error('Bildirim özelliği desteklenmiyor.');const reg=await navigator.serviceWorker.getRegistration('./');const sub=await reg?.pushManager?.getSubscription();if(!sub)throw Error('Bu cihazda etkin telefon bildirimi bulunmuyor.');const result=await sb.from('push_subscriptions').delete().eq('endpoint',sub.endpoint).eq('user_id',me.id);if(result.error)throw result.error;await sub.unsubscribe()}
async function enablePhonePush(){
 if(!me)return;
 if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){notify('Bu tarayıcı push bildirimi desteklemiyor. iPhone için önce Safari ile Ana Ekrana Ekle kullan.',true);return}
 if(!window.PATIYIZ_PUSH_PUBLIC_KEY){notify('Bildirim sunucusu henüz kurulmadı. VAPID anahtarının eklenmesi gerekiyor.',true);return}
 try{
  const permission=await Notification.requestPermission();if(permission!=='granted'){notify('Bildirim izni verilmedi.',true);return}
  const reg=await navigator.serviceWorker.register('./patiyiz-sw.js',{scope:'./'});
  const existing=await reg.pushManager.getSubscription();
  const sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKeyBytes(window.PATIYIZ_PUSH_PUBLIC_KEY)});
  const json=sub.toJSON();if(!json.keys?.p256dh||!json.keys?.auth)throw Error('Bildirim aboneliği oluşturulamadı.');
  const record={user_id:me.id,endpoint:sub.endpoint,p256dh:json.keys.p256dh,auth_secret:json.keys.auth};
  const saved=await sb.from('push_subscriptions').upsert(record,{onConflict:'endpoint'});
  if(saved.error)throw saved.error;
  notify('Telefon bildirimleri açıldı!');if(view==='notifications')render();
 }catch(e){console.error(e);notify('Bildirim açılamadı: '+friendly(e),true)}
}
function notificationsPage(){
 const list=[...data.notifications].filter(n=>n.owner_id===me.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const unread=list.filter(n=>!n.read).length;
 const kindInfo=n=>{const k=n.kind||'';if(k==='messages')return ['message-circle','Mesaj'];if(k==='comments')return ['message-square','Yorum'];if(k==='post_likes')return ['heart','Beğeni'];if(k==='follows')return ['user-plus','Takip'];if(k==='pet_reminder')return ['calendar','Pati bakımı'];return ['bell','Etkinlik']};
 const rows=items=>items.map(n=>{const [symbol,label]=kindInfo(n),actor=n.actor_id?data.profiles.find(p=>p.id===n.actor_id):null;return '<div class="pati-alert-row '+(n.read?'is-read':'is-new')+'"><button type="button" class="pati-alert-entry" data-action="open-notification" data-id="'+esc(n.id)+'"><span class="pati-alert-avatar">'+(actor?avatar(actor,'s'):ico(symbol))+'</span><span class="pati-alert-content"><span class="pati-alert-title">'+esc(n.text)+'</span><span class="pati-alert-meta">'+label+' · '+day(n.created_at)+(n.read?'':' · Yeni')+'</span></span>'+(n.read?'':'<span class="pati-alert-unread" aria-label="Okunmadı"></span>')+'</button><button type="button" class="pati-alert-remove" data-action="notification-delete" data-id="'+esc(n.id)+'" aria-label="Bildirimi sil">'+ico('trash')+'</button></div>'}).join('');
 const recent=list.filter(n=>!n.read),past=list.filter(n=>n.read);
 main.innerHTML='<section class="pati-alerts"><div class="pati-alert-head"><div><span class="pati-alert-eyebrow">HESABINDAKİ HAREKETLER</span><h1>Bildirimler'+(unread?'<span class="pati-alert-count">'+unread+'</span>':'')+'</h1><p>Topluluğunda olup bitenleri buradan takip et.</p></div><span class="pati-alert-head-icon">'+ico('bell')+'</span></div>'+
 '<div class="pati-alert-tools"><button type="button" data-action="notifications-read" '+(unread?'':'disabled')+'>'+ico('check-check')+' Tümünü okundu yap</button><button type="button" data-action="notifications-delete-all" '+(list.length?'':'disabled')+'>'+ico('trash-2')+' Tümünü temizle</button></div>'+
 '<div class="pati-alert-push"><span class="pati-alert-push-icon">'+ico('smartphone')+'</span><div><strong>Telefon bildirimleri</strong><p>Yeni mesaj, yorum ve beğenilerden haberdar ol.</p></div><button type="button" data-action="push-enable">Etkinleştir</button></div>'+
 (recent.length?'<div class="pati-alert-group"><div class="pati-alert-group-head"><h2>Yeni bildirimler</h2><span>'+recent.length+'</span></div><div class="pati-alert-list">'+rows(recent)+'</div></div>':'')+
 (past.length?'<div class="pati-alert-group"><div class="pati-alert-group-head"><h2>Önceki bildirimler</h2></div><div class="pati-alert-list">'+rows(past)+'</div></div>':'')+
 (!list.length?'<div class="pati-alert-empty">'+ico('bell')+'<strong>Henüz bildirimin yok</strong><p>Yeni etkileşimlerin burada görünecek.</p></div>':'')+
 (pageMore.notifications?'<div class="pati-load-more">'+button('Eski bildirimleri yükle','load-more','data-id="notifications"')+'</div>':'')+'</section>';
}
async function openNotification(id){const n=data.notifications.find(x=>x.id===id&&x.owner_id===me.id);if(!n){navigate('notifications');return}
 if(!n.read){const result=await sb.from('notifications').update({read:true}).eq('id',n.id).eq('owner_id',me.id);if(!result.error){n.read=true;navRender()}}
 if(['comments','post_likes'].includes(n.kind)&&n.post_id){openPost(n.post_id);return}
 if(n.kind==='messages'&&n.actor_id&&n.actor_id!==me.id&&!blocked.has(n.actor_id)){personId=n.actor_id;mobileChatOpen=true;navigate('messages');return}
 if(n.kind==='pet_reminder'){navigate('wellness');return}
 if(n.actor_id&&!blocked.has(n.actor_id)){profileId=n.actor_id;navigate('profile');return}
 navigate('notifications')}
async function routePendingNotification(){const id=new URL(location.href).searchParams.get('notification');if(!id)return;history.replaceState(null,'',location.pathname+location.hash);await openNotification(id)}
async function loadBlockedNames(){const r=await sb.rpc('patiyiz_my_blocked_profiles');if(r.error){console.warn('Engellenen hesap adları yüklenemedi',r.error.message);return}blockedProfiles=r.data||[];if(view==='blocked')render()}
function blockedPage(){const ids=[...blocked];main.innerHTML=header('Engellenenler','Engellediğin hesapları buradan yönetebilirsin.')+(ids.length?`<div class="pati-list">${ids.map(id=>{const p=data.profiles.find(x=>x.id===id)||blockedProfiles.find(x=>x.id===id);return `<div class="pati-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div class="pati-profile-row">${avatar(p||{display_name:'Engellenmiş hesap'})}<div><strong>${esc(p?.display_name||'Engellenmiş hesap')}</strong><small>Engellendi</small></div></div>${button('Engeli kaldır','block',`data-id="${esc(id)}"`,'outline-btn')}</div>`}).join('')}</div>`:empty('Engellenen hesap yok','Engellediğin hesaplar burada görünecek.'))}
function followListPage(){const owner=followListId||me.id,followers=followListMode==='followers';const ids=[...new Set(data.follows.filter(f=>followers?f.followee_id===owner:f.follower_id===owner).map(f=>followers?f.follower_id:f.followee_id))].filter(id=>!blocked.has(id));main.innerHTML=`<div class="pati-follow-backbar"><button type="button" class="pati-follow-back" data-action="followers-back" aria-label="Profile geri dön">←</button><span>Profile dön</span></div>`+header(followers?'Takipçiler':'Takip edilenler','Kullanıcı profillerini görüntüleyebilirsin.')+`<div class="pati-list">${ids.map(id=>`<div class="pati-card pati-follow-person">${userRow(id)}${id!==me.id?button(followed.has(id)?'Takiptesin':'Takip et','follow',`data-id="${esc(id)}"`):''}</div>`).join('')}</div>`;}
function settingsPage(){main.innerHTML=header('Ayarlar ve Gizlilik','Hesap, güvenlik ve bildirim tercihlerini yönet.')+`<div class="pati-settings-list">${isAdmin?`<section class="pati-card"><h3>🛡️ Yönetim Paneli</h3><p>Patiyiz kullanıcılarını, içerikleri ve şikâyetleri yönet.</p>${button('Yönetim Panelini Aç','open-admin')}</section>`:''}<section class="pati-card"><h3>🔒 Hesap güvenliği</h3><p>Şifreni güncellemek için yeni şifreni belirle.</p>${button('Şifremi değiştir','settings-password')}</section><section class="pati-card"><h3>🔔 Telefon bildirimleri</h3><p>Bu cihazda Patiyiz bildirimlerini açabilir veya kapatabilirsin.</p><div class="pati-actionbar">${button('Bildirimleri aç','push-enable')}${button('Bu cihazda bildirimleri kapat','push-disable','','outline-btn')}</div></section><section class="pati-card"><h3>🛡️ Gizlilik ve engellenenler</h3><p>Engellediğin kullanıcıları görüntüle ve engellerini yönet.</p>${button('Engellenenler ('+blocked.size+')','blocked-list')}</section><section class="pati-card"><h3>📄 Gizlilik ve kullanım şartları</h3><p>Kişisel verilerin işlenmesini ve topluluk kurallarını incele.</p><div class="pati-actionbar"><a href="privacy.html" target="_blank" rel="noopener">Gizlilik Politikası</a><a href="terms.html" target="_blank" rel="noopener">Kullanım Şartları</a></div></section><section class="pati-card"><h3>Hesabım</h3><p>Oturumunu kapatabilir veya hesabını ve bağlı kişisel verilerini kalıcı olarak silebilirsin.</p><div class="pati-actionbar">${button('Çıkış yap','logout','','outline-btn')}${!isAdmin?button('Hesabımı kalıcı olarak sil','delete-account-open','','danger'):''}</div></section></div>`}
const profileCountCache=new Map(),profileCountInFlight=new Set();
async function syncProfileCounts(id){
 if(!me||!id||profileCountInFlight.has(id))return;
 const cached=profileCountCache.get(id);
 if(cached&&Date.now()-cached.at<20000){renderProfileCounts(id,cached.value);return}
 profileCountInFlight.add(id);
 try{
  const results=await Promise.all([
   sb.from('posts').select('id',{count:'exact',head:true}).eq('author_id',id),
   sb.from('follows').select('follower_id',{count:'exact',head:true}).eq('followee_id',id),
   sb.from('follows').select('followee_id',{count:'exact',head:true}).eq('follower_id',id)
  ]);
  if(results.some(r=>r.error))throw results.find(r=>r.error).error;
  const value={posts:results[0].count??0,followers:results[1].count??0,following:results[2].count??0};
  profileCountCache.set(id,{value,at:Date.now()});renderProfileCounts(id,value);
 }catch(e){console.warn('Profil sayaçları yüklenemedi:',e.message)}
 finally{profileCountInFlight.delete(id)}
}
function renderProfileCounts(id,stats){
 if(view!=='profile'||(profileId||me?.id)!==id)return;
 const wrap=main.querySelector('.pati-ig-stats');if(!wrap)return;
 for(const key of ['posts','followers','following']){const b=wrap.querySelector('[data-pati-count="'+key+'"]');if(b)b.textContent=stats[key]}
}
function profilePage(){
 const p=profile(profileId||me.id),own=p.id===me.id,pets=data.pets.filter(x=>x.owner_id===p.id);
 const posts=[...data.posts.filter(x=>x.author_id===p.id)].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const cachedCounts=profileCountCache.get(p.id)?.value;const followers=cachedCounts?.followers??data.follows.filter(f=>f.followee_id===p.id).length,following=cachedCounts?.following??data.follows.filter(f=>f.follower_id===p.id).length;
 const stories=data.stories.filter(x=>x.author_id===p.id&&new Date(x.expires_at).getTime()>Date.now());const assignedIds=new Set(data.highlightItems.filter(x=>data.highlightAlbums.some(a=>a.id===x.album_id&&a.owner_id===p.id)).map(x=>x.story_id));const highlights=data.stories.filter(x=>x.author_id===p.id&&x.is_highlight&&!assignedIds.has(x.id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));const albums=data.highlightAlbums.filter(x=>x.owner_id===p.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 const storyThumb=stories[0]?.image_url||'';
 const active=profilePostsTab==='videos'?posts.filter(x=>x.video_url):profilePostsTab==='text'?posts.filter(x=>!x.image_url&&!x.video_url):posts.filter(x=>x.image_url||x.video_url);
 const iconTabs=[['media','▦','Fotoğraf ve videolar'],['videos','▷','Videolar'],['text','≡','Yazılar']];
 const grid=active.map(x=>'<button type="button" class="pati-profile-tile '+(!x.image_url&&!x.video_url?'pati-profile-text-tile':'')+'" data-action="profile-open-post" data-id="'+esc(x.id)+'" aria-label="Paylaşımı aç">'+(x.image_url?'<img loading="lazy" src="'+esc(x.image_url)+'" alt="Paylaşım görseli">':x.video_url?'<video muted playsinline preload="metadata" src="'+esc(x.video_url)+'#t=0.1"></video>':'<span>'+esc(cut(x.body||'Yazılı gönderi',110))+'</span>')+(x.video_url?'<b class="pati-profile-play">▶</b>':'')+'</button>').join('');
 main.innerHTML=(own?patiyizProgressCard()+'<div class="paticoin-profile-link"><button data-action="paticoin-rewards">🪙 PatiCoin Görevlerim</button><button data-action="paticoin-shop">🛍️ Pati Mağaza</button></div>':'')+'<div class="pati-ig-profile">'+(!own?'<div class="pati-profile-back">'+button('← Geri','profile-back')+'</div>':'')+
 '<div class="pati-ig-summary"><div class="pati-ig-avatar">'+avatar(p,'l')+'</div><div class="pati-ig-info"><div class="pati-ig-handle-row"><strong class="pati-ig-handle">@'+esc(p.handle||'patiyiz')+'</strong>'+verifiedBadge(p)+'</div><strong class="pati-ig-name">'+esc(p.display_name||'Patiyiz üyesi')+'</strong><div class="pati-ig-stats"><span><b data-pati-count="posts">'+(cachedCounts?.posts??posts.length)+'</b><small>gönderi</small></span><button type="button" data-action="followers-list" data-id="'+esc(p.id)+'" data-mode="followers"><b data-pati-count="followers">'+followers+'</b><small>takipçi</small></button><button type="button" data-action="followers-list" data-id="'+esc(p.id)+'" data-mode="following"><b data-pati-count="following">'+following+'</b><small>takip edilen</small></button></div></div></div>'+
 (p.bio?'<div class="pati-ig-bio">'+esc(p.bio)+'</div>':'')+
 '<div class="pati-ig-actions">'+(own?button('Profili düzenle','edit-profile'):button(followed.has(p.id)?'Takibi bırak':'Takip et','follow','data-id="'+esc(p.id)+'"')+button('Mesaj gönder','chat','data-id="'+esc(p.id)+'"')+button('Hesabı bildir','report','data-id="'+esc(p.id)+'" data-kind="profile"'))+'</div>'+
 '<section class="pati-ig-highlight-section" aria-label="Kalıcı hikâyeler"><div class="pati-ig-highlights">'+
 (own?'<button type="button" class="pati-ig-highlight pati-new-highlight" data-action="highlight-album-new" aria-label="Yeni öne çıkanlar albümü oluştur"><span class="pati-ig-highlight-ring">＋</span><small>Yeni</small></button>':'')+
 albums.map(x=>{const storyId=data.highlightItems.find(i=>i.album_id===x.id)?.story_id,cover=data.stories.find(s=>s.id===storyId)?.image_url;return '<button type="button" class="pati-ig-highlight" data-action="highlight-album-open" data-id="'+esc(x.id)+'"><span class="pati-ig-highlight-ring is-saved">'+(cover?'<img src="'+esc(cover)+'" alt="">':'✦')+'</span><small>'+esc(x.title)+'</small></button>'}).join('')+
 highlights.map((x,i)=>'<button type="button" class="pati-ig-highlight" data-action="story-highlight-open" data-id="'+esc(x.id)+'" aria-label="Kalıcı hikâyeyi aç"><span class="pati-ig-highlight-ring is-saved"><img src="'+esc(x.image_url)+'" alt=""></span><small>'+esc(cut(String(x.caption||('Hikâye '+(i+1))),13))+'</small></button>').join('')+
 pets.map(x=>'<button type="button" class="pati-ig-highlight" data-action="story-pet-highlight" data-id="'+esc(x.id)+'" aria-label="'+esc(x.name)+' kalıcı hikâyesini aç"><span class="pati-ig-highlight-ring is-pet">'+(x.photo_url?'<img src="'+esc(x.photo_url)+'" alt="">':petIcon(x.species))+'</span><small>'+esc(cut(x.name||'Patili dost',12))+'</small></button>').join('')+
 (!own&&!highlights.length&&!albums.length&&!pets.length?'<p class="pati-highlight-empty">Henüz kalıcı hikâye yok.</p>':'')+
 '</div></section>'+
 '<div class="pati-ig-tabs" role="tablist" aria-label="Profil gönderileri">'+iconTabs.map(x=>'<button type="button" role="tab" aria-selected="'+(profilePostsTab===x[0])+'" class="'+(profilePostsTab===x[0]?'active':'')+'" data-action="profile-posts-tab" data-id="'+x[0]+'" aria-label="'+x[2]+'">'+x[1]+'</button>').join('')+'</div>'+
 '<div class="pati-ig-grid">'+(grid||'<p class="pati-ig-empty">Bu bölümde henüz paylaşım yok.</p>')+'</div>'+
 '</div>';
 void syncProfileCounts(p.id);
}
function formField(name,label,type='text',val='',required=false){return `<div class="pati-field"><label for="f-${name}">${esc(label)}</label><input id="f-${name}" name="${name}" type="${type}" ${required?'required':''} value="${esc(val)}"></div>`}
function selectField(name,label,options,val=''){return `<div class="pati-field"><label>${esc(label)}</label><select name="${name}">${options.map(x=>`<option ${x===val?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`}
function textField(name,label,val='',required=true,max=1500){return `<div class="pati-field"><label>${esc(label)}</label><textarea name="${name}" maxlength="${max}" ${required?'required':''}>${esc(val)}</textarea></div>`}
function storyPhotoField(){return '<section class="pati-compose-media pati-story-media"><div class="pati-media-intro"><span class="pati-media-icon">✦</span><div><strong>Hikâyene bir fotoğraf ekle</strong><p>Fotoğrafı galerinden seç veya anı hemen yakala.</p></div></div><div class="pati-media-gallery" id="story-photo-preview"><div class="pati-media-empty"><span>✧</span><strong>Hikâye önizlemesi burada görünecek</strong><small>Fotoğraf seçmek için aşağıya dokun.</small></div></div><div class="pati-media-picker-actions"><button type="button" class="pati-media-pick-primary" data-action="pati-story-gallery">▧ Galeriyi aç</button><button type="button" class="pati-media-pick-secondary" data-action="pati-story-camera">◎ Fotoğraf çek</button></div><input type="file" name="story_gallery" accept="image/*,.heic,.heif" class="pati-native-input" aria-label="Galeriden fotoğraf seç"><input type="file" name="story_camera" accept="image/*" capture="environment" class="pati-native-input" aria-label="Kamerayla fotoğraf çek"></section>'}

function imageField(){return '<div class="pati-field"><label>Fotoğraf seç</label><input type="file" accept="image/*,.heic,.heif" name="photo" multiple><p class="small-note">Galeriden seç veya kamerayla çek. Büyük fotoğraflar otomatik hazırlanır.</p><div class="pati-upload-preview" hidden></div></div>'}
function showComments(postId){if(!postId)return;const items=data.comments.filter(x=>x.post_id===postId&&!blocked.has(x.author_id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));const renderComment=(c,depth=0,seen=new Set())=>{let count=data.commentLikes.filter(x=>x.comment_id===c.id).length,liked=data.commentLikes.some(x=>x.comment_id===c.id&&x.user_id===me.id);if(seen.has(c.id))return '';const chain=new Set([...seen,c.id]);return `<div class="comment-item" style="margin-left:${Math.min(depth,3)*12}px"><div class="comment-author">${userRow(c.author_id,day(c.created_at))}</div><p>${esc(c.body)}</p><div class="comment-actions"><button type="button" data-action="comment-like" data-id="${c.id}" class="${liked?'active':''}">♥ ${count}</button><button type="button" data-action="comment-reply" data-id="${c.id}">Yanıtla</button>${c.author_id===me.id?`<button type="button" data-action="comment-delete" data-id="${c.id}">Sil</button>`:`<button type="button" data-action="report" data-kind="comment" data-id="${c.id}">Bildir</button>`}</div></div>`+items.filter(x=>x.parent_id===c.id).map(x=>renderComment(x,depth+1,chain)).join('')};
 const roots=items.filter(x=>!x.parent_id||!items.some(y=>y.id===x.parent_id));
 modal('Yorumlar','<div class="pati-comment-quick">'+['❤️','🙌','🔥','👏','🥹','😍','😮','😂'].map(e=>'<button type="button" data-action="comment-emoji" data-emoji="'+e+'">'+e+'</button>').join('')+'</div><div class="comment-list">'+(roots.map(c=>renderComment(c)).join('')||'<p>İlk yorumu sen yazabilirsin.</p>')+'</div><p id="comment-reply-hint" class="small-note"></p>'+textField('body','Yorum yaz...','',true,750),'comment-form');
 const f=document.getElementById('comment-form');if(f){f.dataset.post=postId;const submit=f.querySelector('.modal-footer button[type="submit"]');if(submit)submit.textContent='Yorumu paylaş'}
}
function modal(title,form,id='entry-form'){let root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop" data-action="close"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button type="button" class="close-modal" data-action="close" aria-label="Pencereyi kapat">×</button></div><form id="${id}"><div class="modal-content">${form}</div><div class="pati-upload-status" role="status" aria-live="polite" hidden><i class="pati-upload-spinner"></i><span>Yükleniyor…</span></div><div class="modal-footer"><button class="outline-btn" type="button" data-action="close">İptal</button><button class="primary-btn" type="submit">Kaydet</button></div></form></section></div>`}
function closeModal(force=false){if(!force&&busy&&document.querySelector('#modal-root .pati-upload-status:not([hidden])')){notify('İşlem sürüyor. Tamamlanmasını bekle.',true);return}window.PatiyizReelsEditor?.dispose();clearPatiMediaUrls();$('#modal-root').innerHTML='';if(document.getElementById('story-overlay')&&!storyTimer&&storyItems.length)storyTimer=setTimeout(()=>stepStory(1),6000)}
const species=['Kedi','Köpek','Muhabbet kuşu','Papağan','Kanarya','Kuş','Tavşan','Hamster','Ginepig','Fare','Sıçan','Gerbil','Çinçilla','Kemirgen','Balık','Japon balığı','Beta balığı','Akvaryum balığı','Kaplumbağa','Su kaplumbağası','Kara kaplumbağası','Kertenkele','Geko','İguana','Bukalemun','Yılan','Sürüngen','Kurbağa','Semender','Amfibi','Kirpi','Gelincik','At','Midilli','Eşek','Keçi','Koyun','İnek','Tavuk','Ördek','Kaz','Güvercin','Arı','Omurgasız','Diğer'];
const petGenders=['Belirtilmedi','Erkek','Dişi','Bilinmiyor','İnterseks'];
const ownPets=()=>data.pets.filter(p=>p.owner_id===me.id);
const petOptions=()=>`<div class="pati-field"><label>Hayvan profili (isteğe bağlı)</label><select name="pet_id"><option value="">Seçilmedi</option>${ownPets().map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>`;
let patiMediaUrls=[];
function clearPatiMediaUrls(){for(const url of patiMediaUrls)URL.revokeObjectURL(url);patiMediaUrls=[]}
function makePatiMediaUrl(file){const url=URL.createObjectURL(file);patiMediaUrls.push(url);return url}
function postMediaField(mode){
 const reel=mode==='reels';
 return '<section class="pati-compose-media" aria-label="Medya seçimi"><div class="pati-media-intro"><span class="pati-media-icon">'+(reel?'▷':'▧')+'</span><div><strong>'+(reel?'Reels videosu':'Fotoğraf ve video')+'</strong><p>'+(reel?'Kısa videonu galeriden seç ya da kamerayla çek.':'En fazla 10 fotoğraf veya 1 video paylaşabilirsin.')+'</p></div></div><div class="pati-media-gallery" id="pati-post-media-gallery"><div class="pati-media-empty"><span>'+(reel?'▷':'▧')+'</span><strong>'+(reel?'Videonu burada göreceksin':'Fotoğrafların burada görünecek')+'</strong><small>Galeri veya kamerayı kullanarak başlayabilirsin.</small></div></div><div class="pati-media-thumbs" id="pati-post-media-thumbs" hidden></div><div class="pati-media-picker-actions"><button type="button" class="pati-media-pick-primary" data-action="pati-media-gallery">▧ Galeriyi aç</button><button type="button" class="pati-media-pick-secondary" data-action="pati-media-camera">◎ '+(reel?'Video çek':'Fotoğraf çek')+'</button>'+(!reel?'<button type="button" class="pati-media-pick-secondary" data-action="pati-media-video">▷ Video seç</button>':'')+'</div>'+(reel?'<div class="pati-reels-editor"><label>Video kapak fotoğrafı <input type="file" name="cover_photo" accept="image/*" aria-label="Video kapağı seç"></label><label>Video altyazısı <input name="video_subtitle" maxlength="220" placeholder="Örn: Tarçın oyun oynuyor"></label></div>':'')+'<p class="pati-media-help">'+(reel?'MP4, WebM veya MOV · en fazla 25 MB':'JPG, PNG, HEIC ve desteklenen videolar. Yazı paylaşmak için medya seçmek zorunda değilsin.')+'</p><input type="file" name="photo" accept="image/*,.heic,.heif" multiple class="pati-native-input" aria-label="Fotoğraflarını seç"><input type="file" name="video" accept="video/mp4,video/webm,video/quicktime,.mov"'+(reel?' multiple':'')+' class="pati-native-input" aria-label="Video seç"></section>';
}
function openComposerMediaPicker(kind){
 const f=document.getElementById('post-form');if(!f)return;
 const video=f.dataset.mode==='reels',input=f.querySelector('input[name="'+(video?'video':'photo')+'"]');if(!input)return;
 if(kind==='gallery'&&!video&&window.PatiyizGalleryPicker){
  window.PatiyizGalleryPicker.open([],{multiple:true,max:10,onReopen:()=>{if(input.isConnected)input.click()}});
  return;
 }
 if(kind==='camera'){input.setAttribute('capture','environment');input.multiple=false}
 else{input.removeAttribute('capture');input.multiple=true}
 input.click();
}
function openStoryComposer(autoPick=true,makeHighlight=false){
 clearPatiMediaUrls();
 modal('Yeni hikâye',storyPhotoField()+textField('caption','Hikâye açıklaması (isteğe bağlı)','',false,300)+'<div class="pati-story-editor"><label>Üst yazı <input name="overlay_text" maxlength="100" placeholder="Patili bir an..."></label><label>Yazı rengi <select name="overlay_color"><option value="#ffffff">Beyaz</option><option value="#17181b">Siyah</option><option value="#ffe17a">Sarı</option></select></label><label>Çıkartma <select name="overlay_sticker"><option value="">Yok</option><option value="🐾">🐾</option><option value="❤️">❤️</option><option value="🐱">🐱</option><option value="🐶">🐶</option></select></label></div><div class="pati-story-interactions"><label>Etkileşim <select name="interaction_mode"><option value="">Yok</option><option value="poll">Anket</option><option value="question">Soru kutusu</option></select></label><label>Soru başlığı <input name="interaction_prompt" maxlength="120" placeholder="Patin en çok neyi seviyor?"></label><label>Anket seçeneği 1 <input name="poll_a" maxlength="60" placeholder="Oyun"></label><label>Anket seçeneği 2 <input name="poll_b" maxlength="60" placeholder="Uyku"></label></div><label class="pati-story-highlight-option"><input type="checkbox" name="is_highlight" value="on" '+(makeHighlight?'checked':'')+'><span><strong>Profilimde kalıcı göster</strong><small>Öne çıkan hikâyeler 24 saat sonra da görünür.</small></span></label>','story-form');
 const footer=document.querySelector('#story-form .modal-footer button[type="submit"]');if(footer)footer.textContent='Hikâyeyi paylaş';
 if(autoPick)document.querySelector('#story-form input[name="story_gallery"]')?.click();
}
async function renderEditedStoryFile(file,form){
 const words=String(form.querySelector('[name="overlay_text"]')?.value||'').trim().slice(0,100),sticker=String(form.querySelector('[name="overlay_sticker"]')?.value||'');
 if(!words&&!sticker)return file;
 const img=new Image(),url=URL.createObjectURL(file);
 try{img.src=url;await img.decode();const c=document.createElement('canvas');const ratio=Math.min(1,1440/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.max(1,Math.round(img.naturalWidth*ratio));c.height=Math.max(1,Math.round(img.naturalHeight*ratio));const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);
 if(words){g.textAlign='center';g.textBaseline='middle';g.font='800 '+Math.round(c.width*.085)+'px system-ui';g.lineWidth=Math.max(3,c.width/130);g.strokeStyle='#000b';g.fillStyle=form.querySelector('[name="overlay_color"]')?.value||'#fff';const parts=words.match(/.{1,22}/gu)||[words];parts.slice(0,5).forEach((line,i)=>{const y=c.height*.67+i*c.width*.115;g.strokeText(line.trim(),c.width/2,y,c.width*.9);g.fillText(line.trim(),c.width/2,y,c.width*.9)})}
 if(sticker){g.font=Math.round(c.width*.18)+'px system-ui';g.textAlign='center';g.fillText(sticker,c.width/2,c.height*.27)}const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.88));if(!blob)throw Error('Hikâye düzenlenemedi');return new File([blob],'patiyiz-story-'+Date.now()+'.jpg',{type:'image/jpeg'})
 }finally{URL.revokeObjectURL(url)}
}
function updateStoryMediaPreview(file){
 const box=document.getElementById('story-photo-preview');if(!box)return;
 clearPatiMediaUrls();box.replaceChildren();box.classList.toggle('has-media',!!file?.size);
 if(!file?.size)return;
 const img=document.createElement('img');img.alt='Hikâye fotoğrafı önizlemesi';img.src=makePatiMediaUrl(file);box.appendChild(img);
 const info=document.createElement('span');info.className='pati-media-file-name';info.textContent=file.name;box.appendChild(info);
}
function updatePostMediaPreview(){
 const f=document.getElementById('post-form'),box=document.getElementById('pati-post-media-gallery'),thumbs=document.getElementById('pati-post-media-thumbs');if(!f||!box||!thumbs)return;
 clearPatiMediaUrls();box.replaceChildren();thumbs.replaceChildren();
 const images=f._patiEditedPhotos||[...(f.querySelector('input[name="photo"]')?.files||[])],video=f.querySelector('input[name="video"]')?.files?.[0];
 const files=images.length?images:video?.size?[video]:[],isVideo=!images.length&&!!video?.size;
 box.classList.toggle('has-media',!!files.length);thumbs.hidden=images.length<2;
 if(!files.length){box.innerHTML='<div class="pati-media-empty"><span>▧</span><strong>Galerinden bir an seç</strong><small>Fotoğraf veya video seçmek için aşağıya dokun.</small></div>';return}
 const selected=files[Math.min(postCropIndex,files.length-1)];
 if(isVideo){const v=document.createElement('video');v.src=makePatiMediaUrl(selected);v.controls=true;v.playsInline=true;v.preload='metadata';v.setAttribute('aria-label','Reels veya gönderi video önizlemesi');box.appendChild(v)}
 else{const img=document.createElement('img');img.src=makePatiMediaUrl(selected);img.alt='Seçilen fotoğrafın önizlemesi';box.appendChild(img)}
 const count=document.createElement('span');count.className='pati-media-count';count.textContent=isVideo?'Video seçildi':files.length+' fotoğraf seçildi';box.appendChild(count);
 if(images.length>1){images.forEach((file,i)=>{const tile=document.createElement('button');tile.type='button';tile.className='pati-media-thumb'+(i===postCropIndex?' active':'');tile.dataset.action='pati-media-select';tile.dataset.id=String(i);tile.setAttribute('aria-label',(i+1)+'. fotoğrafı önizle');const preview=document.createElement('img');preview.src=makePatiMediaUrl(file);preview.alt='Fotoğraf '+(i+1);tile.appendChild(preview);thumbs.appendChild(tile)})}
}

function openPostPhotoStudio(form,files){
 if(!form?.isConnected||!files?.length)return false;
 if(!window.PatiyizPhotoStudio){notify('Fotoğraf Stüdyosu yüklenemedi; fotoğrafı normal şekilde paylaşabilirsin.',true);return true}
 return window.PatiyizPhotoStudio.open(files,{
  onApply:edited=>{
   if(!form.isConnected)throw Error('Paylaşım penceresi kapandı.');
   form._patiEditedPhotos=edited;postCropIndex=0;
   const controls=form.querySelector('.pati-media-controls');if(controls)controls.hidden=true;
   updatePostMediaPreview();
  },
  onCancel:()=>{
   if(!form.isConnected)return;
   form._patiEditedPhotos=null;
   const input=form.querySelector('input[name="photo"]');if(input)input.value='';
   const controls=form.querySelector('.pati-media-controls');if(controls)controls.hidden=true;
   updatePostMediaPreview();
  }
 });
}
function openStoryPhotoStudio(form,file){
 if(!form?.isConnected||!file?.size)return false;
 if(!window.PatiyizPhotoStudio){notify('Fotoğraf Stüdyosu yüklenemedi; hikâyeyi normal şekilde paylaşabilirsin.',true);return true}
 return window.PatiyizPhotoStudio.open([file],{
  onApply:edited=>{
   if(!form.isConnected)throw Error('Hikâye penceresi kapandı.');
   form._patiEditedStory=edited[0];updateStoryMediaPreview(edited[0]);
  },
  onCancel:()=>{
   if(!form.isConnected)return;
   form._patiEditedStory=null;
   const input=form.querySelector('input[name="'+(form.dataset.storyInput||'story_gallery')+'"]');
   if(input)input.value='';
   updateStoryMediaPreview(null);
  }
 });
}
function patiDraftKey(){return 'patiyiz-social-draft-'+(me?.id||'guest')}
function getPatiDraft(){try{return JSON.parse(localStorage.getItem(patiDraftKey())||'null')}catch{return null}}
function draftSave(){
 const form=document.getElementById('post-form');if(!form||form.dataset.edit)return;
 const body=form.querySelector('textarea[name="body"]')?.value||'',species=form.querySelector('select[name="species"]')?.value||'Kedi';
 try{localStorage.setItem(patiDraftKey(),JSON.stringify({body,species,created_at:Date.now()}));notify('Açıklama taslağı kaydedildi. Fotoğraf ve videolar taslakta saklanmaz.')}catch{notify('Taslak bu cihazda kaydedilemedi.',true)}
}
function draftRestore(){
 const form=document.getElementById('post-form'),draft=getPatiDraft();if(!form||!draft)return notify('Kayıtlı taslak yok.',true);
 const body=form.querySelector('textarea[name="body"]'),species=form.querySelector('select[name="species"]');
 if(body)body.value=draft.body||'';if(species&&draft.species)species.value=draft.species;
 notify('Taslak açıklaması yüklendi.');
}
function compose(post,mode='post',autoPick=true){
 postCropX=.5;postCropY=.5;postCropRatio='4:5';postCropZoom=1;postCropIndex=0;clearPatiMediaUrls();
 const reel=!post&&mode==='reels',textOnly=!post&&mode==='text';
 modal(post?'Paylaşımı düzenle':reel?'Yeni Reels':textOnly?'Yeni yazı':'Yeni gönderi',(!post&&!textOnly?postMediaField(mode):'')+textField('body',textOnly?'Ne düşünüyorsun?': 'Bir açıklama ekle...',post?.body||'',textOnly)+selectField('species','Hayvan türü',species,post?.species||'Kedi')+(!post&&!textOnly?petOptions()+'<div class="pati-media-controls" hidden><label>Fotoğrafı düzenle · Dikey / Yatay / Kare</label><div class="pati-ratio-options"><button type="button" class="active" data-action="post-ratio" data-id="4:5">▯ Dikey</button><button type="button" data-action="post-ratio" data-id="1.91:1">▭ Yatay</button><button type="button" data-action="post-ratio" data-id="1:1">□ Kare</button></div><input type="hidden" name="aspect" value="4:5"><div class="pati-crop-preview" hidden><div class="pati-crop-pages"><button type="button" data-action="post-crop-prev" aria-label="Önceki fotoğraf">‹</button><strong id="pati-crop-index">1 / 1</strong><button type="button" data-action="post-crop-next" aria-label="Sonraki fotoğraf">›</button></div><canvas id="pati-crop-canvas" width="320" height="400" aria-label="Fotoğraf kırpma önizlemesi"></canvas><p>Fotoğrafı sürükleyerek istediğin kadrajı seç.</p><label>Yakınlaştır <input type="range" name="crop_zoom" min="1" max="2.5" value="1" step="0.05"></label></div></div>':textOnly?'':'<p class="small-note">Düzenleme sırasında mevcut medya korunur.</p>'),'post-form');
 const f=document.getElementById('post-form');f.dataset.edit=post?.id||'';f.dataset.mode=reel?'reels':textOnly?'text':'post';
 const submit=f.querySelector('.modal-footer button[type="submit"]');if(submit)submit.textContent=post?'Değişiklikleri kaydet':reel?'Reels paylaş':textOnly?'Yazıyı paylaş':'Paylaş';if(!post){const controls=document.createElement('div');controls.className='pati-draft-controls';controls.innerHTML='<button type="button" data-action="pati-draft-save">▤ Açıklama taslağını kaydet</button><button type="button" data-action="pati-draft-load">↺ Taslağı aç</button>';f.querySelector('.modal-content')?.appendChild(controls)}
 if(reel){if(!window.PatiyizReelsEditor)notify('Reels düzenleyici yüklenemedi. Sayfayı yenile.',true);else window.PatiyizReelsEditor.mount(f)}
 if(!post&&!textOnly&&autoPick)openComposerMediaPicker('gallery');if(textOnly)f.querySelector('textarea[name="body"]')?.focus();
}

function uploadStatus(message){const form=document.querySelector('#modal-root form');const status=form?.querySelector('.pati-upload-status');if(status){status.hidden=false;status.querySelector('span').textContent=message}const label=form?.querySelector('.modal-footer .primary-btn');if(label){label.dataset.originalText||=label.textContent;label.textContent='⏳ '+message}}
async function preparePhoto(file){if(!file||!file.size)return null;if(!file.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))throw Error('Lütfen bir fotoğraf dosyası seç.');const accepted=['image/jpeg','image/png','image/webp'];if(accepted.includes(file.type)&&file.size<=3*1024*1024)return file;uploadStatus('Fotoğraf hazırlanıyor…');let url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{img.onload=null;img.onerror=null;reject(new Error('Fotoğraf hazırlanırken zaman aşımına uğradı. Daha küçük bir fotoğraf dene.'))},18000);img.onload=()=>{clearTimeout(timer);resolve()};img.onerror=()=>{clearTimeout(timer);reject(new Error('Fotoğraf açılamadı. HEIC dosyası kullanıyorsan galeride JPG olarak dışa aktar.'))}});const max=2048,ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));if(!blob)throw Error('Fotoğraf işlenemedi.');if(blob.size>6291456)throw Error('Fotoğraf boyutu çok büyük.');return new File([blob],'patiyiz-'+Date.now()+'.jpg',{type:'image/jpeg'})}finally{URL.revokeObjectURL(url)}}
async function drawPostCrop(){const input=document.querySelector('#post-form input[name="photo"]'),file=input?.files?.[postCropIndex],box=document.querySelector('.pati-crop-preview'),canvas=document.getElementById('pati-crop-canvas');if(!file||!box||!canvas)return;box.hidden=false;const counter=document.getElementById('pati-crop-index');if(counter)counter.textContent=(postCropIndex+1)+' / '+input.files.length;const dims={'4:5':[320,400],'1:1':[320,320],'1.91:1':[320,168]},[w,h]=dims[postCropRatio];canvas.width=w;canvas.height=h;const url=URL.createObjectURL(file),img=new Image();try{img.src=url;await img.decode();const ctx=canvas.getContext('2d'),scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*postCropZoom;ctx.clearRect(0,0,w,h);ctx.drawImage(img,(w-img.naturalWidth*scale)*postCropX,(h-img.naturalHeight*scale)*postCropY,img.naturalWidth*scale,img.naturalHeight*scale)}catch(e){console.warn(e)}finally{URL.revokeObjectURL(url)}}
async function cropPostPhoto(file,aspect){if(!file?.size)return file;const dims={'4:5':[1080,1350],'1:1':[1080,1080],'1.91:1':[1080,566]};const [w,h]=dims[aspect]||dims['4:5'];const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*postCropZoom;const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;ctx.drawImage(img,(w-dw)*postCropX,(h-dh)*postCropY,dw,dh);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.86));if(!blob)throw Error('Görsel kırpılamadı.');return new File([blob],'patiyiz-post-'+Date.now()+'.jpg',{type:'image/jpeg'})}finally{URL.revokeObjectURL(url)}}
async function uploadVideo(file){if(!file||!file.size)return null;if(file.size>26214400)throw Error('Video en fazla 25 MB olabilir.');if(navigator.onLine===false)throw Error('İnternet bağlantısı yok. Video bağlantı geldiğinde yüklenebilir.');const guessed=/\.mov$/i.test(file.name)?'video/quicktime':/\.webm$/i.test(file.name)?'video/webm':/\.mp4$/i.test(file.name)?'video/mp4':'';const mime=['video/mp4','video/webm','video/quicktime'].includes(file.type)?file.type:(!file.type||file.type==='application/octet-stream'?guessed:file.type);if(!['video/mp4','video/webm','video/quicktime'].includes(mime))throw Error('MP4, WebM veya MOV video seç.');const ext=mime==='video/quicktime'?'mov':mime==='video/webm'?'webm':'mp4';const key=me.id+'/'+crypto.randomUUID()+'.'+ext;uploadStatus('Video yükleniyor…');let result;for(let attempt=0;attempt<2;attempt++){result=(typeof window!=='undefined'&&window.PatiyizReliableUpload?.upload)?await window.PatiyizReliableUpload.upload({sb,projectUrl:cfg.supabaseUrl,bucket:'patiyiz-videos',key,file,contentType:mime,onProgress:p=>uploadStatus('Video yükleniyor… %'+p)}):await sb.storage.from('patiyiz-videos').upload(key,file,{contentType:mime,upsert:false});if(!result.error)break;if(attempt===1||!/timeout|network|fetch|502|503|504/i.test(result.error.message||''))throw result.error;uploadStatus('Video bağlantısı tekrar deneniyor…');await new Promise(resolve=>setTimeout(resolve,900))}if(result?.error)throw result.error;return sb.storage.from('patiyiz-videos').getPublicUrl(key).data.publicUrl}
async function upload(file){if(!file||!file.size)return null;if(navigator.onLine===false)throw Error('İnternet bağlantısı yok. Fotoğrafı bağlantı geldiğinde yükle.');if(file.size>30*1024*1024)throw Error('Fotoğraf en fazla 30 MB olabilir.');uploadStatus('Fotoğraf hazırlanıyor…');const prepared=await preparePhoto(file);const ext=prepared.type==='image/png'?'png':prepared.type==='image/webp'?'webp':'jpg';const key=me.id+'/'+crypto.randomUUID()+'.'+ext;uploadStatus('Fotoğraf yükleniyor…');let up;for(let attempt=0;attempt<2;attempt++){try{up=(typeof window!=='undefined'&&window.PatiyizReliableUpload?.upload)?await window.PatiyizReliableUpload.upload({sb,projectUrl:cfg.supabaseUrl,bucket:'patiyiz-media',key,file:prepared,contentType:prepared.type,onProgress:p=>uploadStatus('Fotoğraf yükleniyor… %'+p)}):await sb.storage.from('patiyiz-media').upload(key,prepared,{contentType:prepared.type,upsert:false});if(!up.error)break;if(attempt===1||!/timeout|network|fetch|502|503|504/i.test(up.error.message||''))throw up.error}catch(err){if(attempt===1||!/timeout|network|fetch|502|503|504/i.test(String(err?.message||err)))throw err}uploadStatus('Bağlantı yeniden deneniyor…');await new Promise(r=>setTimeout(r,900))}if(up?.error)throw up.error;uploadStatus('Paylaşım hazırlanıyor…');return sb.storage.from('patiyiz-media').getPublicUrl(key).data.publicUrl}
/* Publication transaction: protect against duplicate posts and clean up only unreferenced, owned media. */
function publicationMediaReference(url,owner){
 try{
  const host=new URL(cfg.supabaseUrl),candidate=new URL(url);
  if(candidate.origin!==host.origin)return null;
  for(const bucket of ['patiyiz-media','patiyiz-videos']){
   const prefix='/storage/v1/object/public/'+bucket+'/';
   if(!candidate.pathname.startsWith(prefix))continue;
   const name=decodeURIComponent(candidate.pathname.slice(prefix.length));
   if(name.startsWith(owner+'/')&&!name.includes('..')&&!name.includes('\\')&&!name.includes('?')&&!name.includes('#'))return {bucket,name,url};
  }
 }catch(error){console.warn('Medya yolu doğrulanamadı:',error)}
 return null;
}
async function cleanPublicationMedia(urls,owner){
 const grouped=new Map();
 for(const url of urls){
  const item=publicationMediaReference(url,owner);if(!item)continue;
  if(!grouped.has(item.bucket))grouped.set(item.bucket,new Set());
  grouped.get(item.bucket).add(item.name);
 }
 for(const [bucket,names] of grouped)try{
  const result=await sb.storage.from(bucket).remove([...names]);
  if(result.error)console.warn('Geçici medya temizlenemedi:',result.error.message);
 }catch(error){console.warn('Geçici medya temizliği ağ hatası:',error)}
}
async function checkPublishedRecord(table,id,author){
 try{
  const result=await sb.from(table).select('*').eq('id',id).eq('author_id',author).maybeSingle();
  if(result.error)return {known:false,row:null};
  return {known:true,row:result.data||null};
 }catch(error){console.warn('Paylaşım durum sorgusu başarısız:',error.message);return {known:false,row:null}}
}
async function publishMediaRecord(table,form,createRecord){
 const owner=me?.id;if(!owner)throw Error('Paylaşmak için giriş yap.');
 const id=form.dataset.patiPublishId||crypto.randomUUID();form.dataset.patiPublishId=id;
 const publishKind=table==='patiyiz_stories'?'story':form.dataset.mode==='reels'?'reels':'post';
 const metricId=crypto.randomUUID(),metricAttempt=patiShareMetric(publishKind,metricId,'attempt');
 const recordMetric=status=>{void metricAttempt.then(()=>patiShareMetric(publishKind,metricId,status))};
 const uploaded=[];
 // A retry after an ambiguous network error must not create another copy.
 if(form.dataset.patiPublishAttempted==='yes'){
  const previous=await checkPublishedRecord(table,id,owner);
  if(!previous.known)throw Error('Önceki paylaşımın durumu kontrol edilemiyor. Bağlantını kontrol edip tekrar dene.');
  if(previous.row){recordMetric('success');return previous.row;}
 }
 try{
  const record=await createRecord(async(file,kind)=>{
   if(me?.id!==owner)throw Error('Oturum değişti. Paylaşımı tekrar başlat.');
   const url=kind==='video'?await uploadVideo(file):await upload(file);
   if(url)uploaded.push(url);
   return url;
  });
  if(me?.id!==owner)throw Error('Oturum değişti. Paylaşımı tekrar başlat.');
  form.dataset.patiPublishAttempted='yes';
  const response=await sb.from(table).insert({...record,id,author_id:owner}).select('*').single();
  if(response.error)throw response.error;
  if(!response.data)throw Error('Paylaşım kaydı doğrulanamadı.');
  recordMetric('success');return response.data;
 }catch(error){
  const checked=await checkPublishedRecord(table,id,owner);
  if(checked.known){
   const references=new Set(checked.row?[checked.row.image_url,checked.row.video_url,checked.row.video_cover_url,...(checked.row.images||[])].filter(Boolean):[]);
   await cleanPublicationMedia(uploaded.filter(url=>!references.has(url)),owner);
   if(checked.row){recordMetric('success');return checked.row;}
  }else if(uploaded.length){
   console.warn('Paylaşım durumu kesinleşmedi; medya olası veri kaybını önlemek için korunuyor.');
  }
  recordMetric('failed');throw error;
 }
}
async function createPostPublication(form,f,str){
 const photoFiles=form._patiEditedPhotos||[...(form.querySelector('input[name="photo"]')?.files||[])];
 const videoFile=f.get('video'),hasVideo=!!videoFile?.size,body=str('body').trim();
 if(form.dataset.mode==='text'&&!body)throw Error('Yazı paylaşmak için önce bir metin yaz.');
 if(form.dataset.mode==='reels'&&!hasVideo)throw Error('Reels paylaşmak için önce bir video seç.');
 if(photoFiles.length>10)throw Error('En fazla 10 fotoğraf seçebilirsin.');
 if(photoFiles.length&&hasVideo)throw Error('Bir paylaşımda fotoğraf veya video seçebilirsin.');
 if(!body&&!photoFiles.length&&!hasVideo)throw Error('Paylaşmak için bir fotoğraf, video veya yazı ekle.');
 return publishMediaRecord('posts',form,async send=>{
  const record={body,species:str('species'),pet_id:str('pet_id')||null,images:[]};
  for(let i=0;i<photoFiles.length;i++){
   uploadStatus('Fotoğraf '+(i+1)+' / '+photoFiles.length+' hazırlanıyor…');
   const file=form._patiEditedPhotos?photoFiles[i]:await cropPostPhoto(photoFiles[i],str('aspect'));
   const url=await send(file,'image');
   if(url)record.images.push(url);
  }
  record.image_url=record.images[0]||null;
  let video=videoFile;
  if(form.dataset.mode==='reels'&&hasVideo){
   if(!window.PatiyizReelsEditor)throw Error('Reels editörü yüklenemedi. Sayfayı yenile.');
   uploadStatus('Reels klipleri hazırlanıyor…');
   video=await window.PatiyizReelsEditor.exportVideo(percent=>uploadStatus('Reels işleniyor… %'+percent));
  }
  record.video_url=await send(video,'video');
  if(video?.size){
   record.video_subtitle=str('video_subtitle').slice(0,220)||null;
   const cover=form.querySelector('input[name="cover_photo"]')?.files?.[0];
   if(cover?.size)record.video_cover_url=await send(cover,'image');
  }
  uploadStatus('Paylaşım kaydediliyor…');
  return record;
 });
}
async function createStoryPublication(form,f,str){
 const choice=form.dataset.storyInput||'story_gallery';
 let file=form._patiEditedStory||f.get(choice);
 if(!file?.size)file=f.get(choice==='story_gallery'?'story_camera':'story_gallery');
 if(!file?.size)throw Error('Hikâye için galeriden fotoğraf seç veya kamerayla çek.');
 const mode=str('interaction_mode'),prompt=str('interaction_prompt'),a=str('poll_a'),b=str('poll_b');
 if(mode&&!['poll','question'].includes(mode))throw Error('Geçersiz hikâye etkileşimi.');
 if(mode&&!prompt)throw Error('Anket veya soru başlığı gerekli.');
 if(mode==='poll'&&(!a||!b))throw Error('Anket için iki seçenek gerekli.');
 return publishMediaRecord('patiyiz_stories',form,async send=>{
  uploadStatus('Hikâye fotoğrafı hazırlanıyor…');
  const image_url=await send(await renderEditedStoryFile(file,form),'image');
  if(!image_url)throw Error('Fotoğraf yüklenemedi.');
  uploadStatus('Hikâye kaydediliyor…');
  return {image_url,caption:str('caption'),is_highlight:f.get('is_highlight')==='on',
   poll_question:mode==='poll'?prompt:null,poll_options:mode==='poll'?[a,b]:null,
   question_prompt:mode==='question'?prompt:null};
 });
}
function composeQuestion(){modal('Topluluğa soru sor',formField('title','Soru başlığı (5–150 karakter)','text','',true)+selectField('category','Kategori',['Genel','Sağlık','Beslenme','Eğitim','Davranış','Bakım','Diğer'])+textField('body','Sorunun ayrıntıları (en az 5 karakter)','',true,2000),'question-form');const f=$('#question-form');if(f){f.querySelector('[name="title"]').minLength=5;f.querySelector('[name="title"]').maxLength=150;f.querySelector('[name="body"]').minLength=5;f.querySelector('.modal-footer .primary-btn').textContent='Soruyu yayınla'}}
function composeLost(){modal('Kayıp hayvan ilanı',formField('name','Hayvanın adı','text','',true)+selectField('species','Tür',species)+formField('city','Şehir','text','',true)+formField('district','İlçe (isteğe bağlı)')+formField('last_seen','Son görüldüğü tarih','date',new Date().toISOString().slice(0,10),true)+textField('description','Açıklama (açık adres / telefon yazma)','',true,1200)+imageField(),'lost-form')}
function composeAdoption(a){modal(a?'Sahiplendirme ilanını düzenle':'Sahiplendirme ilanı oluştur',formField('name','Hayvanın adı','text',a?.name||'',true)+selectField('species','Hayvan türü',species,a?.species||'Kedi')+selectField('gender','Cinsiyet',petGenders,a?.gender||'Bilinmiyor')+formField('age','Yaş (isteğe bağlı)','text',a?.age||'')+formField('city','Şehir','text',a?.city||'',true)+formField('district','İlçe','text',a?.district||'')+textField('description','Hayvan hakkında bilgi (en az 15 karakter)','',true,2000)+(a?'<p class="small-note">Yeni fotoğraf yüklemezsen mevcut fotoğraf korunur.</p>':'')+imageField(),'adoption-form');const f=$('#adoption-form');f.dataset.edit=a?.id||'';if(a)f.querySelector('[name="description"]').value=a.description||''}
function composeCare(){modal('Bakım görevi ekle',formField('title','Görev adı','text','',true)+selectField('category','Kategori',['Aşı','Veteriner','İlaç','Bakım','Diğer'])+formField('due_date','Tarih','date',new Date().toISOString().slice(0,10),true)+petOptions(),'care-form')}
function editProfile(){let p=current();modal('Profili düzenle',formField('display_name','Görünen ad','text',p.display_name,true)+formField('handle','Kullanıcı adı (küçük harf, rakam ve _)','text',p.handle,true)+formField('city','Şehir','text',p.city||'')+textField('bio','Hakkında',p.bio||'',false,500)+imageField(),'profile-form')}
function editPet(p){modal(p?'Hayvan profilini düzenle':'Yeni hayvan ekle',formField('name','Hayvanın adı','text',p?.name||'',true)+selectField('species','Tür',species,p?.species||'Kedi')+selectField('gender','Cinsiyet',petGenders,p?.gender||'Belirtilmedi')+formField('age','Yaş', 'text',p?.age||'')+formField('breed','Irk','text',p?.breed||'')+formField('personality','Karakter','text',p?.personality||'')+textField('notes','Notlar',p?.notes||'',false,500)+imageField(),'pet-form');$('#pet-form').dataset.edit=p?.id||''}
function questionReplies(id){let q=data.questions.find(x=>x.id===id);if(!q)return;let rs=data.replies.filter(r=>r.question_id===id);modal('Soruya cevaplar',`<h3>${esc(q.title)}</h3><p style="font-size:12px;color:#697d70">${esc(q.body)}</p><div class="pati-list">${rs.map(x=>`<div class="pati-card">${userRow(x.author_id,day(x.created_at))}<p>${esc(x.body)}</p></div>`).join('')||'<p>Henüz cevap yok.</p>'}</div>${textField('body','Cevabın','',true,1000)}`,'reply-form');$('#reply-form').dataset.question=id}
/* Never display a confirmed heart until Supabase has persisted and verified it.
 * One in-flight mutation per post; a concurrent bootstrap cannot overwrite the result. */
async function togglePostLike(id){
 if(!id||!me||!sb||pendingPostLikes.has(id))return;
 const owner=me.id,wasLiked=liked.has(id);
 pendingPostLikes.add(id);likesChangeEpoch++;
 const buttons=[...document.querySelectorAll('[data-action="like"][data-id="'+id+'"]')];
 buttons.forEach(btn=>{btn.disabled=true;btn.setAttribute('aria-busy','true')});
 try{
  if(wasLiked){
   const out=await sb.from('post_likes').delete().eq('post_id',id).eq('user_id',owner);
   if(out.error)throw out.error;
  }else{
   const out=await sb.from('post_likes').upsert({user_id:owner,post_id:id},{onConflict:'user_id,post_id',ignoreDuplicates:true});
   if(out.error)throw out.error;
  }
  const verified=await sb.from('post_likes').select('post_id,user_id').eq('post_id',id);
  if(verified.error)throw verified.error;
  if(me?.id!==owner)return;
  const authoritative=verified.data||[];
  const savedLike=authoritative.some(x=>x.user_id===owner);
  if(savedLike===wasLiked)throw Error('Beğeni sunucuda doğrulanamadı. Tekrar dene.');
  data.likes=[...data.likes.filter(x=>x.post_id!==id),...authoritative];
  liked=new Set(data.likes.filter(x=>x.user_id===owner).map(x=>x.post_id));
  const count=authoritative.length;
  document.querySelectorAll('[data-action="like"][data-id="'+id+'"]').forEach(btn=>{
   btn.classList.toggle('active',savedLike);btn.setAttribute('aria-pressed',String(savedLike));
   const label=btn.querySelector('.pati-reel-count')||btn.querySelector('span');
   if(label)label.textContent=String(count);
  });
  document.querySelectorAll('.pati-feed-card[data-post-id="'+id+'"] .pati-post-like-summary')
   .forEach(el=>el.textContent=count+' beğeni');
 }catch(error){
  console.warn('Beğeni kalıcılık kontrolü:',error);
  notify('Beğeni kaydedilemedi: '+friendly(error),true);
  try{
   const existing=await sb.from('post_likes').select('post_id,user_id').eq('post_id',id);
   if(!existing.error&&me?.id===owner){
    data.likes=[...data.likes.filter(x=>x.post_id!==id),...(existing.data||[])];
    liked=new Set(data.likes.filter(x=>x.user_id===owner).map(x=>x.post_id));
    if(['home','reels','profile'].includes(view))render();
   }
  }catch(_){}
 }finally{
  likesChangeEpoch++;
  pendingPostLikes.delete(id);
  buttons.forEach(btn=>{btn.disabled=false;btn.removeAttribute('aria-busy')});
 }
}
async function doToggle(table,keys,present){if(table==='follows'){profileCountCache.delete(keys.followee_id);profileCountCache.delete(me.id)}
 const config={post_likes:['likes','post_id',liked],post_saves:['saves','post_id',saved],follows:['follows','followee_id',followed],question_votes:['votes','question_id',voted],kb_bookmarks:['bookmarks','article_id',favorites]};
 const item=config[table],rowKey=item&&keys[item[1]];
 if(item){const arr=data[item[0]],ix=arr.findIndex(x=>Object.keys(keys).every(k=>x[k]===keys[k]));if(present){if(ix>=0)arr.splice(ix,1);item[2].delete(rowKey)}else{arr.push({...keys,created_at:new Date().toISOString()});item[2].add(rowKey)};if(['post_likes','post_saves'].includes(table)){document.querySelectorAll('[data-action="'+(table==='post_likes'?'like':'save')+'"][data-id="'+rowKey+'"]').forEach(btn=>{btn.classList.toggle('active',!present);btn.setAttribute('aria-pressed',String(!present));if(table==='post_likes'){const count=data.likes.filter(x=>x.post_id===rowKey).length;const label=btn.querySelector('.pati-reel-count')||btn.querySelector('span');if(label)label.textContent=count;document.querySelectorAll('.pati-feed-card[data-post-id="'+rowKey+'"] .pati-post-like-summary').forEach(summary=>summary.textContent=count+' beğeni');}})}else render()}
 try{let r;if(present){let q=sb.from(table).delete();for(const [k,v]of Object.entries(keys))q=q.eq(k,v);r=await q}else r=await sb.from(table).insert(keys);if(r.error)throw r.error;if(!item)await refresh()}catch(e){if(item){const arr=data[item[0]],ix=arr.findIndex(x=>Object.keys(keys).every(k=>x[k]===keys[k]));if(present){if(ix<0)arr.push({...keys});item[2].add(rowKey)}else{if(ix>=0)arr.splice(ix,1);item[2].delete(rowKey)}render()}throw e}
}
async function deleteOwnedMedia(record){
 if(!record||record.author_id!==me.id)return;
 const urls=[...(record.images||[]),record.image_url,record.video_url,record.video_cover_url].filter(Boolean);
 for(const uri of [...new Set(urls)])try{
  const url=new URL(uri),m=url.pathname.match(/\/storage\/v1\/object\/public\/(patiyiz-media|patiyiz-videos)\/(.+)$/);
  if(!m||url.origin!==new URL(cfg.supabaseUrl).origin)continue;
  const key=decodeURIComponent(m[2]);if(!key.startsWith(me.id+'/'))continue;
  if([...data.posts,...data.stories].some(x=>x.id!==record.id&&(x.image_url===uri||x.video_url===uri||x.video_cover_url===uri||(x.images||[]).includes(uri))))continue;
  const out=await sb.storage.from(m[1]).remove([key]);if(out.error)console.warn('Medya dosyası silinemedi:',out.error.message);
 }catch(err){console.warn('Medya temizleme:',err.message)}
}
async function remove(table,id){if(table==='posts')profileCountCache.delete(me.id);if(!confirm('Bu kaydı silmek istediğine emin misin?'))return;await run(async()=>{const old=table==='posts'?data.posts.find(x=>x.id===id):null;let r=await sb.from(table).delete().eq('id',id).select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error('Kayıt silinemedi veya izin yok.');await refresh();if(old)await deleteOwnedMedia(old)},'Silindi')}
async function save(table,record,id){if(table==='posts')profileCountCache.delete(me.id);let r=id?await sb.from(table).update(record).eq('id',id).select('*'):await sb.from(table).insert(record).select('*');if(r.error)throw r.error;if(!r.data?.length)throw Error('Kayıt doğrulanamadı. İşlemi yeniden dene veya hesap izinlerini kontrol et.');closeModal(true);try{await refresh()}catch(refreshError){console.warn('Kayıt oluşturuldu, yenileme başarısız:',refreshError.message)}notify(({posts:id?'Paylaşım güncellendi.':'Paylaşım yayınlandı.',lost_reports:'Kayıp ilanı oluşturuldu.',care_tasks:id?'Bakım görevi güncellendi.':'Bakım görevi eklendi.',profiles:'Profil güncellendi.',pets:id?'Hayvan profili güncellendi.':'Hayvan profili eklendi.',adoption_listings:id?'Sahiplendirme ilanı güncellendi.':'Sahiplendirme ilanı yayınlandı.',comments:'Yorum yayınlandı.',replies:'Cevap yayınlandı.'})[table]||'İşlem kaydedildi.')}
function processClick(e){const video=e.target.closest('.pati-post-video');if(video&&!e.target.closest('button')){if(video.paused){delete video.dataset.userPaused;video.play().catch(()=>{});}else{video.dataset.userPaused='1';video.pause();}return;}let target=e.target.closest('[data-view],[data-action]');if(!target)return;let v=target.dataset.view;if(v){closePatiCreate();profileId='';selectedPostId='';if(v==='messages')mobileChatOpen=false;closeModal();navigate(v);return}let act=target.dataset.action,id=target.dataset.id;switch(act){case 'paticoin-claim':patiCoinSync(true);break;case 'paticoin-refresh':void patiCoinSync(false);break;case 'paticoin-invite-redeem':void patiInviteRedeem();break;case 'paticoin-invite-share':patiInviteShare();break;case 'paticoin-shop':navigate('shop');break;case 'paticoin-rewards':navigate('rewards');break;case 'paticoin-buy':patiCoinShowCheckout(id);break;case 'paticoin-confirm':patiCoinConfirm();break;case 'hashtag':navigate('explore');search='#'+(id||'');render();break;case 'pati-create-open':openPatiCreate();break;case 'reel-speed':{const v=target.closest('.pati-reel-item')?.querySelector('video');if(v){const rates=[1,1.25,1.5,2,.75],i=rates.indexOf(v.playbackRate);v.playbackRate=rates[(i+1)%rates.length];const label=target.querySelector('.pati-reel-tool-label');if(label)label.textContent=v.playbackRate+'×';target.setAttribute('aria-label','Oynatma hızı '+v.playbackRate+'×')}break}case 'reel-play':reelTogglePlay(target);break;case 'reel-sound':reelToggleSound(target);break;case 'pati-media-gallery':openComposerMediaPicker('gallery');break;case 'pati-dm-gallery-open':{const input=document.querySelector('#message-form input[name="dm_gallery"]');if(input){if(window.PatiyizGalleryPicker)window.PatiyizGalleryPicker.open([],{multiple:false,max:1,onReopen:()=>{if(input.isConnected)input.click()}});else input.click()}break}case 'pati-media-video':{const f=document.getElementById('post-form');const file=f?.querySelector('input[name="video"]');if(file){file.removeAttribute('capture');file.click()}break}case 'pati-media-camera':openComposerMediaPicker('camera');break;case 'pati-draft-save':draftSave();break;case 'pati-draft-load':draftRestore();break;case 'pati-media-select':{postCropIndex=Number(id)||0;updatePostMediaPreview();drawPostCrop();break}case 'pati-story-gallery':document.querySelector('#story-form input[name="story_gallery"]')?.click();break;case 'pati-story-camera':document.querySelector('#story-form input[name="story_camera"]')?.click();break;case 'pati-create-close':closePatiCreate();break;case 'pati-create-post':closePatiCreate();compose();break;case 'pati-create-text':closePatiCreate();compose(null,'text',false);break;case 'pati-create-story':closePatiCreate();openStoryComposer();break;case 'pati-create-reels':closePatiCreate();compose(null,'reels');break;case 'story-close':closeStory();break;case 'story-poll':run(async()=>{if(data.storyResponses.some(x=>x.story_id===id&&x.user_id===me.id&&x.kind==='poll'))throw Error('Bu ankete zaten oy verdin.');const result=await sb.from('patiyiz_story_responses').insert({story_id:id,user_id:me.id,kind:'poll',option_index:Number(target.dataset.index)});if(result.error)throw result.error;data.storyResponses.push({story_id:id,user_id:me.id,kind:'poll',option_index:Number(target.dataset.index)})},'Oyun kaydedildi.');break;case 'story-question':{const x=storyItems.find(x=>x.id===id);if(x){clearTimeout(storyTimer);storyTimer=null;modal('Hikâye sorusuna yanıt',textField('response','Yanıtın','',true,220),'story-answer-form');document.getElementById('story-answer-form').dataset.story=id}break}case 'story-emoji':run(async()=>{if(data.storyResponses.some(x=>x.story_id===id&&x.user_id===me.id&&x.kind==='emoji'))throw Error('Bu hikâyeye zaten tepki verdin.');const result=await sb.from('patiyiz_story_responses').insert({story_id:id,user_id:me.id,kind:'emoji',response:'🐾'});if(result.error)throw result.error;data.storyResponses.push({story_id:id,user_id:me.id,kind:'emoji',response:'🐾'})},'Tepki gönderildi.');break;case 'story-like':toggleStoryLike(id);break;case 'story-viewers':showStoryViewers();break;case 'story-viewers-close':{const el=document.getElementById('story-viewers-sheet');if(el)el.hidden=true;clearTimeout(storyTimer);if(storyItems.length)storyTimer=setTimeout(()=>stepStory(1),6000);break}case 'story-create':openStoryComposer(true,view==='profile'&&(!profileId||profileId===me.id));break;case 'story-create-highlight':newHighlightAlbum();break;case 'story-highlight-choose':chooseStoryHighlight(id);break;case 'story-highlight-new':newHighlightAlbum(id);break;case 'story-highlight-album':run(()=>addStoryToHighlightAlbum(target.dataset.story,id));break;case 'story-view':openStory(id);break;case 'story-highlights':openHighlights(id);break;case 'highlight-album-open':openHighlightAlbum(id);break;case 'highlight-album-new':newHighlightAlbum();break;case 'highlight-album-manage':manageHighlightAlbums();break;case 'highlight-album-delete':if(confirm('Bu albüm silinsin mi? Hikâyelerin silinmeyecek.'))run(async()=>{const out=await sb.from('patiyiz_highlight_albums').delete().eq('id',id).eq('owner_id',me.id);if(out.error)throw out.error;closeModal(true);await refresh()},'Albüm silindi.');break;case 'highlight-album-add':{const stories=data.stories.filter(x=>x.author_id===me.id&&x.is_highlight);if(!stories.length){notify('Önce bir hikâyeyi kalıcı olarak sabitle.',true);break}modal('Albüme hikâye ekle','<div class="pati-field"><label>Hikâyeyi seç</label><select name="story_id">'+stories.map(x=>'<option value="'+esc(x.id)+'">'+esc(cut(x.caption||day(x.created_at),65))+'</option>').join('')+'</select></div>','highlight-album-add-form');document.getElementById('highlight-album-add-form').dataset.album=id;break}case 'story-highlight-open':openHighlightStory(id);break;case 'story-pet-highlight':openPetHighlight(id);break;case 'pati-task-follow':exploreTab='users';navigate('explore');break;case 'story-prev':stepStory(-1);break;case 'story-next':stepStory(1);break;case 'story-delete':if(confirm('Hikâyeni silmek istiyor musun?'))run(async()=>{const original=data.stories.find(x=>x.id===id&&x.author_id===me.id);const r=await sb.from('patiyiz_stories').delete().eq('id',id).eq('author_id',me.id).select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error('Hikâye silinemedi.');closeStory();await refresh();if(original)await deleteOwnedMedia(original)},'Hikâye silindi.');break;case 'verification-request':{const meProfile=current();if(meProfile.is_verified){notify('Hesabın zaten doğrulanmış.');break}run(async()=>{const r=await sb.from('verification_requests').select('status').eq('user_id',me.id).eq('status','pending').limit(1);if(r.error)throw r.error;if(r.data?.length){notify('Mavi tik talebin inceleme bekliyor.');return}modal('Mavi tik talebi',textField('note','Doğrulama gerekçen (isteğe bağlı)','',false,500),'verification-request-form')});break}case 'open-admin':if(isAdmin){window.location.href='admin.html'}else notify('Yönetici yetkisi doğrulanamadı.',true);break;case 'close':if(e.target.classList.contains('modal-backdrop')||target.tagName==='BUTTON')closeModal();break;case 'load-more':if(['posts','messages','notifications'].includes(id))run(()=>loadMore(id));break;case 'compose':if(view==='community')composeQuestion();else if(view==='care')composeCare();else if(view==='lost')composeLost();else if(view==='adoption')composeAdoption();else if(view==='home'||view==='profile')compose();break;case 'question':composeQuestion();break;case 'community-filter':communityCategory=id;render();break;case 'care-filter':careFilter=id;render();break;case 'lost-add':composeLost();break;case 'adoption-add':composeAdoption();break;case 'adoption-edit':{const a=data.adoption.find(x=>x.id===id&&x.owner_id===me.id);if(a)composeAdoption(a);break}case 'adoption-toggle':{const a=data.adoption.find(x=>x.id===id&&x.owner_id===me.id);if(a)run(()=>save('adoption_listings',{adopted:!a.adopted},id));break}case 'adoption-delete':remove('adoption_listings',id);break;case 'care-add':composeCare();break;case 'wellness-open':navigate('wellness');break;case 'wellness-reminder-add':patiWellnessReminderDialog();break;case 'wellness-weight-add':patiWellnessWeightDialog();break;case 'wellness-pet':patiWellnessPetId=id;render();break;case 'wellness-reminder-done':void patiWellnessToggle(id);break;case 'wellness-reminder-delete':void patiWellnessDelete('patiyiz_pet_reminders',id);break;case 'wellness-weight-delete':void patiWellnessDelete('patiyiz_pet_weights',id);break;case 'profile-posts-tab':profilePostsTab=id;render();break;case 'profile-open-post':openPost(id);break;case 'profile-pet-details':{const pet=data.pets.find(x=>x.id===id);if(pet)modal(pet.name,'<p>'+esc(pet.species||'')+' · '+esc(pet.breed||'')+'</p><p>'+esc(pet.personality||'')+'</p>','profile-pet-details-form');break;}case 'profile-share':{const u=location.origin+location.pathname; if(navigator.share){navigator.share({title:'Patiyiz profilim',url:u}).catch(()=>{});}else if(navigator.clipboard){navigator.clipboard.writeText(u).then(()=>notify('Patiyiz bağlantısı kopyalandı.')).catch(()=>notify('Bağlantı kopyalanamadı.',true));}break;}case 'edit-profile':editProfile();break;case 'pet-add':editPet();break;case 'pet-edit':editPet(data.pets.find(p=>p.id===id));break;case 'my-profile':profileId='';lastDetailView='';navigate('profile');break;case 'view-user':followReturnList=view==='follows-list';if(!followReturnList&&view!=='profile')lastDetailView=view;profileId=id;navigate('profile');break;case 'profile-back':{const dest=lastDetailView&&allowed.includes(lastDetailView)?lastDetailView:'explore';lastDetailView='';profileId='';followReturnList=false;navigate(dest);break}case 'open-notification':openNotification(id);break;case 'post-back':selectedPostId='';navigate('home');break;case 'open-knowledge':navigate('knowledge');break;case 'education-filter':educationCategory=id;educationLesson='';render();break;case 'education-open':educationLesson=id;render();window.scrollTo(0,0);break;case 'education-back':educationLesson='';render();break;case 'education-next':educationLesson=id;window.scrollTo(0,0);render();break;case 'education-continue':educationLesson=id;window.scrollTo(0,0);render();break;case 'education-answer':{const l=patiyizLessons.find(x=>x.id===id);if(l){educationAnswer[id]=Number(target.dataset.choice);if(educationAnswer[id]===l.answer)educationMark(id);render()}break;}case 'kb-read':articleId=id;render();scrollTo(0,0);break;case 'knowledge-back':articleId='';render();break;case 'kb-filter':kbFilter=id;render();break;case 'kb-search':kbSearch=$('#kb-search')?.value||'';render();break;case 'explore-open-post':openPost(id);break;case 'pati-search-open':search='';exploreTab='users';explorePage();requestAnimationFrame(()=>document.getElementById('explore-search')?.focus());break;case 'pati-search-cancel':search='';exploreTab='media';explorePage();break;case 'pati-search-discover':exploreTab='media';search='';explorePage();break;case 'explore-tab':exploreTab=id;render();break;case 'explore-animal':exploreAnimal=id;render();break;case 'explore-sort':exploreSort=exploreSort==='latest'?'popular':exploreSort==='popular'?'recommended':'latest';render();break;case 'explore-search':search=$('#explore-search')?.value||'';render();break;case 'lost-search':search=$('#lost-search')?.value||'';render();break;case 'adoption-search':search=$('#adoption-search')?.value||'';render();break;case 'dm-new':{const people=data.profiles.filter(x=>x.id!==me.id&&!blocked.has(x.id)).sort((a,b)=>String(a.display_name||'').localeCompare(String(b.display_name||''),'tr')).slice(0,80);modal('Yeni sohbet',people.length?'<p class="pati-dm-new-hint">Mesaj göndermek istediğin kişiyi seç.</p><div class="pati-dm-new-list">'+people.map(p=>'<button type="button" class="pati-dm-new-person" data-action="chat" data-id="'+esc(p.id)+'">'+avatar(p,'s')+'<span><strong>'+esc(p.display_name||'Patiyiz üyesi')+'</strong><small>@'+esc(p.handle||'patiyiz')+'</small></span>'+ico('message')+'</button>').join('')+'</div>':'<p>Henüz konuşabileceğin bir kullanıcı görünmüyor. Keşfet bölümünden kullanıcıları bulabilirsin.</p>','dm-new-form');break}case 'chat':if(!id||id===me.id)return notify('Kendine mesaj gönderemezsin.',true);closeModal(true);personId=id;mobileChatOpen=true;navigate('messages');requestAnimationFrame(()=>document.querySelector('.pati-dm-layout.mobile-chat-open .chat-form input')?.scrollIntoView({block:'nearest'}));break;case 'open-unread-chat':{const source=unreadMessageSources().find(x=>x.id===id)||unreadMessageSources()[0];if(!source)break;closeModal();personId=source.id;mobileChatOpen=true;navigate('messages');break}case 'dm-tab':chatFilter=id;mobileChatOpen=false;render();break;case 'post-crop-next':case 'post-crop-prev':{const files=document.querySelector('#post-form input[name="photo"]')?.files;if(files?.length){postCropIndex=(postCropIndex+(act==='post-crop-next'?1:-1)+files.length)%files.length;drawPostCrop()}break}case 'post-ratio':{postCropRatio=id;postCropX=.5;postCropY=.5;document.querySelectorAll('.pati-ratio-options button').forEach(b=>b.classList.toggle('active',b.dataset.id===id));const f=document.querySelector('#post-form input[name="aspect"]');if(f)f.value=id;drawPostCrop();break}case 'carousel-prev':case 'carousel-next':{const root=target.closest('.pati-carousel'),track=root?.querySelector('.pati-carousel-track');if(track){const delta=track.clientWidth*(act==='carousel-next'?1:-1);track.scrollBy({left:delta,behavior:'smooth'})}break}case 'video-sound':{const v=target.parentElement?.querySelector('video');if(v){v.muted=!v.muted;target.innerHTML=ico(v.muted?'volume-x':'volume');target.setAttribute('aria-label',v.muted?'Sesi aç':'Sesi kapat');}break;}case 'dm-record':run(()=>startDmRecord());break;case 'dm-record-stop':if(dmRecorder?.state==='recording')dmRecorder.stop();break;case 'dm-record-cancel':dmCancel=true;if(dmRecorder?.state==='recording')dmRecorder.stop();break;case 'chat-back':mobileChatOpen=false;render();break;case 'dm-reply':{const m=data.messages.find(x=>x.id===id);const f=document.getElementById('message-form');if(m&&f){f.dataset.reply=id;const input=f.querySelector('input[name="body"]');if(input){input.placeholder='↳ '+cut(m.body||'Medya',50);input.focus()}}break}case 'dm-edit':{const m=data.messages.find(x=>x.id===id&&x.sender_id===me.id);if(!m||m.attachment_path)break;modal('Mesajı düzenle',textField('body','Mesaj',m.body,true,1000),'dm-edit-form');document.getElementById('dm-edit-form').dataset.message=id;break}case 'message-delete':{const m=data.messages.find(x=>x.id===id&&(x.sender_id===me.id||x.receiver_id===me.id));if(!m)break;closeModal();if(!confirm('Bu mesaj yalnızca senin sohbetinden silinsin mi?'))break;run(async()=>{const r=await sb.from('message_hidden').insert({user_id:me.id,message_id:m.id});if(r.error&&r.error.code!=='23505')throw r.error;data.messageHidden.push({user_id:me.id,message_id:m.id});render();},'Mesaj sohbetinden kaldırıldı.');break;}case 'comment':showComments(id);break;case 'comment-emoji':{const ta=document.querySelector('#comment-form textarea[name="body"]');if(ta){ta.value+=target.dataset.emoji||'';ta.focus()}break;}case 'comment-reply':{const f=$('#comment-form');if(f){f.dataset.parent=id;const who=profile(data.comments.find(x=>x.id===id)?.author_id).display_name;const hint=$('#comment-reply-hint');if(hint)hint.textContent=who+' kullanıcısına cevap veriyorsun';f.querySelector('textarea')?.focus()}break}case 'comment-reply-cancel':{const f=$('#comment-form');if(f)f.dataset.parent='';const hint=$('#comment-reply-hint');if(hint)hint.textContent='';break}case 'comment-like':run(async()=>{const form=$('#comment-form');const postId=form?.dataset.post||'',draft=form?.querySelector('textarea')?.value||'',parent=form?.dataset.parent||'';const liked=data.commentLikes.some(x=>x.comment_id===id&&x.user_id===me.id);let r=liked?await sb.from('comment_likes').delete().eq('comment_id',id).eq('user_id',me.id):await sb.from('comment_likes').insert({comment_id:id,user_id:me.id});if(r.error)throw r.error;await load();showComments(postId);const next=$('#comment-form');if(next){next.querySelector('textarea').value=draft;next.dataset.parent=parent;const hint=$('#comment-reply-hint');if(parent&&hint)hint.textContent=profile(data.comments.find(c=>c.id===parent)?.author_id).display_name+' kullanıcısına cevap veriyorsun';}});break;case 'comment-delete':{const c=data.comments.find(x=>x.id===id);if(!c||c.author_id!==me.id)break;if(!confirm('Yorum silinsin mi?'))break;run(async()=>{const post=$('#comment-form')?.dataset.post;const r=await sb.from('comments').delete().eq('id',id).eq('author_id',me.id);if(r.error)throw r.error;await load();showComments(post)},'Yorum silindi');break}case 'replies':questionReplies(id);break;case 'post-menu':{const post=data.posts.find(p=>p.id===id);if(!post)break;const own=post.author_id===me.id;modal('Gönderi seçenekleri','<div class="pati-post-menu-list">'+(own?'<button type="button" data-action="edit-post" data-id="'+esc(id)+'">'+ico('edit')+' Gönderiyi düzenle</button><button type="button" class="danger" data-action="delete-post" data-id="'+esc(id)+'">'+ico('trash')+' Gönderiyi sil</button>':'<button type="button" data-action="report" data-kind="post" data-id="'+esc(id)+'">'+ico('alert')+' Gönderiyi bildir</button>')+'</div>','post-actions-form');break}case 'edit-post':compose(data.posts.find(p=>p.id===id));break;case 'delete-post':remove('posts',id);break;case 'delete-question':remove('questions',id);break;case 'delete-lost':remove('lost_reports',id);break;case 'care-del':remove('care_tasks',id);break;case 'logout':run(async()=>{const r=await sb.auth.signOut();if(r.error)throw r.error;me=null;isAdmin=false;authMode='login';showAuth()},'Çıkış yapıldı');break;
case 'like':void togglePostLike(id);break;case 'share-post':openPatiShareModal(id);break;case 'pati-copy-post':{const link=location.origin+location.pathname+'#post-'+id;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>notify('Paylaşım bağlantısı kopyalandı.'),()=>notify('Bağlantı kopyalanamadı.',true));else notify(link);break}case 'pati-share-system':{const link=location.origin+location.pathname+'#post-'+id;if(navigator.share)navigator.share({title:'Patiyiz paylaşımı',url:link}).catch(()=>{});else if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>notify('Bağlantı kopyalandı.'));break}case 'send-post-dm':{const post=data.posts.find(x=>x.id===target.dataset.post);if(!post||id===me.id)break;run(async()=>{const r=await sb.from('messages').insert({sender_id:me.id,receiver_id:id,body:'📨 Paylaşım: '+location.origin+location.pathname+'#post-'+post.id});if(r.error)throw r.error;closeModal();},'Paylaşım mesajla gönderildi.');break;}case 'save':run(()=>doToggle('post_saves',{post_id:id,user_id:me.id},saved.has(id)));break;case 'follow':run(()=>doToggle('follows',{follower_id:me.id,followee_id:id},followed.has(id)));break;case 'vote':run(()=>doToggle('question_votes',{question_id:id,user_id:me.id},voted.has(id)));break;case 'kb-save':run(()=>doToggle('kb_bookmarks',{article_id:id,user_id:me.id},favorites.has(id)));break;
case 'toggle-found':{let a=data.lost.find(x=>x.id===id);if(a)run(()=>save('lost_reports',{found:!a.found},id));break}
case 'care-done':{let x=data.care.find(t=>t.id===id);if(x)run(()=>save('care_tasks',{done:!x.done},id));break}
case 'push-enable':enablePhonePush();break;case 'notifications-read':run(async()=>{let r=await sb.from('notifications').update({read:true}).eq('owner_id',me.id).eq('read',false);if(r.error)throw r.error;await refresh()},'Tüm bildirimler okundu olarak işaretlendi.');break;
case 'notification-delete':if(confirm('Bu bildirim silinsin mi?'))run(async()=>{const r=await sb.from('notifications').delete().eq('id',id).eq('owner_id',me.id);if(r.error)throw r.error;await refresh()},'Bildirim silindi.');break;
case 'notifications-delete-all':if(confirm('Tüm bildirimlerin kalıcı olarak silinsin mi? Bu işlem geri alınamaz.'))run(async()=>{const r=await sb.from('notifications').delete().eq('owner_id',me.id);if(r.error)throw r.error;await refresh()},'Tüm bildirimlerin silindi.');break;
case 'blocked-list':navigate('blocked');break;case 'followers-list':followReturnList=false;followListId=id;followListMode=target.dataset.mode==='following'?'following':'followers';navigate('follows-list');break;case 'followers-back':profileId=followListId;followReturnList=false;navigate('profile');break;case 'return-follow-list':followReturnList=false;navigate('follows-list');break;case 'delete-account-open':modal('Hesabımı kalıcı olarak sil',`<div class="pati-delete-warning"><strong>⚠️ Bu işlem geri alınamaz.</strong><p>Profilin, gönderilerin, hikâyelerin, mesajların, sesli yorumların ve yüklediğin dosyalar silinir. Başka kullanıcıların seninle yazışmalarındaki mesajlar da etkilenebilir. Yönetici hesapları buradan silinemez.</p></div><div class="pati-field"><label>Mevcut şifren</label><input type="password" name="delete_password" autocomplete="current-password" required></div><div class="pati-field"><label>Onaylamak için HESABIMI SIL yaz</label><input name="delete_confirm" autocomplete="off" required placeholder="HESABIMI SIL"></div>`,'delete-account-form');break;case 'settings-password':modal('Şifremi değiştir',formField('new_password','Yeni şifre (en az 8 karakter)','password','',true),'settings-password-form');break;case 'push-disable':run(disablePhonePush,'Bu cihazda telefon bildirimleri kapatıldı.');break;case 'block':{const isBlocked=blocked.has(id);const question=isBlocked?'Bu kişinin engelini kaldırmak istiyor musun?':'Bu kullanıcıyı engellemek istiyor musun?';if(confirm(question))run(async()=>{await doToggle('user_blocks',{blocker_id:me.id,blocked_id:id},isBlocked);if($('#blocked-form'))closeModal();notify(isBlocked?'Engel kaldırıldı.':'Kullanıcı engellendi.');},null);break}
case 'report':closeStory();modal('İçeriği bildir',textField('reason','Şikâyet nedeni (en az 5 karakter)','',true,500),'report-form');$('#report-form').dataset.kind=target.dataset.kind;$('#report-form').dataset.record=id;break;
case 'tools':openMobileFeaturesMenu();break;default:break}}
let messagePressTimer=null,messagePressOrigin=null,messageLongPressed=false;
function openMessageOptions(el){if(!el||view!=='messages'||!me)return;const id=el.dataset.messageId;const msg=data.messages.find(x=>x.id===id&&(x.sender_id===me.id||x.receiver_id===me.id));if(!msg)return;modal('Mesaj seçenekleri',`<p class="small-note">Bu mesajı yalnızca kendi sohbetinden kaldırabilirsin.</p><div class="pati-actionbar"><button type="button" class="outline-btn pati-msg-delete" data-action="message-delete" data-id="${esc(id)}">🗑️ Benden sil</button></div>`,'message-options-form');$('#message-options-form .modal-footer')?.remove();}
document.addEventListener('contextmenu',e=>{const bubble=e.target.closest('.bubble-chat[data-message-id]');if(bubble){e.preventDefault();openMessageOptions(bubble)}});
document.addEventListener('pointerdown',e=>{const bubble=e.target.closest('.bubble-chat[data-message-id]');if(!bubble||e.pointerType==='mouse')return;clearTimeout(messagePressTimer);messagePressOrigin={x:e.clientX,y:e.clientY,id:bubble.dataset.messageId};messagePressTimer=setTimeout(()=>{messageLongPressed=true;openMessageOptions(bubble);messagePressTimer=null},520)});
document.addEventListener('pointermove',e=>{if(messagePressOrigin&&(Math.abs(e.clientX-messagePressOrigin.x)>12||Math.abs(e.clientY-messagePressOrigin.y)>12)){clearTimeout(messagePressTimer);messagePressTimer=null;messagePressOrigin=null}});
for(const ev of ['pointerup','pointercancel','scroll'])document.addEventListener(ev,()=>{clearTimeout(messagePressTimer);messagePressTimer=null;messagePressOrigin=null},true);
document.addEventListener('click',e=>{if(messageLongPressed){e.preventDefault();e.stopImmediatePropagation();messageLongPressed=false}},true);
document.addEventListener('input',e=>{if(e.target?.name==='crop_zoom'){postCropZoom=+e.target.value;drawPostCrop()}});
let cropDrag=null;document.addEventListener('pointerdown',e=>{if(e.target.id==='pati-crop-canvas'){cropDrag={x:e.clientX,y:e.clientY,startX:postCropX,startY:postCropY};e.target.setPointerCapture(e.pointerId)}});document.addEventListener('pointermove',e=>{if(!cropDrag||e.target.id!=='pati-crop-canvas')return;postCropX=Math.max(0,Math.min(1,cropDrag.startX-(e.clientX-cropDrag.x)/280));postCropY=Math.max(0,Math.min(1,cropDrag.startY-(e.clientY-cropDrag.y)/280));drawPostCrop()});document.addEventListener('pointerup',()=>{cropDrag=null});
document.addEventListener('change',e=>{
 const input=e.target;
 if(input?.name==='dm_camera'||input?.name==='dm_gallery'){
  const files=[...(input.files||[])],isGallery=input.name==='dm_gallery';input.value='';
  if(isGallery&&files.length&&window.PatiyizGalleryPicker){
   window.PatiyizGalleryPicker.open(files,{multiple:false,max:1,
    onReopen:()=>input.isConnected&&input.click(),
    onConfirm:async selected=>{if(!selected[0])return false;await sendDmImage(selected[0]);return true}});
  }else if(files[0])run(()=>sendDmImage(files[0]));
  return;
 }
 const post=input?.closest?.('#post-form');
 if(post&&(input.name==='photo'||input.name==='video')){
  if(input.name==='photo')post._patiEditedPhotos=null;
  const cameraCapture=input.hasAttribute('capture');
  if(input.name==='photo'){input.removeAttribute('capture');input.multiple=true}
  if(input.files?.length){const other=post.querySelector('input[name="'+(input.name==='photo'?'video':'photo')+'"]');if(other)other.value=''}
  postCropIndex=0;postCropX=.5;postCropY=.5;postCropZoom=1;
  const controls=post.querySelector('.pati-media-controls');if(controls)controls.hidden=!(post.querySelector('input[name="photo"]')?.files?.length);
  const crop=post.querySelector('.pati-crop-preview');if(crop)crop.hidden=!!(input.name==='video'&&input.files?.length);
  updatePostMediaPreview();
  if(post.dataset.mode==='reels'&&input.name==='video'&&window.PatiyizReelsEditor){window.PatiyizReelsEditor.setFiles(input.files).catch(err=>notify(String(err.message||err),true))}
  if(post.querySelector('input[name="photo"]')?.files?.length)drawPostCrop();
  if(input.name==='photo'&&!cameraCapture&&input.files?.length&&window.PatiyizGalleryPicker){
   const nativeFiles=[...input.files];
   window.PatiyizGalleryPicker.open(nativeFiles,{multiple:true,max:10,
    onReopen:()=>input.isConnected&&input.click(),
    onConfirm:files=>{
     if(!files.length)return false;
     if(files.length!==nativeFiles.length||files.some((f,i)=>f!==nativeFiles[i])){
      if(typeof DataTransfer!=='function')throw new Error('Telefonun seçimi değiştirmeyi desteklemiyor. Galeriden istediğin fotoğrafları yeniden seç.');
      const transfer=new DataTransfer();files.forEach(file=>transfer.items.add(file));input.files=transfer.files;
     }
     postCropIndex=0;updatePostMediaPreview();drawPostCrop();
     return openPostPhotoStudio(post,files);
    }});
  }else if(input.name==='photo'&&input.files?.length){
   void openPostPhotoStudio(post,[...input.files]);
  }
  return;
 }
 if(input?.form?.id==='story-form'&&['story_camera','story_gallery'].includes(input.name)){
  const file=input.files?.[0];if(!file)return;
  input.form.dataset.storyInput=input.name;input.form._patiEditedStory=null;
  const other=input.form.querySelector('input[name="'+(input.name==='story_camera'?'story_gallery':'story_camera')+'"]');if(other)other.value='';
  updateStoryMediaPreview(file);void openStoryPhotoStudio(input.form,file);return;
 }
 if(input?.type==='file'&&input.files?.[0]){
  const file=input.files[0],preview=input.closest('form')?.querySelector('.pati-upload-preview');
  if(preview){const url=URL.createObjectURL(file);preview.hidden=false;preview.innerHTML='<img alt="Seçilen fotoğrafın önizlemesi"><strong>✓ '+esc(file.name)+'</strong>';const img=preview.querySelector('img');img.src=url;img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>{img.remove();URL.revokeObjectURL(url)}}
 }
});

let lastPhotoTap={id:'',time:0},tapTimer=0;
function heartOnPhoto(el){const id=el.dataset.postId;if(!id)return;const heart=el.querySelector('.pati-heart-burst');if(heart){heart.classList.remove('pop');void heart.offsetWidth;heart.classList.add('pop')}if(!liked.has(id))void togglePostLike(id)}
document.addEventListener('click',e=>{const el=e.target.closest('.pati-doubletap-photo');if(!el)return;const now=Date.now();if(lastPhotoTap.id===el.dataset.postId&&now-lastPhotoTap.time<380){e.preventDefault();lastPhotoTap.time=0;heartOnPhoto(el)}else lastPhotoTap={id:el.dataset.postId,time:now}},true);
let storyTouchY=null,storyTouchX=null;
document.addEventListener('touchstart',e=>{if(!e.target.closest('#story-overlay'))return;storyTouchY=e.touches[0]?.clientY;storyTouchX=e.touches[0]?.clientX},{passive:true});
document.addEventListener('touchend',e=>{if(storyTouchY===null)return;const target=e.target;const point=e.changedTouches[0];const diff=point?.clientY-storyTouchY,side=point?.clientX-storyTouchX;storyTouchY=null;storyTouchX=null;if(!target.closest('#story-overlay')||target.closest('.story-viewers-sheet'))return;if(diff>65&&Math.abs(diff)>Math.abs(side)*1.25){if(storyItems[storyIndex]?.author_id===me.id)showStoryViewers();else closeStory();return}
 if(Math.abs(side)>70&&Math.abs(side)>Math.abs(diff)*1.5&&!target.closest('button,input,textarea,[contenteditable],.story-viewers-sheet,.story-actions'))stepStory(side<0?1:-1)},{passive:true});
document.addEventListener('click',processClick);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.PatiyizGalleryPicker?.active){window.PatiyizGalleryPicker.close();return}else if(e.key==='Escape'&&!$('#pati-create-sheet')?.hidden){closePatiCreate();return}else if(e.key==='Escape'&&document.getElementById('story-overlay'))closeStory();else if(e.key==='Escape'&&$('#modal-root .modal'))closeModal()});
if(window.visualViewport){
 const updateViewport=()=>{
  const focused=document.activeElement?.matches?.('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),textarea,[contenteditable="true"]')===true;
  const keyboardActive=focused&&window.innerWidth<=740;
  const gap=keyboardActive?Math.max(0,window.innerHeight-window.visualViewport.height-window.visualViewport.offsetTop):0;
  document.documentElement.style.setProperty('--pati-keyboard-inset',gap>100?gap+'px':'0px');
  document.documentElement.classList.toggle('pati-keyboard-open',gap>100);
 };
 window.visualViewport.addEventListener('resize',updateViewport);
 window.visualViewport.addEventListener('scroll',updateViewport);
 document.addEventListener('focusin',updateViewport);
 document.addEventListener('focusout',()=>setTimeout(updateViewport,0));
 updateViewport();
}
document.addEventListener('focusin',e=>{if(e.target.matches('.chat-form input, .modal input, .modal textarea'))requestAnimationFrame(()=>e.target.scrollIntoView({block:'nearest',behavior:'smooth'}))});
document.addEventListener('input',e=>{
 if(e.target?.id!=='pati-academy-search')return;
 educationSearch=e.target.value;
 const pos=e.target.selectionStart??educationSearch.length,oldScroll=window.scrollY;
 educationPage();
 const next=document.getElementById('pati-academy-search');
 if(next){next.focus({preventScroll:true});try{next.setSelectionRange(pos,pos)}catch(_){}}
 window.scrollTo(0,oldScroll);
});
document.addEventListener('input',e=>{if(e.target?.id!=='explore-search')return;search=e.target.value;const focused=e.target;const pos=focused.selectionStart;const oldScroll=window.scrollY;explorePage();const next=$('#explore-search');if(next){next.focus();try{next.setSelectionRange(pos,pos)}catch(_){}}window.scrollTo(0,oldScroll)});
document.addEventListener('submit',async e=>{let form=e.target,id=form.id;if(id==='pati-explore-form'){e.preventDefault();search=$('#explore-search')?.value.trim()||'';render();return}if(id==='settings-password-form'){e.preventDefault();const password=String(new FormData(form).get('new_password')||'');if(password.length<8)return notify('Yeni şifre en az 8 karakter olmalı.',true);await run(async()=>{const r=await sb.auth.updateUser({password});if(r.error)throw r.error;closeModal();},'Şifren güncellendi.');return}if(id==='auth-form')return;if(id==='delete-account-form'){e.preventDefault();if(busy)return;const formData=new FormData(form);const password=String(formData.get('delete_password')||'');const confirmation=String(formData.get('delete_confirm')||'').trim();if(confirmation!=='HESABIMI SIL')return notify('Onay için HESABIMI SIL yazmalısın.',true);if(!password)return notify('Mevcut şifren gerekli.',true);if(!confirm('Hesabın ve tüm kişisel verilerin kalıcı olarak silinsin mi?'))return;await run(async()=>{const session=await sb.auth.getSession();if(!session.data.session)throw Error('Lütfen yeniden giriş yap.');const response=await fetch(cfg.supabaseUrl+'/functions/v1/patiyiz-delete-account',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.data.session.access_token,'apikey':cfg.supabasePublishableKey},body:JSON.stringify({password,confirmation})});let result;try{result=await response.json()}catch{}if(!response.ok)throw Error(result?.message||'Hesap silinemedi.');closeModal();await sb.auth.signOut();me=null;isAdmin=false;showAuth('Hesabın silindi.');},null);return}if(!['wellness-reminder-form','wellness-weight-form','post-form','question-form','lost-form','care-form','profile-form','pet-form','reply-form','comment-form','report-form','message-form','dm-edit-form','verification-request-form','adoption-form','story-form','story-answer-form','highlight-album-form','highlight-album-add-form'].includes(id))return;e.preventDefault();if(busy)return;const primary=form.querySelector('.modal-footer button[type="submit"]');if(primary){primary.disabled=true;primary.dataset.originalText=primary.textContent;primary.textContent='⏳ Paylaşım hazırlanıyor…'}const status=form.querySelector('.pati-upload-status');if(status){status.hidden=false;status.querySelector('span').textContent='Paylaşım hazırlanıyor…'}const f=new FormData(form),str=k=>String(f.get(k)||'').trim();await run(async()=>{switch(id){case 'story-answer-form':{const out=await sb.from('patiyiz_story_responses').insert({story_id:form.dataset.story,user_id:me.id,kind:'question',response:str('response')});if(out.error)throw out.error;closeModal(true);notify('Yanıtın gönderildi.');break}case 'story-form':{const result=await createStoryPublication(form,f,str);data.stories=[result,...data.stories.filter(x=>x.id!==result.id)];closeModal(true);render();notify(result.is_highlight?'Hikâyen profilinde kalıcı olarak görünecek.':'Hikâyen 24 saat boyunca görüntülenecek.');break}case 'verification-request-form':{if(current().is_verified)throw Error('Hesabın zaten doğrulanmış.');const r=await sb.from('verification_requests').insert({user_id:me.id,note:str('note')});if(r.error){if(r.error.code==='23505')throw Error('Zaten bekleyen bir mavi tik talebin var.');throw r.error}closeModal();notify('Mavi tik talebin yöneticiye gönderildi.');break}case 'highlight-album-form':{const title=str('title').trim(),story_id=str('story_id');if(!title||title.length>32)throw Error('Albüm adı 1–32 karakter olmalı.');const story=data.stories.find(x=>x.id===story_id&&x.author_id===me.id);if(!story)throw Error('Hikâye bulunamadı.');if(!story.is_highlight){const mark=await sb.from('patiyiz_stories').update({is_highlight:true}).eq('id',story_id).eq('author_id',me.id);if(mark.error)throw mark.error;story.is_highlight=true}const out=await sb.from('patiyiz_highlight_albums').insert({owner_id:me.id,title}).select('id').single();if(out.error)throw out.error;const item=await sb.from('patiyiz_highlight_items').insert({album_id:out.data.id,story_id});if(item.error){await sb.from('patiyiz_highlight_albums').delete().eq('id',out.data.id);throw item.error}closeModal(true);await refresh();notify('Yeni öne çıkanlar albümü oluşturuldu.');break}
case 'highlight-album-add-form':{const story_id=str('story_id'),album_id=form.dataset.album;if(!story_id||!album_id)throw Error('Hikâye ve albüm seç.');const out=await sb.from('patiyiz_highlight_items').upsert({album_id,story_id},{onConflict:'album_id,story_id'});if(out.error)throw out.error;closeModal(true);await refresh();notify('Hikâye albüme eklendi.');break}
case 'post-form':{if(form.dataset.edit){await save('posts',{body:str('body').trim(),species:str('species')},form.dataset.edit)}else{const result=await createPostPublication(form,f,str);profileCountCache.delete(me.id);closeModal(true);try{await refresh()}catch(error){console.warn('Paylaşım kaydedildi, akış yenilemesi başarısız:',error.message)}notify('Paylaşım yayınlandı.');try{localStorage.removeItem(patiDraftKey())}catch{}}break}case 'question-form':{const title=str('title'),body=str('body');if(title.length<5||title.length>150)throw Error('Soru başlığı 5–150 karakter arasında olmalı.');if(body.length<5||body.length>2000)throw Error('Soru açıklaması 5–2000 karakter arasında olmalı.');const result=await sb.from('questions').insert({author_id:me.id,title,category:str('category'),body}).select('id').single();if(result.error)throw result.error;closeModal(true);view='community';await refresh();if(!data.questions.some(q=>q.id===result.data.id))notify('Soru kaydedildi fakat listede yüklenemedi. Lütfen sayfayı yenile.',true);else notify('Sorun Toplulukta yayınlandı.');break}
case 'adoption-form':{if(str('name').length<2||str('description').length<15||str('city').length<2)throw Error('Hayvan adı, şehir ve en az 15 karakterlik açıklama gerekli.');const rec={name:str('name'),species:str('species'),gender:str('gender'),age:str('age'),city:str('city'),district:str('district'),description:str('description')};const img=await upload(f.get('photo'));if(img)rec.photo_url=img;if(!form.dataset.edit)rec.owner_id=me.id;await save('adoption_listings',rec,form.dataset.edit);break}case 'lost-form':{if(str('description').length<10)throw Error('Açıklama en az 10 karakter olmalı.');await save('lost_reports',{owner_id:me.id,name:str('name'),species:str('species'),city:str('city'),district:str('district'),last_seen:str('last_seen'),description:str('description'),photo_url:await upload(f.get('photo'))});break}
case 'wellness-reminder-form':await patiWellnessSaveReminder(form,str);break;case 'wellness-weight-form':await patiWellnessSaveWeight(form,str);break;case 'care-form':await save('care_tasks',{owner_id:me.id,title:str('title'),category:str('category'),due_date:str('due_date'),pet_id:str('pet_id')||null});break;
case 'profile-form':{let handle=str('handle').toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(handle))throw Error('Kullanıcı adı 3–24 karakter, küçük harf, rakam veya alt çizgi olmalı.');let o={display_name:str('display_name'),handle,city:str('city'),bio:str('bio')},image=await upload(f.get('photo'));if(image)o.avatar_url=image;await save('profiles',o,me.id);break}
case 'pet-form':{let o={name:str('name'),species:str('species'),gender:str('gender')||'Belirtilmedi',age:str('age'),breed:str('breed'),personality:str('personality'),notes:str('notes')},image=await upload(f.get('photo'));if(image)o.photo_url=image;if(!form.dataset.edit)o.owner_id=me.id;await save('pets',o,form.dataset.edit);break}
case 'reply-form':await save('replies',{author_id:me.id,question_id:form.dataset.question,body:str('body')});break;
case 'comment-form':{let record={author_id:me.id,post_id:form.dataset.post,body:str('body')};if(form.dataset.parent)record.parent_id=form.dataset.parent;await save('comments',record);break}
case 'report-form':{if(str('reason').length<5)throw Error('Neden en az 5 karakter olmalı.');await save('content_reports',{reporter_id:me.id,content_type:form.dataset.kind,content_id:form.dataset.record,reason:str('reason')});break}
case 'dm-edit-form':{const body=str('body');if(!body)throw Error('Mesaj boş olamaz');const out=await sb.from('messages').update({body,edited_at:new Date().toISOString()}).eq('id',form.dataset.message).eq('sender_id',me.id);if(out.error)throw out.error;closeModal(true);await refreshKeys([['messages','messages']]);break}case 'message-form':{if(!personId||personId===me.id)return;if(!str('body').trim())return;if(blocked.has(personId))throw Error('Engellenmiş kullanıcıya mesaj gönderilemez.');let r=await sb.from('messages').insert({sender_id:me.id,receiver_id:personId,body:str('body'),reply_to:form.dataset.reply||null});if(r.error)throw r.error;form.reset();delete form.dataset.reply;await refreshKeys([['messages','messages']]);break}
}});if(form.isConnected){if(primary){primary.disabled=false;primary.textContent=primary.dataset.originalText||'Kaydet'}if(status)status.hidden=true}});
window.addEventListener('offline',()=>{notify('İnternet bağlantısı kesildi. Paylaşım ve mesaj işlemleri bağlantı gelince tekrar denenebilir.',true)});
window.addEventListener('online',()=>{notify('İnternet bağlantısı yeniden kuruldu.');if(me&&sb){refresh().catch(e=>console.warn('Yenileme başarısız',e));refreshOnReturn()}});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshOnReturn()});window.addEventListener('focus',refreshOnReturn);
function resetSessionState(){
 patiyizLoadToken++;patiyizLoadedTables.clear();patiyizDeferredLoading=null;patiWellness={reminders:[],weights:[],loaded:false,loading:false,notified:new Set()};patiLeaderboard=[];patiInviteState={code:'',invited_count:0,already_used:false,coins_each:50,loading:false};patiCoinState={balance:0,earned:0,claims:[],items:[],orders:[],history:[],loading:false};document.getElementById('paticoin-celebration')?.remove();
 data=Object.fromEntries(Object.keys(data).map(key=>[key,[]]));
 for(const group of [favorites,followed,liked,saved,voted,blocked])group.clear();
 blockedProfiles=[];patiDmSignedCache.clear();profileCountCache.clear();profileCountInFlight.clear();
 pageLimits={posts:100,messages:150,notifications:150};pageMore={posts:true,messages:true,notifications:true};
 if(typeof educationCloudDone!=='undefined')educationCloudDone.clear();if(typeof educationCloudUser!=='undefined')educationCloudUser='';if(typeof pendingPostLikes!=='undefined')pendingPostLikes.clear();if(typeof likesChangeEpoch==='number')likesChangeEpoch++;personId='';profileId='';selectedPostId='';followListId='';search='';view='home';chatFilter='primary';mobileChatOpen=false;isAdmin=false;
 storyItems=[];storyLikes=[];storyIndex=0;clearTimeout(storyTimer);storyTimer=null;lastPhotoTap={id:'',time:0};
 document.getElementById('story-overlay')?.remove();document.body.classList.remove('story-fullscreen-open');
 window.PatiyizGalleryPicker?.close();window.PatiyizPhotoStudio?.close?.();window.PatiyizReelsEditor?.dispose();clearPatiMediaUrls();
 document.getElementById('modal-root')?.replaceChildren();
 dmCancel=true;if(dmRecorder?.state==='recording')try{dmRecorder.stop()}catch(e){console.warn('Ses kaydı durdurulamadı',e)}
 dmStream?.getTracks().forEach(track=>track.stop());dmStream=null;dmRecipient=null;dmParts=[];dmMediaSending=false;
}
async function boot(){if(!ready){showSetup();return}sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);try{let {data:result,error}=await sb.auth.getSession();if(error)throw error;me=result.session?.user;if(me){showApp()}else{showAuth()}sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){stopLive();resetSessionState();me=null;authMode='login';showAuth()}else if(event==='PASSWORD_RECOVERY'){modal('Yeni şifre belirle',formField('password','Yeni şifre','password','',true),'reset-password-form');}else if(event==='SIGNED_IN'&&session?.user&&(!me||me.id!==session.user.id)){stopLive();resetSessionState();me=session.user;const signedUser=me.id;setTimeout(async()=>{if(me?.id!==signedUser)return;if(me?.id===signedUser)showApp()},0)}})}catch(e){starter();showAuth('Bağlantı kurulamadı. Supabase ayarlarını kontrol et.');notify(friendly(e),true)}}
document.addEventListener('submit',async e=>{if(e.target.id!=='reset-password-form')return;e.preventDefault();let password=new FormData(e.target).get('password');await run(async()=>{let r=await sb.auth.updateUser({password});if(r.error)throw r.error;closeModal()},'Şifren güncellendi')});
boot();
})();
