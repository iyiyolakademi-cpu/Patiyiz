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
// One unique authenticated viewer per post. Counts never expose who watched.
const patiPostViewCounts=new Map(),patiPostViewPending=new Set(),patiPostSeen=new Set();
let patiPostViewObserver=null;
const patiyizCurrentTheme=()=>{
 try{return localStorage.getItem('patiyiz_theme')==='dark'?'dark':'light'}catch{return 'light'}
};
function patiApplyTheme(mode){
 const value=mode==='dark'?'dark':'light';
 document.documentElement.dataset.patiTheme=value;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',value==='dark'?'#101114':'#f7f7f8');
 try{localStorage.setItem('patiyiz_theme',value)}catch(e){console.warn('Tema tercihi saklanamadı',e)}
 if(view==='settings')render();
}
async function patiLoadProfileViewCounts(ids,owner){
 if(!ids.length||!me||owner!==me.id)return;
 const need=ids.filter(id=>!patiPostViewCounts.has(id)&&!patiPostViewPending.has(id)).slice(0,120);
 if(!need.length)return;
 need.forEach(id=>patiPostViewPending.add(id));
 try{
  const result=await sb.from('patiyiz_post_view_totals').select('post_id,view_count').in('post_id',need);
  if(result.error)throw result.error;
  if(me?.id!==owner)return;
  const counts=new Map((result.data||[]).map(x=>[x.post_id,Number(x.view_count)||0]));
  need.forEach(id=>patiPostViewCounts.set(id,counts.get(id)||0));
  for(const el of document.querySelectorAll('[data-pati-view-count]')){
   const id=el.dataset.patiViewCount;
   if(patiPostViewCounts.has(id))el.textContent=patiPostViewCounts.get(id).toLocaleString('tr-TR');
  }
 }catch(e){console.warn('Gönderi görüntülenmeleri yüklenemedi:',e.message)}
 finally{need.forEach(id=>patiPostViewPending.delete(id))}
}
async function patiRecordPostView(id){
 if(!me||!id||patiPostSeen.has(id))return;
 const post=data.posts.find(x=>x.id===id);
 if(!post||post.author_id===me.id)return;
 patiPostSeen.add(id);
 try{const r=await sb.rpc('patiyiz_record_post_view',{p_post_id:id});if(r.error)throw r.error}
 catch(e){patiPostSeen.delete(id);console.warn('Görüntülenme kaydedilemedi:',e.message)}
}
function patiWatchPostViews(){
 if(patiPostViewObserver){patiPostViewObserver.disconnect();patiPostViewObserver=null;}
 if(!me||!('IntersectionObserver' in window))return;
 const cards=[...document.querySelectorAll('#main-content article[data-post-id],#main-content article[data-post]')];
 if(!cards.length)return;
 const timers=new WeakMap();
 patiPostViewObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
   const node=entry.target,id=node.dataset.postId||node.dataset.post;
   if(entry.isIntersecting&&entry.intersectionRatio>=.55&&!document.hidden){
    if(!timers.has(node)&&!patiPostSeen.has(id)){
     const timer=setTimeout(()=>{timers.delete(node);if(node.isConnected&&!document.hidden)void patiRecordPostView(id)},1100);
     timers.set(node,timer);
    }
   }else if(timers.has(node)){clearTimeout(timers.get(node));timers.delete(node)}
  }
 },{threshold:[0,.25,.55,.9]});
 cards.forEach(card=>patiPostViewObserver.observe(card));
}

const allowed=['home','explore','pets','reels','rewards','shop','saved-posts','community','knowledge','education','lost','adoption','care','wellness','healthfile','my-pet','messages','notifications','profile','blocked','settings','follows-list'];
const nav=[['home','Ana sayfa','home'],['explore','Keşfet','compass'],['pets','Patiler','heart'],['reels','Reels','up'],['community','Topluluk','users'],['knowledge','Bilgi Merkezi','library'],['education','Eğitim','library'],['lost','Kayıp İlanları','location'],['adoption','Sahiplendirme','heart'],['my-pet','Hayvanım','heart'],['messages','Mesajlar','message'],['notifications','Bildirimler','bell'],['profile','Profilim','user'],['settings','Ayarlar ve Gizlilik','settings']];
const cfg=window.PATIYIZ_CONFIG||{};
const ready=String(cfg.supabaseUrl||'').startsWith('https://')&&!String(cfg.supabaseUrl).includes('BURAYA_')&&!!cfg.supabasePublishableKey&&!String(cfg.supabasePublishableKey).includes('BURAYA_')&&!!window.supabase?.createClient;
let liveChannel=null,liveReloadTimer=null,liveReconnectTimer=null,liveUserId=null,liveInitialized=false,pushPublicKey='',lastForegroundSync=0;
let communityCategory='Tümü',careFilter='all',followReturnList=false,blockedProfiles=[];let lastDetailView='',mobileKeyboardOpen=false;let mobileChatOpen=false,patiDmReturnView='home',chatFilter='primary',profilePostsTab='media';let followListId='',followListMode='followers',phonePushActive=null;
let patiFollowPageState={key:'',rows:[],next:0,hasMore:true,loading:false,error:'',viewerFollowing:new Set()};
const PATI_FOLLOW_PAGE_SIZE=40;let patiExploreMedia={owner:'',rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''},patiExploreUsers={owner:'',query:'',rows:[],ready:false,loading:false,error:''},patiExploreSearchTimer=null;
const PATI_EXPLORE_MEDIA_PAGE=45;
let patiExploreSort='popular';const patiExploreMetrics=new Map();
let patiExploreReturnTo=false;
let patiDetailState=null; // Continuously scrollable selected media/text from profile or Explore.

let sb,me,view='home',articleId='',personId='',profileId='',selectedPostId='',exploreTab='media',exploreAnimal='Tümü',exploreSort='latest',kbFilter='Tümü',kbSearch='',search='',authMode='login',busy=false;
patiApplyTheme(patiyizCurrentTheme());
let postCropX=.5,postCropY=.5,postCropRatio='4:5',postCropZoom=1,postCropObjectUrl='',dmMediaSending=false,postCropIndex=0;
let isAdmin=false;let pageLimits={posts:40,messages:150,notifications:150};let pageMore={posts:true,messages:true,notifications:true};let data={profiles:[],pets:[],posts:[],likes:[],saves:[],comments:[],commentLikes:[],follows:[],questions:[],replies:[],votes:[],lost:[],care:[],messages:[],notifications:[],bookmarks:[],blocks:[],adoption:[],messageHidden:[],stories:[],storyResponses:[],reposts:[],pins:[],highlightAlbums:[],highlightItems:[]};
let favorites=new Set(), followed=new Set(),liked=new Set(),saved=new Set(),voted=new Set(),blocked=new Set();
let patiyizLoadedTables=new Set(),patiyizDeferredLoading=null,patiyizLoadToken=0;
let patiHomeFeedIds=null,patiHomeFeedCursor=null,patiHomeLoadError='';
const patiHomeCountCache=new Map(),patiHomeCountsLoading=new Set();
const patiPostCommentPages=new Map();
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
function showApp(){starter();if(me)window.setTimeout(()=>patiInviteLoad(),1700);if(me){window.setTimeout(()=>patiPublicActivityInit(),750);window.setTimeout(()=>patiWellnessFetch(true),1300)}if(me)window.setTimeout(()=>patiCoinSync(true),1600);if(me)window.setTimeout(()=>educationCloudLoad(),1200);authRoot.classList.add('hidden');appRoot.classList.remove('hidden');navigate(view);startLive();routePendingNotification();if(typeof routePendingLost==='function')void routePendingLost();if(typeof routePendingAdoption==='function')void routePendingAdoption();checkAdmin();
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

let patiDmTypingChannel=null,patiDmTypingTopic='',patiDmTypingJoined=false,patiDmTypingLast=0,patiDmTypingIdleTimer=null,patiDmRemoteTimer=null,patiDmRemoteUntil=0;
let patiDmLocalSeenOwner='',patiDmLocalSeenCache=new Set();
function patiDmReadReceiptsEnabled(){return !me?.id||profile(me.id).read_receipts_enabled!==false}
function patiDmSeenIds(){
 if(!me?.id)return new Set();
 if(patiDmLocalSeenOwner!==me.id){
  patiDmLocalSeenOwner=me.id;
  try{const values=JSON.parse(localStorage.getItem('patiyiz_dm_seen_private_'+me.id)||'[]');patiDmLocalSeenCache=new Set(Array.isArray(values)?values.slice(-800):[])}
  catch(_){patiDmLocalSeenCache=new Set()}
 }
 return patiDmLocalSeenCache;
}
function patiDmStoreLocalSeen(ids){
 const seen=patiDmSeenIds();ids.forEach(id=>seen.add(id));
 while(seen.size>800)seen.delete(seen.values().next().value);
 try{localStorage.setItem('patiyiz_dm_seen_private_'+me.id,JSON.stringify([...seen]))}catch(_){}
}
function patiDmTypingIndicator(){
 const el=document.querySelector('.pati-dm-typing-indicator');if(!el)return;
 const active=view==='messages'&&patiDmTypingJoined&&patiDmRemoteUntil>Date.now();
 el.hidden=!active;el.style.display=active?'inline-flex':'none';
}
function patiDmSendTyping(typing){
 if(!patiDmTypingJoined||!patiDmTypingChannel||!me?.id||view!=='messages')return;
 const now=Date.now();if(typing&&now-patiDmTypingLast<1250)return;
 patiDmTypingLast=typing?now:0;
 patiDmTypingChannel.send({type:'broadcast',event:'typing',payload:{actor:me.id,typing:!!typing}}).catch(()=>{});
}
function patiDmTypingInput(value){
 if(patiDmTypingIdleTimer)clearTimeout(patiDmTypingIdleTimer);
 patiDmTypingIdleTimer=null;
 const active=!!String(value||'').trim();patiDmSendTyping(active);
 if(active)patiDmTypingIdleTimer=setTimeout(()=>{patiDmTypingIdleTimer=null;patiDmSendTyping(false)},3500);
}
function patiDmDisconnectTyping(){
 if(patiDmTypingIdleTimer)clearTimeout(patiDmTypingIdleTimer);
 if(patiDmRemoteTimer)clearTimeout(patiDmRemoteTimer);
 patiDmTypingIdleTimer=null;patiDmRemoteTimer=null;
 if(patiDmTypingJoined)patiDmSendTyping(false);
 if(patiDmTypingChannel&&sb)sb.removeChannel(patiDmTypingChannel).catch(()=>{});
 patiDmTypingChannel=null;patiDmTypingTopic='';patiDmTypingJoined=false;patiDmTypingLast=0;patiDmRemoteUntil=0;
 patiDmTypingIndicator();
}
function patiDmSetupTyping(){
 if(!me?.id||!sb||!personId||view!=='messages'||blocked.has(personId))return;
 if(window.innerWidth<=740&&!mobileChatOpen){patiDmDisconnectTyping();return}
 if(!/^[0-9a-f-]{36}$/.test(me.id)||!/^[0-9a-f-]{36}$/.test(personId))return;
 const topic='patiyiz-typing:'+ [me.id,personId].sort().join(':');
 if(topic===patiDmTypingTopic)return;
 patiDmDisconnectTyping();patiDmTypingTopic=topic;
 try{
  const channel=sb.channel(topic,{config:{private:true}});
  patiDmTypingChannel=channel;
  channel.on('broadcast',{event:'typing'},({payload})=>{
   if(patiDmTypingChannel!==channel||view!=='messages'||personId!==payload?.actor||blocked.has(personId))return;
   patiDmRemoteUntil=payload.typing?Date.now()+4700:0;
   if(patiDmRemoteTimer)clearTimeout(patiDmRemoteTimer);
   if(payload.typing)patiDmRemoteTimer=setTimeout(()=>{patiDmRemoteUntil=0;patiDmTypingIndicator()},4800);
   patiDmTypingIndicator();
  }).subscribe(status=>{
   if(channel!==patiDmTypingChannel)return;
   patiDmTypingJoined=status==='SUBSCRIBED';
   if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Özel yazıyor kanalı kullanılamıyor');
   patiDmTypingIndicator();
  });
 }catch(error){console.warn('Yazıyor kanalı başlatılamadı:',error);patiDmDisconnectTyping()}
}
function stopLive(){patiDmDisconnectTyping();if(liveReloadTimer)clearTimeout(liveReloadTimer);liveReloadTimer=null;if(liveReconnectTimer)clearTimeout(liveReconnectTimer);liveReconnectTimer=null;if(liveChannel&&sb)sb.removeChannel(liveChannel);liveChannel=null;liveInitialized=false;liveUserId=null}
async function refreshLiveTables(){const userId=me?.id,loadToken=patiyizLoadToken;if(!userId)return false;const result=await Promise.all([sb.from('messages').select('*').order('created_at',{ascending:false}).limit(pageLimits.messages||150),sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(pageLimits.notifications||150)]);if(result[0].error)throw result[0].error;if(result[1].error)throw result[1].error;if(me?.id!==userId||patiyizLoadToken!==loadToken)return false;data.messages=result[0].data||[];data.notifications=result[1].data||[];return true}
function queueLiveUpdate(){if(!me||document.hidden||navigator.onLine===false)return;if(liveReloadTimer)clearTimeout(liveReloadTimer);liveReloadTimer=setTimeout(async()=>{if(!me||document.hidden||navigator.onLine===false)return;const previousInbox=patiDmInbox.rows.map(x=>x.peer_id+'_'+x.message_id+'_'+x.unread_count).join('|');const oldMessageCount=data.messages.filter(x=>x.receiver_id===me.id&&!x.read_at).length;const oldNoticeCount=data.notifications.filter(x=>x.owner_id===me.id&&!x.read).length;const previousConversation=view==='messages'?data.messages.filter(x=>(x.sender_id===me.id&&x.receiver_id===personId)||(x.sender_id===personId&&x.receiver_id===me.id)).map(x=>x.id+'_'+x.read_at+'_'+x.edited_at+'_'+x.body+'_'+x.attachment_path).join('|'):'';try{if(!await refreshLiveTables()||!me)return;if(view==='messages'){await patiDmLoadInbox(true,true);if(personId)await patiDmLoadThread(personId,false,true)}navRender();if(document.hidden)return;if(view==='messages'){const nextInbox=patiDmInbox.rows.map(x=>x.peer_id+'_'+x.message_id+'_'+x.unread_count).join('|');const nextConversation=data.messages.filter(x=>(x.sender_id===me.id&&x.receiver_id===personId)||(x.sender_id===personId&&x.receiver_id===me.id)).map(x=>x.id+'_'+x.read_at+'_'+x.edited_at+'_'+x.body+'_'+x.attachment_path).join('|');if(previousConversation!==nextConversation||previousInbox!==nextInbox){const field=$('#message-form input[name="body"]');const draft=field?.value||'',focus=document.activeElement===field,position=field?.selectionStart??draft.length;render();const next=$('#message-form input[name="body"]');if(next){next.value=draft;if(focus){next.focus({preventScroll:true});next.setSelectionRange(position,position)}}}}else if(view==='notifications')render();const unread=data.messages.filter(x=>x.receiver_id===me.id&&!x.read_at).length;const notices=data.notifications.filter(x=>x.owner_id===me.id&&!x.read).length;if(unread>oldMessageCount||notices>oldNoticeCount)notify('Yeni bir Patiyiz bildirimin var 🐾');if(view==='messages')markConversationRead()}catch(err){console.warn('Canlı bildirim yenilemesi başarısız:',err.message)}},250)}
function startLive(){if(!me||!sb)return;if(liveUserId===me.id&&liveChannel)return;stopLive();liveUserId=me.id;
 const channel=sb.channel('patiyiz-live-'+me.id)
 .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:'receiver_id=eq.'+me.id},queueLiveUpdate)
 .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:'sender_id=eq.'+me.id},queueLiveUpdate)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'patiyiz_dm_deletion_events',filter:'owner_id=eq.'+me.id},payload=>{if(payload?.new?.message_id)patiDmRemoveCached(payload.new.message_id);queueLiveUpdate()})
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
async function markConversationRead(){
 if(!me||view!=='messages'||!personId)return;
 const unread=data.messages.filter(x=>x.sender_id===personId&&x.receiver_id===me.id&&!x.read_at&&!patiDmSeenIds().has(x.id));
 const backendUnread=typeof patiDmInbox!=='undefined'&&patiDmReadReceiptsEnabled()?(patiDmInbox.rows.find(x=>x.peer_id===personId)?.unread_count||0):0;
 if(!unread.length&&!backendUnread)return;
 const ids=unread.map(x=>x.id);
 if(!patiDmReadReceiptsEnabled()){patiDmStoreLocalSeen(ids);navRender();return}
 const uid=me.id,peer=personId,token=patiyizLoadToken,now=new Date().toISOString();
 const r=await sb.from('messages').update({read_at:now}).eq('sender_id',peer).eq('receiver_id',uid).is('read_at',null);
 if(r.error){console.warn('Okundu bilgisi kaydedilemedi',r.error.message);return}
 if(me?.id!==uid||personId!==peer||patiyizLoadToken!==token)return;
 const thread=typeof patiDmThreads!=='undefined'?patiDmThreads.get(patiDmThreadKey(personId)):null;
 for(const row of thread?.rows||[])if(row.sender_id===personId&&row.receiver_id===me.id&&!row.read_at)row.read_at=now;
 const summary=typeof patiDmInbox!=='undefined'?patiDmInbox.rows.find(x=>x.peer_id===personId):null;
 if(summary)summary.unread_count=0;
 unread.forEach(x=>x.read_at=now);navRender();
}
function unreadCounts(){const hidden=new Set(data.messageHidden.filter(x=>x.user_id===me?.id).map(x=>x.message_id));return {messages:data.messages.filter(x=>x.receiver_id===me?.id&&!x.read_at&&!patiDmSeenIds().has(x.id)&&!blocked.has(x.sender_id)&&!hidden.has(x.id)).length,notifications:data.notifications.filter(x=>x.owner_id===me?.id&&!x.read&&!blocked.has(x.actor_id)).length}}
function unreadMessageSources(){const hidden=new Set(data.messageHidden.filter(x=>x.user_id===me?.id).map(x=>x.message_id));const messages=data.messages.filter(x=>x.receiver_id===me?.id&&!x.read_at&&!patiDmSeenIds().has(x.id)&&!blocked.has(x.sender_id)&&!hidden.has(x.id));const tally=new Map();for(const m of messages)tally.set(m.sender_id,(tally.get(m.sender_id)||0)+1);return [...tally].sort((a,b)=>b[1]-a[1]).map(([id,count])=>({id,count,name:profile(id).display_name}))}
const countBadge=n=>n?`<span class="pati-count-badge" aria-label="${n} okunmamış">${n>99?'99+':n}</span>`:'';
function navRender(){const fab=$('#app-root>.mobile-fab');if(fab){fab.hidden=true;fab.style.display='none'}const sideCreate=$('.nav-create');if(sideCreate){const action=view==='community'?'question':view==='care'?'care-add':view==='lost'?'lost-add':view==='home'?'compose':'';sideCreate.hidden=!action;sideCreate.style.display=action?'':'none';if(action){sideCreate.dataset.action=action;sideCreate.innerHTML=ico('plus')+(view==='community'?' Soru sor':view==='care'?' Görev ekle':view==='lost'?' İlan oluştur':view==='adoption'?' Sahiplendirme ilanı':' Yeni paylaşım')}}const counts=unreadCounts();const coinHeader=$('#pati-header-coins'),desktopCoin=$('#pati-desktop-coins');for(const counter of [coinHeader,desktopCoin])if(counter){counter.innerHTML='<span aria-hidden="true"><img class="pati-coin-icon" src="pati-coin.svg?v=20261025-brand-1" alt="" aria-hidden="true"></span><strong>'+Number(patiCoinState.balance||0).toLocaleString('tr-TR')+'</strong>';counter.setAttribute('aria-label',Number(patiCoinState.balance||0)+' PatiCoin · görevleri aç')}const topMessages=$('#pati-header-messages');if(topMessages){topMessages.innerHTML=ico('message')+countBadge(counts.messages);topMessages.classList.toggle('active',view==='messages');topMessages.setAttribute('aria-label',counts.messages?'Mesajlar, '+counts.messages+' okunmamış mesaj':'Mesajlar')}const topBell=$('#pati-header-notifications');if(topBell){topBell.innerHTML=ico('bell')+countBadge(counts.notifications);topBell.classList.toggle('active',view==='notifications');topBell.setAttribute?.('aria-label',counts.notifications?'Bildirimler, '+counts.notifications+' okunmamış bildirim':'Bildirimler')}let navItem=([id,label,icon])=>`<button type="button" class="nav-link ${view===id?'active':''}" data-view="${id}" aria-current="${view===id?'page':'false'}" aria-label="${label}${id==='messages'&&counts.messages?', '+counts.messages+' okunmamış mesaj':id==='notifications'&&counts.notifications?', '+counts.notifications+' okunmamış bildirim':''}">${ico(icon)}${label}${id==='messages'?countBadge(counts.messages):id==='notifications'?countBadge(counts.notifications):''}</button>`;$('#desktop-nav').innerHTML=nav.map(navItem).join('')+(isAdmin?`<button class="nav-link patiyiz-admin-nav" type="button" data-action="open-admin">${ico('shield')}Yönetim Paneli</button>`:'');$('#mobile-nav').innerHTML=[['home','Akış','home'],['explore','Keşfet','search']].map(([id,label,icon])=>`<button type="button" class="mobile-nav-btn ${view===id?'active':''}" data-view="${id}" aria-label="${label}" aria-current="${view===id?'page':'false'}"><span class="pati-mobile-nav-glyph">${ico(icon)}</span><small>${label}</small></button>`).join('')+`<button type="button" class="mobile-nav-btn pati-create-nav" data-action="pati-create-open" aria-label="Yeni paylaşım oluştur"><span class="pati-mobile-nav-glyph">${ico('plus')}</span><small>Paylaş</small></button>`+[['reels','Reels','reels-tab'],['profile','Profil','user']].map(([id,label,icon])=>`<button type="button" class="mobile-nav-btn ${view===id?'active':''}" data-view="${id}" aria-label="${label}" aria-current="${view===id?'page':'false'}"><span class="pati-mobile-nav-glyph">${ico(icon)}</span><small>${label}</small></button>`).join('')
}
function openMobileFeaturesMenu(){
 const menuCounts=typeof unreadCounts==='function'?unreadCounts():{messages:0,notifications:0};
 const menuBadge=value=>typeof countBadge==='function'?countBadge(value):'';
 const groups=[
  {title:'Sosyal',items:[['community','Topluluk','users'],['pets','Patiler','paw'],['profile','Profilim','user'],['messages','Mesajlar','message'],['notifications','Bildirimler','bell']]},
  {title:'PatiCoin Merkezi',items:[['rewards','Görevler & PatiCoin','paw'],['rewards','Sıradaki hedef','target'],['shop','🛍️ Pati Mağaza','grid']]},
  {title:'Keşfet ve öğren',items:[['education','Eğitim / Akademi','library'],['knowledge','Bilgi Merkezi','info'],['lost','Kayıp İlanları','location'],['adoption','Sahiplendirme','heart']]},
  {title:'Hayvanlarım ve hesabım',items:[['my-pet','Hayvanım · Bakım ve Sağlık','heart'],['saved-posts','Kaydettiklerim','bookmark'],['settings','Ayarlar ve Gizlilik','settings'],['blocked','Engellenenler','shield']]}
 ];
 const sections=groups.map(group=>'<section class="pati-feature-group"><h3>'+esc(group.title)+'</h3><div class="pati-mobile-menu-list">'+
  group.items.map(([dest,label,icon])=>'<button type="button" class="pati-mobile-menu-item" data-view="'+dest+'" aria-label="'+esc(label)+(dest==='notifications'&&menuCounts.notifications?' · '+menuCounts.notifications+' okunmamış':dest==='messages'&&menuCounts.messages?' · '+menuCounts.messages+' okunmamış':'')+'">'+ico(icon)+'<span>'+esc(label)+'</span>'+(dest==='notifications'?menuBadge(menuCounts.notifications):dest==='messages'?menuBadge(menuCounts.messages):'')+ico('arrow')+'</button>').join('')+
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
 ['three_posts','3 gönderi',45,'Üç gönderi yayınla'],
 ['first_comment','İlk yorumunu yap',10,'Gönderiye ilk yorumunu yaz'],
 ['five_posts','5 paylaşım yap',12,'Beş gönderi yayınla'],
 ['ten_posts','10 paylaşım yap',20,'On gönderi yayınla'],
 ['five_follows','5 kişiyi takip et',10,'Beş kullanıcıyla bağlantı kur'],
 ['five_lessons','5 Akademi dersi bitir',12,'Beş ücretsiz dersin mini sınavını tamamla'],
 ['twenty_lessons','20 Akademi dersi bitir',25,'Yirmi ücretsiz dersin mini sınavını tamamla'],
 ['first_weight','İlk kilo kaydını ekle',10,'Hayvanının kilo takibini başlat'],
 ['first_reminder','Bakım hatırlatıcısı oluştur',10,'İlk veteriner, aşı veya mama hatırlatıcını ekle'],
 ['first_saved','İlk paylaşımını kaydet',5,'Akışta bir gönderiyi Kaydettiklerim bölümüne ekle'],
 ['daily_visit','Günlük aktif ol',3,'Bugün Patiyiz uygulamasını kullan','daily'],
 ['daily_post','Günün paylaşımını yap',5,'Bugün en az bir gönderi paylaş','daily'],
 ['daily_story','Günün hikâyesini paylaş',3,'Bugün en az bir hikâye yayınla','daily'],
 ['daily_comment','Bugün yorum yap',3,'Bugün bir gönderiye yorum yaz','daily'],
 ['daily_lesson','Günün dersini bitir',4,'Bugün ücretsiz Akademi derslerinden birini tamamla','daily'],
 ['weekly_active3','3 farklı gün aktif ol',10,'Bu hafta üç farklı gün Patiyiz kullan','weekly'],
 ['weekly_posts3','Haftada 3 paylaşım yap',9,'Bu hafta üç ayrı gönderi yayınla','weekly'],
 ['weekly_lessons3','Haftada 3 ders bitir',9,'Bu hafta üç Akademi dersi tamamla','weekly'],
 ['weekly_comments5','Haftada 5 yorum yap',8,'Bu hafta beş yorum yaz','weekly']
];
let patiCoinState={balance:0,earned:0,claims:[],items:[],orders:[],history:[],loading:false};
let patiFollowerRewardState={followers:null,claimed:[]};
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
  // Followers are counted and awarded by Postgres; never trust browser totals.
  try{
   const milestone=await sb.rpc('patiyiz_my_follower_milestones');
   if(milestone.error)throw milestone.error;
   if(me?.id!==uid)return;
   patiFollowerRewardState={followers:milestone.data?.followers??null,claimed:milestone.data?.claimed||[]};
  }catch(error){console.warn('Takipçi ödülleri doğrulanamadı:',error)}
  const claimed=await sb.rpc('patiyiz_claim_completed_tasks');
  if(claimed.error)throw claimed.error;
  if(me?.id!==uid)return;
  const [wallet,ledger,items,orders,history]=await Promise.all([
   sb.from('patiyiz_reward_wallets').select('balance,lifetime_earned').eq('user_id',uid).maybeSingle(),
   sb.from('patiyiz_reward_ledger').select('task_code').eq('user_id',uid).not('task_code','is',null),
   sb.from('patiyiz_reward_items').select('id,name,description,kind,coins,emoji,stock_available').eq('enabled',true).order('sort_order'),
   sb.from('patiyiz_reward_redemptions').select('id,item_id,coins_spent,destination,status,created_at,admin_note,proof_url,reviewed_at,fulfilled_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(30),
   sb.from('patiyiz_reward_fulfillment_events').select('redemption_id,previous_status,next_status,note,created_at').order('created_at',{ascending:false}).limit(100)
  ]);
  for(const r of [wallet,ledger,items,orders,history])if(r.error)throw r.error;
  if(me?.id!==uid)return;
  patiCoinState={balance:wallet.data?.balance||0,earned:wallet.data?.lifetime_earned||0,
   claims:(ledger.data||[]).map(x=>x.task_code),items:items.data||[],orders:orders.data||[],history:history.data||[],loading:false};
  navRender();if(['rewards','shop'].includes(view))render();
  const newly=(claimed.data?.awarded||[]);
  if(withAnimation&&newly.length)patiCoinAnimation(newly.reduce((n,x)=>n+x.coins,0),newly.map(x=>x.title));
 }catch(e){console.warn('PatiCoin yüklenemedi:',e);if(withAnimation)notify('PatiCoin yüklenemedi: '+friendly(e),true)}
 finally{patiCoinState.loading=false}
}
function patiCoinAnimation(amount,titles){
 const old=document.getElementById('paticoin-celebration');if(old)old.remove();
 const el=document.createElement('div');el.id='paticoin-celebration';el.className='paticoin-celebration';
 el.innerHTML='<div class="paticoin-burst" aria-hidden="true"><img class="pati-coin-icon" src="pati-coin.svg?v=20261025-brand-1" alt="" aria-hidden="true"> ✦ <img class="pati-coin-icon" src="pati-coin.svg?v=20261025-brand-1" alt="" aria-hidden="true"></div><div class="paticoin-won">+'+Number(amount)+' PatiCoin!</div><p>'+esc(titles.join(' · '))+'</p><button type="button" aria-label="Ödül bildirimini kapat">Harika!</button>';
 document.body.appendChild(el);
 const close=()=>el.remove();
 el.querySelector('button').addEventListener('click',close);
 // Coin overlay remains until the user taps Harika.
}
function patiCoinMissionKey(code,group){
 if(group!=='daily'&&group!=='weekly')return code;
 const dateString=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const dateParts=dateString.split('-').map(Number);
 const time=Date.UTC(dateParts[0],dateParts[1]-1,dateParts[2]);
 const chosen=new Date(group==='weekly'?time-((new Date(time).getUTCDay()+6)%7)*86400000:time);
 return code+':'+chosen.toISOString().slice(0,10).replaceAll('-','');
}
function patiRewardsPage(){
 const done=new Set(patiCoinState.claims);
 const missionList=(group,completed=false)=>{
  const tasks=patiCoinTasks.filter(x=>(x[4]||'once')===group&&done.has(patiCoinMissionKey(x[0],x[4]||'once'))===completed);
  return '<div class="paticoin-tasks">'+tasks.map(([code,title,coins,info,period])=>{
   const key=patiCoinMissionKey(code,period||'once');
   const claimed=done.has(key);
   return '<article class="paticoin-task '+(claimed?'pati-mission-claimed':'')+'"><div class="paticoin-task-icon">'+(claimed?'✓':'🐾')+'</div><div><strong>'+esc(title)+'</strong><small>'+esc(info)+'</small></div><b class="'+(claimed?'earned':'')+'">'+(claimed?'✓ Tamamlandı':'+'+coins+' <img class="pati-coin-icon" src="pati-coin.svg?v=20261025-brand-1" alt="" aria-hidden="true">')+'</b></article>';
  }).join('')+'</div>';
 };
 const milestones=window.PatiyizFollowerMilestones?.renderPanel(patiFollowerRewardState.followers,patiFollowerRewardState.claimed)||'';
 const invite='<section class="paticoin-invite"><h2>🎁 Arkadaşını davet et</h2><p>Sen ve davet ettiğin kişi <b>50’şer PatiCoin</b> kazanırsınız. Her hesap yalnızca bir davet kodu kullanabilir.</p><div class="paticoin-invite-code"><strong>'+esc(patiInviteState.code||'Kod hazırlanıyor…')+'</strong><button data-action="paticoin-invite-share">Paylaş</button></div><small>Davet ettiğin kişi: '+(patiInviteState.invited_count||0)+'</small>'+(patiInviteState.already_used?'<p>✓ Davet kodu kullanma hakkını tamamladın.</p>':'<label class="paticoin-invite-entry">Arkadaşının kodu<input id="pati-invite-code" maxlength="9" autocomplete="off" placeholder="P1234ABCD"></label><button class="paticoin-invite-redeem" data-action="paticoin-invite-redeem">Kodu kullan · +50 <img class="pati-coin-icon" src="pati-coin.svg?v=20261025-brand-1" alt="" aria-hidden="true"></button>')+'</section>';
 main.innerHTML='<section class="paticoin-page"><div class="paticoin-hero"><span>🐾 PATİYİZ GÖREV MERKEZİ</span><h1>PatiCoin</h1><strong><img class="pati-coin-icon" src="pati-coin.svg?v=20261025-brand-1" alt="" aria-hidden="true"> '+Number(patiCoinState.balance).toLocaleString('tr-TR')+' <small>PatiCoin</small></strong><p>Toplam kazanılan: '+Number(patiCoinState.earned).toLocaleString('tr-TR')+' coin</p><div class="paticoin-actions"><button data-action="paticoin-claim">Görevlerimi kontrol et</button><button data-action="paticoin-shop">Pati Mağaza →</button></div></div>'+
 milestones+'<div class="paticoin-mission-heading"><div><h2>🎯 Tek Seferlik Görevler</h2><p>Her hesapta yalnız bir kez puan kazandırır.</p></div><span>'+patiCoinTasks.filter(x=>!x[4]).length+' görev</span></div>'+missionList('once')+
 '<div class="paticoin-mission-heading"><div><h2>☀️ Günlük Görevler</h2><p>Her yeni gün yeniden yapılabilir. Aynı görevden günde bir kez puan kazanılır.</p></div><span>5 görev</span></div>'+missionList('daily')+
 '<div class="paticoin-mission-heading"><div><h2>🗓️ Haftalık Görevler</h2><p>Her pazartesi yeniden başlar. Aynı görevden haftada en fazla bir kez puan kazanılır.</p></div><span>4 görev</span></div>'+missionList('weekly')+
 invite+'<section class="paticoin-done-zone" aria-label="Tamamlanan görevler"><div class="paticoin-mission-heading"><div><h2>✓ Tamamlanan görevler</h2><p>Kazanılan ödüllerin geçmişi</p></div></div>'+
  ['once','daily','weekly'].map(group=>missionList(group,true)).join('')+'</section><p class="paticoin-disclaimer"><b>Ödül kuralları:</b> Hesabın en az 7 günlük olmalı, son 30 günde 3 farklı gün aktif olmalısın. 14 günde en fazla 1 ödül talebi oluşturabilirsin. Puanlar yalnızca sunucunun doğruladığı işlemler için verilir; eski kazançlar korunur.</p></section>';
}
let patiShopFilter='all';
function patiShopPage(){
 const activeFilter=typeof patiShopFilter==='string'?patiShopFilter:'all';
 const label={pending:'Talep alındı · Beklemede',approved:'Onaylandı · Stok ayrıldı',preparing:'Hazırlanıyor',fulfilled:'Teslim/bağış tamamlandı',cancelled:'İptal edildi · PatiCoin iade edildi'};
 const coin='<img class="pati-coin-icon" src="pati-coin.svg?v=20261025-brand-1" alt="" aria-hidden="true">';
 const filters=[['all','Tümü'],['food','Mama & Destek'],['supply','Ürünler'],['donation','Doğa bağışı']];
 const shown=patiCoinState.items.filter(p=>activeFilter==='all'||p.kind===activeFilter);
 const cards=shown.map(p=>{
  const donation=p.kind==='donation',stock=Math.max(0,Number(p.stock_available)||0),soldOut=stock===0,affordable=Number(patiCoinState.balance)>=Number(p.coins);
  const pending=patiCoinState.orders.some(o=>o.item_id===p.id&&['pending','approved','preparing'].includes(o.status));
  const stateText=pending?'Talebin beklemede':soldOut?'Stokta yok':!affordable?'Yetersiz PatiCoin':'Stok: '+stock+' adet';
  const actionText=pending?'Talep beklemede':soldOut?'Stokta yok':!affordable?'PatiCoin kazan':'Talep oluştur';
  return '<article class="paticoin-item pati-shop-card '+(donation?'pati-shop-tree':'')+'"><div class="pati-shop-card-top"><span class="paticoin-item-icon" aria-hidden="true">'+esc(p.emoji)+'</span><span class="pati-shop-type">'+(donation?'Doğa için':p.kind==='food'?'Destek':'Ürün')+'</span></div>'+
   '<div class="pati-shop-card-copy"><h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p></div>'+
   '<span class="pati-shop-stock-state '+(pending?'is-pending':soldOut?'is-out':!affordable?'is-low':'is-available')+'" role="status">'+stateText+'</span><div class="pati-shop-card-bottom"><strong>'+coin+Number(p.coins).toLocaleString('tr-TR')+' <small>PatiCoin</small></strong><button type="button" '+(soldOut||pending?'disabled aria-disabled="true"':'')+' data-action="'+(!affordable?'paticoin-rewards':'paticoin-buy')+'" data-id="'+esc(p.id)+'">'+actionText+'</button></div></article>';
 }).join('');
 const orders=patiCoinState.orders.map(o=>{
  const events=patiCoinState.history.filter(e=>e.redemption_id===o.id),note=o.admin_note?'<p class="paticoin-order-note">Bilgi: '+esc(o.admin_note)+'</p>':'';
  const proof=o.status==='fulfilled'&&/^https:\/\//i.test(o.proof_url||'')?'<a href="'+esc(o.proof_url)+'" rel="noopener noreferrer" target="_blank">Bağış / teslimat kanıtı</a>':'';
  const timeline=events.length?'<details class="paticoin-order-timeline"><summary>İşlem adımları ('+events.length+')</summary>'+events.map(e=>'<p>'+esc(label[e.next_status]||e.next_status)+' · '+day(e.created_at)+(e.note?' · '+esc(e.note):'')+'</p>').join('')+'</details>':'';
  const destination=o.destination==='environment'?'🌱 Doğa için':o.destination==='street_animals'?'Sokak hayvanları için':'Kendi hayvanım için';
  return '<article class="paticoin-order"><b>'+esc(patiCoinState.items.find(p=>p.id===o.item_id)?.name||'Ürün')+'</b><span>'+destination+' · '+coin+Number(o.coins_spent).toLocaleString('tr-TR')+'</span><strong class="paticoin-order-status paticoin-order-'+esc(o.status)+'">'+esc(label[o.status]||'Beklemede')+'</strong>'+note+proof+timeline+'</article>';
 }).join('');
 main.innerHTML='<section class="paticoin-page pati-shop-v2"><header class="pati-shop-hero"><div><span class="pati-shop-eyebrow">PATIYIZ · ÖDÜL MAĞAZASI</span><h1>Pati Mağaza</h1><p>Katılımını iyiliğe dönüştür. Ödülleri incele, PatiCoin ile güvenli talep oluştur.</p></div><button class="pati-shop-wallet" type="button" data-action="paticoin-rewards"><span>BAKİYEN</span><strong>'+coin+Number(patiCoinState.balance||0).toLocaleString('tr-TR')+'</strong><small>Görevleri gör →</small></button></header>'+
  '<div class="pati-shop-section-title"><div><span>ÖDÜL KOLEKSİYONU</span><h2>Bir iyilik seç</h2></div><small>'+patiCoinState.items.length+' seçenek</small></div>'+
  '<div class="pati-shop-filter" role="group" aria-label="Mağaza kategorileri">'+filters.map(([key,name])=>'<button type="button" data-action="paticoin-shop-filter" data-id="'+key+'" aria-pressed="'+(activeFilter===key)+'" class="'+(activeFilter===key?'active':'')+'">'+name+'</button>').join('')+'</div>'+
  '<div class="paticoin-items">'+(cards||'<p class="pati-shop-empty">Bu kategoride henüz ürün bulunmuyor.</p>')+'</div>'+
  '<p class="paticoin-disclaimer pati-shop-note">İşlemler bir talep oluşturur. Fiziksel teslimat veya fidan dikimi ancak yönetici tarafından kanıtlı olarak tamamlandığında gerçekleşmiş sayılır. Hesabın en az 7 günlük ve son 30 günde 3 farklı gün aktif olması gerekir; 14 günde en fazla 1 talep oluşturabilirsin.</p>'+
  '<div class="paticoin-shop-orders-heading"><h2>Talep geçmişim</h2><button class="paticoin-refresh" data-action="paticoin-refresh">↻ Güncelle</button></div><div class="paticoin-orders">'+(orders||'<p class="pati-shop-no-orders">Henüz talebin yok. Mağazadaki ödülleri keşfet.</p>')+'</div></section>';
}
function patiCoinShowCheckout(id){
 const product=patiCoinState.items.find(p=>p.id===id);
 if(!product)return notify('Ürün artık mevcut değil.',true);
 if(Number(product.stock_available)<=0)return notify('Bu ürün şu an stokta yok. Yeniden stok eklenmesini bekle.',true);
 if(patiCoinState.orders.some(o=>o.item_id===product.id&&['pending','approved','preparing'].includes(o.status)))return notify('Bu ürün için bekleyen bir talebin var. Talep geçmişini kontrol et.',true);
 if(patiCoinState.balance<product.coins)return notify('Yetersiz PatiCoin. Önce görevlerini tamamla.',true);
 patiCoinCheckoutItem=product.id;
 const pets=data.pets.filter(p=>p.owner_id===me.id),donation=product.kind==='donation';
 const coin='<img class="pati-coin-icon" src="pati-coin.svg?v=20261025-brand-1" alt="" aria-hidden="true">';
 const destination=donation?
  '<div class="pati-shop-tree-destination"><label><input type="radio" name="paticoin-destination" value="environment" checked> 🌱 Doğa için 1 fidan</label><p>Talep gönderildiğinde coin bakiyenden düşer. Fidan dikimi ancak yönetici onayı ve bağış kanıtı sonrası tamamlandı sayılır.</p></div>':
  '<h3>Ürünü kimin için alıyorsun?</h3><label><input type="radio" name="paticoin-destination" value="own_pet" '+(pets.length?'checked':'disabled')+'> 🐶 Kendi hayvanım için</label><label><input type="radio" name="paticoin-destination" value="street_animals" '+(!pets.length?'checked':'')+'> 🐾 Sokak hayvanları için</label>'+
  '<div class="paticoin-pet-selector"><label for="paticoin-pet-id">Hayvanını seç</label><select id="paticoin-pet-id">'+pets.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></div>';
 const content='<div class="paticoin-checkout"><div class="paticoin-checkout-item">'+esc(product.emoji)+' <b>'+esc(product.name)+'</b><span>'+coin+product.coins+'</span></div>'+destination+
  '<p class="paticoin-disclaimer">Onayladığında talebin beklemeye alınır. Anında bağış veya teslimat gerçekleşmiş sayılmaz.</p><button type="button" class="paticoin-confirm" data-action="paticoin-confirm">'+coin+product.coins+' coin kullan · Talep oluştur</button></div>';
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
let patiyizFeedActiveVideo=null;
let patiyizFeedSoundEnabled=typeof window!=='undefined'&&(window.PatiyizNative?.isNative===true||document.documentElement?.classList?.contains('patiyiz-ios-reels')===true);
function patiFeedSoundButton(video){
 const button=video?.parentElement?.querySelector('[data-action="video-sound"]');
 if(!button)return;
 button.innerHTML=ico(video.muted?'volume-x':'volume');
 button.setAttribute('aria-label',video.muted?'Sesi aç':'Sesi kapat');
 button.setAttribute('aria-pressed',String(!video.muted));
}
function setupFeedVideos(){
 if(patiyizVideoObserver){patiyizVideoObserver.disconnect();patiyizVideoObserver=null}
 if(patiyizFeedActiveVideo){patiyizFeedActiveVideo.pause();patiyizFeedActiveVideo=null}
 const videos=[...document.querySelectorAll('#main-content .pati-video-frame video')];
 if(!videos.length)return;
 const native=typeof window!=='undefined'&&window.PatiyizNative?.isNative===true;
 const iosHome=typeof document!=='undefined'&&document.documentElement?.classList?.contains('patiyiz-ios-reels');
 const permitted=()=>!document.hidden&&!document.getElementById?.('story-overlay')&&!(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!native&&!iosHome);
 const ratios=new Map();
 const playVideo=video=>{
  if(!video||!permitted()||video.dataset.userPaused)return;
  if(patiyizFeedActiveVideo!==video){patiyizFeedActiveVideo?.pause();patiyizFeedActiveVideo=video}
  if(!video.paused)return;
  video.muted=!patiyizFeedSoundEnabled;
  patiFeedSoundButton(video);
  const promise=video.play();
  promise?.catch?.(error=>{
   if(document.hidden||patiyizFeedActiveVideo!==video)return;
   if(!video.muted){
    // iOS may reject unmuted autoplay; retry silently rather than freezing the feed.
    video.muted=true;patiFeedSoundButton(video);
    video.play().catch(e=>console.warn('Akış videosu oynatılamadı:',e?.message||e));
   }else console.warn('Akış videosu otomatik oynatılamadı:',error?.message||error);
  });
 };
 const choose=()=>{
  if(!permitted()){patiyizFeedActiveVideo?.pause();return}
  let selected=null,ratio=.34;
  for(const [video,visible] of ratios)if(visible>ratio&&!video.dataset.userPaused){selected=video;ratio=visible}
  if(!selected){patiyizFeedActiveVideo?.pause();patiyizFeedActiveVideo=null;return}
  // The active player is stopped in playVideo; avoid pausing all 70 feed items per scroll.
  playVideo(selected);
 };
 if(!('IntersectionObserver' in window)){
  videos.forEach((video,i)=>{if(i)video.pause()});
  if(permitted())playVideo(videos[0]);
  return;
 }
 patiyizVideoObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
   const video=entry.target;
   if(entry.isIntersecting&&entry.intersectionRatio>=.01){
    ratios.set(video,entry.intersectionRatio);
    if(video.preload==='none')video.preload='metadata';
   }else{
    ratios.delete(video);video.pause();delete video.dataset.userPaused;
    if(video===patiyizFeedActiveVideo)patiyizFeedActiveVideo=null;
   }
  }
  choose();
 },{threshold:[0,.2,.35,.5,.65,.85]});
 videos.forEach(v=>patiyizVideoObserver.observe(v));
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('.pati-post-video,.pati-reel-video').forEach(v=>v.pause());else{setupFeedVideos();setupReelsViewer();if(me&&sb)queueLiveUpdate()}});
document.addEventListener('patiyiz:native-resume-media',()=>{if(view==='reels'&&!document.hidden)setupReelsViewer()});
function ensureViewData(to){const byView={community:[['questions','questions'],['replies','replies'],['question_votes','votes']],knowledge:[['kb_bookmarks','bookmarks']],lost:[['lost_reports','lost']],adoption:[['adoption_listings','adoption']],care:[['care_tasks','care']],'my-pet':[['care_tasks','care']],messages:[['message_hidden','messageHidden']],profile:[],blocked:[['user_blocks','blocks']]};const missing=(byView[to]||[]).filter(([table])=>!patiyizLoadedTables.has(table));if(!missing.length)return;const requestedView=to,requestedUser=me?.id;Promise.all(missing.map(async([table,key])=>{let req=sb.from(table).select('*');if(table==='kb_bookmarks')req=req.eq('user_id',requestedUser);const r=await req.limit(350);if(r.error)throw r.error;return[table,key,r.data||[]]})).then(results=>{if(me?.id!==requestedUser)return;for(const[table,key,rows]of results){if(!patiyizLoadedTables.has(table)){data[key]=rows;patiyizLoadedTables.add(table);if(table==='kb_bookmarks')favorites=new Set(rows.map(x=>x.article_id))}}if(view===requestedView)render()}).catch(e=>console.warn('Bölüm verileri yüklenemedi:',e))}
const patiMobileTabScroll=new Map();
let patiSwipeNavDirection=0;
let patiNavAnimationId=0;
function navigate(to){
 if(['care','wellness','healthfile'].includes(to)){patiMyPetTab=to;to='my-pet'}
 if(!allowed.includes(to))to='home';
 const previous=view,primary=['home','explore','reels'],reselect=previous===to&&primary.includes(to);
 if(to==='messages'&&previous!=='messages')patiDmReturnView=previous;
 if(to==='messages'&&previous!=='messages'&&personId)patiDmPendingLatestPeer=personId;
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
 if(to!=='messages'&&previous==='messages')patiDmDisconnectTyping();
 if(view==='explore'){exploreTab='media';search=''}
 if(view==='blocked')loadBlockedNames();
 articleId='';search='';
 window.scrollTo(0,0);
 navRender();side();render();
 if(to==='community'&&previous!=='community'&&typeof patiLoadCommunity==='function')void patiLoadCommunity(true);
 if(to==='reels'&&previous!=='reels'&&typeof patiLoadMoreReels==='function')void patiLoadMoreReels(true);
 if(to==='pets'&&previous!=='pets'&&typeof patiLoadCommunityPets==='function')void patiLoadCommunityPets(true);
 if(to==='pets'&&previous!=='pets')void patiLoadOwnedPets();
 if(to==='explore'&&previous!=='explore'&&typeof patiExploreLoadMedia==='function')void patiExploreLoadMedia(true);
 if(to==='follows-list')void patiLoadFollowPage(true);
 if(to==='notifications'&&previous!=='notifications'){void notificationFetch();void notificationCheckPush();}
 if(to==='messages'){
  if(previous!=='messages')void patiDmLoadInbox(true);
  if(personId)void patiDmLoadThread(personId);
 }
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
 const swipeDirection=patiSwipeNavDirection;patiSwipeNavDirection=0;
 if(mainElement&&window.matchMedia?.('(max-width:740px)')?.matches&&!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
  mainElement.classList.remove('pati-view-enter','pati-view-swipe-next','pati-view-swipe-prev');
  void mainElement.offsetWidth;
  mainElement.classList.add('pati-view-enter');
  if(swipeDirection)mainElement.classList.add(swipeDirection>0?'pati-view-swipe-next':'pati-view-swipe-prev');
  setTimeout(()=>{if(animationId===patiNavAnimationId)mainElement.classList.remove('pati-view-enter','pati-view-swipe-next','pati-view-swipe-prev')},260);
 }
 ensureViewData(view);
 if(view==='messages')markConversationRead();
}
function userRow(id,small=''){let p=profile(id);return `<button type="button" class="pati-profile-row" data-action="view-user" data-id="${esc(id)}" aria-label="${esc(p.display_name)} profilini aç" style="border:0;background:transparent;padding:0;text-align:left;width:100%;cursor:pointer;color:inherit;font:inherit">${avatar(p)}<span><strong>${displayName(p)}</strong><small style="display:block">@${esc(p.handle)} ${small?`· ${esc(small)}`:''}</small></span></button>`}
// Render-scoped counters: no stale counts after Realtime events or successful user mutations.
let patiPostRenderStats=null;
function patiBuildPostStats(likes,comments,hiddenAuthors){
 const stats=new Map();
 for(const like of likes||[]){
  if(!like.post_id)continue;
  let row=stats.get(like.post_id);
  if(!row){row={likes:0,comments:0};stats.set(like.post_id,row)}
  row.likes++;
 }
 for(const comment of comments||[]){
  if(!comment.post_id||hiddenAuthors?.has(comment.author_id))continue;
  let row=stats.get(comment.post_id);
  if(!row){row={likes:0,comments:0};stats.set(comment.post_id,row)}
  row.comments++;
 }
 return stats;
}
function render(){try{patiPostRenderStats=['home','reels','profile','explore','saved-posts'].includes(view)?patiBuildPostStats(data.likes,data.comments,blocked):null;({home:homePage,explore:explorePage,reels:reelsPage,pets:petsPage,wellness:patiWellnessPage,healthfile:healthFilePage,'saved-posts':savedPostsPage,rewards:patiRewardsPage,shop:patiShopPage,community:communityPage,knowledge:knowledgePage,education:educationPage,lost:lostPage,adoption:adoptionPage,care:carePage,'my-pet':patiMyPetCenterPage,messages:messagesPage,notifications:notificationsPage,profile:profilePage,blocked:blockedPage,settings:settingsPage,'follows-list':followListPage}[view]||homePage)();setupFeedVideos();setupReelsViewer();patiWatchPostViews()}catch(e){console.error(e);main.innerHTML=header('Bir hata oldu')+empty('Ekran açılamadı','Sayfayı yenile veya daha sonra tekrar dene.')}}
async function load(mode='all'){if(!me)return;const userId=me.id,loadToken=patiyizLoadToken,likesEpoch=(typeof likesChangeEpoch==='number'?likesChangeEpoch:0),savesEpoch=(typeof savesChangeEpoch==='number'?savesChangeEpoch:0);let specs=[['profiles','profiles',800],['pets','pets',600],['posts','posts',200],['post_likes','likes',2000],['post_saves','saves',2000],['comments','comments',1500],['comment_likes','commentLikes',3000],['follows','follows',2000],['questions','questions',150],['replies','replies',1500],['question_votes','votes',2000],['lost_reports','lost',300],['adoption_listings','adoption',300],['patiyiz_stories','stories',250],['patiyiz_story_responses','storyResponses',1000],['patiyiz_reposts','reposts',600],['patiyiz_post_pins','pins',500],['patiyiz_highlight_albums','highlightAlbums',250],['patiyiz_highlight_items','highlightItems',500],['care_tasks','care',500],['messages','messages',1000],['message_hidden','messageHidden',1000],['notifications','notifications',500],['kb_bookmarks','bookmarks',300],['user_blocks','blocks',500]];if(mode==='initial')specs=specs.filter(([table])=>['profiles','pets','posts','post_likes','post_saves','patiyiz_stories','patiyiz_highlight_albums','patiyiz_highlight_items','user_blocks'].includes(table));else if(mode==='feed')specs=specs.filter(([table])=>['profiles','posts','post_likes','post_saves','patiyiz_stories','patiyiz_highlight_albums','patiyiz_highlight_items'].includes(table));else if(mode==='deferred')specs=specs.filter(([table])=>!patiyizLoadedTables.has(table));
const fetchSpec=async([table,key,limit])=>{const chunks=[];const size=250,cap=Math.max(1,Math.min(5000,pageLimits[key]||limit));try{for(let start=0;start<cap;start+=size){let req=sb.from(table).select('*').range(start,Math.min(start+size-1,cap-1));if(table==='kb_bookmarks')req=req.eq('user_id',userId);if(['messages','notifications','comments','posts','replies','questions','lost_reports','patiyiz_stories','patiyiz_story_responses','adoption_listings'].includes(table))req=req.order('created_at',{ascending:false});if(table==='posts')req=req.order('id',{ascending:false});const r=await req;if(r.error)throw r.error;chunks.push(...(r.data||[]));if((r.data||[]).length<size)break;}if(pageLimits[key])pageMore[key]=chunks.length>=cap;return[key,chunks,true]}catch(e){console.warn(table,'yüklenemedi:',e.message);if(table==='posts'&&typeof patiHomeLoadError!=='undefined')patiHomeLoadError='Gönderiler yüklenemedi.';return[key,data[key]||[],false]}};const results=[];if(mode==='deferred'){for(let i=0;i<specs.length;i+=4){if(me?.id!==userId||patiyizLoadToken!==loadToken)return;results.push(...await Promise.all(specs.slice(i,i+4).map(fetchSpec)))}}else results.push(...await Promise.all(specs.map(fetchSpec)));if(me?.id!==userId||patiyizLoadToken!==loadToken)return;for(const [k,val,ok]of results){
 if(k==='posts'&&ok&&typeof patiHomeFeedIds!=='undefined'){
  patiHomeFeedIds=new Set(val.map(p=>p.id));
  const last=val[val.length-1];patiHomeFeedCursor=last?{created_at:last.created_at,id:last.id}:null;
  patiHomeLoadError='';
 }
 if(k==='likes'&&likesEpoch!==(typeof likesChangeEpoch==='number'?likesChangeEpoch:0))continue;if(k==='saves'&&savesEpoch!==(typeof savesChangeEpoch==='number'?savesChangeEpoch:0))continue;data[k]=val;if(ok)patiyizLoadedTables.add(({profiles:'profiles',pets:'pets',posts:'posts',likes:'post_likes',saves:'post_saves',comments:'comments',commentLikes:'comment_likes',follows:'follows',questions:'questions',replies:'replies',votes:'question_votes',lost:'lost_reports',adoption:'adoption_listings',stories:'patiyiz_stories',storyResponses:'patiyiz_story_responses',reposts:'patiyiz_reposts',pins:'patiyiz_post_pins',highlightAlbums:'patiyiz_highlight_albums',highlightItems:'patiyiz_highlight_items',care:'care_tasks',messages:'messages',messageHidden:'message_hidden',notifications:'notifications',bookmarks:'kb_bookmarks',blocks:'user_blocks'})[k])}liked=new Set(data.likes.filter(x=>x.user_id===me.id).map(x=>x.post_id));saved=new Set(data.saves.filter(x=>x.user_id===me.id).map(x=>x.post_id));followed=new Set(data.follows.filter(x=>x.follower_id===me.id).map(x=>x.followee_id));voted=new Set(data.votes.filter(x=>x.user_id===me.id).map(x=>x.question_id));favorites=new Set(data.bookmarks.filter(x=>x.user_id===me.id).map(x=>x.article_id));blocked=new Set(data.blocks.filter(x=>x.blocker_id===me.id).map(x=>x.blocked_id))}
async function refreshKeys(specs){
 const userId=me?.id,loadToken=patiyizLoadToken;if(!userId)return;
 const results=await Promise.all(specs.map(async([table,key])=>{const r=await sb.from(table).select('*').order('created_at',{ascending:false}).limit(key==='messages'?400:key==='notifications'?150:200);if(r.error)throw r.error;return[key,r.data||[]]}));
 if(me?.id!==userId||patiyizLoadToken!==loadToken)return;
 for(const[k,rows]of results)data[k]=rows;
 navRender();render();
}
async function refresh(){const userId=me?.id,loadToken=patiyizLoadToken;if(!userId)return;await load();if(me?.id!==userId||patiyizLoadToken!==loadToken)return;navRender();render();if(view==='blocked')loadBlockedNames()}
// Only fetch the requested older rows instead of reloading 25+ unrelated tables.
async function loadMore(key){pageLimits[key]=(pageLimits[key]||40)+50;
 if(key==='posts'){
  const uid=me?.id,token=patiyizLoadToken,previous=pageLimits.posts-50,limit=50;
  if(!uid||!sb){pageLimits.posts=previous;return}
  const cursor=patiHomeFeedCursor;
  if(!cursor){pageMore.posts=false;pageLimits.posts=previous;render();return}
  try{
   const query=sb.from('posts').select('*')
    .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(limit)
    .or('created_at.lt.'+cursor.created_at+',and(created_at.eq.'+cursor.created_at+',id.lt.'+cursor.id+')');
   const result=await query;
   if(result.error)throw result.error;
   if(me?.id!==uid||patiyizLoadToken!==token)return;
   const rows=result.data||[],known=new Set(data.posts.map(p=>p.id));
   for(const row of rows)if(!known.has(row.id)){data.posts.push(row);known.add(row.id)}
   if(!patiHomeFeedIds)patiHomeFeedIds=new Set();
   for(const row of rows)patiHomeFeedIds.add(row.id);
   if(rows.length){const last=rows[rows.length-1];patiHomeFeedCursor={created_at:last.created_at,id:last.id}}
   pageLimits.posts=previous+rows.length;
   pageMore.posts=rows.length===limit;
   patiHomeLoadError='';navRender();render();
  }catch(error){
   if(me?.id===uid&&patiyizLoadToken===token){
    pageLimits.posts=previous;patiHomeLoadError='Daha fazla gönderi yüklenemedi.';render();
   }
   throw error;
  }
  return;
 }
 if(key!=='messages'&&key!=='notifications'){await refresh();return}
 const uid=me?.id,loadToken=patiyizLoadToken,previous=pageLimits[key]-50,limit=50;
 if(!uid||!sb){pageLimits[key]=previous;return}
 try{
  const existing=data[key]||[];
  const oldest=existing.reduce((time,row)=>!time||row.created_at<time?row.created_at:time,'');
  let query=sb.from(key).select('*').order('created_at',{ascending:false}).limit(limit);
  if(oldest)query=query.lt('created_at',oldest);
  const response=await query;
  if(response.error)throw response.error;
  if(me?.id!==uid||loadToken!==patiyizLoadToken)return;
  const rows=response.data||[],ids=new Set(existing.map(row=>row.id));
  for(const row of rows)if(!ids.has(row.id)){existing.push(row);ids.add(row.id)}
  data[key]=existing;
  pageLimits[key]=previous+rows.length;
  pageMore[key]=rows.length===limit;
  navRender();render();
 }catch(error){
  if(me?.id===uid&&loadToken===patiyizLoadToken)pageLimits[key]=previous;
  throw error;
 }
}
function formatPatiPostBody(raw){
 return esc(raw||'').replace(/(^|[\s])#([\p{L}\p{N}_]{2,35})/gu,(_m,prefix,tag)=>prefix+'<button type="button" class="pati-hashtag" data-action="hashtag" data-id="'+tag+'">#'+tag+'</button>');
}
function postCard(p,priority=false){
 const indexed=typeof patiPostRenderStats!=='undefined'&&patiPostRenderStats;
 const own=p.author_id===me.id,commentCount=indexed?(indexed.get(p.id)?.comments||0):data.comments.filter(x=>x.post_id===p.id&&!blocked.has(x.author_id)).length,count=indexed?(indexed.get(p.id)?.likes||0):data.likes.filter(x=>x.post_id===p.id).length,pet=data.pets.find(x=>x.id===p.pet_id);
 const images=(p.images?.length?p.images:[p.image_url]).filter(Boolean),hasMedia=!!(images.length||p.video_url),isPriority=priority===true,body=String(p.body||'').trim();
 const feedAudible=(typeof patiyizFeedSoundEnabled==='boolean'&&patiyizFeedSoundEnabled);
 const media=p.video_url?'<div class="pati-video-frame"><video class="pati-post-video" playsinline webkit-playsinline'+(feedAudible?'':' muted')+' loop preload="'+(isPriority?'metadata':'none')+'"'+(p.video_cover_url?' poster="'+esc(p.video_cover_url)+'"':'')+' src="'+esc(p.video_url)+'" aria-label="Paylaşım videosu"></video><button type="button" class="pati-video-sound" data-action="video-sound" aria-label="'+(feedAudible?'Sesi kapat':'Sesi aç')+'" aria-pressed="'+feedAudible+'">'+ico(feedAudible?'volume':'volume-x')+'</button></div>':
 images.length?'<div class="pati-carousel" data-post-id="'+esc(p.id)+'"><div class="pati-carousel-track">'+images.map((url,i)=>'<div class="pati-carousel-slide pati-doubletap-photo" data-post-id="'+esc(p.id)+'">'+photo(url,'🐾',isPriority&&i===0)+'<span class="pati-heart-burst" aria-hidden="true">♥</span></div>').join('')+'</div>'+(images.length>1?'<span class="pati-carousel-count">1 / '+images.length+'</span><button type="button" data-action="carousel-prev" class="pati-carousel-arrow prev" aria-label="Önceki fotoğraf">‹</button><button type="button" data-action="carousel-next" class="pati-carousel-arrow next" aria-label="Sonraki fotoğraf">›</button>':'')+'</div>':'';
 const controls='<div class="pati-actionbar pati-social-actions"><button type="button" data-action="like" aria-label="Beğen" aria-pressed="'+liked.has(p.id)+'" data-id="'+esc(p.id)+'" class="'+(liked.has(p.id)?'active':'')+'">'+ico('heart')+' <span>'+count+'</span></button><button type="button" data-action="comment" aria-label="Yorum yap" data-id="'+esc(p.id)+'">'+ico('message-circle')+' <span>'+commentCount+'</span></button><button type="button" data-action="share-post" aria-label="Paylaş" data-id="'+esc(p.id)+'">'+ico('send')+'</button><button type="button" data-action="save" aria-label="Kaydet" aria-pressed="'+saved.has(p.id)+'" data-id="'+esc(p.id)+'" class="pati-save-action '+(saved.has(p.id)?'active':'')+'">'+ico('bookmark')+'</button></div>';
 const caption=body?'<p class="pati-post-caption">'+(hasMedia?'<strong>'+displayName(profile(p.author_id))+'</strong> ':'')+formatPatiPostBody(body)+'</p>':'';
 return '<article class="pati-card pati-feed-card '+(hasMedia?'pati-feed-has-media':'pati-feed-text-only')+'" data-post-id="'+esc(p.id)+'"><div class="pati-feed-card-header">'+userRow(p.author_id,'')+'<button type="button" class="pati-post-more" data-action="post-menu" data-id="'+esc(p.id)+'" aria-label="Gönderi seçenekleri">⋯</button></div>'+
 (pet?'<p class="pati-feed-pet">'+petIcon(pet.species)+' '+esc(pet.name)+' · '+esc(pet.species)+'</p>':'')+
 (hasMedia?media:'<div class="pati-feed-text-content">'+(caption||'<p class="pati-post-caption">🐾</p>')+'</div>')+
 controls+'<div class="pati-post-details"><strong class="pati-post-like-summary">'+count+' beğeni</strong>'+(hasMedia?caption:'')+'<time class="pati-post-time">'+esc(day(p.created_at))+'</time></div></article>';
}
function patiDetailCandidates(source){
 if(source==='profile'){
  const author=profileId||me.id;
  const sorted=data.posts.filter(p=>p.author_id===author&&!blocked.has(p.author_id))
   .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
  return sorted.filter(p=>profilePostsTab==='text'?!(p.image_url||p.images?.length||p.video_url):
   profilePostsTab==='videos'?!!p.video_url:!!(p.image_url||p.images?.length||p.video_url));
 }
 if(source==='explore'){
  const remote=patiExploreMedia.owner===me.id&&patiExploreMedia.ready?patiExploreMedia.rows:[];
  return [...new Map([...remote,...data.posts].map(p=>[p.id,p])).values()]
   .filter(p=>!blocked.has(p.author_id)&&(p.image_url||p.images?.length||p.video_url))
   .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
 }
 return [];
}
function patiDetailPage(){
 const state=patiDetailState;
 if(!state||!state.rows?.length)return empty('Gönderiler bulunamadı','Listeye geri dön.');
 const old=document.querySelector('#pati-detail-list');
 const savedOffset=old&&state.positioned?old.scrollTop:0;
 const rows=state.rows.filter(p=>!blocked.has(p.author_id));
 main.innerHTML='<section class="pati-detail-screen" aria-label="Kaydırılabilir gönderi akışı">'+
  '<header class="pati-detail-toolbar"><button type="button" data-action="post-back" aria-label="Gönderi listesine dön">'+ico('arrow-left')+' Geri</button><div><strong>Gönderiler</strong><small>Diğer paylaşımlar için yukarı veya aşağı kaydır</small></div><span>'+rows.length+' gönderi</span></header>'+
  '<div class="pati-detail-list" id="pati-detail-list" role="feed" aria-label="Sıralı gönderiler" tabindex="0">'+
  rows.map((post,i)=>'<section class="pati-detail-item" data-detail-post-id="'+esc(post.id)+'" aria-label="'+(i+1)+'. gönderi, toplam '+rows.length+'">'+postCard(post,i<2)+'</section>').join('')+'</div></section>';
 const list=document.getElementById('pati-detail-list');
 if(!list)return;
 const target=[...list.querySelectorAll('[data-detail-post-id]')].find(el=>el.dataset.detailPostId===state.initialId);
 const destination=state.positioned?savedOffset:target?.offsetTop||0;
 const position=()=>{
  if(!list.isConnected||patiDetailState!==state)return;
  list.scrollTop=destination;
  state.positioned=true;
 };
 position();
 requestAnimationFrame(position);
 if(!old)requestAnimationFrame(()=>requestAnimationFrame(position));
}
function openPost(id){
 const origin=view;
 const options=(origin==='profile'||origin==='explore')?patiDetailCandidates(origin):[];
 const post=options.find(p=>p.id===id)||data.posts.find(p=>p.id===id);
 if(!post){notify('Bu paylaşım artık bulunamıyor.',true);return}
 if(blocked.has(post.author_id)){notify('Bu paylaşım görüntülenemiyor.',true);return}
 patiDetailState=options.some(p=>p.id===id)?{
  origin,rows:options,initialId:id,positioned:false,
  profileId,profilePostsTab,returnScroll:window.scrollY||0
 }:null;
 patiExploreReturnTo=view==='explore';selectedPostId=id;navigate('home');
}
let storyItems=[],storyIndex=0,storyTimer=null,storyLikes=[];
function patiPauseStoryBackgroundMedia(){
 document.querySelectorAll('video,audio').forEach(media=>{if(!media.closest('#story-overlay')){try{media.pause()}catch(_){}}});
 if(patiyizFeedActiveVideo){patiyizFeedActiveVideo.pause();patiyizFeedActiveVideo=null}
}
function closeStory(resume=true){
 clearTimeout(storyTimer);storyTimer=null;storyItems=[];
 document.getElementById('story-overlay')?.remove();document.body.classList.remove('story-fullscreen-open');
 if(!resume)return;
 if(view==='profile')render();else{setupFeedVideos();setupReelsViewer()}
}
async function recordStoryView(x){if(!me||x.pati_pet_highlight||x.author_id===me.id)return;try{const r=await sb.rpc('patiyiz_record_story_view',{p_story_id:x.id});if(r.error)console.warn('Hikâye görüntülemesi kaydedilemedi:',r.error.message)}catch(err){console.warn('Hikâye görüntüleme ağ hatası:',err)}}
async function showStoryViewers(){const x=storyItems[storyIndex];if(!x||x.author_id!==me.id)return;clearTimeout(storyTimer);const [vr,lr]=await Promise.all([sb.from('patiyiz_story_views').select('viewer_id,last_viewed_at').eq('story_id',x.id).order('last_viewed_at',{ascending:false}),sb.from('patiyiz_story_likes').select('user_id').eq('story_id',x.id)]);if(vr.error){notify('Görüntüleyenler yüklenemedi.',true);return}if(lr.error)console.warn('Hikâye beğenileri yüklenemedi:',lr.error.message);const liked=new Set((lr.data||[]).map(v=>v.user_id));const list=(vr.data||[]).map(v=>'<div class="story-view-user">'+avatar(profile(v.viewer_id),'s')+'<div><strong>'+displayName(profile(v.viewer_id))+'</strong><small>'+new Date(v.last_viewed_at).toLocaleString('tr-TR',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})+'</small></div>'+(liked.has(v.viewer_id)?'<span class="pati-story-view-like" title="Hikâyeni beğendi">♥</span>':'')+'</div>').join('');const sheet=document.getElementById('story-viewers-sheet');if(sheet){sheet.innerHTML='<header>Görüntüleyenler ('+(vr.data||[]).length+') · ♥ '+liked.size+' <button data-action="story-viewers-close">×</button></header>'+(list||'<p>Henüz görüntüleyen yok.</p>');sheet.hidden=false}}
function showStoryFrame(){const root=document.getElementById('story-overlay'),x=storyItems[storyIndex];if(!root||!x)return;clearTimeout(storyTimer);patiPauseStoryBackgroundMedia();const user=profile(x.author_id);const storyGroupItems=storyItems.filter(s=>s.author_id===x.author_id);const storyGroupIndex=storyGroupItems.findIndex(s=>s.id===x.id);if(!x.pati_pet_highlight)recordStoryView(x);if(!x.pati_pet_highlight&&x.author_id!==me.id)void syncStoryLike(x.id);root.innerHTML='<div class="story-player"><div class="story-progress">'+storyGroupItems.map((_,i)=>'<span class="story-track"><span class="'+(i===storyGroupIndex?'story-playing':'')+'" style="width:'+(i<storyGroupIndex?'100':'0')+'%"></span></span>').join('')+'</div><div class="story-player-head">'+avatar(user,'s')+'<strong>'+displayName(user)+'</strong><button data-action="story-close" aria-label="Kapat" class="story-close">×</button></div>'+(x.video_url?'<video class="story-big-video" src="'+esc(x.video_url)+'" poster="'+esc(x.image_url||'')+'" muted autoplay playsinline preload="auto" aria-label="Video hikâyesi"></video><button type="button" class="pati-story-sound" data-action="story-sound" aria-label="Hikâye sesini aç">Ses aç</button>':x.image_url?'<img class="story-big-photo" src="'+esc(x.image_url)+'" alt="Hikâye">':'<div class="pati-story-no-photo">🐾</div>')+''+(x.caption?'<p class="story-caption">'+esc(x.caption)+'</p>':'')+'<button class="story-hit prev" data-action="story-prev" aria-label="Önceki"></button><button class="story-hit next" data-action="story-next" aria-label="Sonraki"></button>'+(x.pati_pet_highlight?'<span class="pati-saved-story-label">Kalıcı hikâye</span>':x.author_id===me.id?'<button class="story-delete" data-action="story-delete" data-id="'+esc(x.id)+'">🗑 Sil</button><button class="story-viewers-button" data-action="story-viewers">👁 Hareketler</button>':'<button class="pati-story-like" data-action="story-like" data-id="'+esc(x.id)+'" aria-label="Hikâyeyi beğen">♡</button>')+'<div id="story-viewers-sheet" class="story-viewers-sheet" hidden></div></div>';const upcoming=storyItems[storyIndex+1];if(upcoming?.image_url&&typeof Image==='function'){const preload=new Image();preload.src=upcoming.image_url}storyTimer=setTimeout(()=>stepStory(1),x.video_url?15000:6000);
 if(x.video_url){
  const video=root.querySelector('.story-big-video');
  video?.addEventListener('loadedmetadata',()=>{
   if(storyItems[storyIndex]?.id!==x.id)return;
   clearTimeout(storyTimer);
   const duration=Number.isFinite(video.duration)?Math.min(15000,Math.max(5000,video.duration*1000)):15000;
   storyTimer=setTimeout(()=>stepStory(1),duration);
  },{once:true});
  video?.addEventListener('ended',()=>{if(storyItems[storyIndex]?.id===x.id){clearTimeout(storyTimer);stepStory(1)}},{once:true});
  video?.play?.()?.catch?.(()=>{});
 }
}
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
function patiBuildLiveStorySequence(selectedAuthor){
 const now=Date.now(),grouped=new Map();
 for(const item of data.stories){
  if(!item?.author_id||blocked.has(item.author_id)||new Date(item.expires_at).getTime()<=now)continue;
  if(!grouped.has(item.author_id))grouped.set(item.author_id,[]);
  grouped.get(item.author_id).push(item);
 }
 if(!grouped.has(selectedAuthor))return null;
 for(const entries of grouped.values())entries.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||String(a.id).localeCompare(String(b.id)));
 const authors=[...grouped.keys()].sort((a,b)=>{
  if(a===me.id)return -1;if(b===me.id)return 1;
  return new Date(grouped.get(b).at(-1).created_at)-new Date(grouped.get(a).at(-1).created_at)||String(a).localeCompare(String(b));
 });
 const items=authors.flatMap(id=>grouped.get(id));
 return {items,index:items.findIndex(x=>x.author_id===selectedAuthor)};
}
function openStory(id){
 const sequence=patiBuildLiveStorySequence(id);
 if(!sequence)return notify('Hikâye bulunamadı.');
 closeStory(false);storyItems=sequence.items;storyIndex=sequence.index;
 const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
 document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame();
}
function openHighlightStory(id){
 const x=data.stories.find(x=>x.id===id&&x.is_highlight);
 if(!x)return notify('Kalıcı hikâye bulunamadı.',true);
 closeStory(false);storyItems=[x];storyIndex=0;const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame();
}
function openPetHighlight(id){
 const pet=data.pets.find(x=>x.id===id);
 if(!pet)return notify('Patili dost bulunamadı.',true);
 closeStory(false);storyItems=[{id:'pet-'+pet.id,author_id:pet.owner_id,image_url:pet.photo_url||'',caption:[pet.name,pet.species,pet.breed].filter(Boolean).join(' · '),pati_pet_highlight:true,is_highlight:true}];storyIndex=0;
 const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame();
}
function openHighlightAlbum(id){
 const album=data.highlightAlbums.find(x=>x.id===id);if(!album)return notify('Albüm bulunamadı.',true);
 const ids=new Set(data.highlightItems.filter(x=>x.album_id===id).map(x=>x.story_id));
 const items=data.stories.filter(x=>ids.has(x.id)&&x.is_highlight).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 if(!items.length)return notify('Bu albümde görüntülenebilir hikâye yok.',true);
 closeStory(false);storyItems=items;storyIndex=0;
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
function openHighlights(id){const items=data.stories.filter(x=>x.author_id===id&&x.is_highlight).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));if(!items.length)return notify('Öne çıkan hikâye bulunamadı.');closeStory(false);storyItems=items;storyIndex=0;const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame()}
function stepStory(n){if(!storyItems.length)return;clearTimeout(storyTimer);if(document.getElementById('story-viewers-sheet')?.hidden===false&&n===1)return;const next=storyIndex+n;if(next<0){showStoryFrame();return}if(next>=storyItems.length){closeStory();return}storyIndex=next;showStoryFrame()}

const patiyizOnboardingThankYouUntil=new Map(),patiyizOnboardingDismissed=new Set();
function patiyizProgressCard(){
 const p=current()||{},followingCount=data.follows.filter(x=>x.follower_id===me.id).length;
 const tasks=[
  {label:'Profil fotoğrafını ekle',info:'Profilinde görünecek bir fotoğraf seç',done:!!p.avatar_url,action:'edit-profile'},
  {label:'Hakkında yazını tamamla',info:'Kendini topluluğa kısaca tanıt',done:!!String(p.bio||'').trim(),action:'edit-profile'},
  {label:'İlk paylaşımını yap',info:'Fotoğraf, video veya yazı paylaş',done:data.posts.some(x=>x.author_id===me.id),action:'compose'},
  {label:'İlk hikâyeni paylaş',info:'24 saatlik bir hikâye paylaş',done:data.stories.some(x=>x.author_id===me.id),action:'story-create'}
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
 const next=tasks.find(x=>!x.done);
 return '<details class="pati-progress-card pati-progress-compact" aria-label="Profil tamamlama görevleri"><summary class="pati-progress-top"><span class="pati-progress-flag">✓</span><div><strong>Profilini tamamla</strong><p>'+count+' / '+tasks.length+' görev · '+(next?esc(next.label):'Tamamlandı')+'</p></div><span class="pati-progress-count">'+count+'/'+tasks.length+'  ▾</span></summary><div class="pati-progress-track" role="progressbar" aria-label="Profil tamamlama ilerlemesi" aria-valuemin="0" aria-valuemax="'+tasks.length+'" aria-valuenow="'+count+'"><div style="width:'+(count/tasks.length*100)+'%"></div></div><div class="pati-progress-actions">'+tasks.map(x=>'<button type="button" class="pati-progress-action '+(x.done?'is-done':'is-pending')+'" data-action="'+x.action+'" aria-label="'+esc(x.label)+(x.done?' tamamlandı':' tamamlanmadı')+'"><span class="pati-task-check" aria-hidden="true">'+(x.done?'✓':'+')+'</span><span><b>'+esc(x.label)+'</b><small>'+esc(x.done?'Tamamlandı':x.info)+'</small></span><i aria-hidden="true">'+(x.done?'✓':'›')+'</i></button>').join('')+'</div><p class="pati-progress-optional">Evcil hayvan eklemek isteğe bağlıdır; <button type="button" data-action="pet-add">Patili dostunu ekle</button></p></details>';
}

let patiyizReelsObserver=null;
let patiyizReelsCleanup=null;
let patiyizReelsTap={post:'',time:0,timer:null};
// Native Android begins Reels with sound; the browser keeps muted autoplay.
let patiyizReelsSoundEnabled=typeof window!=='undefined'&&(window.PatiyizNative?.isNative===true||document.documentElement?.classList?.contains('patiyiz-ios-reels')===true);
function patiIsIOSStandaloneReels(){return document.documentElement?.classList?.contains('patiyiz-ios-reels')===true&&!window.PatiyizNative?.isNative}
function patiUpdateReelsSoundButton(button,video){
 if(!button||!video)return;
 const label=video.muted?'Sesi aç':'Sesi kapat';
 button.innerHTML=ico(video.muted?'volume-x':'volume')+'<span class="pati-reel-tool-label">'+label+'</span>';
 button.setAttribute('aria-label',label);
 button.setAttribute('aria-pressed',String(!video.muted));
}

function setupReelsViewer(){
 if(typeof patiyizReelsCleanup==='function'){patiyizReelsCleanup();patiyizReelsCleanup=null}
 if(patiyizReelsObserver){patiyizReelsObserver.disconnect();patiyizReelsObserver=null}
 const videos=[...document.querySelectorAll('#main-content .pati-reel-video')];
 if(!videos.length)return;
 const native=typeof window!=='undefined'&&window.PatiyizNative?.isNative===true;
 const iosHome=typeof patiIsIOSStandaloneReels==='function'&&patiIsIOSStandaloneReels();
 const viewport=document.querySelector('.pati-reels-viewport');
 const soundOn=()=>typeof patiyizReelsSoundEnabled==='boolean'?patiyizReelsSoundEnabled:native;
 let activeVideo=null;
 const ratios=new Map();
 const playVideo=video=>{
  if(document.getElementById?.('story-overlay')){video?.pause();return}
  if(activeVideo!==video){activeVideo?.pause();activeVideo=video}
  if(video.paused!==false)video.muted=!soundOn();
  if(video.paused!==false){
   const playing=video.play();
   playing?.catch?.(err=>{
    if(video!==activeVideo||document.hidden)return;
    // iOS Home Screen WebKit can reject audible autoplay. Keep scrolling usable:
    // fall back to silent autoplay and let the person enable sound with a tap.
    if(patiIsIOSStandaloneReels()&&!video.muted){
     video.muted=true;
     patiUpdateReelsSoundButton(video.closest?.('.pati-reel-item')?.querySelector('[data-action="reel-sound"]'),video);
     video.play().catch(e=>console.warn('iPhone Reels oynatılamadı:',e?.message||e));
     return;
    }
    console.warn('Reels otomatik oynatma engellendi:',err?.message||err);
   });
  }
 };
 if(!('IntersectionObserver' in window)){
  videos.forEach((video,i)=>{video.muted=!soundOn();if(i>0)video.pause()});
  if(!document.hidden)playVideo(videos[0]);
  return;
 }
 if(!native&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 patiyizReelsObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
   const video=entry.target;
   if(entry.isIntersecting&&video.preload==='none'){video.preload='metadata';if(video.readyState===0)video.load()}
   if(!entry.isIntersecting||entry.intersectionRatio<.01){
    ratios.delete(video);
    video.pause();
    delete video.dataset.manualPause;
    if(activeVideo===video)activeVideo=null;
   }else{
    ratios.set(video,entry.intersectionRatio);
    if(entry.intersectionRatio<.65&&video!==activeVideo)video.pause();
   }
  }
  if(document.hidden||document.getElementById?.('story-overlay')){activeVideo?.pause();return}
  let nextVideo=null,maxRatio=.64;
  for(const [video,ratio] of ratios){
   if(ratio>maxRatio){maxRatio=ratio;nextVideo=video}
  }
  if(iosHome&&viewport?.clientHeight){
   const index=Math.max(0,Math.min(videos.length-1,Math.round(viewport.scrollTop/viewport.clientHeight)));
   nextVideo=videos[index]||nextVideo;
  }
  if(nextVideo){
   if(nextVideo.dataset.manualPause){
    if(activeVideo&&activeVideo!==nextVideo)activeVideo.pause();
    activeVideo=nextVideo;
    nextVideo.pause();
   }else playVideo(nextVideo);
  }else if(activeVideo){activeVideo.pause();activeVideo=null}
 },{root:viewport,rootMargin:'70% 0px 70% 0px',threshold:[0,.25,.65,.9]});
 videos.forEach(v=>{
  patiyizReelsObserver.observe(v);
  const range=v.closest?.('.pati-reel-item')?.querySelector?.('[data-action="reel-seek"]');
  if(!range)return;
  const update=()=>{
   const ratio=Number.isFinite(v.duration)&&v.duration>0?Math.min(1,v.currentTime/v.duration):0;
   range.value=String(Math.round(ratio*1000));
   range.style?.setProperty?.('--pati-reel-progress',(ratio*100).toFixed(2)+'%');
  };
  v.addEventListener?.('timeupdate',update);
  v.addEventListener?.('loadedmetadata',update);
  v.addEventListener?.('durationchange',update);
  update();
 });
 // On iPhone, scroll-snap can settle without a new IntersectionObserver threshold.
 // Use the actual snapped slide as the authoritative active video.
 if(iosHome&&viewport?.addEventListener){
  let frame=0;
  const activate=()=>{
   if(document.hidden||!viewport.clientHeight||!videos.length)return;
   const index=Math.max(0,Math.min(videos.length-1,Math.round(viewport.scrollTop/viewport.clientHeight)));
   const selected=videos[index];
   for(const video of videos){
    if(video!==selected&&!video.paused)video.pause();
    if(video!==selected)delete video.dataset.manualPause;
   }
   if(selected.preload==='none'){selected.preload='metadata';if(selected.readyState===0)selected.load()}
   if(selected.dataset.manualPause){selected.pause();activeVideo=selected;return}
   playVideo(selected);
  };
  const onScroll=()=>{
   if(frame)return;
   if(typeof window.requestAnimationFrame==='function'){
    frame=window.requestAnimationFrame(()=>{frame=0;activate()});
   }else activate();
  };
  const onGestureEnd=()=>activate();
  viewport.addEventListener('scroll',onScroll,{passive:true});
  viewport.addEventListener('scrollend',onGestureEnd,{passive:true});
  viewport.addEventListener('touchend',onGestureEnd,{passive:true});
  patiyizReelsCleanup=()=>{
   viewport.removeEventListener('scroll',onScroll);
   viewport.removeEventListener('scrollend',onGestureEnd);
   viewport.removeEventListener('touchend',onGestureEnd);
   if(frame&&typeof window.cancelAnimationFrame==='function')window.cancelAnimationFrame(frame);
  };
  onScroll();
 }
}
function reelHandleTap(button){
 const item=button.closest('.pati-reel-item');
 const id=item?.dataset?.post;
 if(!id)return reelTogglePlay(button);
 const now=Date.now();
 if(patiyizReelsTap.post===id&&now-patiyizReelsTap.time<370){
  if(patiyizReelsTap.timer)clearTimeout(patiyizReelsTap.timer);
  patiyizReelsTap={post:'',time:0,timer:null};
  const heart=item.querySelector('.pati-reel-heart-burst');
  if(heart){heart.classList.remove('pop');void heart.offsetWidth;heart.classList.add('pop')}
  if(!liked.has(id))void togglePostLike(id);
  return;
 }
 if(patiyizReelsTap.timer)clearTimeout(patiyizReelsTap.timer);
 patiyizReelsTap={post:id,time:now,timer:null};
 const video=item.querySelector('video');
 if(video?.paused){reelTogglePlay(button);return}
 patiyizReelsTap.timer=setTimeout(()=>{
  if(patiyizReelsTap.post===id){
   patiyizReelsTap={post:'',time:0,timer:null};
   if(button.isConnected!==false&&!document.hidden)reelTogglePlay(button);
  }
 },390);
}
function reelTogglePlay(button){
 const video=button.closest('.pati-reel-item')?.querySelector('video');if(!video)return;
 if(video.paused){
  delete video.dataset.manualPause;
  document.querySelectorAll('#main-content .pati-reel-video').forEach(other=>{if(other!==video)other.pause()});
  video.muted=!patiyizReelsSoundEnabled;
  video.play().catch(()=>notify('Video oynatılamadı.',true));
 }else{video.dataset.manualPause='1';video.pause()}
}
function reelToggleSound(button){
 const video=button.closest('.pati-reel-item')?.querySelector('video');if(!video)return;
 patiyizReelsSoundEnabled=video.muted;
 video.muted=!patiyizReelsSoundEnabled;
 const update=()=>{
  const label=video.muted?'Sesi aç':'Sesi kapat';
  button.innerHTML=ico(video.muted?'volume-x':'volume')+'<span class="pati-reel-tool-label">'+label+'</span>';
  button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(!video.muted));
 };
 update();
 if(typeof document!=='undefined'&&document.documentElement?.classList?.contains('patiyiz-ios-reels')&&!video.muted&&typeof video.play==='function'){
  // Sound is explicitly enabled in the iOS Home Screen application by a tap.
  video.play().catch(err=>{
   console.warn('iOS sesli oynatma engellendi:',err?.message||err);
   video.muted=true;update();
  });
 }
}
// Standalone Reels feed: do not limit videos to the first page of general posts.
let patiReelsFeed={owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
const PATI_REELS_PAGE=30;
async function patiLoadMoreReels(reset=false){
 if(!me||!sb)return;
 const uid=me.id,token=patiyizLoadToken;
 if(reset||patiReelsFeed.owner!==uid)patiReelsFeed={owner:uid,rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
 const state=patiReelsFeed;if(state.loading||!state.hasMore)return;
 state.loading=true;state.error='';
 if(view==='reels'&&!state.ready)reelsPage();
 try{
  const response=await sb.from('posts').select('*').not('video_url','is',null)
   .order('created_at',{ascending:false}).order('id',{ascending:false})
   .range(state.offset,state.offset+PATI_REELS_PAGE-1);
  if(response.error)throw response.error;
  if(me?.id!==uid||patiyizLoadToken!==token||patiReelsFeed!==state)return;
  const rows=response.data||[],seen=new Set(state.rows.map(p=>p.id));
  for(const p of rows)if(!seen.has(p.id)){state.rows.push(p);seen.add(p.id)}
  state.offset+=rows.length;state.hasMore=rows.length===PATI_REELS_PAGE;state.ready=true;
  const known=new Set(data.posts.map(p=>p.id));
  for(const p of rows)if(!known.has(p.id)){data.posts.push(p);known.add(p.id)}
  const missing=[...new Set(rows.map(p=>p.author_id).filter(id=>id&&!data.profiles.some(v=>v.id===id)))];
  if(missing.length){
   const profiles=await sb.from('profiles').select('*').in('id',missing);
   if(profiles.error)throw profiles.error;
   if(me?.id!==uid||patiyizLoadToken!==token||patiReelsFeed!==state)return;
   const profilesSeen=new Set(data.profiles.map(p=>p.id));
   for(const p of profiles.data||[])if(!profilesSeen.has(p.id)){data.profiles.push(p);profilesSeen.add(p.id)}
  }
 }catch(error){
  if(me?.id===uid&&patiReelsFeed===state){state.error='Videolar yüklenemedi. Tekrar dene.';console.warn('Reels yükleme:',error?.message||error)}
 }finally{
  state.loading=false;
  if(me?.id===uid&&patiReelsFeed===state&&view==='reels'){render()}
 }
}
function reelsPage(){
 const nativeReels=typeof window!=='undefined'&&window.PatiyizNative?.isNative===true;
 const selfId=typeof me!=='undefined'?me?.id:'';
 const isFollowing=id=>typeof followed!=='undefined'&&followed.has(id);
 const followsMe=id=>typeof data!=='undefined'&&data.follows?.some(f=>f.follower_id===id&&f.followee_id===selfId);
 const soundOn=(nativeReels||(typeof patiIsIOSStandaloneReels==='function'&&patiIsIOSStandaloneReels()))&&patiyizReelsSoundEnabled;
 const page=typeof patiReelsFeed!=='undefined'&&patiReelsFeed.owner===selfId?patiReelsFeed:null;
 const source=page?.ready?[...page.rows,...data.posts]:data.posts;
 const items=[...new Map(source.map(p=>[p.id,p])).values()]
  .filter(x=>x.video_url&&!blocked.has(x.author_id))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
 main.innerHTML='<section class="pati-reels-head"><h1>Reels</h1><button type="button" data-action="pati-create-reels">'+ico('plus')+'<span>Video paylaş</span></button></section><div class="pati-reels-viewport">'+(items.length?items.map((p,index)=>{
  const cached=typeof patiPostRenderStats!=='undefined'&&patiPostRenderStats;
  const author=profile(p.author_id),count=cached?(cached.get(p.id)?.likes||0):data.likes.filter(x=>x.post_id===p.id).length,commentCount=cached?(cached.get(p.id)?.comments||0):data.comments.filter(x=>x.post_id===p.id).length,likedPost=liked.has(p.id),savedPost=saved.has(p.id);
  return '<article class="pati-reel-item" data-post="'+esc(p.id)+'"><video class="pati-reel-video" src="'+esc(p.video_url)+'"'+(p.video_cover_url?' poster="'+esc(p.video_cover_url)+'"':'')+' playsinline webkit-playsinline'+(nativeReels?'':' muted')+' loop preload="'+(index===0?'auto':index===1?'metadata':'none')+'" aria-label="'+esc(author.display_name)+' videosu"></video>'+
  '<button type="button" class="pati-reel-tap" data-action="reel-play" aria-label="Videoyu oynat veya durdur, çift dokunarak beğen"><span class="pati-reel-heart-burst" aria-hidden="true">'+ico('heart')+'</span></button>'+
  '<div class="pati-reel-author"><button type="button" class="pati-reel-avatar-link" data-action="view-user" data-id="'+esc(author.id)+'" aria-label="'+esc(author.display_name)+' profiline git">'+avatar(author,'s')+'</button><span><strong>'+displayName(author)+'</strong><small>@'+esc(author.handle||'patiyiz')+'</small></span>'+(p.author_id!==selfId?'<button type="button" class="pati-reel-follow" data-action="follow" data-id="'+esc(author.id)+'" aria-pressed="'+isFollowing(author.id)+'"'+(!isFollowing(author.id)&&followsMe(author.id)?' data-follow-back="true"':'')+'>'+(isFollowing(author.id)?'Takiptesin':followsMe(author.id)?'Sen de takip et':'Takip et')+'</button>':'')+'</div>'+
  '<div class="pati-reel-caption">'+esc(cut(p.video_subtitle||p.body||'',220))+'</div>'+
  '<div class="pati-reel-progress"><input type="range" min="0" max="1000" value="0" step="1" data-action="reel-seek" aria-label="Videoyu ileri veya geri sar" style="--pati-reel-progress:0%"></div>'+ 
  '<div class="pati-reel-rail"><button type="button" class="pati-reel-action '+(likedPost?'active':'')+'" data-action="like" data-id="'+esc(p.id)+'" aria-label="Beğen" aria-pressed="'+likedPost+'">'+ico('heart')+'<span class="pati-reel-count">'+count+'</span></button>'+
  '<button type="button" class="pati-reel-action" data-action="comment" data-id="'+esc(p.id)+'" aria-label="Yorum yap">'+ico('message-circle')+'<span class="pati-reel-count">'+commentCount+'</span></button>'+
  '<button type="button" class="pati-reel-action" data-action="share-post" data-id="'+esc(p.id)+'" aria-label="Paylaş">'+ico('send')+'<span class="pati-reel-action-label">Paylaş</span></button>'+
  '<button type="button" class="pati-reel-action '+(savedPost?'active':'')+'" data-action="save" data-id="'+esc(p.id)+'" aria-label="Kaydet" aria-pressed="'+savedPost+'">'+ico('bookmark')+'<span class="pati-reel-action-label">Kaydet</span></button>'+
  '<button type="button" data-action="reel-speed" class="pati-reel-tool" aria-label="Oynatma hızı 1×">'+ico('gauge')+'<span class="pati-reel-tool-label">1×</span></button>'+
  '<button type="button" data-action="reel-sound" class="pati-reel-tool" aria-label="'+(soundOn?'Sesi kapat':'Sesi aç')+'" aria-pressed="'+soundOn+'">'+ico(soundOn?'volume':'volume-x')+'<span class="pati-reel-tool-label">'+(soundOn?'Sesi kapat':'Sesi aç')+'</span></button></div></article>'
 }).join(''):'<div class="pati-reels-empty">'+(page?.loading?'Reels videoları yükleniyor…':'Henüz Reels yok. İlk videoyu sen paylaş!')+'</div>')+
 (page?.loading?'<div class="pati-reels-load-more" role="status">Videolar yükleniyor…</div>':
 page?.hasMore||page?.error?'<div class="pati-reels-load-more">'+(page?.error?'<p role="alert">'+esc(page.error)+'</p>':'')+'<button type="button" data-action="reels-more">'+(page?.error?'Tekrar dene':'Daha fazla Reels yükle')+'</button>'+'</div>':'')+'</div>';
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
// Reconcile exact per-post totals without rendering or reloading the playing videos.
function patiApplyHomePostCounts(id,row){
 if(typeof document==='undefined'||!row)return;
 const card=document.querySelector('.pati-feed-card[data-post-id="'+id+'"]');
 if(!card)return;
 const like=card.querySelector('[data-action="like"] span'),comment=card.querySelector('[data-action="comment"] span'),sum=card.querySelector('.pati-post-like-summary');
 if(like)like.textContent=String(row.like_count);
 if(comment)comment.textContent=String(row.comment_count);
 if(sum)sum.textContent=String(row.like_count)+' beğeni';
}
async function patiSyncHomePostCounts(posts){
 if(!me||!sb||view!=='home')return;
 const uid=me.id,token=patiyizLoadToken,now=Date.now();
 const ids=[...new Set((posts||[]).map(p=>p.id).filter(Boolean))].slice(0,240),missing=[];
 for(const id of ids){
  const cached=patiHomeCountCache.get(id);
  if(cached)patiApplyHomePostCounts(id,cached);
  if((!cached||now-cached.at>45000)&&!patiHomeCountsLoading.has(id)){patiHomeCountsLoading.add(id);missing.push(id)}
 }
 for(let i=0;i<missing.length;i+=60){
  const page=missing.slice(i,i+60);
  try{
   const result=await sb.rpc('patiyiz_feed_post_counts',{p_post_ids:page});
   if(result.error)throw result.error;
   if(me?.id!==uid||patiyizLoadToken!==token)return;
   for(const row of result.data||[]){
    const count={like_count:Number(row.like_count)||0,comment_count:Number(row.comment_count)||0,at:Date.now()};
    patiHomeCountCache.set(row.post_id,count);
    if(view==='home')patiApplyHomePostCounts(row.post_id,count);
   }
  }catch(error){console.warn('Akış sayaçları doğrulanamadı:',error?.message||error)}
  finally{for(const id of page)patiHomeCountsLoading.delete(id)}
 }
}
function homePage(){
 if(selectedPostId&&patiDetailState){patiDetailPage();return}
 const list=[...data.posts].filter(p=>!blocked.has(p.author_id)&&
  (typeof patiHomeFeedIds==='undefined'||!patiHomeFeedIds||patiHomeFeedIds.has(p.id)))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
 main.innerHTML=selectedPostId
  ?header('Paylaşım','Bildirimin ilgili olduğu paylaşım.',button('← Ana sayfaya dön','post-back'))+(list.find(p=>p.id===selectedPostId)?postCard(list.find(p=>p.id===selectedPostId)):empty('Paylaşım bulunamadı'))
  :storiesStrip()+'<div class="pati-feed-posts">'+(list.length?list.map((p,i)=>postCard(p,i<5)+(i===1?patiLeaderBoard():'' )).join('')+(list.length===1?patiLeaderBoard():''):empty(patiyizLoadedTables.has('posts')?'Henüz paylaşım yok':'Gönderiler yükleniyor…',patiyizLoadedTables.has('posts')?'İlk gönderiyi sen paylaş!':'Paylaşımların yeniden getiriliyor.'))+((typeof patiHomeLoadError!=='undefined'&&patiHomeLoadError)?'<div class="pati-load-more" role="alert">'+
  esc(patiHomeLoadError)+' '+button('Tekrar dene','home-retry')+'</div>':'')
 +(pageMore.posts&&!((typeof patiHomeLoadError!=='undefined'&&patiHomeLoadError))&&
  patiyizLoadedTables.has('posts')?'<div class="pati-load-more">'+button('Daha fazla paylaşım yükle','load-more','data-id="posts"')+'</div>':'')+'</div>';
 if(typeof patiSyncHomePostCounts==='function')void patiSyncHomePostCounts(selectedPostId?list.filter(p=>p.id===selectedPostId):list);
}

let savedPostsLoading=false;const savedMissingAttempted=new Set();
async function fetchMissingSavedPosts(){
 if(savedPostsLoading||!me)return;
 const ids=[...saved].filter(id=>!data.posts.some(p=>p.id===id)&&!savedMissingAttempted.has(id)).slice(0,100);
 if(!ids.length)return;
 savedPostsLoading=true;const uid=me.id;
 try{
  const r=await sb.from('posts').select('*').in('id',ids);
  if(r.error)throw r.error;
  if(me?.id!==uid)return;
  ids.forEach(id=>savedMissingAttempted.add(id));for(const post of r.data||[])if(!data.posts.some(p=>p.id===post.id))data.posts.push(post);
  if(view==='saved-posts')render();
 }catch(e){console.warn('Kaydedilen gönderilerin yüklenmesi:',e)}
 finally{savedPostsLoading=false}
}
function savedPostsPage(){
 const list=[...data.posts].filter(p=>saved.has(p.id)&&!blocked.has(p.author_id))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 main.innerHTML='<section class="pati-saved-posts"><div class="pati-saved-heading"><span>🔖 KİŞİSEL ARŞİV</span><h1>Kaydettiklerim</h1><p>Kaydettiğin gönderiler yalnızca hesabında görünür ve çıkış yapıp tekrar girdiğinde de saklanır.</p><small>'+saved.size+' kayıtlı paylaşım</small></div>'+
 '<div class="pati-feed-posts">'+(list.length?list.map((p,i)=>postCard(p,i<3)).join(''):'<p class="pati-saved-empty">Henüz kayıtlı gönderin yok. Akışta yer imi simgesine basarak bir paylaşımı kaydedebilirsin.</p>')+'</div></section>';
 void fetchMissingSavedPosts();
}


function patiExploreMetric(p){
 const m=patiExploreMetrics.get(p.id);return {likes:m?.likes??data.likes.filter(x=>x.post_id===p.id).length,views:m?.views??(patiPostViewCounts.get(p.id)||0)}
}
function patiExploreScore(p,mode){
 const m=patiExploreMetric(p),age=Math.max(0,(Date.now()-new Date(p.created_at).getTime())/86400000);
 if(mode==='likes')return m.likes;
 if(mode==='views')return m.views;
 if(mode==='recent')return 0;
 return m.likes*8+m.views*.35+Math.max(0,14-Math.min(age,14))*.18;
}
async function patiExploreLoadMetrics(posts,uid,token){
 const ids=[...new Set(posts.map(p=>p.id).filter(Boolean))];if(!ids.length)return;
 try{
  const [vr,lr]=await Promise.all([sb.from('patiyiz_post_view_totals').select('post_id,view_count').in('post_id',ids),sb.from('post_likes').select('post_id').in('post_id',ids).limit(5000)]);
  if(me?.id!==uid||patiyizLoadToken!==token)return;
  if(vr.error||lr.error)throw vr.error||lr.error;
  const views=new Map((vr.data||[]).map(r=>[r.post_id,Number(r.view_count)||0])),likes=new Map();
  for(const row of lr.data||[])likes.set(row.post_id,(likes.get(row.post_id)||0)+1);
  for(const id of ids)patiExploreMetrics.set(id,{views:views.get(id)||0,likes:likes.get(id)||0});
  if(view==='explore'&&exploreTab==='media')explorePage();
 }catch(e){console.warn('Keşfet popülerlik verileri:',e?.message||e)}
}
async function patiExploreLoadMedia(reset=false){
 if(!me||!sb)return;
 const uid=me.id,token=patiyizLoadToken;
 const selectedSort=typeof patiExploreSort==='string'?patiExploreSort:'popular';
 if(reset||patiExploreMedia.owner!==uid||patiExploreMedia.sort!==selectedSort)patiExploreMedia={owner:uid,sort:selectedSort,rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''};
 const state=patiExploreMedia;
 if(state.loading||!state.hasMore)return;
 state.loading=true;state.error='';
 if(view==='explore'&&exploreTab==='media')explorePage();
 try{
  let result=await sb.rpc('patiyiz_explore_ranked',{p_sort:state.sort,p_limit:PATI_EXPLORE_MEDIA_PAGE,p_offset:state.offset});
  if(result.error?.code==='PGRST202'||result.error?.code==='42883'){
   result=await sb.from('posts').select('*').or('image_url.not.is.null,video_url.not.is.null')
    .order('created_at',{ascending:false}).order('id',{ascending:false}).range(state.offset,state.offset+PATI_EXPLORE_MEDIA_PAGE-1);
  }
  if(result.error)throw result.error;
  if(me?.id!==uid||token!==patiyizLoadToken||patiExploreMedia!==state)return;
  const rows=result.data||[],existing=new Set(state.rows.map(p=>p.id));
  for(const p of rows)if(!existing.has(p.id)){state.rows.push(p);existing.add(p.id)}
  state.offset+=rows.length;state.hasMore=rows.length===PATI_EXPLORE_MEDIA_PAGE;state.ready=true;
  const known=new Set(data.posts.map(p=>p.id));
  for(const p of rows)if(!known.has(p.id)){data.posts.push(p);known.add(p.id)}
  if(typeof patiExploreLoadMetrics==='function')void patiExploreLoadMetrics(rows,uid,token);
  const missing=[...new Set(rows.map(p=>p.author_id).filter(id=>id&&!data.profiles.some(p=>p.id===id)))];
  if(missing.length){
   const r=await sb.from('profiles').select('*').in('id',missing);
   if(r.error)throw r.error;
   if(me?.id!==uid||token!==patiyizLoadToken||patiExploreMedia!==state)return;
   const present=new Set(data.profiles.map(p=>p.id));
   for(const p of r.data||[])if(!present.has(p.id)){data.profiles.push(p);present.add(p.id)}
  }
 }catch(error){if(me?.id===uid&&patiExploreMedia===state){state.error='Keşfet yüklenemedi. Tekrar dene.';console.warn('Keşfet:',error?.message||error)}}
 finally{state.loading=false;if(me?.id===uid&&patiExploreMedia===state&&view==='explore'&&exploreTab==='media')explorePage()}
}
async function patiExploreLookup(query=''){
 if(!me||!sb)return;
 const uid=me.id,token=patiyizLoadToken,q=String(query).trim().slice(0,50);
 const state={owner:uid,query:q,rows:[],ready:false,loading:true,error:''};patiExploreUsers=state;
 try{
  const safe=q.replace(/[%_,()]/g,'');
  const requests=safe.length>=2?[
   sb.from('profiles').select('*').ilike('handle','%'+safe+'%').limit(60),
   sb.from('profiles').select('*').ilike('display_name','%'+safe+'%').limit(60)
  ]:[sb.from('profiles').select('*').order('created_at',{ascending:false}).limit(60)];
  const answers=await Promise.all(requests);
  if(me?.id!==uid||token!==patiyizLoadToken||patiExploreUsers!==state)return;
  for(const answer of answers)if(answer.error)throw answer.error;
  const found=new Map();
  for(const answer of answers)for(const p of answer.data||[])if(p.id!==uid&&!blocked.has(p.id))found.set(p.id,p);
  state.rows=[...found.values()];state.ready=true;
  const existing=new Set(data.profiles.map(p=>p.id));
  for(const p of state.rows)if(!existing.has(p.id)){data.profiles.push(p);existing.add(p.id)}
 }catch(error){if(me?.id===uid&&patiExploreUsers===state){state.error='Arama tamamlanamadı. Yeniden dene.';console.warn('Profil araması:',error?.message||error)}}
 finally{
  state.loading=false;
  if(me?.id===uid&&patiExploreUsers===state&&view==='explore'&&exploreTab==='users'){
   const input=document.getElementById('explore-search'),focus=document.activeElement===input,pos=input?.selectionStart??q.length;
   explorePage();
   const next=document.getElementById('explore-search');
   if(next&&focus){next.focus({preventScroll:true});try{next.setSelectionRange(pos,pos)}catch(_){}}
  }
 }
}
function patiExploreQueueSearch(){
 if(patiExploreSearchTimer)clearTimeout(patiExploreSearchTimer);
 patiExploreSearchTimer=setTimeout(()=>{patiExploreSearchTimer=null;if(view==='explore'&&exploreTab==='users')void patiExploreLookup(search)},320);
}
function patiExploreLazyVideos(){
 if(typeof IntersectionObserver==='undefined')return;
 const items=[...main.querySelectorAll('.pati-explore-media-screen video[data-explore-preview]')];
 if(!items.length)return;
 items.forEach(video=>video.addEventListener('loadeddata',()=>video.classList.add('is-ready'),{once:true}));
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){
  const video=entry.target;if(video.preload==='none'){video.preload='metadata';video.load?.()}observer.unobserve(video)
 }},{rootMargin:'720px 0px'});
 items.forEach(video=>observer.observe(video));
}
function explorePage(){
 if(exploreTab==='users'){
  const q=String(search||'').trim().toLocaleLowerCase('tr-TR');
  const remote=typeof patiExploreUsers!=='undefined'&&patiExploreUsers.owner===me.id&&patiExploreUsers.query===String(search).trim().slice(0,50)?patiExploreUsers:null;
  const source=remote?.ready?[...remote.rows,...data.profiles]:data.profiles;
  const users=[...new Map(source.map(p=>[p.id,p])).values()].filter(p=>p.id!==me.id&&!blocked.has(p.id)&&(String(p.handle||'')+' '+String(p.display_name||'')+' '+String(p.city||'')).toLocaleLowerCase('tr-TR').includes(q))
   .sort((a,b)=>Number(followed.has(b.id))-Number(followed.has(a.id))||String(a.handle||a.display_name||'').localeCompare(String(b.handle||b.display_name||''),'tr'));
  main.innerHTML='<section class="pati-search-screen" aria-label="Kullanıcı ara"><form class="pati-search-top" id="pati-explore-form"><label class="pati-search-field">'+ico('search')+'<input type="search" id="explore-search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Kullanıcı ara" value="'+esc(search)+'" aria-label="Kullanıcı ara" autofocus></label><button type="button" class="pati-search-cancel" data-action="pati-search-cancel">İptal</button></form>'+
   '<div class="pati-search-results" aria-live="polite">'+(remote?.loading?'<p class="pati-search-empty" role="status">Kullanıcılar aranıyor…</p>':'')+
   (remote?.error?'<p class="pati-search-empty" role="alert">'+esc(remote.error)+'</p>'+button('Tekrar dene','explore-search-retry'):'')+(users.length?users.slice(0,150).map(p=>'<button type="button" class="pati-search-user" data-action="view-user" data-id="'+esc(p.id)+'">'+avatar(p,'l')+'<span class="pati-search-user-info"><strong>'+esc(p.handle||p.display_name||'Patiyiz üyesi')+'</strong><small>'+esc(p.display_name||'Patiyiz üyesi')+(followed.has(p.id)?' · Takiptesin':'')+'</small></span></button>').join(''):'<p class="pati-search-empty">'+(q?'Bu isimle eşleşen profil yok.':'Henüz görüntülenebilen profil yok.')+'</p>')+'</div>'+
   '<button type="button" class="pati-search-discover" data-action="pati-search-discover">Fotoğraf, video ve patili dostları keşfet '+ico('arrow')+'</button></section>';
  return;
 }
 if(exploreTab==='media'){
   const selectedSort=typeof patiExploreSort==='string'?patiExploreSort:'popular';
  const page=typeof patiExploreMedia!=='undefined'&&patiExploreMedia.owner===me.id?patiExploreMedia:null;
  const source=page?.ready?page.rows:data.posts;
  const media=[...new Map(source.map(p=>[p.id,p])).values()].filter(p=>!blocked.has(p.author_id)&&(p.image_url||p.images?.length||p.video_url))
   .sort((a,b)=>page?.ready?0:((typeof patiExploreScore==='function'?patiExploreScore(b,selectedSort)-patiExploreScore(a,selectedSort):0)||new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id))));
  const tiles=media.map((p,i)=>{
   const photo=p.image_url||(p.images||[])[0],video=!!p.video_url;
   const preview=photo?'<img src="'+esc(photo)+'" loading="'+(i<6?'eager':'lazy')+'" decoding="async" '+(i<3?'fetchpriority="high"':'')+' alt="Paylaşım">':
    p.video_cover_url?'<img src="'+esc(p.video_cover_url)+'" loading="'+(i<6?'eager':'lazy')+'" decoding="async" '+(i<3?'fetchpriority="high"':'')+' alt="Reels kapağı">':
    '<video class="pati-explore-preview-video" src="'+esc(p.video_url)+'#t=0.1" muted playsinline preload="'+(i<3?'metadata':'none')+'" data-explore-preview="1" aria-label="Video önizlemesi"></video>';
   return '<button type="button" class="pati-explore-media" data-action="explore-open-post" data-id="'+esc(p.id)+'" aria-label="Paylaşımı aç">'+preview+(video?'<span class="pati-explore-video-icon">'+ico('up')+'</span>':'')+'</button>';
  }).join('');
  main.innerHTML='<section class="pati-explore-media-screen" aria-label="Keşfet gönderileri"><button type="button" class="pati-explore-search-launch" data-action="pati-search-open" aria-label="Kullanıcı ara">'+ico('search')+'<span>Kullanıcı ara</span></button>'+'<div class="pati-explore-sort" role="group" aria-label="Keşfet sıralaması">'+[['popular','Öne çıkanlar'],['views','Çok izlenen'],['likes','Çok beğenilen'],['recent','En yeni']].map(([mode,label])=>'<button type="button" class="'+(selectedSort===mode?'active':'')+'" aria-pressed="'+(selectedSort===mode)+'" data-action="explore-sort" data-id="'+mode+'">'+label+'</button>').join('')+'</div>'+
   (media.length?'<div class="pati-explore-gallery">'+tiles+'</div>':page?.loading?'<p class="pati-search-empty" role="status">Paylaşımlar yükleniyor…</p>':empty('Henüz fotoğraf veya video yok','İlk paylaşımı sen yap!'))+
   (page?.error?'<p class="pati-search-empty" role="alert">'+esc(page.error)+'</p>':'')+
   (page?.loading?'<p class="pati-search-empty" role="status">Yeni paylaşımlar getiriliyor…</p>':page?.hasMore||page?.error?'<div class="pati-explore-load-more">'+button(page.error?'Tekrar dene':'Daha fazla paylaşım yükle','explore-more')+'</div>':'')+'</section>';
  if(typeof patiExploreLazyVideos==='function')patiExploreLazyVideos();
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
// Community lists are scoped to this page instead of the global capped bootstrap.
let patiCommunityPage={owner:'',category:'',rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''};
const patiCommunityReplyPages=new Map();
const PATI_COMMUNITY_PAGE=40,PATI_COMMUNITY_REPLY_PAGE=60;
async function patiLoadCommunity(reset=false){
 if(!me||!sb)return;
 const uid=me.id,token=patiyizLoadToken,category=communityCategory;
 if(reset||patiCommunityPage.owner!==uid||patiCommunityPage.category!==category)
  patiCommunityPage={owner:uid,category,rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''};
 const state=patiCommunityPage;if(state.loading||!state.hasMore)return;
 state.loading=true;state.error='';
 try{
  let query=sb.from('questions').select('*');
  if(category!=='Tümü')query=query.eq('category',category);
  const result=await query.order('created_at',{ascending:false}).order('id',{ascending:false})
   .range(state.offset,state.offset+PATI_COMMUNITY_PAGE-1);
  if(result.error)throw result.error;
  if(me?.id!==uid||patiyizLoadToken!==token||patiCommunityPage!==state)return;
  const rows=result.data||[],seen=new Set(state.rows.map(q=>q.id));
  for(const q of rows)if(!seen.has(q.id)){state.rows.push(q);seen.add(q.id)}
  state.offset+=rows.length;state.hasMore=rows.length===PATI_COMMUNITY_PAGE;state.ready=true;
  const known=new Set(data.questions.map(q=>q.id));
  for(const q of rows)if(!known.has(q.id)){data.questions.push(q);known.add(q.id)}
  const missing=[...new Set(rows.map(q=>q.author_id).filter(id=>id&&!data.profiles.some(p=>p.id===id)))];
  if(missing.length){
   const profiles=await sb.from('profiles').select('*').in('id',missing);
   if(profiles.error)throw profiles.error;
   if(me?.id!==uid||patiyizLoadToken!==token||patiCommunityPage!==state)return;
   const present=new Set(data.profiles.map(p=>p.id));
   for(const profile of profiles.data||[])if(!present.has(profile.id)){data.profiles.push(profile);present.add(profile.id)}
  }
 }catch(error){
  if(me?.id===uid&&patiCommunityPage===state){state.error='Sorular yüklenemedi. Tekrar dene.';console.warn('Topluluk soruları:',error?.message||error)}
 }finally{
  state.loading=false;
  if(me?.id===uid&&patiCommunityPage===state&&view==='community')communityPage();
 }
}
async function patiLoadQuestionReplies(questionId,more=false){
 if(!me||!sb||!questionId)return;
 const uid=me.id,token=patiyizLoadToken,key=uid+':'+questionId;
 let state=patiCommunityReplyPages.get(key);
 if(!state){state={rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''};patiCommunityReplyPages.set(key,state)}
 if(state.loading||!state.hasMore)return;
 state.loading=true;state.error='';
 try{
  const result=await sb.from('replies').select('*').eq('question_id',questionId)
   .order('created_at',{ascending:false}).order('id',{ascending:false})
   .range(state.offset,state.offset+PATI_COMMUNITY_REPLY_PAGE-1);
  if(result.error)throw result.error;
  if(me?.id!==uid||token!==patiyizLoadToken||patiCommunityReplyPages.get(key)!==state)return;
  const rows=result.data||[],seen=new Set(state.rows.map(r=>r.id));
  for(const row of rows)if(!seen.has(row.id)){state.rows.push(row);seen.add(row.id)}
  state.offset+=rows.length;state.hasMore=rows.length===PATI_COMMUNITY_REPLY_PAGE;state.ready=true;
  const existing=new Set(data.replies.map(r=>r.id));
  for(const row of rows)if(!existing.has(row.id)){data.replies.push(row);existing.add(row.id)}
 }catch(error){
  if(me?.id===uid&&patiCommunityReplyPages.get(key)===state){state.error='Cevaplar yüklenemedi. Tekrar dene.';console.warn('Topluluk cevapları:',error?.message||error)}
 }finally{
  state.loading=false;
  if(me?.id===uid&&patiCommunityReplyPages.get(key)===state&&document.querySelector('#reply-form')?.dataset.question===questionId)questionReplies(questionId);
 }
}
function communityPage(){
 const categories=['Tümü','Genel','Sağlık','Beslenme','Eğitim','Davranış','Bakım','Diğer'];
 const page=typeof patiCommunityPage!=='undefined'&&patiCommunityPage.owner===me.id&&patiCommunityPage.category===communityCategory?patiCommunityPage:null;
 const source=page?.ready?page.rows:data.questions;
 const qs=[...source].filter(q=>!blocked.has(q.author_id)&&(communityCategory==='Tümü'||q.category===communityCategory))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
 main.innerHTML=header('Topluluk','Sorular, yanıtlar ve hayvansever deneyimleri.',button('+ Soru sor','question'))+
 '<div class="pati-filter-tabs">'+categories.map(cat=>'<button type="button" data-action="community-filter" data-id="'+esc(cat)+'" class="'+(communityCategory===cat?'active':'')+'" aria-pressed="'+(communityCategory===cat)+'">'+esc(cat)+'</button>').join('')+'</div>'+
 '<div class="pati-list">'+qs.map(q=>{
  const rs=patiCommunityReplyPages.get(me.id+':'+q.id);
  const replyCount=rs?.ready?rs.rows.length+(rs.hasMore?'+':''):data.replies.filter(r=>r.question_id===q.id).length;
  return '<article class="pati-card"><div class="pati-row between">'+userRow(q.author_id,day(q.created_at))+'<span class="pati-pill">'+esc(q.category)+'</span></div><h3 style="margin-top:13px">'+esc(q.title)+'</h3><p>'+esc(q.body)+'</p><div class="pati-actionbar"><button data-action="vote" data-id="'+q.id+'" class="'+(voted.has(q.id)?'active':'')+'">▲ '+data.votes.filter(x=>x.question_id===q.id).length+' Faydalı</button><button data-action="replies" data-id="'+q.id+'">💬 '+replyCount+' cevap</button>'+
  (q.author_id===me.id?'<button class="danger" data-action="delete-question" data-id="'+q.id+'">Sil</button>':'<button data-action="report" data-id="'+q.id+'" data-kind="question">Bildir</button>')+'</div></article>'
 }).join('')+'</div>'+
 (page?.error?'<p class="pati-note" role="alert">'+esc(page.error)+'</p>':'')+
 (page?.loading?'<p class="pati-note" role="status">Sorular yükleniyor…</p>':page?.hasMore||page?.error?'<div class="pati-load-more">'+button(page.error?'Yeniden dene':'Daha fazla soru yükle','community-more')+'</div>':'')+
 (!qs.length&&!page?.loading&&!page?.error?empty('Henüz soru yok','İlk soruyu sen sorabilirsin.'):'');
}
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

/* Private pet health file: storage and records require owner-only Supabase RLS. */
let healthFilePortal=null,healthFileOwner='';
function healthFilePage(){
 if(!me||!sb||!window.PatiyizHealthFile){main.innerHTML=empty('Sağlık dosyası açılamadı','Giriş yapıp yeniden dene.');return}
 if(!healthFilePortal||healthFileOwner!==me.id){
  healthFileOwner=me.id;
  healthFilePortal=window.PatiyizHealthFile.create({
   sb,getUser:()=>me,getPets:()=>data.pets,
   getReminders:()=>patiWellness.reminders,getWeights:()=>patiWellness.weights,
   esc,notify,onChange:()=>{if((view==='healthfile'||(view==='my-pet'&&patiMyPetTab==='healthfile'))&&healthFileOwner===me?.id)render()}
  });
 }
 main.innerHTML=healthFilePortal.render();
 if(!healthFilePortal.state.attempted&&!healthFilePortal.state.loading)void healthFilePortal.load();
 if(!patiWellness.loaded&&!patiWellness.loading)void patiWellnessFetch();
}
let patiMyPetTab='care';
function patiMyPetCenterPage(){
 const tabs=[['care','Bakım takvimi','calendar'],['wellness','Hayvan sağlığı','heart'],['healthfile','Sağlık dosyası','library']];
 if(patiMyPetTab==='wellness')patiWellnessPage();
 else if(patiMyPetTab==='healthfile')healthFilePage();
 else carePage();
 const shell=document.createElement('section');shell.className='pati-pet-center-head';
 shell.innerHTML='<div class="pati-pet-center-intro"><small>PATIYIZ · HAYVANIM</small><h1>Hayvanım</h1><p>Bakım, hatırlatmalar ve sağlık kayıtların tek yerde.</p></div><nav class="pati-pet-center-tabs" aria-label="Hayvanım bölümleri">'+tabs.map(([key,title])=>'<button type="button" data-action="pati-my-pet-tab" data-id="'+key+'" aria-current="'+(patiMyPetTab===key?'page':'false')+'" class="'+(patiMyPetTab===key?'active':'')+'">'+title+'</button>').join('')+'</nav>';
 main.prepend(shell);
}
let educationStatus='Tümü',educationBackScroll=0;
function educationRecentKey(){return 'patiyiz-edu-recent-'+(me?.id||'guest')}
function educationRemember(id){
 if(!patiyizLessons.some(l=>l.id===id))return;
 try{localStorage.setItem(educationRecentKey(),id)}catch(_){}
}
function educationResumeId(completed){
 let last='';
 try{last=localStorage.getItem(educationRecentKey())||''}catch(_){}
 const recent=patiyizLessons.find(l=>l.id===last);
 return recent&&!completed.has(last)?last:patiyizLessons.find(l=>!completed.has(l.id))?.id||'';
}
function educationFold(value){return String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim()}
function educationFiltered(completed){
 const query=educationFold(educationSearch);
 return patiyizLessons.filter(l=>(educationCategory==='Tümü'||l.cat===educationCategory)
  &&(educationStatus==='Tümü'||(educationStatus==='Tamamlananlar'?completed.has(l.id):!completed.has(l.id)))
  &&(!query||educationFold([l.name,l.desc,l.cat,...l.parts].join(' ')).includes(query)));
}
function educationCards(list,completed){
 if(!list.length)return '<div class="edu-v2-empty" role="status"><span aria-hidden="true">🔎</span><h3>Bu filtrelerde ders bulunamadı</h3><p>Başka bir konu seçebilir veya aramayı temizleyebilirsin.</p><button type="button" data-action="education-reset">Filtreleri temizle</button></div>';
 return list.map(l=>{
  const done=completed.has(l.id),idx=patiyizLessons.findIndex(x=>x.id===l.id)+1;
  return '<button type="button" class="pati-edu-card edu-v2-card" data-action="education-open" data-id="'+esc(l.id)+'" aria-label="'+esc(l.name)+(done?', tamamlandı':'')+'">'
   +'<span class="pati-edu-emoji" aria-hidden="true">'+esc(l.icon)+'</span>'
   +'<span class="pati-edu-card-body"><small>Ders '+idx+' · '+esc(l.cat)+' · '+Number(l.minutes)+' dk</small><strong>'+esc(l.name)+'</strong><span>'+esc(l.desc)+'</span></span>'
   +'<b class="pati-edu-status'+(done?' is-complete':'')+'">'+(done?'✓ Tamamlandı':'Derse başla →')+'</b></button>';
 }).join('');
}
function educationUpdateResults(){
 if(view!=='education'||educationLesson)return;
 const completed=educationDone(),list=educationFiltered(completed);
 const grid=document.getElementById('pati-edu-result-list'),count=document.getElementById('pati-edu-results-count');
 if(grid)grid.innerHTML=educationCards(list,completed);
 if(count)count.textContent=list.length+' ders';
}
function educationPage(){
 const completed=educationDone(),completedCount=patiyizLessons.filter(l=>completed.has(l.id)).length;
 const progress=Math.round(completedCount*100/patiyizLessons.length),remaining=patiyizLessons.length-completedCount;
 if(educationLesson){
  const l=patiyizLessons.find(x=>x.id===educationLesson);
  if(!l){educationLesson='';educationPage();return}
  const index=patiyizLessons.findIndex(x=>x.id===l.id),next=patiyizLessons[index+1],prev=patiyizLessons[index-1],done=completed.has(l.id);
  const chosen=done?l.answer:educationAnswer[l.id],passed=chosen===l.answer;
  main.innerHTML='<section class="pati-edu pati-edu-v2 edu-v2-detail"><button type="button" class="pati-edu-back" data-action="education-back">← Eğitimlere dön</button>'
  +'<div class="edu-v2-lesson-meta"><span>Ders '+(index+1)+' / '+patiyizLessons.length+'</span><span>'+esc(l.cat)+' · '+Number(l.minutes)+' dk</span><span class="'+(done?'edu-v2-complete':'')+'">'+(done?'✓ Tamamlandı':'Henüz tamamlanmadı')+'</span></div>'
  +'<div class="edu-v2-lesson-track" role="progressbar" aria-label="Ders sırası" aria-valuemin="0" aria-valuemax="'+patiyizLessons.length+'" aria-valuenow="'+(index+1)+'"><span style="width:'+((index+1)*100/patiyizLessons.length).toFixed(2)+'%"></span></div>'
  +'<div class="pati-edu-lesson-head"><span aria-hidden="true">'+esc(l.icon)+'</span><div><small>'+esc(l.cat)+' · '+Number(l.minutes)+' dakikalık ders</small><h1>'+esc(l.name)+'</h1><p>'+esc(l.desc)+'</p></div></div>'
  +'<div class="pati-edu-lesson-body"><div class="edu-v2-chapter-head"><h2>Bu derste öğreneceklerin</h2><small>'+l.parts.length+' bölüm</small></div>'
  +l.parts.map((part,i)=>'<section class="pati-edu-step"><b>'+(i+1)+'</b><p>'+esc(part)+'</p></section>').join('')
  +'<div class="pati-edu-quiz"><span class="edu-v2-quiz-kicker">MİNİ SINAV</span><strong>Bilgini test et</strong><p>'+esc(l.q)+'</p>'
  +l.opts.map((o,i)=>'<button type="button" class="'+(chosen===i?'selected':'')+(passed&&i===l.answer?' edu-v2-correct':'')+'" data-action="education-answer" data-id="'+esc(l.id)+'" data-choice="'+i+'" aria-pressed="'+String(chosen===i)+'"'+(passed?' disabled':'')+'><span class="edu-v2-answer-marker" aria-hidden="true">'+String.fromCharCode(65+i)+'</span>'+esc(o)+'</button>').join('')
  +(chosen!==undefined?'<p class="pati-edu-feedback '+(passed?'edu-v2-success':'edu-v2-try-again')+'" role="status">'+(passed?'✓ Doğru cevap! Ders tamamlandı ve ilerlemene eklendi.':'Bu yanıt doğru değil. Yeniden deneyebilirsin.')+'</p>':'<p class="edu-v2-quiz-hint">Dersi tamamlamak için doğru yanıtı seç.</p>')+'</div>'
  +'<div class="pati-edu-next edu-v2-lesson-nav">'+(prev?'<button type="button" class="edu-v2-previous" data-action="education-previous" data-id="'+esc(prev.id)+'">← Önceki ders</button>':'<span></span>')
  +(next?'<button type="button" data-action="education-next" data-id="'+esc(next.id)+'">Sıradaki ders →</button>':'<button type="button" data-action="education-back">Tüm derslere dön ✓</button>')+'</div>'
  +'<p class="pati-edu-notice">Eğitim amaçlıdır; veteriner muayenesi ve kişisel uzman görüşünün yerini almaz.</p></div></section>';
  return;
 }
 const list=educationFiltered(completed),duration=patiyizLessons.reduce((n,l)=>n+Number(l.minutes||0),0),resume=educationResumeId(completed);
 const categories=['Tümü',...new Set(patiyizLessons.map(l=>l.cat))];
 main.innerHTML='<section class="pati-edu pati-edu-v2">'
  +'<div class="pati-edu-hero edu-v2-hero"><span>PATİYİZ · EĞİTİM</span><h1>Patili dostunu daha iyi tanı.</h1><p>10 konuda 101 ücretsiz ders, mini sınavlar ve kişisel öğrenme ilerlemen.</p>'
  +'<div class="pati-edu-summary"><b>'+completedCount+' / '+patiyizLessons.length+'</b><small>ders tamamlandı</small></div>'
  +'<div class="pati-edu-progressbar" role="progressbar" aria-label="Akademi tamamlanma oranı" aria-valuenow="'+progress+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+progress+'%"></span></div>'
  +'<p class="pati-edu-progress-text">İlerlemen %'+progress+' · Kalan '+remaining+' ders</p></div>'
  +'<div class="edu-v2-stats" aria-label="Eğitim özeti"><div><strong>'+patiyizLessons.length+'</strong><span>Toplam ders</span></div><div><strong>'+completedCount+'</strong><span>Tamamlanan</span></div><div><strong>'+duration+' dk</strong><span>Toplam içerik</span></div></div>'
  +'<div class="edu-v2-quick-actions">'+(resume?'<button type="button" class="edu-v2-resume" data-action="education-continue" data-id="'+esc(resume)+'">▶ Kaldığın yerden devam et</button>':'<span class="pati-edu-all-done">✓ Tüm dersleri tamamladın!</span>')
  +'</div>'
  +'<p class="edu-v2-sync">'+(educationCloudUser===me?.id?'✓ İlerlemen hesabınla eşitlendi.':'İlerlemen cihazında saklanır; bağlantı olduğunda hesabınla eşitlenir.')+'</p>'
  +'<div class="edu-v2-discovery"><div class="edu-v2-discovery-head"><h2>Eğitimleri keşfet</h2><span>'+patiyizLessons.length+' ders</span></div>'
  +'<div class="pati-edu-learning-toolbar"><label class="pati-edu-search-label" for="pati-academy-search">Ders ara</label><input id="pati-academy-search" type="search" placeholder="Derslerde ara: kedi, bakım, beslenme..." value="'+esc(educationSearch)+'" autocomplete="off" aria-controls="pati-edu-result-list" aria-label="Akademi derslerinde ara">'
  +'<button type="button" data-action="education-clear" aria-label="Ders aramasını temizle">Temizle</button></div>'
  +'<div class="edu-v2-filter-title"><strong>Ders durumu</strong></div><div class="edu-v2-status-filters" role="group" aria-label="Ders durumu">'
  +['Tümü','Tamamlanmayanlar','Tamamlananlar'].map(t=>'<button type="button" class="'+(educationStatus===t?'active':'')+'" data-action="education-status" data-id="'+esc(t)+'" aria-pressed="'+String(educationStatus===t)+'">'+esc(t)+'</button>').join('')+'</div>'
  +'<div class="edu-v2-filter-title"><strong>Konular</strong></div><div class="pati-edu-categories" role="group" aria-label="Ders kategorileri">'
  +categories.map(t=>'<button type="button" class="'+(educationCategory===t?'active':'')+'" data-action="education-filter" data-id="'+esc(t)+'" aria-pressed="'+String(educationCategory===t)+'">'+esc(t)+'</button>').join('')+'</div>'
  +'<div class="edu-v2-results-head"><h3>Dersler</h3><span id="pati-edu-results-count" role="status" aria-live="polite">'+list.length+' ders</span></div>'
  +'<div class="pati-edu-grid" id="pati-edu-result-list">'+educationCards(list,completed)+'</div>'
  +'</div><p class="pati-edu-notice">Eğitimler genel bilgi amaçlıdır. Acil sağlık durumlarında veteriner hekime başvur.</p></section>';
}
/* Private pet wellness and public verified activity ranking */
let patiWellness={reminders:[],weights:[],loaded:false,loading:false,notified:new Set(),error:''};
let patiWellnessTab='active';
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
  patiWellness={...patiWellness,reminders:a.data||[],weights:b.data||[],loaded:true,error:''};
  if(view==='wellness'||(view==='my-pet'&&patiMyPetTab==='wellness'))render();
  patiWellnessAlerts();
  if(!patiWellnessHeartbeat){
   patiWellnessHeartbeat=true;
   window.setInterval(()=>{if(me&&document.visibilityState==='visible')patiWellnessAlerts()},60000);
  }
 }catch(e){console.warn('Bakım takvimi yüklenemedi:',e);if(me?.id===uid){patiWellness.error='Sağlık kayıtları yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.';if(view==='wellness'||(view==='my-pet'&&patiMyPetTab==='wellness'))render()}if(!silent)notify('Sağlık takvimi yüklenemedi: '+friendly(e),true)}
 finally{patiWellness.loading=false}
}
function patiWellnessDayKey(){return new Date().toLocaleDateString('sv-SE')}
function patiWellnessValidDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value}
function patiWellnessDateLocal(raw){
 const d=new Date(raw);if(!Number.isFinite(d.getTime()))return '';
 const offset=d.getTimezoneOffset();return new Date(d.getTime()-offset*60000).toISOString().slice(0,16);
}
function patiWellnessRemindersFor(petId,status=patiWellnessTab){
 const now=Date.now();
 return patiWellness.reminders.filter(x=>x.pet_id===petId
  &&(status==='all'||(status==='completed'?!!x.completed_at:status==='late'?!x.completed_at&&Date.parse(x.due_at)<now:!x.completed_at)))
  .sort((a,b)=>Number(!!a.completed_at)-Number(!!b.completed_at)||Date.parse(a.due_at)-Date.parse(b.due_at));
}
function patiWellnessWeightHistory(petId){
 return patiWellness.weights.filter(w=>w.pet_id===petId)
  .sort((a,b)=>String(b.measured_on).localeCompare(String(a.measured_on))||String(b.id).localeCompare(String(a.id)));
}
function patiWellnessPage(){
 if(!patiWellness.loaded&&!patiWellness.loading&&!patiWellness.error)void patiWellnessFetch(true);
 const pets=patiWellnessOwnedPets();
 const selectedId=patiWellnessPetId&&pets.some(p=>p.id===patiWellnessPetId)?patiWellnessPetId:pets[0]?.id||'';
 patiWellnessPetId=selectedId;
 const all=patiWellness.reminders.filter(x=>x.pet_id===selectedId);
 const open=all.filter(x=>!x.completed_at),late=open.filter(x=>Date.parse(x.due_at)<Date.now()),done=all.filter(x=>x.completed_at);
 const weights=patiWellnessWeightHistory(selectedId),latest=weights[0],previous=weights[1];
 const diff=latest&&previous?Number(latest.weight_kg)-Number(previous.weight_kg):null;
 const viewItems=patiWellnessRemindersFor(selectedId);
 const icons={vaccine:'💉',vet:'🩺',food:'🥣',medicine:'💊'};
 const cards=viewItems.map(x=>{
  const past=Date.parse(x.due_at)<Date.now(),finished=!!x.completed_at;
  const when=Number.isFinite(Date.parse(x.due_at))?new Date(x.due_at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'}):'Tarih bilinmiyor';
  return '<article class="pati-wellness-event wellness-v2-event'+(finished?' is-finished':'')+'"><span class="pati-wellness-event-icon" aria-hidden="true">'+(icons[x.kind]||'🐾')+'</span>'
   +'<div class="wellness-v2-event-main"><div class="wellness-v2-event-flags"><span>'+esc(patiReminderNames[x.kind]||'Bakım')+'</span><b class="'+(finished?'is-completed':past?'is-overdue':'is-planned')+'">'+(finished?'✓ Tamamlandı':past?'Gecikti':'Planlandı')+'</b></div>'
   +'<strong>'+esc(x.title)+'</strong><small>📅 '+esc(when)+'</small>'
   +(x.note?'<p class="wellness-v2-note">'+esc(x.note)+'</p>':'')
   +(x.repeat_days?'<span class="wellness-v2-repeat">↻ '+Number(x.repeat_days)+' günde bir tekrarlanır</span>':'')+'</div>'
   +'<div class="pati-wellness-event-actions">'+(!finished?'<button type="button" data-action="wellness-reminder-done" data-id="'+esc(x.id)+'">✓ Tamamla</button><button type="button" data-action="wellness-reminder-edit" data-id="'+esc(x.id)+'">Düzenle</button>':'')
   +'<button type="button" data-action="wellness-reminder-delete" data-id="'+esc(x.id)+'" class="wellness-v2-delete" aria-label="Hatırlatmayı sil">Sil</button></div></article>';
 }).join('');
 const weightRows=weights.slice(0,30).map(w=>'<div class="pati-wellness-weight-row"><span>'+esc(day(w.measured_on))+'</span><div><strong>'+Number(w.weight_kg).toLocaleString('tr-TR',{maximumFractionDigits:2})+' kg</strong>'+(w.note?'<small>'+esc(w.note)+'</small>':'')+'</div><div class="wellness-v2-weight-actions"><button type="button" data-action="wellness-weight-edit" data-id="'+esc(w.id)+'">Düzenle</button><button type="button" data-action="wellness-weight-delete" data-id="'+esc(w.id)+'">Sil</button></div></div>').join('');
 main.innerHTML='<section class="pati-wellness-page wellness-v2">'
  +'<div class="pati-wellness-heading"><span>PATİYİZ · HAYVAN SAĞLIĞI</span><h1>Hayvan Sağlığı & Takvimi</h1><p>Aşı, veteriner randevusu, ilaç ve beslenme hatırlatmaları ile kilo geçmişi.</p></div>'
  +(patiWellness.error?'<div class="wellness-v2-error" role="alert">'+esc(patiWellness.error)+' <button type="button" data-action="wellness-refresh">Tekrar dene</button></div>':'')
  +(pets.length?'<div class="pati-wellness-pet-tabs" role="group" aria-label="Hayvan profili">'+pets.map(p=>'<button type="button" data-action="wellness-pet" data-id="'+esc(p.id)+'" class="'+(p.id===selectedId?'active':'')+'" aria-pressed="'+String(p.id===selectedId)+'">'+esc(p.name)+'</button>').join('')+'</div>'
  +'<div class="pati-wellness-actions"><button type="button" data-action="wellness-reminder-add">＋ Hatırlatma oluştur</button><button type="button" data-action="wellness-weight-add">＋ Kilo ölçümü ekle</button></div>'
  +'<div class="pati-wellness-summary"><div><small>Aktif hatırlatma</small><strong>'+open.length+'</strong></div><div><small>Geciken</small><strong>'+late.length+'</strong></div><div><small>Son ölçüm</small><strong>'+(latest?Number(latest.weight_kg).toLocaleString('tr-TR')+' kg':'—')+'</strong></div><div><small>Kilo farkı</small><strong>'+(diff!==null?(diff>0?'+':'')+diff.toFixed(2)+' kg':'—')+'</strong></div></div>'
  +'<div class="wellness-v2-heading-row"><h2>Sağlık hatırlatmaları</h2><button type="button" data-action="wellness-refresh"'+(patiWellness.loading?' disabled':'')+'>'+(patiWellness.loading?'Yenileniyor…':'↻ Yenile')+'</button></div>'
  +'<div class="wellness-v2-filters" role="group" aria-label="Hatırlatma durumu">'+[['active','Aktif ('+open.length+')'],['late','Geciken ('+late.length+')'],['completed','Tamamlanan ('+done.length+')'],['all','Tümü ('+all.length+')']].map(([key,label])=>'<button type="button" data-action="wellness-filter" data-id="'+key+'" class="'+(patiWellnessTab===key?'active':'')+'" aria-pressed="'+String(patiWellnessTab===key)+'">'+label+'</button>').join('')+'</div>'
  +'<div class="pati-wellness-events">'+(patiWellness.loading&&!patiWellness.loaded?'<p class="pati-wellness-empty" role="status">Sağlık kayıtları yükleniyor…</p>':cards||'<p class="pati-wellness-empty">Bu durumda hatırlatma bulunamadı.</p>')+'</div>'
  +'<div class="wellness-v2-heading-row"><h2>Kilo geçmişi</h2><span>'+weights.length+' kayıt</span></div>'
  +'<div class="pati-wellness-weights">'+(weightRows||'<p class="pati-wellness-empty">Henüz kilo ölçümü eklenmedi.</p>')+'</div>'
  +'<p class="pati-wellness-disclaimer">Bu kayıtlar bilgilendirme ve kişisel takip içindir; veteriner muayenesinin yerini almaz. Uygulama açık ve çevrimiçiyken yaklaşan hatırlatmaları gösterebilir. Bildirimler bölümünden telefon bildirimlerine izin verirsen zamanı geldiğinde uygulama kapalıyken de bildirim gönderilebilir; teslimat cihaz, bağlantı ve izin koşullarına bağlıdır, garanti edilmez. Acil sağlık sorunlarında veteriner hekime başvur.</p>'
  :'<div class="pati-wellness-empty-card"><h2>Önce patili dostunu ekle 🐾</h2><p>Sağlık ve kilo takibi için hayvan profili gerekli.</p><button type="button" data-action="pet-add">＋ Hayvan ekle</button></div>')
  +'</section>';
}
function patiWellnessReminderDialog(existing){
 if(!patiWellnessOwnedPets().length)return notify('Önce hayvan profili ekle.',true);
 if(existing&&(!patiWellness.reminders.some(x=>x.id===existing.id)||existing.completed_at||!patiWellnessOwnedPets().some(p=>p.id===existing.pet_id)))return notify('Bu hatırlatma düzenlenemez.',true);
 const future=new Date(Date.now()+86400000);
 const dateLocal=existing?patiWellnessDateLocal(existing.due_at):patiWellnessDateLocal(future);
 const one=(key,value)=>String(key)===String(value)?' selected':'';
 modal(existing?'Hatırlatmayı düzenle':'Yeni sağlık hatırlatması',patiPetSelector()+
 '<label class="pati-wellness-field">Hatırlatma türü<select name="kind">'+Object.entries(patiReminderNames).map(([k,v])=>'<option value="'+esc(k)+'"'+one(k,existing?.kind||'vaccine')+'>'+esc(v)+'</option>').join('')+'</select></label>'+
 '<label class="pati-wellness-field">Başlık<input name="title" required minlength="2" maxlength="110" value="'+esc(existing?.title||'')+'" placeholder="Örn. Karma aşı, veteriner, akşam maması"></label>'+
 '<label class="pati-wellness-field">Tarih ve saat<input type="datetime-local" name="due_at" required value="'+esc(dateLocal)+'"></label>'+
 '<label class="pati-wellness-field">Ne kadar önce hatırlat?<select name="remind_minutes_before">'+[[0,'Zamanında'],[30,'30 dakika önce'],[60,'1 saat önce'],[1440,'1 gün önce'],[2880,'2 gün önce']].map(([v,name])=>'<option value="'+v+'"'+one(v,existing?.remind_minutes_before??60)+'>'+name+'</option>').join('')+'</select></label>'+
 '<label class="pati-wellness-field">Tekrar<select name="repeat_days">'+[[null,'Bir kere'],[1,'Her gün'],[7,'Her hafta'],[30,'30 günde bir'],[365,'Her yıl']].map(([v,name])=>'<option value="'+(v??'')+'"'+one(v??'',existing?.repeat_days??'')+'>'+name+'</option>').join('')+'</select></label>'+
 '<label class="pati-wellness-field">Not (isteğe bağlı)<textarea name="note" maxlength="500" rows="2" placeholder="Veteriner tavsiyesi, gerekli bakım bilgisi vb.">'+esc(existing?.note||'')+'</textarea></label>'+
 '<p class="wellness-v2-form-hint">Tıbbi doz ve tedavi kararlarını yalnızca veteriner hekiminle belirle.</p>','wellness-reminder-form');
 const form=document.getElementById('wellness-reminder-form');form.dataset.edit=existing?.id||'';
 const select=form.querySelector('select[name="pet_id"]');if(select)select.value=existing?.pet_id||patiWellnessPetId||patiWellnessOwnedPets()[0].id;
 form.querySelector('.modal-footer button[type="submit"]').textContent=existing?'Hatırlatmayı kaydet':'Hatırlatma oluştur';
}
function patiWellnessWeightDialog(existing){
 if(!patiWellnessOwnedPets().length)return notify('Önce hayvan profili ekle.',true);
 if(existing&&(!patiWellness.weights.some(x=>x.id===existing.id)||!patiWellnessOwnedPets().some(p=>p.id===existing.pet_id)))return notify('Bu kilo kaydı düzenlenemez.',true);
 modal(existing?'Kilo ölçümünü düzenle':'Kilo ölçümü kaydet',patiPetSelector()+
 '<label class="pati-wellness-field">Kilo (kg)<input name="weight_kg" type="number" min="0.01" max="300" step="0.01" required value="'+esc(existing?.weight_kg||'')+'" placeholder="Örn. 4.20"></label>'+
 '<label class="pati-wellness-field">Ölçüm tarihi<input name="measured_on" type="date" required max="'+patiWellnessDayKey()+'" value="'+esc(existing?.measured_on||patiWellnessDayKey())+'"></label>'+
 '<label class="pati-wellness-field">Not (isteğe bağlı)<input name="note" maxlength="250" value="'+esc(existing?.note||'')+'" placeholder="Örn. Veteriner kontrolü"></label>','wellness-weight-form');
 const form=document.getElementById('wellness-weight-form');form.dataset.edit=existing?.id||'';
 const select=form.querySelector('select[name="pet_id"]');if(select)select.value=existing?.pet_id||patiWellnessPetId||patiWellnessOwnedPets()[0].id;
 form.querySelector('.modal-footer button[type="submit"]').textContent=existing?'Ölçümü kaydet':'Kilo kaydet';
}
function patiWellnessValidateReminder(rec){
 if(!patiWellnessOwnedPets().some(p=>p.id===rec.pet_id))throw Error('Kendi hayvanını seç.');
 if(!Object.prototype.hasOwnProperty.call(patiReminderNames,rec.kind))throw Error('Geçerli hatırlatma türü seç.');
 if(rec.title.length<2||rec.title.length>110||rec.note.length>500)throw Error('Hatırlatma adı 2–110 karakter, not en fazla 500 karakter olmalı.');
 if(!Number.isFinite(Date.parse(rec.due_at)))throw Error('Geçerli hatırlatma tarihi seç.');
 if(![0,30,60,1440,2880].includes(rec.remind_minutes_before))throw Error('Geçerli bildirim öncesi zaman seç.');
 if(rec.repeat_days!==null&&![1,7,30,365].includes(rec.repeat_days))throw Error('Geçerli tekrar aralığı seç.');
 return rec;
}
function patiWellnessValidateWeight(rec){
 if(!patiWellnessOwnedPets().some(p=>p.id===rec.pet_id))throw Error('Kendi hayvanını seç.');
 if(!Number.isFinite(rec.weight_kg)||rec.weight_kg<=0||rec.weight_kg>300)throw Error('Kilo 0–300 kg arasında olmalı.');
 if(!patiWellnessValidDate(rec.measured_on)||rec.measured_on>patiWellnessDayKey())throw Error('Ölçüm tarihi geçersiz veya gelecekte.');
 if(rec.note.length>250)throw Error('Not en fazla 250 karakter olmalı.');
 return rec;
}
async function patiWellnessSaveReminder(form,str){
 const d=new Date(str('due_at'));if(!Number.isFinite(d.getTime()))throw Error('Hatırlatma tarihi geçersiz.');
 const editId=form.dataset.edit||'';
 if(editId&&!patiWellness.reminders.some(x=>x.id===editId&&!x.completed_at&&patiWellnessOwnedPets().some(p=>p.id===x.pet_id)))throw Error('Bu hatırlatmayı düzenleme yetkin yok.');
 const rec=patiWellnessValidateReminder({pet_id:str('pet_id'),kind:str('kind'),title:str('title'),note:str('note'),due_at:d.toISOString(),remind_minutes_before:Number(str('remind_minutes_before')),repeat_days:str('repeat_days')?Number(str('repeat_days')):null});
 if(!editId)rec.owner_id=me.id;
 const r=editId?await sb.from('patiyiz_pet_reminders').update(rec).eq('id',editId).eq('owner_id',me.id).is('completed_at',null).select('*'):
  await sb.from('patiyiz_pet_reminders').insert(rec).select('*');
 if(r.error)throw r.error;
 if(!r.data?.length)throw Error('Hatırlatma kaydedilemedi veya düzenleme yetkin yok.');
 patiWellness.notified.delete(r.data[0].id);
 closeModal(true);await patiWellnessFetch(true);notify(editId?'Hatırlatma güncellendi.':'Hatırlatma kaydedildi.');
}
async function patiWellnessSaveWeight(form,str){
 const editId=form.dataset.edit||'';
 if(editId&&!patiWellness.weights.some(x=>x.id===editId&&patiWellnessOwnedPets().some(p=>p.id===x.pet_id)))throw Error('Bu kilo kaydını düzenleme yetkin yok.');
 const rec=patiWellnessValidateWeight({pet_id:str('pet_id'),weight_kg:Number(str('weight_kg')),measured_on:str('measured_on'),note:str('note')});
 if(!editId)rec.owner_id=me.id;
 const r=editId?await sb.from('patiyiz_pet_weights').update(rec).eq('id',editId).eq('owner_id',me.id).select('*'):
  await sb.from('patiyiz_pet_weights').insert(rec).select('*');
 if(r.error)throw r.error;
 if(!r.data?.length)throw Error('Kilo kaydı kaydedilemedi veya değiştirme yetkin yok.');
 closeModal(true);await patiWellnessFetch(true);notify(editId?'Kilo kaydı güncellendi.':'Kilo ölçümü kaydedildi.');
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
 const tableReminders=table==='patiyiz_pet_reminders',tableWeights=table==='patiyiz_pet_weights';
 if(!tableReminders&&!tableWeights)return;
 const list=tableReminders?patiWellness.reminders:patiWellness.weights;
 if(!list.some(x=>x.id===id&&patiWellnessOwnedPets().some(p=>p.id===x.pet_id)))return notify('Bu kaydı silme yetkin yok.',true);
 if(!confirm('Bu sağlık kaydını kalıcı olarak silmek istiyor musun?'))return;
 await run(async()=>{
  const r=await sb.from(table).delete().eq('id',id).eq('owner_id',me.id).select('id');
  if(r.error)throw r.error;
  if(!r.data?.length)throw Error('Kayıt silinemedi veya hesap yetkin yok.');
  if(tableReminders)patiWellness.notified.delete(id);
  await patiWellnessFetch(true);notify('Sağlık kaydı silindi.');
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

let patiPetsState={owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
const PATI_PETS_PAGE=30;
async function patiLoadCommunityPets(reset=false){
 if(!me||!sb)return;
 const uid=me.id,token=patiyizLoadToken;
 if(reset||patiPetsState.owner!==uid)patiPetsState={owner:uid,rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
 const state=patiPetsState;if(state.loading||!state.hasMore)return;
 state.loading=true;state.error='';
 try{
  const response=await sb.from('pets').select('*').neq('owner_id',uid)
   .order('created_at',{ascending:false}).order('id',{ascending:false})
   .range(state.offset,state.offset+PATI_PETS_PAGE-1);
  if(response.error)throw response.error;
  if(me?.id!==uid||patiyizLoadToken!==token||patiPetsState!==state)return;
  const rows=response.data||[],seen=new Set(state.rows.map(row=>row.id));
  for(const row of rows)if(!seen.has(row.id)){state.rows.push(row);seen.add(row.id)}
  state.offset+=rows.length;state.hasMore=rows.length===PATI_PETS_PAGE;state.ready=true;
  const known=new Set(data.pets.map(row=>row.id));
  for(const row of rows)if(!known.has(row.id)){data.pets.push(row);known.add(row.id)}
  const missing=[...new Set(rows.map(row=>row.owner_id).filter(id=>id&&!data.profiles.some(p=>p.id===id)))];
  if(missing.length){
   const profiles=await sb.from('profiles').select('*').in('id',missing);
   if(profiles.error)throw profiles.error;
   if(me?.id!==uid||patiyizLoadToken!==token||patiPetsState!==state)return;
   const existing=new Set(data.profiles.map(p=>p.id));
   for(const p of profiles.data||[])if(!existing.has(p.id)){data.profiles.push(p);existing.add(p.id)}
  }
 }catch(error){
  if(me?.id===uid&&patiPetsState===state){state.error='Patiler yüklenemedi. Tekrar deneyebilirsin.';console.warn('Patiler:',error?.message||error)}
 }finally{
  state.loading=false;
  if(me?.id===uid&&patiPetsState===state&&view==='pets')petsPage();
 }
}
let patiOwnPetsRequest=0,patiPetPhotoObjectUrl='';
async function patiLoadOwnedPets(){
 if(!me||!sb)return;
 const uid=me.id,token=patiyizLoadToken,request=++patiOwnPetsRequest;
 try{
  const response=await sb.from('pets').select('*').eq('owner_id',uid).order('created_at',{ascending:false}).limit(200);
  if(response.error)throw response.error;
  if(me?.id!==uid||patiyizLoadToken!==token||request!==patiOwnPetsRequest)return;
  data.pets=[...data.pets.filter(p=>p.owner_id!==uid),...(response.data||[])];
  if(view==='pets')petsPage();
 }catch(error){if(me?.id===uid)console.warn('Hayvanlarım yüklenemedi:',error?.message||error)}
}
function petsPage(){
 const own=data.pets.filter(p=>p.owner_id===me.id);
 const state=typeof patiPetsState!=='undefined'&&patiPetsState.owner===me.id?patiPetsState:null;
 const source=state?.ready?[...state.rows,...data.pets]:data.pets;
 const others=[...new Map(source.map(p=>[p.id,p])).values()]
  .filter(p=>p.owner_id!==me.id&&!blocked.has(p.owner_id))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
 const petItem=(p,i,editable=false)=>'<div class="pati-pet-list-item"><button type="button" class="pati-pets-tile" data-action="view-user" data-id="'+esc(p.owner_id)+'" aria-label="'+esc(p.name||'Patili dost')+' sahibinin profilini aç">'+
 '<div class="pati-pets-photo">'+(p.photo_url?'<img src="'+esc(p.photo_url)+'" alt="'+esc(p.name||'Patili dost')+'" loading="'+(i<6?'eager':'lazy')+'" decoding="async">':'<span>'+petIcon(p.species)+'</span>')+'</div>'+
 '<div class="pati-pets-info"><strong>'+esc(p.name||'Patili dost')+'</strong><small>'+esc(p.species||'Hayvan')+(p.breed?' · '+esc(p.breed):'')+'</small></div></button>'+
 (editable?'<button type="button" class="pati-pets-edit" data-action="pet-edit" data-id="'+esc(p.id)+'" aria-label="'+esc(p.name||'Patili dost')+' düzenle">'+ico('edit')+' Düzenle</button>':'')+'</div>';
 main.innerHTML='<section class="pati-pets-page"><div class="pati-pets-heading"><div><h1>Patiler</h1><p>Topluluğumuzdaki patili dostlarla tanış.</p></div><button type="button" class="pati-pets-add" data-action="pet-add" aria-label="Patili dost ekle">'+ico('plus')+' Hayvan ekle</button></div>'+
 '<h2>Benim Patilerim</h2><div class="pati-pets-grid">'+(own.length?own.map((p,i)=>petItem(p,i,true)).join(''):'<p class="pati-pets-empty">Henüz hayvan profili eklemedin.</p>')+'</div>'+
 '<h2>Topluluktaki Patiler</h2><div class="pati-pets-grid">'+(others.length?others.map((p,i)=>petItem(p,i+own.length)).join(''):state?.loading?'<p class="pati-pets-empty" role="status">Patiler yükleniyor…</p>':'<p class="pati-pets-empty">Henüz başka patili dost bulunmuyor.</p>')+'</div>'+
 (state?.error?'<p role="alert" class="pati-pets-empty">'+esc(state.error)+'</p>':'')+
 (state?.loading?'<p class="pati-pets-empty" role="status">Yeni patiler getiriliyor…</p>':state?.hasMore||state?.error?'<div class="pati-load-more">'+button(state.error?'Yeniden dene':'Daha fazla pati yükle','pets-more')+'</div>':'')+'</section>';
}
let kbCategory='Tümü',kbListScroll=0;
const kbSpeciesOptions=['Tümü','Kedi','Köpek','Kuş','Tavşan','Balık','Kemirgen','Genel','Kaydedilenler'];
function kbCategoryOptions(){return ['Tümü',...new Set(knowledge.map(a=>a.category).filter(Boolean))].sort((a,b)=>a==='Tümü'?-1:b==='Tümü'?1:a.localeCompare(b,'tr'))}
function kbFold(value){return String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim()}
function kbSavedCount(){return knowledge.filter(a=>favorites.has(a.id)).length}
function kbResults(){
 const q=kbFold(kbSearch);
 return knowledge.filter(a=>(kbFilter==='Tümü'||kbFilter==='Kaydedilenler'||a.species===kbFilter)
  &&(kbFilter!=='Kaydedilenler'||favorites.has(a.id))
  &&(kbCategory==='Tümü'||a.category===kbCategory)
  &&(!q||kbFold([a.title,a.excerpt,a.species,a.category,a.content,...(a.tips||[])].join(' ')).includes(q)));
}
function kbCards(items){
 if(!items.length){
  const title=kbFilter==='Kaydedilenler'&&!kbSavedCount()?'Henüz kaydettiğin rehber yok':'Aradığın rehberi bulamadık';
  const detail=kbFilter==='Kaydedilenler'&&!kbSavedCount()?'Beğendiğin rehberleri yer işaretiyle kaydet; burada kolayca bul.':'Başka kelimeler veya filtreler deneyebilirsin.';
  return '<div class="kb-v2-empty" role="status"><span aria-hidden="true">🔎</span><h3>'+title+'</h3><p>'+detail+'</p><button type="button" data-action="kb-reset">Filtreleri temizle</button></div>';
 }
 return items.map(a=>{
  const isSaved=favorites.has(a.id);
  return '<article class="kb-v2-card"><button type="button" class="kb-v2-card-open" data-action="kb-read" data-id="'+esc(a.id)+'" aria-label="'+esc(a.title)+' rehberini oku">'
   +'<span class="kb-v2-card-symbol" aria-hidden="true">'+petIcon(a.species)+'</span>'
   +'<span class="kb-v2-card-type">'+esc(a.species)+' · '+esc(a.category)+'</span>'
   +'<strong>'+esc(a.title)+'</strong><span class="kb-v2-card-excerpt">'+esc(a.excerpt)+'</span>'
   +'<span class="kb-v2-read">Rehberi oku <span aria-hidden="true">→</span></span></button>'
   +'<button type="button" class="kb-v2-save'+(isSaved?' is-saved':'')+'" data-action="kb-save" data-id="'+esc(a.id)+'" aria-pressed="'+String(isSaved)+'" aria-label="'+esc(a.title)+(isSaved?' kayıtlardan çıkar':' kaydet')+'" title="'+(isSaved?'Kaydı kaldır':'Kaydet')+'">'+(isSaved?'♥':'♡')+'</button></article>';
 }).join('');
}
function kbUpdateResults(){
 if(view!=='knowledge'||articleId)return;
 const items=kbResults(),grid=document.getElementById('kb-results'),count=document.getElementById('kb-count');
 if(grid)grid.innerHTML=kbCards(items);
 if(count)count.textContent=items.length+' rehber bulundu';
 const saved=document.getElementById('kb-saved-count');if(saved)saved.textContent=kbSavedCount();
}
function knowledgePage(){
 if(articleId){
  const a=knowledge.find(x=>x.id===articleId);
  if(!a){articleId='';knowledgePage();return}
  const source=window.PATIYIZ_SOURCES?.[a.source];
  const sourceUrl=Array.isArray(source)&&/^https:\/\//.test(source[1])?source[1]:'https://www.merckvetmanual.com/';
  const sourceName=Array.isArray(source)&&source[0]?source[0]:'Veteriner bilgi kaynağı';
  const saved=favorites.has(a.id);
  main.innerHTML='<section class="kb-v2 kb-v2-detail"><button type="button" class="kb-v2-back" data-action="knowledge-back" aria-label="Rehber listesine dön">← Bilgi Merkezi</button>'
   +'<article class="kb-v2-article"><header class="kb-v2-article-head"><span class="kb-v2-eyebrow">'+petIcon(a.species)+' '+esc(a.species)+' / '+esc(a.category)+'</span>'
   +'<h1>'+esc(a.title)+'</h1><p>'+esc(a.excerpt)+'</p><div class="kb-v2-detail-actions"><button type="button" class="kb-v2-detail-save'+(saved?' is-saved':'')+'" data-action="kb-save" data-id="'+esc(a.id)+'" aria-pressed="'+String(saved)+'">'+(saved?'♥ Kaydedildi':'♡ Rehberi kaydet')+'</button></div></header>'
   +'<div class="kb-v2-article-body"><h2>Bilmen gerekenler</h2><p class="kb-v2-longtext">'+esc(a.content)+'</p>'
   +'<h2>Pratik öneriler</h2><ul>'+((a.tips||[]).map(t=>'<li>'+esc(t)+'</li>').join(''))+'</ul>'
   +practicalGuide(a)
   +'<aside class="kb-v2-disclaimer"><strong>Önemli bilgilendirme</strong><p>Bu rehber genel bilgi amaçlıdır; veteriner hekim muayenesi, teşhisi veya tedavisinin yerini almaz. Acil durumlarda veteriner hekime başvur.</p></aside>'
   +'<div class="kb-v2-source"><span>Kaynak: '+esc(sourceName)+'</span><a href="'+esc(sourceUrl)+'" target="_blank" rel="noopener noreferrer">Kaynağı incele ↗</a></div></div></article></section>';
  return;
 }
 const total=knowledge.length,saved=kbSavedCount(),items=kbResults();
 main.innerHTML='<section class="kb-v2"><div class="kb-v2-title"><div><span class="kb-v2-subtitle">PATİYİZ REHBERLERİ</span><h1>Bilgi Merkezi</h1><p>Patili dostun için güvenilir kaynaklarla daha bilinçli bakım.</p></div><span class="kb-v2-total">'+total+' rehber</span></div>'
  +'<div class="kb-v2-hero"><div><span>ÜCRETSİZ BİLGİ KÜTÜPHANESİ</span><h2>Her pati daha iyi bakımı hak eder.</h2><p>Bakım, sağlık, beslenme ve davranış rehberleri tek yerde.</p></div><span class="kb-v2-hero-mark" aria-hidden="true">🐾</span></div>'
  +'<div class="kb-v2-shortcuts"><button type="button" data-action="kb-filter" data-id="Tümü" class="'+(kbFilter==='Tümü'?'is-active':'')+'"><span aria-hidden="true">▦</span><strong>Tüm rehberler</strong><small>'+total+' içerik</small></button>'
  +'<button type="button" data-action="kb-filter" data-id="Kaydedilenler" class="'+(kbFilter==='Kaydedilenler'?'is-active':'')+'"><span aria-hidden="true">♡</span><strong>Kaydettiklerim</strong><small><span id="kb-saved-count">'+saved+'</span> rehber</small></button></div>'
  +'<label for="kb-search" class="kb-v2-search-label">Rehberlerde ara</label><div class="kb-v2-search"><span aria-hidden="true">⌕</span><input id="kb-search" type="search" inputmode="search" autocomplete="off" placeholder="Örn. beslenme, tuvalet, yavru bakımı..." value="'+esc(kbSearch)+'" aria-controls="kb-results"><button type="button" data-action="kb-clear" aria-label="Aramayı temizle">Temizle</button></div>'
  +'<div class="kb-v2-filter-head"><strong>Hayvan türü</strong><small>Bir tür seç</small></div><div class="kb-v2-chips" role="group" aria-label="Hayvan türü">'+kbSpeciesOptions.map(t=>'<button type="button" data-action="kb-filter" data-id="'+esc(t)+'" class="'+(kbFilter===t?'is-active':'')+'" aria-pressed="'+String(kbFilter===t)+'">'+esc(t)+'</button>').join('')+'</div>'
  +'<div class="kb-v2-filter-head"><strong>Konu</strong><small>İlgilendiğin alan</small></div><div class="kb-v2-chips kb-v2-categories" role="group" aria-label="Rehber konusu">'+kbCategoryOptions().map(t=>'<button type="button" data-action="kb-category" data-id="'+esc(t)+'" class="'+(kbCategory===t?'is-active':'')+'" aria-pressed="'+String(kbCategory===t)+'">'+esc(t)+'</button>').join('')+'</div>'
  +'<div class="kb-v2-results-head"><h2>Rehberleri keşfet</h2><span id="kb-count" role="status" aria-live="polite">'+items.length+' rehber bulundu</span></div><div id="kb-results" class="kb-v2-grid">'+kbCards(items)+'</div>'
  +'<p class="kb-v2-list-note">Rehberlerdeki bilgiler genel bilgilendirme amaçlıdır; veteriner hekimin önerisinin yerini almaz.</p></section>';
}

let lostStatus='missing',lostSpecies='Tümü',lostSearch='',lostLoading=false,lostError='';
function lostFold(v){return String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim()}
function lostMatches(){
 const q=lostFold(lostSearch);
 return [...data.lost].filter(x=>!blocked.has(x.owner_id)
 &&(lostStatus==='all'||lostStatus==='mine'&&x.owner_id===me?.id||lostStatus==='found'&&x.found||lostStatus==='missing'&&!x.found)
 &&(lostSpecies==='Tümü'||x.species===lostSpecies)
 &&(!q||lostFold([x.name,x.species,x.city,x.district,x.description].join(' ')).includes(q)))
 .sort((a,b)=>Number(a.found)-Number(b.found)||new Date(b.created_at)-new Date(a.created_at));
}
function lostCards(list){
 if(!list.length)return '<div class="lost-v2-empty" role="status"><span>🐾</span><h3>Bu filtrelerde ilan bulunamadı</h3><p>Başka bir şehir, tür veya durum deneyebilirsin.</p><button type="button" data-action="lost-reset">Filtreleri temizle</button></div>';
 return list.map(x=>{
  const own=x.owner_id===me?.id,found=!!x.found;
  return '<article class="lost-v2-card'+(found?' is-found':'')+'" data-lost-id="'+esc(x.id)+'">'
  +'<div class="lost-v2-cover">'+(x.photo_url?'<img src="'+esc(x.photo_url)+'" alt="'+esc(x.name)+' ilan fotoğrafı" loading="lazy" decoding="async">':'<span class="lost-v2-placeholder">'+petIcon(x.species)+'</span>')
  +'<span class="lost-v2-badge '+(found?'is-found':'')+'">'+(found?'✓ Bulundu':'● Kayıp')+'</span></div>'
  +'<div class="lost-v2-card-info"><div class="lost-v2-meta"><span>'+esc(x.species)+'</span><time>'+esc(day(x.last_seen))+'</time></div>'
  +'<h3>'+esc(x.name)+'</h3><p class="lost-v2-city">📍 '+esc(x.city)+(x.district?' / '+esc(x.district):'')+'</p>'
  +'<p class="lost-v2-description">'+esc(x.description)+'</p><div class="lost-v2-actions">'
  +(own?'<button type="button" data-action="lost-edit" data-id="'+esc(x.id)+'">Düzenle</button><button type="button" data-action="toggle-found" data-id="'+esc(x.id)+'">'+(found?'Yeniden kayıp':'✓ Bulundu')+'</button><button type="button" data-action="delete-lost" data-id="'+esc(x.id)+'" class="lost-v2-danger">Sil</button>'
  :(!found?'<button type="button" data-action="chat" data-id="'+esc(x.owner_id)+'" class="lost-v2-primary">Sahibine mesaj</button>':'')+'<button type="button" data-action="report" data-id="'+esc(x.id)+'" data-kind="lost">Bildir</button>')
  +'<button type="button" data-action="lost-share" data-id="'+esc(x.id)+'">Paylaş</button></div></div></article>';
 }).join('');
}
function lostUpdateResults(){
 if(view!=='lost')return;
 const list=lostMatches(),area=document.getElementById('lost-results'),label=document.getElementById('lost-results-count');
 if(area)area.innerHTML=lostCards(list);
 if(label)label.textContent=list.length+' ilan';
}
async function lostRefresh(){
 if(!me||lostLoading)return;
 const uid=me.id;lostLoading=true;lostError='';if(view==='lost')lostPage();
 try{
  const r=await sb.from('lost_reports').select('*').order('created_at',{ascending:false}).limit(350);
  if(r.error)throw r.error;
  if(me?.id!==uid)return;
  data.lost=r.data||[];patiyizLoadedTables.add('lost_reports');
 }catch(e){console.warn('Kayıp ilanları:',e);if(me?.id===uid)lostError='İlanlar yüklenemedi. İnternetini kontrol edip tekrar dene.'}
 finally{lostLoading=false;if(me?.id===uid&&view==='lost')lostPage()}
}
async function routePendingLost(){
 const params=new URL(location.href).searchParams,id=params.get('lost')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return;
 params.delete('lost');
 history.replaceState(null,'',location.pathname+(params.toString()?'?'+params.toString():'')+location.hash);
 if(!me)return;
 lostStatus='all';lostSpecies='Tümü';lostSearch='';
 navigate('lost');
 await lostRefresh();
 if(view!=='lost')return;
 const card=document.querySelector('[data-lost-id="'+id+'"]');
 if(card){card.classList.add('is-linked');card.scrollIntoView({block:'center',behavior:'smooth'})}
 else notify('İlan bulunamadı veya artık görüntülenemiyor.',true);
}
let lostPhotoObjectUrl='';
function lostPage(){
 const safe=data.lost.filter(x=>!blocked.has(x.owner_id));
 const counts={missing:safe.filter(x=>!x.found).length,found:safe.filter(x=>x.found).length,mine:safe.filter(x=>x.owner_id===me?.id).length};
 const kinds=['Tümü',...new Set(safe.map(x=>x.species).filter(Boolean))];
 const list=lostMatches();
 main.innerHTML='<section class="lost-v2"><div class="lost-v2-heading"><div><small>PATİYİZ · YARDIMLAŞMA</small><h1>Kayıp İlanları</h1><p>Kaybolan dostlarımızı birlikte bulalım.</p></div><button type="button" data-action="lost-add" class="lost-v2-create">+ İlan oluştur</button></div>'
 +'<div class="lost-v2-hero"><div><small>TOPLULUK DESTEĞİ</small><h2>Bir paylaşım, bir kavuşma olabilir.</h2><p>Kayıp hayvanları bulmak için birlikte hareket edelim.</p></div><span>🐾</span></div>'
 +'<div class="lost-v2-stats"><div><b>'+counts.missing+'</b><span>Aranıyor</span></div><div><b>'+counts.found+'</b><span>Bulundu</span></div><div><b>'+counts.mine+'</b><span>İlanlarım</span></div></div>'
 +'<p class="lost-v2-privacy">🔒 Açık adres veya telefon numarası paylaşma. Yalnızca şehir / ilçe belirt; iletişim uygulama içi mesajlarla yapılsın.</p>'
 +'<label for="lost-search">İlanlarda ara</label><div class="lost-v2-search"><input id="lost-search" type="search" value="'+esc(lostSearch)+'" placeholder="Hayvan adı, tür, şehir veya ilçe..." autocomplete="off" aria-controls="lost-results"><button type="button" data-action="lost-clear">Temizle</button></div>'
 +'<div class="lost-v2-row"><strong>Durum</strong><button type="button" data-action="lost-refresh"'+(lostLoading?' disabled':'')+'>'+(lostLoading?'Yenileniyor…':'↻ Yenile')+'</button></div>'
 +'<div class="lost-v2-filters" role="group" aria-label="İlan durumu">'+[['missing','Kayıp ('+counts.missing+')'],['found','Bulundu ('+counts.found+')'],['mine','İlanlarım ('+counts.mine+')'],['all','Tümü']].map(([key,title])=>'<button type="button" data-action="lost-status" data-id="'+key+'" class="'+(lostStatus===key?'active':'')+'" aria-pressed="'+(lostStatus===key)+'">'+title+'</button>').join('')+'</div>'
 +'<div class="lost-v2-row"><strong>Hayvan türü</strong></div><div class="lost-v2-filters" role="group" aria-label="Hayvan türü">'+kinds.map(x=>'<button type="button" data-action="lost-species" data-id="'+esc(x)+'" class="'+(lostSpecies===x?'active':'')+'" aria-pressed="'+(lostSpecies===x)+'">'+esc(x)+'</button>').join('')+'</div>'
 +(lostError?'<div class="lost-v2-error" role="alert">'+esc(lostError)+'</div>':'')
 +'<div class="lost-v2-results-head"><h2>İlanları keşfet</h2><span role="status" aria-live="polite" id="lost-results-count">'+list.length+' ilan</span></div>'
 +'<div class="lost-v2-grid" id="lost-results">'+(lostLoading?'<p role="status" class="lost-v2-loading">İlanlar yükleniyor…</p>':lostCards(list))+'</div></section>';
}
let adoptionStatus='open',adoptionSpecies='Tümü',adoptionSearch='',adoptionLoading=false,adoptionLoadError='';
function adoptionFold(v){return String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim()}
function adoptionMatches(){
 const q=adoptionFold(adoptionSearch);
 return [...data.adoption].filter(x=>!blocked.has(x.owner_id)
  &&(adoptionStatus==='all'||adoptionStatus==='mine'&&x.owner_id===me?.id||adoptionStatus==='adopted'&&x.adopted||adoptionStatus==='open'&&!x.adopted)
  &&(adoptionSpecies==='Tümü'||x.species===adoptionSpecies)
  &&(!q||adoptionFold([x.name,x.species,x.city,x.district,x.gender,x.age,x.description].join(' ')).includes(q)))
  .sort((a,b)=>Number(a.adopted)-Number(b.adopted)||new Date(b.created_at)-new Date(a.created_at));
}
function adoptionCards(list){
 if(!list.length)return '<div class="adopt-v2-empty" role="status"><span>🐾</span><h3>Bu filtrelerde ilan bulunamadı</h3><p>Diğer şehir, hayvan türü veya ilan durumlarını deneyebilirsin.</p><button type="button" data-action="adoption-reset">Filtreleri temizle</button></div>';
 return list.map(x=>{
  const own=x.owner_id===me?.id,adopted=!!x.adopted;
  return '<article class="adopt-v2-card'+(adopted?' is-adopted':'')+'" data-adoption-id="'+esc(x.id)+'">'
   +'<div class="adopt-v2-cover">'+(x.photo_url?'<img src="'+esc(x.photo_url)+'" alt="'+esc(x.name)+' fotoğrafı" loading="lazy" decoding="async">':'<span class="adopt-v2-placeholder">'+petIcon(x.species)+'</span>')
   +'<span class="adopt-v2-badge'+(adopted?' is-adopted':'')+'">'+(adopted?'✓ Sahiplendirildi':'♡ Yuva arıyor')+'</span></div>'
   +'<div class="adopt-v2-info"><div class="adopt-v2-meta"><span>'+esc(x.species)+' · '+esc(x.gender||'Belirtilmedi')+'</span><small>'+esc(day(x.created_at))+'</small></div>'
   +'<h3>'+esc(x.name)+'</h3><p class="adopt-v2-location">📍 '+esc(x.city)+(x.district?' / '+esc(x.district):'')+(x.age?' · '+esc(x.age):'')+'</p>'
   +'<p class="adopt-v2-description">'+esc(x.description)+'</p>'
   +'<div class="adopt-v2-actions">'
   +(own?'<button type="button" data-action="adoption-edit" data-id="'+esc(x.id)+'">Düzenle</button><button type="button" data-action="adoption-toggle" data-id="'+esc(x.id)+'">'+(adopted?'Yeniden yayına al':'✓ Sahiplendirildi')+'</button><button type="button" data-action="adoption-delete" data-id="'+esc(x.id)+'" class="adopt-v2-danger">Sil</button>'
   :(!adopted?'<button type="button" data-action="chat" data-id="'+esc(x.owner_id)+'" class="adopt-v2-contact">Sahibine mesaj gönder</button>':'')+'<button type="button" data-action="report" data-id="'+esc(x.id)+'" data-kind="adoption">Bildir</button>')
   +'<button type="button" data-action="adoption-share" data-id="'+esc(x.id)+'">Paylaş</button></div></div></article>';
 }).join('');
}
function adoptionUpdateResults(){
 if(view!=='adoption')return;
 const list=adoptionMatches(),container=document.getElementById('adoption-results'),count=document.getElementById('adoption-results-count');
 if(container)container.innerHTML=adoptionCards(list);
 if(count)count.textContent=list.length+' ilan';
}
async function adoptionRefresh(){
 if(!me||adoptionLoading)return;
 const uid=me.id;adoptionLoading=true;adoptionLoadError='';if(view==='adoption')adoptionPage();
 try{
  const r=await sb.from('adoption_listings').select('*').order('created_at',{ascending:false}).limit(350);
  if(r.error)throw r.error;
  if(me?.id!==uid)return;
  data.adoption=r.data||[];patiyizLoadedTables.add('adoption_listings');
 }catch(e){if(me?.id===uid)adoptionLoadError='İlanlar yenilenemedi. İnternet bağlantını kontrol edip tekrar dene.';console.warn('Sahiplendirme ilanları:',e)}
 finally{adoptionLoading=false;if(me?.id===uid&&view==='adoption')adoptionPage()}
}
async function routePendingAdoption(){
 const u=new URL(location.href),id=u.searchParams.get('adoption');
 if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return;
 u.searchParams.delete('adoption');history.replaceState(null,'',u.pathname+u.search+u.hash);
 if(!me)return;
 adoptionStatus='all';adoptionSpecies='Tümü';adoptionSearch='';
 navigate('adoption');await adoptionRefresh();
 if(view!=='adoption')return;
 const card=document.querySelector('[data-adoption-id="'+id+'"]');
 if(card){card.classList.add('is-linked');card.scrollIntoView({block:'center',behavior:'smooth'})}
 else notify('İlan bulunamadı veya artık görüntülenemiyor.',true);
}
function adoptionPage(){
 const visible=data.adoption.filter(x=>!blocked.has(x.owner_id));
 const counts={open:visible.filter(x=>!x.adopted).length,adopted:visible.filter(x=>x.adopted).length,mine:visible.filter(x=>x.owner_id===me?.id).length};
 const kinds=['Tümü',...new Set(visible.map(x=>x.species).filter(Boolean))];
 const list=adoptionMatches();
 main.innerHTML='<section class="adopt-v2">'
  +'<div class="adopt-v2-heading"><div><small>PATİYİZ · YUVA BUL</small><h1>Sahiplendirme</h1><p>Patili dostlarımız için güvenli ve sevgi dolu yuvalar.</p></div><button type="button" data-action="adoption-add" class="adopt-v2-create">+ İlan oluştur</button></div>'
  +'<div class="adopt-v2-hero"><div><small>SORUMLU SAHİPLENME</small><h2>Bir dost, ömür boyu sorumluluk.</h2><p>İlanları keşfet, sorularını mesajla sor ve doğru yuva için güvenle iletişime geç.</p></div><span aria-hidden="true">🐾</span></div>'
  +'<div class="adopt-v2-stats"><div><b>'+counts.open+'</b><span>Yuva arıyor</span></div><div><b>'+counts.adopted+'</b><span>Sahiplendirildi</span></div><div><b>'+counts.mine+'</b><span>İlanlarım</span></div></div>'
  +'<p class="adopt-v2-safety">🔒 Sahiplendirme ilanları ücretsizdir. Açık adresini ve telefon numaranı yazma. İletişimi uygulama içi mesajlardan yap; sağlık, bakım koşulları ve sorumlulukları görüş.</p>'
  +'<label for="adoption-search">İlanlarda ara</label><div class="adopt-v2-search"><input id="adoption-search" type="search" value="'+esc(adoptionSearch)+'" autocomplete="off" aria-controls="adoption-results" placeholder="Hayvan adı, şehir, ilçe, tür…"><button type="button" data-action="adoption-clear">Temizle</button></div>'
  +'<div class="adopt-v2-row"><strong>İlan durumu</strong><button type="button" data-action="adoption-refresh"'+(adoptionLoading?' disabled':'')+'>'+(adoptionLoading?'Yenileniyor…':'↻ Yenile')+'</button></div>'
  +'<div class="adopt-v2-filters" role="group" aria-label="İlan durumu">'+[['open','Yuva arıyor ('+counts.open+')'],['adopted','Sahiplendirildi ('+counts.adopted+')'],['mine','İlanlarım ('+counts.mine+')'],['all','Tümü']].map(([key,label])=>'<button type="button" data-action="adoption-status" data-id="'+key+'" class="'+(adoptionStatus===key?'active':'')+'" aria-pressed="'+String(adoptionStatus===key)+'">'+label+'</button>').join('')+'</div>'
  +'<div class="adopt-v2-row"><strong>Hayvan türü</strong></div><div class="adopt-v2-filters" role="group" aria-label="Hayvan türü">'+kinds.map(x=>'<button type="button" data-action="adoption-species" data-id="'+esc(x)+'" class="'+(adoptionSpecies===x?'active':'')+'" aria-pressed="'+String(adoptionSpecies===x)+'">'+esc(x)+'</button>').join('')+'</div>'
  +(adoptionLoadError?'<p role="alert" class="adopt-v2-error">'+esc(adoptionLoadError)+'</p>':'')
  +'<div class="adopt-v2-results-head"><h2>Yuva arayan dostlar</h2><span id="adoption-results-count" role="status" aria-live="polite">'+list.length+' ilan</span></div>'
  +'<div class="adopt-v2-grid" id="adoption-results">'+(adoptionLoading?'<p role="status" class="adopt-v2-loading">İlanlar yükleniyor…</p>':adoptionCards(list))+'</div></section>';
}
let carePetFilter='all',careCategoryFilter='Tümü',careSearch='',careLoading=false,careLoadError='';
const CARE_CATEGORIES=['Aşı','Veteriner','İlaç','Mama','Bakım','Diğer'];
function careToday(){return new Date().toLocaleDateString('sv-SE')}
function careDateValid(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return false;const d=new Date(v+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v}
function careFold(v){return String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim()}
function careOwnItems(){return data.care.filter(x=>x.owner_id===me?.id)}
function careDueState(item,today=careToday()){
 if(item.done)return 'done';
 if(item.due_date<today)return 'late';
 if(item.due_date===today)return 'today';
 return 'upcoming';
}
function careVisibleItems(){
 const today=careToday(),q=careFold(careSearch);
 return careOwnItems().filter(x=>
  (careFilter==='all'||careFilter===careDueState(x,today))
  &&(carePetFilter==='all'||(carePetFilter==='none'?!x.pet_id:x.pet_id===carePetFilter))
  &&(careCategoryFilter==='Tümü'||x.category===careCategoryFilter)
  &&(!q||careFold([x.title,x.category,data.pets.find(p=>p.id===x.pet_id&&p.owner_id===me?.id)?.name||''].join(' ')).includes(q))
 ).sort((a,b)=>Number(a.done)-Number(b.done)||String(a.due_date).localeCompare(String(b.due_date))||new Date(b.created_at)-new Date(a.created_at));
}
function careCard(x){
 const state=careDueState(x),p=data.pets.find(p=>p.id===x.pet_id&&p.owner_id===me?.id);
 const icons={Aşı:'💉',Veteriner:'🩺',İlaç:'💊',Mama:'🥣',Bakım:'🧼',Diğer:'📋'};
 const labels={late:'Gecikti',today:'Bugün',upcoming:'Planlandı',done:'Tamamlandı'};
 return '<article class="care-v2-item '+(x.done?'is-done':'')+'">'
  +'<div class="care-v2-item-icon" aria-hidden="true">'+(icons[x.category]||'🐾')+'</div>'
  +'<div class="care-v2-item-main"><div class="care-v2-item-head"><span>'+esc(x.category||'Bakım')+'</span><span class="care-v2-item-status is-'+state+'">'+labels[state]+'</span></div>'
  +'<h3>'+esc(x.title)+'</h3>'
  +'<p><span>📅 '+esc(day(x.due_date))+'</span>'+(p?'<span>🐾 '+esc(p.name)+'</span>':'<span>Genel görev</span>')+'</p>'
  +'</div><div class="care-v2-actions">'
  +'<button type="button" class="care-v2-complete" data-action="care-done" data-id="'+esc(x.id)+'">'+(x.done?'↶ Geri al':'✓ Tamamla')+'</button>'
  +'<button type="button" data-action="care-edit" data-id="'+esc(x.id)+'">Düzenle</button>'
  +'<button type="button" class="care-v2-delete" data-action="care-del" data-id="'+esc(x.id)+'">Sil</button></div></article>';
}
function careUpdateResults(){
 if(view!=='care'&&!(view==='my-pet'&&patiMyPetTab==='care'))return;
 const list=careVisibleItems(),result=document.getElementById('care-results'),count=document.getElementById('care-result-count');
 if(result)result.innerHTML=list.length?list.map(careCard).join(''):'<div class="care-v2-empty" role="status"><span>🐾</span><h3>Bu filtrelerde görev yok</h3><p>Başka bir tarih, kategori veya hayvan seçebilirsin.</p><button type="button" data-action="care-reset">Filtreleri temizle</button></div>';
 if(count)count.textContent=list.length+' görev';
}
async function careRefresh(){
 if(!me||careLoading)return;
 const uid=me.id;careLoading=true;careLoadError='';if(view==='care'||(view==='my-pet'&&patiMyPetTab==='care'))render();
 try{
  const r=await sb.from('care_tasks').select('*').eq('owner_id',uid).order('due_date',{ascending:true}).limit(350);
  if(r.error)throw r.error;
  if(me?.id!==uid)return;
  data.care=r.data||[];patiyizLoadedTables.add('care_tasks');
 }catch(error){console.warn('Bakım takvimi:',error);if(me?.id===uid)careLoadError='Görevler yenilenemedi. Bağlantını kontrol edip tekrar dene.'}
 finally{careLoading=false;if(me?.id===uid&&(view==='care'||(view==='my-pet'&&patiMyPetTab==='care')))render()}
}
function carePage(){
 const all=careOwnItems(),today=careToday(),counts={all:all.length,done:all.filter(x=>x.done).length,late:all.filter(x=>!x.done&&x.due_date<today).length,today:all.filter(x=>!x.done&&x.due_date===today).length,upcoming:all.filter(x=>!x.done&&x.due_date>today).length};
 const pets=data.pets.filter(p=>p.owner_id===me?.id);
 const list=careVisibleItems();
 main.innerHTML='<section class="care-v2">'
  +'<div class="care-v2-heading"><div><small>PATİYİZ · GÜNLÜK BAKIM</small><h1>Bakım Takvimi</h1><p>Patili dostunun bakım rutinini tek yerden yönet.</p></div><button type="button" class="care-v2-add" data-action="care-add">+ Görev ekle</button></div>'
  +'<div class="care-v2-hero"><div><small>BAKIM VE TAKİP</small><h2>Küçük rutinler, sağlıklı patiler.</h2><p>Aşı, veteriner, mama, ilaç ve günlük bakım işlerini planla. Tamamlanan görevleri güvenle takip et.</p></div><span aria-hidden="true">🐾</span></div>'
  +'<div class="care-v2-metrics"><div><b>'+counts.all+'</b><span>Toplam görev</span></div><div><b>'+counts.today+'</b><span>Bugün</span></div><div><b>'+counts.late+'</b><span>Geciken</span></div><div><b>'+counts.done+'</b><span>Tamamlanan</span></div></div>'
  +'<div class="care-v2-shortcut"><div><strong>⏰ Saatli ve tekrarlayan hatırlatmalar</strong><p>Aşı, mama ve ilaç için saat ve tekrar aralığı belirlemek istersen Hayvan Sağlığı bölümünü kullan.</p></div><button type="button" data-action="wellness-open">Sağlık hatırlatmaları →</button></div>'
  +'<p class="care-v2-notice">Görevler Patiyiz hesabında saklanır. <strong>Bu takvim tek başına telefon bildirimi, SMS veya e-posta göndermez.</strong> Veteriner yönlendirmelerinin yerini almaz.</p>'
  +'<div class="care-v2-toolbar"><label for="care-search">Görevlerde ara</label><div class="care-v2-search"><input id="care-search" type="search" placeholder="Görev, kategori veya hayvan adı…" value="'+esc(careSearch)+'" aria-controls="care-results" autocomplete="off"><button type="button" data-action="care-clear">Temizle</button></div></div>'
  +'<div class="care-v2-filter-title"><strong>Görev durumu</strong><button type="button" data-action="care-refresh"'+(careLoading?' disabled':'')+'>'+(careLoading?'Yenileniyor…':'↻ Yenile')+'</button></div>'
  +'<div class="care-v2-filters" role="group" aria-label="Görev durumu">'
  +[['all','Tümü ('+counts.all+')'],['today','Bugün ('+counts.today+')'],['upcoming','Yaklaşan ('+counts.upcoming+')'],['late','Geciken ('+counts.late+')'],['done','Tamamlanan ('+counts.done+')']].map(([key,label])=>'<button type="button" data-action="care-filter" data-id="'+key+'" class="'+(careFilter===key?'active':'')+'" aria-pressed="'+String(careFilter===key)+'">'+label+'</button>').join('')+'</div>'
  +'<div class="care-v2-filter-title"><strong>Hayvan</strong></div><div class="care-v2-filters" role="group" aria-label="Hayvan filtresi">'
  +[['all','Tüm hayvanlar'],['none','Genel görevler'],...pets.map(p=>[p.id,p.name])].map(([key,label])=>'<button type="button" data-action="care-pet-filter" data-id="'+esc(key)+'" class="'+(carePetFilter===key?'active':'')+'" aria-pressed="'+String(carePetFilter===key)+'">'+esc(label)+'</button>').join('')+'</div>'
  +'<div class="care-v2-filter-title"><strong>Bakım kategorisi</strong></div><div class="care-v2-filters" role="group" aria-label="Bakım kategorisi">'
  +['Tümü',...CARE_CATEGORIES].map(key=>'<button type="button" data-action="care-category" data-id="'+esc(key)+'" class="'+(careCategoryFilter===key?'active':'')+'" aria-pressed="'+String(careCategoryFilter===key)+'">'+esc(key)+'</button>').join('')+'</div>'
  +(careLoadError?'<p class="care-v2-error" role="alert">'+esc(careLoadError)+'</p>':'')
  +'<div class="care-v2-result-header"><h2>Görev listesi</h2><span id="care-result-count" role="status" aria-live="polite">'+list.length+' görev</span></div>'
  +'<div id="care-results" class="care-v2-list">'+(careLoading?'<p class="care-v2-loading" role="status">Görevler yükleniyor…</p>':list.length?list.map(careCard).join(''):'<div class="care-v2-empty" role="status"><span>🐾</span><h3>Bu filtrelerde görev yok</h3><p>Yeni görev ekleyebilir veya filtreleri temizleyebilirsin.</p><button type="button" data-action="care-reset">Filtreleri temizle</button></div>')+'</div></section>';
}
let dmRecorder=null,dmParts=[],dmStream=null,dmCancel=false,dmRecipient=null;
async function uploadDmFile(file,type,receiver){if(!file?.size||file.size>8388608)throw Error('Dosya en fazla 8 MB olabilir.');const mime=file.type.split(';')[0];if(type==='image'&&!['image/jpeg','image/png','image/webp'].includes(mime))throw Error('JPG, PNG veya WebP seç.');if(type==='audio'&&!['audio/webm','audio/mp4','audio/ogg','audio/mpeg'].includes(mime))throw Error('Ses biçimi desteklenmiyor.');const ext=type==='image'?(mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'):(mime==='audio/mp4'?'m4a':mime==='audio/ogg'?'ogg':mime==='audio/mpeg'?'mp3':'webm');const author=me?.id;if(!author)throw Error('Mesaj göndermek için giriş yap.');const path=author+'/'+crypto.randomUUID()+'.'+ext;const up=await sb.storage.from('patiyiz-private-messages').upload(path,file,{contentType:mime});if(up.error)throw up.error;try{if(me?.id!==author)throw Error('Oturum değişti. Mesaj gönderilmedi.');const m=await sb.from('messages').insert({sender_id:author,receiver_id:receiver,body:type==='audio'?'🎤 Sesli mesaj':'📷 Fotoğraf',attachment_type:type,attachment_path:path}).select('*').single();if(m.error)throw m.error;return m.data}catch(error){try{await sb.storage.from('patiyiz-private-messages').remove([path])}catch(cleanup){console.warn('Gönderilemeyen medya temizlenemedi',cleanup)}throw error}}
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
async function sendDmImage(file){
 if(!personId||dmMediaSending)return;
 const recipient=personId,uid=me.id;dmMediaSending=true;
 const history=document.querySelector('.chat-history');
 const pending=document.createElement('div'),local=URL.createObjectURL(file);
 pending.className='bubble-chat mine pati-dm-pending';
 pending.innerHTML='<img class="pati-dm-image" alt="Gönderilen fotoğraf"><small>Fotoğraf gönderiliyor…</small>';
 pending.querySelector('img').src=local;
 history?.appendChild(pending);
 if(history)history.scrollTop=history.scrollHeight;
 try{
  const record=await uploadDmFile(file,'image',recipient);
  if(!record)throw new Error('Fotoğraf sunucuda doğrulanamadı.');
  if(me?.id===uid&&personId===recipient){
   data.messages=data.messages.filter(x=>x.id!==record.id);
   data.messages.push(record);
   pending.remove();navRender();if(view==='messages')render();
  }else pending.remove();
 }catch(e){pending.remove();throw e}
 finally{URL.revokeObjectURL(local);dmMediaSending=false}
}
async function startDmRecord(){if(!personId||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Tarayıcı ses kaydını desteklemiyor.');if(dmRecorder)return;dmStream=await navigator.mediaDevices.getUserMedia({audio:true});const type=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));if(!type){dmStream.getTracks().forEach(t=>t.stop());throw Error('Ses biçimi desteklenmiyor.')}dmParts=[];dmCancel=false;dmRecipient=personId;dmRecorder=new MediaRecorder(dmStream,{mimeType:type});dmRecorder.ondataavailable=e=>{if(e.data.size)dmParts.push(e.data)};dmRecorder.onstop=async()=>{const blob=new Blob(dmParts,{type:type.split(';')[0]});dmStream?.getTracks().forEach(t=>t.stop());dmRecorder=null;dmStream=null;document.querySelector('.pati-dm-rec-state')?.setAttribute('hidden','');if(dmCancel||!blob.size||!me||!dmRecipient)return;try{await uploadDmFile(blob,'audio',dmRecipient);await refreshKeys([['messages','messages']])}catch(e){notify('Ses gönderilemedi: '+friendly(e),true)}};dmRecorder.start();document.querySelector('.pati-dm-rec-state')?.removeAttribute('hidden')}
// One pass over messages, independent of the number of conversations.
// Dedicated server-side inbox and per-peer history. RLS is enforced by the server.
let patiDmInbox={owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
const patiDmThreads=new Map();
const PATI_DM_INBOX_PAGE=80,PATI_DM_THREAD_PAGE=50;
let patiDmPendingLatestPeer='';
function patiDmScrollLatest(history,peer){
 if(!history||!peer)return;
 const pin=()=>{if(history.isConnected&&view==='messages'&&personId===peer)history.scrollTop=history.scrollHeight};
 pin();
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(pin));
}

function patiDmThreadKey(peer){return (me?.id||'')+':'+peer}
function patiDmFindMessage(id){
 return data.messages.find(row=>row.id===id)||
  [...patiDmThreads.values()].flatMap(state=>state.rows).find(row=>row.id===id);
}
function patiDmRemoveCached(id){
 for(const state of patiDmThreads.values())state.rows=state.rows.filter(row=>row.id!==id);
 for(const state of [patiDmInbox])state.rows=state.rows.filter(row=>row.message_id!==id);
}
function patiDmSafeRender(){
 if(view!=='messages')return;
 const before=document.querySelector('#message-form input[name="body"]');
 const draft=before?.value||'',focus=document.activeElement===before;
 const pos=before?.selectionStart??draft.length,reply=before?.form?.dataset.reply||'';
 const search=document.querySelector('#pati-dm-search');
 const filter=search?.value||'',searchFocused=document.activeElement===search;
 render();
 const nextSearch=document.querySelector('#pati-dm-search');
 if(nextSearch&&filter){nextSearch.value=filter;nextSearch.dispatchEvent(new Event('input'));if(searchFocused)nextSearch.focus({preventScroll:true})}
 const after=document.querySelector('#message-form input[name="body"]');
 if(after){after.value=draft;if(reply)after.form.dataset.reply=reply;
  if(focus){after.focus({preventScroll:true});after.setSelectionRange(pos,pos)}}
}
async function patiDmLoadInbox(reset=false,quiet=false){
 if(!me||!sb)return;
 const uid=me.id,loadToken=patiyizLoadToken;
 if(reset||patiDmInbox.owner!==uid)patiDmInbox={owner:uid,rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
 const state=patiDmInbox;
 if(state.loading||!state.hasMore)return;
 state.loading=true;state.error='';
 try{
  const result=await sb.rpc('patiyiz_dm_inbox',{p_limit:PATI_DM_INBOX_PAGE,p_offset:state.offset});
  if(result.error)throw result.error;
  if(me?.id!==uid||patiyizLoadToken!==loadToken||patiDmInbox!==state)return;
  const rows=result.data||[];
  const unknown=[...new Set(rows.map(row=>row.peer_id))].filter(id=>id&&!data.profiles.some(p=>p.id===id));
  if(unknown.length){
   const profiles=await sb.from('profiles').select('*').in('id',unknown);
   if(profiles.error)throw profiles.error;
   if(me?.id!==uid||patiyizLoadToken!==loadToken||patiDmInbox!==state)return;
   const existing=new Set(data.profiles.map(p=>p.id));
   for(const p of profiles.data||[])if(!existing.has(p.id)){data.profiles.push(p);existing.add(p.id)}
  }
  const known=new Set(state.rows.map(row=>row.peer_id));
  for(const row of rows)if(!known.has(row.peer_id)){state.rows.push(row);known.add(row.peer_id)}
  state.offset+=rows.length;state.hasMore=rows.length===PATI_DM_INBOX_PAGE;state.ready=true;
 }catch(error){
  if(patiDmInbox===state&&me?.id===uid){
   state.error='Sohbet listesi yenilenemedi. Tekrar deneyebilirsin.';
   console.warn('Sohbet listesi:',error?.message||error);
  }
 }finally{
  state.loading=false;
  if(patiDmInbox===state&&me?.id===uid&&view==='messages'&&!quiet){
   patiDmSafeRender();
   if(personId&&!patiDmThreads.get(patiDmThreadKey(personId))?.ready)void patiDmLoadThread(personId);
  }
 }
}
async function patiDmLoadThread(peer,older=false,quiet=false){
 if(!me||!sb||!/^[a-f0-9-]{36}$/i.test(peer||'')||peer===me.id)return;
 const uid=me.id,loadToken=patiyizLoadToken,key=patiDmThreadKey(peer);
 let state=patiDmThreads.get(key);
 if(!state){state={rows:[],hasMore:true,loading:false,ready:false,error:''};patiDmThreads.set(key,state)}
 if(state.loading||(older&&!state.hasMore))return;
 state.loading=true;state.error='';
 const beforeHistory=older&&personId===peer&&typeof document!=='undefined'?document.querySelector('.chat-history'):null;
 const anchor=beforeHistory?{height:beforeHistory.scrollHeight,top:beforeHistory.scrollTop}:null;
 const old=older&&state.rows.length?state.rows.reduce((t,row)=>!t||row.created_at<t?row.created_at:t,''):'';
 try{
  let query=sb.from('messages').select('*')
   .or('and(sender_id.eq.'+uid+',receiver_id.eq.'+peer+'),and(sender_id.eq.'+peer+',receiver_id.eq.'+uid+')')
   .order('created_at',{ascending:false}).limit(PATI_DM_THREAD_PAGE);
  if(old)query=query.lt('created_at',old);
  const result=await query;
  if(result.error)throw result.error;
  if(me?.id!==uid||patiyizLoadToken!==loadToken||patiDmThreads.get(key)!==state)return;
  const rows=result.data||[];
  if(!older&&!state.ready)state.rows=[];
  const merged=new Map(state.rows.map(row=>[row.id,row]));
  for(const row of rows)merged.set(row.id,row);
  state.rows=[...merged.values()];
  if(older||!state.ready)state.hasMore=rows.length===PATI_DM_THREAD_PAGE;
  state.ready=true;
 }catch(error){
  if(me?.id===uid&&patiDmThreads.get(key)===state){
   state.error='Mesaj geçmişi yüklenemedi. Yeniden deneyebilirsin.';
   console.warn('Mesaj geçmişi:',error?.message||error);
  }
 }finally{
  state.loading=false;
  if(me?.id===uid&&patiDmThreads.get(key)===state&&personId===peer&&view==='messages'&&!quiet){
   patiDmSafeRender();
   if(anchor&&typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{
    const next=document.querySelector('.chat-history');
    if(next)next.scrollTop=Math.max(0,anchor.top+next.scrollHeight-anchor.height);
   });
  }
 }
}
function patiIndexDmHistory(rows,userId,hiddenIds,seenIds){
 const peers=new Map();
 let unreadTotal=0;
 for(const message of rows||[]){
  if((message.sender_id!==userId&&message.receiver_id!==userId)||hiddenIds?.has(message.id))continue;
  const peer=message.sender_id===userId?message.receiver_id:message.sender_id;
  if(!peer)continue;
  let entry=peers.get(peer);
  if(!entry){entry={items:[],last:null,lastTime:0,unread:0,incoming:false};peers.set(peer,entry)}
  entry.items.push(message);
  const timestamp=Date.parse(message.created_at)||0;
  if(!entry.last||timestamp>entry.lastTime){entry.last=message;entry.lastTime=timestamp}
  if(message.sender_id===peer&&message.receiver_id===userId)entry.incoming=true;
  if(message.receiver_id===userId&&!message.read_at&&!seenIds?.has(message.id)){
   entry.unread++;unreadTotal++;
  }
 }
 return {peers,unreadTotal};
}
function messagesPage(){
 const oldHistory=main.querySelector('.pati-dm-layout .chat-history');
 const oldChatId=main.querySelector('.pati-dm-layout .chat-window')?.dataset?.chatPerson||'';
 const oldTop=oldHistory?.scrollTop||0;
 const oldWasAtBottom=!oldHistory||(oldHistory.scrollHeight-oldHistory.scrollTop-oldHistory.clientHeight)<110;
 const hiddenIds=new Set(data.messageHidden.filter(x=>x.user_id===me.id).map(x=>x.message_id));
 const thread=patiDmThreads.get(patiDmThreadKey(personId));
 const merged=new Map();
 for(const m of thread?.rows||[])merged.set(m.id,m);
 for(const m of data.messages)merged.set(m.id,m);
 const indexed=patiIndexDmHistory([...merged.values()],me.id,hiddenIds,patiDmSeenIds());
 const peers=indexed.peers,inbox=patiDmInbox.owner===me.id?patiDmInbox:null;
 let userIds=[...new Set([...(inbox?.ready?inbox.rows.map(row=>row.peer_id):[]),...peers.keys(),personId])].filter(id=>id&&!blocked.has(id));
 const summaries=new Map((inbox?.rows||[]).map(row=>[row.peer_id,row]));
 userIds.sort((a,b)=>new Date(summaries.get(b)?.last_created_at||peers.get(b)?.last?.created_at||0)-new Date(summaries.get(a)?.last_created_at||peers.get(a)?.last?.created_at||0));
 if(!personId&&userIds.length){personId=userIds[0];patiDmPendingLatestPeer=personId}
 let conv=[...(peers.get(personId)?.items||[])].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 const unreadTotal=(inbox?.ready&&patiDmReadReceiptsEnabled()?inbox.rows.reduce((sum,row)=>sum+Number(row.unread_count||0),0):indexed.unreadTotal);
 const byMessageId=new Map([...merged.values()].map(m=>[m.id,m]));
 const showReadReceipts=patiDmReadReceiptsEnabled()&&(personId?profile(personId).read_receipts_enabled!==false:true);const replyText=x=>{const orig=byMessageId.get(x.reply_to);return orig?'↳ '+cut(orig.body||'Medya',65):'Yanıt bulunamadı'};
 const filteredIds=userIds.filter(id=>chatFilter==='primary'?true:chatFilter==='requests'?!followed.has(id)&&!!(summaries.get(id)?.has_incoming??peers.get(id)?.incoming):!followed.has(id)&&!(summaries.get(id)?.has_incoming??peers.get(id)?.incoming));
 const tabs=['primary','requests','general'];const labels=['Birincil','İstekler','Genel'];const chatTabs='<div class="pati-dm-filters">'+tabs.map((t,i)=>'<button type="button" data-action="dm-tab" data-id="'+t+'" class="'+(chatFilter===t?'active':'')+'">'+labels[i]+'</button>').join('')+'</div>';

 main.innerHTML='<div class="pati-dm-top"><button type="button" class="pati-dm-inbox-back" data-action="dm-exit" aria-label="Önceki ekrana dön">←</button><div class="pati-dm-title"><strong>Mesajlar</strong><small>Özel sohbetlerin</small></div><div class="pati-dm-top-actions"><span>'+unreadTotal+' okunmamış</span><button type="button" class="pati-dm-new" data-action="dm-new">'+ico('plus')+' Yeni sohbet</button></div></div>'+chatTabs+'<label class="pati-dm-searchbar">'+ico('search')+'<input type="search" id="pati-dm-search" placeholder="Sohbetlerde ara" aria-label="Sohbetlerde ara" autocomplete="off"></label>'+`<div class="chat-layout modern-chat pati-dm-layout ${mobileChatOpen&&personId?'mobile-chat-open':'mobile-chat-list'}"><div class="chat-people"><div class="chat-list-heading">Sohbetler <span>${filteredIds.length}</span></div>${filteredIds.map(id=>{const bucket=peers.get(id),summary=summaries.get(id);
 let last=summary?{body:summary.last_body,created_at:summary.last_created_at}:bucket?.last;
 let unread=summary&&patiDmReadReceiptsEnabled()?Number(summary.unread_count||0):bucket?.unread||0;return `<button class="chat-person ${personId===id?'active':''}" data-action="chat" data-id="${esc(id)}" data-search="${esc(profile(id).display_name+' '+(profile(id).handle||''))}">${avatar(profile(id),'s')}<span class="chat-person-info"><strong>${displayUser(id)}</strong><small>${last?esc(cut(last.body,80)):'Sohbete başla'}</small></span><span class="chat-person-meta"><small>${last?clock(last.created_at):''}</small>${unread?`<b class="chat-unread">${unread>99?'99+':unread}</b>`:''}</span></button>`}).join('')||`<p style="padding:17px;color:#809181">Keşfet'ten bir kullanıcıya mesaj gönderebilirsin.</p>`}</div><div class="chat-window" data-chat-person="${esc(personId||'')}"><header>${personId?`<button type="button" class="mobile-chat-back" data-action="chat-back" aria-label="Sohbetlere dön">←</button><span class="chat-head-avatar">${avatar(profile(personId),'s')}</span><span><strong>${displayUser(personId)}</strong><small>@${esc(profile(personId).handle||'patiyiz')}</small><span class="pati-dm-typing-indicator" hidden><i class="pati-dm-dots"><b></b><b></b><b></b></i> yazıyor...</span></span><button type="button" data-action="view-user" data-id="${esc(personId)}" class="soft-btn chat-view-profile">Profil</button>`:'Sohbet seç'}</header><div class="chat-history">${conv.map(x=>`<div class="bubble-chat ${x.sender_id===me.id?'mine':''}" data-message-id="${esc(x.id)}" title="Silmek için basılı tut veya sağ tıkla">${x.attachment_type==='image'?'<img class="pati-dm-image" data-private-path="'+esc(x.attachment_path)+'" alt="Özel fotoğraf">':x.attachment_type==='audio'?'<audio controls class="pati-dm-audio" data-private-path="'+esc(x.attachment_path)+'"></audio>':(x.reply_to?'<div class="pati-dm-reply-preview">'+esc(replyText(x))+'</div>':'')+esc(x.body)}<small>${x.edited_at?'Düzenlendi · ':''}${clock(x.created_at)} · ${x.sender_id===me.id?(x.read_at&&showReadReceipts?'✓✓ Okundu':'✓ Gönderildi'):day(x.created_at)}</small><span class="pati-dm-msg-tools"><button type="button" data-action="dm-reply" data-id="${esc(x.id)}">↳ Yanıtla</button>${x.sender_id===me.id&&!x.attachment_path&&!x.attachment_type&&Date.now()-new Date(x.created_at).getTime()<900000?`<button type="button" data-action="dm-edit" data-id="${esc(x.id)}">Düzenle</button>`:''}</span></div>`).join('')||'<p style="color:#95a299;text-align:center;margin:auto">Henüz mesaj yok. İlk mesajı gönder! 🐾</p>'}</div>${personId?`<form id="message-form" class="chat-form"><label class="pati-dm-camera" aria-label="Fotoğraf çek">${ico('camera')}<input type="file" name="dm_camera" accept="image/*" capture="environment" hidden></label><input name="body" placeholder="Mesaj yaz..." maxlength="1000" autocomplete="off"><button type="button" data-action="dm-record" class="pati-dm-mic" aria-label="Ses kaydet">${ico('mic')}</button><button type="button" class="pati-dm-gallery" data-action="pati-dm-gallery-open" aria-label="Fotoğraf galerisi">${ico('image')}</button><input type="file" name="dm_gallery" accept="image/*" multiple hidden><button type="submit" class="primary-btn" aria-label="Gönder">${ico('send')}</button><div class="pati-dm-rec-state" hidden>🎙️ Ses kaydediliyor <button type="button" data-action="dm-record-stop">Gönder</button><button type="button" data-action="dm-record-cancel">İptal</button></div></form>`:''}</div></div>`;
 if(inbox?.hasMore||inbox?.error||inbox?.loading){
 const box=main.querySelector('.chat-people');
 if(box)box.insertAdjacentHTML('beforeend','<div class="pati-load-more">'+(inbox.loading?'Sohbetler yükleniyor…':button(inbox.error?'Yeniden dene':'Daha fazla sohbet','dm-inbox-more'))+'</div>');
 }
 const history=main.querySelector('.chat-history');
 if(history&&personId){
  const threadState=patiDmThreads.get(patiDmThreadKey(personId));
  if(threadState?.hasMore||threadState?.error||threadState?.loading){
   history.insertAdjacentHTML('afterbegin','<div class="pati-load-more">'+(threadState.loading?'Geçmiş yükleniyor…':button(threadState.error?'Tekrar dene':'Önceki mesajlar','dm-thread-older'))+'</div>');
  }
 }
 if(history){
  const threadReady=!!patiDmThreads.get(patiDmThreadKey(personId))?.ready;
  const openLatest=patiDmPendingLatestPeer===personId&&threadReady;
  const pinBottom=openLatest||!oldHistory||oldChatId!==personId||oldWasAtBottom;
  const restore=()=>{
   if(!history.isConnected)return;
   if(pinBottom)history.scrollTop=history.scrollHeight;
   else history.scrollTop=Math.min(oldTop,Math.max(0,history.scrollHeight-history.clientHeight));
  };
  restore();requestAnimationFrame(restore);
  if(openLatest){
   patiDmPendingLatestPeer='';
   patiDmScrollLatest(history,personId);
  }
  history.querySelectorAll('img').forEach(img=>img.addEventListener('load',()=>{
   if(history.isConnected&&pinBottom&&history.scrollHeight-history.scrollTop-history.clientHeight<220)
    history.scrollTop=history.scrollHeight;
  },{once:true}));
 }const chatSearch=main.querySelector('#pati-dm-search');
 chatSearch?.addEventListener('input',()=>{
  const q=chatSearch.value.trim().toLocaleLowerCase('tr-TR');
  main.querySelectorAll('.pati-dm-layout .chat-person').forEach(el=>el.hidden=!String(el.dataset.search||'').toLocaleLowerCase('tr-TR').includes(q));
 });
 loadDmMedia();patiDmSetupTyping();patiDmTypingIndicator();
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
  notify('Telefon bildirimleri açıldı!');if(view==='notifications')void notificationCheckPush();
 }catch(e){console.error(e);notify('Bildirim açılamadı: '+friendly(e),true)}
}
let notificationFilter='all',notificationSearch='',notificationBusy=false,notificationLoadError='',notificationPushStatus='checking',notificationPushOwner='',notificationPushLoading=false;
const notificationKinds={messages:['message-circle','Mesaj'],comments:['message-square','Yorum'],post_likes:['heart','Beğeni'],follows:['user-plus','Takip'],pet_reminder:['calendar','Pati bakımı']};
function notificationVisible(){
 return [...data.notifications].filter(n=>n.owner_id===me?.id&&!blocked.has(n.actor_id))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
}
function notificationMatches(){
 const query=String(notificationSearch||'').toLocaleLowerCase('tr-TR');
 return notificationVisible().filter(n=>{
  const group=n.kind==='messages'?'messages':n.kind==='pet_reminder'?'care':'social';
  return (notificationFilter==='all'||notificationFilter==='unread'&&!n.read||notificationFilter===group)
   &&(!query||[n.text,notificationKinds[n.kind]?.[1]||'Etkinlik',data.profiles.find(p=>p.id===n.actor_id)?.display_name||''].join(' ').toLocaleLowerCase('tr-TR').includes(query));
 });
}
function notificationRows(list){
 return list.map(n=>{
  const [symbol,label]=notificationKinds[n.kind]||['bell','Etkinlik'];
  const actor=n.actor_id?data.profiles.find(p=>p.id===n.actor_id):null;
  const followBack=n.kind==='follows'&&actor&&actor.id!==me?.id&&!followed.has(actor.id)&&data.follows.some(f=>f.follower_id===actor.id&&f.followee_id===me?.id);
  return '<article class="pati-alert-row '+(n.read?'is-read':'is-new')+'" data-notification-id="'+esc(n.id)+'">'
  +'<button type="button" class="pati-alert-entry" data-action="open-notification" data-id="'+esc(n.id)+'"><span class="pati-alert-avatar">'+(actor?avatar(actor,'s'):ico(symbol))+'</span><span class="pati-alert-content"><strong class="pati-alert-title">'+esc(n.text)+'</strong><small class="pati-alert-meta">'+esc(label)+' · '+esc(day(n.created_at))+(n.read?'':' · Yeni')+'</small></span>'+(n.read?'':'<span class="pati-alert-unread" aria-label="Okunmadı"></span>')+'</button>'
  +'<div class="pati-alert-row-actions">'
  +(followBack?'<button type="button" class="pati-alert-follow-back" data-action="follow" data-id="'+esc(actor.id)+'" data-follow-back="true">Sen de takip et</button>':'')
  +'<button type="button" class="notification-v2-read" data-action="notification-toggle-read" data-id="'+esc(n.id)+'" aria-label="'+(n.read?'Okunmadı olarak işaretle':'Okundu olarak işaretle')+'">'+(n.read?'Okunmadı':'✓ Okundu')+'</button>'
  +'<button type="button" class="pati-alert-remove" data-action="notification-delete" data-id="'+esc(n.id)+'" aria-label="Bildirimi sil">'+ico('trash')+'</button></div></article>';
 }).join('');
}
function notificationRenderResults(){
 if(view!=='notifications')return;
 const list=notificationMatches(),all=notificationVisible(),target=document.getElementById('notification-v2-results'),count=document.getElementById('notification-v2-result-count');
 if(target)target.innerHTML=list.length?notificationRows(list):'<div class="notification-v2-empty" role="status"><span aria-hidden="true">🔔</span><h3>Bu filtrelerde bildirim bulunamadı</h3><p>Başka bir kategori seçebilir veya filtreleri temizleyebilirsin.</p><button type="button" data-action="notifications-clear">Filtreleri temizle</button></div>';
 if(count)count.textContent=list.length+' / '+all.length+' bildirim';
}
async function notificationCheckPush(){
 const owner=me?.id;if(!owner||notificationPushLoading)return;
 notificationPushLoading=true;notificationPushOwner=owner;notificationPushStatus='checking';if(view==='notifications')notificationsPage();
 try{
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){notificationPushStatus='unsupported';return}
  if(Notification.permission==='denied'){notificationPushStatus='blocked';return}
  if(Notification.permission!=='granted'){notificationPushStatus='off';return}
  const reg=await navigator.serviceWorker.getRegistration('./');
  const sub=await reg?.pushManager?.getSubscription();
  if(!sub){notificationPushStatus='off';return}
  const r=await sb.from('push_subscriptions').select('id').eq('user_id',owner).eq('endpoint',sub.endpoint).limit(1);
  if(r.error)throw r.error;
  if(me?.id!==owner)return;
  notificationPushStatus=r.data?.length?'on':'off';
 }catch(error){console.warn('Telefon bildirim durumu:',error);if(me?.id===owner)notificationPushStatus='error'}
 finally{notificationPushLoading=false;if(view==='notifications'&&me?.id===owner)notificationsPage()}
}
async function notificationFetch(){
 if(!me||notificationBusy)return;
 const uid=me.id,token=patiyizLoadToken;notificationBusy=true;notificationLoadError='';if(view==='notifications')notificationsPage();
 try{
  const cap=pageLimits.notifications||150;
  const r=await sb.from('notifications').select('*').eq('owner_id',uid).order('created_at',{ascending:false}).limit(cap);
  if(r.error)throw r.error;if(me?.id!==uid||patiyizLoadToken!==token)return;
  data.notifications=r.data||[];pageMore.notifications=(r.data||[]).length>=cap;patiyizLoadedTables.add('notifications');navRender();
 }catch(e){console.warn('Bildirim yenileme hatası:',e);if(me?.id===uid)notificationLoadError='Bildirimler yenilenemedi. Bağlantını kontrol edip tekrar dene.'}
 finally{notificationBusy=false;if(me?.id===uid&&view==='notifications')notificationsPage()}
}
function notificationsPage(){
 const list=notificationMatches(),all=notificationVisible(),unread=all.filter(n=>!n.read).length;
 const counts={messages:all.filter(x=>x.kind==='messages').length,care:all.filter(x=>x.kind==='pet_reminder').length,social:all.filter(x=>x.kind!=='messages'&&x.kind!=='pet_reminder').length};
 const statusText={checking:'Durum kontrol ediliyor…',on:'Bu cihazda açık',off:'Bu cihazda kapalı',blocked:'Tarayıcı izni engellenmiş',unsupported:'Bu cihaz desteklemiyor',error:'Durum doğrulanamadı'}[notificationPushStatus];
 main.innerHTML='<section class="pati-alerts notification-v2"><div class="pati-alert-head"><div><span class="pati-alert-eyebrow">PATİYİZ · HESAP HAREKETLERİ</span><h1>Bildirimler'+(unread?'<span class="pati-alert-count">'+unread+'</span>':'')+'</h1><p>Mesajları, takipleri, etkileşimleri ve bakım hatırlatmalarını burada takip et.</p></div><span class="pati-alert-head-icon">'+ico('bell')+'</span></div>'
  +'<div class="notification-v2-stats"><div><b>'+all.length+'</b><small>Toplam</small></div><div><b>'+unread+'</b><small>Okunmamış</small></div><div><b>'+counts.messages+'</b><small>Mesaj</small></div><div><b>'+counts.care+'</b><small>Bakım</small></div></div>'
  +'<div class="pati-alert-tools"><button type="button" data-action="notifications-read" '+(!unread||notificationBusy?'disabled':'')+'>'+ico('check-check')+' Tümünü okundu yap</button><button type="button" data-action="notifications-delete-all" '+(!all.length||notificationBusy?'disabled':'')+'>'+ico('trash-2')+' Tümünü temizle</button><button type="button" data-action="notifications-refresh" '+(notificationBusy?'disabled':'')+'>↻ '+(notificationBusy?'Yenileniyor…':'Yenile')+'</button></div>'
  +'<div class="pati-alert-push notification-v2-push"><span class="pati-alert-push-icon">'+ico('smartphone')+'</span><div><strong>Telefon bildirimleri</strong><p role="status">'+esc(statusText)+'</p><small>Bu cihazdaki bildirim iznini ve Patiyiz aboneliğini kontrol et.</small></div><div class="notification-v2-push-actions">'
  +(notificationPushStatus==='on'?'<button type="button" data-action="push-disable">Bu cihazda kapat</button>':notificationPushStatus==='unsupported'?'<span>Desteklenmiyor</span>':'<button type="button" data-action="push-enable" '+(notificationPushLoading?'disabled':'')+'>Etkinleştir</button>')
  +'<button type="button" data-action="notifications-check-push" '+(notificationPushLoading?'disabled':'')+'>Durumu kontrol et</button></div></div>'
  +'<p class="notification-v2-info">Telefon bildirimleri cihaz ve tarayıcı izinlerine bağlıdır. İzin vermek teslimatı garanti etmez. Uygulama içindeki kayıtlı bildirimlerin görülmesi için telefon bildirimlerinin açık olması gerekmez.</p>'
  +'<div class="notification-v2-search"><label for="notification-v2-search">Bildirimlerde ara</label><input id="notification-v2-search" type="search" value="'+esc(notificationSearch)+'" placeholder="Bildirim içeriği veya türü…" autocomplete="off" aria-controls="notification-v2-results"></div>'
  +'<div class="notification-v2-filters" role="group" aria-label="Bildirim filtreleri">'
  +[['all','Tümü ('+all.length+')'],['unread','Okunmamış ('+unread+')'],['messages','Mesajlar ('+counts.messages+')'],['social','Etkileşimler ('+counts.social+')'],['care','Bakım ('+counts.care+')']].map(([k,label])=>'<button type="button" data-action="notifications-filter" data-id="'+k+'" class="'+(notificationFilter===k?'active':'')+'" aria-pressed="'+String(notificationFilter===k)+'">'+label+'</button>').join('')+'</div>'
  +(notificationLoadError?'<p class="notification-v2-error" role="alert">'+esc(notificationLoadError)+'</p>':'')
  +'<div class="notification-v2-list-head"><h2>Bildirim geçmişi</h2><span role="status" aria-live="polite" id="notification-v2-result-count">'+list.length+' / '+all.length+' bildirim</span></div>'
  +'<div id="notification-v2-results" class="notification-v2-list">'+(notificationBusy?'<p role="status" class="notification-v2-loading">Bildirimler yenileniyor…</p>':list.length?notificationRows(list):'<div class="notification-v2-empty" role="status"><span aria-hidden="true">🔔</span><h3>Bu filtrelerde bildirim bulunamadı</h3><p>Başka bir kategori seçebilir veya filtreleri temizleyebilirsin.</p><button type="button" data-action="notifications-clear">Filtreleri temizle</button></div>')+'</div>'
  +(pageMore.notifications?'<div class="pati-load-more">'+button('Eski bildirimleri yükle','load-more','data-id="notifications"')+'</div>':'')+'</section>';
}
async function openNotification(id){const n=data.notifications.find(x=>x.id===id&&x.owner_id===me.id);if(!n){navigate('notifications');return}
 if(!n.read){const result=await sb.from('notifications').update({read:true}).eq('id',n.id).eq('owner_id',me.id).select('id');if(!result.error&&result.data?.length){n.read=true;navRender()}}
 if(['comments','post_likes'].includes(n.kind)&&n.post_id){openPost(n.post_id);return}
 if(n.kind==='messages'&&n.actor_id&&n.actor_id!==me.id&&!blocked.has(n.actor_id)){personId=n.actor_id;mobileChatOpen=true;navigate('messages');return}
 if(n.kind==='pet_reminder'){navigate('wellness');return}
 if(n.actor_id&&!blocked.has(n.actor_id)){profileId=n.actor_id;navigate('profile');return}
 navigate('notifications')}
async function routePendingNotification(){const id=new URL(location.href).searchParams.get('notification');if(!id)return;history.replaceState(null,'',location.pathname+location.hash);await openNotification(id)}
async function loadBlockedNames(){const r=await sb.rpc('patiyiz_my_blocked_profiles');if(r.error){console.warn('Engellenen hesap adları yüklenemedi',r.error.message);return}blockedProfiles=r.data||[];if(view==='blocked')render()}
function blockedPage(){const ids=[...blocked];main.innerHTML=header('Engellenenler','Engellediğin hesapları buradan yönetebilirsin.')+(ids.length?`<div class="pati-list">${ids.map(id=>{const p=data.profiles.find(x=>x.id===id)||blockedProfiles.find(x=>x.id===id);return `<div class="pati-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div class="pati-profile-row">${avatar(p||{display_name:'Engellenmiş hesap'})}<div><strong>${esc(p?.display_name||'Engellenmiş hesap')}</strong><small>Engellendi</small></div></div>${button('Engeli kaldır','block',`data-id="${esc(id)}"`,'outline-btn')}</div>`}).join('')}</div>`:empty('Engellenen hesap yok','Engellediğin hesaplar burada görünecek.'))}
// This list is server-paginated. It must not depend on the capped global follows dataset.
async function patiLoadFollowPage(reset=false){
 if(!me||!sb)return;
 const owner=followListId||me.id,followers=followListMode==='followers';
 const key=me.id+':'+owner+':'+followListMode,previous=patiFollowPageState;
 if(reset||previous.key!==key){
  patiFollowPageState={key,rows:[],next:0,hasMore:true,loading:false,error:'',viewerFollowing:new Set()};
 }
 const state=patiFollowPageState;
 if(state.loading||!state.hasMore)return;
 state.loading=true;state.error='';
 if(view==='follows-list')followListPage();
 const uid=me.id,loadToken=patiyizLoadToken,offset=state.next;
 try{
  const result=await sb.from('follows').select('follower_id,followee_id,created_at')
   .eq(followers?'followee_id':'follower_id',owner)
   .order('created_at',{ascending:false})
   .order(followers?'follower_id':'followee_id',{ascending:false})
   .range(offset,offset+PATI_FOLLOW_PAGE_SIZE-1);
  if(result.error)throw result.error;
  if(me?.id!==uid||loadToken!==patiyizLoadToken||patiFollowPageState!==state)return;
  const rows=result.data||[];
  const ids=[...new Set(rows.map(row=>followers?row.follower_id:row.followee_id))];
  const missing=ids.filter(id=>!data.profiles.some(p=>p.id===id));
  const queries=[];
  if(missing.length)queries.push(sb.from('profiles').select('*').in('id',missing));
  if(ids.length)queries.push(sb.from('follows').select('followee_id').eq('follower_id',uid).in('followee_id',ids));
  const extras=await Promise.all(queries);
  for(const x of extras)if(x.error)throw x.error;
  if(me?.id!==uid||loadToken!==patiyizLoadToken||patiFollowPageState!==state)return;
  if(missing.length){
   const profiles=extras[0].data||[],existing=new Set(data.profiles.map(p=>p.id));
   for(const profile of profiles)if(!existing.has(profile.id)){data.profiles.push(profile);existing.add(profile.id)}
  }
  if(ids.length){
   const follows=extras[extras.length-1].data||[];
   for(const follow of follows)state.viewerFollowing.add(follow.followee_id);
  }
  const existing=new Set(state.rows.map(row=>row.follower_id+'|'+row.followee_id));
  for(const row of rows){const id=row.follower_id+'|'+row.followee_id;if(!existing.has(id)){state.rows.push(row);existing.add(id)}}
  state.next=offset+rows.length;
  state.hasMore=rows.length===PATI_FOLLOW_PAGE_SIZE;
 }catch(error){
  if(me?.id===uid&&loadToken===patiyizLoadToken&&patiFollowPageState===state){
   state.error='Takip listesi yüklenemedi. Tekrar deneyebilirsin.';
   console.warn('Takip listesi sayfalama:',error?.message||error);
  }
 }finally{
  state.loading=false;
  if(me?.id===uid&&view==='follows-list'&&patiFollowPageState===state)followListPage();
 }
}
function followListPage(){
 const owner=followListId||me.id,followers=followListMode==='followers';
 const key=me.id+':'+owner+':'+followListMode,state=patiFollowPageState;
 const scoped=state.key===key,records=scoped?state.rows:[];
 const ids=[...new Set(records.map(f=>followers?f.follower_id:f.followee_id))].filter(id=>!blocked.has(id));
 const isFollowing=id=>followed.has(id)||(scoped&&state.viewerFollowing.has(id));
 const title=followers?'Takipçiler':'Takip edilenler';
 main.innerHTML=`<div class="pati-follow-backbar"><button type="button" class="pati-follow-back" data-action="followers-back" aria-label="Profile geri dön">←</button><span>Profile dön</span></div>`+
 header(title,'Kullanıcı profillerini görüntüleyebilirsin.')+
 `<div class="pati-list">${ids.map(id=>`<div class="pati-card pati-follow-person">${userRow(id)}${id!==me.id?button(isFollowing(id)?'Takiptesin':followers&&owner===me.id?'Sen de takip et':'Takip et','follow',`data-id="${esc(id)}"`):''}</div>`).join('')}`+
 (!ids.length&&scoped&&!state.loading&&!state.error?empty('Bu listede henüz kimse yok.'):'')+
 (scoped&&state.error?'<p class="pati-note" role="alert">'+esc(state.error)+'</p>':'')+
 `<div class="pati-load-more">${!scoped||state.loading?'<p role="status">Takip listesi yükleniyor…</p>':state.hasMore||state.error?button(state.error?'Yeniden dene':'Daha fazla kullanıcı yükle','follow-load-more'):' '}</div></div>`;
}
function settingsPage(){main.innerHTML=header('Ayarlar ve Gizlilik','Hesap, güvenlik ve bildirim tercihlerini yönet.')+`<div class="pati-settings-list"><section class="pati-card pati-theme-card"><h3>◑ Görünüm</h3><p>Uygulamanın açık veya koyu görünümünü seç. Seçimin bu cihazda saklanır.</p><div class="pati-theme-options"><button type="button" data-action="theme-set" data-id="light" aria-pressed="${patiyizCurrentTheme()==='light'}" class="${patiyizCurrentTheme()==='light'?'active':''}">☀️ Açık</button><button type="button" data-action="theme-set" data-id="dark" aria-pressed="${patiyizCurrentTheme()==='dark'}" class="${patiyizCurrentTheme()==='dark'?'active':''}">☾ Koyu</button></div></section>${isAdmin?`<section class="pati-card"><h3>🛡️ Yönetim Paneli</h3><p>Patiyiz kullanıcılarını, içerikleri ve şikâyetleri yönet.</p>${button('Yönetim Panelini Aç','open-admin')}</section>`:''}<section class="pati-card pati-dm-receipts-setting"><h3>✓✓ Mesajlarda görüldü bilgisi</h3><p>Kapatırsan bundan sonra okuduğun mesajlar karşı tarafa görüldü olarak bildirilmez. Bu cihazda okundu işareti tutulur.</p><button type="button" data-action="dm-receipts-toggle" role="switch" aria-checked="${patiDmReadReceiptsEnabled()}">${patiDmReadReceiptsEnabled()?'Açık · Kapat':'Kapalı · Aç'}</button></section><section class="pati-card"><h3>🔒 Hesap güvenliği</h3><p>Şifreni güncellemek için yeni şifreni belirle.</p>${button('Şifremi değiştir','settings-password')}</section><section class="pati-card pati-settings-notifications"><h3>🔔 Bildirim tercihleri</h3><p>Mesaj, etkileşim ve bakım bildirimlerini Bildirim Merkezi'nden takip et. Telefonunun izin ve abonelik durumunu orada kontrol edip bildirimleri bu cihaz için açabilir veya kapatabilirsin.</p><div class="pati-actionbar"><button type="button" class="soft-btn" data-view="notifications">Bildirim Merkezi ve cihaz ayarları</button></div></section><section class="pati-card"><h3>🛡️ Gizlilik ve engellenenler</h3><p>Engellediğin kullanıcıları görüntüle ve engellerini yönet.</p>${button('Engellenenler ('+blocked.size+')','blocked-list')}</section><section class="pati-card"><h3>📄 Gizlilik ve kullanım şartları</h3><p>Kişisel verilerin işlenmesini ve topluluk kurallarını incele.</p><div class="pati-actionbar"><a href="privacy.html" target="_blank" rel="noopener">Gizlilik Politikası</a><a href="terms.html" target="_blank" rel="noopener">Kullanım Şartları</a></div></section><section class="pati-card"><h3>Hesabım</h3><p>Oturumunu kapatabilir veya hesabını ve bağlı kişisel verilerini kalıcı olarak silebilirsin.</p><div class="pati-actionbar">${button('Çıkış yap','logout','','outline-btn')}${!isAdmin?button('Hesabımı kalıcı olarak sil','delete-account-open','','danger'):''}</div></section></div>`}
const profileCountCache=new Map(),profileCountInFlight=new Set(),profileCountRevision=new Map();
const pendingProfileFollows=new Set();
async function syncProfileCounts(id,force=false){
 if(!me||!id||profileCountInFlight.has(id))return;
 const cached=profileCountCache.get(id);
 if(!force&&cached&&Date.now()-cached.at<20000){renderProfileCounts(id,cached.value);return}
 const revision=profileCountRevision.get(id)||0;
 profileCountInFlight.add(id);
 try{
  const results=await Promise.all([
   sb.from('posts').select('id',{count:'exact',head:true}).eq('author_id',id),
   sb.from('follows').select('follower_id',{count:'exact',head:true}).eq('followee_id',id),
   sb.from('follows').select('followee_id',{count:'exact',head:true}).eq('follower_id',id)
  ]);
  if(results.some(r=>r.error))throw results.find(r=>r.error).error;
  // An older count query must not overwrite an in-flight follow/unfollow action.
  if(revision!==(profileCountRevision.get(id)||0))return;
  const value={posts:results[0].count??0,followers:results[1].count??0,following:results[2].count??0};
  profileCountCache.set(id,{value,at:Date.now()});renderProfileCounts(id,value);
 }catch(e){console.warn('Profil sayaçları yüklenemedi:',e.message)}
 finally{profileCountInFlight.delete(id)}
}
function renderProfileCounts(id,stats){
 if(view!=='profile'||(profileId||me?.id)!==id)return;
 const wrap=main.querySelector('.pati-ig-stats');if(!wrap)return;
 for(const key of ['posts','followers','following']){const b=wrap.querySelector('[data-pati-count="'+key+'"]');if(b)b.textContent=stats[key]}
 if(id===me?.id&&window.PatiyizFollowerMilestones){
  const hint=main.querySelector('.pati-follower-hint');
  if(hint)hint.innerHTML=window.PatiyizFollowerMilestones.profileHint(stats.followers);
 }
}
function profilePage(){
 const p=profile(profileId||me.id),own=p.id===me.id,pets=data.pets.filter(x=>x.owner_id===p.id);
 const posts=[...data.posts.filter(x=>x.author_id===p.id)].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const myFollowing=new Set(data.follows.filter(f=>f.follower_id===me.id).map(f=>f.followee_id));
 const mutualFollowers=!own?[...new Set(data.follows.filter(f=>f.followee_id===p.id&&f.follower_id!==me.id&&myFollowing.has(f.follower_id)&&!blocked.has(f.follower_id)).map(f=>f.follower_id))].slice(0,20):[];
 const mutualMarkup=mutualFollowers.length?'<div class="pati-mutual-followers"><span class="pati-mutual-avatars">'+mutualFollowers.slice(0,3).map(id=>'<button type="button" data-action="view-user" data-id="'+esc(id)+'" aria-label="'+esc(profile(id).display_name)+' profiline git">'+avatar(profile(id),'s')+'</button>').join('')+'</span><span>'+mutualFollowers.slice(0,2).map(id=>'<strong>'+esc(profile(id).display_name)+'</strong>').join(', ')+(mutualFollowers.length>2?' ve '+(mutualFollowers.length-2)+' kişi daha':'')+' ortak takipçi</span></div>':'';
 const followsMe=!own&&data.follows.some(f=>f.follower_id===p.id&&f.followee_id===me.id);
 const followBack=!own&&!followed.has(p.id)&&followsMe;
 const cachedCounts=profileCountCache.get(p.id)?.value;const followers=cachedCounts?.followers??data.follows.filter(f=>f.followee_id===p.id).length,following=cachedCounts?.following??data.follows.filter(f=>f.follower_id===p.id).length;
 const stories=data.stories.filter(x=>x.author_id===p.id&&new Date(x.expires_at).getTime()>Date.now());const assignedIds=new Set(data.highlightItems.filter(x=>data.highlightAlbums.some(a=>a.id===x.album_id&&a.owner_id===p.id)).map(x=>x.story_id));const highlights=data.stories.filter(x=>x.author_id===p.id&&x.is_highlight&&!assignedIds.has(x.id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));const albums=data.highlightAlbums.filter(x=>x.owner_id===p.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 const storyThumb=stories[0]?.image_url||'';
 const active=profilePostsTab==='videos'?posts.filter(x=>x.video_url):profilePostsTab==='text'?posts.filter(x=>!x.image_url&&!x.video_url):posts.filter(x=>x.image_url||x.video_url);
 const iconTabs=[['media','▦','Fotoğraf ve videolar'],['videos','▷','Videolar'],['text','≡','Yazılar']];
 if(own)void patiLoadProfileViewCounts(posts.map(x=>x.id),p.id);
 const grid=active.map(x=>'<button type="button" class="pati-profile-tile '+(!x.image_url&&!x.video_url?'pati-profile-text-tile':'')+'" data-action="profile-open-post" data-id="'+esc(x.id)+'" aria-label="Paylaşımı aç">'+(x.image_url?'<img loading="lazy" decoding="async" src="'+esc(x.image_url)+'" alt="Paylaşım görseli">':x.video_url?(x.video_cover_url?'<img loading="lazy" decoding="async" src="'+esc(x.video_cover_url)+'" alt="Video kapağı">':'<video muted playsinline preload="metadata" src="'+esc(x.video_url)+'#t=0.1"></video>'):'<span>'+esc(cut(x.body||'Yazılı gönderi',110))+'</span>')+(x.video_url?'<b class="pati-profile-play">▶</b>':'')+(own?'<span class="pati-profile-view-count" aria-label="Görüntülenme sayısı">◉ <span data-pati-view-count="'+esc(x.id)+'">'+(patiPostViewCounts.has(x.id)?patiPostViewCounts.get(x.id).toLocaleString('tr-TR'):'—')+'</span></span>':'')+'</button>').join('');
 const profileContent=profilePostsTab==='text'?'<div class="pati-profile-text-feed" aria-label="Yazı paylaşımları">'+(active.length?active.map((x,i)=>postCard(x,i===0)).join(''):'<p class="pati-ig-empty">Henüz yazı paylaşımı yok.</p>')+'</div>':'<div class="pati-ig-grid">'+(grid||'<p class="pati-ig-empty">Bu bölümde henüz paylaşım yok.</p>')+'</div>';
 main.innerHTML=(own?patiyizProgressCard():'')+'<div class="pati-ig-profile">'+(!own?'<div class="pati-profile-back">'+button('← Geri','profile-back')+'</div>':'')+
 '<div class="pati-ig-summary"><div class="pati-ig-avatar">'+avatar(p,'l')+'</div><div class="pati-ig-info"><div class="pati-ig-handle-row"><strong class="pati-ig-handle">@'+esc(p.handle||'patiyiz')+'</strong>'+verifiedBadge(p)+'</div><strong class="pati-ig-name">'+esc(p.display_name||'Patiyiz üyesi')+'</strong><div class="pati-ig-stats"><span><b data-pati-count="posts">'+(cachedCounts?.posts??posts.length)+'</b><small>gönderi</small></span><button type="button" data-action="followers-list" data-id="'+esc(p.id)+'" data-mode="followers"><b data-pati-count="followers">'+followers+'</b><small>takipçi</small></button><button type="button" data-action="followers-list" data-id="'+esc(p.id)+'" data-mode="following"><b data-pati-count="following">'+following+'</b><small>takip edilen</small></button></div></div></div>'+
 (p.bio?'<div class="pati-ig-bio">'+esc(p.bio)+'</div>':'')+mutualMarkup+
 
 '<div class="pati-ig-actions">'+(own?button('Profili düzenle','edit-profile'):button(followed.has(p.id)?'Takiptesin':followBack?'Sen de takip et':'Takip et','follow','data-id="'+esc(p.id)+'"'+(followBack?' data-follow-back="true"':''))+button('Mesaj gönder','chat','data-id="'+esc(p.id)+'"')+button('Hesabı bildir','report','data-id="'+esc(p.id)+'" data-kind="profile"'))+'</div>'+
 '<div class="pati-ig-tabs" role="tablist" aria-label="Profil gönderileri">'+iconTabs.map(x=>'<button type="button" role="tab" aria-selected="'+(profilePostsTab===x[0])+'" class="'+(profilePostsTab===x[0]?'active':'')+'" data-action="profile-posts-tab" data-id="'+x[0]+'" aria-label="'+x[2]+'">'+x[1]+'</button>').join('')+'</div>'+
 profileContent+
 '</div>';
 void syncProfileCounts(p.id);
}
function formField(name,label,type='text',val='',required=false){return `<div class="pati-field"><label for="f-${name}">${esc(label)}</label><input id="f-${name}" name="${name}" type="${type}" ${required?'required':''} value="${esc(val)}"></div>`}
function selectField(name,label,options,val=''){return `<div class="pati-field"><label>${esc(label)}</label><select name="${name}">${options.map(x=>`<option ${x===val?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`}
function textField(name,label,val='',required=true,max=1500){return `<div class="pati-field"><label>${esc(label)}</label><textarea name="${name}" maxlength="${max}" ${required?'required':''}>${esc(val)}</textarea></div>`}
function storyPhotoField(){
 return '<section class="pati-story-quick-media" aria-label="Hikâye fotoğrafı seç"><div class="pati-story-quick-intro"><span class="pati-story-quick-icon" aria-hidden="true">✦</span><div><strong>Hikâyeni oluştur</strong><small>Galerinden seç veya fotoğraf çek.</small></div></div>'+
  '<div class="pati-story-quick-buttons"><button type="button" data-action="pati-story-gallery" class="pati-story-quick-primary">Galeriden seç</button><button type="button" data-action="pati-story-camera" class="pati-story-quick-secondary">Kamera</button></div>'+
  '<div class="pati-media-gallery pati-story-quick-preview" id="story-photo-preview" hidden></div>'+
  '<input type="file" name="story_gallery" accept="image/*,.heic,.heif" class="pati-native-input" aria-label="Galeriden hikâye fotoğrafı seç"><input type="file" name="story_camera" accept="image/*" capture="environment" class="pati-native-input" aria-label="Kamerayla hikâye fotoğrafı çek"></section>';
}

function imageField(){return '<div class="pati-field"><label>Fotoğraf seç</label><input type="file" accept="image/*,.heic,.heif" name="photo" multiple><p class="small-note">Galeriden seç veya kamerayla çek. Büyük fotoğraflar otomatik hazırlanır.</p><div class="pati-upload-preview" hidden></div></div>'}
let patiyizCommentSheetPost='';
const patiyizCommentExpandedReplies=new Set();
function patiCommentAge(date){
 const t=new Date(date).getTime();
 if(!Number.isFinite(t))return '';
 const seconds=Math.max(0,Math.floor((Date.now()-t)/1000));
 return seconds<60?seconds+'sn':seconds<3600?Math.floor(seconds/60)+'dk':seconds<86400?Math.floor(seconds/3600)+'sa':Math.floor(seconds/86400)+'g';
}
// Fetch comments for the actual post rather than relying on the global 1,500-row cache.
async function patiFetchPostComments(postId,more=false){
 if(!me||!sb||!/^[0-9a-f-]{36}$/i.test(postId||''))return;
 const owner=me.id,token=patiyizLoadToken;
 let state=patiPostCommentPages.get(postId);
 if(!state){state={rows:[],ready:false,loading:false,hasMore:true,error:'',at:0};patiPostCommentPages.set(postId,state)}
 if(state.loading||(more&&!state.hasMore)||(!more&&state.ready&&Date.now()-state.at<30000))return;
 state.loading=true;state.error='';
 const last=more&&state.rows.length?state.rows.reduce((v,row)=>!v||row.created_at<v.created_at||(row.created_at===v.created_at&&row.id<v.id)?row:v,null):null;
 try{
  let query=sb.from('comments').select('*').eq('post_id',postId)
   .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100);
  if(last)query=query.or('created_at.lt.'+last.created_at+',and(created_at.eq.'+last.created_at+',id.lt.'+last.id+')');
  const result=await query;
  if(result.error)throw result.error;
  if(me?.id!==owner||patiyizLoadToken!==token||patiPostCommentPages.get(postId)!==state)return;
  const rows=result.data||[],merged=new Map((more?state.rows:[]).map(c=>[c.id,c]));
  for(const row of rows)merged.set(row.id,row);
  state.rows=[...merged.values()];state.ready=true;state.hasMore=rows.length===100;state.at=Date.now();
  data.comments=[...data.comments.filter(c=>c.post_id!==postId),...state.rows];
 }catch(error){
  if(me?.id===owner&&patiPostCommentPages.get(postId)===state){
   state.error='Yorumlar yüklenemedi. Yeniden deneyebilirsin.';
   console.warn('Gönderi yorumları:',error?.message||error);
  }
 }finally{
  state.loading=false;
  if(me?.id===owner&&patiPostCommentPages.get(postId)===state&&document.getElementById('comment-form')?.dataset.post===postId)showComments(postId);
 }
}
function showComments(postId){
 if(!postId||!me)return;
 const previous=document.getElementById('comment-form');
 const same=previous?.dataset.post===postId;
 const draft=same?previous.querySelector('[name="body"]')?.value||'':'';
 const parent=same?previous.dataset.parent||'':'';
 const scroll=same?previous.querySelector('.comment-list')?.scrollTop||0:0;
 if(patiyizCommentSheetPost!==postId){patiyizCommentExpandedReplies.clear();patiyizCommentSheetPost=postId}
 const post=data.posts.find(p=>p.id===postId);
 const author=post?profile(post.author_id):null;
 const scoped=typeof patiPostCommentPages!=='undefined'?patiPostCommentPages.get(postId):null;
 const source=scoped?.ready?scoped.rows:data.comments.filter(c=>c.post_id===postId);
 const items=source.filter(c=>!blocked.has(c.author_id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 const commentById=new Map(items.map(c=>[c.id,c]));
 const children=new Map();
 for(const c of items){if(c.parent_id&&commentById.has(c.parent_id)){const branch=children.get(c.parent_id)||[];branch.push(c);children.set(c.parent_id,branch)}}
 const renderComment=(c,depth=0,seen=new Set())=>{
  if(seen.has(c.id))return '';
  const chain=new Set([...seen,c.id]),person=profile(c.author_id),replyList=children.get(c.id)||[];
  const count=data.commentLikes.filter(x=>x.comment_id===c.id).length;
  const isLiked=data.commentLikes.some(x=>x.comment_id===c.id&&x.user_id===me.id);
  const isExpanded=patiyizCommentExpandedReplies.has(c.id);
  const fullName=displayName(person);
  return '<div class="comment-item pati-sheet-comment '+(depth?'pati-sheet-reply':'')+'" style="--pati-comment-depth:'+Math.min(depth,3)+'" data-comment-id="'+esc(c.id)+'">'+
   '<div class="pati-sheet-comment-avatar">'+avatar(person,'s')+'</div>'+
   '<div class="pati-sheet-comment-main"><div class="pati-sheet-comment-line"><strong>'+fullName+'</strong><time>'+patiCommentAge(c.created_at)+'</time></div>'+
   '<p>'+esc(c.body)+'</p>'+
   '<div class="comment-actions">'+
   '<button type="button" data-action="comment-reply" data-id="'+esc(c.id)+'">Yanıtla</button>'+
   (c.author_id===me.id?'<button type="button" data-action="comment-delete" data-id="'+esc(c.id)+'">Sil</button>':'<button type="button" data-action="report" data-kind="comment" data-id="'+esc(c.id)+'">Bildir</button>')+
   '</div>'+
   (replyList.length?'<button type="button" class="pati-comment-replies-toggle" data-action="comment-thread-toggle" data-id="'+esc(c.id)+'" aria-expanded="'+isExpanded+'">'+
    (isExpanded?'— Yanıtları gizle':'— '+replyList.length+' diğer yanıtı gör')+'</button>':'')+
   (replyList.length&&isExpanded?'<div class="pati-comment-children">'+replyList.map(child=>renderComment(child,depth+1,chain)).join('')+'</div>':'')+
   '</div><button type="button" class="pati-comment-heart '+(isLiked?'active':'')+'" data-action="comment-like" data-id="'+esc(c.id)+'" aria-label="'+(isLiked?'Yorum beğenisini kaldır':'Yorumu beğen')+'" aria-pressed="'+isLiked+'">'+ico('heart')+'<small>'+count+'</small></button></div>';
 };
 const roots=items.filter(c=>!c.parent_id||!commentById.has(c.parent_id));
 const intro=post&&author?'<section class="pati-comment-post-summary">'+
  '<div class="pati-comment-post-user">'+avatar(author,'s')+'<strong>'+displayName(author)+'</strong>'+
  (author.id!==me.id?'<button type="button" data-action="follow" data-id="'+esc(author.id)+'" class="pati-comment-follow '+(followed.has(author.id)?'is-following':'')+'">'+(followed.has(author.id)?'Takiptesin':'Takip et')+'</button>':'')+'</div>'+
  '<p>'+esc(cut(post.video_subtitle||post.body||'',500))+'</p><small>'+esc(day(post.created_at))+'</small>'+
  '</section>':'';
 modal('Yorumlar',intro+
  '<div class="comment-list" role="list" aria-label="Yorumlar">'+
  (scoped&&(scoped.hasMore||scoped.error)?'<div class="pati-load-more">'+button(scoped.error?'Yeniden dene':'Önceki yorumlar','comment-more','data-id="'+esc(postId)+'"')+'</div>':'')+
  (roots.length?roots.map(c=>renderComment(c)).join(''):'<p class="pati-comments-empty">Henüz yorum yok. İlk yorumu sen yazabilirsin.</p>')+'</div>'+
  '<p id="comment-reply-hint" class="pati-comment-reply-hint" aria-live="polite"></p>',
  'comment-form');
 const form=document.getElementById('comment-form');if(!form)return;
 form.dataset.post=postId;
 const dialog=form.closest('.modal');dialog?.classList.add('pati-instagram-comments');
 const backdrop=form.closest('.modal-backdrop');backdrop?.classList.add('pati-instagram-comments-backdrop');
 const footer=form.querySelector('.modal-footer');
 if(footer)footer.innerHTML='<div class="pati-comment-quick">'+['❤️','🙌','🔥','👏','🥹','😍','😂'].map(e=>'<button type="button" data-action="comment-emoji" data-emoji="'+e+'">'+e+'</button>').join('')+'</div>'+
 '<div class="pati-comment-editor-row"><div class="pati-comment-me">'+avatar(current(),'s')+'</div>'+
 '<textarea name="body" aria-label="Yorum ekle" maxlength="750" rows="1" required placeholder="Yorum ekle..."></textarea>'+
 '<button type="submit" class="pati-comment-send">Gönder</button></div>';
 const input=form.querySelector('[name="body"]');if(input)input.value=draft;
 if(parent){form.dataset.parent=parent;const who=profile(data.comments.find(c=>c.id===parent)?.author_id);const hint=form.querySelector('#comment-reply-hint');if(hint)hint.innerHTML='↳ '+displayName(who)+' kullanıcısına yanıt <button type="button" data-action="comment-reply-cancel">× Vazgeç</button>'}
 const list=form.querySelector('.comment-list');if(list)list.scrollTop=scroll;
}
function modal(title,form,id='entry-form'){let root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop" data-action="close"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button type="button" class="close-modal" data-action="close" aria-label="Pencereyi kapat">×</button></div><form id="${id}"><div class="modal-content">${form}</div><div class="pati-upload-status" role="status" aria-live="polite" hidden><i class="pati-upload-spinner"></i><span>Yükleniyor…</span></div><div class="modal-footer"><button class="outline-btn" type="button" data-action="close">İptal</button><button class="primary-btn" type="submit">Kaydet</button></div></form></section></div>`}
function closeModal(force=false){if(!force&&busy&&document.querySelector('#modal-root .pati-upload-status:not([hidden])')){notify('İşlem sürüyor. Tamamlanmasını bekle.',true);return}if(typeof patiPetPhotoObjectUrl!=='undefined'&&patiPetPhotoObjectUrl){URL.revokeObjectURL(patiPetPhotoObjectUrl);patiPetPhotoObjectUrl=''}window.PatiyizReelsEditor?.dispose();clearPatiMediaUrls();if(typeof lostPhotoObjectUrl!=='undefined'&&lostPhotoObjectUrl){URL.revokeObjectURL(lostPhotoObjectUrl);lostPhotoObjectUrl=''}$('#modal-root').innerHTML='';if(document.getElementById('story-overlay')&&!storyTimer&&storyItems.length)storyTimer=setTimeout(()=>stepStory(1),6000)}
const species=['Kedi','Köpek','Muhabbet kuşu','Papağan','Kanarya','Kuş','Tavşan','Hamster','Ginepig','Fare','Sıçan','Gerbil','Çinçilla','Kemirgen','Balık','Japon balığı','Beta balığı','Akvaryum balığı','Kaplumbağa','Su kaplumbağası','Kara kaplumbağası','Kertenkele','Geko','İguana','Bukalemun','Yılan','Sürüngen','Kurbağa','Semender','Amfibi','Kirpi','Gelincik','At','Midilli','Eşek','Keçi','Koyun','İnek','Tavuk','Ördek','Kaz','Güvercin','Arı','Omurgasız','Diğer'];
const petGenders=['Belirtilmedi','Erkek','Dişi','Bilinmiyor','İnterseks'];
const ownPets=()=>data.pets.filter(p=>p.owner_id===me.id);
const petOptions=()=>`<div class="pati-field"><label>Hayvan profili (isteğe bağlı)</label><select name="pet_id"><option value="">Seçilmedi</option>${ownPets().map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>`;
let patiMediaUrls=[];
function clearPatiMediaUrls(){for(const url of patiMediaUrls)URL.revokeObjectURL(url);patiMediaUrls=[]}
function makePatiMediaUrl(file){const url=URL.createObjectURL(file);patiMediaUrls.push(url);return url}
function postMediaField(mode){
 const reel=mode==='reels',story=mode==='story';
 const description=reel?'Kısa videonu galeriden seç veya kamerayla çek.':story?'Bir fotoğraf ya da kısa video seç.':'En fazla 10 fotoğraf veya 1 video paylaşabilirsin.';
 const title=reel?'Reels videosu':story?'Hikâyen':'Fotoğraf ve video';
 return '<section class="pati-compose-media" aria-label="Medya seçimi"><div class="pati-media-intro"><span class="pati-media-icon">'+(reel?'▷':story?'✦':'▧')+'</span><div><strong>'+title+'</strong><p>'+description+'</p></div></div>'+
 '<div class="pati-media-gallery" id="pati-post-media-gallery"><div class="pati-media-empty"><span>▧</span><strong>Galerinden bir an seç</strong><small>Fotoğraf veya video seçerek başlayabilirsin.</small></div></div>'+
 '<div class="pati-media-thumbs" id="pati-post-media-thumbs" hidden></div>'+
 '<div class="pati-media-picker-actions"><button type="button" class="pati-media-pick-primary" data-action="pati-media-gallery">▧ Galeriyi aç</button><button type="button" class="pati-media-pick-secondary" data-action="pati-media-camera">◎ '+(reel?'Video çek':'Fotoğraf çek')+'</button>'+(!reel?'<button type="button" class="pati-media-pick-secondary" data-action="pati-media-video">▷ Video seç</button>':'')+'</div>'+
 (reel?'<div class="pati-reels-editor"><label>Video kapak fotoğrafı <input type="file" name="cover_photo" accept="image/*" aria-label="Video kapağı seç"></label><label>Video altyazısı <input name="video_subtitle" maxlength="220" placeholder="Video için altyazı"></label></div>':story?'<div class="pati-reels-editor"><label>Video kapağı (isteğe bağlı) <input type="file" name="cover_photo" accept="image/*" aria-label="Hikâye video kapağı seç"></label></div>':'')+
 '<p class="pati-media-help">'+(reel?'MP4, WebM veya MOV · Reels editörü ve video kapağı.':story?'Fotoğraf ya da en fazla 25 MB video · 24 saatlik hikâye.':'JPG, PNG, HEIC ve desteklenen videolar.')+'</p>'+
 '<input type="file" name="photo" accept="image/*,.heic,.heif" '+(!story&&!reel?'multiple':'')+' class="pati-native-input" aria-label="Fotoğraf seç"><input type="file" name="video" accept="video/mp4,video/webm,video/quicktime,.mov"'+(reel?' multiple':'')+' class="pati-native-input" aria-label="Video seç"></section>';
}
function openComposerMediaPicker(kind){
 const form=document.getElementById('post-form');if(!form)return;
 const reel=form.dataset.mode==='reels',story=form.dataset.mode==='story';
 const input=form.querySelector('input[name="'+(reel?'video':'photo')+'"]');if(!input)return;
 // Native gallery/camera picker; chosen-image grid appears only after selection.
 if(kind==='camera'){input.setAttribute('capture','environment');input.multiple=false}
 else{input.removeAttribute('capture');input.multiple=!(reel||story)}
 input.click();
}
function openStoryComposer(autoPick=true,makeHighlight=false){
 // Kept as a compatibility entry point: every share type now uses the same composer.
 return compose(null,'story',autoPick);
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
 clearPatiMediaUrls();box.replaceChildren();box.hidden=!file?.size;box.classList.toggle('has-media',!!file?.size);
 if(!file?.size)return;
 const img=document.createElement('img');img.alt='Hikâye fotoğrafı önizlemesi';img.src=makePatiMediaUrl(file);box.appendChild(img);
 const info=document.createElement('span');info.className='pati-media-file-name';info.textContent=file.name;box.appendChild(info);
}
function updatePostMediaPreview(){
 const f=document.getElementById('post-form'),box=document.getElementById('pati-post-media-gallery'),thumbs=document.getElementById('pati-post-media-thumbs');if(!f||!box||!thumbs)return;
 clearPatiMediaUrls();box.replaceChildren();thumbs.replaceChildren();
 const images=[...(f.querySelector('input[name="photo"]')?.files||[])],video=f.querySelector('input[name="video"]')?.files?.[0];
 const files=images.length?images:video?.size?[video]:[],isVideo=!images.length&&!!video?.size;
 box.classList.toggle('has-media',!!files.length);thumbs.hidden=images.length<2;
 if(!files.length){box.innerHTML='<div class="pati-media-empty"><span>▧</span><strong>Galerinden bir an seç</strong><small>Fotoğraf veya video seçmek için aşağıya dokun.</small></div>';return}
 const selected=files[Math.min(postCropIndex,files.length-1)];
 if(isVideo){const v=document.createElement('video');v.src=makePatiMediaUrl(selected);v.controls=true;v.playsInline=true;v.preload='metadata';v.setAttribute('aria-label','Reels veya gönderi video önizlemesi');box.appendChild(v)}
 else{const img=document.createElement('img');img.src=makePatiMediaUrl(selected);img.alt='Seçilen fotoğrafın önizlemesi';box.appendChild(img)}
 const count=document.createElement('span');count.className='pati-media-count';count.textContent=isVideo?'Video seçildi':files.length+' fotoğraf seçildi';box.appendChild(count);
 if(images.length>1){images.forEach((file,i)=>{const tile=document.createElement('button');tile.type='button';tile.className='pati-media-thumb'+(i===postCropIndex?' active':'');tile.dataset.action='pati-media-select';tile.dataset.id=String(i);tile.setAttribute('aria-label',(i+1)+'. fotoğrafı önizle');const preview=document.createElement('img');preview.src=makePatiMediaUrl(file);preview.alt='Fotoğraf '+(i+1);tile.appendChild(preview);thumbs.appendChild(tile)})}
}

function patiDraftKey(){return 'patiyiz-social-draft-'+(me?.id||'guest')}
function getPatiDraft(){try{return JSON.parse(localStorage.getItem(patiDraftKey())||'null')}catch{return null}}
function draftSave(){
 const form=document.getElementById('post-form');if(!form||form.dataset.edit)return;
 const body=form.querySelector('textarea[name="body"]')?.value||'';
 try{localStorage.setItem(patiDraftKey(),JSON.stringify({body,created_at:Date.now()}));notify('Açıklama taslağı kaydedildi. Fotoğraf ve videolar taslakta saklanmaz.')}catch{notify('Taslak bu cihazda kaydedilemedi.',true)}
}
function draftRestore(){
 const form=document.getElementById('post-form'),draft=getPatiDraft();if(!form||!draft)return notify('Kayıtlı taslak yok.',true);
 const body=form.querySelector('textarea[name="body"]');
 if(body)body.value=draft.body||'';
 notify('Taslak açıklaması yüklendi.');
}
function startPatiCameraPost(){
 compose(null,'post',false);
 if(!window.PatiyizCameraFlow){openComposerMediaPicker('gallery');return}
 const form=document.querySelector('#post-form');
 if(!form)return;
 window.PatiyizCameraFlow.open({
  onPhotos(files){
   const input=form.querySelector('input[name="photo"]');
   const transfer=new DataTransfer();files.forEach(file=>transfer.items.add(file));
   input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  },
  onCancel(){closeModal(true)},
  onPublish(caption){
   if(!form.isConnected)throw Error('Paylaşım ekranı kapandı.');
   form.querySelector('textarea[name="body"]').value=caption;
   const modalRoot=document.getElementById('modal-root');
   const observer=new MutationObserver(()=>{
    if(!form.isConnected){observer.disconnect();window.PatiyizCameraFlow?.close();}
   });
   observer.observe(modalRoot,{childList:true,subtree:true});
   // Keep the same publish transaction, Supabase validation, media processing and status.
   form.requestSubmit();
  }
 });
}

function compose(post,mode='post',autoPick=true){
 postCropX=.5;postCropY=.5;postCropRatio=mode==='story'?'9:16':'4:5';postCropZoom=1;postCropIndex=0;clearPatiMediaUrls();
 const reel=!post&&mode==='reels',story=!post&&mode==='story',textOnly=!post&&mode==='text';
 const title=post?'Paylaşımı düzenle':story?'Yeni hikâye':reel?'Yeni Reels':textOnly?'Yeni yazı':'Yeni gönderi';
 const sizes=story?[['9:16','▯ Dikey'],['1:1','□ Kare'],['1.91:1','▭ Yatay']]:[['4:5','▯ Dikey'],['1.91:1','▭ Yatay'],['1:1','□ Kare']];
 const editor=!post&&!textOnly?'<div class="pati-media-controls" hidden><label>Fotoğrafın kadrajını düzenle</label><div class="pati-ratio-options">'+sizes.map(([key,label],i)=>'<button type="button" class="'+(i===0?'active':'')+'" data-action="post-ratio" data-id="'+key+'">'+label+'</button>').join('')+'</div><input type="hidden" name="aspect" value="'+(story?'9:16':'4:5')+'"><button type="button" class="pati-inline-crop-toggle" data-action="post-crop-open">Kadrajı ayarla</button><div class="pati-crop-preview" hidden><div class="pati-crop-pages"><button type="button" data-action="post-crop-prev" aria-label="Önceki fotoğraf">‹</button><strong id="pati-crop-index">1 / 1</strong><button type="button" data-action="post-crop-next" aria-label="Sonraki fotoğraf">›</button></div><canvas id="pati-crop-canvas" width="320" height="400" aria-label="Fotoğraf kırpma önizlemesi"></canvas><p>Fotoğrafı sürükleyerek istediğin kadrajı seç.</p><label>Yakınlaştır <input type="range" name="crop_zoom" min="1" max="2.5" value="1" step="0.05"></label></div></div>':textOnly?'':'<p class="small-note">Düzenleme sırasında mevcut medya korunur.</p>';
 const formBody=(!post&&!textOnly?postMediaField(mode):'')+textField('body',textOnly?'Ne düşünüyorsun?':story?'Hikâyene bir açıklama ekle…':'Bir açıklama ekle…',post?.body||'',textOnly)+editor;
 modal(title,formBody,'post-form');
 const f=document.getElementById('post-form');f.dataset.edit=post?.id||'';f.dataset.mode=story?'story':reel?'reels':textOnly?'text':'post';
 const submit=f.querySelector('.modal-footer button[type="submit"]');if(submit)submit.textContent=post?'Değişiklikleri kaydet':story?'Hikâyeyi paylaş':reel?'Reels paylaş':textOnly?'Yazıyı paylaş':'Paylaş';
 if(!post&&!story){const controls=document.createElement('div');controls.className='pati-draft-controls';controls.innerHTML='<button type="button" data-action="pati-draft-save">▤ Açıklama taslağını kaydet</button><button type="button" data-action="pati-draft-load">↺ Taslağı aç</button>';f.querySelector('.modal-content')?.appendChild(controls)}
 if(reel){if(!window.PatiyizReelsEditor)notify('Reels düzenleyici yüklenemedi. Sayfayı yenile.',true);else window.PatiyizReelsEditor.mount(f)}
 if(!post&&!textOnly&&autoPick)openComposerMediaPicker('gallery');
 if(textOnly)f.querySelector('textarea[name="body"]')?.focus();
}
function uploadStatus(message){const form=document.querySelector('#modal-root form');const status=form?.querySelector('.pati-upload-status');if(status){status.hidden=false;status.querySelector('span').textContent=message}const label=form?.querySelector('.modal-footer .primary-btn');if(label){label.dataset.originalText||=label.textContent;label.textContent='⏳ '+message}}
async function preparePhoto(file){if(!file||!file.size)return null;if(!file.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))throw Error('Lütfen bir fotoğraf dosyası seç.');const accepted=['image/jpeg','image/png','image/webp'];if(accepted.includes(file.type)&&file.size<=3*1024*1024)return file;uploadStatus('Fotoğraf hazırlanıyor…');let url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{img.onload=null;img.onerror=null;reject(new Error('Fotoğraf hazırlanırken zaman aşımına uğradı. Daha küçük bir fotoğraf dene.'))},18000);img.onload=()=>{clearTimeout(timer);resolve()};img.onerror=()=>{clearTimeout(timer);reject(new Error('Fotoğraf açılamadı. HEIC dosyası kullanıyorsan galeride JPG olarak dışa aktar.'))}});const max=2048,ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));if(!blob)throw Error('Fotoğraf işlenemedi.');if(blob.size>6291456)throw Error('Fotoğraf boyutu çok büyük.');return new File([blob],'patiyiz-'+Date.now()+'.jpg',{type:'image/jpeg'})}finally{URL.revokeObjectURL(url)}}
async function drawPostCrop(){const input=document.querySelector('#post-form input[name="photo"]'),file=input?.files?.[postCropIndex],box=document.querySelector('.pati-crop-preview'),canvas=document.getElementById('pati-crop-canvas');if(!file||!box||!canvas)return;box.hidden=false;const counter=document.getElementById('pati-crop-index');if(counter)counter.textContent=(postCropIndex+1)+' / '+input.files.length;const dims={'9:16':[320,568],'4:5':[320,400],'1:1':[320,320],'1.91:1':[320,168]},[w,h]=dims[postCropRatio];canvas.width=w;canvas.height=h;const url=URL.createObjectURL(file),img=new Image();try{img.src=url;await img.decode();const ctx=canvas.getContext('2d'),scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*postCropZoom;ctx.clearRect(0,0,w,h);ctx.drawImage(img,(w-img.naturalWidth*scale)*postCropX,(h-img.naturalHeight*scale)*postCropY,img.naturalWidth*scale,img.naturalHeight*scale)}catch(e){console.warn(e)}finally{URL.revokeObjectURL(url)}}
async function cropPostPhoto(file,aspect){if(!file?.size)return file;const dims={'9:16':[1080,1920],'4:5':[1080,1350],'1:1':[1080,1080],'1.91:1':[1080,566]};const [w,h]=dims[aspect]||dims['4:5'];const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*postCropZoom;const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;ctx.drawImage(img,(w-dw)*postCropX,(h-dh)*postCropY,dw,dh);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.86));if(!blob)throw Error('Görsel kırpılamadı.');return new File([blob],'patiyiz-post-'+Date.now()+'.jpg',{type:'image/jpeg'})}finally{URL.revokeObjectURL(url)}}
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
/* Cover thumbnails are generated once for newly posted videos, without blocking unsupported formats. */
async function patiGenerateVideoCover(file){
 if(!file?.size)return null;
 const source=URL.createObjectURL(file),video=document.createElement('video');
 video.muted=true;video.playsInline=true;video.preload='auto';
 try{return await new Promise(resolve=>{
  let finished=false;const finish=value=>{if(finished)return;finished=true;clearTimeout(timer);resolve(value)};
  const timer=setTimeout(()=>finish(null),4200);
  const capture=()=>{
   if(finished||!video.videoWidth||!video.videoHeight)return;
   try{const ratio=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(video.videoWidth*ratio));canvas.height=Math.max(1,Math.round(video.videoHeight*ratio));
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    canvas.toBlob(blob=>finish(blob?.size?new File([blob],'patiyiz-video-cover.jpg',{type:'image/jpeg'}):null),'image/jpeg',.76);
   }catch(_){finish(null)}
  };
  video.addEventListener('loadeddata',capture,{once:true});
  video.addEventListener('seeked',capture,{once:true});
  video.addEventListener('loadedmetadata',()=>{try{if(Number.isFinite(video.duration)&&video.duration>.2)video.currentTime=Math.min(.3,video.duration*.12)}catch(_){}},{once:true});
  video.addEventListener('error',()=>finish(null),{once:true});
  video.src=source;video.load();
 })}finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(source)}
}
async function createPostPublication(form,f,str){
 const photoFiles=[...(form.querySelector('input[name="photo"]')?.files||[])];
 const videoFile=f.get('video'),hasVideo=!!videoFile?.size,body=str('body').trim();
 if(form.dataset.mode==='text'&&!body)throw Error('Yazı paylaşmak için önce bir metin yaz.');
 if(form.dataset.mode==='reels'&&!hasVideo)throw Error('Reels paylaşmak için önce bir video seç.');
 if(photoFiles.length>10)throw Error('En fazla 10 fotoğraf seçebilirsin.');
 if(photoFiles.length&&hasVideo)throw Error('Bir paylaşımda fotoğraf veya video seçebilirsin.');
 if(!body&&!photoFiles.length&&!hasVideo)throw Error('Paylaşmak için bir fotoğraf, video veya yazı ekle.');
 return publishMediaRecord('posts',form,async send=>{
  const record={body,species:'Diğer',pet_id:null,images:[]};
  for(let i=0;i<photoFiles.length;i++){
   uploadStatus('Fotoğraf '+(i+1)+' / '+photoFiles.length+' hazırlanıyor…');
   const file=await cropPostPhoto(photoFiles[i],str('aspect'));
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
   const selectedCover=cover?.size?cover:await patiGenerateVideoCover(video);
    if(selectedCover?.size){uploadStatus('Video kapağı kaydediliyor…');record.video_cover_url=await send(selectedCover,'image')}
  }
  uploadStatus('Paylaşım kaydediliyor…');
  return record;
 });
}
async function patiFallbackStoryPoster(){
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=1138;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Video kapak görseli oluşturulamadı.');
 ctx.fillStyle='#141417';ctx.fillRect(0,0,640,1138);
 ctx.fillStyle='#e9e9ef';ctx.textAlign='center';ctx.font='bold 42px Arial, sans-serif';ctx.fillText('Patiyiz',320,510);
 ctx.font='56px Arial, sans-serif';ctx.fillText('▶',320,610);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));
 if(!blob)throw Error('Video kapağı hazırlanamadı.');
 return new File([blob],'patiyiz-story-cover.jpg',{type:'image/jpeg'});
}
async function createStoryPublication(form,f,str){
 const shared=form?.dataset?.mode==='story';
 const files=[...(form.querySelector('input[name="photo"]')?.files||[])];
 const video=form.querySelector('input[name="video"]')?.files?.[0];
 let photo=shared?files[0]:null;
 if(!shared){const choice=form.dataset.storyInput||'story_gallery';photo=f.get(choice);if(!photo?.size)photo=f.get(choice==='story_gallery'?'story_camera':'story_gallery')}
 if(shared&&files.length>1)throw Error('Hikâyeye yalnızca bir fotoğraf veya video ekleyebilirsin.');
 if(!photo?.size&&!video?.size)throw Error('Hikâye için fotoğraf veya video seç.');
 if(photo?.size&&video?.size)throw Error('Hikâyeye tek bir fotoğraf veya video ekleyebilirsin.');
 return publishMediaRecord('patiyiz_stories',form,async send=>{
  let image_url=null,video_url=null;
  if(photo?.size){
   uploadStatus('Hikâye fotoğrafı hazırlanıyor…');
   const img=shared?await cropPostPhoto(photo,str('aspect')||'9:16'):await renderEditedStoryFile(photo,form);
   image_url=await send(img,'image');
  }else{
   uploadStatus('Hikâye videosu hazırlanıyor…');
   const chosen=form.querySelector('input[name="cover_photo"]')?.files?.[0];
   const poster=chosen?.size?chosen:await patiGenerateVideoCover(video)||await patiFallbackStoryPoster();
   image_url=await send(poster,'image');
   video_url=await send(video,'video');
   if(!video_url)throw Error('Hikâye videosu yüklenemedi.');
  }
  if(!image_url)throw Error('Hikâye kapağı yüklenemedi.');
  uploadStatus('Hikâye kaydediliyor…');
  return {image_url,video_url,caption:shared?str('body').slice(0,300):str('caption'),is_highlight:false,
   poll_question:null,poll_options:null,question_prompt:null};
 });
}
function composeQuestion(){modal('Topluluğa soru sor',formField('title','Soru başlığı (5–150 karakter)','text','',true)+selectField('category','Kategori',['Genel','Sağlık','Beslenme','Eğitim','Davranış','Bakım','Diğer'])+textField('body','Sorunun ayrıntıları (en az 5 karakter)','',true,2000),'question-form');const f=$('#question-form');if(f){f.querySelector('[name="title"]').minLength=5;f.querySelector('[name="title"]').maxLength=150;f.querySelector('[name="body"]').minLength=5;f.querySelector('.modal-footer .primary-btn').textContent='Soruyu yayınla'}}
function composeLost(a){
 if(a&&a.owner_id!==me?.id)return notify('Bu ilanı düzenleme yetkin yok.',true);
 const today=new Date().toLocaleDateString('en-CA');
 const media='<div class="lost-v2-form-media"><strong>Fotoğraf (isteğe bağlı)</strong><p>Net bir fotoğraf, hayvanın tanınmasını kolaylaştırır.</p>'
 +(a?.photo_url?'<img class="lost-v2-existing" src="'+esc(a.photo_url)+'" alt="Mevcut ilan fotoğrafı">':'')
 +'<div id="lost-photo-preview" class="lost-v2-preview" hidden></div><div class="lost-v2-pickers"><button type="button" data-action="lost-gallery">▧ Galeriyi aç</button><button type="button" data-action="lost-camera">◎ Fotoğraf çek</button></div>'
 +'<input class="lost-v2-file" type="file" name="photo" accept="image/*,.heic,.heif" aria-label="Galeriden fotoğraf seç">'
 +'<input class="lost-v2-file" type="file" name="photo_camera" accept="image/*" capture="environment" aria-label="Kameradan fotoğraf çek"></div>';
 modal(a?'Kayıp ilanını düzenle':'Kayıp hayvan ilanı','<div class="lost-v2-form-tip">Açık adres veya telefon paylaşma; yalnızca yaklaşık konum yaz. İletişimi uygulama içinden yap.</div>'
 +formField('name','Hayvanın adı','text',a?.name||'',true)+selectField('species','Tür',species,a?.species||'Kedi')
 +formField('city','Şehir','text',a?.city||'',true)+formField('district','İlçe (isteğe bağlı)','text',a?.district||'')
 +formField('last_seen','Son görüldüğü tarih','date',a?.last_seen||today,true)
 +textField('description','Ayırt edici özellikleri ve yaklaşık görüldüğü yer',a?.description||'',true,1200)+media,'lost-form');
 const form=document.getElementById('lost-form');
 form.dataset.edit=a?.id||'';
 const date=form.querySelector('[name="last_seen"]');date.max=today;
 form.querySelector('[name="description"]').minLength=10;
 form.querySelector('.modal-footer button[type="submit"]').textContent=a?'Değişiklikleri kaydet':'İlanı yayınla';
}
function lostValidateRecord(rec){
 if(rec.name.length<2||rec.name.length>100)throw Error('Hayvanın adını 2–100 karakter arasında yaz.');
 if(rec.city.length<2||rec.city.length>100||rec.district.length>100)throw Error('Şehir ve ilçe alanlarını kontrol et.');
 if(rec.description.length<10||rec.description.length>1200)throw Error('Açıklama 10–1200 karakter olmalı.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(rec.last_seen))throw Error('Geçerli bir tarih seç.');
 const d=new Date(rec.last_seen+'T12:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==rec.last_seen||rec.last_seen>new Date().toLocaleDateString('en-CA'))throw Error('Gelecekteki tarih seçilemez.');
 if(/(?:\+90[\s.-]*|0)?5\d{2}[\s().-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/.test(rec.description))throw Error('Açıklamaya telefon numarası ekleme.');
 if(/\b(?:no\s*[:.]?\s*\d+|daire\s*[:.]?\s*\d+|kapı\s*no\s*[:.]?\s*\d+)\b/i.test(rec.description))throw Error('Açık adres yazma; yaklaşık bölge belirt.');
 return rec;
}
function composeAdoption(a){
 if(a&&a.owner_id!==me?.id)return notify('Bu ilanı düzenleme yetkin yok.',true);
 const media='<div class="adopt-v2-form-media"><strong>Hayvanın fotoğrafı (isteğe bağlı)</strong><p>Net bir fotoğraf tanışmayı kolaylaştırır. Yeni fotoğraf seçmezsen eskisi korunur.</p>'
 +(a?.photo_url?'<img src="'+esc(a.photo_url)+'" class="adopt-v2-old-photo" alt="Mevcut ilan fotoğrafı">':'')
 +'<div class="pati-upload-preview" hidden></div><div class="adopt-v2-photo-actions"><button type="button" data-action="adoption-gallery">▧ Galeriyi aç</button><button type="button" data-action="adoption-camera">◎ Fotoğraf çek</button></div>'
 +'<input class="adopt-v2-native-file" name="photo" type="file" accept="image/*,.heic,.heif" aria-label="Galeriden fotoğraf seç">'
 +'<input class="adopt-v2-native-file" name="photo_camera" type="file" accept="image/*" capture="environment" aria-label="Kameradan fotoğraf çek"></div>';
 modal(a?'Sahiplendirme ilanını düzenle':'Sahiplendirme ilanı oluştur',
 '<p class="adopt-v2-form-info">Sahiplendirme ücretsizdir. Açık adresini, telefonunu veya ödeme bilgisi yazma. Sağlık ve bakım bilgilerini açıklamada paylaş.</p>'
 +formField('name','Hayvanın adı','text',a?.name||'',true)
 +selectField('species','Hayvan türü',species,a?.species||'Kedi')
 +selectField('gender','Cinsiyet',petGenders,a?.gender||'Bilinmiyor')
 +formField('age','Yaş (isteğe bağlı)','text',a?.age||'')
 +formField('city','Şehir','text',a?.city||'',true)
 +formField('district','İlçe','text',a?.district||'')
 +textField('description','Sağlık, davranış ve bakım koşulları (en az 15 karakter)',a?.description||'',true,2000)
 +media,'adoption-form');
 const form=document.getElementById('adoption-form');form.dataset.edit=a?.id||'';
 form.querySelector('[name="description"]').minLength=15;
 form.querySelector('.modal-footer button[type="submit"]').textContent=a?'Değişiklikleri kaydet':'İlanı yayınla';
}
function adoptionValidateRecord(rec){
 if(rec.name.length<2||rec.name.length>100)throw Error('Hayvanın adı 2–100 karakter arasında olmalı.');
 if(!rec.species||rec.city.length<2||rec.city.length>100||rec.district.length>100)throw Error('Hayvan türünü, şehir ve ilçe bilgilerini kontrol et.');
 if(rec.age.length>60||rec.description.length<15||rec.description.length>2000)throw Error('Yaş alanını ve en az 15 karakterlik açıklamayı kontrol et.');
 if(/(?:\+90[\s.-]*|0)?5\d{2}[\s().-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/.test(rec.description))throw Error('Telefon numarası paylaşma. İletişim için Patiyiz mesajlarını kullan.');
 if(/\b(?:no\s*[:.]?\s*\d+|daire\s*[:.]?\s*\d+|kapı\s*no\s*[:.]?\s*\d+)\b/i.test(rec.description))throw Error('Açık adres paylaşma; sadece şehir ve ilçe belirt.');
 return rec;
}
function composeCare(a){
 if(a&&a.owner_id!==me?.id)return notify('Bu görevi düzenleme yetkin yok.',true);
 const owned=data.pets.filter(p=>p.owner_id===me?.id);
 const petPick='<div class="pati-field"><label for="care-task-pet">Hayvan profili (isteğe bağlı)</label><select id="care-task-pet" name="pet_id"><option value="">Genel görev</option>'
 +owned.map(p=>'<option value="'+esc(p.id)+'"'+(a?.pet_id===p.id?' selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></div>';
 modal(a?'Bakım görevini düzenle':'Yeni bakım görevi',
 '<p class="care-v2-form-intro">Aşı, veteriner, mama, ilaç veya günlük bakım görevlerini tarihe göre takip et. Saatli alarmlar için Hayvan Sağlığı bölümünü kullan.</p>'
 +formField('title','Görev adı','text',a?.title||'',true)
 +selectField('category','Kategori',CARE_CATEGORIES,a?.category||'Bakım')
 +formField('due_date','Görev tarihi','date',a?.due_date||careToday(),true)
 +petPick,'care-form');
 const form=document.getElementById('care-form');
 form.dataset.edit=a?.id||'';
 form.querySelector('[name="title"]').minLength=2;
 form.querySelector('[name="title"]').maxLength=110;
 form.querySelector('.modal-footer button[type="submit"]').textContent=a?'Değişiklikleri kaydet':'Görev ekle';
}
function careValidateRecord(record){
 if(record.title.length<2||record.title.length>110)throw Error('Görev adı 2–110 karakter arasında olmalı.');
 if(!CARE_CATEGORIES.includes(record.category))throw Error('Geçerli bakım kategorisi seç.');
 if(!careDateValid(record.due_date))throw Error('Geçerli görev tarihi seç.');
 if(record.pet_id&&!data.pets.some(p=>p.id===record.pet_id&&p.owner_id===me?.id))throw Error('Bu hayvan profiline görev ekleme yetkin yok.');
 return record;
}
function editProfile(){
 const p=current();
 const pic=p.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="Mevcut profil fotoğrafın">':'<span>'+esc((p.display_name||'P').slice(0,1).toUpperCase())+'</span>';
 const fields='<section class="pati-edit-cover"><div class="pati-edit-avatar">'+pic+'</div><div class="pati-edit-photo-tools"><strong>Profil fotoğrafın</strong><label class="pati-edit-photo-select" for="pati-profile-photo">Fotoğrafı değiştir</label><input id="pati-profile-photo" name="photo" type="file" accept="image/*,.heic,.heif" aria-label="Yeni profil fotoğrafı seç"><small>JPG, PNG veya HEIC fotoğraf yükle</small></div><div class="pati-upload-preview" hidden></div></section>'+
 '<div class="pati-edit-sections"><div class="pati-edit-section-title">Profil bilgileri</div>'+
 formField('display_name','Ad','text',p.display_name,true)+
 formField('handle','Kullanıcı adı','text',p.handle,true)+
 textField('bio','Biyografi',p.bio||'',false,500)+
 formField('city','Şehir','text',p.city||'')+
 '<p class="pati-edit-hint">Kullanıcı adı 3–24 karakter olmalı. Kaydettiğin bilgiler profilinde görünür.</p></div>';
 modal('Profili düzenle',fields,'profile-form');
 const root=document.querySelector('#modal-root .modal');
 root?.classList.add('pati-profile-edit-modal');
 const submit=document.querySelector('#profile-form .modal-footer button[type="submit"]');
 if(submit)submit.textContent='Bitti';
}
function editPet(p){
 if(typeof patiPetPhotoObjectUrl!=='undefined'&&patiPetPhotoObjectUrl){URL.revokeObjectURL(patiPetPhotoObjectUrl);patiPetPhotoObjectUrl=''}
 if(p&&p.owner_id!==me.id)return notify('Yalnızca kendi hayvanını düzenleyebilirsin.',true);
 const photo=p?.photo_url?'<img src="'+esc(p.photo_url)+'" alt="Mevcut hayvan fotoğrafı" loading="eager">':'<span class="pati-pet-placeholder">'+petIcon(p?.species||'Kedi')+'</span>';
 const fields='<div class="pati-pet-edit-cover"><div class="pati-pet-edit-photo">'+photo+'</div><div><strong>'+(p?'Fotoğrafını güncelle':'Bir fotoğraf seç')+'</strong><label class="pati-pet-photo-select" for="pati-pet-photo">Galeriden fotoğraf seç</label><input id="pati-pet-photo" name="photo" type="file" accept="image/*,.heic,.heif" aria-label="Hayvan fotoğrafı seç"><small>JPG, PNG veya HEIC. Fotoğraf eklemek isteğe bağlıdır.</small></div></div>'+
  formField('name','Hayvanın adı','text',p?.name||'',true)+
  selectField('species','Tür',species,p?.species||'Kedi')+
  selectField('gender','Cinsiyet',petGenders,p?.gender||'Belirtilmedi')+
  formField('age','Yaş','text',p?.age||'')+
  formField('breed','Irk','text',p?.breed||'')+
  formField('personality','Karakter','text',p?.personality||'')+
  textField('notes','Notlar',p?.notes||'',false,500);
 modal(p?'Hayvan profilini düzenle':'Yeni hayvan ekle',fields,'pet-form');
 const form=$('#pet-form');form.dataset.edit=p?.id||'';
 document.querySelector('#modal-root .modal')?.classList.add('pati-pet-edit-modal');
 if(p){
  const footer=form.querySelector('.modal-footer');
  if(footer)footer.insertAdjacentHTML('afterbegin','<button class="pati-pet-delete" type="button" data-action="pet-delete" data-id="'+esc(p.id)+'">Hayvan profilini sil</button>');
 }
}
function questionReplies(id){
 const q=data.questions.find(x=>x.id===id);if(!q)return;
 const state=typeof patiCommunityReplyPages!=='undefined'?patiCommunityReplyPages.get(me.id+':'+id):null;
 const previous=$('#reply-form'),draft=previous?.dataset.question===id?previous.querySelector('[name="body"]')?.value||'':'';
 const source=state?.ready?state.rows:data.replies.filter(r=>r.question_id===id);
 const replies=[...source].filter(r=>!blocked.has(r.author_id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 modal('Soruya cevaplar','<h3>'+esc(q.title)+'</h3><p class="pati-community-question-description">'+esc(q.body)+'</p>'+
  '<div class="pati-list">'+
  (state?.error?'<p class="pati-note" role="alert">'+esc(state.error)+'</p>':'')+
  (state?.loading?'<p class="pati-note" role="status">Cevaplar yükleniyor…</p>':'')+
  (state?.hasMore||state?.error?'<div class="pati-load-more">'+button(state.error?'Yeniden dene':'Önceki cevapları yükle','community-replies-more','data-id="'+esc(id)+'"')+'</div>':'')+
  (replies.map(x=>'<div class="pati-card">'+userRow(x.author_id,day(x.created_at))+'<p>'+esc(x.body)+'</p></div>').join('')||(!state?.loading?'<p>Henüz cevap yok.</p>':''))+
  '</div>'+textField('body','Cevabın',draft,true,1000),'reply-form');
 $('#reply-form').dataset.question=id;
}
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
  if(typeof patiHomeCountCache!=='undefined')patiHomeCountCache.delete(id);
  document.querySelectorAll('[data-action="like"][data-id="'+id+'"]').forEach(btn=>{
   btn.classList.toggle('active',savedLike);btn.setAttribute('aria-pressed',String(savedLike));
   if(savedLike){btn.classList.remove?.('pati-like-pop');void btn.offsetWidth;btn.classList.add?.('pati-like-pop')}
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

const pendingPostSaves=new Set();let savesChangeEpoch=0;
async function togglePostSave(id){
 if(!id||!me||!sb||pendingPostSaves.has(id))return;
 const owner=me.id,wasSaved=saved.has(id);
 pendingPostSaves.add(id);savesChangeEpoch++;
 const selector='[data-action="save"][data-id="'+id+'"]';
 const buttons=[...document.querySelectorAll(selector)];
 buttons.forEach(btn=>{btn.disabled=true;btn.setAttribute('aria-busy','true')});
 try{
  const mutation=wasSaved?
   await sb.from('post_saves').delete().eq('post_id',id).eq('user_id',owner):
   await sb.from('post_saves').upsert({post_id:id,user_id:owner},{onConflict:'user_id,post_id',ignoreDuplicates:true});
  if(mutation.error)throw mutation.error;
  const verified=await sb.from('post_saves').select('user_id,post_id').eq('user_id',owner).eq('post_id',id).maybeSingle();
  if(verified.error)throw verified.error;
  if(me?.id!==owner)return;
  const stored=!!verified.data;
  if(stored===wasSaved)throw Error('Kaydetme işlemi sunucuda doğrulanamadı.');
  data.saves=data.saves.filter(x=>!(x.post_id===id&&x.user_id===owner));
  if(stored)data.saves.push({user_id:owner,post_id:id});
  saved=new Set(data.saves.filter(x=>x.user_id===owner).map(x=>x.post_id));
  document.querySelectorAll(selector).forEach(btn=>{
   btn.classList.toggle('active',stored);
   btn.setAttribute('aria-pressed',String(stored));
   btn.setAttribute('aria-label',stored?'Kaydı kaldır':'Kaydet');
   btn.title=stored?'Kaydedildi':'Kaydet';
  });
  notify(stored?'Gönderi kaydedildi. Kaydettiklerim bölümünde bulabilirsin.':'Gönderi kayıtlardan kaldırıldı.');
  if(view==='saved-posts')render();
 }catch(e){
  console.warn('Kaydetme sunucu onayı:',e);
  notify('Kaydetme işlemi tamamlanamadı: '+friendly(e),true);
  try{
   const checked=await sb.from('post_saves').select('user_id,post_id').eq('user_id',owner).eq('post_id',id).maybeSingle();
   if(!checked.error&&me?.id===owner){
    data.saves=data.saves.filter(x=>!(x.post_id===id&&x.user_id===owner));
    if(checked.data)data.saves.push(checked.data);
    saved=new Set(data.saves.filter(x=>x.user_id===owner).map(x=>x.post_id));
    if(['home','reels','profile','saved-posts'].includes(view))render();
   }
  }catch(_){}
 }finally{
  savesChangeEpoch++;
  pendingPostSaves.delete(id);
  buttons.forEach(btn=>{btn.disabled=false;btn.removeAttribute('aria-busy')});
 }
}

async function doToggle(table,keys,present){
 const config={post_likes:['likes','post_id',liked],post_saves:['saves','post_id',saved],follows:['follows','followee_id',followed],question_votes:['votes','question_id',voted],kb_bookmarks:['bookmarks','article_id',favorites]};
 const item=config[table],rowKey=item&&keys[item[1]];
 const isFollow=table==='follows',pendingKey=isFollow?keys.follower_id+'|'+keys.followee_id:'';
 if(isFollow){
  if(!keys.followee_id||keys.followee_id===me.id||pendingProfileFollows.has(pendingKey))return;
  pendingProfileFollows.add(pendingKey);
 }
 const snapshots=new Map();
 const affected=isFollow?[keys.followee_id,keys.follower_id]:[];
 if(isFollow){
  for(const id of new Set(affected)){
   const cached=profileCountCache.get(id);
   const old={posts:cached?.value.posts??data.posts.filter(p=>p.author_id===id).length,
    followers:cached?.value.followers??data.follows.filter(f=>f.followee_id===id).length,
    following:cached?.value.following??data.follows.filter(f=>f.follower_id===id).length};
   snapshots.set(id,{cached,old});
   profileCountRevision.set(id,(profileCountRevision.get(id)||0)+1);
  }
 }
 const optimistic=()=>{
  if(!isFollow)return;
  const delta=present?-1:1;
  for(const [id,snapshot] of snapshots){
   const value={...snapshot.old};
   if(id===keys.followee_id)value.followers=Math.max(0,value.followers+delta);
   if(id===keys.follower_id)value.following=Math.max(0,value.following+delta);
   profileCountCache.set(id,{value,at:Date.now()});
   renderProfileCounts(id,value);
  }
 };
 const repaint=()=>{
  if(isFollow&&view==='reels'){
   document.querySelectorAll('.pati-reel-follow[data-id="'+rowKey+'"]').forEach(btn=>{
    const isFollowing=followed.has(rowKey),inbound=data.follows.some(f=>f.follower_id===rowKey&&f.followee_id===me.id);
    btn.textContent=isFollowing?'Takiptesin':inbound?'Sen de takip et':'Takip et';
    btn.setAttribute('aria-pressed',String(isFollowing));
    if(!isFollowing&&inbound)btn.dataset.followBack='true';else delete btn.dataset.followBack;
   });
  }else{
   render();
   if(isFollow){
    const button=document.querySelector?.('[data-action="follow"][data-id="'+rowKey+'"]');
    if(button)button.classList.add('pati-follow-pop');
   }
  }
 };
 if(item){
  const arr=data[item[0]],ix=arr.findIndex(x=>Object.keys(keys).every(k=>x[k]===keys[k]));
  if(present){if(ix>=0)arr.splice(ix,1);item[2].delete(rowKey)}
  else if(ix<0){arr.push({...keys,created_at:new Date().toISOString()});item[2].add(rowKey)}
  if(isFollow&&typeof patiFollowPageState!=='undefined'&&patiFollowPageState.key.startsWith(me.id+':')){
   if(present)patiFollowPageState.viewerFollowing.delete(rowKey);
   else patiFollowPageState.viewerFollowing.add(rowKey);
  }
  if(['post_likes','post_saves'].includes(table)){
   document.querySelectorAll('[data-action="'+(table==='post_likes'?'like':'save')+'"][data-id="'+rowKey+'"]').forEach(btn=>{
    btn.classList.toggle('active',!present);btn.setAttribute('aria-pressed',String(!present));
    if(table==='post_likes'){
     const count=data.likes.filter(x=>x.post_id===rowKey).length;
     const label=btn.querySelector('.pati-reel-count')||btn.querySelector('span');
     if(label)label.textContent=count;
     document.querySelectorAll('.pati-feed-card[data-post-id="'+rowKey+'"] .pati-post-like-summary').forEach(summary=>summary.textContent=count+' beğeni');
    }
   });
  }else{optimistic();repaint()}
 }
 try{
  let r;
  if(present){let q=sb.from(table).delete();for(const [k,v]of Object.entries(keys))q=q.eq(k,v);r=await q}
  else r=await sb.from(table).insert(keys);
  if(r.error)throw r.error;
  if(!item)await refresh();
  if(isFollow){
   pendingProfileFollows.delete(pendingKey);
   // Refresh server-confirmed numbers without delaying the immediate UI update.
   const id=profileId||me?.id;
   if(id&&snapshots.has(id))void syncProfileCounts(id,true);
   if(view==='follows-list')void patiLoadFollowPage(true);
  }
 }catch(e){
  if(item){
   const arr=data[item[0]],ix=arr.findIndex(x=>Object.keys(keys).every(k=>x[k]===keys[k]));
   if(present){if(ix<0)arr.push({...keys});item[2].add(rowKey)}
   else{if(ix>=0)arr.splice(ix,1);item[2].delete(rowKey)}
   if(isFollow&&typeof patiFollowPageState!=='undefined'&&patiFollowPageState.key.startsWith(me.id+':')){
    if(present)patiFollowPageState.viewerFollowing.add(rowKey);
    else patiFollowPageState.viewerFollowing.delete(rowKey);
   }
   if(isFollow)for(const [id,snapshot] of snapshots){
    profileCountRevision.set(id,(profileCountRevision.get(id)||0)+1);
    if(snapshot.cached)profileCountCache.set(id,snapshot.cached);else profileCountCache.delete(id);
   }
   repaint();
  }
  throw e;
 }finally{if(isFollow)pendingProfileFollows.delete(pendingKey)}
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
function processClick(e){const video=e.target.closest('.pati-post-video');if(video&&!e.target.closest('button')){if(video.paused){delete video.dataset.userPaused;document.querySelectorAll('#main-content .pati-post-video').forEach(other=>{if(other!==video)other.pause()});patiyizFeedActiveVideo=video;video.play().catch(()=>{});}else{video.dataset.userPaused='1';video.pause();}return;}let target=e.target.closest('[data-view],[data-action]');if(!target)return;let v=target.dataset.view;if(v){closePatiCreate();profileId='';selectedPostId='';if(v==='messages')mobileChatOpen=false;closeModal();navigate(v);return}let act=target.dataset.action,id=target.dataset.id;switch(act){case 'theme-set':patiApplyTheme(id);break;
case 'dm-receipts-toggle':run(async()=>{
 const user=me.id,next=!patiDmReadReceiptsEnabled();
 const r=await sb.from('profiles').update({read_receipts_enabled:next}).eq('id',user).select('read_receipts_enabled').single();
 if(r.error)throw r.error;
 const p=data.profiles.find(x=>x.id===user);if(p)p.read_receipts_enabled=r.data.read_receipts_enabled;
 render();
},'Görüldü tercihin kaydedildi.');break;case 'paticoin-claim':patiCoinSync(true);break;case 'paticoin-refresh':void patiCoinSync(false);break;case 'paticoin-invite-redeem':void patiInviteRedeem();break;case 'paticoin-invite-share':patiInviteShare();break;case 'paticoin-shop':navigate('shop');break;case 'paticoin-shop-filter':{if(['all','food','supply','donation'].includes(id)){patiShopFilter=id;patiShopPage()}break}case 'paticoin-rewards':navigate('rewards');break;case 'saved-posts':navigate('saved-posts');break;case 'paticoin-buy':patiCoinShowCheckout(id);break;case 'paticoin-confirm':patiCoinConfirm();break;case 'hashtag':navigate('explore');search='#'+(id||'');render();break;case 'pati-create-open':openPatiCreate();break;case 'reel-speed':{const v=target.closest('.pati-reel-item')?.querySelector('video');if(v){const rates=[1,1.25,1.5,2,.75],i=rates.indexOf(v.playbackRate);v.playbackRate=rates[(i+1)%rates.length];const label=target.querySelector('.pati-reel-tool-label');if(label)label.textContent=v.playbackRate+'×';target.setAttribute('aria-label','Oynatma hızı '+v.playbackRate+'×')}break}case 'reels-more':void patiLoadMoreReels();break;case 'reel-play':reelHandleTap(target);break;case 'reel-sound':reelToggleSound(target);break;
 case 'reel-seek':break;case 'pati-media-gallery':openComposerMediaPicker('gallery');break;case 'pati-dm-gallery-open':document.querySelector('#message-form input[name="dm_gallery"]')?.click();break;case 'pati-media-video':{const f=document.getElementById('post-form');const file=f?.querySelector('input[name="video"]');if(file){file.removeAttribute('capture');file.click()}break}case 'pati-media-camera':openComposerMediaPicker('camera');break;case 'pati-draft-save':draftSave();break;case 'pati-draft-load':draftRestore();break;case 'pati-media-select':{postCropIndex=Number(id)||0;updatePostMediaPreview();drawPostCrop();break}case 'pati-story-gallery':document.querySelector('#story-form input[name="story_gallery"]')?.click();break;case 'pati-story-camera':document.querySelector('#story-form input[name="story_camera"]')?.click();break;case 'pati-create-close':closePatiCreate();break;case 'pati-create-post':closePatiCreate();startPatiCameraPost();break;case 'pati-create-text':closePatiCreate();compose(null,'text',false);break;case 'pati-create-story':closePatiCreate();openStoryComposer();break;case 'pati-create-reels':closePatiCreate();compose(null,'reels');break;case 'story-close':closeStory();break;case 'story-sound':{const video=document.querySelector('#story-overlay .story-big-video');if(video){video.muted=!video.muted;target.textContent=video.muted?'Ses aç':'Ses kapat';target.setAttribute('aria-label',video.muted?'Hikâye sesini aç':'Hikâye sesini kapat')}break}case 'story-poll':run(async()=>{if(data.storyResponses.some(x=>x.story_id===id&&x.user_id===me.id&&x.kind==='poll'))throw Error('Bu ankete zaten oy verdin.');const result=await sb.from('patiyiz_story_responses').insert({story_id:id,user_id:me.id,kind:'poll',option_index:Number(target.dataset.index)});if(result.error)throw result.error;data.storyResponses.push({story_id:id,user_id:me.id,kind:'poll',option_index:Number(target.dataset.index)})},'Oyun kaydedildi.');break;case 'story-question':{const x=storyItems.find(x=>x.id===id);if(x){clearTimeout(storyTimer);storyTimer=null;modal('Hikâye sorusuna yanıt',textField('response','Yanıtın','',true,220),'story-answer-form');document.getElementById('story-answer-form').dataset.story=id}break}case 'story-emoji':run(async()=>{if(data.storyResponses.some(x=>x.story_id===id&&x.user_id===me.id&&x.kind==='emoji'))throw Error('Bu hikâyeye zaten tepki verdin.');const result=await sb.from('patiyiz_story_responses').insert({story_id:id,user_id:me.id,kind:'emoji',response:'🐾'});if(result.error)throw result.error;data.storyResponses.push({story_id:id,user_id:me.id,kind:'emoji',response:'🐾'})},'Tepki gönderildi.');break;case 'story-like':toggleStoryLike(id);break;case 'story-viewers':showStoryViewers();break;case 'story-viewers-close':{const el=document.getElementById('story-viewers-sheet');if(el)el.hidden=true;clearTimeout(storyTimer);if(storyItems.length)storyTimer=setTimeout(()=>stepStory(1),6000);break}case 'story-create':openStoryComposer(true,false);break;case 'story-create-highlight':newHighlightAlbum();break;case 'story-highlight-choose':chooseStoryHighlight(id);break;case 'story-highlight-new':newHighlightAlbum(id);break;case 'story-highlight-album':run(()=>addStoryToHighlightAlbum(target.dataset.story,id));break;case 'story-view':openStory(id);break;case 'story-highlights':openHighlights(id);break;case 'highlight-album-open':openHighlightAlbum(id);break;case 'highlight-album-new':newHighlightAlbum();break;case 'highlight-album-manage':manageHighlightAlbums();break;case 'highlight-album-delete':if(confirm('Bu albüm silinsin mi? Hikâyelerin silinmeyecek.'))run(async()=>{const out=await sb.from('patiyiz_highlight_albums').delete().eq('id',id).eq('owner_id',me.id);if(out.error)throw out.error;closeModal(true);await refresh()},'Albüm silindi.');break;case 'highlight-album-add':{const stories=data.stories.filter(x=>x.author_id===me.id&&x.is_highlight);if(!stories.length){notify('Önce bir hikâyeyi kalıcı olarak sabitle.',true);break}modal('Albüme hikâye ekle','<div class="pati-field"><label>Hikâyeyi seç</label><select name="story_id">'+stories.map(x=>'<option value="'+esc(x.id)+'">'+esc(cut(x.caption||day(x.created_at),65))+'</option>').join('')+'</select></div>','highlight-album-add-form');document.getElementById('highlight-album-add-form').dataset.album=id;break}case 'story-highlight-open':openHighlightStory(id);break;case 'story-pet-highlight':openPetHighlight(id);break;case 'pati-task-follow':exploreTab='users';navigate('explore');break;case 'story-prev':stepStory(-1);break;case 'story-next':stepStory(1);break;case 'story-delete':if(confirm('Hikâyeni silmek istiyor musun?'))run(async()=>{const original=data.stories.find(x=>x.id===id&&x.author_id===me.id);const r=await sb.from('patiyiz_stories').delete().eq('id',id).eq('author_id',me.id).select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error('Hikâye silinemedi.');closeStory();await refresh();if(original)await deleteOwnedMedia(original)},'Hikâye silindi.');break;case 'verification-request':{const meProfile=current();if(meProfile.is_verified){notify('Hesabın zaten doğrulanmış.');break}run(async()=>{const r=await sb.from('verification_requests').select('status').eq('user_id',me.id).eq('status','pending').limit(1);if(r.error)throw r.error;if(r.data?.length){notify('Mavi tik talebin inceleme bekliyor.');return}modal('Mavi tik talebi',textField('note','Doğrulama gerekçen (isteğe bağlı)','',false,500),'verification-request-form')});break}case 'open-admin':if(isAdmin){window.location.href='admin.html'}else notify('Yönetici yetkisi doğrulanamadı.',true);break;case 'close':if(e.target.classList.contains('modal-backdrop')||target.tagName==='BUTTON')closeModal();break;case 'home-retry':run(()=>refresh());break;case 'load-more':if(['posts','messages','notifications'].includes(id))run(()=>loadMore(id));break;case 'compose':if(view==='community')composeQuestion();else if(view==='care')composeCare();else if(view==='lost')composeLost();else if(view==='adoption')composeAdoption();else if(view==='home'||view==='profile')startPatiCameraPost();break;case 'question':composeQuestion();break;case 'community-more':void patiLoadCommunity();break;case 'community-replies-more':void patiLoadQuestionReplies(id,true);break;case 'community-filter':communityCategory=id;render();void patiLoadCommunity(true);break;case 'care-filter':careFilter=id;carePage();break;
case 'care-pet-filter':carePetFilter=id;carePage();break;
case 'care-category':careCategoryFilter=id;carePage();break;
case 'care-clear':careSearch='';carePage();document.getElementById('care-search')?.focus();break;
case 'care-reset':careFilter='all';carePetFilter='all';careCategoryFilter='Tümü';careSearch='';carePage();break;
case 'care-refresh':void careRefresh();break;
case 'care-edit':{const item=data.care.find(x=>x.id===id&&x.owner_id===me.id);if(item)composeCare(item);break;}case 'lost-add':composeLost();break;case 'adoption-add':composeAdoption();break;case 'adoption-edit':{const a=data.adoption.find(x=>x.id===id&&x.owner_id===me.id);if(a)composeAdoption(a);break}case 'adoption-toggle':{const a=data.adoption.find(x=>x.id===id&&x.owner_id===me.id);if(!a)break;const adopted=!a.adopted;
 if(!confirm(adopted?'Bu hayvan sahiplendirildi mi? İlan tamamlandı olarak görünecek.':'İlanı tekrar yuva arıyor durumuna almak istiyor musun?'))break;
 run(async()=>{const r=await sb.from('adoption_listings').update({adopted}).eq('id',id).eq('owner_id',me.id).select('*');
 if(r.error)throw r.error;if(!r.data?.length)throw Error('İlan güncellenemedi veya yetkin yok.');
 data.adoption=data.adoption.map(x=>x.id===id?r.data[0]:x);if(view==='adoption')adoptionPage();
 },adopted?'İlan sahiplendirildi olarak işaretlendi.':'İlan yeniden yayına alındı.');break}case 'adoption-delete':remove('adoption_listings',id);break;case 'care-add':composeCare();break;case 'wellness-open':patiMyPetTab='wellness';navigate('my-pet');break;case 'pati-my-pet-tab':{if(['care','wellness','healthfile'].includes(id)){patiMyPetTab=id;render()}break}case 'wellness-reminder-add':patiWellnessReminderDialog();break;case 'wellness-weight-add':patiWellnessWeightDialog();break;case 'wellness-pet':patiWellnessPetId=id;render();break;
case 'wellness-filter':patiWellnessTab=id;render();break;
case 'wellness-refresh':patiWellness.error='';void patiWellnessFetch();break;
case 'wellness-reminder-edit':{const item=patiWellness.reminders.find(x=>x.id===id&&!x.completed_at&&patiWellnessOwnedPets().some(p=>p.id===x.pet_id));if(item)patiWellnessReminderDialog(item);break;}
case 'wellness-weight-edit':{const item=patiWellness.weights.find(x=>x.id===id&&patiWellnessOwnedPets().some(p=>p.id===x.pet_id));if(item)patiWellnessWeightDialog(item);break;}
case 'wellness-reminder-done':void patiWellnessToggle(id);break;case 'wellness-reminder-delete':void patiWellnessDelete('patiyiz_pet_reminders',id);break;case 'wellness-weight-delete':void patiWellnessDelete('patiyiz_pet_weights',id);break;case 'profile-posts-tab':profilePostsTab=id;render();break;case 'profile-open-post':openPost(id);break;case 'profile-pet-details':{const pet=data.pets.find(x=>x.id===id);if(pet)modal(pet.name,'<p>'+esc(pet.species||'')+' · '+esc(pet.breed||'')+'</p><p>'+esc(pet.personality||'')+'</p>','profile-pet-details-form');break;}case 'profile-share':{const u=location.origin+location.pathname; if(navigator.share){navigator.share({title:'Patiyiz profilim',url:u}).catch(()=>{});}else if(navigator.clipboard){navigator.clipboard.writeText(u).then(()=>notify('Patiyiz bağlantısı kopyalandı.')).catch(()=>notify('Bağlantı kopyalanamadı.',true));}break;}case 'edit-profile':editProfile();break;case 'pet-add':editPet();break;case 'pet-edit':{const pet=data.pets.find(p=>p.id===id);
 if(pet&&pet.owner_id===me.id)editPet(pet);
 else notify('Bu hayvan profilini yalnızca sahibi düzenleyebilir.',true);
 break}
case 'pet-delete':{const pet=data.pets.find(p=>p.id===id);
 if(!pet||pet.owner_id!==me.id){notify('Bu kaydı silme yetkin yok.',true);break}
 const answer=prompt('Hayvan profilini kalıcı silmek; bakım takvimi, aşı/ilaç hatırlatmaları, kilo kayıtları ve bağlı sağlık belgelerini de siler. Devam etmek için hayvanın adını yaz:');
 if(answer===null)break;
 if(answer.trim()!==pet.name){notify('Ad eşleşmedi. Hayvan profili silinmedi.',true);break}
 run(async()=>{
  const uid=me.id;
  const result=await sb.from('pets').delete().eq('id',pet.id).eq('owner_id',uid).select('id');
  if(result.error)throw result.error;
  if(!result.data?.length)throw Error('Kayıt silinemedi. Hesap yetkilerini kontrol et.');
  if(me?.id!==uid)return;
  data.pets=data.pets.filter(p=>p.id!==pet.id);
  closeModal(true);
  await refresh();await patiLoadOwnedPets();if(view==='pets')await patiLoadCommunityPets(true);
 },'Hayvan profili silindi.');
 break}
case 'pets-more':void patiLoadCommunityPets();break;
case 'my-profile':profileId='';lastDetailView='';navigate('profile');break;case 'view-user':followReturnList=view==='follows-list';if(!followReturnList&&view!=='profile')lastDetailView=view;profileId=id;navigate('profile');break;case 'profile-back':{const dest=lastDetailView&&allowed.includes(lastDetailView)?lastDetailView:'explore';lastDetailView='';profileId='';followReturnList=false;navigate(dest);break}case 'open-notification':openNotification(id);break;case 'post-back':{
 const detail=patiDetailState;patiDetailState=null;selectedPostId='';
 const back=detail?.origin||(patiExploreReturnTo?'explore':'home');patiExploreReturnTo=false;
 if(detail?.origin==='profile'){profileId=detail.profileId;profilePostsTab=detail.profilePostsTab}
 navigate(back);
 if(detail)requestAnimationFrame(()=>window.scrollTo({top:detail.returnScroll||0,behavior:'instant'}));
 break}case 'open-knowledge':navigate('knowledge');break;case 'health-add-pet':navigate('pets');break;
case 'education-open':educationBackScroll=window.scrollY||0;educationLesson=id;educationRemember(id);render();window.scrollTo(0,0);break;case 'education-back':educationLesson='';render();requestAnimationFrame(()=>window.scrollTo(0,educationBackScroll));break;case 'education-next':case 'education-previous':educationLesson=id;educationRemember(id);window.scrollTo(0,0);render();break;case 'education-continue':educationBackScroll=window.scrollY||0;educationLesson=id;educationRemember(id);window.scrollTo(0,0);render();break;case 'education-status':educationStatus=id;render();break;case 'education-filter':educationCategory=id;educationLesson='';render();break;case 'education-clear':educationSearch='';educationUpdateResults();document.getElementById('pati-academy-search')?.focus();break;case 'education-reset':educationSearch='';educationCategory='Tümü';educationStatus='Tümü';render();break;case 'education-answer':{const l=patiyizLessons.find(x=>x.id===id);if(l&&!educationDone().has(id)){educationAnswer[id]=Number(target.dataset.choice);if(educationAnswer[id]===l.answer)educationMark(id);render()}break;}case 'kb-read':kbListScroll=window.scrollY||0;articleId=id;render();window.scrollTo(0,0);break;case 'knowledge-back':articleId='';render();requestAnimationFrame(()=>window.scrollTo(0,kbListScroll));break;case 'kb-filter':kbFilter=id;render();break;case 'kb-category':kbCategory=id;render();break;case 'kb-clear':kbSearch='';render();document.getElementById('kb-search')?.focus();break;case 'kb-reset':kbFilter='Tümü';kbCategory='Tümü';kbSearch='';render();break;case 'kb-search':kbSearch=$('#kb-search')?.value||'';kbUpdateResults();break;case 'explore-more':void patiExploreLoadMedia();break;case 'explore-sort':{if(['popular','views','likes','recent'].includes(id)&&patiExploreSort!==id){patiExploreSort=id;explorePage();void patiExploreLoadMedia(true)}break}case 'explore-search-retry':void patiExploreLookup(search);break;case 'explore-open-post':openPost(id);break;case 'pati-search-open':search='';exploreTab='users';explorePage();requestAnimationFrame(()=>document.getElementById('explore-search')?.focus());void patiExploreLookup('');break;case 'pati-search-cancel':search='';exploreTab='media';explorePage();break;case 'pati-search-discover':exploreTab='media';search='';explorePage();break;case 'explore-tab':exploreTab=id;render();break;case 'explore-animal':exploreAnimal=id;render();break;case 'explore-sort':exploreSort=exploreSort==='latest'?'popular':exploreSort==='popular'?'recommended':'latest';render();break;case 'explore-search':search=$('#explore-search')?.value||'';render();break;case 'lost-search':lostSearch=$('#lost-search')?.value||'';lostUpdateResults();break;
case 'lost-status':lostStatus=id;lostPage();break;
case 'lost-species':lostSpecies=id;lostPage();break;
case 'lost-clear':lostSearch='';lostPage();document.getElementById('lost-search')?.focus();break;
case 'lost-reset':lostSearch='';lostStatus='missing';lostSpecies='Tümü';lostPage();break;
case 'lost-refresh':void lostRefresh();break;
case 'lost-gallery':document.querySelector('#lost-form input[name="photo"]')?.click();break;
case 'lost-camera':document.querySelector('#lost-form input[name="photo_camera"]')?.click();break;
case 'lost-edit':{const a=data.lost.find(x=>x.id===id&&x.owner_id===me.id);if(a)composeLost(a);break;}
case 'lost-share':{const a=data.lost.find(x=>x.id===id);if(!a)break;const url=new URL(location.href);url.searchParams.set('lost',a.id);url.searchParams.delete('notification');url.hash='';const text='Patiyiz: '+(a.found?'Bulundu':'Kayıp')+' · '+a.name+' ('+a.species+') · '+a.city+(a.district?' / '+a.district:'');if(navigator.share)navigator.share({title:'Patiyiz kayıp ilanı',text,url:url.href}).catch(()=>{});else if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text+'\n'+url.href).then(()=>notify('İlan bağlantısı kopyalandı.'),()=>notify('Bağlantı kopyalanamadı.',true));else notify('Bu cihazda paylaşım kullanılamıyor.',true);break;}case 'adoption-search':adoptionSearch=$('#adoption-search')?.value||'';adoptionUpdateResults();break;
case 'adoption-status':adoptionStatus=id;adoptionPage();break;
case 'adoption-species':adoptionSpecies=id;adoptionPage();break;
case 'adoption-clear':adoptionSearch='';adoptionPage();document.getElementById('adoption-search')?.focus();break;
case 'adoption-reset':adoptionSearch='';adoptionSpecies='Tümü';adoptionStatus='open';adoptionPage();break;
case 'adoption-refresh':void adoptionRefresh();break;
case 'adoption-gallery':document.querySelector('#adoption-form input[name="photo"]')?.click();break;
case 'adoption-camera':document.querySelector('#adoption-form input[name="photo_camera"]')?.click();break;
case 'adoption-share':{const x=data.adoption.find(a=>a.id===id);if(!x)break;const url=new URL(location.href);url.searchParams.set('adoption',x.id);url.searchParams.delete('notification');url.hash='';const text='Patiyiz · '+(x.adopted?'Sahiplendirildi':'Yuva arıyor')+': '+x.name+' ('+x.species+') · '+x.city+(x.district?' / '+x.district:'');if(navigator.share)navigator.share({title:'Patiyiz sahiplendirme ilanı',text,url:url.href}).catch(()=>{});else if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text+'\n'+url.href).then(()=>notify('İlan bağlantısı kopyalandı.'),()=>notify('Bağlantı kopyalanamadı.',true));else notify('Bu cihazda paylaşım kullanılamıyor.',true);break;}case 'dm-new':{const people=data.profiles.filter(x=>x.id!==me.id&&!blocked.has(x.id)).sort((a,b)=>String(a.display_name||'').localeCompare(String(b.display_name||''),'tr')).slice(0,80);modal('Yeni sohbet',people.length?'<p class="pati-dm-new-hint">Mesaj göndermek istediğin kişiyi seç.</p><div class="pati-dm-new-list">'+people.map(p=>'<button type="button" class="pati-dm-new-person" data-action="chat" data-id="'+esc(p.id)+'">'+avatar(p,'s')+'<span><strong>'+esc(p.display_name||'Patiyiz üyesi')+'</strong><small>@'+esc(p.handle||'patiyiz')+'</small></span>'+ico('message')+'</button>').join('')+'</div>':'<p>Henüz konuşabileceğin bir kullanıcı görünmüyor. Keşfet bölümünden kullanıcıları bulabilirsin.</p>','dm-new-form');break}case 'dm-inbox-more':void patiDmLoadInbox(false);break;
case 'dm-thread-older':void patiDmLoadThread(personId,true);break;
case 'chat':if(!id||id===me.id)return notify('Kendine mesaj gönderemezsin.',true);closeModal(true);patiDmPendingLatestPeer=id;personId=id;mobileChatOpen=true;navigate('messages');break;case 'open-unread-chat':{const source=unreadMessageSources().find(x=>x.id===id)||unreadMessageSources()[0];if(!source)break;closeModal();patiDmPendingLatestPeer=source.id;personId=source.id;mobileChatOpen=true;navigate('messages');break}case 'dm-tab':chatFilter=id;mobileChatOpen=false;render();break;case 'post-crop-next':case 'post-crop-prev':{const files=document.querySelector('#post-form input[name="photo"]')?.files;if(files?.length){postCropIndex=(postCropIndex+(act==='post-crop-next'?1:-1)+files.length)%files.length;drawPostCrop()}break}case 'post-ratio':{postCropRatio=id;postCropX=.5;postCropY=.5;document.querySelectorAll('.pati-ratio-options button').forEach(b=>b.classList.toggle('active',b.dataset.id===id));const f=document.querySelector('#post-form input[name="aspect"]');if(f)f.value=id;updatePostMediaPreview();if(!document.querySelector('.pati-crop-preview')?.hidden)drawPostCrop();break}case 'post-crop-open':{const crop=document.querySelector('#post-form .pati-crop-preview');const photos=document.querySelector('#post-form input[name="photo"]')?.files;if(crop&&photos?.length){crop.hidden=!crop.hidden;if(!crop.hidden)void drawPostCrop()}break}case 'carousel-prev':case 'carousel-next':{const root=target.closest('.pati-carousel'),track=root?.querySelector('.pati-carousel-track');if(track){const delta=track.clientWidth*(act==='carousel-next'?1:-1);track.scrollBy({left:delta,behavior:'smooth'})}break}case 'video-sound':{const v=target.parentElement?.querySelector('video');if(v){
 patiyizFeedSoundEnabled=v.muted;
 v.muted=!patiyizFeedSoundEnabled;
 patiFeedSoundButton(v);
 if(!v.muted){document.querySelectorAll('#main-content .pati-post-video').forEach(other=>{if(other!==v)other.pause()});patiyizFeedActiveVideo=v;v.play().catch(err=>{v.muted=true;patiFeedSoundButton(v);console.warn('Akış sesi açılamadı:',err?.message||err)})}
 }break;}case 'dm-record':run(()=>startDmRecord());break;case 'dm-record-stop':if(dmRecorder?.state==='recording')dmRecorder.stop();break;case 'dm-record-cancel':dmCancel=true;if(dmRecorder?.state==='recording')dmRecorder.stop();break;case 'dm-exit':patiDmTypingInput('');mobileChatOpen=false;patiDmDisconnectTyping();navigate(patiDmReturnView&&patiDmReturnView!=='messages'?patiDmReturnView:'home');break;case 'chat-back':patiDmTypingInput('');mobileChatOpen=false;patiDmDisconnectTyping();render();break;case 'dm-reply':{const m=patiDmFindMessage(id);const f=document.getElementById('message-form');if(m&&f){f.dataset.reply=id;const input=f.querySelector('input[name="body"]');if(input){input.placeholder='↳ '+cut(m.body||'Medya',50);input.focus()}}break}case 'dm-edit':{const m=patiDmFindMessage(id);if(m?.sender_id!==me.id)break;if(!m||m.attachment_path)break;modal('Mesajı düzenle',textField('body','Mesaj',m.body,true,1000),'dm-edit-form');document.getElementById('dm-edit-form').dataset.message=id;break}case 'message-delete':{
 const m=patiDmFindMessage(id);if(!m||(m.sender_id!==me.id&&m.receiver_id!==me.id))break;
 closeModal();
 if(!confirm('Bu mesaj her iki kullanıcıdan kalıcı olarak silinecek. Silinsin mi?'))break;
 run(async()=>{
  const sender=me.id;
  const res=await sb.functions.invoke('patiyiz-delete-message',{body:{message_id:m.id}});
  if(res.error||!res.data?.deleted)throw new Error(res.data?.message||res.error?.message||'Mesaj silinemedi.');
  if(me?.id!==sender)return;
  data.messages=data.messages.filter(x=>x.id!==m.id);
  patiDmRemoveCached(m.id);
  data.messageHidden=data.messageHidden.filter(x=>x.message_id!==m.id);
  render();
 },'Mesaj iki tarafın sohbetinden silindi.');
 break;
}case 'comment':showComments(id);void patiFetchPostComments(id);break;case 'comment-more':void patiFetchPostComments(id,true);break;case 'comment-emoji':{const ta=document.querySelector('#comment-form textarea[name="body"]');if(ta){ta.value+=target.dataset.emoji||'';ta.focus()}break;}case 'comment-reply':{const f=$('#comment-form');if(f){f.dataset.parent=id;const who=profile(data.comments.find(x=>x.id===id)?.author_id).display_name;const hint=$('#comment-reply-hint');if(hint)hint.innerHTML='↳ '+esc(who)+' kullanıcısına yanıt <button type="button" data-action="comment-reply-cancel">× Vazgeç</button>';f.querySelector('textarea')?.focus()}break}case 'comment-reply-cancel':{const f=$('#comment-form');if(f)f.dataset.parent='';const hint=$('#comment-reply-hint');if(hint)hint.textContent='';break}case 'comment-thread-toggle':{const form=$('#comment-form');const postId=form?.dataset.post;if(!postId)break;if(patiyizCommentExpandedReplies.has(id))patiyizCommentExpandedReplies.delete(id);else patiyizCommentExpandedReplies.add(id);showComments(postId);break;}case 'comment-like':run(async()=>{const form=$('#comment-form');const postId=form?.dataset.post||'',draft=form?.querySelector('textarea')?.value||'',parent=form?.dataset.parent||'';const liked=data.commentLikes.some(x=>x.comment_id===id&&x.user_id===me.id);let r=liked?await sb.from('comment_likes').delete().eq('comment_id',id).eq('user_id',me.id):await sb.from('comment_likes').insert({comment_id:id,user_id:me.id});if(r.error)throw r.error;await load();showComments(postId);const next=$('#comment-form');if(next){next.querySelector('textarea').value=draft;next.dataset.parent=parent;const hint=$('#comment-reply-hint');if(parent&&hint)hint.textContent=profile(data.comments.find(c=>c.id===parent)?.author_id).display_name+' kullanıcısına cevap veriyorsun';}});break;case 'comment-delete':{const c=data.comments.find(x=>x.id===id);if(!c||c.author_id!==me.id)break;if(!confirm('Yorum silinsin mi?'))break;run(async()=>{const post=$('#comment-form')?.dataset.post;const r=await sb.from('comments').delete().eq('id',id).eq('author_id',me.id);if(r.error)throw r.error;
  data.comments=data.comments.filter(row=>row.id!==id);
  const state=patiPostCommentPages.get(post);
  if(state){state.rows=state.rows.filter(row=>row.id!==id);state.at=0}
  patiHomeCountCache.delete(post);showComments(post);
 },'Yorum silindi');break}case 'replies':questionReplies(id);void patiLoadQuestionReplies(id);break;case 'post-menu':{const post=data.posts.find(p=>p.id===id);if(!post)break;const own=post.author_id===me.id;modal('Gönderi seçenekleri','<div class="pati-post-menu-list">'+(own?'<button type="button" data-action="edit-post" data-id="'+esc(id)+'">'+ico('edit')+' Gönderiyi düzenle</button><button type="button" class="danger" data-action="delete-post" data-id="'+esc(id)+'">'+ico('trash')+' Gönderiyi sil</button>':'<button type="button" data-action="report" data-kind="post" data-id="'+esc(id)+'">'+ico('alert')+' Gönderiyi bildir</button>')+'</div>','post-actions-form');break}case 'edit-post':compose(data.posts.find(p=>p.id===id));break;case 'delete-post':remove('posts',id);break;case 'delete-question':remove('questions',id);break;case 'delete-lost':remove('lost_reports',id);break;case 'care-del':{const item=data.care.find(x=>x.id===id&&x.owner_id===me.id);if(!item)break;
 if(!confirm('Bakım görevini kalıcı olarak silmek istiyor musun?'))break;
 run(async()=>{
  const result=await sb.from('care_tasks').delete().eq('id',id).eq('owner_id',me.id).select('id');
  if(result.error)throw result.error;
  if(!result.data?.length)throw Error('Görev silinemedi veya yetkin yok.');
  data.care=data.care.filter(x=>x.id!==id);if(view==='care'||(view==='my-pet'&&patiMyPetTab==='care'))render();
 },'Bakım görevi silindi.');break;}case 'logout':run(async()=>{const r=await sb.auth.signOut();if(r.error)throw r.error;me=null;isAdmin=false;authMode='login';showAuth()},'Çıkış yapıldı');break;
case 'like':void togglePostLike(id);break;case 'share-post':openPatiShareModal(id);break;case 'pati-copy-post':{const link=location.origin+location.pathname+'#post-'+id;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>notify('Paylaşım bağlantısı kopyalandı.'),()=>notify('Bağlantı kopyalanamadı.',true));else notify(link);break}case 'pati-share-system':{const link=location.origin+location.pathname+'#post-'+id;if(navigator.share)navigator.share({title:'Patiyiz paylaşımı',url:link}).catch(()=>{});else if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>notify('Bağlantı kopyalandı.'));break}case 'send-post-dm':{const post=data.posts.find(x=>x.id===target.dataset.post);if(!post||id===me.id)break;run(async()=>{const r=await sb.from('messages').insert({sender_id:me.id,receiver_id:id,body:'📨 Paylaşım: '+location.origin+location.pathname+'#post-'+post.id});if(r.error)throw r.error;closeModal();},'Paylaşım mesajla gönderildi.');break;}case 'save':void togglePostSave(id);break;case 'follow':run(()=>doToggle('follows',{follower_id:me.id,followee_id:id},followed.has(id)||patiFollowPageState.viewerFollowing.has(id)));break;case 'vote':run(()=>doToggle('question_votes',{question_id:id,user_id:me.id},voted.has(id)));break;case 'kb-save':run(()=>doToggle('kb_bookmarks',{article_id:id,user_id:me.id},favorites.has(id)));break;
case 'toggle-found':{const a=data.lost.find(x=>x.id===id&&x.owner_id===me.id);if(!a)break;const found=!a.found;
 if(!confirm(found?'Patili dostun bulundu mu? İlan bulundu olarak işaretlenecek.':'İlanı yeniden kayıp olarak yayınlamak istiyor musun?'))break;
 run(async()=>{const r=await sb.from('lost_reports').update({found}).eq('id',id).eq('owner_id',me.id).select('*');
 if(r.error)throw r.error;if(!r.data?.length)throw Error('İlan bulunamadı veya değiştirme yetkin yok.');
 data.lost=data.lost.map(x=>x.id===id?r.data[0]:x);lostPage();
 },found?'İlan bulundu olarak işaretlendi.':'İlan yeniden kayıp olarak açıldı.');break;}
case 'care-done':{const item=data.care.find(x=>x.id===id&&x.owner_id===me.id);if(!item)break;
 run(async()=>{
  const result=await sb.from('care_tasks').update({done:!item.done}).eq('id',id).eq('owner_id',me.id).select('*');
  if(result.error)throw result.error;
  if(!result.data?.length)throw Error('Görev güncellenemedi veya yetkin yok.');
  data.care=data.care.map(x=>x.id===id?result.data[0]:x);
  if(view==='care'||(view==='my-pet'&&patiMyPetTab==='care'))render();
 },item.done?'Görev yeniden açıldı.':'Görev tamamlandı.');break;}
case 'push-enable':enablePhonePush();break;
case 'notifications-check-push':void notificationCheckPush();break;
case 'notifications-refresh':void notificationFetch();break;
case 'notifications-filter':notificationFilter=id;notificationsPage();break;
case 'notifications-clear':notificationFilter='all';notificationSearch='';notificationsPage();document.getElementById('notification-v2-search')?.focus();break;
case 'notification-toggle-read':{const item=data.notifications.find(x=>x.id===id&&x.owner_id===me.id);if(!item)break;
 run(async()=>{const next=!item.read;const r=await sb.from('notifications').update({read:next}).eq('id',id).eq('owner_id',me.id).select('id');
 if(r.error)throw r.error;if(!r.data?.length)throw Error('Bildirim güncellenemedi veya yetkin yok.');
 item.read=next;navRender();if(view==='notifications')notificationsPage();
 },item.read?'Bildirim okunmadı olarak işaretlendi.':'Bildirim okundu olarak işaretlendi.');break;}
case 'notifications-read':run(async()=>{
 const uid=me.id;const r=await sb.from('notifications').update({read:true}).eq('owner_id',uid).eq('read',false).select('id');
 if(r.error)throw r.error;
 if(me?.id!==uid)return;
 const ids=new Set((r.data||[]).map(x=>x.id));
 data.notifications.forEach(x=>{if(ids.has(x.id))x.read=true});
 navRender();if(view==='notifications')notificationsPage();
},'Tüm bildirimler okundu olarak işaretlendi.');break;
case 'notification-delete':if(confirm('Bu bildirim silinsin mi?'))run(async()=>{
 const uid=me.id;const record=data.notifications.find(x=>x.id===id&&x.owner_id===uid);if(!record)return;
 const r=await sb.from('notifications').delete().eq('id',id).eq('owner_id',uid).select('id');
 if(r.error)throw r.error;if(!r.data?.length)throw Error('Bildirim silinemedi veya yetkin yok.');
 if(me?.id!==uid)return;data.notifications=data.notifications.filter(x=>x.id!==id);
 navRender();if(view==='notifications')notificationsPage();
},'Bildirim silindi.');break;
case 'notifications-delete-all':if(confirm('Tüm bildirimlerin kalıcı olarak silinsin mi? Bu işlem geri alınamaz.'))run(async()=>{
 const uid=me.id;const r=await sb.from('notifications').delete().eq('owner_id',uid).select('id');
 if(r.error)throw r.error;if(me?.id!==uid)return;
 const ids=new Set((r.data||[]).map(x=>x.id));
 data.notifications=data.notifications.filter(x=>!ids.has(x.id));
 navRender();if(view==='notifications')notificationsPage();
},'Tüm bildirimlerin silindi.');break;
case 'blocked-list':navigate('blocked');break;case 'follow-load-more':void patiLoadFollowPage();break;case 'followers-list':followReturnList=false;followListId=id;followListMode=target.dataset.mode==='following'?'following':'followers';navigate('follows-list');break;case 'followers-back':profileId=followListId;followReturnList=false;navigate('profile');break;case 'return-follow-list':followReturnList=false;navigate('follows-list');break;case 'delete-account-open':modal('Hesabımı kalıcı olarak sil',`<div class="pati-delete-warning"><strong>⚠️ Bu işlem geri alınamaz.</strong><p>Profilin, gönderilerin, hikâyelerin, mesajların, sesli yorumların ve yüklediğin dosyalar silinir. Başka kullanıcıların seninle yazışmalarındaki mesajlar da etkilenebilir. Yönetici hesapları buradan silinemez.</p></div><div class="pati-field"><label>Mevcut şifren</label><input type="password" name="delete_password" autocomplete="current-password" required></div><div class="pati-field"><label>Onaylamak için HESABIMI SIL yaz</label><input name="delete_confirm" autocomplete="off" required placeholder="HESABIMI SIL"></div>`,'delete-account-form');break;case 'settings-password':modal('Şifremi değiştir',formField('new_password','Yeni şifre (en az 8 karakter)','password','',true),'settings-password-form');break;case 'push-disable':run(async()=>{await disablePhonePush();if(view==='notifications')void notificationCheckPush()},'Bu cihazda telefon bildirimleri kapatıldı.');break;case 'block':{const isBlocked=blocked.has(id);const question=isBlocked?'Bu kişinin engelini kaldırmak istiyor musun?':'Bu kullanıcıyı engellemek istiyor musun?';if(confirm(question))run(async()=>{await doToggle('user_blocks',{blocker_id:me.id,blocked_id:id},isBlocked);if($('#blocked-form'))closeModal();notify(isBlocked?'Engel kaldırıldı.':'Kullanıcı engellendi.');},null);break}
case 'report':closeStory();modal('İçeriği bildir',textField('reason','Şikâyet nedeni (en az 5 karakter)','',true,500),'report-form');$('#report-form').dataset.kind=target.dataset.kind;$('#report-form').dataset.record=id;break;
case 'tools':openMobileFeaturesMenu();break;default:break}}
let messagePressTimer=null,messagePressOrigin=null,messageLongPressed=false;
function openMessageOptions(el){if(!el||view!=='messages'||!me)return;const id=el.dataset.messageId;const msg=patiDmFindMessage(id);if(!msg||(msg.sender_id!==me.id&&msg.receiver_id!==me.id))return;modal('Mesaj seçenekleri',`<p class="small-note">Silinen mesaj her iki kullanıcı için de kalıcı olarak kaldırılır.</p><div class="pati-actionbar"><button type="button" class="outline-btn pati-msg-delete" data-action="message-delete" data-id="${esc(id)}">🗑️ Sil</button></div>`,'message-options-form');$('#message-options-form .modal-footer')?.remove();}
document.addEventListener('contextmenu',e=>{const bubble=e.target.closest('.bubble-chat[data-message-id]');if(bubble){e.preventDefault();openMessageOptions(bubble)}});
document.addEventListener('pointerdown',e=>{const bubble=e.target.closest('.bubble-chat[data-message-id]');if(!bubble||e.pointerType==='mouse')return;clearTimeout(messagePressTimer);messagePressOrigin={x:e.clientX,y:e.clientY,id:bubble.dataset.messageId};messagePressTimer=setTimeout(()=>{messageLongPressed=true;openMessageOptions(bubble);messagePressTimer=null},520)});
document.addEventListener('pointermove',e=>{if(messagePressOrigin&&(Math.abs(e.clientX-messagePressOrigin.x)>12||Math.abs(e.clientY-messagePressOrigin.y)>12)){clearTimeout(messagePressTimer);messagePressTimer=null;messagePressOrigin=null}});
for(const ev of ['pointerup','pointercancel','scroll'])document.addEventListener(ev,()=>{clearTimeout(messagePressTimer);messagePressTimer=null;messagePressOrigin=null},true);
document.addEventListener('click',e=>{if(messageLongPressed){e.preventDefault();e.stopImmediatePropagation();messageLongPressed=false}},true);
document.addEventListener('input',e=>{if(e.target?.name==='crop_zoom'){postCropZoom=+e.target.value;drawPostCrop()}});
document.addEventListener('input',e=>{
 if(e.target?.matches?.('#message-form input[name="body"]'))patiDmTypingInput(e.target.value);
});
document.addEventListener('focusout',e=>{
 if(e.target?.matches?.('#message-form input[name="body"]'))patiDmTypingInput('');
});

let patiPinch=null;
document.addEventListener('touchstart',e=>{
 if(e.touches.length!==2)return;
 const image=e.target.closest?.('.pati-carousel-slide .pati-photo img');
 if(!image)return;
 const [a,b]=e.touches;
 const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
 if(distance<8)return;
 patiPinch={image,distance,scale:1};
 image.classList.add('pati-pinching');
 image.style.transformOrigin='center center';
},{passive:true});
document.addEventListener('touchmove',e=>{
 if(!patiPinch||e.touches.length!==2)return;
 const {image,distance}=patiPinch;
 if(!image.isConnected){patiPinch=null;return}
 const [a,b]=e.touches,now=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
 patiPinch.scale=Math.max(1,Math.min(3,now/distance));
 image.style.transform='scale('+patiPinch.scale.toFixed(3)+')';
 if(e.cancelable)e.preventDefault();
},{passive:false});
const patiFinishPinch=()=>{
 if(!patiPinch)return;
 const image=patiPinch.image;patiPinch=null;
 image.classList.remove('pati-pinching');
 image.style.transform='';
 image.style.transformOrigin='';
};
document.addEventListener('touchend',e=>{if(patiPinch&&e.touches.length<2)patiFinishPinch()},{passive:true});
document.addEventListener('touchcancel',patiFinishPinch,{passive:true});

document.addEventListener('input',e=>{
 const target=e.target;
 if(!target?.matches?.('[data-action="reel-seek"]'))return;
 const video=target.closest('.pati-reel-item')?.querySelector('.pati-reel-video');
 if(!video||!Number.isFinite(video.duration)||video.duration<=0)return;
 video.currentTime=(Math.max(0,Math.min(1000,Number(target.value)||0))/1000)*video.duration;
 target.style.setProperty('--pati-reel-progress',(Number(target.value)/10)+'%');
});
let cropDrag=null;document.addEventListener('pointerdown',e=>{if(e.target.id==='pati-crop-canvas'){cropDrag={x:e.clientX,y:e.clientY,startX:postCropX,startY:postCropY};e.target.setPointerCapture(e.pointerId)}});document.addEventListener('pointermove',e=>{if(!cropDrag||e.target.id!=='pati-crop-canvas')return;postCropX=Math.max(0,Math.min(1,cropDrag.startX-(e.clientX-cropDrag.x)/280));postCropY=Math.max(0,Math.min(1,cropDrag.startY-(e.clientY-cropDrag.y)/280));drawPostCrop()});document.addEventListener('pointerup',()=>{cropDrag=null});
document.addEventListener('change',e=>{
 const input=e.target;if(!input?.matches?.('#adoption-form input[name="photo"],#adoption-form input[name="photo_camera"]'))return;
 const file=input.files?.[0];if(!file?.size)return;
 if(file.size>30*1024*1024){input.value='';notify('Fotoğraf 30 MB sınırını aşıyor.',true);return}
 if(!file.type.startsWith('image/')&&!/\.(heic|heif)$/i.test(file.name||'')){input.value='';notify('Görsel dosyası seç.',true);return}
 const other=document.querySelector('#adoption-form input[name="'+(input.name==='photo'?'photo_camera':'photo')+'"]');if(other)other.value='';
});
document.addEventListener('change',e=>{
 const input=e.target;
 if(!input?.matches?.('#lost-form input[name="photo"],#lost-form input[name="photo_camera"]'))return;
 const file=input.files?.[0],preview=document.getElementById('lost-photo-preview');
 if(!file?.size)return;
 if(file.size>30*1024*1024){input.value='';notify('Fotoğraf 30 MB sınırını aşıyor.',true);return}
 if(!file.type.startsWith('image/')&&!/\.(heic|heif)$/i.test(file.name||'')){input.value='';notify('Görsel dosyası seç.',true);return}
 const other=document.querySelector('#lost-form input[name="'+(input.name==='photo'?'photo_camera':'photo')+'"]');if(other)other.value='';
 if(lostPhotoObjectUrl)URL.revokeObjectURL(lostPhotoObjectUrl);
 lostPhotoObjectUrl=URL.createObjectURL(file);
 if(preview){preview.hidden=false;preview.innerHTML='<img src="'+esc(lostPhotoObjectUrl)+'" alt="Yeni ilan fotoğrafı önizlemesi"><small>'+esc(file.name||'Fotoğraf hazır')+'</small>'}
});
document.addEventListener('change',e=>{
 const input=e.target;
 if(input?.id==='pati-pet-photo'){
  const file=input.files?.[0];
  if(!file)return;
  if(file.size>30*1024*1024){input.value='';notify('Fotoğraf 30 MB sınırını aşıyor.',true);return}
  const preview=document.querySelector('#pet-form .pati-pet-edit-photo');
  if(preview){
   if(patiPetPhotoObjectUrl)URL.revokeObjectURL(patiPetPhotoObjectUrl);
   patiPetPhotoObjectUrl=URL.createObjectURL(file);
   preview.innerHTML='<img src="'+esc(patiPetPhotoObjectUrl)+'" alt="Seçilen hayvan fotoğrafı önizlemesi">';
  }
  return;
 }
 if(input?.name==='dm_camera'||input?.name==='dm_gallery'){
  const files=[...(input.files||[])],isGallery=input.name==='dm_gallery';input.value='';
  if(files[0])run(()=>sendDmImage(files[0]));
  return;
 }

 if(input?.name==='dm_camera'||input?.name==='dm_gallery'){
  const files=[...(input.files||[])],isGallery=input.name==='dm_gallery';input.value='';
  if(files[0])run(()=>sendDmImage(files[0]));
  return;
 }

 if(input?.name==='dm_camera'||input?.name==='dm_gallery'){
  const files=[...(input.files||[])],isGallery=input.name==='dm_gallery';input.value='';
  if(files[0])run(()=>sendDmImage(files[0]));
  return;
 }

 if(input?.name==='dm_camera'||input?.name==='dm_gallery'){
  const files=[...(input.files||[])],isGallery=input.name==='dm_gallery';input.value='';
  if(files[0])run(()=>sendDmImage(files[0]));
  return;
 }
 const post=input?.closest?.('#post-form');
 if(post&&(input.name==='photo'||input.name==='video')){
  const cameraCapture=input.hasAttribute('capture');
  if(input.name==='photo'){input.removeAttribute('capture');input.multiple=post.dataset.mode!=='story'&&post.dataset.mode!=='reels'}
  if(input.files?.length){const other=post.querySelector('input[name="'+(input.name==='photo'?'video':'photo')+'"]');if(other)other.value=''}
  postCropIndex=0;postCropX=.5;postCropY=.5;postCropZoom=1;
  const controls=post.querySelector('.pati-media-controls');if(controls)controls.hidden=!(post.querySelector('input[name="photo"]')?.files?.length);
  const crop=post.querySelector('.pati-crop-preview');if(crop)crop.hidden=true;
  updatePostMediaPreview();
  if(post.dataset.mode==='reels'&&input.name==='video'&&window.PatiyizReelsEditor){window.PatiyizReelsEditor.setFiles(input.files).catch(err=>notify(String(err.message||err),true))}
  // Photo preview opens directly in the composer; crop editor is optional.
  if(input.name==='photo'&&!cameraCapture&&input.files?.length&&window.PatiyizGalleryPicker){
   const chosen=[...input.files];
   if(chosen.length>10){input.value='';updatePostMediaPreview();notify('En fazla 10 fotoğraf seçebilirsin.',true);return}
   window.PatiyizGalleryPicker.open(chosen,{
    multiple:true,max:10,
    onReopen:()=>{if(input.isConnected)openComposerMediaPicker('gallery')},
    onConfirm:files=>{
     if(!files.length)return false;
     if(files.length!==chosen.length||files.some((file,i)=>file!==chosen[i])){
      if(typeof DataTransfer!=='function')throw Error('Bu cihaz seçimi değiştirmeyi desteklemiyor. Galerinden yeniden seç.');
      const transfer=new DataTransfer();files.forEach(file=>transfer.items.add(file));input.files=transfer.files;
     }
     postCropIndex=0;updatePostMediaPreview();
     return true;
    }
   });
  }
  return;
 }
 if(input?.form?.id==='story-form'&&['story_camera','story_gallery'].includes(input.name)){
  const file=input.files?.[0];if(!file)return;
  input.form.dataset.storyInput=input.name;
  const other=input.form.querySelector('input[name="'+(input.name==='story_camera'?'story_gallery':'story_camera')+'"]');if(other)other.value='';
  updateStoryMediaPreview(file);return;
 }
 if(input?.type==='file'&&input.files?.[0]){
  const file=input.files[0],preview=input.closest('form')?.querySelector('.pati-upload-preview');
  if(preview){const url=URL.createObjectURL(file);preview.hidden=false;preview.innerHTML='<img alt="Seçilen fotoğrafın önizlemesi"><strong>✓ '+esc(file.name)+'</strong>';const img=preview.querySelector('img');img.src=url;img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>{img.remove();URL.revokeObjectURL(url)}}
 }
});

let lastPhotoTap={id:'',time:0},tapTimer=0;
function heartOnPhoto(el){const id=el.dataset.postId;if(!id)return;const heart=el.querySelector('.pati-heart-burst');if(heart){heart.classList.remove('pop');void heart.offsetWidth;heart.classList.add('pop')}if(!liked.has(id))void togglePostLike(id)}
document.addEventListener('click',e=>{const el=e.target.closest('.pati-doubletap-photo');if(!el)return;const now=Date.now();if(lastPhotoTap.id===el.dataset.postId&&now-lastPhotoTap.time<380){e.preventDefault();lastPhotoTap.time=0;heartOnPhoto(el)}else lastPhotoTap={id:el.dataset.postId,time:now}},true);
/* Instagram-like mobile tab gestures: 4 destination tabs, excluding the Share action. */
const patiSwipeTabs=['home','explore','reels','profile'];
let patiPageSwipe=null;
function patiCanSwipePage(target){
 if(!me||!patiSwipeTabs.includes(view)||!target?.closest?.('#main-content'))return false;
 if(view==='profile'&&profileId&&profileId!==me.id)return false;
 if(view==='explore'&&exploreTab==='users')return false;
 if(window.matchMedia?.('(max-width:740px)')?.matches===false)return false;
 if(document.getElementById('story-overlay')||document.querySelector('#modal-root .modal')||document.querySelector('#pati-create-sheet:not([hidden])'))return false;
 if(target.closest('input,textarea,select,[contenteditable],.pati-carousel,.pati-ig-highlights,.stories-strip,.pati-detail-screen,.pati-search-screen,.pati-ig-tabs,.pati-reels-editor,.pati-crop-preview'))return false;
 return true;
}
document.addEventListener('touchstart',event=>{
 patiPageSwipe=null;
 if(event.touches.length!==1||!patiCanSwipePage(event.target))return;
 const t=event.touches[0],width=window.innerWidth||document.documentElement.clientWidth;
 if(t.clientX<22||t.clientX>width-22)return;
 patiPageSwipe={x:t.clientX,y:t.clientY,started:Date.now(),sourceView:view};
},{passive:true});
document.addEventListener('touchmove',event=>{if(event.touches.length>1)patiPageSwipe=null},{passive:true});
document.addEventListener('touchcancel',()=>{patiPageSwipe=null},{passive:true});
document.addEventListener('touchend',event=>{
 const swipe=patiPageSwipe;patiPageSwipe=null;
 if(!swipe||event.changedTouches.length!==1||event.touches.length||view!==swipe.sourceView)return;
 if(!patiCanSwipePage(event.target)||Date.now()-swipe.started>1100)return;
 const t=event.changedTouches[0],dx=t.clientX-swipe.x,dy=t.clientY-swipe.y;
 if(Math.abs(dx)<75||Math.abs(dx)<Math.abs(dy)*1.5)return;
 const idx=patiSwipeTabs.indexOf(view),direction=dx<0?1:-1,next=patiSwipeTabs[idx+direction];
 if(!next)return;
 if(next==='profile')profileId='';
 patiSwipeNavDirection=direction;navigate(next);
},{passive:true});
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
 educationUpdateResults();
});
document.addEventListener('input',e=>{if(e.target?.id!=='kb-search')return;kbSearch=e.target.value;kbUpdateResults()});
document.addEventListener('input',e=>{if(e.target?.id!=='lost-search')return;lostSearch=e.target.value;lostUpdateResults()});
document.addEventListener('input',e=>{if(e.target?.id!=='adoption-search')return;adoptionSearch=e.target.value;adoptionUpdateResults()});
document.addEventListener('input',e=>{if(e.target?.id!=='care-search')return;careSearch=e.target.value;careUpdateResults()});
document.addEventListener('input',e=>{if(e.target?.id!=='notification-v2-search')return;notificationSearch=e.target.value;notificationRenderResults()});
document.addEventListener('input',e=>{if(e.target?.id!=='explore-search')return;search=e.target.value;const focused=e.target;const pos=focused.selectionStart;const oldScroll=window.scrollY;explorePage();patiExploreQueueSearch();const next=$('#explore-search');if(next){next.focus();try{next.setSelectionRange(pos,pos)}catch(_){}}window.scrollTo(0,oldScroll)});
document.addEventListener('submit',async e=>{let form=e.target,id=form.id;if(id==='pati-explore-form'){e.preventDefault();search=$('#explore-search')?.value.trim()||'';render();return}if(id==='settings-password-form'){e.preventDefault();const password=String(new FormData(form).get('new_password')||'');if(password.length<8)return notify('Yeni şifre en az 8 karakter olmalı.',true);await run(async()=>{const r=await sb.auth.updateUser({password});if(r.error)throw r.error;closeModal();},'Şifren güncellendi.');return}if(id==='auth-form')return;if(id==='delete-account-form'){e.preventDefault();if(busy)return;const formData=new FormData(form);const password=String(formData.get('delete_password')||'');const confirmation=String(formData.get('delete_confirm')||'').trim();if(confirmation!=='HESABIMI SIL')return notify('Onay için HESABIMI SIL yazmalısın.',true);if(!password)return notify('Mevcut şifren gerekli.',true);if(!confirm('Hesabın ve tüm kişisel verilerin kalıcı olarak silinsin mi?'))return;await run(async()=>{const session=await sb.auth.getSession();if(!session.data.session)throw Error('Lütfen yeniden giriş yap.');const response=await fetch(cfg.supabaseUrl+'/functions/v1/patiyiz-delete-account',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.data.session.access_token,'apikey':cfg.supabasePublishableKey},body:JSON.stringify({password,confirmation})});let result;try{result=await response.json()}catch{}if(!response.ok)throw Error(result?.message||'Hesap silinemedi.');closeModal();await sb.auth.signOut();me=null;isAdmin=false;showAuth('Hesabın silindi.');},null);return}if(!['wellness-reminder-form','wellness-weight-form','post-form','question-form','lost-form','care-form','profile-form','pet-form','reply-form','comment-form','report-form','message-form','dm-edit-form','verification-request-form','adoption-form','story-form','story-answer-form','highlight-album-form','highlight-album-add-form'].includes(id))return;e.preventDefault();if(busy)return;const primary=form.querySelector('.modal-footer button[type="submit"]');if(primary){primary.disabled=true;primary.dataset.originalText=primary.textContent;primary.textContent='⏳ Paylaşım hazırlanıyor…'}const status=form.querySelector('.pati-upload-status');if(status){status.hidden=false;status.querySelector('span').textContent='Paylaşım hazırlanıyor…'}const f=new FormData(form),str=k=>String(f.get(k)||'').trim();await run(async()=>{switch(id){case 'story-answer-form':{const out=await sb.from('patiyiz_story_responses').insert({story_id:form.dataset.story,user_id:me.id,kind:'question',response:str('response')});if(out.error)throw out.error;closeModal(true);notify('Yanıtın gönderildi.');break}case 'story-form':{const result=await createStoryPublication(form,f,str);data.stories=[result,...data.stories.filter(x=>x.id!==result.id)];closeModal(true);render();notify(result.is_highlight?'Hikâyen profilinde kalıcı olarak görünecek.':'Hikâyen 24 saat boyunca görüntülenecek.');break}case 'verification-request-form':{if(current().is_verified)throw Error('Hesabın zaten doğrulanmış.');const r=await sb.from('verification_requests').insert({user_id:me.id,note:str('note')});if(r.error){if(r.error.code==='23505')throw Error('Zaten bekleyen bir mavi tik talebin var.');throw r.error}closeModal();notify('Mavi tik talebin yöneticiye gönderildi.');break}case 'highlight-album-form':{const title=str('title').trim(),story_id=str('story_id');if(!title||title.length>32)throw Error('Albüm adı 1–32 karakter olmalı.');const story=data.stories.find(x=>x.id===story_id&&x.author_id===me.id);if(!story)throw Error('Hikâye bulunamadı.');if(!story.is_highlight){const mark=await sb.from('patiyiz_stories').update({is_highlight:true}).eq('id',story_id).eq('author_id',me.id);if(mark.error)throw mark.error;story.is_highlight=true}const out=await sb.from('patiyiz_highlight_albums').insert({owner_id:me.id,title}).select('id').single();if(out.error)throw out.error;const item=await sb.from('patiyiz_highlight_items').insert({album_id:out.data.id,story_id});if(item.error){await sb.from('patiyiz_highlight_albums').delete().eq('id',out.data.id);throw item.error}closeModal(true);await refresh();notify('Yeni öne çıkanlar albümü oluşturuldu.');break}
case 'highlight-album-add-form':{const story_id=str('story_id'),album_id=form.dataset.album;if(!story_id||!album_id)throw Error('Hikâye ve albüm seç.');const out=await sb.from('patiyiz_highlight_items').upsert({album_id,story_id},{onConflict:'album_id,story_id'});if(out.error)throw out.error;closeModal(true);await refresh();notify('Hikâye albüme eklendi.');break}
case 'post-form':{if(form.dataset.mode==='story'){const result=await createStoryPublication(form,f,str);data.stories=[result,...data.stories.filter(x=>x.id!==result.id)];closeModal(true);render();notify('Hikâyen 24 saat boyunca görüntülenecek.')}else if(form.dataset.edit){await save('posts',{body:str('body').trim()},form.dataset.edit)}else{const result=await createPostPublication(form,f,str);profileCountCache.delete(me.id);closeModal(true);try{await refresh()}catch(error){console.warn('Paylaşım kaydedildi, akış yenilemesi başarısız:',error.message)}notify('Paylaşım yayınlandı.');try{localStorage.removeItem(patiDraftKey())}catch{}}break}case 'question-form':{const title=str('title'),body=str('body');if(title.length<5||title.length>150)throw Error('Soru başlığı 5–150 karakter arasında olmalı.');if(body.length<5||body.length>2000)throw Error('Soru açıklaması 5–2000 karakter arasında olmalı.');const author=me.id,cat=str('category');
 const result=await sb.from('questions').insert({author_id:author,title,category:cat,body}).select('*').single();
 if(result.error)throw result.error;
 if(me?.id!==author)return;
 if(!data.questions.some(q=>q.id===result.data.id))data.questions.unshift(result.data);
 closeModal(true);view='community';communityCategory='Tümü';render();void patiLoadCommunity(true);
 notify('Sorun Toplulukta yayınlandı.');break}
case 'adoption-form':{
 const editId=form.dataset.edit||'';
 if(editId&&!data.adoption.some(x=>x.id===editId&&x.owner_id===me.id))throw Error('Bu ilanı düzenleme yetkin yok.');
 const rec=adoptionValidateRecord({name:str('name'),species:str('species'),gender:str('gender'),age:str('age'),city:str('city'),district:str('district'),description:str('description')});
 const file=[f.get('photo_camera'),f.get('photo')].find(x=>x?.size);
 if(file){const image=await upload(file);if(image)rec.photo_url=image}
 if(!editId)rec.owner_id=me.id;
 const out=editId?await sb.from('adoption_listings').update(rec).eq('id',editId).eq('owner_id',me.id).select('*'):await sb.from('adoption_listings').insert(rec).select('*');
 if(out.error)throw out.error;
 if(!out.data?.length)throw Error('İlan kaydedilemedi. Oturum ve hesap yetkilerini kontrol et.');
 const item=out.data[0];data.adoption=[item,...data.adoption.filter(x=>x.id!==item.id)];
 patiyizLoadedTables.add('adoption_listings');closeModal(true);
 adoptionStatus='mine';adoptionSpecies='Tümü';adoptionSearch='';if(view==='adoption')adoptionPage();
 notify(editId?'Sahiplendirme ilanı güncellendi.':'Sahiplendirme ilanı yayınlandı.');break}case 'lost-form':{
 const id=form.dataset.edit||'';
 const previous=id?data.lost.find(x=>x.id===id&&x.owner_id===me.id):null;
 if(id&&!previous)throw Error('Bu ilanı düzenleme yetkin yok.');
 const record=lostValidateRecord({name:str('name'),species:str('species'),city:str('city'),district:str('district'),last_seen:str('last_seen'),description:str('description')});
 const file=[f.get('photo_camera'),f.get('photo')].find(x=>x?.size);
 if(file){const image=await upload(file);if(image)record.photo_url=image}
 if(!id)record.owner_id=me.id;
 const r=id?await sb.from('lost_reports').update(record).eq('id',id).eq('owner_id',me.id).select('*'):await sb.from('lost_reports').insert(record).select('*');
 if(r.error)throw r.error;
 if(!r.data?.length)throw Error('İlan kaydedilemedi. Oturum ve yetkileri kontrol et.');
 const item=r.data[0];data.lost=[item,...data.lost.filter(x=>x.id!==item.id)];
 patiyizLoadedTables.add('lost_reports');
 closeModal(true);lostStatus='mine';lostSearch='';lostSpecies='Tümü';if(view==='lost')lostPage();
 notify(id?'Kayıp ilanı güncellendi.':'Kayıp ilanı yayınlandı.');break;}
case 'wellness-reminder-form':await patiWellnessSaveReminder(form,str);break;case 'wellness-weight-form':await patiWellnessSaveWeight(form,str);break;case 'care-form':{
 const editId=form.dataset.edit||'';
 if(editId&&!data.care.some(x=>x.id===editId&&x.owner_id===me.id))throw Error('Bu görevi düzenleme yetkin yok.');
 const rec=careValidateRecord({title:str('title'),category:str('category'),due_date:str('due_date'),pet_id:str('pet_id')||null});
 if(!editId)rec.owner_id=me.id;
 const result=editId?await sb.from('care_tasks').update(rec).eq('id',editId).eq('owner_id',me.id).select('*'):
  await sb.from('care_tasks').insert(rec).select('*');
 if(result.error)throw result.error;
 if(!result.data?.length)throw Error('Görev kaydedilemedi. Oturum ve hesap izinlerini kontrol et.');
 const item=result.data[0];data.care=[item,...data.care.filter(x=>x.id!==item.id)];
 patiyizLoadedTables.add('care_tasks');closeModal(true);if(view==='care'||(view==='my-pet'&&patiMyPetTab==='care'))render();
 notify(editId?'Bakım görevi güncellendi.':'Bakım görevi eklendi.');break;}
case 'profile-form':{let handle=str('handle').toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(handle))throw Error('Kullanıcı adı 3–24 karakter, küçük harf, rakam veya alt çizgi olmalı.');let o={display_name:str('display_name'),handle,city:str('city'),bio:str('bio')},image=await upload(f.get('photo'));if(image)o.avatar_url=image;await save('profiles',o,me.id);break}
case 'pet-form':{
 const owner=me.id,editId=form.dataset.edit||'',existing=editId?data.pets.find(p=>p.id===editId):null;
 if(editId&&(!existing||existing.owner_id!==owner))throw Error('Bu hayvanı düzenleme yetkin yok.');
 const name=str('name').trim();
 if(name.length<2||name.length>70)throw Error('Hayvanın adı 2–70 karakter arasında olmalı.');
 const o={name,species:str('species'),gender:str('gender')||'Belirtilmedi',age:str('age').slice(0,60),breed:str('breed').slice(0,90),personality:str('personality').slice(0,180),notes:str('notes').slice(0,500)};
 const image=await upload(f.get('photo'));if(image)o.photo_url=image;
 if(!editId)o.owner_id=owner;
 await save('pets',o,editId);
 if(me?.id===owner&&view==='pets'){void patiLoadOwnedPets();void patiLoadCommunityPets(true)}
 break}
case 'reply-form':{
 const uid=me.id,questionId=form.dataset.question,body=str('body').trim();
 if(!questionId||body.length<2||body.length>1000)throw Error('Cevap 2–1000 karakter arasında olmalı.');
 const result=await sb.from('replies').insert({author_id:uid,question_id:questionId,body}).select('*').single();
 if(result.error)throw result.error;
 if(me?.id!==uid)return;
 if(!data.replies.some(r=>r.id===result.data.id))data.replies.push(result.data);
 const state=patiCommunityReplyPages.get(uid+':'+questionId);
 if(state?.ready&&!state.rows.some(r=>r.id===result.data.id))state.rows.push(result.data);
 questionReplies(questionId);notify('Cevap yayınlandı.');break}
case 'comment-form':{
 const postId=form.dataset.post,body=str('body').trim();
 if(!postId||!body)throw Error('Yorum boş olamaz.');
 const owner=me.id,record={author_id:owner,post_id:postId,body};
 if(form.dataset.parent)record.parent_id=form.dataset.parent;
 const result=await sb.from('comments').insert(record).select('*').single();
 if(result.error)throw result.error;
 if(me?.id!==owner)return;
 if(!data.comments.some(c=>c.id===result.data.id))data.comments.push(result.data);
 if(typeof patiHomeCountCache!=='undefined')patiHomeCountCache.delete(postId);
 if(typeof patiPostCommentPages!=='undefined'){
  const state=patiPostCommentPages.get(postId);
  if(state?.ready)state.rows.push(result.data);
 }
 if(record.parent_id)patiyizCommentExpandedReplies.add(record.parent_id);
 // Do not restore already-posted text from the prior modal while re-rendering.
 const sentInput=form.querySelector('[name="body"]');if(sentInput)sentInput.value='';
 delete form.dataset.parent;
 showComments(postId);
 const list=document.querySelector('#comment-form .comment-list');
 if(list)list.scrollTop=list.scrollHeight;
 document.querySelectorAll('.pati-feed-card[data-post-id="'+postId+'"] [data-action="comment"] span').forEach(el=>el.textContent=String(data.comments.filter(c=>c.post_id===postId).length));
 notify('Yorum paylaşıldı.');
 break}
case 'report-form':{if(str('reason').length<5)throw Error('Neden en az 5 karakter olmalı.');await save('content_reports',{reporter_id:me.id,content_type:form.dataset.kind,content_id:form.dataset.record,reason:str('reason')});break}
case 'dm-edit-form':{const body=str('body');if(!body)throw Error('Mesaj boş olamaz');const out=await sb.from('messages').update({body,edited_at:new Date().toISOString()}).eq('id',form.dataset.message).eq('sender_id',me.id);if(out.error)throw out.error;closeModal(true);await refreshKeys([['messages','messages']]);break}case 'message-form':{patiDmTypingInput('');if(!personId||personId===me.id)return;if(!str('body').trim())return;if(blocked.has(personId))throw Error('Engellenmiş kullanıcıya mesaj gönderilemez.');const sender=me.id,recipient=personId;
 let r=await sb.from('messages').insert({sender_id:sender,receiver_id:recipient,body:str('body'),reply_to:form.dataset.reply||null}).select('*').single();
 if(r.error)throw r.error;
 form.reset();delete form.dataset.reply;
 if(me?.id===sender&&personId===recipient){
  data.messages=data.messages.filter(x=>x.id!==r.data.id);data.messages.push(r.data);
  navRender();render();
 }
 break}
}});if(form.isConnected){if(primary){primary.disabled=false;primary.textContent=primary.dataset.originalText||'Kaydet'}if(status)status.hidden=true}});
function patiResizeChatViewport(){
 const h=window.visualViewport?.height||window.innerHeight;
 if(Number.isFinite(h)&&h>0)document.documentElement.style.setProperty('--pati-dm-visual-height',Math.round(h)+'px');
 const top=window.visualViewport?.offsetTop||0;
 document.documentElement.style.setProperty('--pati-dm-visual-top',Math.max(0,Math.round(top))+'px');
}
patiResizeChatViewport();
window.visualViewport?.addEventListener('resize',patiResizeChatViewport);
window.visualViewport?.addEventListener('scroll',patiResizeChatViewport);
window.addEventListener('resize',patiResizeChatViewport);
// Multi-photo counter follows both finger swipes and arrow buttons.
function patiUpdateCarouselCounter(track){
 const box=track?.closest?.('.pati-carousel'),label=box?.querySelector('.pati-carousel-count');
 if(!label)return;
 const slides=track.querySelectorAll('.pati-carousel-slide'),total=slides.length;
 if(total<2)return;
 const width=track.clientWidth||slides[0]?.clientWidth||1;
 const index=Math.max(1,Math.min(total,Math.round(track.scrollLeft/width)+1));
 label.textContent=index+' / '+total;
}
document.addEventListener('scroll',event=>{
 const track=event.target;
 if(!track?.classList?.contains('pati-carousel-track')||track.dataset.patiCountPending)return;
 track.dataset.patiCountPending='1';
 requestAnimationFrame(()=>{
  delete track.dataset.patiCountPending;
  if(track.isConnected)patiUpdateCarouselCounter(track);
 });
},true);
window.addEventListener('offline',()=>{notify('İnternet bağlantısı kesildi. Paylaşım ve mesaj işlemleri bağlantı gelince tekrar denenebilir.',true)});
window.addEventListener('online',()=>{notify('İnternet bağlantısı yeniden kuruldu.');if(me&&sb){
 const userId=me.id,token=patiyizLoadToken;
 refresh().then(()=>{if(me?.id!==userId||patiyizLoadToken!==token)return;
  if(view==='messages'){void patiDmLoadInbox(true);if(personId)void patiDmLoadThread(personId)}
 }).catch(e=>console.warn('Yenileme başarısız',e));refreshOnReturn()
 }});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshOnReturn()});window.addEventListener('focus',refreshOnReturn);
function resetSessionState(){
 if(typeof patiOwnPetsRequest!=='undefined')patiOwnPetsRequest++;
 if(typeof patiPetPhotoObjectUrl!=='undefined'&&patiPetPhotoObjectUrl){URL.revokeObjectURL(patiPetPhotoObjectUrl);patiPetPhotoObjectUrl=''}
 if(typeof patiCommunityPage!=='undefined'){patiCommunityPage={owner:'',category:'',rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''};patiCommunityReplyPages.clear()}

 if(typeof patiExploreMedia!=='undefined'){patiExploreMetrics.clear();patiExploreSort='popular';patiExploreMedia={owner:'',rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''};patiExploreUsers={owner:'',query:'',rows:[],ready:false,loading:false,error:''};if(patiExploreSearchTimer)clearTimeout(patiExploreSearchTimer);patiExploreSearchTimer=null}

 if(typeof patiDmDisconnectTyping==='function')patiDmDisconnectTyping();
 if(typeof patiDmLocalSeenCache!=='undefined'){patiDmLocalSeenOwner='';patiDmLocalSeenCache.clear()}
 patiDmPendingLatestPeer='';if(typeof patiDmThreads!=='undefined')patiDmThreads.clear();if(typeof patiDmInbox!=='undefined')patiDmInbox={owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};

 patiyizLoadToken++;patiyizLoadedTables.clear();patiyizDeferredLoading=null;
 if(typeof patiHomeFeedIds!=='undefined'){patiHomeFeedIds=null;patiHomeFeedCursor=null;patiHomeLoadError=''};if(typeof patiHomeCountCache!=='undefined'){patiHomeCountCache.clear();patiHomeCountsLoading.clear()};if(typeof patiPostCommentPages!=='undefined')patiPostCommentPages.clear();patiWellness={reminders:[],weights:[],loaded:false,loading:false,notified:new Set()};patiLeaderboard=[];patiInviteState={code:'',invited_count:0,already_used:false,coins_each:50,loading:false};patiDmReturnView='home';mobileChatOpen=false;patiCoinState={balance:0,earned:0,claims:[],items:[],orders:[],history:[],loading:false};patiFollowerRewardState={followers:null,claimed:[]};document.getElementById('paticoin-celebration')?.remove();
 data=Object.fromEntries(Object.keys(data).map(key=>[key,[]]));
 for(const group of [favorites,followed,liked,saved,voted,blocked])group.clear();
 blockedProfiles=[];patiDmSignedCache.clear();profileCountCache.clear();profileCountInFlight.clear();
 if(typeof patiPostSeen!=='undefined')patiPostSeen.clear();if(typeof patiPostViewCounts!=='undefined')patiPostViewCounts.clear();if(typeof patiPostViewObserver!=='undefined'&&patiPostViewObserver){patiPostViewObserver.disconnect();patiPostViewObserver=null}pageLimits={posts:40,messages:150,notifications:150};pageMore={posts:true,messages:true,notifications:true};
 if(typeof healthFilePortal!=='undefined')healthFilePortal=null;if(typeof healthFileOwner!=='undefined')healthFileOwner='';if(typeof educationCloudDone!=='undefined')educationCloudDone.clear();if(typeof educationCloudUser!=='undefined')educationCloudUser='';if(typeof pendingPostLikes!=='undefined')pendingPostLikes.clear();if(typeof likesChangeEpoch==='number')likesChangeEpoch++;if(typeof savesChangeEpoch==='number')savesChangeEpoch++;if(typeof pendingPostSaves!=='undefined')pendingPostSaves.clear();if(typeof savedMissingAttempted!=='undefined')savedMissingAttempted.clear();personId='';profileId='';selectedPostId='';followListId='';patiFollowPageState={key:'',rows:[],next:0,hasMore:true,loading:false,error:'',viewerFollowing:new Set()};search='';view='home';chatFilter='primary';mobileChatOpen=false;isAdmin=false;
 patiDetailState=null;patiPageSwipe=null;patiSwipeNavDirection=0;storyItems=[];storyLikes=[];storyIndex=0;clearTimeout(storyTimer);storyTimer=null;lastPhotoTap={id:'',time:0};
 document.getElementById('story-overlay')?.remove();document.body.classList.remove('story-fullscreen-open');
 window.PatiyizGalleryPicker?.close();window.PatiyizCameraFlow?.close?.();window.PatiyizReelsEditor?.dispose();clearPatiMediaUrls();
 document.getElementById('modal-root')?.replaceChildren();
 dmCancel=true;if(dmRecorder?.state==='recording')try{dmRecorder.stop()}catch(e){console.warn('Ses kaydı durdurulamadı',e)}
 dmStream?.getTracks().forEach(track=>track.stop());dmStream=null;dmRecipient=null;dmParts=[];dmMediaSending=false;
}

async function boot(){if(!ready){showSetup();return}sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);try{let {data:result,error}=await sb.auth.getSession();if(error)throw error;me=result.session?.user;if(me){showApp()}else{showAuth()}sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){stopLive();resetSessionState();me=null;authMode='login';showAuth()}else if(event==='PASSWORD_RECOVERY'){modal('Yeni şifre belirle',formField('password','Yeni şifre','password','',true),'reset-password-form');}else if(event==='SIGNED_IN'&&session?.user&&(!me||me.id!==session.user.id)){stopLive();resetSessionState();me=session.user;const signedUser=me.id;setTimeout(async()=>{if(me?.id!==signedUser)return;if(me?.id===signedUser)showApp()},0)}})}catch(e){starter();showAuth('Bağlantı kurulamadı. Supabase ayarlarını kontrol et.');notify(friendly(e),true)}}
document.addEventListener('submit',async e=>{if(e.target.id!=='reset-password-form')return;e.preventDefault();let password=new FormData(e.target).get('password');await run(async()=>{let r=await sb.auth.updateUser({password});if(r.error)throw r.error;closeModal()},'Şifren güncellendi')});
document.addEventListener('click',e=>{
 const h=e.target.closest('[data-health-pet],[data-health-open],[data-health-delete],[data-health-print],[data-health-retry],[data-health-edit],[data-health-cancel],[data-health-filter],[data-health-clear]');
 if(h&&(view==='healthfile'||(view==='my-pet'&&patiMyPetTab==='healthfile'))&&healthFilePortal){
  if(h.hasAttribute('data-health-retry'))void healthFilePortal.load(true);
  else if(h.hasAttribute('data-health-edit'))healthFilePortal.edit(h.dataset.healthEdit);
  else if(h.hasAttribute('data-health-cancel'))healthFilePortal.cancelEdit();
  else if(h.hasAttribute('data-health-filter'))healthFilePortal.selectType(h.dataset.healthFilter);
  else if(h.hasAttribute('data-health-clear')){healthFilePortal.selectType('all');healthFilePortal.setSearch('');}

  else if(h.dataset.healthPet)healthFilePortal.selectPet(h.dataset.healthPet);
  else if(h.dataset.healthOpen)void healthFilePortal.openFile(h.dataset.healthOpen);
  else if(h.dataset.healthDelete)void healthFilePortal.remove(h.dataset.healthDelete);
  else if(h.hasAttribute('data-health-print')){try{healthFilePortal.report()}catch(err){notify(err.message,true)}}
  return;
 }
 
});
document.addEventListener('input',e=>{
 if(e.target?.id==='hf-search'&&(view==='healthfile'||(view==='my-pet'&&patiMyPetTab==='healthfile'))&&healthFilePortal)healthFilePortal.setSearch(e.target.value);
});
document.addEventListener('submit',e=>{
 if(e.target?.id!=='pati-health-record-form'||!(view==='healthfile'||(view==='my-pet'&&patiMyPetTab==='healthfile'))||!healthFilePortal)return;
 e.preventDefault();void healthFilePortal.save(e.target);
});
boot();
})();
