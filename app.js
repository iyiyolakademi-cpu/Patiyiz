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
const patiyizCurrentTheme=()=> 'light';
function patiApplyTheme(){
 document.documentElement.dataset.patiTheme='light';
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#f7f7f8');
 try{localStorage.removeItem('patiyiz_theme')}catch(e){console.warn('Tema kaydı temizlenemedi',e)}
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

const allowed=['home','explore','pets','reels','streaks','rewards','shop','saved-posts','community','knowledge','education','lost','adoption','care','wellness','healthfile','my-pet','messages','notifications','profile','blocked','settings','follows-list'];
const nav=[['home','Ana sayfa','home'],['explore','Keşfet','compass'],['reels','Reels','up'],['streaks','Seriler','calendar'],['community','Topluluk','users'],['knowledge','Bilgi Merkezi','library'],['education','101 Eğitim Serileri','library'],['lost','Kayıp İlanları','location'],['adoption','Sahiplendirme','heart'],['my-pet','Hayvanım','heart'],['messages','Mesajlar','message'],['notifications','Bildirimler','bell'],['profile','Profilim','user'],['settings','Ayarlar ve Gizlilik','settings']];
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
let patiStreakState={owner:'',count:0,best:0,ready:false,loading:false,checkedOn:''};
let patiStreakGoalState={owner:'',ready:false,loading:false,goal:null,earned:[],error:''};
patiApplyTheme(patiyizCurrentTheme());
let postCropX=.5,postCropY=.5,postCropRatio='4:5',postCropZoom=1,postCropObjectUrl='',dmMediaSending=false,postCropIndex=0;
let isAdmin=false;let pageLimits={posts:40,messages:150,notifications:150};let pageMore={posts:true,messages:true,notifications:true};let data={profiles:[],pets:[],posts:[],likes:[],saves:[],comments:[],commentLikes:[],follows:[],questions:[],replies:[],votes:[],lost:[],care:[],messages:[],dmReactions:[],notifications:[],bookmarks:[],blocks:[],adoption:[],messageHidden:[],stories:[],storyResponses:[],reposts:[],pins:[],highlightAlbums:[],highlightItems:[]};
let favorites=new Set(), followed=new Set(),liked=new Set(),saved=new Set(),voted=new Set(),blocked=new Set();
let patiyizLoadedTables=new Set(),patiyizDeferredLoading=null,patiyizLoadToken=0;
let patiHomeFeedIds=null,patiHomeFeedCursor=null,patiHomeLoadError='';
const patiHomeCountCache=new Map(),patiHomeCountsLoading=new Set();
const patiPostCommentPages=new Map();
let likesChangeEpoch=0;const pendingPostLikes=new Set();
let patiPublishSoundContext=null;
function patiPlayPublishChime(){
 try{
  const AudioCtor=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtor)return;
  const context=patiPublishSoundContext||(patiPublishSoundContext=new AudioCtor());
  if(context.state==='suspended')void context.resume().catch(()=>{});
  const now=context.currentTime;
  const master=context.createGain();master.gain.setValueAtTime(0.0001,now);
  master.gain.exponentialRampToValueAtTime(0.075,now+0.012);
  master.gain.exponentialRampToValueAtTime(0.0001,now+0.24);
  master.connect(context.destination);
  for(const [freq,delay] of [[1046.5,0],[1567.98,0.055]]){
   const oscillator=context.createOscillator();oscillator.type='sine';
   oscillator.frequency.setValueAtTime(freq,now+delay);
   oscillator.connect(master);oscillator.start(now+delay);oscillator.stop(now+0.24);
  }
 }catch(error){console.warn('Yayınlandı sesi oynatılamadı.');}
}
const notify=(msg,bad=false)=>{const host=$('#toasts');const el=document.createElement('div');el.className='pati-toast'+(bad?' error':'');el.textContent=msg;host.append(el);if(!bad&&/^Paylaşım yayınlandı\b/i.test(String(msg)))patiPlayPublishChime();setTimeout(()=>el.remove(),4000)};
const friendly=e=>{const m=String(e?.message||e||'İşlem başarısız.');if(/Failed to fetch|NetworkError|network request failed|fetch failed/i.test(m))return 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.';if(/JWT expired|Invalid JWT|session expired/i.test(m))return 'Oturumun süresi doldu. Yeniden giriş yapmalısın.';if(/permission denied|row-level security policy/i.test(m))return 'Bu işlem için yetkin yok veya ilgili kayıt artık kullanılamıyor.';if(/Invalid login credentials/i.test(m))return 'E-posta veya şifre hatalı.';if(/Email not confirmed/i.test(m))return 'E-posta adresinizi gelen kutunuzdan doğrulayın.';if(/User already registered/i.test(m))return 'Bu e-posta zaten kayıtlı.';if(/Password should/i.test(m))return 'Şifreniz en az 6 karakter olmalı.';if(/questions_title_check/i.test(m))return 'Soru başlığı en az 5, en fazla 150 karakter olmalı.';if(/questions_body_check/i.test(m))return 'Soru açıklaması en az 5, en fazla 2000 karakter olmalı.';return m};
const run=async(fn,success)=>{if(busy)return;busy=true;try{await fn();if(success)notify(success)}catch(e){console.error(e);notify(friendly(e),true)}finally{busy=false}};
const patiAvatarCache=new Map();
const profile=id=>{
 const p=data.profiles.find(row=>row.id===id);
 if(p?.avatar_url)patiAvatarCache.set(id,p.avatar_url);
 if(p)return p.avatar_url?p:(patiAvatarCache.has(id)?{...p,avatar_url:patiAvatarCache.get(id)}:p);
 return {id,display_name:'Patiyiz üyesi',handle:'üye',bio:'',city:'',avatar_url:patiAvatarCache.get(id)||''};
};
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
function showAuth(msg='') {starter();appRoot.classList.add('hidden');authRoot.classList.remove('hidden');let isSign=authMode==='signup',reset=authMode==='reset';authRoot.innerHTML=`<div class="auth-shell"><aside class="auth-story" aria-label="Patiyiz topluluğu"><div class="auth-story-top"><span class="auth-story-icon" aria-label="Patiyiz logosu"><img src="patiyiz-selected-logo.svg?v=20261024-new-p-logo-1" alt="Patiyiz logosu"></span><strong>patiyiz</strong><span class="auth-story-topline">BİRLİKTE DAHA GÜZEL</span></div><div class="auth-story-bottom"><span class="auth-story-label"><span class="auth-story-dot"></span> HAYVANSEVERLERİN DÜNYASI</span><h2>Onların hikâyesi,<br><em>bizim dünyamız.</em></h2><p>Patili dostlarınla anılarını paylaş, yeni arkadaşlıklar kur ve merak ettiklerini keşfet.</p></div></aside><div class="auth-pane"><div class="auth-card"><div class="auth-brand"><div class="brand-icon auth-matching-logo" aria-label="Patiyiz logosu"><img class="patiyiz-chosen-logo" src="patiyiz-selected-logo.svg?v=20261024-new-p-logo-1" alt="Patiyiz"></div><div><h1>patiyiz</h1><p>Hayvanseverlerin buluşma noktası</p></div></div>${reset?'':`<div class="auth-tabs"><button data-auth="login" class="${authMode==='login'?'active':''}">Giriş yap</button><button data-auth="signup" class="${isSign?'active':''}">Kayıt ol</button></div>`}<div class="auth-eyebrow">🐾 PATİYİZ'E HOŞ GELDİN</div><h2>${reset?'Şifreni yenileyelim':isSign?'Aramıza katıl':'Yeniden merhaba!'}</h2><p class="auth-sub">${reset?'E-posta adresini yaz, sana şifre yenileme bağlantısı gönderelim.':isSign?'Patili dostunla yeni bir dünyaya adım at. Üyelik ücretsiz.':'Patili dostların ve güzel hikâyeler burada seni bekliyor.'}</p>${msg?`<div class="pati-note">${esc(msg)}</div>`:''}<form id="auth-form">${isSign?`<div class="pati-auth-name-fields"><div class="pati-field"><label for="pati-first-name">Adın</label><input id="pati-first-name" name="first_name" type="text" required minlength="2" maxlength="45" autocomplete="given-name" autocapitalize="words" placeholder="Adın"></div><div class="pati-field"><label for="pati-last-name">Soyadın</label><input id="pati-last-name" name="last_name" type="text" required minlength="2" maxlength="45" autocomplete="family-name" autocapitalize="words" placeholder="Soyadın"></div></div>`:''}<div class="pati-field"><label for="email">E-posta</label><input id="email" name="email" type="email" inputmode="email" autocapitalize="none" spellcheck="false" required autocomplete="email" placeholder="ornek@eposta.com"></div>${reset?'':`<div class="pati-field"><label for="password">Şifre</label><span class="pati-auth-password-field"><input id="password" name="password" type="password" required minlength="6" autocomplete="${isSign?'new-password':'current-password'}" placeholder="${isSign?'Şifreni oluştur':'Şifreni gir'}"><button type="button" class="pati-auth-eye" data-auth-toggle-password aria-label="Şifreyi göster" aria-pressed="false">${ico('eye')}</button></span></div>`}<span class="pati-auth-terms">${isSign?'<label><input name="age_accepted" type="checkbox" value="yes" required> 18 yaşını doldurduğumu onaylıyorum.</label><label><input name="terms_accepted" type="checkbox" value="yes" required> <a href="terms.html" target="_blank" rel="noopener">Kullanım Şartlarını</a> kabul ediyorum.</label><span class="pati-auth-data-notice">Kişisel verilerinin nasıl işlendiğine ilişkin <a href="privacy.html" target="_blank" rel="noopener">Gizlilik Politikası ve veri işleme bilgilerini</a> inceleyebilirsin.</span>':'<a href="privacy.html" target="_blank" rel="noopener">Gizlilik Politikası</a> · <a href="terms.html" target="_blank" rel="noopener">Kullanım Şartları</a>'}</span><button class="primary-btn auth-submit" type="submit"><span>${reset?'Sıfırlama bağlantısı gönder':isSign?'Ücretsiz hesap oluştur':'Giriş yap'}</span><span aria-hidden="true">→</span></button></form><div class="auth-bottom"><button class="btn-link" data-auth="${reset?'login':'reset'}">${reset?'← Girişe dön':'Şifremi unuttum'}</button></div><p class="small-note"><span aria-hidden="true">🔒</span> E-posta doğrulama ve güvenli giriş. Gelen kutunu, gerekirse spam klasörünü kontrol et.</p></div></div></div>`}
async function checkAdmin(){if(!me||!sb){isAdmin=false;return}try{const {data,error}=await sb.rpc('patiyiz_is_admin');isAdmin=!error&&data===true}catch(e){isAdmin=false}if(!appRoot.classList.contains('hidden')){navRender();if(view==='settings')render()}}
/* Daily login streak: the database decides today's calendar date in Europe/Istanbul.
   No client-generated visit dates and no Puan balance updates. */
function patiStreakToday(){
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
async function patiStreakCheckin(){
 if(!me?.id||!sb||document.hidden)return;
 const uid=me.id,today=patiStreakToday();
 if(patiStreakState.owner!==uid)patiStreakState={owner:uid,count:0,best:0,ready:false,loading:false,checkedOn:''};
 if(patiStreakState.loading||patiStreakState.checkedOn===today)return;
 patiStreakState.loading=true;
 try{
  const result=await sb.rpc('patiyiz_checkin_streak');
  if(result.error)throw result.error;
  if(me?.id!==uid)return;
  const row=Array.isArray(result.data)?result.data[0]:result.data;
  if(!row||!Number.isFinite(Number(row.current_streak)))throw Error('Giriş serisi alınamadı');
  patiStreakState={owner:uid,count:Math.max(0,Number(row.current_streak)||0),
   best:Math.max(0,Number(row.longest_streak)||0),ready:true,loading:false,checkedOn:today};
  // Server-confirmed daily check-in, celebrated once for each Istanbul day.
  if(view==='streaks')render();
  void patiStreakGoalLoad();
  window.setTimeout(()=>{
   if(me?.id!==uid||patiStreakState.checkedOn!==today||document.hidden)return;
   window.PatiyizDelight?.showStreakOnce(patiStreakState,{userId:uid,day:today});
  },380);
 }catch(e){
  console.warn('Günlük giriş serisi eşitlenemedi:',e?.message||e);
  if(me?.id===uid)patiStreakState.loading=false;
 }
 finally{if(me?.id===uid)patiStreakState.loading=false}
}

/* Four fixed streak targets: account-scoped goal, progress, and one-time coins.
   Supabase verifies all milestones and pays the ledger, never this browser. */
const patiStreakGoals=[
 {days:3,coins:10,name:'İlk adım',desc:'3 gün üst üste giriş'},
 {days:7,coins:25,name:'Bir haftalık seri',desc:'7 gün üst üste giriş'},
 {days:14,coins:60,name:'İki haftalık seri',desc:'14 gün üst üste giriş'},
 {days:30,coins:150,name:'Bir aylık seri',desc:'30 gün üst üste giriş'}
];
async function patiStreakGoalLoad(target=null){
 if(!me?.id||!sb||patiStreakGoalState.loading)return;
 const uid=me.id;
 patiStreakGoalState.loading=true;
 try{
  const result=await sb.rpc('patiyiz_streak_goal',{p_target:target});
  if(result.error)throw result.error;
  if(me?.id!==uid)return;
  const value=result.data||{};
  patiStreakGoalState={owner:uid,ready:true,loading:false,
    goal:Number(value.goal_days)||null,
    earned:Array.isArray(value.earned_goals)?value.earned_goals.map(Number):[],
    error:''};
  if(Number.isFinite(Number(value.current_streak))){
   patiStreakState={...patiStreakState,owner:uid,
    count:Math.max(0,Number(value.current_streak)||0),
    best:Math.max(0,Number(value.longest_streak)||0),ready:true};
  }
  if(Number.isFinite(Number(value.balance))){patiCoinState.balance=Math.max(0,Number(value.balance)||0);navRender();}
  if(view==='streaks')render();
  if(target)notify(target+' günlük hedefin seçildi.');
  if(Number(value.awarded_coins)>0){
   // Ledger paid exactly once by the RPC. Reflect server-confirmed award.
   patiCoinAnimation(Number(value.awarded_coins),['Seri hedefi tamamlandı']);
   void patiCoinSync(false);
  }
 }catch(error){
  console.warn('Seri hedefi:',error?.message||error);
  if(me?.id===uid){
   patiStreakGoalState.loading=false;
   patiStreakGoalState.error='Hedef bilgileri alınamadı.';
   if(view==='streaks')render();
   if(target!==null)notify(friendly(error),true);
  }
 }finally{if(me?.id===uid)patiStreakGoalState.loading=false}
}
let patiStreakClaimBusy=false;
async function patiStreakClaim(target){
 const uid=me?.id,goal=patiStreakGoalState.goal;
 if(!uid||!sb||patiStreakClaimBusy||patiStreakGoalState.loading)return;
 if(![3,7,14,30].includes(target)||goal!==target||patiStreakState.count<target||patiStreakGoalState.earned.includes(target))return;
 patiStreakClaimBusy=true;
 try{
  const result=await sb.rpc('patiyiz_claim_streak_reward',{p_target:target});
  if(result.error)throw result.error;
  if(me?.id!==uid)return;
  const value=result.data||{},coins=Math.max(0,Number(value.awarded_coins)||0);
  if(Array.isArray(value.earned_goals))patiStreakGoalState.earned=value.earned_goals.map(Number);
  if(Number.isFinite(Number(value.balance))){patiCoinState.balance=Math.max(0,Number(value.balance)||0);navRender()}
  if(view==='streaks')render();
  if(coins>0){
   patiCoinAnimation(coins,['Seri ödülün toplandı']);
   notify('+'+coins+' Puan hesabına eklendi.');
  }else notify('Bu seri ödülü daha önce toplandı.');
  void patiCoinSync(false);
  void patiStreakGoalLoad();
 }catch(error){if(me?.id===uid)notify('Seri ödülü alınamadı: '+friendly(error),true)}
 finally{patiStreakClaimBusy=false}
}
/* 60-day progress is read without claiming or paying any reward. */
let patiStreak60State={owner:'',ready:false,loading:false,eligible:false,claimed:false,cash_status:'',error:''};
async function patiStreak60Load(){
 if(!me?.id||!sb||patiStreak60State.loading)return;
 const uid=me.id;
 if(patiStreak60State.owner!==uid)patiStreak60State={owner:uid,ready:false,loading:false,eligible:false,claimed:false,cash_status:'',error:''};
 patiStreak60State.loading=true;
 try{
  const {data,error}=await sb.rpc('patiyiz_streak60_reward',{p_claim:false});
  if(error)throw error;
  if(me?.id!==uid)return;
  patiStreak60State={owner:uid,ready:true,loading:false,eligible:!!data?.eligible,
   claimed:!!data?.claimed,cash_status:String(data?.cash_status||''),error:''};
  if(view==='streaks')render();
 }catch(error){
  console.warn('60 günlük seri kontrolü:',error?.message||error);
  if(me?.id===uid){patiStreak60State={...patiStreak60State,loading:false,ready:false,error:'60 günlük ödül kontrol edilemedi.'};if(view==='streaks')render()}
 }
}
let patiStreak60ClaimBusy=false;
async function patiStreak60Claim(){
 if(!me?.id||!sb||patiStreak60ClaimBusy||!patiStreak60State.eligible||patiStreak60State.claimed)return;
 if(!confirm('60 günlük seri ödülünü alıp 200 TL nakit ödül talebi oluşturulsun mu? Ödeme inceleme sonrasında kararlaştırılır.'))return;
 const uid=me.id;
 patiStreak60ClaimBusy=true;
 try{
  const {data,error}=await sb.rpc('patiyiz_streak60_reward',{p_claim:true});
  if(error)throw error;
  if(me?.id!==uid)return;
  patiStreak60State={owner:uid,ready:true,loading:false,eligible:!!data?.eligible,claimed:!!data?.claimed,cash_status:String(data?.cash_status||''),error:''};
  if(Number.isFinite(Number(data?.balance))){patiCoinState.balance=Math.max(0,Number(data.balance)||0);navRender()}
  if(Number(data?.awarded_balance)>0)notify('+'+Number(data.awarded_balance)+' Puan hesabına eklendi. Nakit talebin incelemede.');
  else notify('Ödül talebinin güncel durumu görüntülendi.');
  void patiCoinSync(false);
  if(view==='streaks')render();
 }catch(error){if(me?.id===uid)notify('60 günlük seri talebi oluşturulamadı: '+friendly(error),true)}
 finally{patiStreak60ClaimBusy=false}
}
function patiWeeklyBoardSafe(){try{return patiWeeklyBoard()}catch(error){console.warn('Haftalık sıralama hatası:',error);return '<section class="pati-weekly-fallback"><h2>Haftalık sıralama</h2><p>Sıralama yüklenemedi. Günlük serilerin aşağıda kullanılabilir.</p></section>'}}
function patiStreaksPage(){
 const goal=patiStreakGoalState.goal,days=patiStreakState.count||0,
   best=patiStreakState.best||0,earned=new Set(patiStreakGoalState.earned||[]);
 const cards=patiStreakGoals.map(item=>{
  const won=earned.has(item.days),selected=goal===item.days;
  const complete=selected&&days>=item.days;
  const ahead=Math.max(0,item.days-days),pct=Math.min(100,days/item.days*100);
  const claimable=selected&&complete&&!won;
  const disabled=!patiStreakGoalState.ready||patiStreakGoalState.loading||patiStreakClaimBusy||won||(!selected&&days>=item.days);
  return '<article class="pati-streak-goal-card '+(selected?'is-selected ':'')+(won?'is-earned':'')+'">'+
   '<div class="pati-streak-goal-top"><span class="pati-streak-goal-days">'+item.days+' <small>gün</small></span>'+
   '<span class="pati-streak-goal-coins">+'+item.coins+' </span></div>'+
   '<strong>'+esc(item.name)+'</strong><small>'+esc(item.desc)+'</small>'+
   '<div class="pati-streak-progress"><span style="width:'+pct+'%"></span></div>'+
   '<div class="pati-streak-goal-footer"><span>'+
    (won?'✓ Kazanıldı · puanın hesabında':claimable?'✓ Kazanıldı · puanı toplayabilirsin':selected?ahead+' gün kaldı':days>=item.days?'Bu seride geçildi':'Hedef olarak seçebilirsin')+
   '</span><button type="button" class="'+(claimable?'pati-streak-collect':'')+'" data-action="'+(claimable?'pati-streak-collect':'pati-streak-goal')+'" data-id="'+item.days+'" '+
    (disabled?'disabled ':'')+'aria-pressed="'+selected+'">'+(won?'Toplandı':claimable?'+'+item.coins+' Puanı topla':selected?'Seçili hedef':days>=item.days?'Geçildi':'Hedef seç')+'</button></div></article>';
 }).join('');
 const s60=patiStreak60State.owner===me?.id?patiStreak60State:null;
 const eligible60=!!s60?.eligible;
 const cashState={pending:'200 TL nakit talebin incelemede',approved:'200 TL nakit talebin onaylandı',paid:'200 TL nakit ödendi',rejected:'200 TL nakit talebin reddedildi'};
 const bonus60='<section class="pati-streak-sixty" aria-label="60 günlük özel ödül">'+
  '<span class="pati-streak-sixty-kicker">60 GÜNLÜK ÖZEL ÖDÜL</span><h2>60 gün üst üste giriş</h2>'+
  '<p><strong>100 Puan</strong> · Mama ve ürün talepleri için</p>'+
  '<p>🎁 <strong>200 TL nakit ödül talebi</strong> · Ödeme öncesi inceleme gerekir</p>'+
  '<div class="pati-streak-progress"><span style="width:'+Math.min(100,days/60*100)+'%"></span></div>'+
  '<small>'+Math.min(60,days)+' / 60 gün · Puan nakde çevrilemez.</small>'+
  (s60?.claimed?'<strong class="pati-streak-sixty-status">✓ 100 Puan kazanıldı · '+esc(cashState[s60.cash_status]||'Nakit talebi oluşturuldu')+'</strong>':
    '<button type="button" data-action="pati-streak-60-claim" '+(!eligible60||s60?.loading||!s60?.ready?'disabled':'')+'>'+(eligible60?'Ödülünü al ve nakit talebi oluştur':Math.max(0,60-days)+' gün kaldı')+'</button>')+
  (s60?.error?'<p role="status">'+esc(s60.error)+'</p><button type="button" data-action="pati-streak-60-refresh">Ödül durumunu yeniden dene</button>':'')+'</section>';
 const label=patiStreakGoalState.loading&&!patiStreakGoalState.ready?'Hedeflerin yükleniyor…':
   patiStreakGoalState.error||'Serini tamamladığında Puanı topla butonuyla ödülünü hesabına ekle.';
 const retry=patiStreakGoalState.error?'<button type="button" class="pati-streaks-retry" data-action="pati-streak-refresh">Yeniden dene</button>':'';
 main.innerHTML='<div class="pati-streaks-page">'+
   '<header class="pati-streaks-top"><button type="button" class="pati-streaks-back" data-action="pati-streak-back" aria-label="Önceki sayfaya dön">←</button><div class="pati-streak-title"><span class="pati-streak-kicker">GÜNLÜK SERİLER</span><h1>Serilerim</h1><p>Her gün giriş yap, hedeflerini tamamla, puan kazan.</p></div></header>'+
   (function(){try{return window.PatiyizDelight?.streakPanel?.({count:days,best},patiStreakToday())||''}catch(error){console.warn('Seri görseli:',error);return ''}})()+
   patiWeeklyBoardSafe()+
   '<section class="pati-streak-goal-section"><div class="pati-streak-goals-header"><h2>Seri hedefini belirle</h2><p>'+esc(label)+'</p>'+(goal?'<div class="pati-streak-goal-current"><span aria-hidden="true"></span>Aktif hedef: '+goal+' gün</div>':'')+'</div>'+
   retry+'<div class="pati-streak-goal-grid">'+cards+'</div>'+bonus60+
   '<p class="pati-streak-rules">Ödüller yalnızca seçtiğin ve tamamladığın hedef için bir kez alınabilir. Puanı topla butonuna bastığında sunucu ödülü doğrular. Gün değişimi Türkiye saatine göre hesaplanır.</p></section></div>';
 if(!patiStreakGoalState.ready&&!patiStreakGoalState.loading&&!patiStreakGoalState.error&&!patiStreakState.loading)void patiStreakGoalLoad();
 if(patiStreak60State.owner!==me?.id||(!patiStreak60State.ready&&!patiStreak60State.loading&&!patiStreak60State.error))void patiStreak60Load();
}

function showApp(){starter();
 if(me&&Array.isArray(window.__patiEarlyErrors)&&window.__patiEarlyErrors.length){
  const kinds=[...new Set(window.__patiEarlyErrors)];
  window.__patiEarlyErrors.length=0;
  window.setTimeout(()=>{if(me)for(const kind of kinds)patiTrackClientError(kind)},900);
 }if(me)window.setTimeout(()=>patiStreakCheckin(),550);if(me)window.setTimeout(()=>patiInviteLoad(),1700);if(me){window.setTimeout(()=>patiPublicActivityInit(),750);window.setTimeout(()=>patiWellnessFetch(true),1300)}if(me)window.setTimeout(()=>patiCoinSync(true),1600);if(me)window.setTimeout(()=>educationCloudLoad(),1200);authRoot.classList.add('hidden');appRoot.classList.remove('hidden');navigate(view);startLive();routePendingNotification();if(typeof routePendingLost==='function')void routePendingLost();if(typeof routePendingAdoption==='function')void routePendingAdoption();checkAdmin();
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
   await load('feed');redraw(initial,true);if(typeof patiCollabRefresh==='function')void patiCollabRefresh();
   if(me?.id!==userId)return;
   const later=signature();
   await load('deferred');redraw(later);if(typeof patiCollabRefresh==='function')void patiCollabRefresh();
  }).catch(e=>console.warn('Akış yeniden yüklenemedi:',e))
   .finally(()=>{if(me?.id===userId)patiyizDeferredLoading=null});
 }
}
const authBusy=async(fn)=>{try{let r=await fn();if(r.error)throw r.error;return r.data}catch(e){notify(friendly(e),true);return null}};
authRoot.addEventListener('click',e=>{
 if(e.target.closest('[data-auth-sdk-retry]')){location.reload();return}
 const toggle=e.target.closest('[data-auth-toggle-password]');
 if(toggle){const input=authRoot.querySelector('#password');if(input){const revealing=input.type==='password';input.type=revealing?'text':'password';toggle.setAttribute('aria-pressed',String(revealing));toggle.setAttribute('aria-label',revealing?'Şifreyi gizle':'Şifreyi göster')}return}
 const b=e.target.closest('[data-auth]');if(!b)return;authMode=b.dataset.auth;showAuth();
});
authRoot.addEventListener('submit',async(e)=>{if(e.target.id!=='auth-form')return;e.preventDefault();let fd=new FormData(e.target), email=String(fd.get('email')||'').trim(), password=String(fd.get('password')||'');if(authMode==='reset'){let res=await authBusy(()=>sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}));if(res!==null)showAuth('Şifre yenileme e-postasını kontrol edin.');return}if(authMode==='signup'){const firstName=String(fd.get('first_name')||'').trim().replace(/\s+/g,' '),lastName=String(fd.get('last_name')||'').trim().replace(/\s+/g,' ');if(firstName.length<2||lastName.length<2)return notify('Adını ve soyadını eksiksiz yazmalısın.',true);if(firstName.length>45||lastName.length>45)return notify('Ad ve soyad alanları en fazla 45 karakter olabilir.',true);const fullName=firstName+' '+lastName;if(fullName.length>70)return notify('Ad ve soyadın toplam uzunluğu 70 karakteri geçmemeli.',true);if(fd.get('age_accepted')!=='yes')return notify('Patiyiz şu anda 18 yaş ve üzeri kullanıcılar içindir.',true);if(fd.get('terms_accepted')!=='yes')return notify('Kayıt olmak için şartları kabul etmelisin.',true);let res=await authBusy(()=>sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname,data:{first_name:firstName,last_name:lastName,display_name:fullName}}}));if(res){if(res.session){if(me?.id!==res.user.id){stopLive();resetSessionState()}me=res.user;await load('initial');showApp()}else{authMode='login';showAuth('Hesabın oluşturuldu. Gelen e-postadan adresini doğrula, ardından giriş yap.')}}return}let res=await authBusy(()=>sb.auth.signInWithPassword({email,password}));if(res){if(me?.id!==res.user.id){stopLive();resetSessionState()}me=res.user;await load('initial');showApp()}});
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
async function refreshLiveTables(){const userId=me?.id,loadToken=patiyizLoadToken;if(!userId)return false;const result=await Promise.all([sb.from('messages').select('*').or('sender_id.eq.'+userId+',receiver_id.eq.'+userId).order('created_at',{ascending:false}).limit(pageLimits.messages||150),sb.from('notifications').select('*').eq('owner_id',userId).order('created_at',{ascending:false}).limit(pageLimits.notifications||150)]);if(result[0].error)throw result[0].error;if(result[1].error)throw result[1].error;if(me?.id!==userId||patiyizLoadToken!==loadToken)return false;data.messages=result[0].data||[];data.notifications=result[1].data||[];return true}
function queueLiveUpdate(){if(!me||document.hidden||navigator.onLine===false)return;if(liveReloadTimer)clearTimeout(liveReloadTimer);liveReloadTimer=setTimeout(async()=>{if(!me||document.hidden||navigator.onLine===false)return;const previousInbox=patiDmInbox.rows.map(x=>x.peer_id+'_'+x.message_id+'_'+x.unread_count).join('|');const oldMessageCount=data.messages.filter(x=>x.receiver_id===me.id&&!x.read_at).length;const oldNoticeCount=data.notifications.filter(x=>x.owner_id===me.id&&!x.read).length;const previousConversation=view==='messages'?data.messages.filter(x=>(x.sender_id===me.id&&x.receiver_id===personId)||(x.sender_id===personId&&x.receiver_id===me.id)).map(x=>x.id+'_'+x.read_at+'_'+x.edited_at+'_'+x.body+'_'+x.attachment_path).join('|'):'';try{if(!await refreshLiveTables()||!me)return;if(view==='messages'){await patiDmLoadInbox(true,true);if(personId)await patiDmLoadThread(personId,false,true)}navRender();if(document.hidden)return;if(view==='messages'){const nextInbox=patiDmInbox.rows.map(x=>x.peer_id+'_'+x.message_id+'_'+x.unread_count).join('|');const nextConversation=data.messages.filter(x=>(x.sender_id===me.id&&x.receiver_id===personId)||(x.sender_id===personId&&x.receiver_id===me.id)).map(x=>x.id+'_'+x.read_at+'_'+x.edited_at+'_'+x.body+'_'+x.attachment_path).join('|');if(previousConversation!==nextConversation||previousInbox!==nextInbox){const field=$('#message-form input[name="body"]');const draft=field?.value||'',focus=document.activeElement===field,position=field?.selectionStart??draft.length;render();const next=$('#message-form input[name="body"]');if(next){next.value=draft;if(focus){next.focus({preventScroll:true});next.setSelectionRange(position,position)}}}}else if(view==='notifications')render();const unread=data.messages.filter(x=>x.receiver_id===me.id&&!x.read_at).length;const notices=data.notifications.filter(x=>x.owner_id===me.id&&!x.read).length;if(unread>oldMessageCount||notices>oldNoticeCount)notify('Yeni bir Patiyiz bildirimin var 🐾');if(view==='messages')markConversationRead()}catch(err){console.warn('Canlı bildirim yenilemesi başarısız:',err.message)}},850)}
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
 const now=Date.now();if(now-lastForegroundSync<6000&&liveChannel)return;lastForegroundSync=now;
 if(!liveInitialized){stopLive();startLive()}
 queueLiveUpdate();
}
async function markConversationRead(){
 // Mark seen only when the conversation is actually visible.
 if(!patiDmAcceptedState.ready||patiDmIsRequest(personId))return;
 if(!me||view!=='messages'||!personId||(typeof document!=='undefined'&&document.hidden))return;
 if(typeof window!=='undefined'&&window.matchMedia?.('(max-width:740px)').matches&&!mobileChatOpen)return;
 const unread=data.messages.filter(x=>x.sender_id===personId&&x.receiver_id===me.id&&!x.read_at&&!patiDmSeenIds().has(x.id));
 const backendUnread=typeof patiDmInbox!=='undefined'&&patiDmReadReceiptsEnabled()?(patiDmInbox.rows.find(x=>x.peer_id===personId)?.unread_count||0):0;
 if(!unread.length&&!backendUnread)return;
 const ids=unread.map(x=>x.id);
 if(!patiDmReadReceiptsEnabled()){patiDmStoreLocalSeen(ids);navRender();return}
 const uid=me.id,peer=personId,token=patiyizLoadToken,now=new Date().toISOString();
 const r=await sb.from('messages').update({read_at:now}).eq('sender_id',peer).eq('receiver_id',uid).is('read_at',null).select('id,read_at');
 if(r.error){console.warn('Okundu bilgisi kaydedilemedi',r.error.message);return}
 if(me?.id!==uid||personId!==peer||patiyizLoadToken!==token)return;
 // An RLS-rejected UPDATE can return no rows without an error; never show a false receipt.
 const confirmed=new Map((r.data||[]).map(x=>[x.id,x.read_at]));
 if(!confirmed.size){queueLiveUpdate();return}
 const thread=typeof patiDmThreads!=='undefined'?patiDmThreads.get(patiDmThreadKey(peer)):null;
 for(const row of thread?.rows||[])if(confirmed.has(row.id))row.read_at=confirmed.get(row.id);
 const summary=typeof patiDmInbox!=='undefined'?patiDmInbox.rows.find(x=>x.peer_id===peer):null;
 if(summary)summary.unread_count=0;
 unread.forEach(x=>{if(confirmed.has(x.id))x.read_at=confirmed.get(x.id)});
 navRender();
}
function unreadCounts(){const hidden=new Set(data.messageHidden.filter(x=>x.user_id===me?.id).map(x=>x.message_id));const groupCount=typeof patiGroupInboxState!=='undefined'&&patiGroupInboxState.owner===me?.id?patiGroupInboxState.rows.reduce((sum,g)=>sum+Number(g.unread_count||0),0):0;return {messages:data.messages.filter(x=>x.receiver_id===me?.id&&!x.read_at&&!patiDmSeenIds().has(x.id)&&!blocked.has(x.sender_id)&&!hidden.has(x.id)).length+groupCount,notifications:data.notifications.filter(x=>x.owner_id===me?.id&&!x.read&&!blocked.has(x.actor_id)).length}}
function unreadMessageSources(){const hidden=new Set(data.messageHidden.filter(x=>x.user_id===me?.id).map(x=>x.message_id));const messages=data.messages.filter(x=>x.receiver_id===me?.id&&!x.read_at&&!patiDmSeenIds().has(x.id)&&!blocked.has(x.sender_id)&&!hidden.has(x.id));const tally=new Map();for(const m of messages)tally.set(m.sender_id,(tally.get(m.sender_id)||0)+1);return [...tally].sort((a,b)=>b[1]-a[1]).map(([id,count])=>({id,count,name:profile(id).display_name}))}
const countBadge=n=>n?`<span class="pati-count-badge" aria-label="${n} okunmamış">${n>99?'99+':n}</span>`:'';
function navRender(){
 const appRoot=document.getElementById('app-root');
 if(appRoot&&!document.getElementById('pati-right-menu-handle')){
  const handle=document.createElement('button');
  handle.type='button';handle.id='pati-right-menu-handle';handle.dataset.action='tools';
  handle.setAttribute('aria-label','Sağdaki menüyü aç');handle.title='Menüyü sağdan aç';
  handle.textContent='‹';
  appRoot.appendChild(handle);
 }
 const fab=$('#app-root>.mobile-fab');if(fab){fab.hidden=true;fab.style.display='none'}const sideCreate=$('.nav-create');if(sideCreate){const action=view==='home'?'compose':'';sideCreate.hidden=!action;sideCreate.style.display=action?'':'none';if(action){sideCreate.dataset.action=action;sideCreate.innerHTML=ico('plus')+(view==='community'?' Soru sor':view==='care'?' Görev ekle':view==='lost'?' İlan oluştur':view==='adoption'?' Sahiplendirme ilanı':' Yeni paylaşım')}}const shareAllowed=view==='home';
 if(typeof document!=='undefined'){
  document.querySelectorAll?.('#pati-header-share, .pati-desktop-action-button.primary[data-action="pati-create-open"]')?.forEach(el=>{el.hidden=!shareAllowed;el.style.display=shareAllowed?'':'none';});
  if(document.documentElement?.dataset)document.documentElement.dataset.patiView=view;
 }
 const counts=unreadCounts();const coinHeader=$('#pati-header-coins'),desktopCoin=$('#pati-desktop-coins');for(const counter of [coinHeader,desktopCoin])if(counter){counter.innerHTML='<span class="pati-balance-title">Bakiyen</span><strong>'+Number(patiCoinState.balance||0).toLocaleString('tr-TR')+'</strong>';counter.setAttribute('aria-label','Bakiyen: '+Number(patiCoinState.balance||0)+' puan. Ödülleri aç')}const profileBalance=$('#pati-profile-balance');if(profileBalance)profileBalance.textContent=Number(patiCoinState.balance||0).toLocaleString('tr-TR');const topMessages=$('#pati-header-messages');if(topMessages){topMessages.innerHTML=ico('message')+countBadge(counts.messages);topMessages.classList.toggle('active',view==='messages');topMessages.setAttribute('aria-label',counts.messages?'Mesajlar, '+counts.messages+' okunmamış mesaj':'Mesajlar')}const topBell=$('#pati-header-notifications');if(topBell){topBell.innerHTML=ico('bell')+countBadge(counts.notifications);topBell.classList.toggle('active',view==='notifications');topBell.setAttribute?.('aria-label',counts.notifications?'Bildirimler, '+counts.notifications+' okunmamış bildirim':'Bildirimler')}let navItem=([id,label,icon])=>`<button type="button" class="nav-link ${view===id?'active':''}" data-view="${id}" aria-current="${view===id?'page':'false'}" aria-label="${label}${id==='messages'&&counts.messages?', '+counts.messages+' okunmamış mesaj':id==='notifications'&&counts.notifications?', '+counts.notifications+' okunmamış bildirim':''}">${ico(icon)}${label}${id==='messages'?countBadge(counts.messages):id==='notifications'?countBadge(counts.notifications):''}</button>`;$('#desktop-nav').innerHTML=nav.map(navItem).join('')+(isAdmin?`<button class="nav-link patiyiz-admin-nav" type="button" data-action="open-admin">${ico('shield')}Yönetim Paneli</button>`:'');$('#mobile-nav').innerHTML=[['home','Akış','home'],['explore','Keşfet','search']].map(([id,label,icon])=>`<button type="button" class="mobile-nav-btn ${view===id?'active':''}" data-view="${id}" aria-label="${label}" aria-current="${view===id?'page':'false'}"><span class="pati-mobile-nav-glyph">${ico(icon)}</span><small>${label}</small></button>`).join('')+`<button type="button" class="mobile-nav-btn pati-messages-nav ${view==='messages'?'active':''}" data-view="messages" aria-label="Mesajlar${counts.messages?', '+counts.messages+' okunmamış mesaj':''}" aria-current="${view==='messages'?'page':'false'}"><span class="pati-mobile-nav-glyph">${ico('message')}${countBadge(counts.messages)}</span><small>Mesajlar</small></button>`+[['reels','Reels','reels-tab'],['profile','Profil','user']].map(([id,label,icon])=>`<button type="button" class="mobile-nav-btn ${view===id?'active':''}" data-view="${id}" aria-label="${label}" aria-current="${view===id?'page':'false'}"><span class="pati-mobile-nav-glyph">${ico(icon)}</span><small>${label}</small></button>`).join('')
}
function patiMenuNotificationsHTML(){
 const list=notificationVisible().slice(0,1),total=notificationVisible().length;
 return '<div class="pati-menu-notifications-top"><h3>'+ico('bell')+' Bildirimler'+(total?' <span class="pati-menu-notice-count">'+total+'</span>':'')+'</h3>'+
 '<button type="button" data-view="notifications" class="pati-menu-notifications-all">Tümü</button></div>'+
 '<div class="pati-menu-notifications-list">'+(list.length?notificationRows(list):'<p class="pati-menu-notifications-empty">Yeni bildirimin yok.</p>')+'</div>';
}
let patiRightMenuDialog=null;
function patiCloseRightMenu(){
 const popup=patiRightMenuDialog;
 if(!popup)return;
 patiRightMenuDialog=null;
 try{if(popup.open)popup.close()}catch(_){}
 popup.remove();
}
function patiOpenRightMenu(markup){
 patiCloseRightMenu();
 const popup=document.createElement('dialog');
 popup.className='pati-right-menu-drawer';popup.dataset.fullscreen='true';
 popup.setAttribute('aria-label','Patiyiz menüsü');
 popup.innerHTML='<div class="pati-right-menu-panel">'+
  '<header class="pati-right-menu-head"><div><small>UYGULAMA</small><h2>Menü</h2></div><button type="button" data-drawer-close aria-label="Menüyü kapat">×</button></header>'+
  '<div class="pati-right-menu-content">'+markup+'</div></div>';
 document.body.appendChild(popup);
 patiRightMenuDialog=popup;
 popup.addEventListener('cancel',event=>{event.preventDefault();patiCloseRightMenu()});
 popup.addEventListener('close',()=>{if(patiRightMenuDialog===popup)patiRightMenuDialog=null;popup.remove()},{once:true});
 popup.addEventListener('click',event=>{
  if(event.target===popup||event.target.closest('[data-drawer-close]')){event.preventDefault();patiCloseRightMenu();return}
  const item=event.target.closest('[data-view],[data-action]');
  if(!item)return;
  event.stopPropagation();
  patiCloseRightMenu();
  processClick({target:item});
 });
 if(typeof popup.showModal==='function')popup.showModal();
 else popup.setAttribute('open','');
}
function patiMenuRenderNotifications(){
 const target=document.getElementById('pati-feature-notifications-content');
 if(target)target.innerHTML=patiMenuNotificationsHTML();
}
function openMobileFeaturesMenu(){
 const groups=[
  {title:'Topluluk',tone:'purple',items:[['community','Soru & Cevap','users']]},
   {title:'101 Eğitim Serileri',tone:'blue',items:[['education','10 seri · Her biri 101 ders','library']]},
  {title:'Hayvanım',tone:'green',items:[['my-pet','Hayvanım Merkezi · Tüm seçenekler','heart']]},
  {title:'Sosyal Puan ve ödüller',tone:'orange',items:[['rewards','Sosyal Puan ve Görevler','grid'],['streaks','Günlük Seriler','calendar'],['shop','Ödül Mağazası','grid'],['saved-posts','Kaydettiğim gönderiler','bookmark']]},
  {title:'Hesabım',tone:'blue',items:[['settings','Ayarlar ve gizlilik','settings'],['blocked','Engellediğim kişiler','shield']]}
 ];
 const sections=groups.map(group=>'<section class="pati-feature-group pati-menu-tone-'+group.tone+'"><h3>'+esc(group.title)+'</h3><div class="pati-mobile-menu-list">'+
  group.items.map(([dest,label,icon])=>'<button type="button" class="pati-mobile-menu-item" data-view="'+dest+'" aria-label="'+esc(label)+'"><span class="pati-menu-icon">'+ico(icon)+'</span><span>'+esc(label)+'</span><span class="pati-menu-arrow">'+ico('arrow')+'</span></button>').join('')+
  '</div></section>').join('');
 const closeFriendsMenu='<section class="pati-feature-group pati-menu-tone-blue"><h3>Paylaşım gizliliği</h3><button type="button" class="pati-mobile-menu-item" data-action="pati-close-friends-open"><span class="pati-menu-icon">★</span><span>Yakın Arkadaşlar</span><span class="pati-menu-arrow">'+ico('arrow')+'</span></button></section>';
 const addPet='<div class="pati-feature-add-pet"><button type="button" class="pati-mobile-menu-item" data-action="pet-add"><span class="pati-menu-icon">'+ico('plus')+'</span><span>Yeni hayvan ekle</span><span class="pati-menu-arrow">'+ico('arrow')+'</span></button></div>';
 const admin=isAdmin?'<section class="pati-feature-group pati-menu-tone-blue"><h3>Yönetim</h3><button type="button" class="pati-mobile-menu-item" data-action="open-admin"><span class="pati-menu-icon">'+ico('shield')+'</span><span>Yönetim Paneli</span><span class="pati-menu-arrow">'+ico('arrow')+'</span></button></section>':'';
 const markup='<div class="pati-features-list pati-color-menu pati-menu-mobile-20261031"><section class="pati-feature-notifications" aria-label="Bildirimlerin" id="pati-feature-notifications-content">'+patiMenuNotificationsHTML()+'</section><p class="pati-feature-intro">Tüm özellikler · Kaydırarak keşfet</p>'+sections+closeFriendsMenu+addPet+admin+'</div>';
 if(window.matchMedia?.('(max-width:740px)')?.matches){patiOpenRightMenu(markup);return;}
 modal('Menü',markup,'tools-form');
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
let patiFollowerRewardState={followers:null,claimed:[],cash:[]};
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
   patiFollowerRewardState={followers:milestone.data?.followers??null,claimed:milestone.data?.claimed||[],cash:[]};
  }catch(error){console.warn('Takipçi ödülleri doğrulanamadı:',error)}
  const claimed=await sb.rpc('patiyiz_claim_completed_tasks');
  if(claimed.error)throw claimed.error;
  if(me?.id!==uid)return;
  const [wallet,ledger,items,orders,history,cashClaims]=await Promise.all([
   sb.from('patiyiz_reward_wallets').select('balance,lifetime_earned').eq('user_id',uid).maybeSingle(),
   sb.from('patiyiz_reward_ledger').select('task_code').eq('user_id',uid).not('task_code','is',null),
   sb.from('patiyiz_reward_items').select('id,name,description,kind,coins,emoji,stock_available').eq('enabled',true).order('sort_order'),
   sb.from('patiyiz_reward_redemptions').select('id,item_id,coins_spent,destination,status,created_at,admin_note,proof_url,reviewed_at,fulfilled_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(30),
   sb.from('patiyiz_reward_fulfillment_events').select('redemption_id,previous_status,next_status,note,created_at').order('created_at',{ascending:false}).limit(100),
   sb.from('patiyiz_follower_cash_claims').select('threshold,amount_try,status,created_at').eq('user_id',uid)
  ]);
  for(const r of [wallet,ledger,items,orders,history,cashClaims])if(r.error)throw r.error;
  if(me?.id!==uid)return;
  patiFollowerRewardState.cash=cashClaims.data||[];
  patiCoinState={balance:wallet.data?.balance||0,earned:wallet.data?.lifetime_earned||0,
   claims:(ledger.data||[]).map(x=>x.task_code),items:items.data||[],orders:orders.data||[],history:history.data||[],loading:false};
  navRender();if(['rewards','shop'].includes(view))render();
  const newly=(claimed.data?.awarded||[]);
  if(withAnimation&&newly.length)patiCoinAnimation(newly.reduce((n,x)=>n+x.coins,0),newly.map(x=>x.title));
 }catch(e){console.warn('Puan yüklenemedi:',e);if(withAnimation)notify('Puan yüklenemedi: '+friendly(e),true)}
 finally{patiCoinState.loading=false}
}
function patiCoinAnimation(amount,titles){
 // Replaces the old blocking paticoin-celebration; only after Supabase confirmed a reward.
 if(window.PatiyizMotion?.coin)window.PatiyizMotion.coin(amount,titles);
 else notify('+'+Number(amount)+' Puan kazandın!');
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
  const rows=tasks.map(([code,title,coins,info,period])=>{
   const key=patiCoinMissionKey(code,period||'once');
   const claimed=done.has(key);
   return '<article class="paticoin-task '+(claimed?'pati-mission-claimed':'')+'"><div class="paticoin-task-icon">'+(claimed?'✓':'★')+'</div><div><strong>'+esc(title)+'</strong><small>'+esc(info)+'</small></div><b class="'+(claimed?'earned':'')+'">'+(claimed?'✓ Tamamlandı':'+'+coins+' ')+'</b></article>';
  });
  const visible=completed?rows.length:(group==='once'?5:group==='daily'?3:2);
  return '<div class="paticoin-tasks">'+rows.slice(0,visible).join('')+(rows.length>visible?'<details class="pati-missions-more"><summary>Diğer '+(rows.length-visible)+' görevi göster</summary><div class="pati-missions-more-list">'+rows.slice(visible).join('')+'</div></details>':'')+'</div>';
 };
 const earnedToday=patiCoinTasks.filter(t=>(t[4]||'once')==='daily'&&done.has(patiCoinMissionKey(t[0],'daily'))).length;
 const earnedWeek=patiCoinTasks.filter(t=>(t[4]||'once')==='weekly'&&done.has(patiCoinMissionKey(t[0],'weekly'))).length;
 const earnedTodayCoins=patiCoinTasks.filter(t=>(t[4]||'once')==='daily'&&done.has(patiCoinMissionKey(t[0],'daily'))).reduce((sum,t)=>sum+Number(t[2]||0),0);
 const earnedWeekCoins=patiCoinTasks.filter(t=>(t[4]||'once')==='weekly'&&done.has(patiCoinMissionKey(t[0],'weekly'))).reduce((sum,t)=>sum+Number(t[2]||0),0);
 const spentCoins=patiCoinState.orders.filter(o=>o.status!=='cancelled').reduce((sum,o)=>sum+Number(o.coins_spent||0),0);
 const waitingOrders=patiCoinState.orders.filter(o=>['pending','approved','preparing'].includes(o.status)).length;
 const usedSummary='<section class="pati-coin-spent-overview" aria-label="Puan kullanım özeti"><div><strong>'+spentCoins.toLocaleString('tr-TR')+'</strong><span>Ödüllere kullanılan coin</span></div><div><strong>'+waitingOrders+'</strong><span>İşlemdeki ödül talebi</span></div><button type="button" data-action="paticoin-shop">Talep geçmişimi gör →</button></section>';
 const missionStatus='<div class="pati-mission-progress" aria-label="Görev ilerlemesi"><div><strong>Bugünkü görevlerin</strong><span>'+earnedToday+' / 5 tamamlandı · +'+earnedTodayCoins+' Puan</span><progress value="'+earnedToday+'" max="5"></progress></div><div><strong>Haftalık görevlerin</strong><span>'+earnedWeek+' / 4 tamamlandı · +'+earnedWeekCoins+' Puan</span><progress value="'+earnedWeek+'" max="4"></progress></div></div>';
 const milestones=window.PatiyizFollowerMilestones?.renderPanel(patiFollowerRewardState.followers,patiFollowerRewardState.claimed,patiFollowerRewardState.cash)||'';
 const invite='<section class="paticoin-invite"><h2>🎁 Arkadaşını davet et</h2><p>Sen ve davet ettiğin kişi <b>50’şer Puan</b> kazanırsınız. Her hesap yalnızca bir davet kodu kullanabilir.</p><div class="paticoin-invite-code"><strong>'+esc(patiInviteState.code||'Kod hazırlanıyor…')+'</strong><button data-action="paticoin-invite-share">Paylaş</button></div><small>Davet ettiğin kişi: '+(patiInviteState.invited_count||0)+'</small>'+(patiInviteState.already_used?'<p>✓ Davet kodu kullanma hakkını tamamladın.</p>':'<label class="paticoin-invite-entry">Arkadaşının kodu<input id="pati-invite-code" maxlength="9" autocomplete="off" placeholder="P1234ABCD"></label><button class="paticoin-invite-redeem" data-action="paticoin-invite-redeem">Kodu kullan · +50 </button>')+'</section>';
 main.innerHTML='<section class="paticoin-page"><div class="paticoin-hero"><span>GÖREV VE ÖDÜL MERKEZİ</span><h1>Puanlarım</h1><strong> '+Number(patiCoinState.balance).toLocaleString('tr-TR')+' <small>Puan</small></strong><p>Toplam kazanılan: '+Number(patiCoinState.earned).toLocaleString('tr-TR')+' coin</p><div class="paticoin-actions"><button data-action="paticoin-claim">Görevlerimi kontrol et</button><button data-action="paticoin-shop">Ödül Mağazası →</button></div></div>'+
 missionStatus+patiWeeklyBoard()+(milestones?'<details class="pati-follower-more"><summary>🏅 Takipçi hedeflerim</summary>'+milestones+'</details>':'')+'<div class="paticoin-mission-heading"><div><h2>🎯 Tek Seferlik Görevler</h2><p>Her hesapta yalnız bir kez puan kazandırır.</p></div><span>'+patiCoinTasks.filter(x=>!x[4]).length+' görev</span></div>'+missionList('once')+
 usedSummary+'<div class="paticoin-mission-heading"><div><h2>☀️ Günlük Görevler</h2><p>Her yeni gün yeniden yapılabilir. Aynı görevden günde bir kez puan kazanılır.</p></div><span>5 görev</span></div>'+missionList('daily')+
 '<div class="paticoin-mission-heading"><div><h2>🗓️ Haftalık Görevler</h2><p>Her pazartesi yeniden başlar. Aynı görevden haftada en fazla bir kez puan kazanılır.</p></div><span>4 görev</span></div>'+missionList('weekly')+
 invite+'<details class="paticoin-done-zone" aria-label="Tamamlanan görevler"><summary>✓ Tamamlanan görevler ve puan geçmişi</summary>'+
  ['once','daily','weekly'].map(group=>missionList(group,true)).join('')+'</details><p class="paticoin-disclaimer"><b>Ödül kuralları:</b> Hesabın en az 7 günlük olmalı, son 30 günde 3 farklı gün aktif olmalısın. 14 günde en fazla 1 ödül talebi oluşturabilirsin. Puanlar yalnızca sunucunun doğruladığı işlemler için verilir; eski kazançlar korunur.</p></section>';
}
let patiShopFilter='all';
function patiShopPage(){
 // The shop intentionally has one short catalog, without tabs or category filters.
 const ids=['kedi-mamasi-250','kopek-mamasi-250','mama-destek','fidan-bagisi'];
 const items=ids.map(id=>patiCoinState.items.find(item=>item.id===id)).filter(Boolean);
 const cashTarget=10000,cashAmount=1000;
 const balance=Math.max(0,Math.floor(Number(patiCoinState.balance)||0));
 const pointsLeft=Math.max(0,cashTarget-balance),progress=Math.min(100,Math.round(balance/cashTarget*100));
 const orders=patiCoinState.orders||[];
 const meta={
  'kedi-mamasi-250':{emoji:'🐈',tag:'KEDİ',subtitle:'Kediler için 250 g kuru mama'},
  'kopek-mamasi-250':{emoji:'🐕',tag:'KÖPEK',subtitle:'Köpekler için 250 g kuru mama'},
  'mama-destek':{emoji:'🤝',tag:'DESTEK',subtitle:'Sokak hayvanlarının beslenmesine katkı'},
  'fidan-bagisi':{emoji:'🌱',tag:'DOĞA',subtitle:'Bir fidan için bağış talebi'}
 };
 const cards=items.map(item=>{
  const m=meta[item.id],stock=Math.max(0,Number(item.stock_available)||0);
  const pending=orders.some(order=>order.item_id===item.id&&['pending','approved','preparing'].includes(order.status));
  const enough=balance>=Number(item.coins),ready=stock>0&&!pending;
  const stateText=pending?'Talebin işleniyor':stock===0?'Stok doğrulanıyor':stock<=3?'Son '+stock+' talep':'Talebe açık';
  const caption=stock===0?'Ürün stok doğrulamasından sonra açılır.':'Teslimat veya destek, onay sonrasında gerçekleşir.';
  return '<article class="pati-calm-item"><div class="pati-calm-item-art"><span role="img" aria-label="'+esc(m.tag)+'">'+m.emoji+'</span><small>'+m.tag+'</small></div>'+
   '<div class="pati-calm-item-content"><h3>'+esc(item.name)+'</h3><p>'+esc(m.subtitle)+'</p><div class="pati-calm-item-state '+(ready?'is-open':'')+'">'+esc(stateText)+'</div>'+
   '<div class="pati-calm-item-bottom"><span class="pati-calm-cost"><strong>'+Number(item.coins).toLocaleString('tr-TR')+'</strong><small>puan</small></span>'+
   '<button type="button" data-action="'+(enough?'paticoin-buy':'paticoin-rewards')+'" data-id="'+esc(item.id)+'" '+(!ready?'disabled aria-disabled="true"':'')+'>'+
    (pending?'İşlem sürüyor':!stock?'Stok bekleniyor':enough?'Puanla Al':'Puan kazan')+'</button></div>'+
   '<small class="pati-calm-item-foot">'+esc(caption)+'</small></div></article>';
 }).join('');
 const status={pending:'Beklemede',approved:'Onaylandı',preparing:'Hazırlanıyor',fulfilled:'Tamamlandı',cancelled:'İptal edildi'};
 const history=orders.slice(0,30).map(o=>{
  const item=patiCoinState.items.find(x=>x.id===o.item_id);
  const proof=o.status==='fulfilled'&&/^https:\/\//i.test(o.proof_url||'')?'<a href="'+esc(o.proof_url)+'" target="_blank" rel="noopener noreferrer">Teslimat kanıtı</a>':'';
  return '<div class="pati-calm-order"><div><strong>'+esc(item?.name||'Eski katalog ürünü')+'</strong><small>'+Number(o.coins_spent).toLocaleString('tr-TR')+' puan · '+day(o.created_at)+'</small></div><span>'+esc(status[o.status]||'İşlemde')+'</span>'+(o.admin_note?'<p>'+esc(o.admin_note)+'</p>':'')+proof+
   (Array.isArray(patiCoinState.history)&&patiCoinState.history.some(e=>e.redemption_id===o.id)?
   '<details><summary>Sipariş hareketleri</summary>'+
   patiCoinState.history.filter(e=>e.redemption_id===o.id).map(e=>'<p>'+esc(status[e.next_status]||e.next_status)+' · '+day(e.created_at)+'</p>').join('')+
   '</details>':'')+'</div>';
 }).join('');
 main.innerHTML='<section class="pati-calm-shop" aria-label="Puan mağazası">'+
  '<header class="pati-calm-header"><span>MAĞAZA</span><h1>İyiliğe dönüştür</h1><p>Dört seçenek, tek ekran. Puanlarınla mama desteği veya fidan talebi oluştur.</p></header>'+
  '<section class="pati-calm-wallet" aria-label="Puan bakiyesi ve ödül hedefi"><div class="pati-calm-wallet-top"><div><small>PUAN BAKİYEN</small><strong>'+balance.toLocaleString('tr-TR')+'</strong></div><button type="button" data-action="paticoin-rewards">Puan kazanma yolları <span aria-hidden="true">›</span></button></div>'+
   '<div class="pati-calm-cash"><div><span class="pati-calm-cash-label">PLANLANAN NAKİT ÖDÜL</span><h2>10.000 puan <span aria-hidden="true">→</span> 1.000 TL</h2></div><span class="pati-calm-planned">Hazırlıkta</span></div>'+
   '<div class="pati-calm-progress" role="progressbar" aria-label="10.000 puan nakit hedefi ilerlemesi" aria-valuemin="0" aria-valuemax="10000" aria-valuenow="'+Math.min(cashTarget,balance)+'"><span style="width:'+progress+'%"></span></div>'+
   '<div class="pati-calm-progress-meta"><span>%'+progress+' tamamlandı</span><strong>'+(pointsLeft?pointsLeft.toLocaleString('tr-TR')+' puan kaldı':'Puan hedefine ulaştın')+'</strong></div>'+
   '<p class="pati-calm-program-note">Nakit ödül programı henüz başlatılmadı. 10.000 puan hedefi bilgilendirme amaçlıdır; puanlar şu an nakde çevrilemez. Ödeme koşulları, mali kaynak ve hukuki inceleme tamamlandığında ayrıca duyurulacaktır.</p></section>'+
  '<section class="pati-calm-products"><div class="pati-calm-section-head"><h2>Mağazadakiler</h2><span>4 seçenek</span></div><div class="pati-calm-grid">'+(cards||'<p class="pati-calm-empty">Ürünler yükleniyor. Yenile butonuyla tekrar dene.</p>')+'</div></section>'+
  '<p class="pati-calm-rules"><strong>Nasıl çalışır?</strong> “Puanla Al” bir talep başlatır; doğrudan fiziksel teslimat veya bağış gerçekleşmiş sayılmaz. Stok ve uygunluk sunucu tarafından kontrol edilir. Hesabın en az 7 günlük olması, son 30 günde en az 3 gün aktif olman ve 14 günlük talep sınırı geçerlidir.</p>'+
  '<details class="pati-calm-history"><summary><span>Talep geçmişim</span><span>'+orders.length+' kayıt</span></summary><div class="pati-calm-orders">'+(history||'<p>Henüz bir talebin yok.</p>')+'</div></details>'+
  '<button type="button" class="pati-calm-refresh" data-action="paticoin-refresh">Bakiyeyi ve ürünleri yenile</button></section>';
}
function patiCoinShowCheckout(id){
 const product=patiCoinState.items.find(p=>p.id===id);
 if(!product)return notify('Ürün artık mevcut değil.',true);
 if(Number(product.stock_available)<=0)return notify('Bu ürün şu an stokta yok. Yeniden stok eklenmesini bekle.',true);
 if(patiCoinState.orders.some(o=>o.item_id===product.id&&['pending','approved','preparing'].includes(o.status)))return notify('Bu ürün için bekleyen bir talebin var. Talep geçmişini kontrol et.',true);
 if(patiCoinState.balance<product.coins)return notify('Yetersiz Puan. Önce görevlerini tamamla.',true);
 patiCoinCheckoutItem=product.id;
 const pets=data.pets.filter(p=>p.owner_id===me.id),donation=product.kind==='donation',streetOnly=product.id==='mama-destek';
 const coin='';
 const destination=donation?
  '<div class="pati-shop-tree-destination"><p>🌱 Doğa için bir fidan bağışı talebi. Yönetici onayı ve bağış kanıtı sonrasında tamamlanır.</p><label><input type="radio" name="paticoin-destination" value="environment" checked> Doğa için bağışla</label></div>':
  streetOnly?
  '<div class="pati-shop-tree-destination"><p>🤝 Bu destek sokak hayvanları için kullanılacaktır.</p><label><input type="radio" name="paticoin-destination" value="street_animals" checked> Sokak hayvanlarına mama desteği</label></div>':
  '<h3>Kimler için?</h3><label><input type="radio" name="paticoin-destination" value="street_animals" '+(!pets.length?'checked':'')+'> Sokak hayvanları için</label><label><input type="radio" name="paticoin-destination" value="own_pet" '+(pets.length?'checked':'disabled')+'> Kendi hayvanım için</label>'+
  '<div class="paticoin-pet-selector"><label for="paticoin-pet-id">Hayvanını seç</label><select id="paticoin-pet-id">'+pets.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></div>';
 const content='<div class="paticoin-checkout"><div class="paticoin-checkout-item">'+esc(product.emoji)+' <b>'+esc(product.name)+'</b><span>'+coin+product.coins+'</span></div>'+destination+
  '<p class="paticoin-disclaimer">Onayladığında talebin beklemeye alınır. Anında bağış veya teslimat gerçekleşmiş sayılmaz.</p><button type="button" class="paticoin-confirm" data-action="paticoin-confirm">'+coin+product.coins+' puan kullan · Satın Al</button></div>';
 modal('Siparişini onayla',content,'paticoin-checkout-form');
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
let patiyizFeedSoundEnabled=true; // User can turn sound off from the visible feed control.
function patiFeedSoundButton(video){
 const button=video?.parentElement?.querySelector('[data-action="video-sound"]');
 if(!button)return;
 button.innerHTML=ico(video.muted?'volume-x':'volume');
 button.setAttribute('aria-label',video.muted?'Sesi aç':'Sesi kapat');
 button.setAttribute('aria-pressed',String(!video.muted));
}
// Size feed videos and photos to their own original width-to-height ratios.
function setupFeedMediaRatios(){
 const set=(frame,w,h)=>{if(frame&&Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0){
   const aspect=w/h;
   const reel=!!frame.closest('.pati-feed-reel-card');
   // Clamp irregular legacy uploads to consistent frames while respecting explicit square/landscape crop choices.
   const ratio=reel?'9 / 16':aspect>1.48?'1.91 / 1':aspect>.94&&aspect<1.08?'1 / 1':'4 / 5';
   if(frame.style.getPropertyValue('--pati-feed-aspect')!==ratio)frame.style.setProperty('--pati-feed-aspect',ratio);
   frame.dataset.mediaRatio=ratio.replaceAll(' ','');
  }};
 document.querySelectorAll('#main-content .pati-feed-card .pati-video-frame').forEach(frame=>{
  const v=frame.querySelector('video');if(!v)return;
  const update=()=>set(frame,v.videoWidth,v.videoHeight);
  v.addEventListener('loadedmetadata',update);
  if(v.readyState>=1)update();
 });
 document.querySelectorAll('#main-content .pati-feed-card .pati-carousel').forEach(carousel=>{
  const track=carousel.querySelector('.pati-carousel-track');
  const pictures=[...carousel.querySelectorAll('.pati-carousel-slide img')];
  if(!track||!pictures.length)return;
  const update=()=>{
   const index=Math.max(0,Math.min(pictures.length-1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));
   const img=pictures[index];
   set(carousel,img.naturalWidth,img.naturalHeight);
  };
  pictures.forEach(img=>{img.addEventListener('load',update);if(img.complete&&img.naturalWidth)update()});
  let scheduled=false;
  track.addEventListener('scroll',()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update()})},{passive:true});
  update();
 });
}
function setupFeedVideos(){
 if(patiyizVideoObserver){patiyizVideoObserver.disconnect();patiyizVideoObserver=null}
 if(patiyizFeedActiveVideo){patiyizFeedActiveVideo.pause();patiyizFeedActiveVideo=null}
 const videos=[...document.querySelectorAll('#main-content .pati-video-frame video')];
 if(!videos.length)return;
 videos.forEach(video=>{video.preload='none';video.setAttribute?.('playsinline','');});
 const native=typeof window!=='undefined'&&window.PatiyizNative?.isNative===true;
 const iosHome=typeof document!=='undefined'&&document.documentElement?.classList?.contains('patiyiz-ios-reels');
 const permitted=()=>!document.hidden&&!document.getElementById?.('story-overlay')&&!(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!native&&!iosHome);
 const ratios=new Map();
 // Only an actively playing feed video receives a remote URL.
 const attach=video=>{const url=video?.dataset?.patiVideoSrc;if(url&&!video.getAttribute?.('src')){video.src=url;return true}return false};
 const playVideo=video=>{
  if(!video||!permitted()||video.dataset.userPaused)return;
  attach(video);
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
  videos.forEach(v=>patiWatchReelAttach(v));
  videos.forEach((video,i)=>{if(i)video.pause()});
  if(permitted())playVideo(videos[0]);
  return;
 }
 patiyizVideoObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
   const video=entry.target;
   if(entry.isIntersecting&&entry.intersectionRatio>=.01){
    ratios.set(video,entry.intersectionRatio);
    // Visibility alone must not download metadata from large MOV files.
   }else{
    ratios.delete(video);video.pause();delete video.dataset.userPaused;
    if(video===patiyizFeedActiveVideo)patiyizFeedActiveVideo=null;
   }
  }
  choose();
 },{threshold:[0,.2,.35,.5,.65,.85]});
 videos.forEach(v=>patiyizVideoObserver.observe(v));
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('.pati-post-video,.pati-reel-video').forEach(v=>v.pause());else{setupFeedVideos();setupReelsViewer();if(me&&sb){queueLiveUpdate();void patiStreakCheckin()}}});
document.addEventListener('patiyiz:native-resume-media',()=>{if(view==='reels'&&!document.hidden)setupReelsViewer()});
function ensureViewData(to){const byView={community:[['questions','questions'],['replies','replies'],['question_votes','votes']],knowledge:[['kb_bookmarks','bookmarks']],lost:[['lost_reports','lost']],adoption:[['adoption_listings','adoption']],care:[['care_tasks','care']],'my-pet':[['care_tasks','care']],messages:[['message_hidden','messageHidden']],profile:[],blocked:[['user_blocks','blocks']]};const missing=(byView[to]||[]).filter(([table])=>!patiyizLoadedTables.has(table));if(!missing.length)return;const requestedView=to,requestedUser=me?.id;Promise.all(missing.map(async([table,key])=>{let req=sb.from(table).select('*');if(table==='kb_bookmarks')req=req.eq('user_id',requestedUser);const r=await req.limit(350);if(r.error)throw r.error;return[table,key,r.data||[]]})).then(results=>{if(me?.id!==requestedUser)return;for(const[table,key,rows]of results){if(!patiyizLoadedTables.has(table)){data[key]=rows;patiyizLoadedTables.add(table);if(table==='kb_bookmarks')favorites=new Set(rows.map(x=>x.article_id))}}if(view===requestedView)render()}).catch(e=>console.warn('Bölüm verileri yüklenemedi:',e))}
const patiMobileTabScroll=new Map();
let patiPreviousView='home';
 const patiViewTrail=[];
let patiNavigatingBack=false;
let patiSwipeNavDirection=0;
let patiNavAnimationId=0;
function navigate(to){
 if(patiRightMenuDialog)patiCloseRightMenu();
 if(patiDmContextDialog)patiDmCloseContextMenu();
 const hubScreens=typeof patiPetHubScreens==='undefined'?new Set():patiPetHubScreens;
 if(view==='my-pet'&&patiMyPetTab==='hub'&&hubScreens.has(to)){
  patiPetHubOrigin=true;
  if(to==='education'){educationLesson='';educationCategory='Tümü';educationSearch='';patiAcademyBrowseAll=false}
  if(to==='knowledge'){articleId='';kbCategory='Tümü';kbFilter='Tümü';kbSearch='';patiKbBrowseAll=false}
  if(to==='lost')patiLostDetailId='';
  if(to==='adoption')patiAdoptionDetailId='';
 }
 if(['care','wellness'].includes(to)){patiMyPetTab=to;to='my-pet'}else if(to==='healthfile'){patiMyPetTab='hub';to='my-pet'} else if(to==='my-pet'){patiMyPetTab='hub'}
 if(!allowed.includes(to))to='home';
 if(to==='my-pet')patiPetHubOrigin=false;
 else if(!hubScreens.has(to))patiPetHubOrigin=false;
 const enteringFocusedReel=to==='reels'&&typeof patiFeedReelTarget!=='undefined'&&!!patiFeedReelTarget;
 const previous=view;if(previous!==to){patiPreviousView=previous;if(!patiNavigatingBack){patiViewTrail.push(previous);if(patiViewTrail.length>25)patiViewTrail.shift();}patiNavigatingBack=false;}const primary=['home','explore','reels'],reselect=previous===to&&primary.includes(to);
 if(to==='education'&&previous!=='education'){educationCategory='Tümü';educationLesson='';educationSearch='';educationStatus='Tümü';patiAcademyBrowseAll=false}
 if(to==='messages'&&previous!=='messages')patiDmReturnView=previous;
 if(to==='streaks'){if(patiStreakState.checkedOn===patiStreakToday())void patiStreakGoalLoad();else void patiStreakCheckin()}
 if(['rewards','streaks'].includes(to))void patiWeeklyRefresh();
 if(to==='home'&&typeof me!=='undefined'&&me?.id&&typeof patiCollabRefresh==='function')void patiCollabRefresh();
 if(to==='messages'&&previous!=='messages'&&personId)patiDmOpenAtLatest(personId);
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
  if(previous!=='messages')void patiDmLoadAccepted(true);
   if(previous!=='messages')void patiDmLoadInbox(true);
  if(personId)void patiDmLoadThread(personId);
 }
 const currentView=view;
 if(primary.includes(to)){
  requestAnimationFrame(()=>{
   if(view!==currentView)return;
   const offset=patiMobileTabScroll.get(to)||0;
   if(to==='reels'){const viewport=document.querySelector('.pati-reels-viewport');if(viewport&&!enteringFocusedReel)viewport.scrollTop=offset}
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

/* One approved shared post, two first-class authors, no duplicate post record.
   Center both names and their avatars on the same card in either profile. */
function patiCollabHeader(post,accepted){
 if(!accepted?.user_id)return userRow(post.author_id,'');
 const first=profile(post.author_id),second=profile(accepted.user_id);
 const person=(p,id)=>'<button type="button" class="pati-collab-author" data-action="view-user" data-id="'+esc(id)+'" aria-label="'+esc(p.display_name||p.handle||'Kullanıcı')+' profilini aç">'+
   
   '<span class="pati-collab-author-name">'+esc(p.handle||p.display_name||'Patiyiz üyesi')+(p.is_verified?' <span class="pati-collab-verified" aria-label="Doğrulanmış hesap">✓</span>':'')+'</span></button>';
 return '<div class="pati-collab-dual-header" aria-label="Ortak gönderi">'+
   '<div class="pati-collab-dual-avatars" aria-hidden="true"><span>'+avatar(first,'s')+'</span><span>'+avatar(second,'s')+'</span></div>'+
   '<div class="pati-collab-dual-authors">'+person(first,post.author_id)+
   '<span class="pati-collab-dual-and" aria-hidden="true">ve</span>'+person(second,accepted.user_id)+'</div>'+
   '<small class="pati-collab-dual-label">Ortak gönderi</small></div>';
}

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
let patiPetHubOrigin=false;
const patiPetHubScreens=new Set(['pets','knowledge','lost','adoption','community','shop']);
function patiPetHubBackButton(){
 if(!patiPetHubOrigin||!patiPetHubScreens.has(view))return;
 const root=main.querySelector('section');if(!root)return;
 const nav=document.createElement('div');nav.className='pati-pet-hub-return';
 nav.innerHTML='<button type="button" data-view="my-pet" aria-label="Hayvanım Merkezi geri dön">← Hayvanım Merkezi</button>';
 root.prepend(nav);
 root.classList.add('pati-pet-hub-linked');
}
function patiGoBack(){
 if(document.querySelector('#pati-create-sheet:not([hidden])')){closePatiCreate();return}
 if(document.getElementById('story-viewers-sheet')?.hidden===false){document.querySelector('#story-viewers-sheet [data-action="story-viewers-close"]')?.click();return}
 if(document.getElementById('story-overlay')){closeStory();return}
 if(document.querySelector('#modal-root .modal')){closeModal();return}
 if(document.getElementById('pati-creator-dashboard')){patiInsightsClose();return}
 if(view==='messages'&&mobileChatOpen){mobileChatOpen=false;personId='';render();return}
 if(view==='home'&&selectedPostId){selectedPostId='';patiDetailState=null;render();return}
 if(view==='profile'&&profileId&&profileId!==me?.id){profileId='';followReturnList=false;const dest=lastDetailView&&allowed.includes(lastDetailView)?lastDetailView:'explore';lastDetailView='';patiNavigatingBack=true;navigate(dest);return}
 let dest='';
 while(patiViewTrail.length){const candidate=patiViewTrail.pop();if(candidate!==view&&allowed.includes(candidate)){dest=candidate;break}}
 if(!dest)dest=patiPreviousView&&patiPreviousView!==view&&allowed.includes(patiPreviousView)?patiPreviousView:'home';
 if(dest===view)dest='home';
 profileId='';selectedPostId='';patiNavigatingBack=true;navigate(dest);
}
function patiEnsurePageBack(){
 if(view==='home'&&!selectedPostId)return;
 if(view==='messages')return;
 if(view==='profile')return;
 // Inner pages hide the global brand header on mobile; keep a standalone back button.
 if(main.querySelector('.pati-page-back')||main.querySelector('.pati-streaks-back'))return;
 const btn=document.createElement('button');btn.type='button';btn.className='pati-page-back';btn.dataset.action='pati-page-back';btn.innerHTML='‹ <span>Geri</span>';
 btn.setAttribute('aria-label','Önceki ekrana dön');main.prepend(btn);
}
function render(){try{if(view==='reels'&&typeof patiReelsCapture==='function'){const snap=patiReelsCapture();if(snap)patiReelsCarry=snap;}if(view!=='profile'&&document.getElementById('pati-creator-dashboard'))patiInsightsClose();if(view!=='messages'&&typeof patiGroupInboxStop==='function')patiGroupInboxStop();patiPostRenderStats=['home','reels','profile','explore','saved-posts'].includes(view)?patiBuildPostStats(data.likes,data.comments,blocked):null;({home:homePage,explore:explorePage,reels:reelsPage,streaks:patiStreaksPage,pets:petsPage,wellness:patiWellnessPage,healthfile:healthFilePage,'saved-posts':savedPostsPage,rewards:patiRewardsPage,shop:patiShopPage,community:communityPage,knowledge:knowledgePage,education:educationPage,lost:lostPage,adoption:adoptionPage,care:carePage,'my-pet':patiMyPetCenterPage,messages:messagesPage,notifications:notificationsPage,profile:profilePage,blocked:blockedPage,settings:settingsPage,'follows-list':followListPage}[view]||homePage)();setupFeedMediaRatios();setupFeedVideos();setupReelsViewer();document.documentElement.dataset.patiScreen=(view==='home'&&!selectedPostId)?'feed':'inner';patiEnsurePageBack();const globalBack=document.getElementById('pati-global-back');if(globalBack)globalBack.hidden=(view==='home'&&!selectedPostId)||(view==='messages'&&mobileChatOpen);patiWatchPostViews();patiPetHubBackButton();if(typeof patiScheduleEngagement==='function')patiScheduleEngagement()}catch(e){console.error(e);main.innerHTML=header('Bir hata oldu')+empty('Ekran açılamadı','Sayfayı yenile veya daha sonra tekrar dene.')}}
async function load(mode='all'){if(!me)return;const userId=me.id,loadToken=patiyizLoadToken,likesEpoch=(typeof likesChangeEpoch==='number'?likesChangeEpoch:0),savesEpoch=(typeof savesChangeEpoch==='number'?savesChangeEpoch:0);let specs=[['profiles','profiles',800],['pets','pets',600],['posts','posts',200],['post_likes','likes',2000],['post_saves','saves',2000],['comments','comments',1500],['comment_likes','commentLikes',3000],['follows','follows',2000],['questions','questions',150],['replies','replies',1500],['question_votes','votes',2000],['lost_reports','lost',300],['adoption_listings','adoption',300],['patiyiz_stories','stories',250],['patiyiz_story_responses','storyResponses',1000],['patiyiz_reposts','reposts',600],['patiyiz_post_pins','pins',500],['patiyiz_dm_reactions','dmReactions',2000],['patiyiz_highlight_albums','highlightAlbums',250],['patiyiz_highlight_items','highlightItems',500],['care_tasks','care',500],['messages','messages',1000],['message_hidden','messageHidden',1000],['notifications','notifications',500],['kb_bookmarks','bookmarks',300],['user_blocks','blocks',500]];if(mode==='initial')specs=specs.filter(([table])=>['profiles','pets','posts','post_likes','post_saves','patiyiz_stories','patiyiz_highlight_albums','patiyiz_highlight_items','user_blocks'].includes(table));else if(mode==='feed')specs=specs.filter(([table])=>['patiyiz_reposts','patiyiz_post_pins','profiles','posts','post_likes','post_saves','patiyiz_stories','patiyiz_highlight_albums','patiyiz_highlight_items'].includes(table));else if(mode==='deferred')specs=specs.filter(([table])=>!patiyizLoadedTables.has(table));
const fetchSpec=async([table,key,limit])=>{const chunks=[];const size=250,cap=Math.max(1,Math.min(5000,pageLimits[key]||limit));try{for(let start=0;start<cap;start+=size){let req=sb.from(table).select('*').range(start,Math.min(start+size-1,cap-1));if(table==='kb_bookmarks')req=req.eq('user_id',userId);if(['messages','notifications','comments','posts','replies','questions','lost_reports','patiyiz_stories','patiyiz_story_responses','adoption_listings'].includes(table))req=req.order('created_at',{ascending:false});if(table==='posts')req=req.order('id',{ascending:false});const r=await req;if(r.error)throw r.error;chunks.push(...(r.data||[]));if((r.data||[]).length<size)break;}if(pageLimits[key])pageMore[key]=chunks.length>=cap;return[key,chunks,true]}catch(e){console.warn(table,'yüklenemedi:',e.message);if(table==='posts'&&typeof patiHomeLoadError!=='undefined')patiHomeLoadError='Gönderiler yüklenemedi.';return[key,data[key]||[],false]}};const results=[];if(mode==='deferred'){for(let i=0;i<specs.length;i+=4){if(me?.id!==userId||patiyizLoadToken!==loadToken)return;results.push(...await Promise.all(specs.slice(i,i+4).map(fetchSpec)))}}else results.push(...await Promise.all(specs.map(fetchSpec)));if(me?.id!==userId||patiyizLoadToken!==loadToken)return;for(const [k,val,ok]of results){
 if(k==='posts'&&ok&&typeof patiHomeFeedIds!=='undefined'){
  patiHomeFeedIds=new Set(val.map(p=>p.id));
  const last=val[val.length-1];patiHomeFeedCursor=last?{created_at:last.created_at,id:last.id}:null;
  patiHomeLoadError='';
 }
 if(k==='likes'&&likesEpoch!==(typeof likesChangeEpoch==='number'?likesChangeEpoch:0))continue;if(k==='saves'&&savesEpoch!==(typeof savesChangeEpoch==='number'?savesChangeEpoch:0))continue;data[k]=(['posts','stories','pets'].includes(k)&&globalThis.PatiyizPrivateMedia)?await globalThis.PatiyizPrivateMedia.hydrateRows(val,userId,sb):val;if(ok)patiyizLoadedTables.add(({profiles:'profiles',pets:'pets',posts:'posts',likes:'post_likes',saves:'post_saves',comments:'comments',commentLikes:'comment_likes',follows:'follows',questions:'questions',replies:'replies',votes:'question_votes',lost:'lost_reports',adoption:'adoption_listings',stories:'patiyiz_stories',storyResponses:'patiyiz_story_responses',reposts:'patiyiz_reposts',pins:'patiyiz_post_pins',dmReactions:'patiyiz_dm_reactions',highlightAlbums:'patiyiz_highlight_albums',highlightItems:'patiyiz_highlight_items',care:'care_tasks',messages:'messages',messageHidden:'message_hidden',notifications:'notifications',bookmarks:'kb_bookmarks',blocks:'user_blocks'})[k])}if(typeof patiHydrateCloseStories==='function')await patiHydrateCloseStories();liked=new Set(data.likes.filter(x=>x.user_id===me.id).map(x=>x.post_id));saved=new Set(data.saves.filter(x=>x.user_id===me.id).map(x=>x.post_id));followed=new Set(data.follows.filter(x=>x.follower_id===me.id).map(x=>x.followee_id));voted=new Set(data.votes.filter(x=>x.user_id===me.id).map(x=>x.question_id));favorites=new Set(data.bookmarks.filter(x=>x.user_id===me.id).map(x=>x.article_id));blocked=new Set(data.blocks.filter(x=>x.blocker_id===me.id).map(x=>x.blocked_id))}
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
   const shown=globalThis.PatiyizPrivateMedia?await globalThis.PatiyizPrivateMedia.hydrateRows(rows,uid,sb):rows;
   for(const row of shown)if(!known.has(row.id)){data.posts.push(row);known.add(row.id)}
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
 return patiMentionsHTML(raw||'').replace(/(^|[\s])#([\p{L}\p{N}_]{2,35})/gu,(_m,prefix,tag)=>prefix+'<button type="button" class="pati-hashtag" data-action="hashtag" data-id="'+tag+'">#'+tag+'</button>');
}

/* Social features: repost and pinned profile posts. */
const patiOwnRepost=postId=>data.reposts.some(r=>r.user_id===me?.id&&r.post_id===postId);
const patiOwnPin=postId=>data.pins.some(r=>r.owner_id===me?.id&&r.post_id===postId);
function patiFindSocialPost(postId){
 return data.posts.find(x=>x.id===postId)||
  (typeof patiExploreMedia!=='undefined'&&patiExploreMedia.rows||[]).find(x=>x.id===postId)||
  (typeof patiFollowingState!=='undefined'&&patiFollowingState.rows||[]).find(x=>x.id===postId)||
  (typeof patiReelsFeed!=='undefined'&&patiReelsFeed.rows||[]).find(x=>x.id===postId);
}
const patiRepostMissingAttempted=new Set(),patiRepostSourcesBusy=new Set();
async function patiEnsureRepostSources(ownerId){
 if(!me||!sb||patiRepostSourcesBusy.has(ownerId))return;
 const ids=[...new Set(data.reposts.filter(x=>x.user_id===ownerId).map(x=>x.post_id))]
  .filter(id=>!data.posts.some(p=>p.id===id)&&!patiRepostMissingAttempted.has(me.id+':'+id)).slice(0,60);
 if(!ids.length)return;
 const viewer=me.id,token=patiyizLoadToken;
 ids.forEach(id=>patiRepostMissingAttempted.add(viewer+':'+id));
 patiRepostSourcesBusy.add(ownerId);
 try{
  const result=await sb.from('posts').select('*').in('id',ids).limit(60);
  if(result.error)throw result.error;
  if(me?.id!==viewer||patiyizLoadToken!==token)return;
  const seen=new Set(data.posts.map(p=>p.id));
  const visible=globalThis.PatiyizPrivateMedia?await globalThis.PatiyizPrivateMedia.hydrateRows(result.data||[],viewer,sb):result.data||[];
  for(const post of visible)if(!seen.has(post.id)){data.posts.push(post);seen.add(post.id)}
  if(view==='profile'&&(profileId||me.id)===ownerId&&profilePostsTab==='reposts')render();
 }catch(e){
  ids.forEach(id=>patiRepostMissingAttempted.delete(viewer+':'+id));
  console.warn('Yeniden paylaşılan gönderiler yüklenemedi:',e.message);
 }finally{patiRepostSourcesBusy.delete(ownerId)}
}
function patiRepostedPosts(owner){
 return data.reposts.filter(r=>r.user_id===owner).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
 .map(r=>data.posts.find(p=>p.id===r.post_id&&!blocked.has(p.author_id))).filter(Boolean);
}
const PATI_REPOST_ICON='<svg class="pati-repost-symbol" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9V7.5A3.5 3.5 0 0 1 7 4h12l-3-3"/><path d="m19 4-3 3"/><path d="M20.5 15v1.5A3.5 3.5 0 0 1 17 20H5l3 3"/><path d="m5 20 3-3"/></svg>';
async function patiToggleRepost(postId){
 const post=patiFindSocialPost(postId);
 if(!me||!post||blocked.has(post.author_id))throw Error('Bu gönderi yeniden paylaşılamıyor.');
 const owner=me.id,already=patiOwnRepost(postId);
 const result=already?await sb.from('patiyiz_reposts').delete().eq('user_id',owner).eq('post_id',postId).select('post_id'):
 await sb.from('patiyiz_reposts').insert({user_id:owner,post_id:postId}).select('*');
 if(result.error)throw result.error;
 if(!result.data?.length)throw Error('Yeniden paylaşım kaydedilemedi.');
 if(me?.id!==owner)return;
 if(!data.posts.some(p=>p.id===post.id))data.posts.push(post);
 data.reposts=already?data.reposts.filter(r=>!(r.user_id===owner&&r.post_id===postId)):
 [...data.reposts.filter(r=>!(r.user_id===owner&&r.post_id===postId)),result.data[0]];
 closeModal(true);
 if(view==='reels')document.querySelectorAll('[data-action="pati-repost"][data-id="'+postId+'"]').forEach(button=>{
  button.classList.toggle('active',!already);
  button.setAttribute('aria-pressed',String(!already));
  button.setAttribute('aria-label',already?'Yeniden paylaş':'Yeniden paylaşımı kaldır');
 });
 else render();
 if(typeof patiEngagementCounts!=='undefined'&&typeof patiScheduleEngagement==='function'){patiEngagementCounts.delete(postId);patiScheduleEngagement();}
 notify(already?'Yeniden paylaşım kaldırıldı.':'Gönderi yeniden paylaşıldı.');
}
async function patiTogglePin(postId){
 const post=patiFindSocialPost(postId);
 if(!me||!post||post.author_id!==me.id)throw Error('Yalnızca kendi gönderini sabitleyebilirsin.');
 const owner=me.id;
 const current=await sb.from('patiyiz_post_pins').select('*').eq('owner_id',owner);
 if(current.error)throw current.error;
 if(me?.id!==owner)return;
 const already=(current.data||[]).some(x=>x.post_id===postId);
 if(!already&&(current.data||[]).length>=3)throw Error('Profilinde en fazla 3 gönderi sabitleyebilirsin.');
 data.pins=[...data.pins.filter(x=>x.owner_id!==owner),...(current.data||[])];
 const result=already?await sb.from('patiyiz_post_pins').delete().eq('owner_id',owner).eq('post_id',postId).select('post_id'):
 await sb.from('patiyiz_post_pins').insert({owner_id:owner,post_id:postId}).select('*');
 if(result.error)throw result.error;
 if(!result.data?.length)throw Error('Sabitleme kaydedilemedi.');
 if(me?.id!==owner)return;
 const verified=await sb.from('patiyiz_post_pins').select('*').eq('owner_id',owner);
 if(verified.error)throw verified.error;
 data.pins=[...data.pins.filter(x=>x.owner_id!==owner),...(verified.data||[])];
 closeModal(true);render();notify(already?'Gönderinin sabiti kaldırıldı.':'Gönderi profilinde sabitlendi.');
}

/* Real, paginated like viewers: the post count stays separate from the heart toggle. */
let patiPostLikersState={postId:'',owner:'',rows:[],next:0,hasMore:false,loading:false};
function patiRenderPostLikers(){
 const state=patiPostLikersState;
 if(!state.postId||!me||state.owner!==me.id)return;
 const list=document.getElementById('pati-post-likers-list');
 if(!list)return;
 const visible=state.rows.filter(id=>!blocked.has(id)&&data.profiles.some(p=>p.id===id));
 list.innerHTML=visible.map(id=>{
  const person=profile(id);
  return '<button type="button" class="pati-post-liker-person" data-action="view-user" data-id="'+esc(id)+'" aria-label="'+esc(person.display_name||person.handle||'Kullanıcı')+' profiline git">'+avatar(person,'s')+
   '<span class="pati-post-liker-identity"><strong>'+displayName(person)+'</strong><small>@'+esc(person.handle||'patiyiz')+'</small></span>'+
   ico('chevron-right')+'</button>';
 }).join('')||(!state.loading?'<p class="pati-post-likers-empty">Henüz beğenen kimse yok.</p>':'');
 const more=document.getElementById('pati-post-likers-more');
 if(more){more.hidden=!state.hasMore;more.disabled=state.loading;more.textContent=state.loading?'Yükleniyor…':'Daha fazla göster';}
 const status=document.getElementById('pati-post-likers-status');
 if(status)status.textContent=state.loading?'Beğenenler yükleniyor…':visible.length+' kişi gösteriliyor';
}
async function patiLoadPostLikers(){
 const state=patiPostLikersState;
 if(!state.postId||state.loading||!state.hasMore||!me||!sb)return;
 state.loading=true;
 const uid=me.id,postId=state.postId,offset=state.next;
 patiRenderPostLikers();
 try{
  const limit=40;
  const res=await sb.from('post_likes').select('user_id,created_at')
   .eq('post_id',postId).order('created_at',{ascending:false}).range(offset,offset+limit-1);
  if(res.error)throw res.error;
  if(me?.id!==uid||patiPostLikersState!==state)return;
  const page=res.data||[];
  const missing=[...new Set(page.map(x=>x.user_id).filter(id=>id&&!data.profiles.some(p=>p.id===id)&&!blocked.has(id)))];
  if(missing.length){
   const found=await sb.from('profiles').select('id,display_name,handle,avatar_url,is_verified,is_private').in('id',missing);
   if(found.error)throw found.error;
   if(me?.id!==uid||patiPostLikersState!==state)return;
   const known=new Set(data.profiles.map(p=>p.id));
   for(const person of found.data||[])if(!known.has(person.id)){data.profiles.push(person);known.add(person.id)}
  }
  const included=new Set(state.rows);
  for(const row of page)if(row.user_id&&!included.has(row.user_id)){state.rows.push(row.user_id);included.add(row.user_id)}
  state.next+=page.length;
  state.hasMore=page.length===limit;
 }catch(error){
  console.warn('Beğenenler listesi:',error?.message||error);
  const status=document.getElementById('pati-post-likers-status');
  if(status)status.textContent='Liste yüklenemedi. Tekrar deneyebilirsin.';
 }finally{
  state.loading=false;
  if(me?.id===uid&&patiPostLikersState===state)patiRenderPostLikers();
 }
}
function patiOpenPostLikers(postId){
 if(!me||!postId||!sb)return;
 const post=patiFindSocialPost(postId)||data.posts.find(p=>p.id===postId);
 if(!post||blocked.has(post.author_id)){notify('Bu gönderinin beğenileri görüntülenemiyor.');return}
 if(document.getElementById('comment-form'))closeModal(true);
 patiPostLikersState={postId,owner:me.id,rows:[],next:0,hasMore:true,loading:false};
 modal('Beğenenler','<div id="pati-post-likers-status" class="pati-post-likers-status" role="status">Beğenenler yükleniyor…</div>'+
  '<div id="pati-post-likers-list" class="pati-post-likers-list" role="list" aria-label="Gönderiyi beğenen kullanıcılar"></div>'+
  '<button type="button" id="pati-post-likers-more" class="pati-post-likers-more" data-action="post-likers-more" hidden>Daha fazla göster</button>',
  'pati-post-likers-form');
 const form=document.getElementById('pati-post-likers-form');
 form?.closest('.modal')?.classList.add('pati-post-likers-modal');
 form?.closest('.modal-backdrop')?.classList.add('pati-post-likers-backdrop');
 form?.closest('.modal')?.querySelector('.close-modal')?.setAttribute('aria-label','Beğenenler listesini kapat');
 void patiLoadPostLikers();
}
const patiEngagementCounts=new Map();
let patiEngagementTimer=null,patiEngagementLoading=false,patiEngagementFailedUntil=0,patiEngagementRetryTimer=null,patiEngagementRetryDelay=4000,patiEngagementOwner='';
function patiSocialMetric(id,kind,label){
 const row=patiEngagementCounts.get(id);
 const value=row&&Number.isFinite(row[kind])?row[kind].toLocaleString('tr-TR'):'—';
 return '<span class="pati-engagement-metric" data-pati-metric="'+kind+'" data-post-id="'+esc(id)+'">'+value+(label?' '+label:'')+'</span>';
}
function patiPaintEngagement(){
 document.querySelectorAll('[data-pati-metric][data-post-id]').forEach(el=>{
  const value=patiEngagementCounts.get(el.dataset.postId)?.[el.dataset.patiMetric];
  if(!Number.isFinite(value))return;
  const label=el.dataset.patiMetric==='sent'?' kişi gönderdi':el.dataset.patiMetric==='saved'?' kişi kaydetti':' yeniden paylaştı';
  el.textContent=value.toLocaleString('tr-TR')+(el.closest('.pati-engagement-stats')?label:'');
  el.setAttribute('aria-label',value.toLocaleString('tr-TR')+label);
 });
}
function patiScheduleEngagement(){
 if(patiEngagementTimer)clearTimeout(patiEngagementTimer);
 patiEngagementTimer=setTimeout(()=>{patiEngagementTimer=null;void patiRefreshEngagement();},160);
}
async function patiRefreshEngagement(){
 if(!me||!sb||patiEngagementLoading||Date.now()<patiEngagementFailedUntil)return;
 if(patiEngagementOwner!==me.id){patiEngagementOwner=me.id;patiEngagementCounts.clear()}
 const owner=me.id,ids=[...new Set([...document.querySelectorAll('[data-pati-metric][data-post-id]')].map(el=>el.dataset.postId))];
 const now=Date.now(),batch=ids.filter(id=>{const row=patiEngagementCounts.get(id);return !row||now-row.updatedAt>90000}).slice(0,40);
 if(!batch.length){patiPaintEngagement();return;}
 patiEngagementLoading=true;
 try{
  const result=await sb.rpc('patiyiz_post_engagement_counts',{p_post_ids:batch});
  if(result.error)throw result.error;
  if(me?.id!==owner)return;
  const rows=new Map((result.data||[]).map(row=>[row.post_id,row]));
  for(const id of batch){const row=rows.get(id);if(!row)continue;
   patiEngagementCounts.set(id,{sent:Number(row.sent_count)||0,saved:Number(row.saved_count)||0,repost:Number(row.repost_count)||0,updatedAt:Date.now()});
  }
  patiPaintEngagement();
  patiEngagementFailedUntil=0;patiEngagementRetryDelay=4000;
  if(patiEngagementRetryTimer){clearTimeout(patiEngagementRetryTimer);patiEngagementRetryTimer=null}
 }catch(error){
  const delay=patiEngagementRetryDelay;
  patiEngagementFailedUntil=Date.now()+delay;
  patiEngagementRetryDelay=Math.min(20000,delay*2);
  console.warn('Paylaşım istatistikleri alınamadı:',error?.message||error);
  if(!patiEngagementRetryTimer)patiEngagementRetryTimer=setTimeout(()=>{
   patiEngagementRetryTimer=null;
   if(me?.id===owner&&document.querySelector('[data-pati-metric]'))patiScheduleEngagement();
  },delay+150);
 }finally{patiEngagementLoading=false;}
 if(ids.length>batch.length)patiScheduleEngagement();
}
function postCard(p,priority=false){
 const indexed=typeof patiPostRenderStats!=='undefined'&&patiPostRenderStats;
 const collaborator=typeof patiCollabAccepted==='function'?patiCollabAccepted(p.id):null;
 const own=p.author_id===me.id,commentCount=indexed?(indexed.get(p.id)?.comments||0):data.comments.filter(x=>x.post_id===p.id&&!blocked.has(x.author_id)).length,count=indexed?(indexed.get(p.id)?.likes||0):data.likes.filter(x=>x.post_id===p.id).length,pet=data.pets.find(x=>x.id===p.pet_id);
 const images=(p.images?.length?p.images:[p.image_url]).filter(Boolean),hasMedia=!!(images.length||p.video_url||p.media_videos?.length),isPriority=priority===true,body=String(p.body||'').trim();
 const multiVideos=Array.isArray(p.media_videos)?[...new Set(p.media_videos.filter(Boolean))]:[];
 const defaultVideo=p.video_url||multiVideos[0]||'';
 const isFeedReel=p.post_format==='reels'&&!!defaultVideo;
 const feedAudible=(typeof patiyizFeedSoundEnabled==='boolean'&&patiyizFeedSoundEnabled);
 const defaultMedia=defaultVideo?'<div class="pati-video-frame"><video class="pati-post-video'+(p.selfie_mirrored?' pati-selfie-mirrored':'')+'" playsinline webkit-playsinline'+(feedAudible?'':' muted')+' loop preload="none"'+(p.video_cover_url?' poster="'+esc(p.video_cover_url)+'"':'')+' data-pati-video-src="'+esc(defaultVideo)+'" aria-label="Paylaşım videosu"></video>'+(isFeedReel?'<button type="button" class="pati-feed-reel-open" data-action="pati-feed-open-reel" data-id="'+esc(p.id)+'" aria-label="Reels videosunu tam ekranda aç"><span class="pati-feed-reel-open-hit" aria-hidden="true"></span></button>':'')+'<button type="button" class="pati-video-sound" data-action="video-sound" aria-label="'+(feedAudible?'Sesi kapat':'Sesi aç')+'" aria-pressed="'+feedAudible+'">'+ico(feedAudible?'volume':'volume-x')+'</button></div>':
 images.length?'<div class="pati-carousel" data-post-id="'+esc(p.id)+'"><div class="pati-carousel-track">'+images.map((url,i)=>'<div class="pati-carousel-slide pati-doubletap-photo" data-post-id="'+esc(p.id)+'">'+photo(url,'🐾',isPriority&&i===0)+'<span class="pati-heart-burst" aria-hidden="true">♥</span></div>').join('')+'</div>'+(images.length>1?'<span class="pati-carousel-count">1 / '+images.length+'</span><button type="button" data-action="carousel-prev" class="pati-carousel-arrow prev" aria-label="Önceki fotoğraf">‹</button><button type="button" data-action="carousel-next" class="pati-carousel-arrow next" aria-label="Sonraki fotoğraf">›</button>':'')+'</div>':'';

 
 const media=multiVideos.length>1?'<div class="pati-carousel pati-video-carousel" data-post-id="'+esc(p.id)+'"><div class="pati-carousel-track">'+
 multiVideos.map((url,i)=>'<div class="pati-carousel-slide pati-video-slide" data-post-id="'+esc(p.id)+'"><div class="pati-video-frame"><video class="pati-post-video" playsinline webkit-playsinline muted loop preload="none"'+(i===0&&p.video_cover_url?' poster="'+esc(p.video_cover_url)+'"':'')+' data-pati-video-src="'+esc(url)+'" aria-label="Video '+(i+1)+' / '+multiVideos.length+'"></video><button type="button" class="pati-video-sound" data-action="video-sound" aria-label="Sesi aç">'+ico('volume-x')+'</button></div></div>').join('')+
 '</div><span class="pati-carousel-count">1 / '+multiVideos.length+'</span><button type="button" data-action="carousel-prev" class="pati-carousel-arrow prev" aria-label="Önceki video">‹</button><button type="button" data-action="carousel-next" class="pati-carousel-arrow next" aria-label="Sonraki video">›</button></div>':defaultMedia;
 const controls='<div class="pati-actionbar pati-social-actions"><button type="button" data-action="like" aria-label="Beğen" aria-pressed="'+liked.has(p.id)+'" data-id="'+esc(p.id)+'" class="'+(liked.has(p.id)?'active':'')+'">'+ico('heart')+' <span>'+count+'</span></button><button type="button" data-action="comment" aria-label="Yorum yap" data-id="'+esc(p.id)+'">'+ico('message-circle')+' <span>'+commentCount+'</span></button>'+('<button type="button" class="pati-repost-btn '+((typeof patiOwnRepost==='function'&&patiOwnRepost(p.id))?'active':'')+'" data-action="pati-repost" data-id="'+esc(p.id)+'" aria-pressed="'+(typeof patiOwnRepost==='function'&&patiOwnRepost(p.id))+'" aria-label="'+((typeof patiOwnRepost==='function'&&patiOwnRepost(p.id))?'Yeniden paylaşımı kaldır':'Yeniden paylaş')+'">'+(typeof PATI_REPOST_ICON==='string'?PATI_REPOST_ICON:'↻')+(typeof patiSocialMetric==='function'?patiSocialMetric(p.id,'repost',''):'')+'</button>')+'<button type="button" data-action="share-post" aria-label="Paylaş" data-id="'+esc(p.id)+'">'+ico('send')+(typeof patiSocialMetric==='function'?patiSocialMetric(p.id,'sent',''):'')+'</button>'+'<button type="button" data-action="save" aria-label="Kaydet" aria-pressed="'+saved.has(p.id)+'" data-id="'+esc(p.id)+'" class="pati-save-action '+(saved.has(p.id)?'active':'')+'">'+ico('bookmark')+(typeof patiSocialMetric==='function'?patiSocialMetric(p.id,'saved',''):'')+'</button></div>';
 const sourcePost=p.source_post_id?data.posts.find(x=>x.id===p.source_post_id):null;
 const sourceCredit=sourcePost?'<button type="button" class="pati-source-credit" data-action="profile-open-post" data-id="'+esc(sourcePost.id)+'">↪ @'+esc(profile(sourcePost.author_id).handle||'patiyiz')+' paylaşımına tepki · Orijinal gönderiyi aç</button>':'';
 const caption=body?'<p class="pati-post-caption">'+(hasMedia?'<strong>'+displayName(profile(p.author_id))+'</strong> ':'')+formatPatiPostBody(body)+'</p>':'';
 return '<article class="pati-card pati-feed-card '+(isFeedReel?'pati-feed-reel-card ':'')+(hasMedia?'pati-feed-has-media':'pati-feed-text-only')+'" data-post-id="'+esc(p.id)+'"><div class="pati-feed-card-header">'+(collaborator&&typeof patiCollabHeader==='function'?patiCollabHeader(p,collaborator):userRow(p.author_id,''))+'<button type="button" class="pati-post-more" data-action="post-menu" data-id="'+esc(p.id)+'" aria-label="Gönderi seçenekleri">⋯</button></div>'+
 sourceCredit+
 (pet?'<p class="pati-feed-pet">'+petIcon(pet.species)+' '+esc(pet.name)+' · '+esc(pet.species)+'</p>':'')+
 (hasMedia?media:'<div class="pati-feed-text-content">'+(caption||'<p class="pati-post-caption">🐾</p>')+'</div>')+
 controls+'<div class="pati-post-details"><button type="button" class="pati-post-like-summary" data-action="post-likers" data-id="'+esc(p.id)+'" aria-label="'+count+' beğeni, beğenenleri gör">'+count+' beğeni</button>'+(hasMedia?caption:'')+'<time class="pati-post-time">'+esc(day(p.created_at))+'</time></div></article>';
}
function patiDetailCandidates(source){
 if(source==='saved-posts')return window.PatiyizSavedV2?.visiblePosts()||[];
 if(source==='profile'){
  const author=profileId||me.id;
  if(profilePostsTab==='reposts')return patiRepostedPosts(author);
   const sorted=(typeof patiCollabPartnerPosts==='function'?patiCollabPartnerPosts(author):data.posts.filter(p=>p.author_id===author)).filter(p=>!blocked.has(p.author_id))
   .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
  return sorted.filter(p=>profilePostsTab==='reels'?p.post_format==='reels'&&(!!p.video_url||!!p.media_videos?.length):profilePostsTab==='text'?!(p.image_url||p.images?.length||p.video_url||p.media_videos?.length):profilePostsTab==='videos'?p.post_format!=='reels'&&!!(p.video_url||p.media_videos?.length):(!!(p.image_url||p.images?.length||p.video_url||p.media_videos?.length)&&p.post_format!=='reels'));
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
 const options=(origin==='profile'||origin==='explore'||origin==='saved-posts')?patiDetailCandidates(origin):[];
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
/* Story rings track unseen ACTIVE story IDs, never story deletion.
   Own previews are local; other users' story receipts are also synced using viewer-only RLS. */
let patiStorySeenState={owner:'',seen:new Set(),requested:new Set(),loading:false};
function patiStorySeenInit(){
 const owner=me?.id||'';
 if(patiStorySeenState.owner===owner)return;
 const seen=new Set();
 if(owner)try{
  const raw=JSON.parse(localStorage.getItem('patiyiz-story-seen:'+owner)||'[]');
  if(Array.isArray(raw))for(const id of raw.slice(-300))if(typeof id==='string')seen.add(id);
 }catch(_){}
 patiStorySeenState={owner,seen,requested:new Set(),loading:false};
}
function patiStorySeenSave(){
 if(!me?.id)return;
 const active=new Set(data.stories.filter(s=>new Date(s.expires_at).getTime()>Date.now()).map(s=>s.id));
 patiStorySeenState.seen=new Set([...patiStorySeenState.seen].filter(id=>active.has(id)));
 try{localStorage.setItem('patiyiz-story-seen:'+me.id,JSON.stringify([...patiStorySeenState.seen].slice(-300)))}catch(_){}
}
function patiStorySeen(x){
 if(!x?.id||!x?.author_id||x.pati_pet_highlight)return false;
 patiStorySeenInit();
 const unseen=!patiStorySeenState.seen.has(x.id);
 if(unseen){patiStorySeenState.seen.add(x.id);patiStorySeenSave();}
 return unseen;
}
function patiStoryIsSeen(x){patiStorySeenInit();return !!x&&patiStorySeenState.seen.has(x.id)}
function patiActiveStoriesOf(author){
 const now=Date.now();
 return data.stories.filter(s=>s.author_id===author&&!s.pati_pet_highlight&&!blocked.has(s.author_id)&&new Date(s.expires_at).getTime()>now);
}
function patiHasUnseenStory(author){return patiActiveStoriesOf(author).some(x=>!patiStoryIsSeen(x))}
async function patiStorySeenSync(){
 if(!me?.id||!sb)return;
 patiStorySeenInit();
 const state=patiStorySeenState,owner=me.id;
 const ids=data.stories.filter(s=>s.author_id!==owner&&!s.pati_pet_highlight&&new Date(s.expires_at).getTime()>Date.now()).map(s=>s.id);
 const pending=ids.filter(id=>!state.requested.has(id));
 if(!pending.length||state.loading)return;
 state.loading=true;
 const batch=pending.slice(0,90);
 try{
  const out=await sb.from('patiyiz_story_views').select('story_id').eq('viewer_id',owner).in('story_id',batch);
  if(out.error)throw out.error;
  if(me?.id!==owner||patiStorySeenState!==state)return;
  batch.forEach(id=>state.requested.add(id));
  for(const row of out.data||[])state.seen.add(row.story_id);
  patiStorySeenSave();
  if(view==='home'&&!document.getElementById('story-overlay'))render();
  if(view==='profile'&&!document.getElementById('story-overlay'))render();
 }catch(e){console.warn('Hikâye izlendi durumu eşitlenemedi:',e?.message||e)}
 finally{
  if(patiStorySeenState===state){state.loading=false;
   if(pending.length>batch.length)queueMicrotask(()=>{if(me?.id===owner)void patiStorySeenSync()});
  }
 }
}

function patiPauseStoryBackgroundMedia(){
 document.querySelectorAll('video,audio').forEach(media=>{if(!media.closest('#story-overlay')){try{media.pause()}catch(_){}}});
 if(patiyizFeedActiveVideo){patiyizFeedActiveVideo.pause();patiyizFeedActiveVideo=null}
}
/* Hikâye Hareketleri: server-recorded last view in the viewer's local clock.
   The Postgres record_story_view RPC updates last_viewed_at on every repeat visit. */
let patiStoryActivityRefreshTimer=null,patiStoryActivityPending=false,patiStoryActivityGeneration=0;
function patiStopStoryActivityRefresh(){
 if(patiStoryActivityRefreshTimer)clearInterval(patiStoryActivityRefreshTimer);
 patiStoryActivityRefreshTimer=null;
 patiStoryActivityGeneration++;
}
function patiStoryLastViewedLabel(value,now=Date.now()){
 const date=new Date(value),today=new Date(now);
 if(!Number.isFinite(date.getTime()))return 'Saat bilgisi yok';
 const time=new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
 if(date.getFullYear()===today.getFullYear()&&date.getMonth()===today.getMonth()&&date.getDate()===today.getDate())return time;
 const when=new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:date.getFullYear()===today.getFullYear()?undefined:'numeric'}).format(date);
 return when+' · '+time;
}
function closeStory(resume=true){
 patiStopStoryActivityRefresh();
 clearTimeout(storyTimer);storyTimer=null;storyItems=[];
 document.getElementById('story-overlay')?.remove();document.body.classList.remove('story-fullscreen-open');
 if(!resume)return;
 if(view==='profile'||view==='home')render();else{setupFeedVideos();setupReelsViewer()}
}
async function recordStoryView(x){if(!me||x.pati_pet_highlight||x.author_id===me.id)return;try{const r=await sb.rpc('patiyiz_record_story_view',{p_story_id:x.id});if(r.error)console.warn('Hikâye görüntülemesi kaydedilemedi:',r.error.message)}catch(err){console.warn('Hikâye görüntüleme ağ hatası:',err)}}

/* Owner-only preview, refreshed whenever own story opens. RLS protects viewer IDs.
   A verified zero is shown as text rather than fake profile placeholders. */
let patiStoryPreviewToken=0;
const patiStoryPreviewCache=new Map();
let patiyizStorySoundEnabled=true; // Only changes when the viewer taps the story sound control.
function patiStoryPreviewRender(storyId){
 const story=storyItems[storyIndex],root=document.getElementById('story-overlay');
 if(!root||story?.id!==storyId)return;
 const target=root.querySelector('.pati-story-viewer-preview');
 if(!target)return;
 const result=patiStoryPreviewCache.get(storyId);
 const stack=target.querySelector('.pati-story-viewer-preview-stack');
 const state=target.querySelector('.pati-story-viewer-preview-status');
 if(!stack||!state)return;
 if(!result){stack.innerHTML='';state.textContent='Görüntüleyenler yükleniyor…';return}
 if(result.error){stack.innerHTML='';state.textContent='Hareketleri aç';return}
 if(result.total===0){
  stack.innerHTML='<span class="pati-story-viewer-empty-paw" aria-hidden="true">🐾</span>';
  state.textContent='Henüz görüntüleyen yok';
  target.setAttribute('aria-label','Hikâye hareketleri: Henüz görüntüleyen yok');return;
 }
 stack.innerHTML=result.people.slice(0,3).map(person=>'<span class="pati-story-preview-avatar">'+avatar(profile(person.id),'s')+'</span>').join('');
 state.textContent=result.total+' kişi görüntüledi';
 target.setAttribute('aria-label','Hikâye hareketleri: '+result.total+' kişi görüntüledi');
}
async function patiStoryPreviewLoad(storyId){
 if(!me?.id||!storyId||storyItems[storyIndex]?.id!==storyId||!document.querySelector('#story-overlay .pati-story-viewer-preview-status'))return;
 const token=++patiStoryPreviewToken,owner=me.id;
 const apply=()=>token===patiStoryPreviewToken&&storyItems[storyIndex]?.id===storyId&&me?.id===owner;
 try{
  const result=await sb.from('patiyiz_story_views').select('viewer_id,last_viewed_at',{count:'exact'})
   .eq('story_id',storyId).order('last_viewed_at',{ascending:false}).limit(3);
  if(!apply())return;
  if(result.error)throw result.error;
  const ids=(result.data||[]).map(r=>r.viewer_id).filter(Boolean);
  const missing=ids.filter(id=>!data.profiles.some(p=>p.id===id));
  if(missing.length){
   const profiles=await sb.from('profiles').select('id,display_name,handle,avatar_url,is_verified').in('id',missing);
   if(!apply())return;
   if(!profiles.error){
    const known=new Set(data.profiles.map(p=>p.id));
    for(const p of profiles.data||[])if(!known.has(p.id)){data.profiles.push(p);known.add(p.id)}
   }
  }
  if(!apply())return;
  patiStoryPreviewCache.set(storyId,{total:result.count??ids.length,people:ids.map(id=>({id}))});
  patiStoryPreviewRender(storyId);
 }catch(error){
  if(!apply())return;
  patiStoryPreviewCache.set(storyId,{error:true,total:0,people:[]});
  patiStoryPreviewRender(storyId);
  console.warn('Hikâye hareketleri önizlemesi yüklenemedi:',error?.message||error);
 }
}

async function showStoryViewers(options={}){
 const silent=options.silent===true;
 const x=storyItems[storyIndex],owner=me?.id;
 if(!x||x.author_id!==owner)return;
 const sheet=document.getElementById('story-viewers-sheet');
 if(!sheet||silent&&(sheet.hidden||document.hidden||patiStoryActivityPending))return;
 if(!silent){
  patiStopStoryActivityRefresh();
  clearTimeout(storyTimer);
  document.getElementById('story-overlay')?.classList.add('pati-story-viewers-open');
  document.querySelector('#story-overlay .story-big-video')?.pause();
  sheet.hidden=false;
  sheet.setAttribute('role','region');
  sheet.setAttribute('aria-label','Hikâye hareketleri');
  sheet.innerHTML='<div class="pati-story-activity-top"><button type="button" data-action="story-viewers-close" aria-label="Hikâyeye dön">←</button><strong>Hikâye hareketleri</strong><span></span></div><p class="pati-story-activity-loading" role="status">Görüntüleyenler yükleniyor…</p>';
 }
 const generation=patiStoryActivityGeneration;
 const active=()=>generation===patiStoryActivityGeneration&&sheet.isConnected&&!sheet.hidden&&me?.id===owner&&storyItems[storyIndex]?.id===x.id;
 patiStoryActivityPending=true;
 try{
  const [vr,lr]=await Promise.all([
   sb.from('patiyiz_story_views').select('viewer_id,last_viewed_at').eq('story_id',x.id).order('last_viewed_at',{ascending:false}),
   sb.from('patiyiz_story_likes').select('user_id').eq('story_id',x.id)
  ]);
  if(!active())return;
  if(vr.error){
   if(silent){console.warn('Hikâye görüntüleyenleri yenilenemedi:',vr.error.message);return}
   sheet.innerHTML='<div class="pati-story-activity-top"><button type="button" data-action="story-viewers-close" aria-label="Hikâyeye dön">←</button><strong>Hikâye hareketleri</strong><span></span></div><p class="pati-story-activity-empty">Görüntüleyenler yüklenemedi. Hikâyeye dönerek tekrar deneyebilirsin.</p>';
   return;
  }
  if(lr.error)console.warn('Hikâye beğenileri yüklenemedi:',lr.error.message);
  const viewers=vr.data||[],liked=new Set((lr.data||[]).map(v=>v.user_id));
  patiStoryPreviewCache.set(x.id,{total:viewers.length,people:viewers.slice(0,3).map(v=>({id:v.viewer_id}))});
  const signature=JSON.stringify([viewers.map(v=>[v.viewer_id,v.last_viewed_at]),[...liked].sort()]);
  if(silent&&sheet.dataset.patiStorySignature===signature)return;
  const missing=[...new Set(viewers.map(v=>v.viewer_id).filter(id=>id&&!data.profiles.some(p=>p.id===id)))];
  if(missing.length){
   const results=await Promise.all(Array.from({length:Math.ceil(missing.length/70)},(_,i)=>
    sb.from('profiles').select('id,display_name,handle,avatar_url,is_verified').in('id',missing.slice(i*70,(i+1)*70))
   ));
   if(!active())return;
   const known=new Set(data.profiles.map(p=>p.id));
   for(const result of results)if(!result.error)for(const person of result.data||[])if(!known.has(person.id)){
    data.profiles.push(person);known.add(person.id);
   }
  }
  patiStoryPreviewRender(x.id);
  const oldScroll=silent?sheet.querySelector('.pati-story-activity-list')?.scrollTop||0:0;
  const focusId=silent&&sheet.contains(document.activeElement)?document.activeElement?.getAttribute('data-id'):null;
  const focusAction=silent&&focusId?document.activeElement?.getAttribute('data-action'):null;
  const rows=viewers.map(v=>{
   const p=profile(v.viewer_id),isLiked=liked.has(v.viewer_id),name=displayName(p);
   const lastSeen=patiStoryLastViewedLabel(v.last_viewed_at);
   return '<div class="pati-story-activity-person">'+
    '<button type="button" class="story-view-user" data-action="story-viewer-profile" data-id="'+esc(v.viewer_id)+'" aria-label="'+esc(p.display_name||'Patiyiz üyesi')+' profilini aç">'+
    '<span class="pati-story-activity-avatar">'+avatar(p,'s')+(isLiked?'<span class="pati-story-view-like" title="Hikâyeni beğendi" aria-label="Beğendi">♥</span>':'')+'</span>'+
    '<span class="pati-story-view-person"><strong>'+name+'</strong><small>@'+esc(p.handle||'patiyiz')+'</small><small class="pati-story-view-last">Son görülme: <time datetime="'+esc(v.last_viewed_at||'')+'">'+esc(lastSeen)+'</time></small></span></button>'+
    (v.viewer_id!==owner&&!blocked.has(v.viewer_id)?'<button type="button" class="pati-story-activity-message" data-action="story-viewer-chat" data-id="'+esc(v.viewer_id)+'" aria-label="'+esc(p.display_name||'Kullanıcı')+' kişisine mesaj gönder">'+ico('send')+'</button>':'')+
    '</div>';
  }).join('');
  const preview=x.video_url?'<video class="pati-story-activity-video-frame" src="'+esc(x.video_url)+'#t=0.2" muted autoplay playsinline webkit-playsinline preload="metadata"'+(x.image_url?' poster="'+esc(x.image_url)+'"':'')+' aria-label="Video hikâyesinden kare"></video>':x.image_url?'<img src="'+esc(x.image_url)+'" alt="Hikâye önizlemesi">':'<span aria-hidden="true">🐾</span>';
  sheet.innerHTML='<div class="pati-story-activity-top"><button type="button" data-action="story-viewers-close" aria-label="Hikâyeye dön">←</button><strong>Hikâye hareketleri</strong><span></span></div>'+
   '<div class="pati-story-activity-preview"><div class="pati-story-activity-cover">'+preview+'</div><div class="pati-story-activity-hero-meta"><span>'+ico('users')+' '+viewers.length+' görüntüleme</span><span class="pati-story-activity-heart">♥ '+liked.size+' beğeni</span></div></div>'+
   '<div class="pati-story-activity-section"><strong>Bu hikâyeyi görüntüleyen kişiler</strong><span>'+viewers.length+'</span></div>'+
   '<div class="pati-story-activity-list">'+(rows||'<p class="pati-story-activity-empty">Henüz görüntüleyen yok.</p>')+'</div>';
  const activityFrame=sheet.querySelector('.pati-story-activity-video-frame');
  if(activityFrame){
   const settle=()=>{try{activityFrame.pause()}catch(_){}};
   activityFrame.addEventListener('loadeddata',settle,{once:true});
   activityFrame.addEventListener('seeked',settle,{once:true});
   activityFrame.addEventListener('error',()=>{activityFrame.closest('.pati-story-activity-cover')?.classList.add('pati-story-preview-unavailable')},{once:true});
  }
  sheet.dataset.patiStorySignature=signature;
  if(silent){
   const list=sheet.querySelector('.pati-story-activity-list');
   if(list)list.scrollTop=oldScroll;
   if(focusId&&focusAction){
    const button=[...sheet.querySelectorAll('[data-action]')].find(el=>el.dataset.id===focusId&&el.dataset.action===focusAction);
    button?.focus({preventScroll:true});
   }
  }
 }catch(err){
  console.warn('Hikâye hareketleri yüklenemedi:',err);
  if(!silent&&active())sheet.innerHTML='<div class="pati-story-activity-top"><button type="button" data-action="story-viewers-close" aria-label="Hikâyeye dön">←</button><strong>Hikâye hareketleri</strong><span></span></div><p class="pati-story-activity-empty">Görüntüleme saatleri alınamadı. Daha sonra tekrar deneyebilirsin.</p>';
 }finally{
  patiStoryActivityPending=false;
  // Only refresh while the owner keeps the activity sheet visible; no hidden polling.
  if(!silent&&active()&&!patiStoryActivityRefreshTimer){
   patiStoryActivityRefreshTimer=setInterval(()=>{if(!document.hidden)void showStoryViewers({silent:true})},20000);
  }
 }
}

/* Share an existing public post to a story without uploading/copying someone
   else's media. Original author is attributed and the source remains linked. */
async function patiSharePostToStory(postId){
 if(!me)throw Error('Önce giriş yap.');
 const post=patiFindSocialPost(postId);
 if(!post||blocked.has(post.author_id))throw Error('Bu gönderi artık görüntülenemiyor.');
 const image=post.images?.[0]||post.image_url||post.video_cover_url||'';
 if(!image&&!post.video_url&&!String(post.body||'').trim())throw Error('Hikâyede paylaşılabilecek içerik bulunamadı.');
 const owner=me.id,original=profile(post.author_id);
 // A follower may view a private post, but must not republish it in a
 // story accessible to a different audience. Always check the source owner.
 if(post.author_id!==owner){
  const privacy=await sb.from('profiles').select('id,is_private').eq('id',post.author_id).maybeSingle();
  if(privacy.error)throw privacy.error;
  if(!privacy.data||privacy.data.is_private)throw Error('Gizli hesaplardaki paylaşımlar başka hikâyelerde yayınlanamaz.');
 }
 const record={author_id:owner,image_url:'',video_url:null,
  caption:'@'+(original.handle||'patiyiz')+' kullanıcısının gönderisi',shared_post_id:post.id};
 const result=await sb.from('patiyiz_stories').insert(record).select('*').single();
 if(result.error)throw result.error;
 if(me?.id!==owner)return;
 if(!data.posts.some(p=>p.id===post.id))data.posts.push(post);
 data.stories.unshift(result.data);closeModal(true);render();
 notify('Gönderi hikâyene eklendi.');
}
async function patiOpenSharedStoryPost(postId){
 if(!me||!postId)return;
 let post=data.posts.find(x=>x.id===postId);
 if(!post){
  const result=await sb.from('posts').select('*').eq('id',postId).maybeSingle();
  if(result.error)throw result.error;
  post=result.data;
  if(post){post=globalThis.PatiyizPrivateMedia?(await globalThis.PatiyizPrivateMedia.hydrateRows([post],me.id,sb))[0]:post;data.posts.push(post)}
 }
 if(!post||blocked.has(post.author_id))throw Error('Bu gönderi artık mevcut değil.');
 closeStory(false);openPost(postId);
}

/* Load the original source for viewers who did not scroll past it in the
   feed. Supabase RLS remains the authority: inaccessible posts are not shown. */
const patiStoryShareLoads=new Map();
async function patiHydrateStorySharedPost(story){
 const postId=story?.shared_post_id;
 if(!postId||!me||!sb||patiFindSocialPost(postId))return;
 if(patiStoryShareLoads.has(postId))return patiStoryShareLoads.get(postId);
 const owner=me.id;
 const task=(async()=>{
  try{
   const res=await sb.from('posts').select('*').eq('id',postId).maybeSingle();
   if(res.error)throw res.error;
   if(!res.data||me?.id!==owner||blocked.has(res.data.author_id))return;
   const row=globalThis.PatiyizPrivateMedia?(await globalThis.PatiyizPrivateMedia.hydrateRows([res.data],owner,sb))[0]:res.data;
   if(!row||me?.id!==owner)return;
   if(!data.posts.some(p=>p.id===postId))data.posts.push(row);
   const showing=storyItems[storyIndex];
   const root=document.getElementById('story-overlay');
   const stage=root?.querySelector('.pati-story-share-stage');
   if(showing?.id===story.id&&stage?.isConnected){
    stage.outerHTML=patiStorySharedPostCard(story);
    const sharedVideo=root.querySelector('.pati-story-share-media-video');
    if(sharedVideo){
     clearTimeout(storyTimer);
     storyTimer=setTimeout(()=>stepStory(1),15000);
     sharedVideo.addEventListener('loadedmetadata',()=>{
      if(storyItems[storyIndex]?.id!==story.id)return;
      clearTimeout(storyTimer);
      const ms=Number.isFinite(sharedVideo.duration)?Math.min(15000,Math.max(5000,sharedVideo.duration*1000)):15000;
      storyTimer=setTimeout(()=>stepStory(1),ms);
     },{once:true});
    }
   }
  }catch(err){console.warn('Paylaşılan hikâye içeriği yüklenemedi:',err?.message||err)}
  finally{patiStoryShareLoads.delete(postId)}
 })();
 patiStoryShareLoads.set(postId,task);
 return task;
}
function patiStorySharedPostCard(x){
 const post=(typeof patiFindSocialPost==='function'?patiFindSocialPost(x.shared_post_id):null)
  ||data.posts.find(item=>item.id===x.shared_post_id);
 const original=post?profile(post.author_id):null;
 const authorLabel=original?(original.handle?'@'+original.handle:(original.display_name||'Kullanıcı')):String(x.caption||'Paylaşılan gönderi').replace(/\s+kullanıcısının gönderisi$/,'');
 const video=String(x.video_url||post?.video_url||'');
 const cover=x.image_url||post?.video_cover_url||post?.images?.[0]||post?.image_url||'';
 const content=video?
  '<video class="story-big-video pati-story-share-media-video'+(x.selfie_mirrored?' pati-selfie-mirrored':'')+'" src="'+esc(video)+'"'+(cover?' poster="'+esc(cover)+'"':'')+(patiyizStorySoundEnabled?'':' muted')+' autoplay playsinline webkit-playsinline preload="metadata" aria-label="Paylaşılan Reels önizlemesi"></video>':
  cover?'<img class="story-big-photo pati-story-share-media-photo" src="'+esc(cover)+'" alt="Paylaşılan gönderi fotoğrafı">':
  post?.body?'<span class="pati-story-share-text-content">'+esc(cut(post.body,550))+'</span>':
  '<span class="pati-story-share-empty">'+ico('image')+'</span>';
 const source=' data-action="pati-story-open-post" data-id="'+esc(x.shared_post_id)+'"';
 return '<div class="pati-story-share-stage" aria-label="Hikâyede paylaşılan gönderi">'+
  '<div class="pati-story-share-card">'+
   '<div class="pati-story-share-card-heading"><button type="button" class="pati-story-share-profile" data-action="pati-story-share-author" data-id="'+esc(post?.author_id||'')+'" aria-label="Paylaşımı yapan kişinin profiline git">'+(original?avatar(original,'s'):'<span class="pati-story-share-default-avatar">P</span>')+'<span><strong>'+esc(authorLabel||'Paylaşım')+'</strong><small>'+(video?'Reels':'Gönderi')+'</small></span></button></div>'+
   '<button type="button" class="pati-story-share-media'+(!video&&!cover&&post?.body?' pati-story-share-media-text':'')+'"'+source+' aria-label="Paylaşılan '+(video?'Reels':'gönderi')+' içeriğini aç">'+content+'</button>'+
   (video?'<button type="button" class="pati-story-sound pati-story-share-sound" data-action="story-sound" aria-label="'+(patiyizStorySoundEnabled?'Hikâye sesini kapat':'Hikâye sesini aç')+'">'+(patiyizStorySoundEnabled?'Sesi kapat':'Sesi aç')+'</button>':'')+
   (post?.body&&(video||cover)?'<p class="pati-story-share-post-caption">'+esc(cut(post.body,85))+'</p>':'')+
   '<button type="button" class="pati-story-shared-source"'+source+'><span class="pati-story-source-label">Gönderiyi aç</span><span class="pati-story-source-arrow" aria-hidden="true">↗</span></button>'+
  '</div></div>';
}
/* Instagram-like elapsed time beside the story owner's name.
   Use the saved server timestamp, not a client-created publication time. */
function patiStoryPublishedTime(story,now=Date.now()){
 const raw=story?.created_at;
 if(!raw)return '';
 const published=new Date(raw);
 const publishedMs=published.getTime();
 if(!Number.isFinite(publishedMs))return '';
 const minutes=Math.max(0,Math.floor((now-publishedMs)/60000));
 const visible=minutes<1?'Şimdi':minutes<60?minutes+' dk':minutes<1440?Math.floor(minutes/60)+' sa':Math.floor(minutes/1440)+' gün';
 const spoken=minutes<1?'Şimdi paylaşıldı':minutes<60?minutes+' dakika önce paylaşıldı':minutes<1440?Math.floor(minutes/60)+' saat önce paylaşıldı':Math.floor(minutes/1440)+' gün önce paylaşıldı';
 return '<time class="pati-story-upload-age" datetime="'+published.toISOString()+'" aria-label="'+esc(spoken)+'" title="'+esc(spoken)+'">'+visible+'</time>';
}
function showStoryFrame(){const root=document.getElementById('story-overlay'),x=storyItems[storyIndex];if(!root||!x)return;clearTimeout(storyTimer);patiPauseStoryBackgroundMedia();const user=profile(x.author_id);const storyGroupItems=storyItems.filter(s=>s.author_id===x.author_id);const storyGroupIndex=storyGroupItems.findIndex(s=>s.id===x.id);if(!x.pati_pet_highlight){patiStorySeen(x);recordStoryView(x);}if(!x.pati_pet_highlight&&x.author_id!==me.id)void syncStoryLike(x.id);root.dataset.audience=x.audience==='close_friends'?'close_friends':'everyone';root.classList.toggle('pati-story-own',x.author_id===me.id);root.classList.toggle('pati-story-has-source',!!x.shared_post_id);root.innerHTML='<div class="story-player"><div class="story-progress">'+storyGroupItems.map((_,i)=>'<span class="story-track"><span class="'+(i===storyGroupIndex?'story-playing':'')+'" style="width:'+(i<storyGroupIndex?'100':'0')+'%"></span></span>').join('')+'</div><div class="story-player-head">'+avatar(user,'s')+'<span class="pati-story-owner-name"><span class="pati-story-owner-top"><strong>'+displayName(user)+'</strong>'+patiStoryPublishedTime(x)+'</span>'+(x.audience==='close_friends'?'<span class="pati-story-close-friends-label">★ Yakın Arkadaşlar</span>':'')+'</span><button data-action="story-close" aria-label="Kapat" class="story-close">×</button></div>'+(x.shared_post_id?patiStorySharedPostCard(x):x.video_url?'<video class="story-big-video'+(x.selfie_mirrored?' pati-selfie-mirrored':'')+'" src="'+esc(x.video_url)+'" poster="'+esc(x.image_url||'')+'"'+(patiyizStorySoundEnabled?'':' muted')+' autoplay playsinline preload="auto" aria-label="Video hikâyesi"></video><button type="button" class="pati-story-sound" data-action="story-sound" aria-label="'+(patiyizStorySoundEnabled?'Hikâye sesini kapat':'Hikâye sesini aç')+'">'+(patiyizStorySoundEnabled?'Ses kapat':'Ses aç')+'</button>':x.image_url?'<img class="story-big-photo" src="'+esc(x.image_url)+'" alt="Hikâye">':'<div class="pati-story-no-photo">🐾</div>')+(x.caption&&!x.shared_post_id?'<p class="story-caption">'+esc(x.caption)+'</p>':'')+'<button class="story-hit prev" data-action="story-prev" aria-label="Önceki"></button><button class="story-hit next" data-action="story-next" aria-label="Sonraki"></button>'+(x.pati_pet_highlight?'<span class="pati-saved-story-label">Kalıcı hikâye</span>':x.author_id===me.id?'<button type="button" class="story-delete" data-action="story-delete" data-id="'+esc(x.id)+'" aria-label="Hikâyeyi sil">'+ico('trash')+' <span>Sil</span></button><button type="button" class="story-viewers-button pati-story-viewer-preview" data-action="story-viewers" aria-label="Hikâye hareketlerini aç"><span class="pati-story-viewer-preview-label">Hareketler</span></button>':'<button class="pati-story-like" data-action="story-like" data-id="'+esc(x.id)+'" aria-label="Hikâyeyi beğen">♡</button>')+'<div id="story-viewers-sheet" class="story-viewers-sheet" hidden></div></div>';
 // Own-story footer: viewers in the bottom-left marked area, Delete on the
 // right at the same baseline. Captions stay above, and self-like is absent.
 if(x.author_id===me.id&&!x.pati_pet_highlight){
  const player=root.querySelector('.story-player');
  const caption=player?.querySelector('.story-caption');
  const source=player?.querySelector(':scope > .pati-story-shared-source');
  const viewers=player?.querySelector('.pati-story-viewer-preview');
  const deleteButton=player?.querySelector('.story-delete');
  if(player&&viewers&&deleteButton){
   const stack=document.createElement('div');
   stack.className='pati-own-story-stack';
   if(caption)stack.appendChild(caption);
   if(source)stack.appendChild(source);
   const foot=document.createElement('div');
   foot.className='pati-own-story-footer';
   foot.appendChild(viewers);
   foot.appendChild(deleteButton);
   stack.appendChild(foot);
   player.appendChild(stack);
  }
 }
 if(x.shared_post_id)void patiHydrateStorySharedPost(x);
 const upcoming=storyItems[storyIndex+1];if(upcoming?.image_url&&typeof Image==='function'){const preload=new Image();preload.src=upcoming.image_url}storyTimer=setTimeout(()=>stepStory(1),(x.video_url||root.querySelector('.pati-story-share-media-video'))?15000:6000);
 if(x.author_id===me.id&&!x.pati_pet_highlight)void patiStoryPreviewLoad(x.id);
 if(x.video_url||root.querySelector('.pati-story-share-media-video')){
  const video=root.querySelector('.story-big-video');
  video?.addEventListener('loadedmetadata',()=>{
   if(storyItems[storyIndex]?.id!==x.id)return;
   clearTimeout(storyTimer);
   const duration=Number.isFinite(video.duration)?Math.min(15000,Math.max(5000,video.duration*1000)):15000;
   storyTimer=setTimeout(()=>stepStory(1),duration);
  },{once:true});
  video?.addEventListener('ended',()=>{if(storyItems[storyIndex]?.id===x.id){clearTimeout(storyTimer);stepStory(1)}},{once:true});
  video?.play?.()?.catch?.(error=>{
   if(!video.isConnected||storyItems[storyIndex]?.id!==x.id)return;
   if(!video.muted){video.muted=true;const button=root.querySelector('.pati-story-sound');if(button){button.textContent='Ses aç';button.setAttribute('aria-label','Hikâye sesini aç')}video.play().catch(e=>console.warn('Hikâye oynatılamadı:',e?.message||e));}
   else console.warn('Hikâye otomatik oynatılamadı:',error?.message||error);
  });
 }
}
async function syncStoryLike(id){
 const uid=me?.id;if(!uid)return;
 const r=await sb.from('patiyiz_story_likes').select('story_id').eq('story_id',id).eq('user_id',uid).maybeSingle();
 const btn=document.querySelector('.pati-story-like[data-id="'+id+'"]');
 if(!r.error&&btn&&!btn.disabled&&me?.id===uid){btn.textContent=r.data?'♥':'♡';btn.classList.toggle('active',!!r.data)}
}
async function toggleStoryLike(id){
 const story=storyItems.find(item=>item.id===id);
 if(!story||story.author_id===me?.id)return; // no self-like, including stale UI callbacks
 const btn=document.querySelector('.pati-story-like[data-id="'+id+'"]');if(!btn||btn.disabled)return;
 const uid=me.id,previous=btn.classList.contains('active');
 btn.disabled=true;
 try{
  const mutation=previous?await sb.from('patiyiz_story_likes').delete().eq('story_id',id).eq('user_id',uid):await sb.from('patiyiz_story_likes').insert({story_id:id,user_id:uid});
  // INSERT does not require UPDATE privileges; a duplicate is verified below.
  if(mutation.error&&mutation.error.code!=='23505')throw mutation.error;
  const verified=await sb.from('patiyiz_story_likes').select('story_id').eq('story_id',id).eq('user_id',uid).maybeSingle();
  if(verified.error)throw verified.error;
  if(me?.id!==uid)return;
  const stored=!!verified.data;
  if(stored===previous)throw Error('Hikâye beğenisi sunucuda doğrulanamadı.');
  btn.classList.toggle('active',stored);btn.textContent=stored?'♥':'♡';
 }catch(e){notify('Hikâye beğenisi kaydedilemedi: '+friendly(e),true);await syncStoryLike(id)}
 finally{btn.disabled=false}
}
function storiesStrip(){
 patiStorySeenInit();void patiStorySeenSync();
 const authors=[...new Set(data.stories.filter(x=>!x.pati_pet_highlight&&!blocked.has(x.author_id)&&new Date(x.expires_at).getTime()>Date.now()).map(x=>x.author_id))];
 const own=authors.includes(me.id);
 const others=authors.filter(id=>id!==me.id).sort((a,b)=>{
  const aNew=patiHasUnseenStory(a),bNew=patiHasUnseenStory(b);
  if(aNew!==bNew)return aNew?-1:1;
  const aLast=Math.max(...patiActiveStoriesOf(a).map(s=>new Date(s.created_at).getTime()));
  const bLast=Math.max(...patiActiveStoriesOf(b).map(s=>new Date(s.created_at).getTime()));
  return bLast-aLast;
 });
 return '<section class="stories-section"><div class="stories-heading"><strong>Hikâyeler</strong></div><div class="stories-strip">'+
  '<div class="story-person story-own"><button class="story-own-photo '+(own?(patiHasUnseenStory(me.id)?'has-story':'has-viewed-story'):'')+'" data-action="'+(own?'story-view':'story-create')+'" '+(own?'data-id="'+esc(me.id)+'"':'')+'>'+avatar(current(),'s')+'</button><button class="story-own-plus" data-action="story-create">+</button><small>'+(own?'Hikâyem':'Hikâye ekle')+'</small></div>'+
  others.map(id=>'<button class="story-person '+(patiHasUnseenStory(id)?'has-unseen-story':'has-viewed-story')+'" data-action="story-view" data-id="'+esc(id)+'" aria-label="'+esc(profile(id).display_name||'Kullanıcı')+' hikâyesini izle"><span class="story-avatar">'+avatar(profile(id),'s')+'</span><small>'+esc(profile(id).display_name)+'</small></button>').join('')+
 '</div></section>';
}
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
  const aUnseen=grouped.get(a).some(x=>typeof patiStoryIsSeen!=='function'||!patiStoryIsSeen(x)),bUnseen=grouped.get(b).some(x=>typeof patiStoryIsSeen!=='function'||!patiStoryIsSeen(x));
  if(aUnseen!==bUnseen)return aUnseen?-1:1;
  return new Date(grouped.get(b).at(-1).created_at)-new Date(grouped.get(a).at(-1).created_at)||String(a).localeCompare(String(b));
 });
 const items=authors.flatMap(id=>grouped.get(id));
 const firstUnseen=items.findIndex(x=>x.author_id===selectedAuthor&&(typeof patiStoryIsSeen!=='function'||!patiStoryIsSeen(x)));
 return {items,index:firstUnseen>=0?firstUnseen:items.findIndex(x=>x.author_id===selectedAuthor)};
}
function openStory(id){
 const sequence=patiBuildLiveStorySequence(id);
 if(!sequence)return notify('Hikâye bulunamadı.');
 closeStory(false);storyItems=sequence.items;storyIndex=sequence.index;
 const layer=document.createElement('div');layer.id='story-overlay';layer.className='story-fullscreen';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
 document.body.appendChild(layer);document.body.classList.add('story-fullscreen-open');showStoryFrame();
 if(storyItems.some(x=>x.audience==='close_friends'&&(!x.patiSignedAt||Date.now()-x.patiSignedAt>240000)))
  void patiHydrateCloseStories().then(()=>{if(document.getElementById('story-overlay'))showStoryFrame()}).catch(e=>console.warn('Özel hikâye yenilenemedi:',e));
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
function patiOnboardingDismissKey(){return 'patiyiz-profile-optional-hidden-v2:'+me?.id}
function patiOnboardingHidden(){try{return !!me?.id&&localStorage.getItem(patiOnboardingDismissKey())==='1'}catch(_){return !!me?.id&&patiyizOnboardingDismissed.has(me.id)}}
function patiDismissOnboarding(){if(!me?.id)return;try{localStorage.setItem(patiOnboardingDismissKey(),'1')}catch(_){patiyizOnboardingDismissed.add(me.id)}document.querySelectorAll('.pati-optional-onboarding,.pati-onboarding-thanks').forEach(el=>el.remove());}

function patiyizProgressCard(){
 if(patiOnboardingHidden())return '';
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
 return '<div class="pati-optional-onboarding"><button type="button" class="pati-onboarding-dismiss" data-action="pati-onboarding-dismiss" aria-label="Profil tamamlama önerisini kaldır" title="İsteğe bağlı öneriyi kaldır">×</button><details class="pati-progress-card pati-progress-compact" aria-label="Profil tamamlama görevleri"><summary class="pati-progress-top"><span class="pati-progress-flag">✓</span><div><strong>Profilini tamamla</strong><p>'+count+' / '+tasks.length+' görev · '+(next?esc(next.label):'Tamamlandı')+'</p></div><span class="pati-progress-count">'+count+'/'+tasks.length+'  ▾</span></summary><div class="pati-progress-track" role="progressbar" aria-label="Profil tamamlama ilerlemesi" aria-valuemin="0" aria-valuemax="'+tasks.length+'" aria-valuenow="'+count+'"><div style="width:'+(count/tasks.length*100)+'%"></div></div><div class="pati-progress-actions">'+tasks.map(x=>'<button type="button" class="pati-progress-action '+(x.done?'is-done':'is-pending')+'" data-action="'+x.action+'" aria-label="'+esc(x.label)+(x.done?' tamamlandı':' tamamlanmadı')+'"><span class="pati-task-check" aria-hidden="true">'+(x.done?'✓':'+')+'</span><span><b>'+esc(x.label)+'</b><small>'+esc(x.done?'Tamamlandı':x.info)+'</small></span><i aria-hidden="true">'+(x.done?'✓':'›')+'</i></button>').join('')+'</div><p class="pati-progress-optional">Evcil hayvan eklemek isteğe bağlıdır; <button type="button" data-action="pet-add">Patili dostunu ekle</button></p></details></div>';
}

let patiyizReelsObserver=null;
let patiyizReelsCleanup=null;
let patiyizReelsTap={post:'',time:0,timer:null};
// Native Android begins Reels with sound; the browser keeps muted autoplay.
let patiyizReelsSoundEnabled=true; // Browser autoplay policy may still require a tap.
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
 // Non-active slides cannot fetch MOV metadata.
 const attach=video=>{const url=video?.dataset?.patiVideoSrc;if(url&&!video.getAttribute?.('src')){video.src=url;return true}return false};
 const network=typeof navigator!=='undefined'?navigator.connection||navigator.mozConnection||navigator.webkitConnection:null;
 const lowData=!!network?.saveData||/^(slow-2g|2g)$/.test(String(network?.effectiveType||''));
 let lastPreparedIndex=-1;
 const prepareNext=video=>{
  const position=videos.indexOf(video);
  if(position<0||position===lastPreparedIndex)return;
  lastPreparedIndex=position;
  video.preload='auto';attach(video);
  // Keep the next Reel ready, and warm one more on fast connections.
  // Do not start fetching the entire feed on mobile or metered networks.
  const next=videos[position+1];
  if(next){next.preload=lowData?'metadata':'auto';attach(next)}
  if(!lowData){
   const afterNext=videos[position+2];
   if(afterNext){afterNext.preload='metadata';attach(afterNext)}
   const previous=videos[position-1];
   if(previous&&!previous.getAttribute?.('src')){previous.preload='metadata';attach(previous)}
  }
 };
 const loadNearEnd=()=>{
  const state=typeof patiReelsFeed!=='undefined'?patiReelsFeed:null;
  if(typeof view==='undefined'||view!=='reels'||!state?.ready||state.loading||!state.hasMore||state.error||!viewport?.clientHeight)return;
  const idx=Math.max(0,Math.min(videos.length-1,Math.round(viewport.scrollTop/viewport.clientHeight)));
  if(idx+6>=videos.length)void patiLoadMoreReels();
 };
 const playVideo=video=>{
  if(document.getElementById?.('story-overlay')){video?.pause();return}
  if(!video)return;
  prepareNext(video);
  if(activeVideo!==video){activeVideo?.pause();activeVideo=video}
  // Only one visible Reels video may play, including after browser autoplay retries.
  for(const other of videos)if(other!==video&&!other.paused)other.pause();
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
   // Do not load a neighbouring video before playback.
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
  if(viewport?.clientHeight){
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
  // Re-observe appended slides without binding event listeners twice.
  patiyizReelsObserver.observe(v);
  if(v.dataset.patiReelsBound==='1')return;
  v.dataset.patiReelsBound='1';
  // The poster remains visible while the active video loads or buffers.
  const item=v.closest?.('.pati-reel-item');
  if(item&&typeof item.querySelector==='function'&&typeof item.insertAdjacentHTML==='function'&&!item.querySelector('.pati-reel-buffering')){
   item.insertAdjacentHTML('beforeend','<div class="pati-reel-buffering" role="status" aria-live="polite" hidden><span class="pati-reel-spinner" aria-hidden="true"></span><span class="pati-reel-loading-label">Video yükleniyor…</span><progress value="0" max="100" aria-label="Video yükleme ilerlemesi"></progress></div>');
  }
  const indicator=item?.querySelector?.('.pati-reel-buffering');
  const progress=indicator?.querySelector?.('progress');
  let pendingBuffer=null;
  const busy=state=>{if(indicator)indicator.hidden=!state};
  const cancelBuffer=()=>{if(pendingBuffer!==null){clearTimeout(pendingBuffer);pendingBuffer=null}busy(false)};
  const updateBuffer=()=>{
   if(!progress||!Number.isFinite(v.duration)||v.duration<=0||!v.buffered?.length)return;
   try{progress.value=Math.max(0,Math.min(100,Math.round(v.buffered.end(v.buffered.length-1)/v.duration*100)))}catch(_){}
  };
  const isSelectedReel=()=>{
   const viewportNode=v.closest?.('.pati-reels-viewport');
   const reels=[...(viewportNode?.querySelectorAll?.('.pati-reel-item[data-post]')||[])];
   if(!viewportNode?.clientHeight||!reels.length)return activeVideo===v;
   const idx=Math.max(0,Math.min(reels.length-1,Math.round(viewportNode.scrollTop/viewportNode.clientHeight)));
   return reels[idx]===item;
  };
  const deferBuffer=()=>{
   if(pendingBuffer!==null)clearTimeout(pendingBuffer);
   busy(false);
   // Keep the poster visible during brief network stalls or decoder seeks.
   // A visible buffering overlay is reserved for sustained waits.
   pendingBuffer=setTimeout(()=>{
    pendingBuffer=null;
    if(v.isConnected!==false&&isSelectedReel()&&!v.paused&&v.readyState<3)busy(true);
   },1500);
  };
  for(const event of ['loadstart','waiting','stalled','seeking'])v.addEventListener?.(event,deferBuffer);
  for(const event of ['playing','canplay','seeked','pause'])v.addEventListener?.(event,cancelBuffer);
  v.addEventListener?.('playing',()=>{for(const other of videos)if(other!==v&&!other.paused)other.pause()});
  v.addEventListener?.('progress',updateBuffer);
  v.addEventListener?.('loadedmetadata',updateBuffer);
  v.addEventListener?.('error',()=>{cancelBuffer();if(!isSelectedReel())return;indicator?.classList?.add('pati-reel-buffering-error');busy(true);const label=indicator?.querySelector?.('.pati-reel-loading-label');if(label)label.textContent='Video açılamadı'});
  if(typeof patiWatchReelAttach==='function')patiWatchReelAttach(v);
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
 if(viewport?.addEventListener){
  let frame=0;
  const activate=()=>{
   if(document.hidden||!viewport.clientHeight||!videos.length)return;
   const index=Math.max(0,Math.min(videos.length-1,Math.round(viewport.scrollTop/viewport.clientHeight)));
   const selected=videos[index];
   for(const video of videos){
    if(video!==selected&&!video.paused)video.pause();
    if(video!==selected)delete video.dataset.manualPause;
   }
   attach(selected);
   if(selected.preload==='none')selected.preload='auto';
   if(selected.dataset.manualPause){selected.pause();activeVideo=selected;return}
   playVideo(selected);
  };
  const onScroll=()=>{
   loadNearEnd();
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
 const item=button.closest('.pati-reel-item'),id=item?.dataset?.post;
 if(!id)return reelTogglePlay(button);
 const now=Date.now(),tap=patiyizReelsTap;
 if(tap.post===id&&now-tap.time<340){
  if(tap.timer)clearTimeout(tap.timer);
  patiyizReelsTap={post:'',time:0,timer:null};
  if(tap.wasPlaying&&item.querySelector('video')?.paused)reelTogglePlay(button);
  const heart=item.querySelector('.pati-reel-heart-burst');
  if(liked.has(id))window.PatiyizMotion?.heart(heart);
  else{
   togglePostLike.heartTargets||=new Map();
   togglePostLike.heartTargets.set(id,heart);
   void togglePostLike(id);
  }
  return;
 }
 if(tap.timer)clearTimeout(tap.timer);
 const video=item.querySelector('video');
 patiyizReelsTap={post:id,time:now,timer:null,wasPlaying:!!video&&!video.paused};
 reelTogglePlay(button);
}
function patiReelPlayFeedback(button,playing){
 const item=button?.closest?.('.pati-reel-item');
 if(!item||typeof document==='undefined'||typeof document.createElement!=='function')return;
 let mark=item.querySelector?.('.pati-reel-play-feedback');
 if(!mark){mark=document.createElement('span');mark.className='pati-reel-play-feedback';mark.setAttribute('aria-hidden','true');item.appendChild(mark)}
 mark.textContent=playing?'▶':'Ⅱ';
 mark.classList.remove('pati-reel-play-flash');
 void mark.offsetWidth;
 mark.classList.add('pati-reel-play-flash');
}
function reelTogglePlay(button){
 const video=button.closest('.pati-reel-item')?.querySelector('video');if(!video)return;
 if(video.paused){
  const url=video.dataset?.patiVideoSrc;
  if(url&&!video.getAttribute?.('src'))video.src=url;
  if(video.preload==='none')video.preload='metadata';
  delete video.dataset.manualPause;
  document.querySelectorAll('#main-content .pati-reel-video').forEach(other=>{if(other!==video)other.pause()});
  video.muted=!patiyizReelsSoundEnabled;
  video.play().catch(()=>notify('Video oynatılamadı.',true));
  patiReelPlayFeedback(button,true);
 }else{video.dataset.manualPause='1';video.pause();patiReelPlayFeedback(button,false)}
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
let patiReelsCarry=null;
function patiReelsCapture(){
 if(typeof document==='undefined')return null;
 const viewport=document.querySelector('.pati-reels-viewport');
 if(!viewport?.clientHeight)return null;
 const cards=[...viewport.querySelectorAll('.pati-reel-item[data-post]')];
 const index=Math.max(0,Math.min(cards.length-1,Math.round(viewport.scrollTop/viewport.clientHeight)));
 const card=cards[index],video=card?.querySelector('video');
 return card&&video?{id:card.dataset.post,time:Number.isFinite(video.currentTime)?video.currentTime:0,manual:video.dataset.manualPause==='1'}:null;
}
let patiReelsFeed={owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
const PATI_REELS_PAGE=16;
async function patiLoadMoreReels(reset=false){
 if(!me||!sb)return;
 const uid=me.id,token=patiyizLoadToken;
 if(reset||patiReelsFeed.owner!==uid)patiReelsFeed={owner:uid,rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
 const state=patiReelsFeed;if(state.loading||!state.hasMore)return;
 const keepPlaying=view==='reels'&&!!document.querySelector('#main-content .pati-reels-viewport .pati-reel-item');
 state.loading=true;state.error='';
 if(view==='reels'&&!state.ready&&!keepPlaying)reelsPage();
 try{
  const response=await sb.from('posts').select('*').not('video_url','is',null)
   .order('created_at',{ascending:false}).order('id',{ascending:false})
   .range(state.offset,state.offset+PATI_REELS_PAGE-1);
  if(response.error)throw response.error;
  if(me?.id!==uid||patiyizLoadToken!==token||patiReelsFeed!==state)return;
  const rows=globalThis.PatiyizPrivateMedia?await globalThis.PatiyizPrivateMedia.hydrateRows(response.data||[],uid,sb):response.data||[];
  const seen=new Set(state.rows.map(p=>p.id));
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
  if(me?.id===uid&&patiReelsFeed===state&&view==='reels'){
   if(keepPlaying&&document.querySelector('#main-content .pati-reels-viewport'))reelsPage(true);
   else render();
  }
 }
}
function reelsPage(){
 const append=arguments[0]===true;
 const nativeReels=typeof window!=='undefined'&&window.PatiyizNative?.isNative===true;
 const selfId=typeof me!=='undefined'?me?.id:'';
 const isFollowing=id=>typeof followed!=='undefined'&&followed.has(id);
 const followsMe=id=>typeof data!=='undefined'&&data.follows?.some(f=>f.follower_id===id&&f.followee_id===selfId);
 const soundOn=(nativeReels||(typeof patiIsIOSStandaloneReels==='function'&&patiIsIOSStandaloneReels()))&&patiyizReelsSoundEnabled;
 const page=typeof patiReelsFeed!=='undefined'&&patiReelsFeed.owner===selfId?patiReelsFeed:null;
 const focusReelId=(typeof patiFeedReelTarget==='string'&&patiFeedReelTarget)||((typeof patiReelsCarry!=='undefined'&&patiReelsCarry?.id)||'');
 const source=page?.ready?[...page.rows,...data.posts]:data.posts;
 const items=[...new Map(source.map(p=>[p.id,p])).values()]
  .filter(x=>x.video_url&&!blocked.has(x.author_id))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
 const existingViewport=append?document.querySelector('#main-content .pati-reels-viewport'):null;
 const existingIds=new Set([...(existingViewport?.querySelectorAll('.pati-reel-item[data-post]')||[])].map(el=>String(el.dataset.post)));
 const remaining=existingViewport?items.filter(p=>!existingIds.has(String(p.id))):items;
 const cardsHTML=(remaining.length?remaining.map((p,index)=>{
  const absoluteIndex=existingViewport?items.findIndex(row=>row.id===p.id):index;
  const cached=typeof patiPostRenderStats!=='undefined'&&patiPostRenderStats;
  const author=profile(p.author_id),count=cached?(cached.get(p.id)?.likes||0):data.likes.filter(x=>x.post_id===p.id).length,commentCount=cached?(cached.get(p.id)?.comments||0):data.comments.filter(x=>x.post_id===p.id).length,likedPost=liked.has(p.id),savedPost=saved.has(p.id);
  return '<article class="pati-reel-item" data-post="'+esc(p.id)+'"><video class="pati-reel-video'+(p.selfie_mirrored?' pati-selfie-mirrored':'')+'" '+((focusReelId?p.id===focusReelId:absoluteIndex===0)?'src="':'data-pati-video-src="')+esc(p.video_url)+'"'+(p.video_cover_url?' poster="'+esc(p.video_cover_url)+'"':'')+' playsinline webkit-playsinline'+(nativeReels?'':' muted')+' loop preload="'+((focusReelId?p.id===focusReelId:absoluteIndex===0)?'auto':absoluteIndex===1?'metadata':'none')+'" aria-label="'+esc(author.display_name)+' videosu"></video>'+
  '<button type="button" class="pati-reel-tap" data-action="reel-play" aria-label="Videoyu oynat veya durdur, çift dokunarak beğen"><span class="pati-reel-heart-burst" aria-hidden="true">'+ico('heart')+'</span></button>'+
  '<div class="pati-reel-info"><div class="pati-reel-author"><button type="button" class="pati-reel-avatar-link" data-action="view-user" data-id="'+esc(author.id)+'" aria-label="'+esc(author.display_name)+' profiline git">'+avatar(author,'s')+'</button><span><strong>'+displayName(author)+'</strong><small>@'+esc(author.handle||'patiyiz')+'</small></span>'+(p.author_id!==selfId?'<button type="button" class="pati-reel-follow" data-action="follow" data-id="'+esc(author.id)+'" aria-pressed="'+isFollowing(author.id)+'"'+(!isFollowing(author.id)&&followsMe(author.id)?' data-follow-back="true"':'')+'>'+(isFollowing(author.id)?'Takiptesin':followsMe(author.id)?'Sen de takip et':'Takip et')+'</button>':'')+'</div>'+
  '<div class="pati-reel-caption">'+'<span class="pati-reel-caption-text">'+esc(p.video_subtitle||p.body||'')+'</span>'+(p.source_post_id?'<button type="button" class="pati-reel-source-credit" data-action="profile-open-post" data-id="'+esc(p.source_post_id)+'">↪ Orijinal gönderiyi gör</button>':'')+'</div></div>'+
  '<div class="pati-reel-progress"><input type="range" min="0" max="1000" value="0" step="1" data-action="reel-seek" aria-label="Videoyu ileri veya geri sar" style="--pati-reel-progress:0%"></div>'+ 
  '<div class="pati-reel-rail"><button type="button" class="pati-reel-action '+(likedPost?'active':'')+'" data-action="like" data-id="'+esc(p.id)+'" aria-label="Beğen" aria-pressed="'+likedPost+'">'+ico('heart')+'<span class="pati-reel-count pati-reel-likers-trigger" data-action="post-likers" data-id="'+esc(p.id)+'" role="button" tabindex="0" aria-label="'+count+' beğeni, beğenenleri gör">'+count+'</span></button>'+
  '<button type="button" class="pati-reel-action" data-action="comment" data-id="'+esc(p.id)+'" aria-label="Yorum yap">'+ico('message-circle')+'<span class="pati-reel-count">'+commentCount+'</span></button>'+
  ('<button type="button" class="pati-reel-action pati-reel-repost '+((typeof patiOwnRepost==='function'&&patiOwnRepost(p.id))?'active':'')+'" data-action="pati-repost" data-id="'+esc(p.id)+'" aria-pressed="'+(typeof patiOwnRepost==='function'&&patiOwnRepost(p.id))+'" aria-label="'+((typeof patiOwnRepost==='function'&&patiOwnRepost(p.id))?'Yeniden paylaşımı kaldır':'Yeniden paylaş')+'">'+(typeof PATI_REPOST_ICON==='string'?PATI_REPOST_ICON:'↻')+'<span class="pati-reel-action-label">Yeniden paylaş</span>'+(typeof patiSocialMetric==='function'?patiSocialMetric(p.id,'repost',''):'')+'</button>')+
  '<button type="button" class="pati-reel-action" data-action="share-post" data-id="'+esc(p.id)+'" aria-label="Paylaş">'+ico('send')+'<span class="pati-reel-action-label">Paylaş</span>'+(typeof patiSocialMetric==='function'?patiSocialMetric(p.id,'sent',''):'')+'</button>'+
  '<button type="button" class="pati-reel-action '+(savedPost?'active':'')+'" data-action="save" data-id="'+esc(p.id)+'" aria-label="Kaydet" aria-pressed="'+savedPost+'">'+ico('bookmark')+'<span class="pati-reel-action-label">Kaydet</span>'+(typeof patiSocialMetric==='function'?patiSocialMetric(p.id,'saved',''):'')+'</button>'+
  '</div><div class="pati-reel-utility" role="group" aria-label="Video kontrol seçenekleri"><button type="button" data-action="reel-speed" class="pati-reel-tool" aria-label="Oynatma hızı 1×">'+ico('gauge')+'<span class="pati-reel-tool-label">1×</span></button>'+
  '<button type="button" data-action="reel-sound" class="pati-reel-tool" aria-label="'+(soundOn?'Sesi kapat':'Sesi aç')+'" aria-pressed="'+soundOn+'">'+ico(soundOn?'volume':'volume-x')+'<span class="pati-reel-tool-label pati-reel-sound-label">'+(soundOn?'Sesi kapat':'Sesi aç')+'</span></button></div></article>'
 }).join(''):existingViewport?'':'<div class="pati-reels-empty">'+(page?.loading?'Reels videoları hazırlanıyor…':'Henüz Reels yok. İlk videoyu sen paylaş!')+'</div>');
 const noAutoPaging=typeof window==='undefined'||!('IntersectionObserver' in window)||(!nativeReels&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const footerHTML=page?.error?'<div class="pati-reels-load-more"><p role="alert">'+esc(page.error)+'</p><button type="button" data-action="reels-more">Tekrar dene</button></div>':page?.hasMore?(noAutoPaging?'<div class="pati-reels-load-more"><button type="button" data-action="reels-more">Daha fazla Reels yükle</button></div>':'<div class="pati-reels-load-more" aria-label="Daha fazla Reels yüklenebilir" hidden></div>'):'';
 if(existingViewport){
  existingViewport.querySelector('.pati-reels-load-more')?.remove();
  existingViewport.insertAdjacentHTML('beforeend',cardsHTML+footerHTML);
  setupReelsViewer();
  return;
 }
 main.innerHTML='<section class="pati-reels-head"><h1>Reels</h1></section><div class="pati-reels-viewport">'+cardsHTML+footerHTML+'</div>';
 if(focusReelId){
  const area=main.querySelector('.pati-reels-viewport');
  const nodes=[...(area?.querySelectorAll('.pati-reel-item[data-post]')||[])];
  const focused=nodes.find(el=>el.dataset.post===focusReelId);
  if(focused){
   // The video is already focused when setupReelsViewer runs.
   if(area?.clientHeight&&nodes.length>1)area.scrollTop=nodes.indexOf(focused)*area.clientHeight;
   else if(typeof focused.scrollIntoView==='function')focused.scrollIntoView({block:'start',behavior:'instant'});
   if(patiFeedReelTarget===focusReelId)patiFeedReelTarget='';
   const carry=typeof patiReelsCarry!=='undefined'?patiReelsCarry:null;
   if(carry?.id===focusReelId){
    const video=focused.querySelector('video');
    if(video){
     if(carry.manual)video.dataset.manualPause='1';
     if(carry.time>0){
      const seek=()=>{try{if(video.isConnected&&Number.isFinite(video.duration)&&video.duration>0)video.currentTime=Math.min(carry.time,video.duration-.1)}catch(_){}};
      if(video.readyState>=1)seek();else video.addEventListener('loadedmetadata',seek,{once:true});
     }
    }
   }
  }
 }
 if(typeof patiReelsCarry!=='undefined')patiReelsCarry=null;
}

function closePatiCreate(){const el=$('#pati-create-sheet');if(el)el.hidden=true;document.body.classList.remove('pati-create-open')}
function openPatiCreate(){if(view!=='home')return;const el=$('#pati-create-sheet');if(!el)return;el.hidden=false;document.body.classList.add('pati-create-open');el.querySelector('.pati-create-dismiss')?.focus()}

function openPatiShareModal(postId){
 const post=patiFindSocialPost(postId);
 if(!post||blocked.has(post.author_id))return notify('Bu paylaşım artık bulunamıyor.',true);
 const people=data.profiles.filter(p=>p.id!==me.id&&!blocked.has(p.id)).sort((a,b)=>Number(followed.has(b.id))-Number(followed.has(a.id))||String(a.display_name||'').localeCompare(String(b.display_name||''),'tr'));
 const author=profile(post.author_id),cover=post.image_url||(post.images||[])[0]||post.video_cover_url||'',summary=cut(post.body||'Paylaşım',95);
 const preview='<div class="pati-share-preview">'+(cover?'<img src="'+esc(cover)+'" alt="Gönderi önizlemesi" loading="lazy">':'<span class="pati-share-preview-icon">'+ico(post.video_url?'up':'image')+'</span>')+'<span><b>'+displayName(author)+'</b><small>'+esc(summary)+'</small></span></div>';
 const search='<label class="pati-share-search"><span class="sr-only">Kişi ara</span>'+ico('search')+'<input id="pati-share-search" type="search" placeholder="Kişi ara" autocomplete="off" aria-label="Paylaşılacak kişiyi ara"></label>';
 const recipients=people.map(p=>'<button type="button" class="pati-share-person" data-action="send-post-dm" data-id="'+esc(p.id)+'" data-post="'+esc(postId)+'" data-name="'+esc((p.display_name||'')+' '+(p.handle||''))+'" aria-label="'+esc(p.display_name||'Patiyiz üyesi')+' kullanıcısına gönder"><span class="pati-share-avatar">'+avatar(p,'l')+'</span><span class="pati-share-person-name">'+esc(p.display_name||'Patiyiz üyesi')+'</span><small>@'+esc(p.handle||'patiyiz')+'</small></button>').join('');
 const shareQuick='<div class="pati-share-quick">'+((post.image_url||(post.images||[]).length||post.video_url||post.video_cover_url||String(post.body||'').trim())?'<button type="button" class="pati-share-to-story" data-action="pati-share-story" data-id="'+esc(postId)+'">'+ico('story-create')+' Hikâyemde paylaş</button>':'')+'<button type="button" data-action="pati-copy-post" data-id="'+esc(postId)+'">'+ico('bookmark')+' Bağlantıyı kopyala</button><button type="button" data-action="pati-share-system" data-id="'+esc(postId)+'">'+ico('send')+' Diğer uygulamalarda paylaş</button></div>';
 modal('Paylaş',preview+shareQuick+search+'<div class="pati-share-recipient-title">Kişilere gönder</div><div class="pati-share-people-grid">'+(recipients||'<p class="pati-share-empty">Henüz paylaşabileceğin kullanıcı yok.</p>')+'</div><p class="pati-share-no-match" hidden>Bu isimle kullanıcı bulunamadı.</p>','share-post-form');
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

// Shared posts: invitations are separate from the original author's post. No extra copy is published.
let patiCollabs={owner:'',rows:[],loading:false,profilesLoaded:new Set(),profilesBusy:new Set()};
let patiHomeTab='all';
let patiFollowingState={owner:'',rows:[],ready:false,loading:false,hasMore:true,cursor:null,error:''};
function patiCollabEnsure(){
 if(patiCollabs.owner!==me?.id)patiCollabs={owner:me?.id||'',rows:[],loading:false,profilesLoaded:new Set(),profilesBusy:new Set()};
}
function patiCollabMerge(rows){
 patiCollabEnsure();
 const map=new Map(patiCollabs.rows.map(x=>[x.post_id+':'+x.user_id,x]));
 for(const x of rows||[])map.set(x.post_id+':'+x.user_id,x);
 patiCollabs.rows=[...map.values()];
}
function patiCollabAccepted(postId){
 patiCollabEnsure();
 return patiCollabs.rows.find(x=>x.post_id===postId&&x.status==='accepted')||null;
}
function patiCollabPartnerPosts(ownerId){
 patiCollabEnsure();
 const ids=new Set(patiCollabs.rows.filter(x=>x.user_id===ownerId&&x.status==='accepted').map(x=>x.post_id));
 return data.posts.filter(p=>(p.author_id===ownerId||ids.has(p.id))&&!blocked.has(p.author_id));
}
async function patiCollabHydrate(rows){
 const uid=me?.id,ids=[...new Set((rows||[]).filter(x=>x.status==='accepted').map(x=>x.post_id))]
  .filter(id=>!data.posts.some(p=>p.id===id)).slice(0,150);
 if(!ids.length||!uid)return;
 for(let i=0;i<ids.length;i+=50){
  const r=await sb.from('posts').select('*').in('id',ids.slice(i,i+50));
  if(r.error)throw r.error;
  if(me?.id!==uid)return;
  const known=new Set(data.posts.map(p=>p.id));
  const visible=globalThis.PatiyizPrivateMedia?await globalThis.PatiyizPrivateMedia.hydrateRows(r.data||[],uid,sb):r.data||[];
  for(const p of visible)if(!known.has(p.id)){data.posts.push(p);known.add(p.id)}
 }
}
async function patiCollabRefresh(){
 if(!me||!sb)return;
 patiCollabEnsure();
 if(patiCollabs.loading)return;
 const uid=me.id,ids=data.posts.slice(0,200).map(p=>p.id);
 patiCollabs.loading=true;
 try{
  const [visible,incoming]=await Promise.all([
   ids.length?sb.from('patiyiz_post_collaborators').select('*').in('post_id',ids).limit(250):Promise.resolve({data:[],error:null}),
   sb.from('patiyiz_post_collaborators').select('*').eq('user_id',uid).limit(150)
  ]);
  if(visible.error)throw visible.error;
  if(incoming.error)throw incoming.error;
  if(me?.id!==uid)return;
  const all=[...(visible.data||[]),...(incoming.data||[])];
  patiCollabMerge(all);
  await patiCollabHydrate(all);
  if(me?.id===uid&&['home','profile'].includes(view))render();
 }catch(error){console.warn('Ortak gönderi davetleri getirilemedi:',error?.message||error)}
 finally{if(me?.id===uid)patiCollabs.loading=false}
}
async function patiCollabLoadProfile(uid){
 if(!me||!uid||!sb)return;
 patiCollabEnsure();
 if(patiCollabs.profilesLoaded.has(uid)||patiCollabs.profilesBusy.has(uid))return;
 const session=me.id;
 patiCollabs.profilesBusy.add(uid);
 try{
  const r=await sb.from('patiyiz_post_collaborators').select('*').eq('user_id',uid).eq('status','accepted').limit(150);
  if(r.error)throw r.error;
  if(me?.id!==session)return;
  patiCollabMerge(r.data||[]);
  await patiCollabHydrate(r.data||[]);
  patiCollabs.profilesLoaded.add(uid);
  if(me?.id===session&&view==='profile'&&(profileId||me.id)===uid)render();
 }catch(error){console.warn('Ortak profil gönderileri getirilemedi:',error?.message||error)}
 finally{patiCollabs.profilesBusy.delete(uid)}
}
function patiCollabInvites(){
 patiCollabEnsure();
 const rows=patiCollabs.rows.filter(x=>x.user_id===me?.id&&x.status==='pending').slice(0,12);
 if(!rows.length)return '';
 return '<section class="pati-collab-requests" aria-label="Ortak gönderi davetleri"><h2>Ortak gönderi davetlerin <span>'+rows.length+'</span></h2>'+
 rows.map(x=>{
  const post=data.posts.find(p=>p.id===x.post_id),author=profile(x.invited_by);
  return '<div class="pati-collab-request"><div><b>'+esc(author?.display_name||author?.handle||'Patiyiz üyesi')+'</b><small>Bir gönderiyi birlikte paylaşmak istiyor.'+(post?.body?' · '+esc(cut(post.body,65)):'')+'</small></div>'+
  '<div><button type="button" data-action="collab-accept" data-id="'+esc(x.post_id)+'">Kabul et</button><button type="button" data-action="collab-decline" data-id="'+esc(x.post_id)+'">Reddet</button></div></div>';
 }).join('')+'<button type="button" class="pati-collab-refresh" data-action="collab-refresh">Davetleri yenile</button></section>';
}
async function patiCollabInvite(postId,rawHandle,selectedUserId){
 const owner=me?.id,handle=String(rawHandle||'').trim().replace(/^@/,'');
 const target=String(selectedUserId||'').trim();
 if(!owner||!postId)throw Error('Ortak gönderi daveti için giriş yap.');
 if(!handle&&!target)return;
 if(!target||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(target))throw Error('Ortak paylaşım için listeden doğru profili seç.');
 if(handle.length>40)throw Error('Kullanıcı adı çok uzun.');
 // Never guess the destination from free text: verify the selected account ID on the server.
 const found=await sb.from('profiles').select('id,handle').eq('id',target).maybeSingle();
 if(found.error)throw found.error;
 if(!found.data||String(found.data.handle||'').toLocaleLowerCase('tr-TR')!==handle.toLocaleLowerCase('tr-TR'))throw Error('Seçtiğin profil bulunamadı. Kullanıcıyı yeniden seç.');
 if(found.data.id===owner)throw Error('Kendi hesabına ortak daveti gönderemezsin.');
 if(blocked.has(found.data.id))throw Error('Bu hesaba ortak daveti gönderemezsin.');
 const result=await sb.from('patiyiz_post_collaborators').insert({post_id:postId,user_id:found.data.id,invited_by:owner,status:'pending'}).select('*').single();
 if(result.error)throw result.error;
 if(me?.id!==owner)return;
 patiCollabMerge([result.data]);
}
async function patiCollabRespond(postId,status){
 if(!me||!['accepted','declined'].includes(status))return;
 const owner=me.id;
 const r=await sb.from('patiyiz_post_collaborators').update({status}).eq('post_id',postId).eq('user_id',owner).eq('status','pending').select('*');
 if(r.error)throw r.error;
 if(!r.data?.length)throw Error('Bu davet artık mevcut değil.');
 if(me?.id!==owner)return;
 patiCollabMerge(r.data);
 patiCollabs.profilesLoaded.delete(owner);
 if(status==='accepted')await patiCollabHydrate(r.data);
 render();
}
async function patiCollabRemove(postId){
 if(!me)return;
 const owner=me.id;
 const r=await sb.from('patiyiz_post_collaborators').delete().eq('post_id',postId)
 .or('user_id.eq.'+owner+',invited_by.eq.'+owner).select('post_id');
 if(r.error)throw r.error;
 if(!r.data?.length)throw Error('Bu ortaklık kaydı bulunamadı.');
 if(me?.id!==owner)return;
 patiCollabs.rows=patiCollabs.rows.filter(x=>x.post_id!==postId);
 patiCollabs.profilesLoaded.clear();closeModal(true);render();
}
async function patiFollowingFetch(more=false){
 if(!me||!sb)return;
 if(patiFollowingState.loading)return;
 const uid=me.id;
 if(patiFollowingState.owner!==uid)patiFollowingState={owner:uid,rows:[],ready:false,loading:false,hasMore:true,cursor:null,error:''};
 if(more&&!patiFollowingState.hasMore)return;
 patiFollowingState.loading=true;patiFollowingState.error='';
 if(view==='home'&&patiHomeTab==='following')render();
 try{
  const cursor=more?patiFollowingState.cursor:null;
  const r=await sb.rpc('patiyiz_following_feed',{p_limit:40,p_before:cursor?.created_at||null,p_before_id:cursor?.id||null});
  if(r.error)throw r.error;
  if(me?.id!==uid)return;
  const rows=globalThis.PatiyizPrivateMedia?await globalThis.PatiyizPrivateMedia.hydrateRows(r.data||[],uid,sb):r.data||[];
  const map=new Map((more?patiFollowingState.rows:[]).map(p=>[p.id,p]));
  rows.forEach(p=>map.set(p.id,p));
  patiFollowingState.rows=[...map.values()];
  patiFollowingState.cursor=rows.length?{created_at:rows[rows.length-1].created_at,id:rows[rows.length-1].id}:cursor;
  patiFollowingState.hasMore=rows.length===40;patiFollowingState.ready=true;
  const known=new Set(data.posts.map(p=>p.id));
  for(const p of rows)if(!known.has(p.id)){data.posts.push(p);known.add(p.id)}
  if(view==='home'&&patiHomeTab==='following')render();
  if(rows.length)void patiCollabRefresh();
 }catch(error){patiFollowingState.error='Takip edilenler akışı yüklenemedi. Yeniden dene.';if(view==='home'&&patiHomeTab==='following')render();console.warn(error)}
 finally{if(patiFollowingState.owner===uid)patiFollowingState.loading=false}
}

/* Q&A joins the main feed as real, RLS-filtered questions; no second timeline. */
let patiHomeQuestionsState={owner:'',rows:[],ready:false,loading:false};
async function patiLoadHomeQuestions(){
 if(!me?.id||!sb)return;
 const uid=me.id,token=patiyizLoadToken;
 if(patiHomeQuestionsState.owner!==uid)patiHomeQuestionsState={owner:uid,rows:[],ready:false,loading:false};
 const state=patiHomeQuestionsState;
 if(state.ready||state.loading)return;
 state.loading=true;
 try{
  const result=await sb.from('questions').select('*').order('created_at',{ascending:false}).limit(12);
  if(result.error)throw result.error;
  if(me?.id!==uid||patiyizLoadToken!==token||patiHomeQuestionsState!==state)return;
  state.rows=(result.data||[]).filter(q=>!blocked.has(q.author_id));
  if(state.rows.length&&patiQuestionVotePending.size===0){
   const ids=state.rows.map(q=>q.id);
   const voteResult=await sb.from('question_votes').select('*').in('question_id',ids).limit(2500);
   if(!voteResult.error&&me?.id===uid&&patiyizLoadToken===token&&patiHomeQuestionsState===state&&patiQuestionVotePending.size===0){
    const all=new Set(ids);
    data.votes=[...data.votes.filter(v=>!all.has(v.question_id)),...(voteResult.data||[])];
    voted=new Set(data.votes.filter(x=>x.user_id===uid&&x.is_helpful!==false).map(x=>x.question_id));
   }
  }
  state.ready=true;
  // This is only a home preview, not the dedicated Q&A pagination state.
  const previous=new Map(data.questions.map(q=>[q.id,q]));
  for(const q of state.rows)previous.set(q.id,q);
  data.questions=[...previous.values()];
  if(view==='home'&&!selectedPostId)render();
 }catch(error){console.warn('Akış soru-cevap yüklenemedi:',error?.message||error)}
 finally{state.loading=false}
}
const patiQuestionVotePending=new Set();
function patiQuestionVoteCounts(id){
 const votes=(data.votes||[]).filter(v=>v.question_id===id),mine=votes.find(v=>v.user_id===me?.id);
 const positive=votes.filter(v=>v.is_helpful!==false).length,negative=votes.filter(v=>v.is_helpful===false).length;
 return {positive,negative,leader:positive>negative?'positive':negative>positive?'negative':'tie',mine:mine?(mine.is_helpful!==false?'positive':'negative'):'none'};
}
function patiQuestionVoteButtons(q){
 const vote=patiQuestionVoteCounts(q.id),id=esc(q.id);
 return '<button type="button" data-action="vote" data-id="'+id+'" class="pati-question-vote-up '+(vote.mine==='positive'?'active ':'')+(vote.leader==='positive'?'pati-vote-leading':'')+'" aria-label="Faydalı" aria-pressed="'+(vote.mine==='positive')+'">'+ico('heart')+' <span data-vote-count="positive">'+vote.positive+'</span> Faydalı</button>'+
 '<button type="button" data-action="vote-negative" data-id="'+id+'" class="pati-question-vote-down '+(vote.mine==='negative'?'active ':'')+(vote.leader==='negative'?'pati-vote-leading':'')+'" aria-label="Faydasız" aria-pressed="'+(vote.mine==='negative')+'">'+ico('thumbs-down')+' <span data-vote-count="negative">'+vote.negative+'</span> Faydasız</button>';
}
function patiQuestionVotePaint(id){
 const vote=patiQuestionVoteCounts(id);
 document.querySelectorAll('[data-question-id="'+id+'"] button[data-action="vote"],[data-question-id="'+id+'"] button[data-action="vote-negative"]').forEach(btn=>{
  const kind=btn.dataset.action==='vote'?'positive':'negative',active=vote.mine===kind;
  btn.classList.toggle('active',active);btn.classList.toggle('pati-vote-leading',vote.leader===kind);btn.setAttribute('aria-pressed',String(active));btn.disabled=patiQuestionVotePending.has(id);
  const n=btn.querySelector('[data-vote-count]');if(n)n.textContent=String(vote[kind]);
 });
}
function patiHomeQuestionCard(q){
 const replies=(data.replies||[]).filter(r=>r.question_id===q.id).length;
 return '<article class="pati-card pati-home-question" data-question-id="'+esc(q.id)+'" aria-label="Soru ve cevap paylaşımı">'+
 '<div class="pati-home-question-tag"><span>SORU & CEVAP</span><button type="button" data-view="community">Tüm sorular ›</button></div>'+
 '<div class="pati-row pati-home-question-author">'+userRow(q.author_id,day(q.created_at))+'</div>'+
 '<h3>'+esc(q.title||'Topluluk sorusu')+'</h3><p>'+esc(cut(q.body||'',280))+'</p>'+
 '<div class="pati-home-question-actions">'+patiQuestionVoteButtons(q)+
 '<button type="button" data-action="replies" data-id="'+esc(q.id)+'" aria-label="Soruya yanıtları aç">'+ico('message-circle')+' <span>'+replies+' yanıt</span></button>'+
 '</div></article>';
}
/* Separate social media from tweet-like text and Q&A in the home timeline. */
let patiHomeContentMode=(()=>{try{return localStorage.getItem('patiyiz-home-feed-mode')==='text'?'text':'media'}catch(_){return 'media'}})();
const patiHomeIsMediaPost=p=>p.post_format==='reels'||!!(
 p.image_url||p.video_url||
 (Array.isArray(p.images)&&p.images.some(Boolean))||
 (Array.isArray(p.media_videos)&&p.media_videos.some(Boolean))
);
function patiHomeCombinedFeed(posts){
 if(patiHomeContentMode==='media'){
  const mediaPosts=posts.filter(patiHomeIsMediaPost);
  return mediaPosts.length?mediaPosts.map((p,i)=>postCard(p,i<5)).join(''):
   empty(patiyizLoadedTables.has('posts')?'Henüz fotoğraf, video veya Reels paylaşımı yok.':'Gönderiler yükleniyor…',
    patiyizLoadedTables.has('posts')?'Yeni bir gönderi paylaşarak başlayabilirsin.':'');
 }
 const preview=patiHomeQuestionsState.owner===me?.id?patiHomeQuestionsState.rows:[];
 const questions=[...new Map([...(data.questions||[]),...preview].filter(q=>q?.id).map(q=>[q.id,q])).values()]
  .filter(q=>!blocked.has(q.author_id));
 const mixed=[
  ...posts.filter(p=>!patiHomeIsMediaPost(p)).map(item=>({kind:'text',item})),
  ...questions.map(item=>({kind:'question',item}))
 ].sort((a,b)=>new Date(b.item.created_at)-new Date(a.item.created_at)).slice(0,50);
 return mixed.length?mixed.map((entry,i)=>entry.kind==='question'
  ?patiHomeQuestionCard(entry.item):postCard(entry.item,i<5)).join(''):
  empty(patiHomeQuestionsState.loading||!patiyizLoadedTables.has('posts')?'Yazılar ve sorular yükleniyor…':'Henüz yazı veya soru paylaşımı yok.',
   patiHomeQuestionsState.loading?'':'İlk yazını yazabilir veya topluluğa soru sorabilirsin.');
}
window.addEventListener('patiyiz:feed-mode',event=>{
 const next=event?.detail?.mode;
 if(next!=='media'&&next!=='text')return;
 patiHomeContentMode=next;
 selectedPostId='';
 patiDetailState=null;
 if(!me?.id)return;
 if(view==='home'){render();window.scrollTo({top:0,behavior:'instant'});}
 else navigate('home');
 window.dispatchEvent(new CustomEvent('patiyiz:feed-mode-changed',{detail:{mode:patiHomeContentMode}}));
});

let patiFeedReelTarget='';
function patiOpenFeedReel(postId){
 if(!postId||!me?.id)return;
 patiFeedReelTarget=postId;
 navigate('reels');
 // Render focuses the target first, so the viewer is initialized just once.
}
function homePage(){
 // The existing central feed stays unified; duplicated feed selector is removed.
 patiHomeTab='all';
 if(!selectedPostId&&patiHomeContentMode==='text'&&typeof patiLoadHomeQuestions==='function')void patiLoadHomeQuestions();
 if(selectedPostId&&patiDetailState){patiDetailPage();return}
 const list=[...data.posts].filter(p=>!blocked.has(p.author_id)&&
  (typeof patiHomeFeedIds==='undefined'||!patiHomeFeedIds||patiHomeFeedIds.has(p.id)))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
 const following=typeof patiHomeTab!=='undefined'&&patiHomeTab==='following',followingItems=typeof patiFollowingState!=='undefined'&&patiFollowingState.owner===me?.id?patiFollowingState.rows:[];
 const friendReposts=following?data.reposts.filter(r=>followed.has(r.user_id)&&!blocked.has(r.user_id)&&r.user_id!==me.id).map(r=>{
 const post=patiFindSocialPost(r.post_id);
 return post&&!blocked.has(post.author_id)?{...post,_patiRepostActor:r.user_id,_patiRepostAt:r.created_at}:null;
 }).filter(Boolean):[];
 const visiblePosts=following?[...followingItems.filter(p=>!blocked.has(p.author_id)),...friendReposts].sort((a,b)=>
 new Date(b._patiRepostAt||b.created_at)-new Date(a._patiRepostAt||a.created_at)):list;
 if(following&&typeof patiFollowingFetch==='function'&&!patiFollowingState.loading&&(!patiFollowingState.ready||patiFollowingState.owner!==me?.id))void patiFollowingFetch(false);
 main.innerHTML=selectedPostId
  ?header('Paylaşım','Bildirimin ilgili olduğu paylaşım.',button('← Ana sayfaya dön','post-back'))+(data.posts.some(p=>p.id===selectedPostId&&!blocked.has(p.author_id))?postCard(data.posts.find(p=>p.id===selectedPostId)):empty('Paylaşım bulunamadı'))
  :(patiHomeContentMode==='media'?storiesStrip():'')+'<div class="pati-feed-posts">'+(patiHomeContentMode==='media'&&typeof patiCollabInvites==='function'?patiCollabInvites():'')+(following?(patiFollowingState.loading&&!patiFollowingState.ready?'<p class="pati-following-state">Takip edilenlerin gönderileri yükleniyor…</p>':visiblePosts.length?visiblePosts.map((p,i)=>(p._patiRepostActor?'<div class="pati-repost-context">↻ '+esc(profile(p._patiRepostActor).display_name||'Bir kullanıcı')+' yeniden paylaştı</div>':'')+postCard(p,i<5)).join(''):'<div class="pati-following-empty"><strong>Takip ettiklerin burada görünecek</strong><p>Henüz yeni gönderi yok. Keşfet’ten yeni hesaplar bulabilir veya akışı yenileyebilirsin.</p><button type="button" data-view="explore">Keşfet</button><button type="button" data-action="home-following-refresh">Yenile</button></div>') :(list.length?(typeof patiHomeCombinedFeed==='function'?patiHomeCombinedFeed(list):list.map((p,i)=>postCard(p,i<5)).join('')):(typeof patiHomeCombinedFeed==='function'&&(patiHomeContentMode==='text'||(typeof patiHomeQuestionsState!=='undefined'&&patiHomeQuestionsState.rows.length))?patiHomeCombinedFeed([]):empty(patiyizLoadedTables.has('posts')?'Henüz paylaşım yok':'Gönderiler yükleniyor…',patiyizLoadedTables.has('posts')?'İlk gönderiyi sen paylaş!':'Paylaşımların yeniden getiriliyor.'))))+((typeof patiHomeLoadError!=='undefined'&&patiHomeLoadError)?'<div class="pati-load-more" role="alert">'+
  esc(patiHomeLoadError)+' '+button('Tekrar dene','home-retry')+'</div>':'')
 +(following&&patiFollowingState.error?'<div class="pati-following-error" role="alert">'+esc(patiFollowingState.error)+' '+button('Yeniden dene','home-following-refresh')+'</div>':'')
 +(following&&patiFollowingState.ready&&patiFollowingState.hasMore?'<div class="pati-load-more">'+button('Daha fazla paylaşım yükle','home-following-more')+'</div>':'')
 +(pageMore.posts&&!following&&!((typeof patiHomeLoadError!=='undefined'&&patiHomeLoadError))&&
  patiyizLoadedTables.has('posts')?'<div class="pati-load-more">'+button('Daha fazla paylaşım yükle','load-more','data-id="posts"')+'</div>':'')+'</div>';
 const shortcut=typeof document!=='undefined'?document.getElementById('pati-header-following-btn'):null;
 if(shortcut){shortcut.textContent=following?'Senin İçin':'Takip Ettiklerim';shortcut.dataset.id=following?'all':'following';shortcut.setAttribute('aria-pressed',String(following));}
 if(typeof patiSyncHomePostCounts==='function')void patiSyncHomePostCounts(selectedPostId?list.filter(p=>p.id===selectedPostId):visiblePosts);
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
  ids.forEach(id=>savedMissingAttempted.add(id));const visible=globalThis.PatiyizPrivateMedia?await globalThis.PatiyizPrivateMedia.hydrateRows(r.data||[],uid,sb):r.data||[];
  for(const post of visible)if(!data.posts.some(p=>p.id===post.id))data.posts.push(post);
  if(view==='saved-posts')render();
 }catch(e){console.warn('Kaydedilen gönderilerin yüklenmesi:',e)}
 finally{savedPostsLoading=false}
}
function savedPostsPage(){
 if(window.PatiyizSavedV2){
  window.PatiyizSavedV2.render({
   data,me,saved,blocked,sb,navigate,openPost,fetchMissingSavedPosts,
   notify,rerender:render
  });
  return;
 }
 const list=data.posts.filter(p=>saved.has(p.id)&&!blocked.has(p.author_id));
 main.innerHTML='<section class="pati-saved-posts"><h1>Kaydedildi</h1>'+
  '<div class="pati-feed-posts">'+list.map(p=>postCard(p)).join('')+'</div></section>';
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
  const rows=globalThis.PatiyizPrivateMedia?await globalThis.PatiyizPrivateMedia.hydrateRows(result.data||[],uid,sb):result.data||[];
  const existing=new Set(state.rows.map(p=>p.id));
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
    p.video_cover_url?'<img class="'+(p.selfie_mirrored?'pati-selfie-mirrored':'')+'" src="'+esc(p.video_cover_url)+'" loading="'+(i<6?'eager':'lazy')+'" decoding="async" '+(i<3?'fetchpriority="high"':'')+' alt="Reels kapağı">':
    '<span class="pati-explore-preview-video" role="img" aria-label="Video önizlemesi" style="display:grid;place-items:center;background:#16181c;color:white;font-size:1.5rem">▶</span>';
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
const mediaTiles=media.map(p=>'<button type="button" class="pati-explore-media" data-action="explore-open-post" data-id="'+esc(p.id)+'" aria-label="Paylaşımı aç">'+(p.image_url?'<img loading="lazy" decoding="async" src="'+esc(p.image_url)+'" alt="'+esc(cut(p.body||'Patili paylaşım',70))+'">':'<video class="'+(p.selfie_mirrored?'pati-selfie-mirrored':'')+'" muted playsinline preload="metadata" src="'+esc(p.video_url)+'#t=0.1"></video>')+(p.video_url?'<span class="pati-explore-video-icon">▶</span>':'')+'<span class="pati-explore-tile-stats">♥ '+likesFor(p.id)+' · '+commentsFor(p.id)+' yorum</span></button>').join('');
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
  if(category==='Hayvanlar')query=query.in('category',['Hayvanlar',...PATI_LEGACY_PET_QUESTION_CATEGORIES]);
  else if(category==='Diğer')query=query.in('category',['Diğer','Genel']);
  else if(category!=='Tümü')query=query.eq('category',category);
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
const PATI_QUESTION_CATEGORIES=['Girişimcilik','Hayvanlar','Teknoloji','Eğitim ve Kariyer','Günlük Yaşam','Diğer'];
const PATI_LEGACY_PET_QUESTION_CATEGORIES=['Sağlık','Beslenme','Eğitim','Davranış','Bakım'];
function patiQuestionCategoryGroup(cat){
 if(PATI_LEGACY_PET_QUESTION_CATEGORIES.includes(cat))return 'Hayvanlar';
 return cat==='Genel'?'Diğer':cat;
}
function communityPage(){
 const categories=['Tümü',...PATI_QUESTION_CATEGORIES];
 const page=typeof patiCommunityPage!=='undefined'&&patiCommunityPage.owner===me.id&&patiCommunityPage.category===communityCategory?patiCommunityPage:null;
 const source=page?.ready?page.rows:data.questions;
 const qs=[...source].filter(q=>!blocked.has(q.author_id)&&(communityCategory==='Tümü'||patiQuestionCategoryGroup(q.category)===communityCategory))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
 main.innerHTML='<section class="pati-community-head">'+header('Soru & Cevap','Bir soruyla yeni fikirler keşfet. Toplulukla konuş, farklı görüşler al.',button('+ Soru sor','question'))+'<p class="pati-community-subhead">Sorular sor, deneyimlerini paylaş, yanıtları birlikte değerlendir.</p></section>'+
 '<button type="button" class="pati-community-mobile-ask" data-action="question" aria-label="Topluluğa soru sor">+ Soru sor</button>'+ 
 '<div class="pati-filter-tabs">'+categories.map(cat=>'<button type="button" data-action="community-filter" data-id="'+esc(cat)+'" class="'+(communityCategory===cat?'active':'')+'" aria-pressed="'+(communityCategory===cat)+'">'+esc(cat)+'</button>').join('')+'</div>'+
 '<div class="pati-list">'+qs.map(q=>{
  const rs=patiCommunityReplyPages.get(me.id+':'+q.id);
  const replyCount=rs?.ready?rs.rows.length+(rs.hasMore?'+':''):data.replies.filter(r=>r.question_id===q.id).length;
  return '<article class="pati-card pati-community-card" data-question-id="'+esc(q.id)+'"><div class="pati-row between">'+userRow(q.author_id,day(q.created_at))+'<span class="pati-pill">'+esc(q.category)+'</span></div><h3 style="margin-top:13px">'+esc(q.title)+'</h3><p>'+esc(q.body)+'</p><div class="pati-actionbar">'+patiQuestionVoteButtons(q)+'<button data-action="replies" data-id="'+q.id+'">💬 '+replyCount+' cevap</button>'+
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
// Keep every original animal lesson ID and completion record while creating its independent series.
for(const lesson of patiyizLessons){
 lesson.subtopic=lesson.cat;lesson.cat='101 Hayvan';lesson.series='101 Hayvan';
 lesson.minutes=12;
 const item=lesson.name,theme=lesson.subtopic||'Hayvanlar';
 lesson.parts.push(
  '4. DERİNLEŞTİRME (2 dk). '+item+' konusunda hayvanın yaşını, yaşam koşullarını, davranış örüntülerini ve bakım verenin gözlemlerini birlikte değerlendir. Her hayvanın aynı ihtiyaca sahip olmadığını unutma. Buradaki genel bilgileri gerçek bir vaka ile ilişkilendirirken hangi ayrıntıların eksik olduğunu yaz. Hayvanın türünü ve bireysel durumunu bilmeden kesin çıkarım yapma.',
  '5. UYGULAMA ÖRNEĞİ (2 dk). '+theme+' konusunda bildiklerini kullanabileceğin güvenli bir günlük bakım durumu düşün. Ortamı gözlemle, normal davranışla olağan dışı değişikliği ayır ve her birini iki cümle ile not et. Beslenme, ilaç veya sağlık müdahalesi gibi riskli bir adımı kendi başına denemek yerine bir veterinerden uygun yönlendirme almayı tercih et.',
  '6. ADIM ADIM ÇALIŞMA (3 dk). Kâğıda ya da not uygulamana şu başlıkları yaz: Gözlediğim durum, Bildiğim güvenilir bilgi, Emin olmadığım noktalar ve Güvenli sonraki adım. Her başlığa iki kısa cümle ekle. Önceki dersin bilgileriyle çelişen bir durum fark edersen farkı açıklamaya çalış. Amaç hızlı karar vermek değil, dikkatli ve güvenli değerlendirme alışkanlığı kazanmaktır.',
  '7. HATA VE SINIRLAR (2 dk). '+item+' üzerine okuduğun önerinin hangi durumlarda geçerli olmayabileceğini düşün. Yanlış kaynaklar, hayvanın sağlık geçmişini bilmemek veya beklenmedik davranışları görmezden gelmek önemli risklerdir. Gerekli durumlarda uzman değerlendirmesi istemek, iyi bakımın bir parçasıdır. Gözlem ile teşhisin aynı şey olmadığını unutma.',
  '8. ÖZ DEĞERLENDİRME (2 dk). Bugünkü bilgiyi kendi sözlerinle üç cümlede özetle. Yeni öğrendiğin iki noktayı ve doğrulaman gereken bir soruyu not al. Bir sonraki dersten önce güvenilir kaynaklardan bu soruyu araştır. Tekrar etmek, bilgiyi kalıcı hâle getirir.',
  '9. MİNİ SINAVA HAZIRLIK (1 dk). Öğrendiklerini uygulanabilir güvenli davranışlarla ilişkilendir. Doğru seçeneği işaretlerken hayvanın iyiliğini, bireysel koşulları ve gerektiğinde veteriner görüşü alma gereğini birlikte düşün.'
 );
}
patiyizLessons.push(...(window.PATIYIZ_SERIES_LESSONS||[]));
// All ten 101-series lessons now have a 12-minute guided format, including historical IDs.
for(const lesson of patiyizLessons)lesson.minutes=Math.max(12,Number(lesson.minutes)||0);
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
 const uid=me.id,done=educationDone();if(done.has(id)||!educationCanOpen(id,done))return;
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
let patiMyPetTab='hub';
let patiHubSelectedPetId='';
let patiHealthLanding=true;
let patiHealthTopic='all';
function patiMyPetCenterPage(){
 if(patiMyPetTab==='hub'){
  const pets=(data.pets||[]).filter(p=>p.owner_id===me?.id);
  const featured=pets.find(p=>p.id===patiHubSelectedPetId)||pets[0];
  if(featured)patiHubSelectedPetId=featured.id;
  const art=p=>/kedi/i.test(String(p?.species||''))?'pati-illustration-cat.svg':'pati-illustration-dog.svg';
  const photo=(p)=>'<img src="'+esc(p?.photo_url||p?.avatar_url||art(p))+'" alt="'+esc(p?.name||'Patili dost')+'" loading="lazy" decoding="async">';
  const name=featured?esc(featured.name||'Patili dostum'):'İlk dostunu ekle';
  const dueToday=careOwnItems().filter(x=>!x.done&&x.due_date===careToday()).length;
  const tiles=[
   ['care','Bakım Takvimi','calendar','sky','📅','tab'],
   ['wellness','Sağlık','pulse','pink','💗','tab'],
   ['own-pets','Hayvanlarım','pets','peach','🐱','tab'],
   ['knowledge','Bilgi Merkezi','book','aqua','📖','view'],
   ['lost','Kayıp İlanları','lost','coral','🔎','view'],
   ['adoption','Sahiplendirme','adopt','rose','🐾','view'],
   ['shop','Ödül Mağazası','gift','amber','🎁','view']
  ];
  const tile=(item)=>'<button type="button" class="p4-hub-tile p4-'+item[3]+'" '+(item[5]==='tab'?'data-action="pati-my-pet-tab" data-id="'+item[0]+'"':'data-view="'+item[0]+'"')+'><span class="p4-tile-ico" aria-hidden="true">'+item[4]+'</span><strong>'+item[1]+'</strong></button>';
  const petsBar='<div class="p4-pet-picker" role="group" aria-label="Kayıtlı hayvanlarım">'+pets.map(p=>'<button type="button" data-action="pati-hub-select-pet" data-id="'+esc(p.id)+'" class="p4-pet-thumb '+(featured?.id===p.id?'active':'')+'" aria-pressed="'+(featured?.id===p.id?'true':'false')+'">'+photo(p)+'<span>'+esc(p.name||'Dostum')+'</span></button>').join('')+'<button type="button" class="p4-pet-thumb" data-action="pet-add"><span class="p4-pet-add">+</span><span>Ekle</span></button></div>';
  main.innerHTML='<section class="pati-pet-hub p4-hub p4-hub-direct-hero">'+
   '<div class="p4-hub-hero" data-pet-id="'+esc(featured?.id||'')+'"><div class="p4-hub-hero-copy"><small>BENİM PATİLİ DOSTUM</small><h1>'+name+'</h1><p>'+(featured?esc([featured.breed,featured.species].filter(Boolean).join(' · ')):'Yeni bir hayvan profili oluştur')+'</p><button type="button" '+(featured?'data-action="pati-my-pet-tab" data-id="wellness"':'data-action="pet-add"')+'>'+(featured?'Detayları gör ›':'Hayvan ekle +')+'</button></div><div class="p4-hub-photo">'+photo(featured)+'</div></div>'+
   '<div class="p4-hub-status"><span class="p4-status-emoji">🐶</span><div><strong>'+(dueToday?dueToday+' bakım görevin bugün seni bekliyor.':featured?name+' için yeni bir gün!':'İlk patili dostunu ekle')+'</strong><small>'+(featured?'Bakımını ve sağlığını kolayca takip et.':'Hayvan profili oluşturarak başla.')+'</small></div><button type="button" data-action="pati-my-pet-tab" data-id="care" aria-label="Bakım takvimini aç">›</button></div>'+
   (pets.length>1?petsBar:'')+
   '<div class="p4-section-label"><h2>Hızlı İşlemler</h2></div><div class="p4-hub-grid">'+tiles.slice(0,4).map(tile).join('')+'</div>'+
   '<div class="p4-section-label"><h2>Keşfet ve Daha Fazlası</h2></div><div class="p4-hub-grid">'+tiles.slice(4).map(tile).join('')+'</div>'+
   '<button type="button" class="p4-all-pets" data-action="pati-my-pet-tab" data-id="own-pets">🐾 Hayvanlarımı yönet <span>›</span></button></section>';
  return;
 }
 if(patiMyPetTab==='own-pets'){
  const own=(data.pets||[]).filter(p=>p.owner_id===me?.id);
  main.innerHTML='<section class="pati-own-pets"><h1>Hayvanlarım</h1><p>Patili dostlarının profillerini yönet.</p><div class="pati-own-pets-list">'+own.map(p=>'<article data-pet-id="'+esc(p.id)+'"><div class="pati-own-pets-image">'+(p.photo_url?'<img src="'+esc(p.photo_url)+'" alt="'+esc(p.name)+'">':petIcon(p.species))+'</div><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.species||'Hayvan')+'</small></div><button type="button" data-action="pet-edit" data-id="'+esc(p.id)+'">Düzenle</button></article>').join('')+'</div><button type="button" class="pati-own-pets-add" data-action="pet-add">+ Hayvan ekle</button></section>';
 } else if(patiMyPetTab==='wellness'){
  if(patiHubSelectedPetId)patiWellnessPetId=patiHubSelectedPetId;
  patiWellnessPage();
  if(!patiHealthLanding){
   const screen=main.querySelector('.wellness-v2');
   screen?.classList.add('pati-health-detail','pati-health-topic-'+patiHealthTopic);
   const name={vaccine:'Aşılar',vet:'Veteriner',medicine:'İlaçlar',weight:'Kilo Takibi'}[patiHealthTopic]||'Sağlık';
   const headline=screen?.querySelector('.pati-wellness-heading h1');
   if(headline)headline.textContent=name;
   const homeButton=document.createElement('div');
   homeButton.className='pati-ref-health-back';
   homeButton.innerHTML='<button type="button" data-action="pati-health-back">← Sağlık ekranı</button>';
   screen?.prepend(homeButton);
  }
 } else if(patiMyPetTab==='healthfile')healthFilePage();
 else carePage();
 const back=document.createElement('div');back.className='pati-hub-detail-back';
 back.innerHTML='<button type="button" data-action="pati-my-pet-tab" data-id="hub" aria-label="Hayvanım Merkezi\'ne dön">← Hayvanım Merkezi</button>';
 main.prepend(back);
}
let educationStatus='Tümü',educationBackScroll=0;
let patiAcademyBrowseAll=false;
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

/* Sequential academy: a topic is selected before lesson lists are shown. Existing completion IDs stay intact. */
function educationTopicLessons(topic){
 return patiyizLessons.filter(l=>l.cat===topic);
}
function educationCanOpen(id,done=educationDone()){
 const lesson=patiyizLessons.find(l=>l.id===id);
 if(!lesson)return false;
 if(done.has(id))return true;
 const track=educationTopicLessons(lesson.cat);
 const i=track.findIndex(l=>l.id===id);
 return i>=0&&track.slice(0,i).every(l=>done.has(l.id));
}
function educationTopicNext(topic,done){
 return educationTopicLessons(topic).find(l=>!done.has(l.id))||null;
}
function educationTopicArtwork(topic){
 const files={Kedi:'pati-illustration-cat.svg',Köpek:'pati-illustration-dog.svg',Kuş:'pati-illustration-bird.svg',Balık:'pati-illustration-fish.svg'};
 const catalog=typeof window!=='undefined'?(window.PATIYIZ_SERIES_CATALOG||[]):[];
  const symbols=Object.fromEntries(catalog.map(x=>[x.title,x.icon]));
 return files[topic]?'<img src="'+files[topic]+'" alt="'+esc(topic)+' illüstrasyonu" loading="lazy" decoding="async">':
  '<span class="pati-academy-topic-art-icon" aria-hidden="true">'+esc(symbols[topic]||'📚')+'</span>';
}
function educationPathCards(topic,done){
 return educationTopicLessons(topic).map((l,i)=>{
  const finished=done.has(l.id),available=educationCanOpen(l.id,done);
  const tag='<span class="pati-edu-path-step">'+(i+1)+'. Ders</span>';
  const content='<span class="pati-edu-path-no" aria-hidden="true">'+(finished?'✓':available?'▶':'🔒')+'</span><span class="pati-edu-path-copy">'+tag+'<strong>'+esc(l.name)+'</strong><small>'+esc(l.desc)+' · '+Number(l.minutes||0)+' dk</small></span><b class="pati-edu-path-status">'+(finished?'Tamamlandı':available?'Derse başla':'Kilitli')+'</b>';
  return available?'<button type="button" class="pati-edu-path-item '+(finished?'is-done':'is-current')+'" data-action="education-open" data-id="'+esc(l.id)+'" aria-label="'+esc(l.name)+(finished?', tamamlandı':', başlayabilirsin')+'">'+content+'</button>':
   '<div class="pati-edu-path-item is-locked" role="listitem" aria-disabled="true" aria-label="'+esc(l.name)+', önceki ders tamamlanınca açılır">'+content+'</div>';
 }).join('');
}
function educationPage(){
 const completed=educationDone(),completedCount=patiyizLessons.filter(l=>completed.has(l.id)).length;
 const progress=Math.round(completedCount*100/Math.max(1,patiyizLessons.length)),remaining=patiyizLessons.length-completedCount;
 const topics=[...new Set(patiyizLessons.map(l=>l.cat))];
 if(educationLesson){
  const l=patiyizLessons.find(x=>x.id===educationLesson);
  if(!l||!educationCanOpen(l.id,completed)){
   educationLesson='';
   if(l)educationCategory=l.cat;
   educationPage();
   return;
  }
  const track=educationTopicLessons(l.cat),index=track.findIndex(x=>x.id===l.id);
  const next=track[index+1],prev=track[index-1],done=completed.has(l.id);
  const chosen=done?l.answer:educationAnswer[l.id],passed=chosen===l.answer;
  const studyReady=done||!window.PatiyizLessonWorkshop||window.PatiyizLessonWorkshop.ready(l.id,me?.id);
  const nextReady=next&&educationCanOpen(next.id,completed);
  main.innerHTML='<section class="pati-edu pati-edu-v2 edu-v2-detail edu-path-detail"><button type="button" class="pati-edu-back" data-action="education-back">← '+esc(l.cat)+' derslerine dön</button>'
   +'<div class="edu-v2-lesson-meta"><span>Ders '+(index+1)+' / '+track.length+'</span><span>'+esc(l.cat)+' · '+Number(l.minutes)+' dk</span><span class="'+(done?'edu-v2-complete':'')+'">'+(done?'✓ Tamamlandı':'Henüz tamamlanmadı')+'</span></div>'
   +'<div class="edu-v2-lesson-track" role="progressbar" aria-label="Konu içerisindeki ders sırası" aria-valuemin="0" aria-valuemax="'+track.length+'" aria-valuenow="'+(index+1)+'"><span style="width:'+((index+1)*100/track.length).toFixed(2)+'%"></span></div>'
   +'<div class="pati-edu-lesson-head"><span aria-hidden="true">'+esc(l.icon)+'</span><div><small>'+esc(l.cat)+' · '+Number(l.minutes)+' dakikalık ders</small><h1>'+esc(l.name)+'</h1><p>'+esc(l.desc)+'</p></div></div>'
   +'<div class="pati-edu-lesson-body">'
   +(window.PatiyizLessonWorkshop?window.PatiyizLessonWorkshop.render(l,me?.id,esc):l.parts.map((part,i)=>'<section class="pati-edu-step"><b>'+(i+1)+'</b><p>'+esc(part)+'</p></section>').join(''))
   +'<div class="pati-edu-quiz '+(!studyReady?'is-time-locked':'')+'"><span class="edu-v2-quiz-kicker">MİNİ SINAV</span><strong>Bilgini test et</strong><p>'+esc(l.q)+'</p>'
   +l.opts.map((o,i)=>'<button type="button" class="'+(chosen===i?'selected':'')+(passed&&i===l.answer?' edu-v2-correct':'')+'" data-action="education-answer" data-id="'+esc(l.id)+'" data-choice="'+i+'" aria-pressed="'+String(chosen===i)+'"'+(passed||!studyReady?' disabled aria-disabled="true"':'')+'><span class="edu-v2-answer-marker" aria-hidden="true">'+String.fromCharCode(65+i)+'</span>'+esc(o)+'</button>').join('')
   +(chosen!==undefined?'<p class="pati-edu-feedback '+(passed?'edu-v2-success':'edu-v2-try-again')+'" role="status">'+(passed?'✓ Doğru cevap! Ders tamamlandı. Sıradaki dersin kilidi açıldı.':'Bu yanıt doğru değil. Yeniden deneyebilirsin.')+'</p>':'<p class="edu-v2-quiz-hint">'+(!studyReady?'Mini sınav, 10 dakika aktif çalışmanın ardından açılır.':'Sonraki dersin kilidini açmak için doğru yanıtı seç.')+'</p>')+'</div>'
   +'<div class="pati-edu-next edu-v2-lesson-nav">'+(prev?'<button type="button" class="edu-v2-previous" data-action="education-previous" data-id="'+esc(prev.id)+'">← Önceki ders</button>':'<span></span>')
   +(next?nextReady?'<button type="button" data-action="education-next" data-id="'+esc(next.id)+'">Sıradaki ders →</button>':'<button type="button" disabled aria-disabled="true" class="pati-edu-next-locked">🔒 Önce bu dersi tamamla</button>':
   '<button type="button" data-action="education-back">Konu derslerine dön ✓</button>')+'</div>'
   +'<p class="pati-edu-notice">Bu ders genel eğitim amaçlıdır; gerektiğinde konunun uzmanına danış.</p></div></section>';
  window.PatiyizLessonWorkshop?.mount(l.id,me?.id);
  return;
 }
 if(educationCategory==='Tümü'){
  const accents=['coral','fuchsia','turquoise','gold','violet','sage'];
  const topicCard=(topic,i)=>{
   const lessons=educationTopicLessons(topic),done=lessons.filter(l=>completed.has(l.id)).length;
   return '<button type="button" class="pati-ref-academy-topic pati-ref-topic-'+accents[i%accents.length]+'" data-action="education-filter" data-id="'+esc(topic)+'"><span class="pati-ref-academy-topic-copy"><strong>'+esc(topic)+'</strong><small>'+done+' / '+lessons.length+' ders tamamlandı</small><span class="pati-topic-open">Eğitimleri aç ›</span></span>'+educationTopicArtwork(topic)+'</button>';
  };
  main.innerHTML='<section class="pati-edu pati-edu-v2 pati-ref-academy-home pati-edu-path-home">'
   +'<div class="pati-edu-fullscreen-top"><button type="button" data-action="education-exit" aria-label="Eğitimlerden çık">← Geri</button><span>101 Eğitim Serileri</span></div><header class="pati-ref-academy-header"><div><span>101 EĞİTİM SERİLERİ</span><h1>Öğrenmek istediğin seriyi seç</h1><p>10 bağımsız seri. Her seride en az 10 dakikalık, uygulamalı 101 ders bulunuyor.</p></div></header>'
   +'<div class="pati-ref-academy-section"><h2>101 Ders Serileri</h2><span>'+topics.length+' ayrı seri</span></div>'
   +'<div class="pati-ref-academy-topics">'+topics.map(topicCard).join('')+'</div>'
   +'<div class="pati-academy-total-progress" role="status"><strong>'+completedCount+' / '+patiyizLessons.length+' ders tamamlandı</strong><div class="pati-edu-progressbar" role="progressbar" aria-label="Akademi tamamlanma oranı" aria-valuenow="'+progress+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+progress+'%"></span></div><small>Her tamamlanan ders ilerlemene kaydedilir.</small></div>'
   +'<p class="pati-edu-notice">10 bağımsız seri ve toplam '+patiyizLessons.length+' kapsamlı ders. Eğitimler genel bilgi amaçlıdır; uzman görüşünün yerini almaz.</p></section>';
  return;
 }
 const topic=educationTopicLessons(educationCategory);
 if(!topic.length){educationCategory='Tümü';educationPage();return}
 const topicDone=topic.filter(l=>completed.has(l.id)).length;
 const next=educationTopicNext(educationCategory,completed);
 const categoryProgress=Math.round(topicDone*100/topic.length);
 main.innerHTML='<section class="pati-edu pati-edu-v2 pati-ref-academy-list pati-edu-path-list">'
  +'<div class="pati-ref-topic-toolbar"><button type="button" data-action="pati-academy-home">← Eğitimleri Keşfet</button></div>'
  +'<div class="pati-edu-path-topic-head"><div class="pati-edu-path-topic-icon">'+educationTopicArtwork(educationCategory)+'</div><div><span>101 EĞİTİM SERİLERİ</span><h1>'+esc(educationCategory)+'</h1><p>101 kapsamlı dersi sırayla tamamla. Seriler birbirinden bağımsız ilerler.</p></div></div>'
  +'<div class="pati-edu-path-progress"><div><strong>'+topicDone+' / '+topic.length+' ders tamamlandı</strong><small>%'+categoryProgress+' tamamlandı</small></div><div class="pati-edu-progressbar" role="progressbar" aria-label="Bu konunun tamamlanma oranı" aria-valuenow="'+categoryProgress+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+categoryProgress+'%"></span></div></div>'
  +(next?'<button type="button" class="pati-edu-path-start" data-action="education-continue" data-id="'+esc(next.id)+'">▶ '+(topicDone?'Kaldığın yerden devam et':'İlk derse başla')+'</button>':'<p class="pati-edu-path-complete">✓ Bu konunun tüm derslerini tamamladın.</p>')
  +'<div class="edu-v2-results-head"><h2>Dersler ve Konular</h2><span>'+topic.length+' ders</span></div>'
  +'<div id="pati-edu-result-list" class="pati-edu-path-items" role="list">'+educationPathCards(educationCategory,completed)+'</div>'
  +'<p class="edu-v2-sync">'+(educationCloudUser===me?.id?'✓ İlerlemen hesabınla eşitlendi.':'İlerlemen cihazında saklanır; bağlantı olduğunda hesabınla eşitlenir.')+'</p>'
  +'<p class="pati-edu-notice">Dersleri tamamlamak için mini sınavdaki doğru cevabı seç.</p></section>';
}

/* Private pet wellness and public verified activity ranking */
let patiWellness={reminders:[],weights:[],loaded:false,loading:false,notified:new Set(),error:''};
let patiWellnessTab='active';
let patiWeeklyState={owner:'',loading:false,ready:false,error:'',updatedAt:0,result:null};

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
 // Do not display automatic vaccine, care or feeding toasts at login.
 // Calendar records and their due/late states remain inside Hayvanım.
 return;
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
  if(view==='wellness'||(view==='my-pet'&&['wellness','care'].includes(patiMyPetTab))||view==='care')render();
  patiWellnessAlerts();
  // Avoid recurring due-reminder toast popups; health data remains available.
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
 const viewItems=patiWellnessRemindersFor(selectedId).filter(x=>view!=='my-pet'||patiHealthTopic==='all'||patiHealthTopic==='weight'||x.kind===patiHealthTopic);
 const icons={vaccine:'💉',vet:'🩺',food:'🥣',medicine:'💊'};
 if(view==='my-pet'&&patiHealthLanding){
  const selected=pets.find(p=>p.id===selectedId);
  const img=selected?.photo_url||(/kedi/i.test(selected?.species||'')?'pati-illustration-cat.svg':'pati-illustration-dog.svg');
  const next=[...open].sort((x,y)=>new Date(x.due_at)-new Date(y.due_at))[0];
  const actions=[['vaccine','Aşılar','💉','gold'],['vet','Veteriner','🩺','blue'],['medicine','İlaçlar','💊','green'],['weight','Kilo Takibi','⚖️','purple']];
  const petsPicker=pets.length>1?'<div class="p4-health-pets" role="group" aria-label="Hayvan seç">'+pets.map(p=>'<button type="button" data-action="wellness-pet" data-id="'+esc(p.id)+'" class="'+(p.id===selectedId?'active':'')+'" aria-pressed="'+(p.id===selectedId?'true':'false')+'">'+esc(p.name)+'</button>').join('')+'</div>':'';
  main.innerHTML='<section class="pati-health-home p4-health">'+
   '<header class="p4-health-header"><span>HAYVAN SAĞLIĞI</span><h1>'+esc(selected?.name||'Patili dostun')+'</h1><p>Sağlık kayıtları ve hatırlatmalar</p></header>'+
   petsPicker+
   '<div class="p4-health-profile"><div class="p4-health-portrait"><img src="'+esc(img)+'" alt="'+esc(selected?.name||'Hayvan fotoğrafı')+'"></div><div><strong>'+esc(selected?.name||'Hayvanını ekle')+'</strong><small>'+esc([selected?.breed,selected?.species].filter(Boolean).join(' · ')||'İlk hayvanını ekle')+'</small><span class="p4-health-lastweight">⚖️ Son kilo: '+(latest?Number(latest.weight_kg).toLocaleString('tr-TR')+' kg':'Henüz kayıt yok')+'</span></div></div>'+
   '<div class="p4-health-overview"><span>⏰ YAKLAŞAN HATIRLATMA</span><div><strong>'+(next?esc(next.title):'Yaklaşan hatırlatma bulunmuyor')+'</strong><small>'+(next?esc(new Date(next.due_at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'})):'Yeni bir aşı veya kontrol hatırlatması ekle.')+'</small></div><button type="button" data-action="wellness-reminder-add">+ Ekle</button></div>'+
   '<div class="p4-health-subhead"><h2>Hızlı İşlemler</h2></div>'+
   '<div class="p4-health-actions">'+actions.map(([id,title,icon,tone])=>'<button type="button" class="p4-health-action p4-health-'+tone+'" data-action="pati-health-action" data-id="'+id+'"><span aria-hidden="true">'+icon+'</span><strong>'+title+'</strong></button>').join('')+'</div>'+
   '<div class="p4-health-subhead"><h2>Sağlık geçmişi</h2></div><button type="button" class="p4-health-history" data-action="pati-health-action" data-id="all"><span>🗓️ Tüm sağlık kayıtlarını incele</span><span>›</span></button>'+
   (!pets.length?'<button type="button" class="p4-add-pet" data-action="pet-add">+ Hayvan profili oluştur</button>':'')+
   '<p class="p4-health-disclaimer">Sağlık kayıtları veteriner muayenesinin yerini almaz.</p></section>';
  return;
 }
 const cards=viewItems.map(x=>{
  const past=Date.parse(x.due_at)<Date.now(),finished=!!x.completed_at;
  const when=Number.isFinite(Date.parse(x.due_at))?new Date(x.due_at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'}):'Tarih bilinmiyor';
  return '<article class="pati-wellness-event wellness-v2-event'+(finished?' is-finished':'')+'"><span class="pati-wellness-event-icon" aria-hidden="true">'+(icons[x.kind]||'🐾')+'</span>'
   +'<div class="wellness-v2-event-main"><div class="wellness-v2-event-flags"><span>'+esc(patiReminderNames[x.kind]||'Bakım')+'</span><b class="'+(finished?'is-completed':past?'is-overdue':'is-planned')+'">'+(finished?'✓ Tamamlandı':past?'Gecikti':'Planlandı')+'</b></div>'
   +'<strong>'+esc(x.title)+'</strong><small>📅 '+esc(when)+'</small>'
   +(x.note?'<p class="wellness-v2-note">'+esc(x.note)+'</p>':'')
   +(x.repeat_days?'<span class="wellness-v2-repeat">↻ '+Number(x.repeat_days)+' günde bir tekrarlanır</span>':'')+'</div>'
   +'<div class="pati-wellness-event-actions">'+(!finished?'<button type="button" data-action="wellness-reminder-done" data-id="'+esc(x.id)+'" '+(patiWellnessCompleting.has(x.id)?'disabled aria-busy="true"':'')+'>'+(patiWellnessCompleting.has(x.id)?'İşleniyor…':'✓ Tamamla')+'</button><button type="button" data-action="wellness-reminder-edit" data-id="'+esc(x.id)+'">Düzenle</button>':'')
   +'<button type="button" data-action="wellness-reminder-delete" data-id="'+esc(x.id)+'" class="wellness-v2-delete" aria-label="Hatırlatmayı sil">Sil</button></div></article>';
 }).join('');
 const weightPoints=weights.slice(0,6).reverse();
 const peak=Math.max(1,...weightPoints.map(w=>Number(w.weight_kg)||0));
 const weightChart=(view==='my-pet'&&patiHealthTopic==='weight'&&weightPoints.length)?'<div class="pati-ref-weight-chart"><div class="pati-ref-weight-chart-head"><span>Kilo geçmişi</span><strong>'+Number(latest?.weight_kg||0).toLocaleString('tr-TR')+' kg</strong></div><div class="pati-ref-weight-bars">'+weightPoints.map(w=>'<div class="pati-ref-weight-bar"><span style="height:'+Math.max(12,Math.round(Number(w.weight_kg)/peak*100))+'%"></span><small>'+esc(day(w.measured_on))+'</small></div>').join('')+'</div></div>':'';
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
  +weightChart+'<div class="pati-wellness-weights">'+(weightRows||'<p class="pati-wellness-empty">Henüz kilo ölçümü eklenmedi.</p>')+'</div>'
  +'<p class="pati-wellness-disclaimer">Bu kayıtlar bilgilendirme ve kişisel takip içindir; veteriner muayenesinin yerini almaz. Uygulama açık ve çevrimiçiyken yaklaşan hatırlatmaları gösterebilir. Bildirimler bölümünden telefon bildirimlerine izin verirsen zamanı geldiğinde uygulama kapalıyken de bildirim gönderilebilir; teslimat cihaz, bağlantı ve izin koşullarına bağlıdır, garanti edilmez. Acil sağlık sorunlarında veteriner hekime başvur.</p>'
  :'<div class="pati-wellness-empty-card"><h2>Önce patili dostunu ekle 🐾</h2><p>Sağlık ve kilo takibi için hayvan profili gerekli.</p><button type="button" data-action="pet-add">＋ Hayvan ekle</button></div>')
  +'</section>';
}
function patiWellnessReminderDialog(existing,presetKind='vaccine'){
 if(!patiWellnessOwnedPets().length)return notify('Önce hayvan profili ekle.',true);
 if(existing&&(!patiWellness.reminders.some(x=>x.id===existing.id)||existing.completed_at||!patiWellnessOwnedPets().some(p=>p.id===existing.pet_id)))return notify('Bu hatırlatma düzenlenemez.',true);
 const future=new Date(Date.now()+86400000);
 const dateLocal=existing?patiWellnessDateLocal(existing.due_at):patiWellnessDateLocal(future);
 const one=(key,value)=>String(key)===String(value)?' selected':'';
 modal(existing?'Hatırlatmayı düzenle':'Yeni sağlık hatırlatması',patiPetSelector()+
 '<label class="pati-wellness-field">Hatırlatma türü<select name="kind">'+Object.entries(patiReminderNames).map(([k,v])=>'<option value="'+esc(k)+'"'+one(k,existing?.kind||presetKind)+'>'+esc(v)+'</option>').join('')+'</select></label>'+
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
 if(!editId){
  const date=patiCareDate(rec.due_at);
  const category={vaccine:'Aşı',vet:'Veteriner',medicine:'İlaç',food:'Mama'}[rec.kind]||'Bakım';
  const key=[rec.pet_id,date,careFold(category),careFold(rec.title)].join('|');
  const existing=patiWellness.reminders.some(x=>x.pet_id===rec.pet_id&&x.id!==editId&&[x.pet_id,patiCareDate(x.due_at),careFold({vaccine:'Aşı',vet:'Veteriner',medicine:'İlaç',food:'Mama'}[x.kind]||'Bakım'),careFold(x.title)].join('|')===key);
  if(existing||careOwnItems().some(x=>patiCareTaskKey(x)===key))throw Error('Bu tarihte aynı bakım hatırlatması zaten bulunuyor.');
  rec.owner_id=me.id;
 }
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
const patiWellnessCompleting=new Set();
async function patiWellnessToggle(id){
 const entry=patiWellness.reminders.find(x=>x.id===id&&patiWellnessOwnedPets().some(p=>p.id===x.pet_id));
 if(!entry||entry.completed_at||patiWellnessCompleting.has(id))return;
 patiWellnessCompleting.add(id);
 try{
  await run(async()=>{
   const r=await sb.rpc('patiyiz_complete_pet_reminder',{p_id:id});
   if(r.error)throw r.error;
   await patiWellnessFetch(true);
   notify(entry.repeat_days?'Tamamlandı. Sonraki hatırlatma takvime eklendi.':'Hatırlatma tamamlandı.');
  });
 }finally{
  patiWellnessCompleting.delete(id);
  if(view==='care'||(view==='my-pet'&&patiMyPetTab==='care'))render();
 }
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
 if(!me||!sb)return;
 try{
  const tracked=await sb.rpc('patiyiz_track_daily_active');
  if(tracked.error)console.warn('Günlük aktiflik kaydı:',tracked.error.message);
  void patiWeeklyRefresh(true);
 }catch(error){console.warn('Haftalık aktivite:',error)}
}
async function patiWeeklyRefresh(force=false){
 if(!me||!sb)return;
 const uid=me.id,state=patiWeeklyState;
 if(state.loading)return;
 if(!force&&state.owner===uid&&state.ready&&Date.now()-state.updatedAt<90000)return;
 state.owner=uid;state.loading=true;state.error='';
 try{
  const response=await sb.rpc('patiyiz_weekly_leaderboard');
  if(response.error)throw response.error;
  if(me?.id!==uid||patiWeeklyState!==state)return;
  state.ready=true;state.result=response.data||{};state.updatedAt=Date.now();
 }catch(error){
  if(me?.id===uid&&patiWeeklyState===state){
   state.error='Haftalık sıralama yüklenemedi.';console.warn('Haftalık sıralama:',error);
  }
 }finally{
  state.loading=false;
  if(me?.id===uid&&patiWeeklyState===state&&['rewards','streaks'].includes(view)){
   const slot=main.querySelector('#pati-weekly-board');
   if(slot)slot.outerHTML=patiWeeklyBoard();
  }
 }
}
function patiWeeklyBoard(){
 const state=patiWeeklyState;
 const result=state.result||{};
 const leaders=Array.isArray(result.leaders)?result.leaders:[];
 const previous=Array.isArray(result.previous_winners)?result.previous_winners:[];
 const shortDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '';
  const [year,month,day]=value.split('-').map(Number);
  return day+' '+['','Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][month];
 };
 const portrait=p=>p?.avatar_url?'<img class="pati-weekly-avatar" src="'+esc(p.avatar_url)+'" alt="" loading="lazy" decoding="async">':'<span class="pati-weekly-avatar pati-weekly-avatar-fallback" aria-hidden="true">★</span>';
 const cards=[1,2].map(rank=>{
  const p=leaders.find(row=>Number(row.rank)===rank);
  const gold=rank===1,prize=gold?100:50;
  return '<article class="pati-weekly-person '+(gold?'is-gold':'is-bronze')+'">'+
   '<span class="pati-weekly-place">'+(gold?'👑 HAFTANIN LİDERİ':'🥉 İKİNCİ SIRA')+'</span>'+
   (p&&!blocked.has(p.user_id)?'<button type="button" class="pati-weekly-profile" data-action="view-user" data-id="'+esc(p.user_id)+'" aria-label="'+esc((p.name||'Kullanıcı')+' profiline git')+'">'+
    '<span class="pati-weekly-avatar-ring">'+portrait(p)+'</span>'+
    '<span class="pati-weekly-person-name">'+esc(p.name||p.handle||'Patiyiz üyesi')+'</span>'+
    '<span class="pati-weekly-handle">@'+esc(p.handle||'patiyiz')+'</span></button>':
    '<span class="pati-weekly-empty">Bu sıra henüz boş</span>')+
   '<div class="pati-weekly-bottom"><span>'+(p&&!blocked.has(p.user_id)?Number(p.score||0).toLocaleString('tr-TR')+' puan':'Sıralama bekleniyor')+'</span>'+
   '<strong>+'+prize+'  Puan</strong></div></article>';
 }).join('');
 const compactRows=[3,4,5].map(rank=>{
  const p=leaders.find(row=>Number(row.rank)===rank);
  const available=p&&!blocked.has(p.user_id);
  return '<div class="pati-weekly-compact-row'+(available?'':' is-empty')+'">'+
    '<span class="pati-weekly-compact-rank" aria-label="'+rank+'. sıra">'+rank+'.</span>'+
    (available?'<button type="button" class="pati-weekly-compact-profile" data-action="view-user" data-id="'+esc(p.user_id)+'" aria-label="'+rank+'. sıradaki '+esc(p.name||p.handle||'kullanıcı')+' profilini aç">'+
      '<span class="pati-weekly-mini-avatar">'+portrait(p)+'</span>'+
      '<span class="pati-weekly-compact-name"><strong>'+esc(p.name||p.handle||'Patiyiz üyesi')+'</strong><small>@'+esc(p.handle||'patiyiz')+'</small></span>'+
      '<span class="pati-weekly-compact-score"><strong>'+Number(p.score||0).toLocaleString('tr-TR')+'</strong><small>puan</small></span></button>':
      '<div class="pati-weekly-compact-placeholder"><span class="pati-weekly-mini-avatar" aria-hidden="true">🐾</span><span>Bu sıra henüz boş</span></div>')+
    '</div>';
 }).join('');
 const past=previous.length?'<div class="pati-weekly-previous"><strong>Geçen haftanın kazananları</strong>'+
  previous.map(p=>'<span>'+(Number(p.rank)===1?'🥇':'🥉')+' '+esc(p.name||p.handle||'Patiyiz üyesi')+' · +'+Number(p.coins||0)+' Puan</span>').join('')+'</div>':'';
 const empty=state.error?'<p role="status" class="pati-weekly-status">'+esc(state.error)+'</p>':
 (!state.ready?'<p class="pati-weekly-status">Haftalık sıralama yükleniyor…</p>':'');
 return '<section class="pati-weekly-board" id="pati-weekly-board" aria-label="Haftanın en aktif kullanıcıları">'+
  '<header class="pati-weekly-head"><div><span>🏆 HAFTALIK PATİ LİGİ</span><h2>Haftanın en aktif 5 üyesi</h2><p>'+
   (result.week_start&&result.week_end?shortDate(result.week_start)+' – '+shortDate(result.week_end)+' · ':'')+
   'Pazartesi–pazar · Türkiye saati</p></div><button type="button" data-action="pati-weekly-refresh" aria-label="Haftalık sıralamayı yenile">↻ Yenile</button></header>'+
  empty+'<div class="pati-weekly-podium">'+cards+'</div><div class="pati-weekly-runners" aria-label="3, 4 ve 5. sıradaki kullanıcılar">'+compactRows+'</div>'+past+
  '<p class="pati-weekly-rules">Gönderi, yorum, beğeni ve aktif günlerden puan kazanılır. Her türde haftalık üst sınır vardır. Pazar gecesi sıralama kapanır; pazartesi 00.05 sonrası birinciye 100, ikinciye 50 Puan otomatik ve yalnızca bir kez verilir. Beraberliklerde aktif gün sayısı, ardından hesap kimliği esas alınır.</p>'+
  '</section>';
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
 const state=typeof patiPetsState!=='undefined'&&patiPetsState.owner===me.id?patiPetsState:null;
 const source=state?.ready?[...state.rows,...data.pets]:data.pets;
 const others=[...new Map(source.map(p=>[p.id,p])).values()]
  .filter(p=>p.owner_id!==me.id&&!blocked.has(p.owner_id))
  .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||String(b.id).localeCompare(String(a.id)));
 const petItem=(p,i,editable=false)=>'<div class="pati-pet-list-item"><button type="button" class="pati-pets-tile" data-action="view-user" data-id="'+esc(p.owner_id)+'" aria-label="'+esc(p.name||'Patili dost')+' sahibinin profilini aç">'+
 '<div class="pati-pets-photo">'+(p.photo_url?'<img src="'+esc(p.photo_url)+'" alt="'+esc(p.name||'Patili dost')+'" loading="'+(i<6?'eager':'lazy')+'" decoding="async">':'<span>'+petIcon(p.species)+'</span>')+'</div>'+
 '<div class="pati-pets-info"><strong>'+esc(p.name||'Patili dost')+'</strong><small>'+esc(p.species||'Hayvan')+(p.breed?' · '+esc(p.breed):'')+'</small></div></button>'+
 (editable?'<button type="button" class="pati-pets-edit" data-action="pet-edit" data-id="'+esc(p.id)+'" aria-label="'+esc(p.name||'Patili dost')+' düzenle">'+ico('edit')+' Düzenle</button>':'')+'</div>';
 main.innerHTML='<section class="pati-pets-page"><div class="pati-pets-heading"><div><h1>Patiler</h1><p>Topluluğumuzdaki patili dostlarla tanış.</p></div></div>'+
 '<div class="pati-pets-own-shortcut"><span>Kendi dostlarının profilleri Hayvanım Merkezi içerisinde.</span><button type="button" data-view="my-pet">Hayvanlarım →</button></div>'+
 '<h2>Topluluktaki Patiler</h2><div class="pati-pets-grid">'+(others.length?others.map((p,i)=>petItem(p,i)).join(''):state?.loading?'<p class="pati-pets-empty" role="status">Patiler yükleniyor…</p>':'<p class="pati-pets-empty">Henüz başka patili dost bulunmuyor.</p>')+'</div>'+
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
let patiKbBrowseAll=false;
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
 if(kbCategory==='Tümü'&&kbFilter==='Tümü'&&!kbSearch&&!patiKbBrowseAll){
  const topics=kbCategoryOptions().filter(t=>t!=='Tümü');
  const accents=['sea','peach','lilac','mint','sun','blue'];
  const symbols=['🩺','🥣','🐾','🧼','📚','🦴','💗','🐱'];
  main.innerHTML='<section class="kb-v2 pati-ref-kb-home"><header class="pati-ref-kb-head"><span>🐾 PATİYİZ REHBERLERİ</span><h1>Birlikte daha iyi bakıyoruz.</h1><p>Bakım, sağlık ve beslenme hakkında pratik bilgiler.</p><button type="button" data-action="pati-kb-search-open">⌕ Rehber ara</button></header>'+
   '<div class="pati-ref-kb-top"><h2>Bilgi Merkezi</h2><button type="button" data-action="kb-filter" data-id="Kaydedilenler">♡ Kaydettiklerim ('+saved+')</button></div>'+
   '<div class="pati-ref-kb-categories">'+topics.map((topic,i)=>'<button type="button" class="pati-ref-kb-category pati-ref-kb-'+accents[i%accents.length]+'" data-action="kb-category" data-id="'+esc(topic)+'"><span class="pati-ref-kb-symbol">'+symbols[i%symbols.length]+'</span><strong>'+esc(topic)+'</strong><small>'+knowledge.filter(a=>a.category===topic).length+' rehber →</small></button>').join('')+'</div>'+
   '<div class="p4-knowledge-recs"><div class="p4-kb-rec-title"><h2>Öne Çıkan Rehberler</h2><button type="button" data-action="pati-kb-search-open">Tümünü gör →</button></div>'+knowledge.slice(0,3).map(a=>'<button type="button" class="p4-kb-rec" data-action="kb-read" data-id="'+esc(a.id)+'"><span class="p4-kb-rec-icon">'+petIcon(a.species)+'</span><span><strong>'+esc(a.title)+'</strong><small>'+esc(a.category)+'</small></span><span aria-hidden="true">›</span></button>').join('')+'</div>'+ 
   '<div class="pati-ref-kb-footer"><span>🩺</span><p>Rehberler genel bilgilendirme amaçlıdır; veteriner hekim görüşünün yerini almaz.</p></div></section>';
  return;
 }
 main.innerHTML='<section class="kb-v2 pati-ref-kb-list"><div class="pati-ref-topic-toolbar"><button type="button" data-action="pati-kb-home">← Bilgi Merkezi</button><strong>'+esc(kbFilter==='Kaydedilenler'?'Kaydedilenler':kbCategory==='Tümü'?'Rehberler':kbCategory)+'</strong></div><div class="kb-v2-title"><div><span class="kb-v2-subtitle">PATİYİZ REHBERLERİ</span><h1>Bilgi Merkezi</h1><p>Patili dostun için güvenilir kaynaklarla daha bilinçli bakım.</p></div><span class="kb-v2-total">'+total+' rehber</span></div>'
  +'<div class="kb-v2-hero"><div><span>ÜCRETSİZ BİLGİ KÜTÜPHANESİ</span><h2>Her pati daha iyi bakımı hak eder.</h2><p>Bakım, sağlık, beslenme ve davranış rehberleri tek yerde.</p></div><span class="kb-v2-hero-mark" aria-hidden="true">🐾</span></div>'
  +'<div class="kb-v2-shortcuts"><button type="button" data-action="kb-filter" data-id="Tümü" class="'+(kbFilter==='Tümü'?'is-active':'')+'"><span aria-hidden="true">▦</span><strong>Tüm rehberler</strong><small>'+total+' içerik</small></button>'
  +'<button type="button" data-action="kb-filter" data-id="Kaydedilenler" class="'+(kbFilter==='Kaydedilenler'?'is-active':'')+'"><span aria-hidden="true">♡</span><strong>Kaydettiklerim</strong><small><span id="kb-saved-count">'+saved+'</span> rehber</small></button></div>'
  +'<label for="kb-search" class="kb-v2-search-label">Rehberlerde ara</label><div class="kb-v2-search"><span aria-hidden="true">⌕</span><input id="kb-search" type="search" inputmode="search" autocomplete="off" placeholder="Örn. beslenme, tuvalet, yavru bakımı..." value="'+esc(kbSearch)+'" aria-controls="kb-results"><button type="button" data-action="kb-clear" aria-label="Aramayı temizle">Temizle</button></div>'
  +'<div class="kb-v2-filter-head"><strong>Hayvan türü</strong><small>Bir tür seç</small></div><div class="kb-v2-chips" role="group" aria-label="Hayvan türü">'+kbSpeciesOptions.map(t=>'<button type="button" data-action="kb-filter" data-id="'+esc(t)+'" class="'+(kbFilter===t?'is-active':'')+'" aria-pressed="'+String(kbFilter===t)+'">'+esc(t)+'</button>').join('')+'</div>'
  +'<div class="kb-v2-filter-head"><strong>Konu</strong><small>İlgilendiğin alan</small></div><div class="kb-v2-chips kb-v2-categories" role="group" aria-label="Rehber konusu">'+kbCategoryOptions().map(t=>'<button type="button" data-action="kb-category" data-id="'+esc(t)+'" class="'+(kbCategory===t?'is-active':'')+'" aria-pressed="'+String(kbCategory===t)+'">'+esc(t)+'</button>').join('')+'</div>'
  +'<div class="kb-v2-results-head"><h2>Rehberleri keşfet</h2><span id="kb-count" role="status" aria-live="polite">'+items.length+' rehber bulundu</span></div><div id="kb-results" class="kb-v2-grid">'+kbCards(items)+'</div>'
  +'<p class="kb-v2-list-note">Rehberlerdeki bilgiler genel bilgilendirme amaçlıdır; veteriner hekimin önerisinin yerini almaz.</p></section>';
}

let patiLostDetailId='',patiAdoptionDetailId='';
function patiListingDetail(type,x){
 const lost=type==='lost',own=x.owner_id===me?.id,closed=lost?!!x.found:!!x.adopted;
 const label=lost?'Kayıp İlanları':'Sahiplendirme';
 const status=lost?(closed?'✓ Bulundu':'● Aranıyor'):(closed?'✓ Sahiplendirildi':'♡ Yuva arıyor');
 const back=lost?'pati-lost-back':'pati-adoption-back';
 const actions=own?(lost?'<button type="button" data-action="lost-edit" data-id="'+esc(x.id)+'">Düzenle</button><button type="button" data-action="toggle-found" data-id="'+esc(x.id)+'">'+(closed?'Yeniden kayıp':'✓ Bulundu')+'</button><button type="button" data-action="delete-lost" data-id="'+esc(x.id)+'">Sil</button>':'<button type="button" data-action="adoption-edit" data-id="'+esc(x.id)+'">Düzenle</button><button type="button" data-action="adoption-toggle" data-id="'+esc(x.id)+'">'+(closed?'Yeniden yayına al':'✓ Sahiplendirildi')+'</button><button type="button" data-action="adoption-delete" data-id="'+esc(x.id)+'">Sil</button>'):
  (!closed?'<button type="button" class="pati-ref-contact" data-action="chat" data-id="'+esc(x.owner_id)+'">✉ Sahibine mesaj gönder</button>':'')+'<button type="button" data-action="report" data-id="'+esc(x.id)+'" data-kind="'+type+'">Bildir</button>';
 const image=x.photo_url?'<img src="'+esc(x.photo_url)+'" alt="'+esc(x.name||'Hayvan')+' fotoğrafı">':'<div class="pati-ref-listing-no-photo">'+petIcon(x.species)+'</div>';
 main.innerHTML='<section class="pati-ref-listing-detail"><button type="button" class="pati-ref-listing-back" data-action="'+back+'">← '+label+'</button><div class="pati-ref-listing-photo">'+image+'</div>'+
 '<div class="pati-ref-listing-info"><span class="pati-ref-listing-status">'+status+'</span><h1>'+esc(x.name||'Patili dost')+'</h1><p>'+esc([x.species,x.age,x.gender].filter(Boolean).join(' · '))+'</p>'+
 '<div class="pati-ref-listing-city">📍 '+esc(x.city||'Şehir belirtilmedi')+(x.district?' / '+esc(x.district):'')+'</div>'+
 '<h2>'+(lost?'Kayıp bilgileri':'Hakkında')+'</h2><p class="pati-ref-listing-description">'+esc(x.description||'Açıklama eklenmemiş.')+'</p>'+
 '<div class="pati-ref-listing-controls">'+actions+'<button type="button" data-action="'+(lost?'lost-share':'adoption-share')+'" data-id="'+esc(x.id)+'">Paylaş ↗</button></div>'+
 '<p class="pati-ref-listing-safety">🔒 Güvenliğin için açık adres veya telefon paylaşma. İletişimi uygulama içindeki mesajlarla sürdür.</p></div></section>';
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
  +'<span class="lost-v2-badge '+(found?'is-found':'')+'">'+(found?'✓ Bulundu · İlan kapalı':'● Aranıyor')+'</span></div>'
  +'<div class="lost-v2-card-info"><div class="lost-v2-meta"><span>'+esc(x.species)+'</span><time>'+esc(day(x.last_seen))+'</time></div>'
  +'<h3>'+esc(x.name)+'</h3><p class="lost-v2-city">📍 '+esc(x.city)+(x.district?' / '+esc(x.district):'')+'</p>'
  +'<p class="lost-v2-description">'+esc(x.description)+'</p><button type="button" class="pati-ref-listing-view" data-action="pati-lost-open" data-id="'+esc(x.id)+'">Detayları gör →</button><div class="lost-v2-actions">'
  +(own?'<button type="button" data-action="lost-edit" data-id="'+esc(x.id)+'">Düzenle</button><button type="button" class="pati-lost-close-btn" data-action="toggle-found" data-id="'+esc(x.id)+'">'+(found?'↶ İlanı yeniden aç':'✓ Bulundu · İlanı kapat')+'</button><button type="button" data-action="delete-lost" data-id="'+esc(x.id)+'" class="lost-v2-danger">Sil</button>'
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
let patiLostAlert={owner:'',loaded:false,loading:false,enabled:false,city:''};
async function patiLostAlertLoad(){
 if(!me?.id||typeof sb==='undefined'||!sb)return;
 if(patiLostAlert.owner!==me.id)patiLostAlert={owner:me.id,loaded:false,loading:false,enabled:false,city:''};
 if(patiLostAlert.loading||patiLostAlert.loaded)return;
 const owner=me.id;patiLostAlert.loading=true;
 try{const r=await sb.from('patiyiz_lost_city_alerts').select('city,enabled').eq('user_id',owner).maybeSingle();
  if(r.error)throw r.error;if(me?.id!==owner)return;
  patiLostAlert={owner,loaded:true,loading:false,city:r.data?.city||'',enabled:!!r.data?.enabled};
 }catch(e){console.warn('Şehir bildirimi okunamadı:',e?.message||e)}
 finally{patiLostAlert.loading=false;if(view==='lost')patiLostAlertRefresh()}
}
function patiLostAlertMarkup(){
 const city=String((typeof current==='function'?current()?.city:'')||'').trim(),active=patiLostAlert.enabled&&patiLostAlert.city.toLocaleLowerCase('tr-TR')===city.toLocaleLowerCase('tr-TR');
 return '<section class="pati-city-alert"><div><strong>🔔 Şehrimdeki kayıp hayvanlar</strong><p>'+(city?esc(city)+' için yeni ilan bildirimi · '+(active?'✓ Açık (isteğe bağlı)':'Kapalı (isteğe bağlı)')+'. Açık adres ve konum izni kullanılmaz.':'Bildirimleri açmak için profilinde şehir belirt.')+'</p><small>Telefon bildirimi ayrıca cihaz iznine bağlıdır.</small></div><button type="button" data-action="lost-city-alert-toggle" '+(!city||patiLostAlert.loading?'disabled':'')+' aria-pressed="'+active+'">'+(patiLostAlert.loading?'Yükleniyor…':active?'Bildirimleri kapat':'Bildirimleri aç')+'</button></section>';
}
function patiLostAlertRefresh(){const target=document.getElementById('pati-lost-alert-subscribe');if(target)target.innerHTML=patiLostAlertMarkup()}
async function patiLostAlertToggle(){
 if(!me?.id||patiLostAlert.loading)return;
 const owner=me.id,city=String(current()?.city||'').trim();
 if(city.length<2||city.length>80)return notify('Profiline geçerli bir şehir ekle.',true);
 const enabled=patiLostAlert.enabled&&patiLostAlert.city.toLocaleLowerCase('tr-TR')===city.toLocaleLowerCase('tr-TR');
 patiLostAlert.loading=true;patiLostAlertRefresh();
 try{const r=await sb.from('patiyiz_lost_city_alerts').upsert({user_id:owner,city,enabled:!enabled,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(r.error)throw r.error;if(me?.id!==owner)return;
  patiLostAlert={owner,loaded:true,loading:false,city,enabled:!enabled};
  notify(enabled?'Kayıp hayvan bildirimleri kapatıldı.':'Yeni kayıp ilanlarını uygulama içinde göreceksin. Telefon bildirimi için ayrıca izin vermelisin.');
 }catch(e){notify(friendly(e),true)}finally{patiLostAlert.loading=false;patiLostAlertRefresh()}
}
let lostPhotoObjectUrl='';
function lostPage(){
 if(patiLostAlert.owner!==me?.id||!patiLostAlert.loaded&&!patiLostAlert.loading)void patiLostAlertLoad();
 const detail=data.lost.find(x=>x.id===(typeof patiLostDetailId==='string'?patiLostDetailId:'')&&!blocked.has(x.owner_id));
 if(detail){patiListingDetail('lost',detail);return}
 const safe=data.lost.filter(x=>!blocked.has(x.owner_id));
 const counts={missing:safe.filter(x=>!x.found).length,found:safe.filter(x=>x.found).length,mine:safe.filter(x=>x.owner_id===me?.id).length};
 const kinds=['Tümü',...new Set(safe.map(x=>x.species).filter(Boolean))];
 const list=lostMatches();
 main.innerHTML='<section class="lost-v2"><div class="lost-v2-heading"><div><small>PATİYİZ · YARDIMLAŞMA</small><h1>Kayıp İlanları</h1><p>Kaybolan dostlarımızı birlikte bulalım.</p></div><button type="button" data-action="lost-add" class="lost-v2-create">+ İlan oluştur</button></div>'
 +'<div class="lost-v2-hero"><div><small>TOPLULUK DESTEĞİ</small><h2>Bir paylaşım, bir kavuşma olabilir.</h2><p>Kayıp hayvanları bulmak için birlikte hareket edelim.</p></div><span>🐾</span></div>'
 +'<div class="lost-v2-stats"><div><b>'+counts.missing+'</b><span>Aranıyor</span></div><div><b>'+counts.found+'</b><span>Bulundu</span></div><div><b>'+counts.mine+'</b><span>İlanlarım</span></div></div>'
 +'<p class="lost-v2-privacy">🔒 Açık adres veya telefon numarası paylaşma. Yalnızca şehir / ilçe belirt; iletişim uygulama içi mesajlarla yapılsın.</p>'
 +'<div id="pati-lost-alert-subscribe">'+patiLostAlertMarkup()+'</div>'
 +'<div class="p4-list-tabs" role="group" aria-label="Kayıp ilanı durumları">'+[['missing','Aranıyor'],['found','Bulundu'],['mine','İlanlarım']].map(([k,t])=>'<button type="button" data-action="lost-status" data-id="'+k+'" class="'+(lostStatus===k?'active':'')+'" aria-pressed="'+(lostStatus===k)+'">'+t+'</button>').join('')+'</div>'+'<details class="pati-ref-listing-filters"><summary>⌕ Ara ve filtrele</summary><label for="lost-search">İlanlarda ara</label><div class="lost-v2-search"><input id="lost-search" type="search" value="'+esc(lostSearch)+'" placeholder="Hayvan adı, tür, şehir veya ilçe..." autocomplete="off" aria-controls="lost-results"><button type="button" data-action="lost-clear">Temizle</button></div>'
 +'<div class="lost-v2-row"><strong>Durum</strong><button type="button" data-action="lost-refresh"'+(lostLoading?' disabled':'')+'>'+(lostLoading?'Yenileniyor…':'↻ Yenile')+'</button></div>'

 +'<div class="lost-v2-row"><strong>Hayvan türü</strong></div><div class="lost-v2-filters" role="group" aria-label="Hayvan türü">'+kinds.map(x=>'<button type="button" data-action="lost-species" data-id="'+esc(x)+'" class="'+(lostSpecies===x?'active':'')+'" aria-pressed="'+(lostSpecies===x)+'">'+esc(x)+'</button>').join('')+'</div>'
 +'</details>'
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
   +'<p class="adopt-v2-description">'+esc(x.description)+'</p><button type="button" class="pati-ref-listing-view" data-action="pati-adoption-open" data-id="'+esc(x.id)+'">Detayları gör →</button>'
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
 const detail=data.adoption.find(x=>x.id===(typeof patiAdoptionDetailId==='string'?patiAdoptionDetailId:'')&&!blocked.has(x.owner_id));
 if(detail){patiListingDetail('adoption',detail);return}
 const visible=data.adoption.filter(x=>!blocked.has(x.owner_id));
 const counts={open:visible.filter(x=>!x.adopted).length,adopted:visible.filter(x=>x.adopted).length,mine:visible.filter(x=>x.owner_id===me?.id).length};
 const kinds=['Tümü',...new Set(visible.map(x=>x.species).filter(Boolean))];
 const list=adoptionMatches();
 main.innerHTML='<section class="adopt-v2">'
  +'<div class="adopt-v2-heading"><div><small>PATİYİZ · YUVA BUL</small><h1>Sahiplendirme</h1><p>Patili dostlarımız için güvenli ve sevgi dolu yuvalar.</p></div><button type="button" data-action="adoption-add" class="adopt-v2-create">+ İlan oluştur</button></div>'
  +'<div class="adopt-v2-hero"><div><small>SORUMLU SAHİPLENME</small><h2>Bir dost, ömür boyu sorumluluk.</h2><p>İlanları keşfet, sorularını mesajla sor ve doğru yuva için güvenle iletişime geç.</p></div><span aria-hidden="true">🐾</span></div>'
  +'<div class="adopt-v2-stats"><div><b>'+counts.open+'</b><span>Yuva arıyor</span></div><div><b>'+counts.adopted+'</b><span>Sahiplendirildi</span></div><div><b>'+counts.mine+'</b><span>İlanlarım</span></div></div>'
  +'<p class="adopt-v2-safety">🔒 Sahiplendirme ilanları ücretsizdir. Açık adresini ve telefon numaranı yazma. İletişimi uygulama içi mesajlardan yap; sağlık, bakım koşulları ve sorumlulukları görüş.</p>'
  +'<div class="p4-list-tabs" role="group" aria-label="Sahiplendirme türleri">'+['Tümü','Kedi','Köpek',...kinds.filter(k=>!['Tümü','Kedi','Köpek'].includes(k)).slice(0,1)].filter((k,i,arr)=>arr.indexOf(k)===i).map(k=>'<button type="button" data-action="adoption-species" data-id="'+esc(k)+'" class="'+(adoptionSpecies===k?'active':'')+'" aria-pressed="'+(adoptionSpecies===k)+'">'+(k==='Tümü'?'Tümü':k)+'</button>').join('')+'</div>'+'<details class="pati-ref-listing-filters"><summary>⌕ Ara ve filtrele</summary><label for="adoption-search">İlanlarda ara</label><div class="adopt-v2-search"><input id="adoption-search" type="search" value="'+esc(adoptionSearch)+'" autocomplete="off" aria-controls="adoption-results" placeholder="Hayvan adı, şehir, ilçe, tür…"><button type="button" data-action="adoption-clear">Temizle</button></div>'
  +'<div class="adopt-v2-row"><strong>İlan durumu</strong><button type="button" data-action="adoption-refresh"'+(adoptionLoading?' disabled':'')+'>'+(adoptionLoading?'Yenileniyor…':'↻ Yenile')+'</button></div>'
  +'<div class="adopt-v2-filters" role="group" aria-label="İlan durumu">'+[['open','Yuva arıyor ('+counts.open+')'],['adopted','Sahiplendirildi ('+counts.adopted+')'],['mine','İlanlarım ('+counts.mine+')'],['all','Tümü']].map(([key,label])=>'<button type="button" data-action="adoption-status" data-id="'+key+'" class="'+(adoptionStatus===key?'active':'')+'" aria-pressed="'+String(adoptionStatus===key)+'">'+label+'</button>').join('')+'</div>'

  +'</details>'
 +(adoptionLoadError?'<p role="alert" class="adopt-v2-error">'+esc(adoptionLoadError)+'</p>':'')
  +'<div class="adopt-v2-results-head"><h2>Yuva arayan dostlar</h2><span id="adoption-results-count" role="status" aria-live="polite">'+list.length+' ilan</span></div>'
  +'<div class="adopt-v2-grid" id="adoption-results">'+(adoptionLoading?'<p role="status" class="adopt-v2-loading">İlanlar yükleniyor…</p>':adoptionCards(list))+'</div></section>';
}
let carePetFilter='all',careCategoryFilter='Tümü',careSearch='',careLoading=false,careLoadError='';
let patiCareSelectedDate='';
let patiCareMonth='';
const CARE_CATEGORIES=['Aşı','Veteriner','İlaç','Mama','Bakım','Diğer'];
function careToday(){return new Date().toLocaleDateString('sv-SE')}
function careDateValid(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return false;const d=new Date(v+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v}
function patiCareDate(raw){
 if(typeof raw==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
 const date=new Date(raw);
 return Number.isNaN(date.getTime())?'':date.toLocaleDateString('sv-SE');
}
function patiCareCalendarMarkup(tasks,reminders){
 const month=/^\d{4}-\d{2}$/.test(patiCareMonth)?patiCareMonth:careToday().slice(0,7);
 const [y,m]=month.split('-').map(Number),first=new Date(y,m-1,1);
 const start=new Date(y,m-1,1-(first.getDay()+6)%7);
 const counts=new Map();
 for(const t of tasks){if(t.due_date)counts.set(t.due_date,(counts.get(t.due_date)||0)+1)}
 for(const t of reminders){const day=patiCareDate(t.due_at);if(day)counts.set(day,(counts.get(day)||0)+1)}
 return '<section class="pati-care-calendar" aria-label="Aşı, veteriner ve bakım takvimi">'+
 '<div class="pati-care-calendar-head"><button type="button" data-action="pati-care-month" data-id="-1" aria-label="Önceki ay">‹</button><strong>'+esc(first.toLocaleDateString('tr-TR',{month:'long',year:'numeric'}))+'</strong><button type="button" data-action="pati-care-month" data-id="1" aria-label="Sonraki ay">›</button></div>'+
 '<div class="pati-care-calendar-days">'+['Pt','Sa','Ça','Pe','Cu','Ct','Pa'].map(x=>'<span>'+x+'</span>').join('')+'</div>'+
 '<div class="pati-care-calendar-grid">'+Array.from({length:42},(_,i)=>{
  const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),key=d.toLocaleDateString('sv-SE');
  const n=counts.get(key)||0,selected=patiCareSelectedDate===key,off=d.getMonth()!==first.getMonth();
  return '<button type="button" data-action="pati-care-day" data-id="'+key+'" aria-pressed="'+selected+'" aria-label="'+esc(d.toLocaleDateString('tr-TR',{day:'numeric',month:'long'}))+' '+n+' kayıt" class="'+(off?'is-outside ':'')+(key===careToday()?'is-today ':'')+(selected?'is-selected':'')+'"><span>'+d.getDate()+'</span>'+(n?'<i>'+n+'</i>':'')+'</button>';
 }).join('')+'</div><div class="pati-care-calendar-foot"><small>Günlere dokunarak görev ve hatırlatmaları filtrele.</small><button type="button" data-action="pati-care-clear-day">Tüm günler</button></div></section>';
}
function careFold(v){return String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim()}
function patiCareTaskKey(x){
 const category=String(x.category||'Bakım');
 return [x.pet_id||'',patiCareDate(x.due_date),careFold(category),careFold(x.title)].join('|');
}
function careOwnItems(){
 // Existing duplicate entries remain safely stored; show each task only once in the shared calendar.
 const seen=new Set();
 return data.care.filter(x=>{
  if(x.owner_id!==me?.id)return false;
  const key=patiCareTaskKey(x);
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
}
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
  &&(!patiCareSelectedDate||x.due_date===patiCareSelectedDate)
  &&(carePetFilter==='all'||(carePetFilter==='none'?!x.pet_id:x.pet_id===carePetFilter))
  &&(careCategoryFilter==='Tümü'||x.category===careCategoryFilter)
  &&(!q||careFold([x.title,x.category,data.pets.find(p=>p.id===x.pet_id&&p.owner_id===me?.id)?.name||''].join(' ')).includes(q))
 ).sort((a,b)=>Number(a.done)-Number(b.done)||String(a.due_date).localeCompare(String(b.due_date))||new Date(b.created_at)-new Date(a.created_at));
}
function careCard(x){
 const state=careDueState(x),p=data.pets.find(p=>p.id===x.pet_id&&p.owner_id===me?.id);
 const icons={Aşı:'💉',Veteriner:'🩺',İlaç:'💊',Mama:'🥣',Bakım:'🧼',Diğer:'📋'};
 const labels={late:'Gecikti',today:'Bugün',upcoming:'Planlandı',done:'Tamamlandı'};
 return '<article class="care-v2-item pati-ref-care-task '+(x.done?'is-done':'')+'">'
  +'<div class="care-v2-item-icon" aria-hidden="true">'+(icons[x.category]||'🐾')+'</div>'
  +'<div class="care-v2-item-main"><div class="care-v2-item-head"><span>'+esc(x.category||'Bakım')+'</span><span class="care-v2-item-status is-'+state+'">'+labels[state]+'</span></div>'
  +'<h3>'+esc(x.title)+'</h3>'
  +'<p><span>📅 '+esc(day(x.due_date))+'</span>'+(p?'<span>🐾 '+esc(p.name)+'</span>':'<span>Genel görev</span>')+'</p>'
  +'</div><div class="care-v2-actions">'
  +'<button type="button" class="care-v2-complete" data-action="care-done" data-id="'+esc(x.id)+'">'+(x.done?'↶ Geri al':'✓ Tamamla')+'</button>'
  +'<details class="pati-care-more"><summary aria-label="Görev seçenekleri">•••</summary><div><button type="button" data-action="care-edit" data-id="'+esc(x.id)+'">Düzenle</button><button type="button" class="care-v2-delete" data-action="care-del" data-id="'+esc(x.id)+'">Sil</button></div></details></div></article>';
}
function patiUnifiedCareReminders(ignoreFilters=false){
 if(typeof patiWellness==='undefined'||!patiWellness.loaded||!Array.isArray(patiWellness.reminders))return [];
 const own=new Set((data.pets||[]).filter(p=>p.owner_id===me?.id).map(p=>p.id));
 const careNames=new Set(careOwnItems().map(patiCareTaskKey));
 const seenReminders=new Set();
 const today=careToday(),q=careFold(careSearch);
 return patiWellness.reminders.filter(x=>{
  if(!own.has(x.pet_id))return false;
  const date=patiCareDate(x.due_at);
  const category={vaccine:'Aşı',vet:'Veteriner',medicine:'İlaç',food:'Mama'}[x.kind]||'Bakım';
   const key=[x.pet_id||'',date,careFold(category),careFold(x.title)].join('|');
   if(careNames.has(key)||seenReminders.has(key))return false;
   seenReminders.add(key);
  const state=x.completed_at?'done':date<today?'late':date===today?'today':'upcoming';
  const pet=data.pets.find(p=>p.id===x.pet_id);
  return ignoreFilters||((careFilter==='all'||careFilter===state)
   &&(!patiCareSelectedDate||date===patiCareSelectedDate)
   &&(carePetFilter==='all'||x.pet_id===carePetFilter)
   &&(careCategoryFilter==='Tümü'||({vaccine:'Aşı',vet:'Veteriner',medicine:'İlaç',food:'Mama'}[x.kind]||'Bakım')===careCategoryFilter)
   &&(!q||careFold([x.title,x.kind,pet?.name||''].join(' ')).includes(q)));
 }).sort((a,b)=>String(a.due_at).localeCompare(String(b.due_at)));
}
function patiUnifiedCareReminderCard(x){
 const pet=data.pets.find(p=>p.id===x.pet_id&&p.owner_id===me?.id);
 const date=patiCareDate(x.due_at);
 const icon={vaccine:'💉',vet:'🩺',medicine:'💊',food:'🥣'}[x.kind]||'🐾';
 return '<article class="care-v2-item pati-ref-care-task pati-unified-reminder">'
 +'<div class="care-v2-item-icon" aria-hidden="true">'+icon+'</div>'
 +'<div class="care-v2-item-main"><h3>'+esc(x.title)+'</h3><p>📅 '+esc(day(date))+(pet?' · 🐾 '+esc(pet.name):'')+'</p></div>'
 +'<div class="care-v2-actions">'+(!x.completed_at?'<button type="button" class="care-v2-complete" data-action="wellness-reminder-done" data-id="'+esc(x.id)+'">✓ Tamamla</button>':'<span class="pati-unified-done">✓ Tamamlandı</span>')
 +'<details class="pati-care-more"><summary aria-label="Hatırlatma seçenekleri">•••</summary><div>'
 +(!x.completed_at?'<button type="button" data-action="wellness-reminder-edit" data-id="'+esc(x.id)+'">Düzenle</button>':'')
 +'<button type="button" data-action="wellness-reminder-delete" data-id="'+esc(x.id)+'">Sil</button></div></details></div></article>';
}
function patiUnifiedCareCards(){
 const tasks=careVisibleItems().map(x=>({date:String(x.due_date),html:careCard(x)}));
 const reminders=patiUnifiedCareReminders().map(x=>({date:patiCareDate(x.due_at),html:patiUnifiedCareReminderCard(x)}));
 return [...tasks,...reminders].sort((a,b)=>a.date.localeCompare(b.date)).map(x=>x.html);
}
function careUpdateResults(){
 if(view!=='care'&&!(view==='my-pet'&&patiMyPetTab==='care'))return;
 const list=patiUnifiedCareCards(),result=document.getElementById('care-results'),count=document.getElementById('care-result-count');
 if(result)result.innerHTML=list.length?list.join(''):'<div class="care-v2-empty" role="status"><span>🐾</span><h3>Bu filtrelerde görev yok</h3><p>Başka bir tarih, kategori veya hayvan seçebilirsin.</p><button type="button" data-action="care-reset">Filtreleri temizle</button></div>';
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
 const all=careOwnItems(),today=careToday(),healthReminders=patiUnifiedCareReminders(true);
 const counts={
  today:all.filter(x=>!x.done&&x.due_date===today).length+healthReminders.filter(x=>!x.completed_at&&patiCareDate(x.due_at)===today).length,
  upcoming:all.filter(x=>!x.done&&x.due_date>today).length+healthReminders.filter(x=>!x.completed_at&&patiCareDate(x.due_at)>today).length,
  done:all.filter(x=>x.done).length+healthReminders.filter(x=>!!x.completed_at).length
 };
 const list=patiUnifiedCareCards();
 if(typeof patiWellnessFetch==='function'&&typeof patiWellness!=='undefined'&&!patiWellness.loaded&&!patiWellness.loading&&!patiWellness.error)void patiWellnessFetch(true);
 const active=data.pets.find(p=>p.id===(typeof patiHubSelectedPetId==='string'?patiHubSelectedPetId:'')&&p.owner_id===me?.id)||data.pets.find(p=>p.owner_id===me?.id);
 const image=active?.photo_url||(/kedi/i.test(active?.species||'')?'pati-illustration-cat.svg':'pati-illustration-dog.svg');
 const next=[...all.filter(x=>!x.done).map(x=>({title:x.title,due_date:x.due_date})),...healthReminders.filter(x=>!x.completed_at).map(x=>({title:x.title,due_date:patiCareDate(x.due_at)}))].sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)))[0];
 const filter=(k,title,value)=>'<button type="button" data-action="care-filter" data-id="'+k+'" class="pati-simple-filter '+(careFilter===k?'active':'')+'" aria-pressed="'+(careFilter===k)+'"><b>'+value+'</b><span>'+title+'</span></button>';
 main.innerHTML='<section class="care-v2 pati-care-simple pati-ref-care"><div class="pati-ref-subhead"><div><small>GÜNLÜK RUTİN</small><h1>Bakım Takvimi</h1><p>Küçük adımlar, mutlu patiler.</p></div><button type="button" class="pati-ref-add-round" data-action="care-add" aria-label="Görev ekle">+</button></div>'+
  '<div class="pati-ref-care-hero"><div class="pati-ref-care-hero-copy"><small>🐾 '+esc(active?.name||'Patili dostum')+'</small><h2>'+(next?'Yaklaşan bakım görevin var!':'Bugün patiler keyifli!')+'</h2><p>'+(next?esc(next.title)+' · '+esc(day(next.due_date)):'Yeni bir görev planlayabilirsin.')+'</p><button type="button" data-action="care-add">+ Bakım ekle</button></div><img src="'+esc(image)+'" alt="'+esc(active?.name||'Hayvan')+'" loading="lazy"></div>'+
  patiCareCalendarMarkup(all,healthReminders)+
  '<div class="pati-care-quick" role="group" aria-label="Sağlık ve bakım ekle">'+
  [['vaccine','💉','Aşı'],['vet','🩺','Veteriner'],['medicine','💊','İlaç'],['food','🥣','Beslenme']].map(([id,icon,label])=>
  '<button type="button" data-action="pati-care-quick" data-id="'+id+'"><span>'+icon+'</span><strong>'+label+'</strong><small>Hatırlatma ekle</small></button>').join('')+'</div>'+
  '<div class="pati-ref-care-summary"><strong>Bakım durumun</strong><small>Bir bölümü seçerek görevlerini görüntüle.</small></div><div class="pati-simple-filters" role="group" aria-label="Görev durumu">'+filter('today','Bugün',counts.today)+filter('upcoming','Yaklaşan',counts.upcoming)+filter('done','Tamamlanan',counts.done)+'</div>'+
  '<div class="pati-simple-list-head"><h2>Bakım Listesi</h2><button type="button" data-action="care-filter" data-id="all" aria-pressed="'+(careFilter==='all')+'">Tüm görevler →</button></div>'+
  (careLoadError?'<p class="care-v2-error" role="alert">'+esc(careLoadError)+'</p>':'')+
  '<div class="care-v2-list pati-ref-care-timeline" id="care-results">'+(careLoading?'<p role="status">Görevler yükleniyor…</p>':list.length?list.join(''):'<div class="pati-simple-empty" role="status"><span>🐾</span><strong>Bu bölümde görev yok.</strong><p>Dilersen yeni bir görev ekleyebilirsin.</p><button type="button" data-action="care-add">+ Görev ekle</button></div>')+'</div>'+
  '<p class="pati-simple-disclaimer">Takvim, veteriner önerilerinin yerini almaz; görev kaydı tek başına cihaz bildirimi göndermez.</p></section>';
}
let dmRecorder=null,dmParts=[],dmStream=null,dmCancel=false,dmRecipient=null;
let patiDmRecordTimer=null,patiDmRecordStart=0;
function patiDmRecordTimerStop(){if(patiDmRecordTimer){clearInterval(patiDmRecordTimer);patiDmRecordTimer=null;}}
function patiDmRecordTimerStart(){
 patiDmRecordTimerStop();patiDmRecordStart=Date.now();
 const update=()=>{
  const target=document.querySelector('.pati-dm-record-elapsed');
  if(!target)return;
  const seconds=Math.min(120,Math.floor((Date.now()-patiDmRecordStart)/1000));
  target.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  if(seconds>=120&&dmRecorder?.state==='recording'){notify('Ses kaydı 2 dakika sınırına ulaştı.');dmRecorder.stop();}
 };
 update();patiDmRecordTimer=setInterval(update,500);
}
async function uploadDmFile(file,type,receiver){if(!file?.size||file.size>8388608)throw Error('Dosya en fazla 8 MB olabilir.');const mime=file.type.split(';')[0];if(type==='image'&&!['image/jpeg','image/png','image/webp','image/gif'].includes(mime))throw Error('JPG, PNG, WebP veya GIF seç.');if(type==='audio'&&!['audio/webm','audio/mp4','audio/ogg','audio/mpeg'].includes(mime))throw Error('Ses biçimi desteklenmiyor.');const ext=type==='image'?(mime==='image/gif'?'gif':mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'):(mime==='audio/mp4'?'m4a':mime==='audio/ogg'?'ogg':mime==='audio/mpeg'?'mp3':'webm');const author=me?.id;if(!author)throw Error('Mesaj göndermek için giriş yap.');const path=author+'/'+crypto.randomUUID()+'.'+ext;const up=await sb.storage.from('patiyiz-private-messages').upload(path,file,{contentType:mime});if(up.error)throw up.error;try{if(me?.id!==author)throw Error('Oturum değişti. Mesaj gönderilmedi.');const m=await sb.from('messages').insert({sender_id:author,receiver_id:receiver,body:type==='audio'?'🎤 Sesli mesaj':mime==='image/gif'?'🎞️ GIF':'📷 Fotoğraf',attachment_type:type,attachment_path:path}).select('*').single();if(m.error)throw m.error;return m.data}catch(error){try{await sb.storage.from('patiyiz-private-messages').remove([path])}catch(cleanup){console.warn('Gönderilemeyen medya temizlenemedi',cleanup)}throw error}}
const patiDmSignedCache=new Map();
const patiDmSigningPending=new Map();
// Reuse previously opened authenticated images while this browser tab is active.
const patiDmPhotoCache=new Map(),patiDmPhotoPending=new Map();
let patiDmPhotoOwner='';
function patiDmPhotoClear(){
 for(const item of patiDmPhotoCache.values())try{URL.revokeObjectURL(item.url)}catch(_){}
 patiDmPhotoCache.clear();patiDmPhotoPending.clear();patiDmPhotoOwner='';
}
function patiDmPhotoRemember(owner,key,url,bytes=0){
 if(patiDmPhotoOwner&&patiDmPhotoOwner!==owner)patiDmPhotoClear();
 patiDmPhotoOwner=owner;
 const old=patiDmPhotoCache.get(key);
 if(old&&old.url!==url)try{URL.revokeObjectURL(old.url)}catch(_){}
 patiDmPhotoCache.delete(key);patiDmPhotoCache.set(key,{url,bytes});
 let total=[...patiDmPhotoCache.values()].reduce((n,x)=>n+x.bytes,0);
 while(patiDmPhotoCache.size>24||total>48*1024*1024){
  const k=patiDmPhotoCache.keys().next().value;
  if(k===key&&patiDmPhotoCache.size===1)break;
  const evicted=patiDmPhotoCache.get(k);patiDmPhotoCache.delete(k);
  total-=evicted.bytes;try{URL.revokeObjectURL(evicted.url)}catch(_){}
 }
}
function patiDmMediaNotice(el,failed){
 if(!el?.isConnected)return;
 const box=el.closest?.('.bubble-chat');
 if(!box)return;
 let note=box.querySelector('.pati-dm-media-error');
 if(!failed){note?.remove();return}
 if(note)return;
 note=document.createElement('div');
 note.className='pati-dm-media-error';
 note.setAttribute('role','status');
 const label=document.createElement('span');label.textContent='Medya yüklenemedi.';
 const retry=document.createElement('button');retry.type='button';retry.textContent='Yeniden dene';
 retry.addEventListener('click',()=>{
  const path=el.dataset.privatePath;
  if(!path||!me?.id)return;
  patiDmSignedCache.delete(me.id+':'+path);
  el.dataset.patiDmMediaRetry='0';
  note?.remove();
  el.removeAttribute?.('src');
  void loadDmMedia();
 });
 note.append(label,retry);box.appendChild(note);
}
async function loadDmMedia(){
 const items=[...document.querySelectorAll('[data-private-path]')],userId=me?.id;
 if(!userId||!sb)return;
 await Promise.all(items.map(async el=>{
  const path=el.dataset.privatePath;if(!path)return;
  const key=userId+':'+path,now=Date.now();
  let signed=patiDmSignedCache.get(key);
  if(!signed||signed.expires<=now){
   let pending=patiDmSigningPending.get(key);
   if(!pending){
    pending=Promise.resolve().then(()=>sb.storage.from('patiyiz-private-messages').createSignedUrl(path,1800))
     .then(({data,error})=>{
      if(error||!data?.signedUrl)return null;
      const result={url:data.signedUrl,expires:Date.now()+20*60*1000};
      if(patiDmSignedCache.size>150)patiDmSignedCache.clear();
      patiDmSignedCache.set(key,result);
      return result;
     }).catch(()=>null).finally(()=>patiDmSigningPending.delete(key));
    patiDmSigningPending.set(key,pending);
   }
   signed=await pending;
  }
  if(!el.isConnected||me?.id!==userId)return;
  if(!signed?.url){patiDmMediaNotice(el,true);return}
  if(!el.dataset.patiDmMediaBound){
   el.dataset.patiDmMediaBound='1';
   el.addEventListener?.('load',()=>patiDmMediaNotice(el,false));
   el.addEventListener?.('loadeddata',()=>patiDmMediaNotice(el,false));
   el.addEventListener?.('error',()=>{
    if(el.dataset.patiDmMediaRetry!=='1'){
     el.dataset.patiDmMediaRetry='1';
     patiDmSignedCache.delete(key);
     el.removeAttribute?.('src');
     void loadDmMedia();
    }else patiDmMediaNotice(el,true);
   });
  }
  patiDmMediaNotice(el,false);
  if(el.tagName==='IMG'){
   let imageUrl=patiDmPhotoCache.get(key)?.url;
   if(!imageUrl){
    let download=patiDmPhotoPending.get(key);
    if(!download){
     download=(typeof fetch==='function'?fetch(signed.url,{cache:'force-cache'}):Promise.reject(Error('Görsel önbelleği desteklenmiyor')))
      .then(response=>{if(!response.ok)throw Error('Görsel indirilemedi');return response.blob()})
      .then(blob=>{
       if(!blob.type.startsWith('image/'))throw Error('Görsel biçimi geçersiz');
       const blobUrl=URL.createObjectURL(blob);
       if(me?.id!==userId){URL.revokeObjectURL(blobUrl);return ''}
       patiDmPhotoRemember(userId,key,blobUrl,blob.size);return blobUrl;
      }).catch(()=>signed.url).finally(()=>patiDmPhotoPending.delete(key));
     patiDmPhotoPending.set(key,download);
    }
    imageUrl=await download;
   }
   if(!el.isConnected||me?.id!==userId)return;
   if(imageUrl&&el.src!==imageUrl)el.src=imageUrl;
   el.decoding='async';
  }else if(el.src!==signed.url)el.src=signed.url;
 }));
}
async function sendDmImage(file){
 if(!personId||dmMediaSending)return;
 const recipient=personId,uid=me.id;dmMediaSending=true;
 const history=document.querySelector('.chat-history');
 const pending=document.createElement('div'),local=URL.createObjectURL(file);
 let retained=false;
 pending.className='bubble-chat mine pati-dm-pending';
 pending.innerHTML='<img class="pati-dm-image" alt="Gönderilen fotoğraf"><small>Fotoğraf gönderiliyor…</small>';
 pending.querySelector('img').src=local;
 history?.appendChild(pending);
 if(history)history.scrollTop=history.scrollHeight;
 try{
  const record=await uploadDmFile(file,'image',recipient);
  if(!record)throw new Error('Fotoğraf sunucuda doğrulanamadı.');
  if(me?.id===uid&&record.attachment_path){
   patiDmPhotoRemember(uid,uid+':'+record.attachment_path,local,file.size);
   retained=true;
  }
  if(me?.id===uid&&personId===recipient){
   data.messages=data.messages.filter(x=>x.id!==record.id);
   data.messages.push(record);
   pending.remove();navRender();if(view==='messages')render();
  }else pending.remove();
 }catch(e){pending.remove();throw e}
 finally{if(!retained)URL.revokeObjectURL(local);dmMediaSending=false}
}
async function startDmRecord(){
 if(!personId||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Bu cihaz ses kaydını desteklemiyor.');
 if(dmRecorder)return;
 const recipient=personId;
 dmStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
 const type=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!type){dmStream.getTracks().forEach(t=>t.stop());dmStream=null;throw Error('Ses biçimi desteklenmiyor.');}
 dmParts=[];dmCancel=false;dmRecipient=recipient;
 try{dmRecorder=new MediaRecorder(dmStream,{mimeType:type,audioBitsPerSecond:64000});}
 catch(error){dmStream?.getTracks().forEach(t=>t.stop());dmStream=null;throw error;}
 dmRecorder.ondataavailable=e=>{if(e.data.size)dmParts.push(e.data)};
 dmRecorder.onerror=()=>notify('Ses kaydı sırasında bir sorun oluştu.',true);
 dmRecorder.onstop=async()=>{
  patiDmRecordTimerStop();
  const blob=new Blob(dmParts,{type:type.split(';')[0]});
  dmParts=[];dmStream?.getTracks().forEach(t=>t.stop());dmRecorder=null;dmStream=null;
  document.querySelector('.pati-dm-rec-state')?.setAttribute('hidden','');
  if(dmCancel||!blob.size||!me||!dmRecipient)return;
  try{await uploadDmFile(blob,'audio',dmRecipient);await refreshKeys([['messages','messages']]);}
  catch(error){notify('Ses gönderilemedi: '+friendly(error),true)}
 };
 dmRecorder.start(250);
 document.querySelector('.pati-dm-rec-state')?.removeAttribute('hidden');
 patiDmRecordTimerStart();
}
// One pass over messages, independent of the number of conversations.
// Dedicated server-side inbox and per-peer history. RLS is enforced by the server.
let patiDmInbox={owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
const patiDmThreads=new Map();
const PATI_DM_INBOX_PAGE=80,PATI_DM_THREAD_PAGE=50;
let patiDmPendingLatestPeer='';
let patiDmLatestAnchor={owner:'',peer:'',until:0,cancelled:false};
function patiDmOpenAtLatest(peer){
 patiDmPendingLatestPeer=peer;
 patiDmLatestAnchor={owner:me?.id||'',peer,until:Date.now()+18000,cancelled:false};
}
function patiDmShouldPinLatest(peer){
 return !!peer&&patiDmLatestAnchor.owner===me?.id&&patiDmLatestAnchor.peer===peer&&!patiDmLatestAnchor.cancelled&&Date.now()<patiDmLatestAnchor.until;
}
function patiDmScrollLatest(history,peer){
 if(!history||!peer||view!=='messages'||personId!==peer)return;
 // Also support non-DOM lightweight histories in QA and old Android WebViews.
 if(!history.style||typeof history.addEventListener!=='function'||typeof history.querySelectorAll!=='function'){
  history.scrollTop=history.scrollHeight;
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{if(history.isConnected&&view==='messages'&&personId===peer)history.scrollTop=history.scrollHeight});
  return;
 }
 // Image heights and signed media URLs can arrive AFTER opening the chat.
 // Temporarily keep the last message in view, not an older photo above it.
 history.style.overflowAnchor='none';
 let active=true,resizeObserver=null,timeout=null;
 const cleanup=()=>{
  if(!active)return;active=false;
  resizeObserver?.disconnect();
  if(timeout!==null)clearTimeout(timeout);
  history.removeEventListener('keydown',stopByUser);
  history.removeEventListener('wheel',stopByUser);
  history.removeEventListener('touchstart',stopByUser);
  history.removeEventListener('pointerdown',stopByUser);
  history.style.overflowAnchor='';
 };
 const pin=()=>{
  if(!active)return;
  if(!history.isConnected||view!=='messages'||personId!==peer){cleanup();return}
  history.scrollTop=Math.max(0,history.scrollHeight-history.clientHeight);
 };
 const stopByUser=()=>{if(patiDmLatestAnchor.peer===peer)patiDmLatestAnchor.cancelled=true;cleanup()};
 for(const name of ['wheel','touchstart','pointerdown','keydown'])
  history.addEventListener(name,stopByUser,{once:true,passive:true});
 if(typeof ResizeObserver==='function'){
  resizeObserver=new ResizeObserver(()=>pin());
  for(const bubble of history.querySelectorAll('.bubble-chat'))resizeObserver.observe(bubble);
 }
 for(const media of history.querySelectorAll('img,video')){
  for(const event of ['load','loadedmetadata','error'])media.addEventListener(event,pin,{once:true});
 }
 pin();
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(pin));
 timeout=setTimeout(cleanup,15000);
}

// Conversations are hidden only for the current account; underlying messages stay intact.
let patiDmHiddenConversations={owner:'',ready:false,busy:false,error:false,cutoffs:new Map()};
function patiDmHiddenState(){
 const owner=me?.id||'';
 if(patiDmHiddenConversations.owner!==owner)patiDmHiddenConversations={owner,ready:false,busy:false,error:false,cutoffs:new Map()};
 return patiDmHiddenConversations;
}
function patiDmCutoff(peer){
 const raw=patiDmHiddenState().cutoffs.get(peer);
 return raw?Date.parse(raw)||0:0;
}
function patiDmLastVisible(peer,lastCreated){
 const cutoff=patiDmCutoff(peer);
 return !cutoff||Date.parse(lastCreated||0)>cutoff;
}
async function patiDmLoadHiddenThreads(){
 if(!me?.id||!sb)return;
 const owner=me.id,state=patiDmHiddenState();
 if(state.busy||state.ready||state.error)return;
 state.busy=true;
 try{
  const result=await sb.from('patiyiz_dm_hidden_threads').select('peer_id,hidden_at').eq('viewer_id',owner).limit(1000);
  if(result.error)throw result.error;
  if(me?.id!==owner||patiDmHiddenConversations!==state)return;
  state.cutoffs=new Map((result.data||[]).map(x=>[x.peer_id,x.hidden_at]));
  state.ready=true;
 }catch(error){
  console.warn('Sohbet gizleme kayıtları yüklenemedi:',error?.message||error);
  // Fail closed for this session; do not expose previously hidden conversations on an error.
  if(me?.id===owner&&patiDmHiddenConversations===state)state.error=true;
 }finally{
  if(me?.id===owner&&patiDmHiddenConversations===state){
   state.busy=false;
   if(view==='messages')patiDmSafeRender();
   navRender();
  }
 }
}
async function patiDmDeleteConversation(peer){
 if(!me?.id||!peer||peer===me.id||blocked.has(peer))throw Error('Sohbet seçilemedi.');
 const owner=me.id;
 if(!confirm('Bu sohbet yalnızca senin listenden kaldırılacak. Karşı tarafın mesajları silinmez. Yeni mesaj gelirse sohbet yeniden görünür. Devam edilsin mi?'))return;
 const hiddenAt=new Date().toISOString();
 const table=()=>sb.from('patiyiz_dm_hidden_threads');
 let res=await table().update({hidden_at:hiddenAt}).eq('viewer_id',owner).eq('peer_id',peer).select('peer_id,hidden_at');
 if(res.error)throw res.error;
 if(!res.data?.length){
  res=await table().insert({viewer_id:owner,peer_id:peer,hidden_at:hiddenAt}).select('peer_id,hidden_at');
  if(res.error?.code==='23505')res=await table().update({hidden_at:hiddenAt}).eq('viewer_id',owner).eq('peer_id',peer).select('peer_id,hidden_at');
 }
 if(res.error||!res.data?.length)throw res.error||new Error('Sohbet silme kaydı oluşturulamadı.');
 if(me?.id!==owner)return;
 const state=patiDmHiddenState();
 state.cutoffs.set(peer,res.data[0].hidden_at);state.ready=true;
 patiDmThreads.delete(patiDmThreadKey(peer));
 if(patiDmInbox.owner===owner)patiDmInbox.rows=patiDmInbox.rows.filter(x=>x.peer_id!==peer);
 if(personId===peer){personId='';mobileChatOpen=false;patiDmPendingLatestPeer='';patiDmTypingInput('')}
 patiDmSafeRender();navRender();notify('Sohbet listenden kaldırıldı.');
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
 const before=document.querySelector('#message-form input[name="body"],#pati-group-message-form input[name="group_body"]');
 const draft=before?.value||'',focus=document.activeElement===before;
 const pos=before?.selectionStart??draft.length,reply=before?.form?.dataset.reply||'';
 const search=document.querySelector('#pati-dm-search');
 const filter=search?.value||'',searchFocused=document.activeElement===search;
 render();
 const nextSearch=document.querySelector('#pati-dm-search');
 if(nextSearch&&filter){nextSearch.value=filter;nextSearch.dispatchEvent(new Event('input'));if(searchFocused)nextSearch.focus({preventScroll:true})}
 const after=document.querySelector('#message-form input[name="body"],#pati-group-message-form input[name="group_body"]');
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
  if(patiDmCutoff(peer))query=query.gt('created_at',new Date(patiDmCutoff(peer)).toISOString());
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
function patiDmCompareRows(a,b){
 const diff=(Date.parse(a.created_at)||0)-(Date.parse(b.created_at)||0);
 return diff||String(a.id||'').localeCompare(String(b.id||''));
}
function patiIndexDmHistory(rows,userId,hiddenIds,seenIds){
 const peers=new Map();
 let unreadTotal=0;
 for(const message of rows||[]){
  if((message.sender_id!==userId&&message.receiver_id!==userId)||hiddenIds?.has(message.id))continue;
  const peer=message.sender_id===userId?message.receiver_id:message.sender_id;
  if(!peer||!patiDmLastVisible(peer,message.created_at))continue;
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
// Each account can pin one message in each private conversation.
// Pin records are validated server-side against actual message participants.
let patiDmPinState={owner:'',byPeer:new Map(),loaded:new Set(),busy:new Set(),details:new Map()};
function patiDmPinReset(){
 const owner=typeof me!=='undefined'?me?.id||'':'';
 if(patiDmPinState.owner!==owner)patiDmPinState={owner,byPeer:new Map(),loaded:new Set(),busy:new Set(),details:new Map()};
}
async function patiDmPinFetch(peer){
 if(!me?.id||!sb||!peer||peer===me.id||blocked.has(peer))return;
 patiDmPinReset();
 const state=patiDmPinState,owner=me.id;
 if(state.loaded.has(peer)||state.busy.has(peer))return;
 state.busy.add(peer);
 try{
  const res=await sb.from('patiyiz_dm_message_pins').select('message_id').eq('viewer_id',owner).eq('peer_id',peer).maybeSingle();
  if(res.error)throw res.error;
  if(me?.id!==owner||patiDmPinState!==state)return;
  if(res.data?.message_id){
   const msgId=res.data.message_id;state.byPeer.set(peer,msgId);
   let msg=patiDmFindMessage(msgId);
   if(!msg){
    const found=await sb.from('messages').select('id,sender_id,receiver_id,body,created_at,attachment_type').eq('id',msgId).maybeSingle();
    if(found.error)throw found.error;
    if(me?.id!==owner||patiDmPinState!==state)return;
    msg=found.data;
   }
   if(msg&&((msg.sender_id===owner&&msg.receiver_id===peer)||(msg.sender_id===peer&&msg.receiver_id===owner)))
    state.details.set(msgId,msg);
   else state.byPeer.delete(peer);
  }else state.byPeer.delete(peer);
 }catch(error){console.warn('Sohbet sabiti yüklenemedi:',error?.message||error)}
 finally{
  if(patiDmPinState===state&&me?.id===owner){
   state.busy.delete(peer);state.loaded.add(peer);
   if(view==='messages'&&personId===peer)patiDmSafeRender();
  }
 }
}
function patiDmPinnedBanner(peer,conv){
 if(!peer||!me?.id)return '';
 patiDmPinReset();
 const id=patiDmPinState.byPeer.get(peer);
 if(!id)return '';
 const msg=conv.find(m=>m.id===id)||patiDmPinState.details.get(id);
 if(!msg)return '';
 const label=msg.attachment_type==='image'?'📷 Fotoğraf':msg.attachment_type==='audio'?'🎙️ Sesli mesaj':cut(msg.body||'Mesaj',140);
 return '<div class="pati-dm-pinned-banner" role="group" aria-label="Sohbette sabitlenen mesaj"><button type="button" data-action="dm-pin-jump" data-id="'+esc(id)+'" class="pati-dm-pinned-open"><span aria-hidden="true">📌</span><span><strong>Sabitlenen mesaj</strong><small>'+esc(label)+'</small></span></button><button type="button" data-action="dm-message-unpin" data-id="'+esc(id)+'" aria-label="Sabitlenen mesajı kaldır">Kaldır</button></div>';
}
async function patiDmPinSave(id){
 if(!me||!personId||!id)throw Error('Önce bir sohbet ve mesaj seç.');
 const uid=me.id,peer=personId,m=patiDmFindMessage(id);
 if(!m||!((m.sender_id===uid&&m.receiver_id===peer)||(m.sender_id===peer&&m.receiver_id===uid)))throw Error('Bu mesaj bu sohbete ait değil.');
 const result=await sb.from('patiyiz_dm_message_pins').upsert({viewer_id:uid,peer_id:peer,message_id:id,pinned_at:new Date().toISOString()},{onConflict:'viewer_id,peer_id'}).select('message_id').single();
 if(result.error)throw result.error;
 if(me?.id!==uid)return;
 patiDmPinReset();patiDmPinState.byPeer.set(peer,id);patiDmPinState.details.set(id,m);patiDmPinState.loaded.add(peer);
 closeModal(true);patiDmSafeRender();
}
async function patiDmPinRemove(id){
 if(!me?.id||!personId)return;
 const uid=me.id,peer=personId;
 patiDmPinReset();
 if(id&&patiDmPinState.byPeer.get(peer)!==id)throw Error('Sabitlenen mesaj değişmiş. Sohbeti yenile.');
 const result=await sb.from('patiyiz_dm_message_pins').delete().eq('viewer_id',uid).eq('peer_id',peer).select('message_id');
 if(result.error)throw result.error;
 if(me?.id!==uid)return;
 patiDmPinState.byPeer.delete(peer);patiDmPinState.loaded.add(peer);
 closeModal(true);patiDmSafeRender();
}
function patiDmPinJump(id){
 const nodes=[...document.querySelectorAll('#main-content .chat-history .bubble-chat[data-message-id]')];
 const target=nodes.find(el=>el.dataset.messageId===id);
 if(target){target.scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});target.classList.add('pati-dm-pin-flash');setTimeout(()=>target.classList.remove('pati-dm-pin-flash'),1500)}
 else notify('Mesaj eski sohbet geçmişinde. Yukarı kaydırıp önceki mesajları yükleyebilirsin.');
}

function patiDmOpenPhoto(messageId){
 const message=patiDmFindMessage(messageId),peer=personId,owner=me?.id;
 if(!owner||!peer||message?.attachment_type!=='image'||!message.attachment_path||
 !((message.sender_id===owner&&message.receiver_id===peer)||(message.sender_id===peer&&message.receiver_id===owner))){
  notify('Fotoğraf bu sohbette görüntülenemiyor.',true);return;
 }
 const photo=[...document.querySelectorAll('#main-content .bubble-chat[data-message-id]')]
  .find(el=>el.dataset.messageId===messageId)?.querySelector('img.pati-dm-image');
 if(!photo?.src||!photo.dataset.privatePath||photo.dataset.privatePath!==message.attachment_path){
  notify('Fotoğraf yükleniyor. Biraz sonra tekrar dokun.',true);return;
 }
 // Keep signed media URL inside the existing authenticated chat. No public storage URL.
 const url=photo.src;
 document.getElementById('pati-dm-lightbox')?.remove();
 const dialog=document.createElement('dialog');
 dialog.id='pati-dm-lightbox';dialog.className='pati-dm-lightbox';
 dialog.setAttribute('aria-label','Sohbet fotoğrafı');
 dialog.innerHTML='<div class="pati-dm-lightbox-toolbar"><strong>'+(message.body==='🎞️ GIF'?'GIF':'Fotoğraf')+'</strong><div class="pati-dm-lightbox-actions"><button type="button" data-dm-zoom="out" aria-label="Uzaklaştır">−</button><button type="button" data-dm-zoom="reset" aria-label="Boyutu sıfırla">1×</button><button type="button" data-dm-zoom="in" aria-label="Yakınlaştır">+</button><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" aria-label="Orijinal medyayı aç">Orijinal</a></div><button type="button" class="pati-dm-lightbox-close" aria-label="Fotoğrafı kapat">×</button></div><div class="pati-dm-lightbox-stage" aria-label="Yakınlaştırmak için iki parmak kullan, yakınken fotoğrafı sürükle"><img src="'+esc(url)+'" alt="Sohbette gönderilen fotoğraf" loading="eager" decoding="async" draggable="false"></div>';
 const focusBefore=document.activeElement;
 document.body.appendChild(dialog);
 const stage=dialog.querySelector('.pati-dm-lightbox-stage');
 const img=stage.querySelector('img');
 const points=new Map();
 let zoom=1,tx=0,ty=0,previousCenter=null,previousDistance=0;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const constrain=()=>{
  const maxX=Math.max(0,(img.clientWidth*zoom-stage.clientWidth)/2);
  const maxY=Math.max(0,(img.clientHeight*zoom-stage.clientHeight)/2);
  tx=clamp(tx,-maxX,maxX);ty=clamp(ty,-maxY,maxY);
  if(zoom<=1.005){zoom=1;tx=0;ty=0}
 };
 const paint=()=>{
  constrain();
  img.style.transform='translate3d('+tx.toFixed(2)+'px,'+ty.toFixed(2)+'px,0) scale('+zoom.toFixed(3)+')';
  stage.classList.toggle('pati-zoomed',zoom>1);
  const reset=dialog.querySelector('[data-dm-zoom="reset"]');
  if(reset)reset.textContent=zoom.toFixed(1)+'×';
 };
 const zoomAt=(factor,x=stage.clientWidth/2,y=stage.clientHeight/2)=>{
  const previous=zoom;
  zoom=clamp(zoom*factor,1,4);
  const rect=stage.getBoundingClientRect();
  tx+=(rect.width/2-x)*(zoom/previous-1);
  ty+=(rect.height/2-y)*(zoom/previous-1);
  paint();
 };
 dialog.querySelector('.pati-dm-lightbox-close')?.addEventListener('click',()=>dialog.close());
 dialog.querySelectorAll('[data-dm-zoom]').forEach(control=>control.addEventListener('click',()=>{
  const action=control.dataset.dmZoom;
  if(action==='reset'){zoom=1;tx=0;ty=0;paint()}
  else zoomAt(action==='in'?1.3:1/1.3);
 }));
 const pointer=(event)=>{
  const rect=stage.getBoundingClientRect();
  return {x:event.clientX-rect.left,y:event.clientY-rect.top};
 };
 stage.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  event.preventDefault();stage.setPointerCapture?.(event.pointerId);
  points.set(event.pointerId,pointer(event));
  previousCenter=null;previousDistance=0;
 });
 stage.addEventListener('pointermove',event=>{
  if(!points.has(event.pointerId))return;
  event.preventDefault();
  const prev=points.get(event.pointerId),next=pointer(event);
  points.set(event.pointerId,next);
  if(points.size===1&&zoom>1){tx+=next.x-prev.x;ty+=next.y-prev.y;paint()}
  if(points.size===2){
   const pair=[...points.values()],cx=(pair[0].x+pair[1].x)/2,cy=(pair[0].y+pair[1].y)/2;
   const distance=Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
   if(previousDistance>0&&distance>0)zoomAt(distance/previousDistance,cx,cy);
   if(previousCenter){tx+=cx-previousCenter.x;ty+=cy-previousCenter.y;paint()}
   previousDistance=distance;previousCenter={x:cx,y:cy};
  }
 });
 const end=event=>{points.delete(event.pointerId);previousCenter=null;previousDistance=0};
 stage.addEventListener('pointerup',end);
 stage.addEventListener('pointercancel',end);
 stage.addEventListener('lostpointercapture',end);
 stage.addEventListener('wheel',event=>{
  if(!event.ctrlKey&&zoom===1&&!event.altKey)return;
  event.preventDefault();
  const p=pointer(event);
  zoomAt(event.deltaY<0?1.13:1/1.13,p.x,p.y);
 },{passive:false});
 stage.addEventListener('dblclick',event=>{
  const p=pointer(event);
  if(zoom>1){zoom=1;tx=0;ty=0;paint()}else zoomAt(2.1,p.x,p.y);
 });
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>{points.clear();dialog.remove();if(focusBefore?.isConnected)focusBefore.focus?.()},{once:true});
 dialog.showModal();paint();
}

const patiDmEmojis=['❤️','😂','😮','😢','😡','👍','👏','🐾']; // Legacy fallback.
function patiDmReactionMarkup(messageId){
 const reactions=data.dmReactions.filter(x=>x.message_id===messageId);
 if(!reactions.length)return '';
 const groups=[...new Set(reactions.map(x=>x.emoji))].map(emoji=>{
  const count=reactions.filter(x=>x.emoji===emoji).length;
  const own=reactions.some(x=>x.user_id===me.id&&x.emoji===emoji);
  return '<span class="pati-dm-reaction-chip '+(own?'is-mine':'')+'" aria-label="'+esc(emoji)+' '+count+' tepki">'+esc(emoji)+' '+count+'</span>';
 });
 return '<span class="pati-dm-reaction-summary" aria-label="Mesaj tepkileri">'+groups.join('')+'</span>';
}
function patiDmOpenReactionPicker(messageId){
 const msg=patiDmFindMessage(messageId);
 if(!me||!msg||msg.sender_id===me.id||msg.receiver_id!==me.id)return;
 if(window.PatiDmEmojiPicker?.open){window.PatiDmEmojiPicker.open(messageId,emoji=>run(()=>patiDmSetReaction(messageId,emoji)));return;}
 modal('Mesaja tepki ver','<div class="pati-dm-reaction-picker" role="group" aria-label="Emoji seç">'+
 patiDmEmojis.map(emoji=>'<button type="button" data-action="dm-react-set" data-id="'+esc(messageId)+'" data-emoji="'+esc(emoji)+'" aria-label="'+esc(emoji)+' ile tepki ver">'+emoji+'</button>').join('')+
 '</div>','dm-reaction-picker-form');
 document.querySelector('#dm-reaction-picker-form .modal-footer')?.remove();
}
async function patiDmSetReaction(messageId,emoji){
 if(!me||!(patiDmEmojis.includes(emoji)||window.PatiDmEmojiPicker?.isEmoji?.(emoji)))throw Error('Tepki seçilemedi.');
 const msg=patiDmFindMessage(messageId),owner=me.id;
 if(!msg||msg.sender_id===owner||msg.receiver_id!==owner||blocked.has(msg.sender_id)||blocked.has(msg.receiver_id))
  throw Error('Bu mesaja tepki verilemez.');
 const existing=data.dmReactions.find(x=>x.message_id===messageId&&x.user_id===owner);
 // Database permissions intentionally allow updating emoji only, never moving a reaction
 // to another user or message. Upsert writes key columns on conflict, so avoid it.
 let result;
 if(existing?.emoji===emoji){
  result=await sb.from('patiyiz_dm_reactions').delete().eq('message_id',messageId).eq('user_id',owner).select('message_id');
 }else if(existing){
  result=await sb.from('patiyiz_dm_reactions').update({emoji}).eq('message_id',messageId).eq('user_id',owner).select('*');
  if(!result.error&&!result.data?.length)
   result=await sb.from('patiyiz_dm_reactions').insert({message_id:messageId,user_id:owner,emoji}).select('*');
 }else{
  result=await sb.from('patiyiz_dm_reactions').insert({message_id:messageId,user_id:owner,emoji}).select('*');
  if(result.error?.code==='23505')
   result=await sb.from('patiyiz_dm_reactions').update({emoji}).eq('message_id',messageId).eq('user_id',owner).select('*');
 }
 if(result.error)throw result.error;
 if(!result.data?.length)throw Error('Mesaj tepkisi kaydedilemedi.');
 if(me?.id!==owner)return;
 data.dmReactions=data.dmReactions.filter(x=>!(x.message_id===messageId&&x.user_id===owner));
 if(existing?.emoji!==emoji)data.dmReactions.push(result.data[0]);
 closeModal(true);render();
}


/* DM previews are always derived from the original post id: no duplicated media, no trust in
   arbitrary message text/URLs. Existing legacy "Paylaşım: ...#post-UUID" messages still work. */
const patiDmSharedPosts=new Map();
const patiDmSharedFetched=new Set();
let patiDmSharedLoading=false,patiDmSharedRetryAt=0,patiDmSharedReturnPeer='';
function patiDmMentionDetails(body){
 const text=String(body||'');
 if(!text.startsWith('🔖 Seni etiketledi: '))return null;
 const match=text.match(/^🔖 Seni etiketledi:\s+https?:\/\/[^\s#]+#post-([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:\?comment=([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}))?$/i);
 return match?{postId:match[1].toLowerCase(),commentId:match[2]?.toLowerCase()||''}:null;
}
function patiDmSharedPostId(body){
 const text=String(body||'');
 if(text.startsWith('🔖 Seni etiketledi: ')){
  const match=text.match(/^🔖 Seni etiketledi:\s+https?:\/\/[^\s#]+#post-([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:\?comment=([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}))?$/i);
  return match?match[1].toLowerCase():'';
 }
 if(!text.startsWith('📨 Paylaşım: '))return '';
 const match=text.match(/^📨 Paylaşım:\s+https?:\/\/[^\s#]+#post-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
 return match?match[1].toLowerCase():'';
}

function patiDmHasActiveStory(userId){
 if(!userId||blocked.has(userId))return false;
 const now=Date.now();
 return data.stories.some(s=>s.author_id===userId&&!s.pati_pet_highlight&&new Date(s.expires_at).getTime()>now);
}
function patiDmStoryRingButton(userId){
 if(!patiDmHasActiveStory(userId))return '';
 const user=profile(userId);
 return '<button type="button" class="pati-dm-story-trigger '+(patiHasUnseenStory(userId)?'':'is-seen')+'" data-action="dm-story-open" data-id="'+esc(userId)+'" aria-label="'+esc(user.display_name||'Kullanıcı')+' hikâyesini aç" title="Hikâyeyi izle">'+avatar(user,'s')+'</button>';
}
function patiDmSharedCard(message){
 const id=patiDmSharedPostId(message?.body);
 if(!id)return '';
 const mention=patiDmMentionDetails(message?.body);
 const post=data.posts.find(p=>p.id?.toLowerCase()===id)||patiDmSharedPosts.get(id);
 if(!post||blocked.has(post.author_id)){
  return '<div class="pati-dm-shared-removed">'+(patiDmSharedFetched.has(id)?'Bu paylaşım artık görüntülenemiyor.':'Paylaşım yükleniyor…')+'</div>';
 }
 const author=profile(post.author_id);
 const videos=Array.isArray(post.media_videos)?post.media_videos.filter(Boolean):[];
 const video=post.video_url||videos[0]||'';
 const images=[...new Set([...(Array.isArray(post.images)?post.images:[]),post.image_url].filter(Boolean))];
 const cover=post.video_cover_url||'';
 const reel=post.post_format==='reels'||!!video;
 const action=' data-action="dm-open-shared-post" data-id="'+esc(id)+'"'+(mention?.commentId?' data-comment="'+esc(mention.commentId)+'"':'');
 const media=video?
  '<button type="button" class="pati-dm-shared-media pati-dm-shared-video-wrap pati-dm-shared-media-open"'+action+' aria-label="Paylaşılan videoyu aç"><video class="pati-dm-shared-video'+(post.selfie_mirrored?' pati-selfie-mirrored':'')+'" src="'+esc(video)+'#t=0.2"'+(cover?' poster="'+esc(cover)+'"':'')+' muted playsinline webkit-playsinline preload="metadata" aria-label="Video önizlemesi"></video><span class="pati-dm-shared-play" aria-hidden="true">▶</span></button>':
  images.length?'<div class="pati-dm-shared-media pati-dm-shared-images" aria-label="Paylaşılan fotoğraflar">'+images.map((src,i)=>'<button type="button" class="pati-dm-shared-image-open"'+action+' aria-label="Fotoğraf '+(i+1)+' içeren gönderiyi aç"><img src="'+esc(src)+'" loading="lazy" decoding="async" alt="Paylaşılan fotoğraf '+(i+1)+' / '+images.length+'"></button>').join('')+'</div>':
  '<button type="button" class="pati-dm-shared-text pati-dm-shared-text-open"'+action+'>'+esc(post.body||'Yazılı paylaşım')+'</button>';
 return '<article class="pati-dm-shared-card '+(video?'pati-dm-shared-reel':'')+'">'+
  '<button type="button" class="pati-dm-shared-by pati-dm-shared-author" data-action="view-user" data-id="'+esc(post.author_id)+'" aria-label="'+esc(author.display_name||author.handle||'Kullanıcı')+' profiline git">'+avatar(author,'s')+'<span><b>'+displayName(author)+'</b><small>@'+esc(author.handle||'patiyiz')+' · '+(reel?'Reels':'Gönderi')+'</small></span></button>'+
  media+
  ((video||images.length)&&post.body?'<button type="button" class="pati-dm-shared-caption pati-dm-shared-caption-open"'+action+'>'+esc(cut(post.body,250))+'</button>':'')+
  '<button type="button" class="pati-dm-shared-footer"'+action+'>Gönderiyi aç '+ico('arrow-right')+'</button>'+
  (mention?'<div class="pati-dm-mention-label"><span aria-hidden="true">🔖</span><button type="button" class="pati-dm-mention-person" data-action="view-user" data-id="'+esc(message.sender_id)+'" aria-label="Etiketleyen kişinin profiline git">'+esc(profile(message.sender_id)?.display_name||profile(message.sender_id)?.handle||'Bir kullanıcı')+'</button><strong>seni etiketledi</strong>'+(mention.commentId?'<small>Yorumda etiketlendin</small>':'')+'</div>':'')+'</article>';
}
async function patiDmHydrateSharedPosts(messages,peer){
 if(!me||!sb||patiDmSharedLoading||Date.now()<patiDmSharedRetryAt)return;
 const ids=[...new Set(messages.map(x=>patiDmSharedPostId(x.body)).filter(Boolean))]
  .filter(id=>!patiDmSharedFetched.has(id)&&!data.posts.some(p=>p.id?.toLowerCase()===id)).slice(0,40);
 if(!ids.length)return;
 patiDmSharedLoading=true;
 for(const id of ids)patiDmSharedFetched.add(id);
 const owner=me.id;
 try{
  const result=await sb.from('posts').select('id,author_id,body,image_url,images,video_url,video_cover_url,media_videos,post_format,selfie_mirrored').in('id',ids);
  if(result.error)throw result.error;
  const hydrated=globalThis.PatiyizPrivateMedia?await globalThis.PatiyizPrivateMedia.hydrateRows(result.data||[],owner,sb):result.data||[];
  if(me?.id!==owner)return;
  for(const post of hydrated)if(!blocked.has(post.author_id))patiDmSharedPosts.set(post.id.toLowerCase(),post);
  if(view==='messages'&&personId===peer)render();
 }catch(error){
  for(const id of ids)patiDmSharedFetched.delete(id);
  patiDmSharedRetryAt=Date.now()+30000;
  console.warn('Paylaşılan gönderi önizlemesi:',error?.message||error);
 }finally{patiDmSharedLoading=false}
}
async function patiDmOpenSharedPost(id,commentId=''){
 if(!me||!personId||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw Error('Gönderi bağlantısı geçersiz.');
 const result=await sb.from('posts').select('*').eq('id',id).maybeSingle();
 if(result.error)throw result.error;
 if(!result.data||blocked.has(result.data.author_id)){notify('Bu paylaşım artık görüntülenemiyor.');return;}
 const post=globalThis.PatiyizPrivateMedia?(await globalThis.PatiyizPrivateMedia.hydrateRows([result.data],me.id,sb))[0]:result.data;
 data.posts=[...data.posts.filter(p=>p.id!==id),post];
 patiDmSharedPosts.set(id,post);
 patiDmSharedReturnPeer=personId;
 openPost(id);
 if(commentId&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(commentId)){
  await patiFetchPostComments(id);
  const mentioned=(patiPostCommentPages.get(id)?.rows||data.comments).find(c=>c.id===commentId&&c.post_id===id);
  if(mentioned?.parent_id)patiyizCommentExpandedReplies.add(mentioned.parent_id);
  showComments(id);
  requestAnimationFrame(()=>{
   const row=[...document.querySelectorAll('#comment-form [data-comment-id]')].find(el=>el.dataset.commentId===commentId);
   if(row){row.scrollIntoView({block:'center',behavior:'smooth'});row.classList.add('pati-comment-mention-highlight');}
  });
 }
}

/* Quiet Instagram-style date/time separators. Message send/receipt logic stays intact. */
function patiDmTimelineDivider(messages,index){
 const item=messages[index],before=messages[index-1];
 if(!item?.created_at)return '';
 const now=new Date(item.created_at),previous=before?.created_at?new Date(before.created_at):null;
 const diff=previous?(now.getTime()-previous.getTime()):Infinity;
 if(index!==0&&previous&&now.toDateString()===previous.toDateString()&&diff<15*60*1000)return '';
 const time=new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit'}).format(now);
 const label=index===0||!previous||now.toDateString()!==previous?.toDateString()?
    new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(now):time;
 return '<div class="pati-dm-time-divider" role="separator" aria-label="'+esc(label)+'"><time datetime="'+esc(item.created_at)+'">'+esc(label)+'</time></div>';
}


/* Professional direct messaging: owner-scoped server search, scheduled delivery
   managed by pg_cron, saved chat theme and first-party sticker picker. */
const patiDmThemeCache=new Map(),patiDmThemePending=new Set();
const PATI_DM_THEME_NAMES={classic:'Klasik',midnight:'Gece',lavender:'Lavanta',ocean:'Okyanus',rose:'Gül'};
const PATI_DM_STICKERS=['🐾','🐶','🐱','🐰','🐥','🌸','💜','🎉','🧡','🥹','✨','🦴','🦋','⭐','🎈','💐'];
function patiDmThemeKey(peer){return me?.id+':'+peer}
function patiDmThemeGet(peer){
 if(!peer||!me)return 'classic';
 const key=patiDmThemeKey(peer);
 if(!patiDmThemeCache.has(key)&&!patiDmThemePending.has(key)){
  patiDmThemePending.add(key);
  void sb.from('patiyiz_dm_themes').select('theme').eq('viewer_id',me.id).eq('peer_id',peer).maybeSingle()
   .then(({data,error})=>{
    if(error)throw error;
    patiDmThemeCache.set(key,data?.theme||'classic');
    if(view==='messages'&&personId===peer)render();
   }).catch(error=>console.warn('Sohbet teması yüklenemedi:',error?.message||error))
   .finally(()=>patiDmThemePending.delete(key));
 }
 return patiDmThemeCache.get(key)||'classic';
}
async function patiDmThemeSet(peer,theme){
 if(!PATI_DM_THEME_NAMES[theme]||!me||!peer)return;
 const r=await sb.from('patiyiz_dm_themes').upsert({viewer_id:me.id,peer_id:peer,theme,updated_at:new Date().toISOString()},{onConflict:'viewer_id,peer_id'});
 if(r.error)throw r.error;
 patiDmThemeCache.set(patiDmThemeKey(peer),theme);
 closeModal(true);render();notify('Sohbet teması değiştirildi.');
}
function patiDmThemeDialog(peer){
 if(!me||!peer)return;
 modal('Sohbet teması','<p>Görünüm yalnızca senin sohbet ekranını değiştirir.</p><div class="pati-chat-theme-choices">'+
 Object.entries(PATI_DM_THEME_NAMES).map(([key,label])=>'<button type="button" data-action="dm-theme-set" data-id="'+key+'" data-peer="'+esc(peer)+'" class="pati-theme-preview pati-chat-'+key+'" aria-pressed="'+(patiDmThemeGet(peer)===key)+'">'+esc(label)+'</button>').join('')+
 '</div>','pati-dm-theme-form');
 document.querySelector('#pati-dm-theme-form .modal-footer')?.remove();
}
async function patiDmSearchMessages(peer,query){
 const uid=me?.id;
 if(!uid||!peer||peer===uid)throw Error('Sohbet bulunamadı.');
 const term=String(query||'').trim().slice(0,80);
 if(term.length<2)throw Error('En az iki harf yaz.');
 const escaped=term.replace(/[\\%_]/g,'\\$&');
 const r=await sb.from('messages').select('id,sender_id,receiver_id,body,created_at')
  .or('and(sender_id.eq.'+uid+',receiver_id.eq.'+peer+'),and(sender_id.eq.'+peer+',receiver_id.eq.'+uid+')')
  .ilike('body','%'+escaped+'%').order('created_at',{ascending:false}).limit(60);
 if(r.error)throw r.error;
 return r.data||[];
}
function patiDmSearchOpen(peer){
 if(!peer)return notify('Önce bir sohbet seç.',true);
 modal('Mesajlarda ara','<label class="pati-field">Sohbette ara<input name="query" minlength="2" maxlength="80" placeholder="Kelime veya cümle" autocomplete="off" required></label><div id="pati-dm-search-results" role="status"></div>','pati-dm-search-form');
 document.getElementById('pati-dm-search-form').dataset.peer=peer;
 const button=document.querySelector('#pati-dm-search-form .modal-footer button[type=submit]');
 if(button)button.textContent='Ara';
}
function patiDmFocusMessage(id,source='search'){
 const history=document.querySelector('#main-content .pati-dm-layout .chat-history');
 const target=[...(history?.querySelectorAll('.bubble-chat[data-message-id]')||[])].find(x=>x.dataset.messageId===id);
 if(!target)return false;
 // Do not let the automatic 'latest message' anchor override a reply jump.
 patiDmLatestAnchor.cancelled=true;
 target.scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 const marker=source==='reply'?'pati-dm-reply-target':'pati-dm-search-hit';
 target.classList.remove(marker);
 void target.offsetWidth;
 target.classList.add(marker);
 setTimeout(()=>target.classList.remove(marker),1900);
 return true;
}
async function patiDmSearchJump(peer,id,source='search'){
 if(!me||!peer||!id)return;
 if(peer===personId&&patiDmFocusMessage(id,source))return;
 const owner=me.id;const r=await sb.from('messages').select('*').eq('id',id).maybeSingle();
 if(r.error)throw r.error;
 const row=r.data;
 if(!row||!((row.sender_id===owner&&row.receiver_id===peer)||(row.receiver_id===owner&&row.sender_id===peer)))throw Error('Bu mesaj bulunamadı.');
 const key=patiDmThreadKey(peer);
 const state=patiDmThreads.get(key);
 if(state&&!state.rows.some(x=>x.id===row.id))state.rows.push(row);
 if(!data.messages.some(x=>x.id===row.id))data.messages.push(row);
 patiDmLatestAnchor.cancelled=true;
 closeModal(true);personId=peer;patiActiveGroupId='';mobileChatOpen=true;
 if(view!=='messages')navigate('messages');else render();
 requestAnimationFrame(()=>{
  if(!patiDmFocusMessage(id,source))notify('Yanıtlanan mesaj artık görüntülenemiyor.',true);
 });
}
function patiDmScheduleOpen(peer){
 if(!peer)return notify('Önce bir sohbet seç.',true);
 const now=new Date(Date.now()+120000), local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
 modal('Mesajı zamanla','<p>Mesaj belirlediğin saatte, alıcının o andaki mesaj izinleri uygunsa gönderilir.</p>'+
 '<div class="pati-field"><label>Mesaj<textarea name="body" rows="3" maxlength="1000" required placeholder="Gönderilecek mesaj"></textarea></label></div>'+
 '<div class="pati-field"><label>Gönderim tarihi ve saati<input type="datetime-local" name="send_at" min="'+local+'" value="'+local+'" required></label></div>'+
 '<button type="button" data-action="dm-scheduled-list" data-id="'+esc(peer)+'" class="soft-btn">Planlanan mesajları gör</button>','pati-dm-schedule-form');
 document.getElementById('pati-dm-schedule-form').dataset.peer=peer;
}
async function patiDmScheduledList(peer){
 if(!me||!peer)return;
 const r=await sb.from('patiyiz_scheduled_messages').select('id,body,send_at,status,error_code').eq('sender_id',me.id)
 .eq('receiver_id',peer).order('send_at',{ascending:false}).limit(40);
 if(r.error)throw r.error;
 const records=r.data||[];
 modal('Planlanan mesajlar','<div class="pati-dm-scheduled-list">'+(records.length?records.map(row=>
 '<div class="pati-dm-scheduled-item"><span><strong>'+esc(cut(row.body,140))+'</strong><small>'+esc(new Date(row.send_at).toLocaleString('tr-TR'))+' · '+esc(({pending:'Bekliyor',sent:'Gönderildi',failed:'Gönderilemedi',cancelled:'İptal'})[row.status]||row.status)+'</small></span>'+
 (row.status==='pending'?'<button type="button" data-action="dm-scheduled-cancel" data-id="'+esc(row.id)+'" data-peer="'+esc(peer)+'">İptal et</button>':'')+'</div>').join(''):'<p>Henüz zamanlanmış mesaj bulunmuyor.</p>')+'</div>','pati-dm-scheduled-form');
 document.querySelector('#pati-dm-scheduled-form .modal-footer')?.remove();
}
function patiDmStickerDialog(peer){
 if(!peer)return;
 modal('Çıkartmalar','<p>Hayvanseverlere özel çıkartmalar</p><div class="pati-dm-sticker-grid">'+
 PATI_DM_STICKERS.map(item=>'<button type="button" data-action="dm-sticker-send" data-emoji="'+esc(item)+'" data-peer="'+esc(peer)+'" aria-label="'+esc(item)+' çıkartmasını gönder">'+item+'</button>').join('')+'</div>','pati-dm-sticker-form');
 document.querySelector('#pati-dm-sticker-form .modal-footer')?.remove();
}

function patiDmBeginReply(id){
 const m=patiDmFindMessage(id),form=document.getElementById('message-form');
 if(!m||!form||!me||!personId||!((m.sender_id===me.id&&m.receiver_id===personId)||(m.receiver_id===me.id&&m.sender_id===personId)))return;
 closeModal(true);
 form.dataset.reply=id;
 const box=form.querySelector('.pati-dm-reply-compose');
 if(box){box.hidden=false;const preview=box.querySelector('strong');if(preview)preview.textContent=cut(m.attachment_type==='image'?'Fotoğraf':m.attachment_type==='audio'?'Sesli mesaj':m.body||'Medya',95);}
 const input=form.querySelector('input[name="body"]');
 if(input){input.placeholder='Yanıtını yaz...';input.focus({preventScroll:true});}
}
function patiDmLatestTimestamp(id,summaries,peers){
 return Math.max(Date.parse(summaries.get(id)?.last_created_at||'')||0,Date.parse(peers.get(id)?.last?.created_at||'')||0);
}

/* Durable DM approvals are private to each recipient. */
let patiDmAcceptedState={owner:'',ids:new Set(),ready:false,loading:false,error:''};
async function patiDmLoadAccepted(force=false){
 if(!me?.id||!sb)return;
 const owner=me.id,token=patiyizLoadToken;
 if(patiDmAcceptedState.owner!==owner)patiDmAcceptedState={owner,ids:new Set(),ready:false,loading:false,error:''};
 const state=patiDmAcceptedState;
 if(state.loading||(state.ready&&!force))return;
 state.loading=true;state.error='';
 try{
  const r=await sb.from('patiyiz_dm_accepted_requests').select('peer_id').eq('viewer_id',owner).limit(2000);
  if(r.error)throw r.error;
  if(me?.id!==owner||patiyizLoadToken!==token||patiDmAcceptedState!==state)return;
  state.ids=new Set((r.data||[]).map(x=>x.peer_id));state.ready=true;
  if(view==='messages')patiDmSafeRender();
 }catch(e){
  if(me?.id===owner&&patiDmAcceptedState===state){state.error='İstekler yüklenemedi.';console.warn('DM istekleri',e?.message||e)}
 }finally{state.loading=false}
}
function patiDmIsRequest(peer,summaries,peers){
 if(!me?.id||!peer||followed.has(peer)||patiDmAcceptedState.ids.has(peer))return false;
 const summary=summaries?.get(peer)||patiDmInbox.rows.find(x=>x.peer_id===peer);
 return !!(summary?.has_incoming ?? peers?.get(peer)?.incoming ?? data.messages.some(x=>x.sender_id===peer&&x.receiver_id===me.id));
}
function patiDmCategory(peer,summaries,peers){
 if(patiDmIsRequest(peer,summaries,peers))return 'requests';
 return followed.has(peer)||patiDmAcceptedState.ids.has(peer)?'primary':'general';
}
async function patiDmAcceptRequest(peer){
 if(!me?.id||!peer||!patiDmAcceptedState.ready||!patiDmIsRequest(peer))throw Error('Mesaj isteği bulunamadı.');
 const owner=me.id;
 const r=await sb.from('patiyiz_dm_accepted_requests').insert({viewer_id:owner,peer_id:peer}).select('peer_id').single();
 if(r.error)throw r.error;
 if(me?.id!==owner)return;
 patiDmAcceptedState.ids.add(peer);
 chatFilter='primary';personId=peer;mobileChatOpen=true;
 await patiDmLoadInbox(true,true);
 patiDmSafeRender();void markConversationRead();
 notify('İstek kabul edildi. Sohbet Birincil klasöründe.');
}
function messagesPage(){
 if(!patiDmAcceptedState.ready&&!patiDmAcceptedState.loading)void patiDmLoadAccepted();
 if(patiGroupInboxState.owner!==me.id||(!patiGroupInboxState.ready&&!patiGroupInboxState.loading))void patiGroupFetchInbox();
 patiGroupInboxStart();
 const oldHistory=main.querySelector('.pati-dm-layout .chat-history');
 const oldChatId=main.querySelector('.pati-dm-layout .chat-window')?.dataset?.chatPerson||'';
 const oldTop=oldHistory?.scrollTop||0;
 const oldWasAtBottom=!oldHistory||(oldHistory.scrollHeight-oldHistory.scrollTop-oldHistory.clientHeight)<110;
 const hiddenState=patiDmHiddenState();
 if(!hiddenState.ready&&!hiddenState.busy&&!hiddenState.error)void patiDmLoadHiddenThreads();
 const hiddenIds=new Set(data.messageHidden.filter(x=>x.user_id===me.id).map(x=>x.message_id));
 const thread=patiDmThreads.get(patiDmThreadKey(personId));
 const merged=new Map();
 for(const m of thread?.rows||[])merged.set(m.id,m);
 for(const m of data.messages)merged.set(m.id,m);
 const indexed=patiIndexDmHistory([...merged.values()],me.id,hiddenIds,patiDmSeenIds());
 const peers=indexed.peers,inbox=patiDmInbox.owner===me.id?patiDmInbox:null;
 let userIds=hiddenState.ready?[...new Set([...(inbox?.ready?inbox.rows.map(row=>row.peer_id):[]),...peers.keys(),personId])].filter(id=>id&&!blocked.has(id)&&(id===personId&&mobileChatOpen||patiDmLastVisible(id,inbox?.rows.find(row=>row.peer_id===id)?.last_created_at||peers.get(id)?.last?.created_at))):[];
 const summaries=new Map((inbox?.rows||[]).map(row=>[row.peer_id,row]));
 userIds.sort((a,b)=>{
  const diff=patiDmLatestTimestamp(b,summaries,peers)-patiDmLatestTimestamp(a,summaries,peers);
  return diff||String(a).localeCompare(String(b));
 });
 /* Chat opens only when selected, avoiding auto-reading incoming requests. */
 let conv=[...(hiddenState.ready?(peers.get(personId)?.items||[]):[])].filter(x=>patiDmLastVisible(personId,x.created_at)).sort(patiDmCompareRows);
 if(personId&&conv.length)void patiDmHydrateSharedPosts(conv,personId);
 if(personId&&typeof patiDmPinFetch==='function')void patiDmPinFetch(personId);
 const pinBanner=typeof patiDmPinnedBanner==='function'?patiDmPinnedBanner(personId,conv):'';
 const groupUnread=patiGroupInboxState.owner===me.id?patiGroupInboxState.rows.reduce((sum,row)=>sum+Number(row.unread_count||0),0):0;
 const unreadTotal=(inbox?.ready&&patiDmReadReceiptsEnabled()?inbox.rows.reduce((sum,row)=>sum+Number(row.unread_count||0),0):indexed.unreadTotal)+groupUnread;
 const byMessageId=new Map([...merged.values()].map(m=>[m.id,m]));
 const showReadReceipts=patiDmReadReceiptsEnabled()&&(personId?profile(personId).read_receipts_enabled!==false:true);const replyText=x=>{const orig=byMessageId.get(x.reply_to);return orig?cut(orig.attachment_type==='image'?'Fotoğraf':orig.attachment_type==='audio'?'Sesli mesaj':orig.body||'Medya',65):'Önceki mesaj'};
 const replyPreview=x=>x.reply_to?'<button type="button" class="pati-dm-reply-preview" data-action="dm-reply-jump" data-id="'+esc(x.reply_to)+'" aria-label="Yanıtlanan mesaja git"><span>↳ Yanıtlanan mesaj</span><strong>'+esc(replyText(x))+'</strong></button>':'';
 const filteredIds=userIds.filter(id=>patiDmCategory(id,summaries,peers)===chatFilter);
 const requestIds=userIds.filter(id=>patiDmIsRequest(id,summaries,peers));
 const requestUnread=requestIds.reduce((sum,id)=>sum+Math.max(0,Number(summaries.get(id)?.unread_count??peers.get(id)?.unread??0)),0);
 const tabs=['primary','requests','general'];const labels=['Birincil','İstekler','Genel'];const chatTabs='<div class="pati-dm-filters">'+tabs.map((t,i)=>'<button type="button" data-action="dm-tab" data-id="'+t+'" class="'+(chatFilter===t?'active':'')+'">'+labels[i]+(t==='requests'&&requestUnread?'<span class="pati-dm-request-count" aria-label="'+requestUnread+' yeni mesaj">'+(requestUnread>99?'99+':requestUnread)+'</span>':'')+'</button>').join('')+'</div>';

 main.innerHTML='<div class="pati-dm-top"><button type="button" class="pati-dm-inbox-back" data-action="dm-exit" aria-label="Önceki ekrana dön">←</button><div class="pati-dm-title"><strong>Mesajlar</strong><small>Özel sohbetlerin</small></div><div class="pati-dm-top-actions"><span>'+unreadTotal+' okunmamış</span><button type="button" class="pati-dm-new" data-action="dm-new">'+ico('plus')+' Yeni sohbet</button><button type="button" class="pati-dm-new" data-action="pati-group-create-open">+ Yeni grup</button></div></div>'+chatTabs+'<label class="pati-dm-searchbar">'+ico('search')+'<input type="search" id="pati-dm-search" placeholder="Sohbetlerde ara" aria-label="Sohbetlerde ara" autocomplete="off"></label>'+`<div class="chat-layout modern-chat pati-dm-layout ${mobileChatOpen&&(personId||patiActiveGroupId)?'mobile-chat-open':'mobile-chat-list'}"><div class="chat-people"><div class="chat-list-heading">Sohbetler <span>${filteredIds.length}</span></div>${filteredIds.map(id=>{const bucket=peers.get(id),summary=summaries.get(id);
 let last=summary?{body:summary.last_body,created_at:summary.last_created_at}:bucket?.last;
  if(bucket?.last?.created_at&&Date.parse(bucket.last.created_at)>Date.parse(last?.created_at||'1970-01-01'))last=bucket.last;
 const lastShared=last&&patiDmSharedPostId(last.body);if(lastShared)last={...last,body:(data.posts.find(p=>p.id===lastShared)||patiDmSharedPosts.get(lastShared))?.video_url?'🎬 Reels gönderdi':'📨 Gönderi paylaştı'};
 let unread=summary&&patiDmReadReceiptsEnabled()?Number(summary.unread_count||0):bucket?.unread||0;const requestRow=patiDmIsRequest(id,summaries,peers);return `<div class="pati-dm-list-row" data-has-story="${patiHasUnseenStory(id)?'true':'false'}" data-chat-peer="${esc(id)}">${patiDmStoryRingButton(id)}<button type="button" class="chat-person ${personId===id?'active':''}" data-action="chat" data-id="${esc(id)}" data-search="${esc(profile(id).display_name+' '+(profile(id).handle||''))}">${patiDmHasActiveStory(id)?'':avatar(profile(id),'s')}<span class="chat-person-info"><strong>${displayUser(id)}</strong><small>${requestRow?(unread?'Yeni mesaj isteği · ':'Mesaj isteği · '):''}${last?esc(cut(last.body,80)):'Sohbete başla'}</small></span><span class="chat-person-meta"><small>${last?clock(last.created_at):''}</small>${unread?`<b class="chat-unread">${unread>99?'99+':unread}</b>`:''}</span></button><details class="pati-dm-row-actions"><summary aria-label="Sohbet seçenekleri" title="Sohbet seçenekleri">${ico('more')}</summary><div class="pati-dm-row-menu"><button type="button" class="pati-dm-delete-thread" data-action="dm-delete-thread" data-id="${esc(id)}" aria-label="${esc(profile(id).display_name||'Kullanıcı')} sohbetini listemden kaldır">${ico('trash')}<span>Sohbeti sil</span></button></div></details></div>`}).join('')||`<p style="padding:17px;color:#809181">${hiddenState.ready?'Keşfet\'ten bir kullanıcıya mesaj gönderebilirsin.':hiddenState.error?'Sohbetler şimdilik yüklenemedi. Sayfayı yenileyip tekrar dene.':'Sohbetler yükleniyor…'}</p>`}</div><div class="chat-window pati-dm-theme-classic" data-chat-person="${esc(personId||'')}"><header>${personId?`<button type="button" class="mobile-chat-back" data-action="chat-back" aria-label="Sohbetlere dön">←</button><span class="chat-head-avatar ${patiDmHasActiveStory(personId)?'pati-dm-has-story':''}">${patiDmStoryRingButton(personId)||avatar(profile(personId),'s')}</span><span><strong>${displayUser(personId)}</strong><small>@${esc(profile(personId).handle||'patiyiz')}</small><span class="pati-dm-typing-indicator" hidden><i class="pati-dm-dots"><b></b><b></b><b></b></i> yazıyor...</span></span><button type="button" data-action="view-user" data-id="${esc(personId)}" class="soft-btn chat-view-profile">Profil</button>`:'Sohbet seç'}</header>${personId&&patiDmIsRequest(personId,summaries,peers)?'<div class="pati-dm-request-banner" role="status"><div><strong>Mesaj isteği</strong><p>Bu kişi sana mesaj gönderdi. Birincil klasörüne taşımak için isteği kabul et.</p></div><button type="button" class="pati-dm-request-accept" data-action="dm-request-accept" data-id="'+esc(personId)+'">Kabul et</button></div>':''}${pinBanner}<div class="chat-history">${conv.map((x,i)=>`${patiDmTimelineDivider(conv,i)}<div class="bubble-chat ${x.sender_id===me.id?'mine':''}${PATI_DM_STICKERS.includes(x.body)?' pati-dm-sticker-bubble':''}${patiDmSharedPostId(x.body)?' pati-dm-shared-message':''}${x.attachment_type==='image'?' pati-dm-image-message':''}" data-message-id="${esc(x.id)}" title="Mesaj seçenekleri için basılı tut">${replyPreview(x)}${patiDmSharedPostId(x.body)?patiDmSharedCard(x):x.attachment_type==='image'?'<button type="button" class="pati-dm-image-open" data-action="dm-image-open" data-id="'+esc(x.id)+'" aria-label="Fotoğrafı büyüt"><img class="pati-dm-image" data-private-path="'+esc(x.attachment_path)+'" alt="Sohbette gönderilen fotoğraf" loading="lazy" decoding="async"></button>':x.attachment_type==='audio'?'<div class="pati-dm-voice-card"><span class="pati-dm-voice-avatar">'+avatar(profile(x.sender_id),'s')+'</span><div class="pati-dm-voice-main"><span class="pati-dm-voice-label">'+esc(profile(x.sender_id).display_name||'Sesli mesaj')+' · Sesli mesaj</span><audio controls preload="metadata" playsinline class="pati-dm-audio" data-private-path="'+esc(x.attachment_path)+'" aria-label="Sesli mesajı dinle"></audio></div></div>':esc(x.body)}${patiDmReactionMarkup(x.id)}<small>${x.edited_at?'Düzenlendi · ':''}${clock(x.created_at)} · ${x.sender_id===me.id?(x.read_at&&showReadReceipts?'✓✓ Okundu':'✓ Gönderildi'):day(x.created_at)}</small></div>`).join('')||'<p style="color:#95a299;text-align:center;margin:auto">Henüz mesaj yok. İlk mesajı gönder! 🐾</p>'}</div>${personId&&!patiDmIsRequest(personId,summaries,peers)?`<form id="message-form" class="chat-form"><div class="pati-dm-reply-compose" hidden><div><span>Yanıtlanıyor</span><strong></strong></div><button type="button" data-action="dm-reply-cancel" aria-label="Yanıtlamayı iptal et">×</button></div><details class="pati-dm-attach"><summary aria-label="Fotoğraf ve galeri seçenekleri" title="Fotoğraf ekle">＋</summary><div class="pati-dm-attach-menu"><label class="pati-dm-camera" aria-label="Fotoğraf çek">${ico('camera')}<input type="file" name="dm_camera" accept="image/*" capture="environment" hidden></label><button type="button" data-action="pati-dm-gallery-open" class="pati-dm-gallery" aria-label="Galeriden fotoğraf ekle">${ico('image')}</button></div></details><input type="file" name="dm_gallery" accept="image/*" multiple hidden><input name="body" placeholder="Mesaj yaz..." maxlength="1000" autocomplete="off"><button type="button" data-action="dm-record" class="pati-dm-mic" aria-label="Ses kaydet">${ico('mic')}</button><button type="submit" class="primary-btn" aria-label="Gönder">${ico('send')}</button><div class="pati-dm-rec-state" hidden><span>🎙️ Ses kaydediliyor <time class="pati-dm-record-elapsed">00:00</time></span><button type="button" data-action="dm-record-stop">Gönder</button><button type="button" data-action="dm-record-cancel">İptal</button></div></form>`:''}</div></div>`;
 patiGroupMountInMessages(summaries,peers,chatFilter);
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
  const pinIntent=patiDmShouldPinLatest(personId);
  const pinBottom=openLatest||pinIntent||!oldHistory||oldChatId!==personId||oldWasAtBottom;
  const restore=()=>{
   if(!history.isConnected)return;
   if(pinBottom)history.scrollTop=history.scrollHeight;
   else history.scrollTop=Math.min(oldTop,Math.max(0,history.scrollHeight-history.clientHeight));
  };
  restore();requestAnimationFrame(restore);
  if(openLatest||pinIntent||!oldHistory||oldChatId!==personId){
   if(openLatest)patiDmPendingLatestPeer='';
   patiDmScrollLatest(history,personId);
  }else if(pinBottom){
   // Media may still be loading on an established conversation.
   history.querySelectorAll('img,video').forEach(media=>{
    for(const event of ['load','loadedmetadata'])media.addEventListener(event,()=>{
     if(history.isConnected&&history.scrollHeight-history.scrollTop-history.clientHeight<200)
      history.scrollTop=history.scrollHeight;
    },{once:true});
   });
  }
 }const chatSearch=main.querySelector('#pati-dm-search');
 chatSearch?.addEventListener('input',()=>{
  const q=chatSearch.value.trim().toLocaleLowerCase('tr-TR');
  main.querySelectorAll('.pati-dm-layout .pati-dm-list-row').forEach(el=>{const person=el.querySelector('.chat-person');el.hidden=!String(person?.dataset.search||'').toLocaleLowerCase('tr-TR').includes(q)});
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
const notificationKinds={messages:['message-circle','Mesaj'],comments:['message-square','Yorum'],mentions:['at-sign','Etiketlenme'],post_likes:['heart','Beğeni'],follows:['user-plus','Takip'],pet_reminder:['calendar','Pati bakımı']};
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
  return '<article class="pati-alert-row pati-alert-simple '+(n.read?'is-read':'is-new')+'" data-notification-id="'+esc(n.id)+'" tabindex="0" aria-label="Bildirim">'
   +'<button type="button" class="pati-alert-entry" data-action="open-notification" data-id="'+esc(n.id)+'"><span class="pati-alert-avatar">'+(actor?avatar(actor,'s'):ico(symbol))+'</span>'
   +'<span class="pati-alert-content"><strong class="pati-alert-title">'+esc(n.text)+'</strong><small class="pati-alert-meta">'+esc(day(n.created_at))+'</small></span>'
   +(n.read?'':'<span class="pati-alert-unread" aria-label="Okunmadı"></span>')+'</button><button type="button" class="pati-alert-delete" data-action="notification-delete" data-id="'+esc(n.id)+'" aria-label="Bildirimi sil" title="Bildirimi sil">'+ico('trash')+'</button></article>';
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
 const list=notificationVisible(),unread=list.filter(n=>!n.read).length;
 main.innerHTML='<section class="pati-alerts notification-v2 pati-notifications-simple">'
  +'<header class="pati-notifications-simple-head"><h1>Bildirimler'+(unread?' <span class="pati-alert-count">'+unread+'</span>':'')+'</h1></header>'
  +(notificationLoadError?'<p class="notification-v2-error" role="alert">'+esc(notificationLoadError)+'</p>':'')
  +'<div id="notification-v2-results" class="notification-v2-list" aria-label="Bildirimlerin">'+
    (notificationBusy&&!list.length?'<p role="status" class="notification-v2-loading">Bildirimler yükleniyor…</p>':
      list.length?notificationRows(list):'<div class="notification-v2-empty" role="status"><span aria-hidden="true">🔔</span><h3>Henüz bildirim yok</h3><p>Yeni bildirimlerin burada görünecek.</p></div>')+
   '</div>'
   +(pageMore.notifications&&list.length?'<div class="pati-load-more">'+button('Daha eski bildirimler','load-more','data-id="notifications"')+'</div>':'')
  +'</section>';
}
async function patiOpenMentionNotification(n){
 if(!n?.post_id)return;
 const id=n.post_id,owner=me?.id;
 if(!data.posts.some(p=>p.id===id)){
  const response=await sb.from('posts').select('*').eq('id',id).maybeSingle();
  if(response.error){console.warn('Etiketli içerik erişimi:',response.error.message);notify('Bu paylaşıma şu anda erişilemiyor.');return}
  if(!response.data||blocked.has(response.data.author_id)){notify('Bu paylaşım artık görüntülenemiyor.');return}
  if(me?.id!==owner)return;
  const shown=globalThis.PatiyizPrivateMedia?(await globalThis.PatiyizPrivateMedia.hydrateRows([response.data],owner,sb))[0]:response.data;
  data.posts.push(shown);
 }
 openPost(id);
 if(n.comment_id){
  await patiFetchPostComments(id);
  if(me?.id!==owner)return;
  const comments=patiPostCommentPages.get(id)?.rows||data.comments;
  const mentioned=comments.find(c=>c.id===n.comment_id&&c.post_id===id);
  if(mentioned?.parent_id)patiyizCommentExpandedReplies.add(mentioned.parent_id);
  showComments(id);
  requestAnimationFrame(()=>{
   const row=[...document.querySelectorAll('#comment-form [data-comment-id]')].find(el=>el.dataset.commentId===n.comment_id);
   if(row){row.scrollIntoView({block:'center',behavior:'smooth'});row.classList.add('pati-comment-mention-highlight')}
  });
 }
}
async function openNotification(id){const n=data.notifications.find(x=>x.id===id&&x.owner_id===me.id);if(!n){navigate('notifications');return}
 if(!n.read){const result=await sb.from('notifications').update({read:true}).eq('id',n.id).eq('owner_id',me.id).select('id');if(!result.error&&result.data?.length){n.read=true;navRender()}}
 if(n.kind==='mentions'&&n.post_id){await patiOpenMentionNotification(n);return}
 if(['comments','post_likes'].includes(n.kind)&&n.post_id){openPost(n.post_id);return}
 if(n.kind==='messages'&&n.actor_id&&n.actor_id!==me.id&&!blocked.has(n.actor_id)){personId=n.actor_id;mobileChatOpen=true;navigate('messages');return}
 if(n.kind==='lost_city'){lostStatus='missing';lostSpecies='Tümü';lostSearch='';navigate('lost');await lostRefresh();return}
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

/* 2026-10-29: social safety, private follows, creator statistics and visit tracking.
   DB permissions are authoritative; client-side flags are only for presentation. */
let patiSafetyState={owner:'',busy:false,loaded:false,followRequests:[],restrictions:new Set()};
const patiProfileVisitRecorded=new Set();
function patiIsFollowRequested(id){
 return patiSafetyState.followRequests.some(r=>r.requester_id===me?.id&&r.target_id===id);
}
async function patiSafetyRefresh(force=false){
 if(!me?.id||!sb)return;
 const uid=me.id;
 if(patiSafetyState.owner!==uid)patiSafetyState={owner:uid,busy:false,loaded:false,followRequests:[],restrictions:new Set()};
 if(patiSafetyState.busy||(!force&&patiSafetyState.loaded))return;
 patiSafetyState.busy=true;
 try{
  const [requests,restrictions]=await Promise.all([
   sb.from('patiyiz_follow_requests').select('requester_id,target_id,created_at').or('requester_id.eq.'+uid+',target_id.eq.'+uid).limit(150),
   sb.from('patiyiz_restricted_accounts').select('restricted_id').eq('owner_id',uid).limit(150)
  ]);
  if(requests.error)throw requests.error;
  if(restrictions.error)throw restrictions.error;
  if(me?.id!==uid)return;
  patiSafetyState.followRequests=requests.data||[];
  patiSafetyState.restrictions=new Set((restrictions.data||[]).map(x=>x.restricted_id));
  patiSafetyState.loaded=true;
  if(['profile','settings'].includes(view))render();
 }catch(error){console.warn('Gizlilik bilgileri yüklenemedi:',error?.message||error)}
 finally{patiSafetyState.busy=false}
}
async function patiSocialFollow(id){
 if(!me||!id||id===me.id)return;
 const owner=me.id;
 const r=await sb.rpc('patiyiz_follow_action',{p_target:id});
 if(r.error)throw r.error;
 if(me?.id!==owner)return;
 if(r.data==='following')followed.add(id);else followed.delete(id);
 await patiSafetyRefresh(true);
 try{await load('feed')}catch(e){console.warn('Takip akışı yenilenemedi:',e.message)}
 if(me?.id!==owner)return;
 profileCountCache.delete(id);profileCountCache.delete(owner);render();
 notify(({following:'Takip ediliyor.',unfollowed:'Takipten çıkıldı.',requested:'Takip isteği gönderildi.',cancelled:'Takip isteği iptal edildi.'})[r.data]||'Takip tercihi güncellendi.');
}
async function patiFollowDecision(id,accept){
 const r=await sb.rpc('patiyiz_follow_decide',{p_requester:id,p_accept:accept});
 if(r.error)throw r.error;
 await patiSafetyRefresh(true);profileCountCache.delete(me.id);
 render();notify(accept?'Takip isteği onaylandı.':'Takip isteği reddedildi.');
}
async function patiRestrictToggle(id){
 if(!me||id===me.id)return;
 const restricted=patiSafetyState.restrictions.has(id);
 const q=restricted?sb.from('patiyiz_restricted_accounts').delete().eq('owner_id',me.id).eq('restricted_id',id):
 sb.from('patiyiz_restricted_accounts').insert({owner_id:me.id,restricted_id:id});
 const r=await q;if(r.error)throw r.error;
 await patiSafetyRefresh(true);
 render();notify(restricted?'Kısıtlama kaldırıldı.':'Kullanıcı kısıtlandı; sana yeni mesaj gönderemez.');
}
function patiFollowRequestsMarkup(){
 if(!patiSafetyState.loaded)return '<p class="small-note">Takip istekleri yükleniyor…</p>';
 const rows=patiSafetyState.followRequests.filter(x=>x.target_id===me?.id);
 return rows.length?rows.map(x=>'<div class="pati-social-person"><span><strong>'+esc(profile(x.requester_id).display_name||'Kullanıcı')+'</strong><small>Takip isteği</small></span><button type="button" data-action="pati-follow-accept" data-id="'+esc(x.requester_id)+'">Onayla</button><button type="button" data-action="pati-follow-decline" data-id="'+esc(x.requester_id)+'">Reddet</button></div>').join(''):'<p class="small-note">Bekleyen istek yok.</p>';
}
const patiMetric=v=>Number(v||0).toLocaleString('tr-TR');

/* Full-screen creator dashboard: every metric is server-sourced and personally scoped.
   Small demographic samples are suppressed by the database, not by CSS. */
function patiInsightsMetric(number){return patiMetric(Number(number)||0)}
function patiInsightsBarChart(series,label){
 const rows=Array.isArray(series)?series:[];
 const values=rows.map(x=>Number(x.value)||0),maximum=Math.max(1,...values);
 if(!rows.length||values.every(v=>v===0))
  return '<p class="pati-creator-empty" role="status">Bu dönemde henüz kayıtlı '+esc(label.toLocaleLowerCase('tr-TR'))+' verisi yok. Yeni hareketler olduğunda grafik burada oluşacak.</p>';
 const bars=rows.map((x,i)=>'<div class="pati-stat-column" title="'+esc(x.day||'')+': '+patiInsightsMetric(x.value)+'"><div class="pati-stat-bar" style="height:'+Math.max(2,Math.round(values[i]/maximum*100))+'%"></div></div>').join('');
 return '<div class="pati-stat-graph" role="img" aria-label="'+esc(label)+'">'+bars+'</div>'+
 '<div class="pati-stat-axis"><span>'+esc(rows[0]?.day||'')+'</span><span>'+esc(rows[Math.floor((rows.length-1)/2)]?.day||'')+'</span><span>'+esc(rows.at(-1)?.day||'')+'</span></div>';
}
function patiInsightsTrend(daily,key){
 const points=(Array.isArray(daily)?daily:[]).map(x=>({day:String(x.day||'').slice(5),value:Number(x[key])||0}));
 if(points.length<=31)return points;
 const chunks=[];for(let i=0;i<points.length;i+=7){const set=points.slice(i,i+7);chunks.push({day:set[0]?.day||'',value:set.reduce((sum,p)=>sum+p.value,0)})}
 return chunks;
}
let patiCreatorStats={owner:'',days:30,main:null,audience:null,content:null,visitors:null,tab:'overview',detail:''};
let patiCreatorPreview={owner:'',value:null,fetched:0,pending:false};
function patiInsightsClose(){
 document.getElementById('pati-creator-dashboard')?.remove();
 document.body.classList.remove('pati-insights-open');
 patiCreatorStats.detail='';
}
function patiInsightsPct(now,prev){
 if(!Number.isFinite(Number(prev))||Number(prev)===0)return Number(now)>0?'Yeni':'0%';
 return ((Number(now)-Number(prev))/Number(prev)*100).toLocaleString('tr-TR',{maximumFractionDigits:1})+'%';
}
function patiInsightsChange(now,prev){
 const delta=(Number(now)||0)-(Number(prev)||0);
 return '<span class="pati-creator-change '+(delta>0?'increase':delta<0?'decrease':'neutral')+'" aria-label="'+(delta>0?'Artış':delta<0?'Düşüş':'Değişim yok')+'">'+
 (delta>0?'↗':delta<0?'↘':'→')+' '+patiInsightsPct(now,prev)+'</span>';
}
function patiCreatorPreviewHTML(){
 return '<button type="button" class="pati-profile-insights-preview" data-action="pati-insights" aria-label="İstatistiklerini aç">'+
 '<span><strong>İstatistikler</strong><small>Son 30 gün · Sana özel</small></span>'+
 '<span class="pati-profile-insights-value" id="pati-profile-insights-value">—</span>'+
 '<span class="pati-profile-insights-arrow" id="pati-profile-insights-arrow" aria-hidden="true">→</span></button>';
}
async function patiCreatorPreviewLoad(){
 if(!me?.id||view!=='profile'||(profileId&&profileId!==me.id))return;
 const owner=me.id;
 const el=document.getElementById('pati-profile-insights-value'),arrow=document.getElementById('pati-profile-insights-arrow');
 if(!el||!arrow)return;
 if(patiCreatorPreview.owner!==owner)patiCreatorPreview={owner,value:null,fetched:0,pending:false};
 const state=patiCreatorPreview;
 const renderPreview=()=>{
  if(!el.isConnected||me?.id!==owner)return;
  const data=state.value;
  el.textContent=data?patiInsightsMetric(data.profile_visits):'—';
  if(data){
   const change=(Number(data.profile_visits)||0)-(Number(data.profile_visits_previous)||0);
   arrow.textContent=change>0?'↗':change<0?'↘':'→';
   arrow.className='pati-profile-insights-arrow '+(change>0?'increase':change<0?'decrease':'neutral');
  }
 };
 renderPreview();
 if(state.pending||Date.now()-state.fetched<90000)return;
 state.pending=true;
 try{
  let res=await sb.rpc('patiyiz_creator_insights_extended',{p_days:30});
  if(res.error)res=await sb.rpc('patiyiz_creator_insights',{p_days:30});
  if(res.error)throw res.error;
  if(me?.id!==owner)return;
  state.value=res.data;state.fetched=Date.now();
  renderPreview();
 }catch(error){console.warn('Profil istatistiği önizleme:',error?.message||error)}
 finally{state.pending=false}
}
function patiCreatorBreakdown(items,title){
 const rows=Array.isArray(items)?items:[],max=Math.max(1,...rows.map(x=>Number(x.count)||0));
 return '<section class="pati-creator-breakdown"><h3>'+esc(title)+'</h3>'+
 (rows.length?rows.map(x=>{
  const name={woman:'Kadın',man:'Erkek',other:'Diğer'}[x.name]||x.name;
  const value=Math.max(0,Number(x.count)||0);
  return '<div class="pati-creator-breakdown-item"><div><strong>'+esc(name||'Belirtilmedi')+'</strong><span>'+patiInsightsMetric(value)+'</span></div>'+
  '<div class="pati-creator-bartrack"><span style="width:'+Math.round(value/max*100)+'%"></span></div></div>';
 }).join(''):'<p class="pati-creator-empty">Yeterli doğrulanmış veri yok.</p>')+'</section>';
}
function patiCreatorInsightsRender(){
 const state=patiCreatorStats,dlg=document.getElementById('pati-creator-dashboard');
 if(!dlg||!state.main||state.owner!==me?.id)return;
 const v=state.main,a=state.audience||{},content=state.content||{},days=state.days;
 const visits=Number(v.profile_visits)||0,gained=Number(v.followers_gained)||0,lost=Number(v.followers_lost)||0;
 const complete=v.loss_history_complete===true;
 const kpis=[
  ['visits','Profil ziyaretleri',visits,'Kayıtlı profil ziyaretleri'],
  ['followers','Yeni takipçiler',gained,'Kazanılan / kaybedilen takipçiler'],
  ['engagement','Etkileşimler',(Number(v.likes)||0)+(Number(v.saves)||0)+(Number(v.reposts)||0),'Beğeni, kaydetme ve yeniden paylaşım'],
  ['content','Paylaşımlar',Number(v.posts)||0,'Bu dönemde yayımlanan içerikler']
 ];
 const range='<div class="pati-creator-ranges" role="group" aria-label="İstatistik dönemi">'+[7,30,90].map(n=>
  '<button type="button" data-action="pati-insights-period" data-id="'+n+'" aria-pressed="'+(days===n)+'">Son '+n+' gün</button>').join('')+'</div>';
 const tabs=[['overview','Genel bakış'],['content','İçerik'],['audience','Hedef kitle']];
 const head='<header class="pati-creator-head"><button type="button" data-action="pati-insights-close" aria-label="İstatistikleri kapat">←</button>'+
  '<strong>İstatistikler</strong><span class="pati-creator-private" title="Bu ekranı yalnızca hesap sahibi görür">Sana özel</span></header>';
 let body='';
 if(state.detail==='visitors'){
  const visitors=state.visitors;
  body='<div class="pati-creator-detail-head"><button type="button" data-action="pati-insights-detail" data-id="visits">← Geri</button><h2>Profilini ziyaret edenler</h2><p>Son '+days+' gündeki kayıtlı, giriş yapmış ziyaretçiler. Anonim ziyaretler gösterilmez.</p></div>'+
   (!visitors?'<p class="pati-creator-loading">Ziyaretçiler yükleniyor…</p>':visitors.error?
    '<div class="pati-creator-empty">Ziyaretçiler getirilemedi. <button type="button" data-action="pati-insights-visitors">Yeniden dene</button></div>':
    '<div class="pati-creator-visitor-total">'+patiInsightsMetric(visitors.total||0)+' farklı ziyaretçi</div>'+
    ((visitors.visitors||[]).length?(visitors.visitors||[]).map(person=>
      '<button class="pati-creator-visitor" type="button" data-action="pati-insights-person" data-id="'+esc(person.id)+'">'+
      avatar({avatar_url:person.avatar_url,display_name:person.display_name},'s')+'<span><strong>'+esc(person.display_name||'Patiyiz üyesi')+'</strong><small>@'+esc(person.handle||'patiyiz')+'</small></span><time>'+esc(person.last_visit||'')+'</time></button>').join(''):
      '<p class="pati-creator-empty">Bu dönemde görüntülenecek ziyaretçi yok.</p>')+
    '<p class="pati-creator-footnote">Kayıtlar Patiyiz içinde giriş yaparak ziyaret eden hesapları kapsar. En fazla son 50 hesap listelenir.</p>');
 }else if(state.detail){
  const detail=kpis.find(x=>x[0]===state.detail);
  const metrics=state.detail==='followers'?[
    ['Kazanılan',gained],['Kaybedilen (kayıtlı)',lost],['Net değişim (kayıtlı)',gained-lost],['Toplam takipçi',Number(v.followers_now)||0]
  ]:state.detail==='visits'?[
    ['Profil ziyaretleri',visits],['Önceki dönem',Number(v.profile_visits_previous)||0],['Değişim',patiInsightsPct(visits,v.profile_visits_previous)],['Kayıtlı gün',days]
  ]:state.detail==='engagement'?[
    ['Beğenmeler',Number(v.likes)||0],['Kaydetmeler',Number(v.saves)||0],
    ['Yeniden paylaşımlar',Number(v.reposts)||0],['Toplam',kpis[2][2]]
  ]:[['Gönderiler',Number(content.posts)||0],['Reels',Number(content.reels)||0],['Hikâyeler',Number(content.stories)||0],['Toplam',Number(v.posts)||0]];
  body='<div class="pati-creator-detail-head"><button type="button" data-action="pati-insights-detail" data-id="">← Genel bakış</button><h2>'+esc(detail?.[1]||'Ayrıntılar')+'</h2>'+
   '<p>Son '+days+' günün gerçek kayıtları</p></div><div class="pati-creator-detail-grid">'+metrics.map(([name,value])=>
    '<article><small>'+esc(name)+'</small><strong>'+esc(typeof value==='number'?patiInsightsMetric(value):value)+'</strong></article>').join('')+'</div>'+
   (state.detail==='visits'?'<button type="button" class="pati-creator-visitors-link" data-action="pati-insights-visitors">Kimler profilimi ziyaret etti? <span>›</span></button>':'')+
   (state.detail==='followers'&&!complete?'<p class="pati-creator-footnote">Takipten çıkma kayıtları yeni tutulmaya başlandı. Önceki dönem kayıpları mevcut olmadığından net değişim yalnızca kayıtlı kayıpları içerir.</p>':'')+
   patiInsightsBarChart(patiInsightsTrend(v.daily||[],state.detail==='visits'?'visits':state.detail==='followers'?'followers':'likes'),'Günlük değişim');
 }else{
  const tabbar='<div class="pati-creator-tabs" role="tablist">'+tabs.map(([id,name])=>
   '<button type="button" role="tab" data-action="pati-insights-tab" data-id="'+id+'" aria-selected="'+(state.tab===id)+'">'+name+'</button>').join('')+'</div>';
  if(state.tab==='overview'){
   body='<section class="pati-creator-overview"><h2>Genel bakış</h2><p>Son '+days+' günün hesabına özel verileri</p>'+
    '<div class="pati-creator-kpis">'+kpis.map(([id,name,value,desc])=>
     '<button type="button" data-action="pati-insights-detail" data-id="'+id+'" class="pati-creator-stat"><span>'+name+'</span>'+
     '<strong>'+patiInsightsMetric(value)+'</strong>'+
     (id==='visits'?patiInsightsChange(visits,v.profile_visits_previous):id==='followers'?patiInsightsChange(gained,v.followers_gained_previous):'<small>'+esc(desc)+'</small>')+
     '<span class="pati-creator-stat-arrow">›</span></button>').join('')+'</div>'+
    '<div class="pati-creator-profile-moves"><h3>Profil hareketleri</h3>'+
    '<button type="button" data-action="pati-insights-detail" data-id="visits"><span>Profil ziyaretleri</span><strong>'+patiInsightsMetric(visits)+'</strong><span>›</span></button>'+
    '<button type="button" data-action="pati-insights-detail" data-id="followers"><span>Takipçi değişimi</span><strong>+'+patiInsightsMetric(gained)+' / −'+(complete?patiInsightsMetric(lost):patiInsightsMetric(lost)+'*')+'</strong><span>›</span></button></div>'+
    '<div class="pati-creator-chart-card"><h3>Profil ziyaretleri</h3>'+patiInsightsBarChart(patiInsightsTrend(v.daily||[],'visits'),'Profil ziyaretleri')+'</div>'+
    (!complete?'<p class="pati-creator-footnote">* Takipçi kayıpları yalnızca yeni takip sistemi kayıtlarının başlangıcından itibaren ölçülmektedir.</p>':'')+
    '</section>';
  }else if(state.tab==='content'){
   const top=Array.isArray(content.top)?content.top:[];
   body='<section class="pati-creator-overview"><h2>İçerik istatistikleri</h2><p>Gerçek görüntülenme ve etkileşimlere dayalı performans</p>'+
    '<div class="pati-creator-detail-grid">'+[['Gönderiler',content.posts],['Reels',content.reels],['Hikâyeler',content.stories]].map(([name,n])=>
    '<article><small>'+name+'</small><strong>'+patiInsightsMetric(n)+'</strong></article>').join('')+'</div>'+
    '<div class="pati-creator-chart-card"><h3>En çok görüntülenen içerikler</h3>'+
    (content.error?'<p class="pati-creator-empty" role="alert">İçerik istatistikleri yüklenemedi. Yeniden dene.</p>':top.length&&top.some(x=>Number(x.views)>0)?top.map(x=>'<button type="button" class="pati-creator-top-post" data-action="pati-insights-post" data-id="'+esc(x.id)+'"><span>'+(x.kind==='reels'?'Reels':'Gönderi')+'</span><strong>'+patiInsightsMetric(x.views)+' görüntüleme</strong><small>'+patiInsightsMetric(x.likes)+' beğeni · '+patiInsightsMetric(x.comments)+' yorum</small><b>›</b></button>').join(''):
    '<p class="pati-creator-empty" role="status">Bu dönemde henüz doğrulanmış içerik görüntülenmesi yok. İzlenmeler kaydedildikçe burada görünecek.</p>')+'</div></section>';
  }else{
   const cities=Array.isArray(a.cities)?a.cities.slice(0,5):[];
   const genders=Array.isArray(a.genders)?a.genders:[];
   body='<section class="pati-creator-overview"><h2>Hedef kitle</h2><p>Profilini ziyaret eden, bilgilerini isteğe bağlı olarak paylaşmış kişiler</p>'+
    '<div class="pati-creator-audience-count"><strong>'+patiInsightsMetric(a.sample)+'</strong><span>Kayıtlı farklı ziyaretçi</span></div>'+
    (a.error?'<p class="pati-creator-empty" role="alert">Hedef kitle verileri getirilemedi. Yeniden dene.</p>':patiCreatorBreakdown(genders,'Cinsiyet dağılımı')+patiCreatorBreakdown(cities,'En fazla 5 şehir'))+
    '<p class="pati-creator-footnote">Gizlilik için en az 10 farklı ziyaretçi ve her grupta en az 5 kişi gerekir. Cinsiyet ya da şehir bilgisi paylaşmayanlar sayılmaz. Veri yoksa oran uydurulmaz.</p></section>';
  }
  body=tabbar+body;
 }
 dlg.innerHTML=head+'<div class="pati-creator-scroll"><div class="pati-creator-container">'+(state.detail?body:range+body)+'</div></div>';
}
function patiInsightsNavigate(tab){
 if(!['overview','content','audience'].includes(tab))return;
 patiCreatorStats.tab=tab;patiCreatorStats.detail='';
 patiCreatorInsightsRender();
}
function patiInsightsDetail(detail){
 patiCreatorStats.detail=detail;
 patiCreatorInsightsRender();
}
async function patiCreatorVisitors(force=false){
 if(!me?.id||patiCreatorStats.owner!==me.id)return;
 patiCreatorStats.detail='visitors';
 if(force)patiCreatorStats.visitors=null;
 patiCreatorInsightsRender();
 if(patiCreatorStats.visitors)return;
 const owner=me.id,days=patiCreatorStats.days;
 try{
  const r=await sb.rpc('patiyiz_creator_recent_visitors',{p_days:days});
  if(r.error)throw r.error;
  if(me?.id===owner&&patiCreatorStats.days===days&&patiCreatorStats.owner===owner)
   patiCreatorStats.visitors=r.data||{visitors:[],total:0};
 }catch(e){
  if(me?.id===owner)patiCreatorStats.visitors={error:true};
  console.warn('Ziyaretçiler yüklenemedi:',e?.message||e);
 }
 if(patiCreatorStats.detail==='visitors')patiCreatorInsightsRender();
}
async function patiCreatorInsights(days=30){
 if(!me?.id||view!=='profile'||(profileId&&profileId!==me.id))return;
 days=[7,30,90].includes(Number(days))?Number(days):30;
 let dialog=document.getElementById('pati-creator-dashboard');
 if(!dialog){
  dialog=document.createElement('section');dialog.id='pati-creator-dashboard';
  dialog.className='pati-creator-dashboard';dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','İstatistikler');
  document.body.appendChild(dialog);document.body.classList.add('pati-insights-open');
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();patiInsightsClose()}});
 }
 const owner=me.id;
 const previous=patiCreatorStats.owner===owner?patiCreatorStats:null;
 patiCreatorStats={owner,days,main:null,audience:null,content:null,visitors:null,tab:previous?.tab||'overview',detail:''};
 dialog.dataset.owner=owner;dialog.dataset.days=String(days);
 dialog.innerHTML='<header class="pati-creator-head"><button type="button" data-action="pati-insights-close" aria-label="İstatistikleri kapat">←</button><strong>İstatistikler</strong></header>'+
  '<div class="pati-creator-loading" role="status">İstatistikler yükleniyor…</div>';
 dialog.querySelector('button')?.focus();
 const results=await Promise.allSettled([
  sb.rpc('patiyiz_creator_insights_extended',{p_days:days}),
  sb.rpc('patiyiz_creator_audience',{p_days:days}),
  sb.rpc('patiyiz_creator_content_breakdown',{p_days:days})
 ]);
 if(me?.id!==owner||!dialog.isConnected||dialog.dataset.owner!==owner||dialog.dataset.days!==String(days))return;
 let a=results[0].status==='fulfilled'?results[0].value:{error:results[0].reason};
 const b=results[1].status==='fulfilled'?results[1].value:{error:results[1].reason};
 const c=results[2].status==='fulfilled'?results[2].value:{error:results[2].reason};
 if(a.error||!a.data||typeof a.data!=='object'){
  a=await sb.rpc('patiyiz_creator_insights',{p_days:days}).catch(e=>({error:e}));
 }
 if(me?.id!==owner||!dialog.isConnected||dialog.dataset.days!==String(days))return;
 if(a.error||!a.data||typeof a.data!=='object'){
  console.error('İstatistik RPC hatası:',a.error||'Beklenmeyen yanıt');
  dialog.innerHTML='<header class="pati-creator-head"><button type="button" data-action="pati-insights-close">←</button><strong>İstatistikler</strong></header>'+
   '<div class="pati-creator-failure" role="alert"><strong>İstatistikler yüklenemedi</strong><p>Bağlantını kontrol edip yeniden dene.</p>'+
   '<button type="button" data-action="pati-insights-period" data-id="'+days+'">Tekrar dene</button></div>';
  return;
 }
 patiCreatorStats.main=a.data;
 patiCreatorStats.audience=!b.error&&b.data&&typeof b.data==='object'?b.data:{error:true};
 patiCreatorStats.content=!c.error&&c.data&&typeof c.data==='object'?c.data:{error:true};
 if(days===30){patiCreatorPreview={owner,value:a.data,fetched:Date.now(),pending:false};const preview=document.getElementById('pati-profile-insights-value');if(preview?.isConnected){preview.textContent=patiInsightsMetric(a.data.profile_visits);const arrow=document.getElementById('pati-profile-insights-arrow');if(arrow){const change=(Number(a.data.profile_visits)||0)-(Number(a.data.profile_visits_previous)||0);arrow.textContent=change>0?'↗':change<0?'↘':'→';arrow.className='pati-profile-insights-arrow '+(change>0?'increase':change<0?'decrease':'neutral')}}}
 patiCreatorInsightsRender();
}
function patiRecordProfileVisit(id){
 if(!me?.id||!id||id===me.id||document.hidden)return;
 const key=me.id+':'+id+':'+new Date().toISOString().slice(0,10);if(patiProfileVisitRecorded.has(key))return;
 patiProfileVisitRecorded.add(key);
 void sb.rpc('patiyiz_record_profile_visit',{p_profile:id}).then(({error})=>{if(error)patiProfileVisitRecorded.delete(key)}).catch(()=>patiProfileVisitRecorded.delete(key));
}
function patiWatchReelAttach(video){
 if(!video||video.dataset.patiWatchTracked)return;
 video.dataset.patiWatchTracked='1';
 const id=video.closest?.('.pati-reel-item')?.dataset?.post;if(!id)return;
 let started=0,seconds=0,working=false;
 const flush=()=>{
  if(!me?.id||!sb||!seconds||working)return;
  const qty=Math.min(30,Math.floor(seconds));if(!qty)return;
  seconds-=qty;working=true;
  void sb.rpc('patiyiz_record_reel_watch',{p_post:id,p_seconds:qty}).then(({error})=>{
   if(error)console.warn('Reels izlenme istatistiği gönderilemedi.');
  }).catch(()=>{}).finally(()=>{working=false});
 };
 const stop=()=>{if(started){seconds+=Math.min(30,(performance.now()-started)/1000);started=0;if(seconds>=3)flush()}};
 video.addEventListener('playing',()=>{if(!document.hidden&&!started)started=performance.now()});
 video.addEventListener('pause',stop);video.addEventListener('ended',stop);
 video.addEventListener('timeupdate',()=>{if(started&&performance.now()-started>=12000){stop();flush();if(!video.paused&&!document.hidden)started=performance.now()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(!video.paused)started=performance.now()});
}

function settingsPage(){
 void patiSafetyRefresh();
 const p=current(),privateOn=p.is_private===true,policy=p.dm_policy||'everyone';
 const link=(name,desc,act,ic)=>'<button type="button" class="pati-settings-row" data-action="'+act+'"><span class="pati-settings-icon">'+ic+'</span><span class="pati-settings-copy"><strong>'+name+'</strong><small>'+desc+'</small></span><span class="pati-settings-arrow">›</span></button>';
 const section=(title,body)=>'<section class="pati-settings-section"><h2>'+title+'</h2><div class="pati-settings-items">'+body+'</div></section>';

 const privateRow='<button type="button" class="pati-settings-row pati-settings-private" data-action="pati-private-toggle" role="switch" aria-checked="'+privateOn+'"><span class="pati-settings-icon">🔒</span><span class="pati-settings-copy"><strong>Gizli hesap</strong><small>Yeni takipçilerin için onay iste</small></span><span class="pati-settings-switch"></span></button>';
 const dm='<div class="pati-settings-choice"><strong>Kimler mesaj gönderebilir?</strong><div class="pati-safety-buttons">'+[['everyone','Herkes'],['following','Takip ettiklerim'],['none','Hiç kimse']].map(([id,label])=>'<button type="button" data-action="pati-dm-policy" data-id="'+id+'" aria-pressed="'+(policy===id)+'" class="'+(policy===id?'active':'')+'">'+label+'</button>').join('')+'</div></div>';
 const privacy=privateRow+link('Yakın Arkadaşlar','Hikâyelerini kimlerin göreceğini seç','pati-close-friends-open','★')+dm+link('Yorum kelime filtreleri','İstemediğin kelimeleri engelle','pati-comment-filter','⊘')+link('Engellenenler','Engellediğin hesapları yönet','blocked-list','🚫');
 const security=link('Şifremi değiştir','Şifreni güvenle güncelle','settings-password','⌑')+'<button type="button" class="pati-settings-row" data-action="dm-receipts-toggle" role="switch" aria-checked="'+patiDmReadReceiptsEnabled()+'"><span class="pati-settings-icon">✓</span><span class="pati-settings-copy"><strong>Görüldü bilgisi</strong><small>'+(patiDmReadReceiptsEnabled()?'Açık':'Kapalı')+'</small></span><span class="pati-settings-arrow">›</span></button>'+'<button type="button" class="pati-settings-row" data-view="notifications"><span class="pati-settings-icon">♧</span><span class="pati-settings-copy"><strong>Bildirim Merkezi</strong><small>Bildirim ve cihaz ayarları</small></span><span class="pati-settings-arrow">›</span></button>';
 main.innerHTML=header('Ayarlar ve Gizlilik','Hesabını ve gizliliğini yönet.')+'<div class="pati-settings-list pati-settings-v2">'+section('Gizlilik',privacy)+section('Takip istekleri','<div class="pati-settings-requests">'+patiFollowRequestsMarkup()+'</div>')+section('Hesap ve güvenlik',security)+section('Diğer','<div class="pati-settings-links"><a href="privacy.html" target="_blank" rel="noopener">Gizlilik Politikası</a><a href="terms.html" target="_blank" rel="noopener">Kullanım Şartları</a></div>'+link('Çıkış yap','','logout','↪')+(!isAdmin?link('Hesabımı kalıcı olarak sil','','delete-account-open','!'):'')+(isAdmin?link('Yönetim Paneli','','open-admin','▣'):''))+'<p class="pati-settings-warning">Önceden herkese açık paylaşılmış medya bağlantıları geri alınamayabilir.</p></div>';
}
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
 for(const key of ['posts','followers','following']){const b=wrap.querySelector('[data-pati-count="'+key+'"]');if(b)b.textContent=key==='posts'&&typeof patiCollabs!=='undefined'?Number(stats[key]||0)+patiCollabs.rows.filter(x=>x.user_id===id&&x.status==='accepted').length:stats[key]}
 if(id===me?.id&&window.PatiyizFollowerMilestones){
  const hint=main.querySelector('.pati-follower-hint');
  if(hint)hint.innerHTML=window.PatiyizFollowerMilestones.profileHint(stats.followers);
 }
}

// Verification requests already exist. The profile displays the latest own request only.
let patiVerificationState={owner:'',loading:false,loaded:false,latest:null};
async function patiVerificationLoad(){
 if(!me?.id||!sb)return;
 const uid=me.id;
 if(patiVerificationState.owner!==uid)patiVerificationState={owner:uid,loading:false,loaded:false,latest:null};
 if(patiVerificationState.loading||patiVerificationState.loaded)return;
 patiVerificationState.loading=true;
 try{
  const r=await sb.from('verification_requests').select('status,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(1);
  if(r.error)throw r.error;
  if(me?.id!==uid)return;
  patiVerificationState.latest=r.data?.[0]||null;
  patiVerificationState.loaded=true;
  if(view==='profile'&&(!profileId||profileId===uid))render();
 }catch(error){console.warn('Mavi tik talebi yüklenemedi:',error?.message||error)}
 finally{if(me?.id===uid)patiVerificationState.loading=false}
}
function patiVerificationProfileAction(){
 if(!me?.id||current()?.is_verified)return '';
 if(patiVerificationState.owner!==me.id)patiVerificationState={owner:me.id,loading:false,loaded:false,latest:null};
 if(!patiVerificationState.loaded&&!patiVerificationState.loading)void patiVerificationLoad();
 const pending=patiVerificationState.latest?.status==='pending';
 return '<div class="pati-profile-verify">'+
 (pending?'<span class="pati-profile-verify-pending" role="status">🔵 Mavi tik talebin incelemede</span>':
 '<button type="button" class="pati-profile-verify-button" data-action="verification-request">🔵 Mavi tik talep et</button>')+
 (patiVerificationState.latest?.status==='rejected'?'<small>Önceki talebin reddedildi. Yeniden başvurabilirsin.</small>':'')+
 '<small>Doğrulama yalnızca yönetici incelemesiyle verilir.</small></div>';
}


/* One profile link, guaranteed to point only to a real Instagram profile URL. */
/* Profile links accept regular web URLs, not a hard-coded social platform. */
const PATI_PROFILE_LINK_LIMIT=3;
function patiNormalizeProfileUrl(value){
 const entry=String(value||'').trim();
 if(!entry||entry.length>1000)throw Error('Geçerli bir bağlantı adresi gir.');
 if(/[\u0000-\u001f\u007f]/.test(entry)||/^[a-z][a-z0-9+.-]*:/i.test(entry)&&!/^https?:\/\//i.test(entry))throw Error('Yalnızca güvenli web bağlantıları ekleyebilirsin.');
 let url;
 try{url=new URL(/^https?:\/\//i.test(entry)?entry:'https://'+entry)}
 catch(_){throw Error('Bağlantı adresini kontrol et.')}
 if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.hostname.indexOf('.')<1||/\s/.test(entry)||url.href.length>1000)throw Error('Bağlantı adresini kontrol et.');
 if(/^(localhost|127(?:\.\d+){3}|0\.0\.0\.0|169\.254\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)$/i.test(url.hostname))throw Error('Yerel ağ adresleri profil bağlantısı olarak eklenemez.');
 return url.href;
}
function patiProfileLinks(profileRow){
 return Array.isArray(profileRow?.profile_links)?profileRow.profile_links.slice(0,PATI_PROFILE_LINK_LIMIT).flatMap(link=>{
  if(!link||typeof link!=='object')return [];
  let url;try{url=patiNormalizeProfileUrl(link.url)}catch(_){return []}
  const title=String(link.title||'').trim().slice(0,60)||new URL(url).hostname.replace(/^www\./,'');
  return [{title,url}];
 }):[];
}
function patiProfileLinksHTML(profileRow){
 const links=patiProfileLinks(profileRow);
 if(!links.length)return '';
 return '<section class="pati-profile-links" aria-label="Bağlantılar">'+
 '<div class="pati-profile-links-list">'+links.map(link=>'<a class="pati-profile-link" href="'+esc(link.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(link.title)+' bağlantısını aç"><span class="pati-profile-link-label">'+esc(link.title)+'</span><span class="pati-profile-link-domain">'+esc(new URL(link.url).hostname.replace(/^www\./,''))+'</span><span class="pati-profile-link-arrow" aria-hidden="true">↗</span></a>').join('')+'</div></section>';
}
function patiProfileLinkEditorRow(link={}){
 return '<div class="pati-profile-link-row">'+
 '<div class="pati-profile-link-inputs"><label>Bağlantı adı<input type="text" name="link_title" maxlength="60" placeholder="Örn. Web sitem" value="'+esc(link.title||'')+'"></label>'+
 '<label>Bağlantı adresi<input type="text" name="link_url" maxlength="1000" inputmode="url" placeholder="https://site.com" value="'+esc(link.url||'')+'"></label></div>'+
 '<button type="button" class="pati-profile-link-remove" data-action="pati-profile-link-remove" aria-label="Bağlantıyı kaldır">'+ico('trash')+'</button></div>';
}
function patiUpdateProfileLinkEditor(form){
 const rows=form?.querySelectorAll('.pati-profile-link-row')||[];
 const count=form?.querySelector('#pati-profile-links-count');
 if(count)count.textContent=rows.length+' / '+PATI_PROFILE_LINK_LIMIT;
 const add=form?.querySelector('[data-action="pati-profile-link-add"]');
 if(add)add.disabled=rows.length>=PATI_PROFILE_LINK_LIMIT;
}
function patiCollectProfileLinks(form){
 const rows=[...form.querySelectorAll('.pati-profile-link-row')];
 if(rows.length>PATI_PROFILE_LINK_LIMIT)throw Error('En fazla '+PATI_PROFILE_LINK_LIMIT+' bağlantı ekleyebilirsin.');
 const links=[],seen=new Set();
 for(const row of rows){
  const title=String(row.querySelector('[name="link_title"]')?.value||'').trim();
  const raw=String(row.querySelector('[name="link_url"]')?.value||'').trim();
  if(!raw&&!title)continue;
  if(!raw)throw Error('Her bağlantı için bir adres yaz.');
  if(title.length>60)throw Error('Bağlantı adı en fazla 60 karakter olabilir.');
  const url=patiNormalizeProfileUrl(raw);
  if(seen.has(url))throw Error('Aynı bağlantıyı iki kez ekleyemezsin.');
  seen.add(url);
  links.push({title:title||new URL(url).hostname.replace(/^www\./,''),url});
 }
 return links;
}
function patiBindProfileLinkEditor(form){
 if(!form)return;
 patiUpdateProfileLinkEditor(form);
 form.addEventListener('click',event=>{
  const add=event.target.closest('[data-action="pati-profile-link-add"]');
  if(add){
   event.preventDefault();
   const list=form.querySelector('#pati-profile-links-editor');
   if(!list||list.querySelectorAll('.pati-profile-link-row').length>=PATI_PROFILE_LINK_LIMIT)return;
   list.insertAdjacentHTML('beforeend',patiProfileLinkEditorRow());
   patiUpdateProfileLinkEditor(form);
   list.lastElementChild?.querySelector('[name="link_title"]')?.focus();
   return;
  }
  const remove=event.target.closest('[data-action="pati-profile-link-remove"]');
  if(remove){event.preventDefault();remove.closest('.pati-profile-link-row')?.remove();patiUpdateProfileLinkEditor(form)}
 });
}
function profilePage(){
 const p=profile(profileId||me.id),own=p.id===me.id,pets=data.pets.filter(x=>x.owner_id===p.id);
 void patiSafetyRefresh();if(!own)patiRecordProfileVisit(p.id);
 const privateLocked=!own&&p.is_private&&!followed.has(p.id);
 if(profilePostsTab==='reposts')void patiEnsureRepostSources(p.id);
 const posts=[...(typeof patiCollabPartnerPosts==='function'?patiCollabPartnerPosts(p.id):data.posts.filter(x=>x.author_id===p.id))].sort((a,b)=>{
 const ap=data.pins.find(x=>x.owner_id===p.id&&x.post_id===a.id),bp=data.pins.find(x=>x.owner_id===p.id&&x.post_id===b.id);
 if(!!ap!==!!bp)return ap?-1:1;
 if(ap&&bp)return new Date(ap.created_at)-new Date(bp.created_at);
 return new Date(b.created_at)-new Date(a.created_at);
 });
 if(typeof patiCollabLoadProfile==='function'&&typeof patiCollabs!=='undefined'&&!patiCollabs.profilesLoaded.has(p.id)&&!patiCollabs.profilesBusy.has(p.id))void patiCollabLoadProfile(p.id);
 const myFollowing=new Set(data.follows.filter(f=>f.follower_id===me.id).map(f=>f.followee_id));
 const mutualFollowers=!own?[...new Set(data.follows.filter(f=>f.followee_id===p.id&&f.follower_id!==me.id&&myFollowing.has(f.follower_id)&&!blocked.has(f.follower_id)).map(f=>f.follower_id))].slice(0,20):[];
 const mutualMarkup=mutualFollowers.length?'<div class="pati-mutual-followers"><span class="pati-mutual-avatars">'+mutualFollowers.slice(0,3).map(id=>'<button type="button" data-action="view-user" data-id="'+esc(id)+'" aria-label="'+esc(profile(id).display_name)+' profiline git">'+avatar(profile(id),'s')+'</button>').join('')+'</span><span>'+mutualFollowers.slice(0,2).map(id=>'<strong>'+esc(profile(id).display_name)+'</strong>').join(', ')+(mutualFollowers.length>2?' ve '+(mutualFollowers.length-2)+' kişi daha':'')+' ortak takipçi</span></div>':'';
 const followsMe=!own&&data.follows.some(f=>f.follower_id===p.id&&f.followee_id===me.id);
 const followBack=!own&&!followed.has(p.id)&&followsMe;
 const cachedCounts=profileCountCache.get(p.id)?.value;const followers=cachedCounts?.followers??data.follows.filter(f=>f.followee_id===p.id).length,following=cachedCounts?.following??data.follows.filter(f=>f.follower_id===p.id).length;
 const stories=data.stories.filter(x=>x.author_id===p.id&&new Date(x.expires_at).getTime()>Date.now());const assignedIds=new Set(data.highlightItems.filter(x=>data.highlightAlbums.some(a=>a.id===x.album_id&&a.owner_id===p.id)).map(x=>x.story_id));const highlights=data.stories.filter(x=>x.author_id===p.id&&x.is_highlight&&!assignedIds.has(x.id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));const albums=data.highlightAlbums.filter(x=>x.owner_id===p.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 const liveProfileStory=stories.some(x=>!x.pati_pet_highlight&&!blocked.has(x.author_id));
 if(typeof patiStorySeenSync==='function')void patiStorySeenSync();
 const unseenProfileStory=liveProfileStory&&(typeof patiHasUnseenStory!=='function'||patiHasUnseenStory(p.id));
 if(!['media','reels','videos','text','reposts'].includes(profilePostsTab))profilePostsTab='media';
 const active=privateLocked?[]:profilePostsTab==='reposts'?patiRepostedPosts(p.id):
  profilePostsTab==='reels'?posts.filter(x=>x.post_format==='reels'&&!!(x.video_url||x.media_videos?.length)):
  profilePostsTab==='videos'?posts.filter(x=>x.post_format!=='reels'&&!!(x.video_url||x.media_videos?.length)):
  profilePostsTab==='text'?posts.filter(x=>!x.image_url&&!x.images?.length&&!x.video_url&&!x.media_videos?.length):
  posts.filter(x=>x.post_format!=='reels'&&!!(x.image_url||x.images?.length||x.video_url||x.media_videos?.length));
 const gridTabIcon='<svg class="pati-profile-tab-icon pati-profile-grid-icon" viewBox="0 0 24 24" aria-hidden="true">'+[3,10,17].flatMap(y=>[3,10,17].map(x=>'<rect x="'+x+'" y="'+y+'" width="4.6" height="4.6" rx=".7"/>')).join('')+'</svg>';
 const reelsTabIcon='<svg class="pati-profile-tab-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2.5" width="16" height="19" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m10 7.8 6 4.2-6 4.2Z" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linejoin="round"/></svg>';
 const repostTabIcon='<svg class="pati-profile-tab-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10V7.5A3.5 3.5 0 0 1 7 4h12m0 0-3.4-3M19 4l-3.4 3M20.5 14v2.5A3.5 3.5 0 0 1 17 20H5m0 0 3.4-3M5 20l3.4 3" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const videoTabIcon='<svg class="pati-profile-tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="3" stroke="currentColor" stroke-width="2.25"/><path d="m10 9 5 3-5 3Z" fill="currentColor"/></svg>';
 const textTabIcon='<svg class="pati-profile-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 6h14M5 11h14M5 16h9M5 21h7"/></svg>';
 const iconTabs=[['media',gridTabIcon,'Gönderiler'],['reels',reelsTabIcon,'Reels'],['videos',videoTabIcon,'Videolar'],['text',textTabIcon,'Tweetler'],['reposts',repostTabIcon,'Yeniden paylaşılanlar']];
 if(own)void patiLoadProfileViewCounts(posts.map(x=>x.id),p.id);
 const grid=active.map(x=>{
  const cover=x.video_url?(x.video_cover_url||x.image_url):(x.images?.[0]||x.image_url);
  const multiPhoto=!x.video_url&&Array.isArray(x.images)&&x.images.filter(Boolean).length>1;
  const thumbnail=cover?'<img class="'+(x.selfie_mirrored?'pati-selfie-mirrored':'')+'" loading="lazy" decoding="async" src="'+esc(cover)+'" alt="Paylaşım görseli">':x.video_url?'<video class="'+(x.selfie_mirrored?'pati-selfie-mirrored':'')+'" muted playsinline preload="metadata" src="'+esc(x.video_url)+'#t=0.1"></video>':'<span>'+esc(cut(x.body||'Yazılı gönderi',110))+'</span>';
  const mediaIcon=x.video_url?'<span class="pati-profile-play" aria-hidden="true">'+ico('reels-tab')+'</span>':multiPhoto?'<span class="pati-profile-multi" aria-hidden="true">'+ico('grid')+'</span>':'';
  const pinBadge=profilePostsTab==='reposts'?'<span class="pati-profile-reposted" aria-label="Yeniden paylaşıldı">↻</span>':data.pins.some(t=>t.owner_id===p.id&&t.post_id===x.id)?'<span class="pati-profile-pin" aria-label="Sabitlenmiş gönderi">📌</span>':'';
   const views=own?'<span class="pati-profile-view-count" aria-label="Görüntülenme sayısı">◉ <span data-pati-view-count="'+esc(x.id)+'">'+(patiPostViewCounts.has(x.id)?patiPostViewCounts.get(x.id).toLocaleString('tr-TR'):'—')+'</span></span>':'';
  return '<button type="button" class="pati-profile-tile '+(!cover&&!x.video_url?'pati-profile-text-tile':'')+'" data-action="profile-open-post" data-id="'+esc(x.id)+'" aria-label="Paylaşımı aç">'+thumbnail+mediaIcon+pinBadge+views+'</button>';
 }).join('');
 const repostFeed=profilePostsTab==='reposts'&&!privateLocked?
  '<div class="pati-profile-reposts-feed" role="feed" aria-label="Yeniden paylaşılan gönderiler">'+
  (active.length?active.map((post,i)=>'<div class="pati-profile-repost-item" role="article">'+postCard(post,i===0)+'</div>').join(''):
  '<p class="pati-ig-empty">Henüz yeniden paylaşılan gönderi yok.</p>')+'</div>':'';
 const textFeed=profilePostsTab==='text'&& !privateLocked?
 '<div class="pati-profile-text-feed" role="feed" aria-label="Yazı paylaşımları">'+
 (active.length?active.map((x,i)=>
  '<div class="pati-profile-text-item" role="article" aria-label="Yazı paylaşımı">'+
  (data.pins.some(pin=>pin.owner_id===p.id&&pin.post_id===x.id)?'<div class="pati-profile-text-pinned" aria-label="Sabitlenmiş yazı">📌 Sabitlenmiş yazı</div>':'')+
  postCard(x,i===0)+
  '<button type="button" class="pati-profile-text-open" data-action="profile-open-post" data-id="'+esc(x.id)+'" aria-label="Yazı paylaşımını aç">Yazıyı aç '+ico('arrow-right')+'</button>'+
  '</div>').join(''):'<p class="pati-ig-empty">Henüz yazı paylaşımı yok.</p>')+
 '</div>':'';
 const profileContent=privateLocked?'<div class="pati-private-message">🔒 Bu hesap gizli. Gönderilerini görmek için takip isteği gönder.</div>':
  profilePostsTab==='text'?textFeed:profilePostsTab==='reposts'?repostFeed:'<div class="pati-ig-grid">'+(grid||'<p class="pati-ig-empty">Bu bölümde henüz paylaşım yok.</p>')+'</div>';
  main.innerHTML=(own?patiyizProgressCard():'')+'<div class="pati-ig-profile">'+(own?'<div class="pati-profile-topbar"><span class="pati-profile-topbar-title">@'+esc(p.handle||'patiyiz')+'</span><button type="button" class="pati-profile-menu-trigger" data-action="tools" title="Menüyü aç" aria-label="Profil menüsünü aç"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15"/></svg></button></div>':'')+(!own?'<div class="pati-profile-visitor-topbar"><strong class="pati-profile-visitor-username">@'+esc(p.handle||'patiyiz')+'</strong></div>':'')+(!own?'<details class="pati-profile-more-wrap"><summary aria-label="Profil seçenekleri" title="Profil seçenekleri"><span aria-hidden="true">⋯</span></summary><div class="pati-profile-more-menu" role="group" aria-label="Profil işlemleri">'+button('Hesabı bildir','report','data-id="'+esc(p.id)+'" data-kind="profile"')+button(patiSafetyState.restrictions.has(p.id)?'Kısıtlamayı kaldır':'Kısıtla','pati-restrict','data-id="'+esc(p.id)+'"')+'</div></details>':'')+
 '<div class="pati-ig-summary"><div class="pati-ig-avatar '+(unseenProfileStory?'pati-profile-has-story':liveProfileStory?'pati-profile-story-seen':'')+'">'+
 (liveProfileStory?'<button type="button" class="pati-profile-story-view" data-action="story-view" data-id="'+esc(p.id)+'" aria-label="'+esc(p.display_name||'Kullanıcı')+' hikâyesini izle" title="Hikâyeyi izle">'+avatar(p,'l')+'</button>':avatar(p,'l'))+
 (own?'':'')+'</div><div class="pati-ig-info"><div class="pati-ig-handle-row"><strong class="pati-ig-handle">@'+esc(p.handle||'patiyiz')+'</strong>'+verifiedBadge(p)+'</div><strong class="pati-ig-name">'+esc(p.display_name||'Patiyiz üyesi')+'</strong><div class="pati-ig-stats"><span><b data-pati-count="posts">'+((cachedCounts?.posts??posts.filter(x=>x.author_id===p.id).length)+((typeof patiCollabs!=='undefined'?patiCollabs.rows:[]).filter(x=>x.user_id===p.id&&x.status==='accepted').length))+'</b><small>gönderi</small></span><button type="button" data-action="followers-list" data-id="'+esc(p.id)+'" data-mode="followers"><b data-pati-count="followers">'+followers+'</b><small>takipçi</small></button><button type="button" data-action="followers-list" data-id="'+esc(p.id)+'" data-mode="following"><b data-pati-count="following">'+following+'</b><small>takip edilen</small></button></div></div></div>'+
 ((String(p.professional_title||'').trim()||p.bio)?'<div class="pati-ig-about">'+
    (String(p.professional_title||'').trim()?'<div class="pati-ig-profession">'+esc(String(p.professional_title).trim())+'</div>':'')+
    (p.bio?'<div class="pati-ig-bio">'+esc(p.bio)+'</div>':'')+'</div>':'')+
 patiProfileLinksHTML(p)+mutualMarkup+
 
 '<div class="pati-ig-actions">'+(own?button('Profili düzenle','edit-profile')+'<button type="button" class="pati-profile-coin-balance" data-action="paticoin-rewards" aria-label="Puan bakiyen; ödülleri ve görevleri aç"><span class="pati-profile-coin-copy"><small>Puan bakiyen</small><strong id="pati-profile-balance">'+Number((typeof patiCoinState!=='undefined'?patiCoinState.balance:0)||0).toLocaleString('tr-TR')+'</strong></span></button>':button(followed.has(p.id)?'Takiptesin':patiIsFollowRequested(p.id)?'İstek gönderildi':followBack?'Sen de takip et':'Takip et','follow','data-id="'+esc(p.id)+'"'+(followBack?' data-follow-back="true"':''))+button('Mesaj gönder','chat','data-id="'+esc(p.id)+'"'))+'</div>'+(own&&typeof patiCreatorPreviewHTML==='function'?patiCreatorPreviewHTML():'')+(own?patiVerificationProfileAction():'')+
 '<div class="pati-ig-tabs" role="tablist" aria-label="Profil gönderileri">'+iconTabs.map(x=>'<button type="button" role="tab" aria-selected="'+(profilePostsTab===x[0])+'" class="'+(profilePostsTab===x[0]?'active':'')+'" data-action="profile-posts-tab" data-id="'+x[0]+'" aria-label="'+x[2]+'"><span class="pati-profile-tab-label">'+esc(x[2])+'</span></button>').join('')+'</div>'+
 profileContent+
 '</div>';
 void syncProfileCounts(p.id);
 if(own&&typeof patiCreatorPreviewLoad==='function')void patiCreatorPreviewLoad();
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

/* Per-post author controlled pinned comments, with existing replies and likes intact. */
const patiCommentPinCache=new Map(),patiCommentPinBusy=new Set();
async function patiCommentPinEnsure(postId){
 if(!me||!postId||patiCommentPinCache.has(postId)||patiCommentPinBusy.has(postId))return;
 patiCommentPinBusy.add(postId);
 try{
  const r=await sb.from('patiyiz_comment_pins').select('comment_id').eq('post_id',postId).maybeSingle();
  if(r.error)throw r.error;
  patiCommentPinCache.set(postId,r.data?.comment_id||'');
  if(document.getElementById('comment-form')?.dataset.post===postId)showComments(postId);
 }catch(e){console.warn('Sabit yorum yüklenemedi',e?.message||e)}
 finally{patiCommentPinBusy.delete(postId)}
}
async function patiCommentPinToggle(id){
 const form=document.getElementById('comment-form'),postId=form?.dataset.post;
 const post=data.posts.find(p=>p.id===postId);
 const comment=(patiPostCommentPages.get(postId)?.rows||data.comments).find(c=>c.id===id);
 if(!me||!post||post.author_id!==me.id||!comment||comment.post_id!==postId||comment.parent_id)
  throw Error('Yalnızca kendi gönderinin ana yorumunu sabitleyebilirsin.');
 const already=patiCommentPinCache.get(postId)===id;
 const r=already?await sb.from('patiyiz_comment_pins').delete().eq('post_id',postId).eq('owner_id',me.id):
 await sb.from('patiyiz_comment_pins').upsert({post_id:postId,comment_id:id,owner_id:me.id},{onConflict:'post_id'});
 if(r.error)throw r.error;
 patiCommentPinCache.set(postId,already?'':id);
 showComments(postId);notify(already?'Yorumun sabiti kaldırıldı.':'Yorum en üstte sabitlendi.');
}
function patiMentionsHTML(body){
 const plain=esc(body||'');
 return plain.replace(/(^|[^\p{L}\p{N}_])@([\p{L}\p{N}._]{2,40})/gu,(whole,prefix,handle)=>{
  const person=data.profiles.find(x=>String(x.handle||'').toLocaleLowerCase('tr-TR')===handle.toLocaleLowerCase('tr-TR')&&!blocked.has(x.id));
  // Keep @mentions visibly blue even when the mentioned profile has not yet loaded.
  // A tap resolves the public handle under normal RLS; blocked users remain inaccessible.
  return prefix+'<button type="button" class="pati-mention-link" data-action="pati-mention-profile" data-handle="'+esc(handle)+'"'+(person?' data-id="'+esc(person.id)+'"':'')+' aria-label="@'+esc(handle)+' profiline git">@'+esc(handle)+'</button>';
 });
}
function patiOpenProfileOnly(userId){
 if(!me||!userId||blocked.has(userId))return;
 const fromComments=Boolean(document.getElementById('comment-form')||document.getElementById('reply-form'));
 const fromLikers=Boolean(document.getElementById('pati-post-likers-form'));
 if(fromComments||fromLikers){
  // The comment sheet lives outside #main-content; it must be removed
  // before painting the destination profile or it stays above the new page.
  document.activeElement?.blur?.();
  closeModal(true);
  if(fromLikers)patiPostLikersState={postId:'',owner:'',rows:[],next:0,hasMore:false,loading:false};
  patiyizCommentSheetPost='';
  selectedPostId='';
  patiDetailState=null;
  patiExploreReturnTo=false;
  patiDmSharedReturnPeer='';
 }
 followReturnList=view==='follows-list';
 if(!followReturnList&&view!=='profile')lastDetailView=view;
 profileId=userId;
 navigate('profile');
}
async function patiOpenMentionProfile(handle,knownId=''){
 const username=String(handle||'').trim().replace(/^@/,'').slice(0,40);
 if(!/^[\p{L}\p{N}._]{2,40}$/u.test(username)||!me||!sb)return;
 const owner=me.id;
 let person=data.profiles.find(p=>String(p.handle||'').toLocaleLowerCase('tr-TR')===username.toLocaleLowerCase('tr-TR')&&(!knownId||p.id===knownId));
 if(!person){
  const result=await sb.from('profiles').select('id,display_name,handle,avatar_url,is_verified,is_private').ilike('handle',username).limit(1);
  if(result.error){console.warn('Etiketli profil sorgusu:',result.error.message);notify('Etiketlenen profil açılamadı.');return}
  person=result.data?.find(p=>String(p.handle||'').toLocaleLowerCase('tr-TR')===username.toLocaleLowerCase('tr-TR'));
  if(person){
   const index=data.profiles.findIndex(p=>p.id===person.id);
   if(index<0)data.profiles.push(person);
   else data.profiles[index]={...data.profiles[index],...person};
  }
 }
 if(me?.id!==owner)return;
 if(!person||blocked.has(person.id)){notify('Bu kullanıcı profili görüntülenemiyor.');return}
 patiOpenProfileOnly(person.id);
}

function patiMentionOpen(mode){
 const form=document.getElementById(mode==='comment'?'comment-form':'post-form');
 if(!form)return;
 const target=form.querySelector('textarea[name="body"]');
 if(!target)return;
 let panel=form.querySelector('.pati-mention-picker');
 if(panel){panel.remove();return}
 panel=document.createElement('div');
 panel.className='pati-mention-picker';
 panel.setAttribute('role','region');
 panel.setAttribute('aria-label','Kişi etiketle');
 panel.innerHTML='<div class="pati-mention-header"><strong>Kişi etiketle</strong><button type="button" class="pati-mention-close" aria-label="Kişi aramayı kapat">×</button></div>'+
 '<label class="pati-mention-search-label" for="pati-mention-search-field">Kişi ara</label>'+
 '<input id="pati-mention-search-field" type="search" class="pati-mention-search" placeholder="İsim veya kullanıcı adı" aria-label="Etiketlenecek kullanıcı" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="search">'+
 '<div class="pati-mention-results" role="listbox" aria-label="Eşleşen kullanıcılar"></div>';
 // The comment composer is a flex row. Inserting this panel after its textarea
 // used to crush both the text field and all search results into a narrow column.
 const editor=mode==='comment'?target.closest('.pati-comment-editor-row'):null;
 if(editor?.parentElement?.classList.contains('modal-footer')){
  editor.insertAdjacentElement('beforebegin',panel);
 }else target.insertAdjacentElement('afterend',panel);
 panel.querySelector('.pati-mention-close')?.addEventListener('click',()=>{
  panel.remove();target.focus({preventScroll:true});
 });
 const search=panel.querySelector('.pati-mention-search'),results=panel.querySelector('.pati-mention-results');
 let remote=[],timeout=null,request=0;
 const paint=()=>{
  if(!panel.isConnected)return;
  const q=search.value.trim().toLocaleLowerCase('tr-TR');
  const pool=[...new Map([...remote,...data.profiles].filter(p=>p?.id).map(p=>[p.id,p])).values()];
  const list=pool.filter(p=>p.id!==me?.id&&!blocked.has(p.id)&&p.handle&&(!q||(p.handle+' '+(p.display_name||'')).toLocaleLowerCase('tr-TR').includes(q))).slice(0,30);
  results.innerHTML=list.length?list.map(p=>'<button type="button" role="option" class="pati-mention-person" data-action="pati-mention-select" data-handle="'+esc(p.handle)+'">'+avatar(p,'s')+'<span class="pati-mention-person-name"><strong>'+esc(p.display_name||p.handle)+'</strong><small>@'+esc(p.handle)+'</small></span></button>').join(''):'<p class="pati-mention-empty">Kullanıcı bulunamadı.</p>';
 };
 search.addEventListener('input',()=>{
  paint();clearTimeout(timeout);const token=++request;
  const query=search.value.trim().replace(/[^\p{L}\p{N}_.]/gu,'').slice(0,40);
  if(query.length<2||!sb)return;
  timeout=setTimeout(async()=>{
   try{
    const result=await sb.from('profiles').select('id,display_name,handle,avatar_url,is_verified').ilike('handle','%'+query+'%').limit(30);
    if(result.error)throw result.error;
    if(!panel.isConnected||token!==request)return;
    remote=result.data||[];
    const known=new Set(data.profiles.map(p=>p.id));
    for(const person of remote)if(!known.has(person.id)){data.profiles.push(person);known.add(person.id)}
    paint();
   }catch(error){console.warn('Etiketlenecek kullanıcı araması:',error?.message||error)}
  },250);
 });
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();panel.remove();target.focus({preventScroll:true})}});
 paint();search.focus({preventScroll:true});
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
 void patiCommentPinEnsure(postId);
 const pinnedCommentId=patiCommentPinCache.get(postId)||'';
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
   '<div class="pati-sheet-comment-avatar"><button type="button" class="pati-comment-profile-avatar" data-action="view-user" data-id="'+esc(c.author_id)+'" aria-label="'+esc(fullName)+' profiline git">'+avatar(person,'s')+'</button></div>'+
   '<div class="pati-sheet-comment-main"><div class="pati-sheet-comment-line"><button type="button" class="pati-comment-profile-name" data-action="view-user" data-id="'+esc(c.author_id)+'" aria-label="'+esc(fullName)+' profiline git">'+fullName+'</button><time>'+patiCommentAge(c.created_at)+'</time></div>'+
   '<p>'+patiMentionsHTML(c.body)+'</p>'+(c.id===pinnedCommentId?'<span class="pati-comment-pinned-label">📌 Sabitlenen yorum</span>':'')+
   '<div class="comment-actions">'+
   '<button type="button" data-action="comment-reply" data-id="'+esc(c.id)+'">Yanıtla</button>'+
 (post?.author_id===me.id&&!c.parent_id?'<button type="button" data-action="comment-pin" data-id="'+esc(c.id)+'">'+(pinnedCommentId===c.id?'Sabiti kaldır':'Sabitle')+'</button>':'')+
   (c.author_id===me.id?'<button type="button" data-action="comment-delete" data-id="'+esc(c.id)+'">Sil</button>':'<button type="button" data-action="report" data-kind="comment" data-id="'+esc(c.id)+'">Bildir</button>')+
   '</div>'+
   (replyList.length?'<button type="button" class="pati-comment-replies-toggle" data-action="comment-thread-toggle" data-id="'+esc(c.id)+'" aria-expanded="'+isExpanded+'">'+
    (isExpanded?'— Yanıtları gizle':'— '+replyList.length+' diğer yanıtı gör')+'</button>':'')+
   (replyList.length&&isExpanded?'<div class="pati-comment-children">'+replyList.map(child=>renderComment(child,depth+1,chain)).join('')+'</div>':'')+
   '</div><button type="button" class="pati-comment-heart '+(isLiked?'active':'')+'" data-action="comment-like" data-id="'+esc(c.id)+'" aria-label="'+(isLiked?'Yorum beğenisini kaldır':'Yorumu beğen')+'" aria-pressed="'+isLiked+'">'+ico('heart')+'<small>'+count+'</small></button></div>';
 };
 const roots=items.filter(c=>!c.parent_id||!commentById.has(c.parent_id));
 roots.sort((a,b)=>Number(b.id===pinnedCommentId)-Number(a.id===pinnedCommentId)||new Date(a.created_at)-new Date(b.created_at));
 const intro=post&&author?'<section class="pati-comment-post-summary">'+
  '<div class="pati-comment-post-user"><button type="button" class="pati-comment-profile-avatar" data-action="view-user" data-id="'+esc(author.id)+'" aria-label="'+esc(displayName(author))+' profiline git">'+avatar(author,'s')+'</button><button type="button" class="pati-comment-profile-name" data-action="view-user" data-id="'+esc(author.id)+'" aria-label="'+esc(displayName(author))+' profiline git">'+displayName(author)+'</button>'+
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
 '<button type="button" class="pati-comment-mention" data-action="pati-mention-open" data-id="comment" aria-label="Kişi etiketle"><span aria-hidden="true">@</span> Etiketle</button><button type="submit" class="pati-comment-send">Gönder</button></div>';
 const input=form.querySelector('[name="body"]');if(input)input.value=draft;
 if(parent){form.dataset.parent=parent;const who=profile(data.comments.find(c=>c.id===parent)?.author_id);const hint=form.querySelector('#comment-reply-hint');if(hint)hint.innerHTML='↳ '+displayName(who)+' kullanıcısına yanıt <button type="button" data-action="comment-reply-cancel">× Vazgeç</button>'}
 const list=form.querySelector('.comment-list');if(list)list.scrollTop=scroll;
}
const PATI_MOBILE_FULL_PAGE_FORMS=new Set(['profile-form','pet-form','lost-form','adoption-form','care-form','post-form','story-form']);
PATI_MOBILE_FULL_PAGE_FORMS.add('dm-new-form');
PATI_MOBILE_FULL_PAGE_FORMS.add('pati-group-create-form');
function modal(title,form,id='entry-form'){if(id!=='pati-group-message-form'&&typeof patiGroupLiveStop==='function')patiGroupLiveStop();let root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop" data-action="close"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button type="button" class="close-modal" data-action="close" aria-label="Pencereyi kapat">×</button></div><form id="${id}"><div class="modal-content">${form}</div><div class="pati-upload-status" role="status" aria-live="polite" hidden><i class="pati-upload-spinner"></i><span>Yükleniyor…</span></div><div class="modal-footer"><button class="outline-btn" type="button" data-action="close">İptal</button><button class="primary-btn" type="submit">Kaydet</button></div></form></section></div>`;
 if(PATI_MOBILE_FULL_PAGE_FORMS.has(id)){
  root.querySelector('.modal-backdrop')?.classList.add('pati-full-page-form-backdrop');
  const dialog=root.querySelector('.modal');
  dialog?.classList.add('pati-mobile-full-page-form');
  dialog?.querySelector('.close-modal')?.setAttribute('aria-label','Geri dön ve düzenlemeyi kapat');
 }
}
function closeModal(force=false){if(!force&&busy&&document.querySelector('#modal-root .pati-upload-status:not([hidden])')){notify('İşlem sürüyor. Tamamlanmasını bekle.',true);return}if(typeof patiGroupLiveStop==='function')patiGroupLiveStop();window.PatiyizSystemMediaFlow?.close?.();if(typeof patiPetPhotoObjectUrl!=='undefined'&&patiPetPhotoObjectUrl){URL.revokeObjectURL(patiPetPhotoObjectUrl);patiPetPhotoObjectUrl=''}window.PatiyizReelsEditor?.dispose();clearPatiMediaUrls();if(typeof lostPhotoObjectUrl!=='undefined'&&lostPhotoObjectUrl){URL.revokeObjectURL(lostPhotoObjectUrl);lostPhotoObjectUrl=''}$('#modal-root').innerHTML='';if(view==='messages'&&patiActiveGroupId&&document.getElementById('pati-group-message-form'))patiGroupLiveStart(patiActiveGroupId);if(document.getElementById('story-overlay')&&!storyTimer&&storyItems.length)storyTimer=setTimeout(()=>stepStory(1),6000)}
const species=['Kedi','Köpek','Muhabbet kuşu','Papağan','Kanarya','Tavşan','Hamster','Ginepig','Balık','Kaplumbağa','Kuş','Diğer'];
const PATI_POPULAR_BREEDS={
 Kedi:['Tekir','British Shorthair','Scottish Fold','Siyam','Ankara Kedisi','Van Kedisi','İran Kedisi','Maine Coon','Ragdoll','Bengal','Sfenks (Sphynx)','Russian Blue','Norveç Orman Kedisi','Sibirya Kedisi','Melez','Bilmiyorum','Diğer'],
 Köpek:['Golden Retriever','Labrador Retriever','Alman Çoban Köpeği','Kangal','Poodle (Kaniş)','Pomeranian','Maltese Terrier','Chihuahua','French Bulldog','Pug','Beagle','Border Collie','Rottweiler','Doberman','Sibirya Kurdu (Husky)','Samoyed','Jack Russell Terrier','Yorkshire Terrier','Cocker Spaniel','Shih Tzu','Melez','Bilmiyorum','Diğer']
};
function patiPetBreedOptions(type){return PATI_POPULAR_BREEDS[type]||[]}
function patiSyncPetBreedSelect(form,preferred=''){
 const type=form.querySelector('[name="species"]')?.value||'';
 const list=patiPetBreedOptions(type),box=form.querySelector('.pati-pet-breed-picker'),choose=form.querySelector('[name="breed_choice"]'),other=form.querySelector('.pati-pet-free-breed'),input=form.querySelector('[name="breed"]');
 if(!box||!choose||!other||!input)return;
 box.hidden=!list.length;
 choose.replaceChildren();
 for(const name of list){const opt=document.createElement('option');opt.value=name;opt.textContent=name;choose.appendChild(opt)}
 if(list.length){
  choose.value=list.includes(preferred)?preferred:(preferred?'Diğer':'Bilmiyorum');
 }
 const manual=!list.length||choose.value==='Diğer';
 other.hidden=!manual;
 input.disabled=!manual;
 if(!manual)input.value='';
 if(manual&&preferred&&preferred!=='Diğer')input.value=preferred;
}

const petGenders=['Belirtilmedi','Erkek','Dişi','Bilinmiyor','İnterseks'];
const ownPets=()=>data.pets.filter(p=>p.owner_id===me.id);
const petOptions=()=>`<div class="pati-field"><label>Hayvan profili (isteğe bağlı)</label><select name="pet_id"><option value="">Seçilmedi</option>${ownPets().map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>`;
let patiMediaUrls=[];
function clearPatiMediaUrls(){for(const url of patiMediaUrls)URL.revokeObjectURL(url);patiMediaUrls=[]}
function makePatiMediaUrl(file){const url=URL.createObjectURL(file);patiMediaUrls.push(url);return url}

/* Close friends: server decides who can read private stories and media. */
let patiCloseFriendsIds=new Set();

 async function patiCloseFriendsPicker(){
  if(!me?.id)return false;
  const owner=me.id;
  const res=await sb.from('patiyiz_close_friends').select('friend_id').eq('owner_id',owner);
  if(res.error)throw res.error;
  if(me?.id!==owner)return false;
  const initial=new Set((res.data||[]).map(x=>x.friend_id)),selected=new Set(initial);
  const people=data.profiles.filter(p=>p.id!==owner&&!blocked.has(p.id)).sort((a,b)=>Number(initial.has(b.id))-Number(initial.has(a.id))||String(a.display_name||'').localeCompare(String(b.display_name||''),'tr'));
  const existing=document.getElementById('pati-close-picker');if(existing)return false;
  const layer=document.createElement('section');layer.id='pati-close-picker';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.className='pati-close-picker';
  layer.innerHTML='<div class="pati-close-picker-shell"><header><button type="button" data-cf-action="cancel" aria-label="Geri dön">←</button><strong>Yakın Arkadaşlar</strong><button type="button" class="pati-close-confirm" data-cf-action="confirm">Onayla</button></header><div class="pati-close-info"><strong id="pati-close-count"></strong><p>Hikâyeni görmesini istediğin kişileri seç. Bu listeyi değiştirmek önceki Yakın Arkadaşlar hikâyelerinin görünürlüğünü de etkileyebilir.</p></div><input id="pati-close-search" type="search" placeholder="İsim veya kullanıcı adı ara" aria-label="Kullanıcı ara"><div class="pati-close-people" id="pati-close-people"></div><p class="pati-close-error" role="alert" hidden></p></div>';
  document.body.appendChild(layer);document.body.classList.add('pati-close-picker-active');
  let busy=false;
  const draw=()=>{
   const q=String(layer.querySelector('#pati-close-search').value||'').toLocaleLowerCase('tr-TR');
   layer.querySelector('#pati-close-count').textContent=selected.size+' kişi seçildi';
   const matches=people.filter(p=>(String(p.display_name||'')+' '+String(p.handle||'')).toLocaleLowerCase('tr-TR').includes(q));
   layer.querySelector('#pati-close-people').innerHTML=matches.length?matches.map(p=>'<button type="button" class="pati-close-person" data-cf-action="toggle" data-id="'+esc(p.id)+'" aria-pressed="'+selected.has(p.id)+'">'+avatar(p,'s')+'<span><strong>'+esc(p.display_name||'Patiyiz üyesi')+'</strong><small>@'+esc(p.handle||'patiyiz')+'</small></span><b>'+ (selected.has(p.id)?'✓':'')+'</b></button>').join(''):'<p class="pati-close-empty">Kullanıcı bulunamadı.</p>';
  };
  draw();
  return await new Promise(resolve=>{
   const done=val=>{layer.remove();document.body.classList.remove('pati-close-picker-active');resolve(val)};
   layer.querySelector('#pati-close-search').addEventListener('input',draw);
   layer.addEventListener('click',async event=>{
    const button=event.target.closest('[data-cf-action]');if(!button||busy)return;
    const action=button.dataset.cfAction;
    if(action==='cancel'){done(false);return}
    if(action==='toggle'){const id=button.dataset.id;if(!people.some(p=>p.id===id))return;selected.has(id)?selected.delete(id):selected.add(id);draw();return}
    if(action==='confirm'){
     if(!selected.size){layer.querySelector('.pati-close-error').hidden=false;layer.querySelector('.pati-close-error').textContent='En az bir kişi seç.';return;}
     busy=true;button.disabled=true;button.textContent='Kaydediliyor…';
     try{
      if(me?.id!==owner)throw Error('Oturum değişti.');
      for(const id of initial)if(!selected.has(id)){const r=await sb.from('patiyiz_close_friends').delete().eq('owner_id',owner).eq('friend_id',id);if(r.error)throw r.error}
      for(const id of selected)if(!initial.has(id)){const r=await sb.from('patiyiz_close_friends').insert({owner_id:owner,friend_id:id});if(r.error)throw r.error}
      patiCloseFriendsIds=new Set(selected);done(true);
     }catch(error){const box=layer.querySelector('.pati-close-error');box.hidden=false;box.textContent=friendly(error);busy=false;button.disabled=false;button.textContent='Tekrar dene'}
    }
   });
  });
 }
async function patiCloseFriendsDialog(){
 if(!me)return;
 const owner=me.id;
 const res=await sb.from('patiyiz_close_friends').select('friend_id').eq('owner_id',owner);
 if(res.error)throw res.error;
 if(me?.id!==owner)return;
 patiCloseFriendsIds=new Set((res.data||[]).map(x=>x.friend_id));
 const people=data.profiles.filter(p=>p.id!==owner&&!blocked.has(p.id))
  .sort((a,b)=>Number(patiCloseFriendsIds.has(b.id))-Number(patiCloseFriendsIds.has(a.id))||
   String(a.display_name||'').localeCompare(String(b.display_name||''),'tr')).slice(0,200);
 modal('Yakın Arkadaşlar','<div class="pati-private-note">Bu listedekiler yalnızca Yakın Arkadaşlar için paylaştığın hikâyeleri görebilir. Listeyi başkaları göremez.</div>'+
 '<input type="search" class="pati-social-search" id="pati-close-friends-search" placeholder="Kullanıcı ara" aria-label="Yakın arkadaş ara">'+
 '<div class="pati-social-people">'+people.map(p=>'<div class="pati-social-person" data-person-search="'+esc((p.display_name||'')+' '+(p.handle||''))+'">'+
 avatar(p,'s')+'<span><strong>'+esc(p.display_name||'Patiyiz üyesi')+'</strong><small>@'+esc(p.handle||'patiyiz')+'</small></span>'+
 '<button type="button" data-action="pati-close-friend-toggle" data-id="'+esc(p.id)+'" class="'+(patiCloseFriendsIds.has(p.id)?'active':'')+'">'+(patiCloseFriendsIds.has(p.id)?'✓ Eklendi':'+ Ekle')+'</button></div>').join('')+'</div>',
 'pati-close-friends-form');
 document.querySelector('#pati-close-friends-form .modal-footer')?.remove();
 document.getElementById('pati-close-friends-search')?.addEventListener('input',e=>{
  const q=String(e.target.value||'').toLocaleLowerCase('tr-TR');
  document.querySelectorAll('#pati-close-friends-form .pati-social-person[data-person-search]').forEach(el=>{el.hidden=!String(el.dataset.personSearch||'').toLocaleLowerCase('tr-TR').includes(q)});
 });
}
async function patiCloseFriendToggle(friendId){
 if(!me||!friendId||friendId===me.id||blocked.has(friendId))throw Error('Kullanıcı seçilemedi.');
 const owner=me.id,already=patiCloseFriendsIds.has(friendId);
 const q=sb.from('patiyiz_close_friends');
 const res=already?await q.delete().eq('owner_id',owner).eq('friend_id',friendId):
 await q.insert({owner_id:owner,friend_id:friendId});
 if(res.error)throw res.error;
 if(me?.id!==owner)return;
 await patiCloseFriendsDialog();
}
async function patiHydrateCloseStories(){
 if(!me||!Array.isArray(data.stories))return;
 const owner=me.id;
 const close=data.stories.filter(x=>x.audience==='close_friends'&&x.private_image_path);
 await Promise.all(close.map(async story=>{
  const image=await sb.storage.from('patiyiz-close-stories').createSignedUrl(story.private_image_path,300);
  if(image.error){console.warn('Özel hikâye kapağı açılamadı:',image.error.message);return;}
  const video=story.private_video_path?
   await sb.storage.from('patiyiz-close-stories').createSignedUrl(story.private_video_path,300):null;
  if(me?.id!==owner)return;
  story.image_url=image.data.signedUrl;
  if(video&&!video.error)story.video_url=video.data.signedUrl;
  story.patiSignedAt=Date.now();
 }));
}
async function patiCreateCloseFriendStory(form,f,str){
 if(!me)throw Error('Önce giriş yap.');
 const owner=me.id,photo=form.querySelector('input[name="photo"]')?.files?.[0];
 const video=form.querySelector('input[name="video"]')?.files?.[0];
 if(!photo?.size&&!video?.size)throw Error('Hikâye için fotoğraf veya video seç.');
 if(photo?.size&&video?.size)throw Error('Hikâyede tek bir medya seç.');
 const prefix=owner+'/'+crypto.randomUUID();
 const paths=[],bucket=sb.storage.from('patiyiz-close-stories');
 try{
  let cover=photo?.size?await cropPostPhoto(photo,str('aspect')||'9:16'):
   await patiGenerateVideoCover(video)||await patiFallbackStoryPoster();
  if(!cover?.size)throw Error('Özel hikâye kapağı oluşturulamadı.');
  const imagePath=prefix+'.jpg';
  const up=await bucket.upload(imagePath,cover,{contentType:cover.type||'image/jpeg',upsert:false});
  if(up.error)throw up.error;
  paths.push(imagePath);
  let videoPath=null;
  if(video?.size){
   videoPath=prefix+(String(video.type||'').includes('webm')?'.webm':String(video.type||'').includes('quicktime')?'.mov':'.mp4');
   const v=await bucket.upload(videoPath,video,{contentType:video.type||'video/mp4',upsert:false});
   if(v.error)throw v.error;
   paths.push(videoPath);
  }
  const result=await sb.from('patiyiz_stories').insert({
   author_id:owner,image_url:'',video_url:null,private_image_path:imagePath,
   private_video_path:videoPath,audience:'close_friends',
   caption:str('body').slice(0,300),is_highlight:false,
   selfie_mirrored:!!videoPath&&form.dataset.selfieMirror==='true'
  }).select('*').single();
  if(result.error)throw result.error;
  if(me?.id!==owner)return result.data;
  const story=result.data;
  data.stories=[story,...data.stories.filter(x=>x.id!==story.id)];
  try{await patiHydrateCloseStories()}catch(e){console.warn('Özel hikâye görüntüsü sonradan yüklenecek:',e)}
  return story;
 }catch(error){
  if(paths.length){try{await bucket.remove(paths)}catch(e){console.warn('Özel medya temizliği:',e)}}
  throw error;
 }
}
/* Unified inbox: groups share the same people list, chat pane and responsive
   navigation as direct messages, while authorization stays in separate RLS tables. */
let patiActiveGroupId='';
let patiGroupInboxState={owner:'',rows:[],ready:false,loading:false,error:''};
let patiGroupChatState={owner:'',id:'',group:null,members:[],rows:[],ready:false,error:''};
let patiGroupInboxTimer=null;
function patiGroupInboxStop(){
 if(patiGroupInboxTimer!==null){clearInterval(patiGroupInboxTimer);patiGroupInboxTimer=null}
}
function patiGroupInboxStart(){
 if(patiGroupInboxTimer!==null)return;
 patiGroupInboxTimer=setInterval(()=>{
  if(!me||view!=='messages'){patiGroupInboxStop();return}
  if(!document.hidden)void patiGroupFetchInbox(true);
 },15000);
}
async function patiGroupFetchInbox(force=false){
 if(!me||!sb)return;
 const owner=me.id,token=patiyizLoadToken;
 if(patiGroupInboxState.owner!==owner)patiGroupInboxState={owner,rows:[],ready:false,loading:false,error:''};
 const state=patiGroupInboxState;
 if(state.loading||(state.ready&&!force))return;
 state.loading=true;state.error='';
 try{
  const res=await sb.from('patiyiz_group_inbox')
   .select('group_id,title,activity_at,last_body,last_sender_id,unread_count')
   .eq('user_id',owner).order('activity_at',{ascending:false}).limit(100);
  if(res.error)throw res.error;
  if(me?.id!==owner||patiyizLoadToken!==token||patiGroupInboxState!==state)return;
  const rows=res.data||[];
  // Group inbox is an existing view; resolve photos in a separate scoped query.
  const ids=rows.map(g=>g.group_id).filter(Boolean);
  if(ids.length){
   const photos=await sb.from('patiyiz_group_chats').select('id,avatar_path').in('id',ids);
   if(!photos.error){
    const byId=new Map((photos.data||[]).map(g=>[g.id,g.avatar_path]));
    for(const g of rows)g.avatar_path=byId.get(g.group_id)||null;
   }
  }
  if(me?.id!==owner||patiyizLoadToken!==token||patiGroupInboxState!==state)return;
  const changed=!state.ready||JSON.stringify(rows)!==JSON.stringify(state.rows);
  state.rows=rows;state.ready=true;
  if(changed&&view==='messages'){patiDmSafeRender();navRender()}
 }catch(error){
  if(me?.id===owner&&patiGroupInboxState===state){
   state.error='Grup sohbetleri yüklenemedi.';
   console.warn('Grup gelen kutusu:',error?.message||error);
  }
 }finally{state.loading=false}
}
function patiGroupChatPaneHTML(){
 const state=patiGroupChatState,id=patiActiveGroupId;
 const ready=state.ready&&state.owner===me.id&&state.id===id;
 const title=ready?state.group?.title||'Grup sohbeti':
  patiGroupInboxState.rows.find(g=>g.group_id===id)?.title||'Grup sohbeti';
 const members=ready?state.members.length:0;
 const messages=ready?state.rows.slice():[];
 return '<header class="pati-group-chat-header">'+
  '<button type="button" class="mobile-chat-back" data-action="chat-back" aria-label="Sohbetlere dön">←</button>'+
  '<span class="chat-head-avatar pati-group-avatar" aria-hidden="true">'+(ready&&patiGroupPhotoUrl(state.group?.avatar_path)?'<img src="'+esc(patiGroupPhotoUrl(state.group.avatar_path))+'" alt="" loading="lazy">':ico('users'))+'</span>'+
  '<span class="pati-group-chat-title"><strong>'+esc(title)+'</strong><small>'+ (ready?members+' üye':'Grup yükleniyor…')+'</small></span>'+
  '<button type="button" class="soft-btn chat-view-profile" data-action="pati-group-members" data-id="'+esc(id)+'">Üyeler</button>'+ 
  (ready&&state.group?.creator_id===me.id?'<button type="button" class="pati-group-delete-top" data-action="pati-group-delete" data-id="'+esc(id)+'" aria-label="Grubu kalıcı sil">'+ico('trash')+'</button>':'')+
  '</header>'+
  '<div class="chat-history pati-group-history" aria-label="Grup mesajları" data-pati-signature="'+esc(messages.map(m=>m.id).join(','))+'">'+
  (messages.length?messages.map(m=>patiGroupMessageMarkup(m,me.id,id)).join(''):
   '<p class="pati-group-empty">'+(ready?'Henüz mesaj yok. İlk mesajı gönder!':'Grup mesajları yükleniyor…')+'</p>')+
  '</div>'+
  '<form id="pati-group-message-form" class="chat-form pati-group-chat-form">'+
  '<input type="hidden" name="group_id" value="'+esc(id)+'">'+
  '<input name="group_body" maxlength="2000" placeholder="Gruba mesaj yaz…" autocomplete="off" aria-label="Grup mesajı" '+(!ready?'disabled':'')+'>'+
  '<button type="submit" class="primary-btn" aria-label="Gruba mesaj gönder" '+(!ready?'disabled':'')+'>'+ico('send')+'</button>'+
  '</form>';
}
function patiGroupMountInMessages(summaries,peers,chatFilter){
 const people=main.querySelector('.pati-dm-layout .chat-people');
 if(!people)return;
 const groups=patiGroupInboxState.owner===me.id&&patiGroupInboxState.ready&&chatFilter==='primary'?
  patiGroupInboxState.rows:[];
 const direct=[...people.querySelectorAll('.pati-dm-list-row[data-chat-peer]')];
 for(const row of direct){
  const peer=row.dataset.chatPeer;
  row.dataset.activity=new Date(patiDmLatestTimestamp(peer,summaries,peers)||0).toISOString();
 }
 const groupHtml=groups.map(g=>'<div class="pati-dm-list-row pati-group-thread-row'+(patiActiveGroupId===g.group_id?' selected':'')+'" data-chat-group="'+esc(g.group_id)+'" data-activity="'+esc(g.activity_at||'')+'">'+
  '<button type="button" class="chat-person'+(patiActiveGroupId===g.group_id?' active':'')+'" data-action="pati-group-open" data-id="'+esc(g.group_id)+'" data-search="'+esc(g.title)+'">'+
  '<span class="pati-group-inbox-avatar" aria-hidden="true">'+(patiGroupPhotoUrl(g.avatar_path)?'<img src="'+esc(patiGroupPhotoUrl(g.avatar_path))+'" alt="" loading="lazy">':ico('users'))+'</span>'+
  '<span class="chat-person-info"><strong>'+esc(g.title)+'</strong><small>'+esc(cut(g.last_body||'Grup sohbeti',80))+'</small></span>'+
  '<span class="chat-person-meta"><small>'+clock(g.activity_at)+'</small>'+(g.unread_count?'<b class="chat-unread">'+(g.unread_count>99?'99+':g.unread_count)+'</b>':'')+'</span></button>'+
  '<details class="pati-dm-row-actions"><summary aria-label="Grup seçenekleri">'+ico('more')+'</summary><div class="pati-dm-row-menu">'+
  '<button type="button" data-action="pati-group-members" data-id="'+esc(g.group_id)+'">'+ico('users')+'<span>Grup üyeleri</span></button>'+ 
  '<button type="button" data-action="pati-group-delete-check" data-id="'+esc(g.group_id)+'">'+ico('trash')+'<span>Grubu sil</span></button></div></details></div>').join('');
 people.insertAdjacentHTML('beforeend',groupHtml);
 const all=[...people.querySelectorAll('.pati-dm-list-row')];
 all.sort((a,b)=>new Date(b.dataset.activity||0)-new Date(a.dataset.activity||0));
 const footer=people.querySelector('.pati-load-more');
 for(const row of all)people.insertBefore(row,footer||null);
 if(all.length)people.querySelector(':scope > p')?.remove();
 const counter=people.querySelector('.chat-list-heading span');if(counter)counter.textContent=String(all.length);
 if(!patiActiveGroupId)return;
 const pane=main.querySelector('.pati-dm-layout .chat-window');if(!pane)return;
 pane.classList.add('pati-group-chat-window');
 pane.dataset.chatPerson='group:'+patiActiveGroupId;
 pane.innerHTML=patiGroupChatPaneHTML();
 patiGroupLiveStart(patiActiveGroupId);
}

/* Group inbox shows latest activity; active chats refresh only while visible.
   Delete is restricted by both the RLS policy and user-owned query filters. */
let patiGroupLiveTimer=null,patiGroupLiveBusy=false,patiGroupLiveGroupId='';
function patiGroupLiveStop(){
 if(patiGroupLiveTimer!==null){clearInterval(patiGroupLiveTimer);patiGroupLiveTimer=null}patiGroupLiveGroupId='';
}
function patiGroupMessageMarkup(message,owner,groupId){
 const mine=message.sender_id===owner;
 return '<div class="bubble-chat pati-group-bubble '+(mine?'mine':'')+'" data-group-message-id="'+esc(message.id)+'">'+
  '<strong>'+esc(profile(message.sender_id).display_name||'Patiyiz üyesi')+'</strong>'+
  '<p>'+esc(message.body)+'</p>'+
  '<div class="pati-group-message-meta"><small>'+clock(message.created_at)+'</small>'+
  (mine?'<button type="button" data-action="pati-group-delete-message" data-id="'+esc(message.id)+'" data-group-id="'+esc(groupId)+'" aria-label="Bu mesajı sil">Sil</button>':'')+
  '</div></div>';
}
async function patiGroupMarkRead(groupId){
 const result=await sb.rpc('patiyiz_group_mark_read',{p_group:groupId});
 if(result.error)console.warn('Grup okunma durumu güncellenemedi:',result.error.message);
}
async function patiGroupRefreshActive(groupId,force=false){
 const form=document.getElementById('pati-group-message-form');
 if(!me||!form||form.querySelector('[name="group_id"]')?.value!==groupId||document.hidden||patiGroupLiveBusy||(busy&&!force))return;
 patiGroupLiveBusy=true;
 const owner=me.id;
 try{
  const r=await sb.from('patiyiz_group_messages').select('*').eq('group_id',groupId)
   .order('created_at',{ascending:false}).limit(200);
  if(r.error)throw r.error;
  const active=document.getElementById('pati-group-message-form');
  if(me?.id!==owner||active!==form)return;
  const history=active.closest('.pati-group-chat-window')?.querySelector('.chat-history');if(!history)return;
  const ordered=(r.data||[]).slice().reverse();
  if(patiGroupChatState.owner===owner&&patiGroupChatState.id===groupId)patiGroupChatState.rows=ordered;
  const signature=ordered.map(m=>m.id).join(',');
  if(history.dataset.patiSignature===signature)return;
  const nearBottom=history.scrollHeight-history.scrollTop-history.clientHeight<90;
  const oldScroll=history.scrollTop;
  history.innerHTML=ordered.length?ordered.map(m=>patiGroupMessageMarkup(m,owner,groupId)).join(''):
   '<p class="pati-private-note">Henüz mesaj yok. İlk mesajı yaz.</p>';
  history.dataset.patiSignature=signature;
  if(nearBottom)history.scrollTop=history.scrollHeight;
  else history.scrollTop=oldScroll;
  void patiGroupMarkRead(groupId);
 }catch(err){
  console.warn('Grup mesajları yenilenemedi:',err.message);
 }finally{patiGroupLiveBusy=false}
}
function patiGroupLiveStart(groupId){
 if(patiGroupLiveTimer!==null&&patiGroupLiveGroupId===groupId)return;
 patiGroupLiveStop();patiGroupLiveGroupId=groupId;
 patiGroupLiveTimer=setInterval(()=>{
  const current=document.getElementById('pati-group-message-form');
  if(!current||view!=='messages'||patiActiveGroupId!==groupId||current.querySelector('[name="group_id"]')?.value!==groupId){patiGroupLiveStop();return}
  void patiGroupRefreshActive(groupId);
 },6500);
}

/* Group conversations use separate tables and authorization from 1:1 DMs. */
async function patiGroupList(){
 // Back to the shared message inbox instead of reopening a separate group modal.
 if(!me)return;
 closeModal(true);
 patiActiveGroupId='';mobileChatOpen=false;
 if(view!=='messages'){view='messages';navRender()}
 render();
 await patiGroupFetchInbox(true);
}
function patiGroupCreateDialog(){
 const people=data.profiles.filter(p=>p.id!==me.id&&!blocked.has(p.id)).slice(0,150);
 modal('Yeni grup oluştur','<label class="pati-field">Grubun adı<input name="group_title" maxlength="80" required placeholder="Örn. Kedi dostları"></label>'+
 '<p class="pati-private-note">Grubuna eklemek istediğin kişileri seç. En fazla 19 kişi ekleyebilirsin.</p>'+
 '<div class="pati-social-people pati-group-people">'+people.map(p=>'<label class="pati-social-person">'+avatar(p,'s')+'<span><strong>'+esc(p.display_name||'Patiyiz üyesi')+'</strong><small>@'+esc(p.handle||'patiyiz')+'</small></span><input type="checkbox" name="group_members" value="'+esc(p.id)+'"></label>').join('')+'</div>',
 'pati-group-create-form');
 const submit=document.querySelector('#pati-group-create-form .modal-footer button[type="submit"]');
 if(submit)submit.textContent='Grubu oluştur';
}
async function patiGroupOpen(id){
 if(!me||!id)return;
 const owner=me.id,token=patiyizLoadToken;
 const [group,members,messages]=await Promise.all([
  sb.from('patiyiz_group_chats').select('*').eq('id',id).single(),
  sb.from('patiyiz_group_members').select('user_id,role').eq('group_id',id),
  sb.from('patiyiz_group_messages').select('*').eq('group_id',id).order('created_at',{ascending:false}).limit(200)
 ]);
 if(group.error)throw group.error;
 if(members.error)throw members.error;
 if(messages.error)throw messages.error;
 if(me?.id!==owner||patiyizLoadToken!==token)return;
 const membersList=members.data||[];
 if(!membersList.some(p=>p.user_id===owner))throw Error('Artık bu gruba üye değilsin.');
 patiGroupLiveStop();
 patiActiveGroupId=id;personId='';chatFilter='primary';mobileChatOpen=true;
 if(patiGroupInboxState.owner===owner&&!patiGroupInboxState.rows.some(g=>g.group_id===id))patiGroupInboxState.rows.unshift({group_id:id,title:group.data.title,activity_at:group.data.created_at,last_body:'',unread_count:0});
 patiGroupChatState={owner,id,group:group.data,members:membersList,rows:(messages.data||[]).slice().reverse(),ready:true,error:''};
 closeModal(true);
 if(view!=='messages'){view='messages';navRender()}
 render();
 const history=main.querySelector('.pati-group-chat-window .chat-history');
 if(history)history.scrollTop=history.scrollHeight;
 void patiGroupMarkRead(id).then(()=>patiGroupFetchInbox(true));
}
async function patiGroupDeletePermanent(groupId){
 if(!me?.id||!groupId)throw Error('Grup seçilemedi.');
 const owner=me.id;
 const check=await sb.from('patiyiz_group_chats').select('id,title,creator_id').eq('id',groupId).maybeSingle();
 if(check.error)throw check.error;
 if(!check.data)throw Error('Bu gruba erişilemiyor.');
 if(check.data.creator_id!==owner)throw Error('Grubu yalnızca kurucusu tamamen silebilir. İstersen gruptan ayrılabilirsin.');
 const name=check.data.title||'Grup';
 if(!confirm('“'+name+'” grubunu ve tüm mesajlarını HERKES için kalıcı olarak silmek istiyor musun? Bu işlem geri alınamaz.'))return;
 const result=await sb.from('patiyiz_group_chats').delete().eq('id',groupId).eq('creator_id',owner).select('id');
 if(result.error)throw result.error;
 if(!result.data?.length)throw Error('Grup silinemedi. Silme yetkisini kontrol et.');
 if(me?.id!==owner)return;
 patiGroupLiveStop();
 if(patiActiveGroupId===groupId){
  patiActiveGroupId='';patiGroupChatState={owner:'',id:'',group:null,members:[],rows:[],ready:false,error:''};
  personId='';mobileChatOpen=false;
 }
 patiGroupInboxState.rows=patiGroupInboxState.rows.filter(x=>x.group_id!==groupId);
 closeModal(true);
 await patiGroupFetchInbox(true);
 if(view==='messages')render();
 notify('Grup ve tüm mesajları kalıcı olarak silindi.');
}

function patiGroupPhotoUrl(path){
 if(!path||!/^[0-9a-f-]{36}\/[^/]+\.(?:jpg|jpeg|png|webp)$/i.test(path))return '';
 try{return sb.storage.from('patiyiz-group-avatars').getPublicUrl(path).data.publicUrl||''}catch(_){return ''}
}

/* Mobile-first circular group avatar crop. The uploaded JPEG is square;
   circular presentation is CSS, just like normal profile photographs. */
async function patiGroupAvatarCropOpen(groupId,file){
 if(!me?.id||!groupId||!file)return;
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>10*1024*1024)throw Error('JPG, PNG veya WebP ve 10 MB altında bir fotoğraf seç.');
 const url=URL.createObjectURL(file),image=new Image();
 try{image.src=url;await image.decode()}catch(error){URL.revokeObjectURL(url);throw Error('Fotoğraf açılamadı. Başka bir görsel dene.')}
 const popup=document.createElement('dialog');popup.id='pati-group-crop-dialog';
 popup.className='pati-group-crop-dialog';
 popup.setAttribute('aria-label','Grup fotoğrafını kırp');
 popup.innerHTML='<div class="pati-group-crop-shell"><header><button type="button" data-group-crop="cancel" aria-label="Vazgeç">←</button><strong>Grup fotoğrafı</strong><button type="button" data-group-crop="save">Bitti</button></header>'+
 '<p>Yuvarlak alanda görünmesini istediğin bölümü kaydırarak ayarla.</p>'+
 '<div class="pati-group-crop-stage"><canvas width="360" height="360" aria-label="Yuvarlak grup fotoğrafı önizlemesi"></canvas><span class="pati-group-crop-outline" aria-hidden="true"></span></div>'+
 '<label class="pati-group-crop-zoom">Yakınlaştır <input type="range" min="1" max="3" value="1" step=".01" aria-label="Fotoğrafı yakınlaştır"></label>'+
 '<small>Parmağınla sürükle; iki parmakla yakınlaştırabilir veya kaydırabilirsin.</small><p class="pati-group-crop-status" role="status" aria-live="polite"></p></div>';
 document.body.appendChild(popup);
 const canvas=popup.querySelector('canvas'),context=canvas.getContext('2d');
 const slider=popup.querySelector('input[type="range"]');
 const size=360,state={zoom:1,dx:0,dy:0},pointers=new Map();
 let prevDistance=0,prevCenter=null,saving=false;
 const draw=()=>{
  const cover=Math.max(size/image.naturalWidth,size/image.naturalHeight),scale=cover*state.zoom;
  const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
  state.dx=Math.max(-(w-size)/2,Math.min((w-size)/2,state.dx));
  state.dy=Math.max(-(h-size)/2,Math.min((h-size)/2,state.dy));
  context.clearRect(0,0,size,size);
  context.drawImage(image,(size-w)/2+state.dx,(size-h)/2+state.dy,w,h);
 };
 const setZoom=(value)=>{
  state.zoom=Math.max(1,Math.min(3,Number(value)||1));
  slider.value=String(state.zoom);draw();
 };
 slider.addEventListener('input',()=>setZoom(slider.value));
 const normalized=event=>{
  const b=canvas.getBoundingClientRect(),ratio=size/Math.max(1,b.width);
  return {x:(event.clientX-b.left)*ratio,y:(event.clientY-b.top)*ratio};
 };
 canvas.addEventListener('pointerdown',event=>{
  event.preventDefault();canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId,normalized(event));
  if(pointers.size===2){const [a,b]=[...pointers.values()];prevDistance=Math.hypot(a.x-b.x,a.y-b.y);prevCenter={x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
 });
 canvas.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;
  event.preventDefault();const before=pointers.get(event.pointerId),next=normalized(event);
  pointers.set(event.pointerId,next);
  if(pointers.size===1){state.dx+=next.x-before.x;state.dy+=next.y-before.y;}
  else if(pointers.size===2){
   const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
   const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   if(prevDistance>0)setZoom(state.zoom*distance/prevDistance);
   if(prevCenter){state.dx+=center.x-prevCenter.x;state.dy+=center.y-prevCenter.y}
   prevDistance=distance;prevCenter=center;
  }
  draw();
 });
 const end=event=>{pointers.delete(event.pointerId);prevDistance=0;prevCenter=null};
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
 canvas.addEventListener('wheel',event=>{event.preventDefault();setZoom(state.zoom+(event.deltaY<0?.08:-.08))},{passive:false});
 popup.addEventListener('close',()=>{URL.revokeObjectURL(url);popup.remove()},{once:true});
 popup.querySelector('[data-group-crop="cancel"]').addEventListener('click',()=>{if(!saving)popup.close()});
 const saveButton=popup.querySelector('[data-group-crop="save"]');
 saveButton.addEventListener('click',async event=>{
  if(saving)return;saving=true;saveButton.disabled=true;
  const status=popup.querySelector('.pati-group-crop-status');status.textContent='Fotoğraf hazırlanıyor…';
  try{
   const cropped=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Fotoğraf kırpılamadı.')),'image/jpeg',.83));
   const output=new File([cropped],'group-avatar.jpg',{type:'image/jpeg'});
   await patiGroupPhotoUpload(groupId,output);
   popup.close();
  }catch(error){
   status.textContent='Fotoğraf kaydedilemedi: '+(error?.message||'Bilinmeyen hata');
   saving=false;saveButton.disabled=false;
  }
 });
 draw();popup.showModal();
}

async function patiGroupPhotoUpload(groupId,file){
 if(!me||!file||!file.size)return;
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Grup fotoğrafı JPG, PNG veya WebP olmalı.');
 if(file.size>10*1024*1024)throw Error('Görsel çok büyük. Daha küçük bir fotoğraf seç.');
 const url=URL.createObjectURL(file),image=new Image();
 let blob;
 try{
  image.src=url;await image.decode();
  const canvas=document.createElement('canvas'),ratio=Math.min(1,640/Math.max(1,image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.74));
 }finally{URL.revokeObjectURL(url)}
 if(!blob||blob.size>1024*1024)throw Error('Fotoğraf 1 MB altına indirilemedi.');
 const key=groupId+'/'+crypto.randomUUID()+'.jpg';
 const saved=await sb.storage.from('patiyiz-group-avatars').upload(key,blob,{contentType:'image/jpeg',upsert:false});
 if(saved.error)throw saved.error;
 const updated=await sb.rpc('patiyiz_group_set_photo',{p_group:groupId,p_path:key});
 if(updated.error)throw updated.error;
 if(patiGroupChatState.id===groupId&&patiGroupChatState.group)patiGroupChatState.group.avatar_path=key;
 await patiGroupMembersDialog(groupId);
 notify('Grup fotoğrafı güncellendi.');
}

async function patiGroupMembersDialog(id){
 const owner=me?.id;if(!owner)return;
 const [members,group]=await Promise.all([
 sb.from('patiyiz_group_members').select('user_id,role').eq('group_id',id),
 sb.from('patiyiz_group_chats').select('*').eq('id',id).single()
 ]);
 if(members.error)throw members.error;if(group.error)throw group.error;
 if(me?.id!==owner)return;
 const admin=(members.data||[]).some(x=>x.user_id===owner&&x.role==='admin');
 const creator=group.data.creator_id===owner;
 modal('Grup üyeleri','<div class="pati-group-tools"><button type="button" data-action="pati-group-open" data-id="'+esc(id)+'">← Sohbete dön</button>'+(admin?'<button type="button" data-action="pati-group-add-open" data-id="'+esc(id)+'">+ Üye ekle</button>':'')+'</div>'+
 '<div class="pati-group-photo-editor"><span class="pati-group-photo-preview">'+(patiGroupPhotoUrl(group.data.avatar_path)?'<img src="'+esc(patiGroupPhotoUrl(group.data.avatar_path))+'" alt="Grup fotoğrafı">':ico('users'))+'</span><div><strong>'+esc(group.data.title)+'</strong><small>Grup görseli ve yöneticileri</small>'+(admin?'<label class="pati-group-photo-label">Fotoğraf değiştir<input type="file" accept="image/jpeg,image/png,image/webp" data-pati-group-avatar="'+esc(id)+'" aria-label="Grup fotoğrafı seç"></label>':'')+'</div></div>'+
 (creator?'<div class="pati-group-danger-zone"><strong>Grubu tamamen sil</strong><p>Grup ve tüm mesajları bütün üyeler için kalıcı olarak silinir.</p><button type="button" data-action="pati-group-delete" data-id="'+esc(id)+'">'+ico('trash')+' Grubu kalıcı sil</button></div>':'')+
 (members.data||[]).map(x=>'<div class="pati-social-person">'+avatar(profile(x.user_id),'s')+'<span><strong>'+esc(profile(x.user_id).display_name||'Üye')+'</strong><small>'+(x.role==='admin'?'Yönetici':'Üye')+'</small></span>'+
 (creator&&x.user_id!==group.data.creator_id?'<button type="button" data-action="pati-group-role" data-id="'+esc(id)+'" data-peer="'+esc(x.user_id)+'" data-role="'+(x.role==='admin'?'member':'admin')+'">'+(x.role==='admin'?'Yöneticiliği kaldır':'Yönetici yap')+'</button>':'')+
 ((admin||x.user_id===owner)&&x.user_id!==group.data.creator_id?'<button type="button" data-action="pati-group-remove" data-id="'+esc(id)+'" data-peer="'+esc(x.user_id)+'">'+(x.user_id===owner?'Ayrıl':'Çıkar')+'</button>':'')+'</div>').join(''),
 'pati-group-members-form');
 document.querySelector('#pati-group-members-form .modal-footer')?.remove();
}


async function patiGroupAddDialog(id){
 if(!me||!id)return;
 const owner=me.id,rows=await sb.from('patiyiz_group_members').select('user_id,role').eq('group_id',id);
 if(rows.error)throw rows.error;
 if(me?.id!==owner)return;
 if(!rows.data?.some(x=>x.user_id===owner&&x.role==='admin'))throw Error('Üye ekleme yetkin yok.');
 const existing=new Set(rows.data.map(x=>x.user_id));
 const people=data.profiles.filter(p=>p.id!==owner&&!existing.has(p.id)&&!blocked.has(p.id)).slice(0,150);
 modal('Gruba üye ekle','<div class="pati-group-tools"><button type="button" data-action="pati-group-members" data-id="'+esc(id)+'">← Grup üyeleri</button></div>'+
 (people.length?'<div class="pati-social-people">'+people.map(p=>'<div class="pati-social-person">'+avatar(p,'s')+
 '<span><strong>'+esc(p.display_name||'Patiyiz üyesi')+'</strong><small>@'+esc(p.handle||'patiyiz')+'</small></span>'+
 '<button type="button" data-action="pati-group-add-member" data-id="'+esc(id)+'" data-peer="'+esc(p.id)+'">+ Ekle</button></div>').join('')+'</div>':
 '<p class="pati-private-note">Ekleyebileceğin yeni kullanıcı bulunmuyor.</p>'),
 'pati-group-add-form');
 document.querySelector('#pati-group-add-form .modal-footer')?.remove();
}

function postMediaField(mode){
 const reel=mode==='reels',story=mode==='story';
 const description=reel?'Kısa videonu galeriden seç veya kamerayla çek; 90 saniyeye kadar.':story?'Bir fotoğraf ya da kısa video seç.':'En fazla 10 fotoğraf veya 4 video; paylaşmadan önce incele, sırala ve sil.';
 const title=reel?'Reels videosu':story?'Hikâyen':'Fotoğraf ve video';
 return '<section class="pati-compose-media" aria-label="Medya seçimi"><div class="pati-media-intro"><span class="pati-media-icon">'+(reel?'▷':story?'✦':'▧')+'</span><div><strong>'+title+'</strong><p>'+description+'</p></div></div>'+
 '<div class="pati-media-gallery" id="pati-post-media-gallery"><div class="pati-media-empty"><span>▧</span><strong>Galerinden bir an seç</strong><small>Fotoğraf veya video seçerek başlayabilirsin.</small></div></div>'+
 '<div class="pati-media-thumbs" id="pati-post-media-thumbs" hidden></div>'+ 
 '<div class="pati-media-edit-entry" id="pati-media-edit-entry" hidden><button type="button" data-action="post-crop-open">🎚 Filtreler ve fotoğraf düzenleme</button><small>Renk filtresi, parlaklık, kontrast ve kırpma</small></div>'+
 '<div class="pati-media-picker-actions"><button type="button" class="pati-media-pick-primary" data-action="pati-media-gallery">▧ Galeriyi aç</button><button type="button" class="pati-media-pick-secondary" data-action="pati-media-camera">◎ '+(reel?'Video çek':'Fotoğraf çek')+'</button>'+(!reel?'<button type="button" class="pati-media-pick-secondary" data-action="pati-media-video">▷ Video seç</button>':'')+'</div>'+
 (reel?'<div class="pati-reels-editor"><label>Video kapak fotoğrafı <input type="file" name="cover_photo" accept="image/*" aria-label="Video kapağı seç"></label><label>Video altyazısı <input name="video_subtitle" maxlength="220" placeholder="Video için altyazı"></label></div>':story?'<div class="pati-reels-editor"><label>Video kapağı (isteğe bağlı) <input type="file" name="cover_photo" accept="image/*" aria-label="Hikâye video kapağı seç"></label></div>':'<div class="pati-reels-editor"><label>Gönderi video kapağı (isteğe bağlı) <input type="file" name="cover_photo" accept="image/*" aria-label="Gönderi video kapağı seç"></label></div>')+
 '<div class="pati-cover-crop-row"><button type="button" data-action="post-crop-open">Kapak görselini kırp · 9:16 / 4:5</button><small>Video kapağı seçtiğinde düzenleyebilirsin.</small></div>'+
 '<p class="pati-media-help">'+(reel?'MP4, WebM veya MOV · 50 MB altı; büyük klipler uygun cihazlarda sıkıştırılır.':story?'Fotoğraf ya da 50 MB altı video · 24 saatlik hikâye.':'JPG, PNG, HEIC ve desteklenen videolar.')+'</p>'+
 '<input type="file" name="photo" accept="image/*,.heic,.heif" '+(!story&&!reel?'multiple':'')+' class="pati-native-input" aria-label="Fotoğraf seç"><input type="file" name="video" accept="video/mp4,video/webm,video/quicktime,.mov"'+(reel?' multiple':!story?' multiple':'')+' class="pati-native-input" aria-label="Video seç"></section>';
}
function openComposerMediaPicker(kind){
 const form=document.getElementById('post-form');if(!form)return;
 const reel=form.dataset.mode==='reels',story=form.dataset.mode==='story';
 const input=form.querySelector('input[name="'+(reel?'video':'photo')+'"]');if(!input)return;
 // Native gallery/camera picker; chosen-image grid appears only after selection.
 if(kind==='camera'){input.setAttribute('capture','environment');input.multiple=false}
 else{input.removeAttribute('capture');input.multiple=!story}
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

/* Composer file management uses the actual FileList order so the final upload
   cannot differ from the thumbnails the user approved. */
function patiComposerReorder(kind,index,delta,remove=false){
 const input=document.querySelector('#post-form input[name="'+kind+'"]');
 if(!input)return;
 const files=[...(input.files||[])],destination=index+delta;
 if(index<0||index>=files.length||(!remove&&(destination<0||destination>=files.length)))return;
 if(remove)files.splice(index,1);
 else [files[index],files[destination]]=[files[destination],files[index]];
 const transfer=new DataTransfer();files.forEach(file=>transfer.items.add(file));
 input.files=transfer.files;postCropIndex=Math.min(Math.max(0,destination),Math.max(0,files.length-1));
 updatePostMediaPreview();
 if(document.querySelector('#post-form .pati-crop-preview:not([hidden])'))void drawPostCrop();
}

let patiPostMediaPreviewVersion=0;
function updatePostMediaPreview(){
 const previewVersion=++patiPostMediaPreviewVersion;
 const f=document.getElementById('post-form'),box=document.getElementById('pati-post-media-gallery'),thumbs=document.getElementById('pati-post-media-thumbs');if(!f||!box||!thumbs)return;
 clearPatiMediaUrls();box.replaceChildren();thumbs.replaceChildren();
 const images=[...(f.querySelector('input[name="photo"]')?.files||[])],video=f.querySelector('input[name="video"]')?.files?.[0];
 const files=images.length?images:video?.size?[video]:[],isVideo=!images.length&&!!video?.size;
 const activeRatio=patiMediaDefaultRatio(f.dataset.mode||'post');
 box.dataset.ratio=activeRatio;box.setAttribute('aria-label','Medya önizlemesi · '+activeRatio);
 box.classList.toggle('has-media',!!files.length);thumbs.hidden=files.length<2;
 const editEntry=f.querySelector('#pati-media-edit-entry');if(editEntry)editEntry.hidden=!images.length;
 if(!files.length){box.innerHTML='<div class="pati-media-empty"><span>▧</span><strong>Galerinden bir an seç</strong><small>Fotoğraf veya video seçmek için aşağıya dokun.</small></div>';return}
 const selected=files[Math.min(postCropIndex,files.length-1)];
 if(images.length){const edited=patiCropEdits.get(selected);box.dataset.ratio=edited&&patiMediaAllowedRatios(f.dataset.mode||'post').includes(edited.ratio)?edited.ratio:activeRatio;}
 if(isVideo){const v=document.createElement('video');v.src=makePatiMediaUrl(selected);v.controls=true;v.playsInline=true;v.preload='metadata';v.setAttribute('aria-label','Reels veya gönderi video önizlemesi');box.appendChild(v)}
 else{const img=document.createElement('img');img.src=makePatiMediaUrl(selected);img.alt='Seçilen fotoğrafın önizlemesi';box.appendChild(img);
  if(patiCropEdits.has(selected))void cropPostPhoto(selected,'original').then(output=>{
   if(previewVersion!==patiPostMediaPreviewVersion||!img.isConnected)return;
   const stillSelected=[...(f.querySelector('input[name="photo"]')?.files||[])][Math.min(postCropIndex,images.length-1)];
   if(stillSelected!==selected)return;
   img.src=makePatiMediaUrl(output);
  }).catch(error=>console.warn('Düzenleme önizlemesi oluşturulamadı:',error?.message||error));
 }
 const count=document.createElement('span');count.className='pati-media-count';count.textContent=files.length+' '+(isVideo?'video':'fotoğraf')+' seçildi';box.appendChild(count);
 if(files.length>1){files.forEach((file,i)=>{const item=document.createElement('div');item.className='pati-media-review-item';const tile=document.createElement('button');tile.type='button';tile.className='pati-media-thumb'+(i===postCropIndex?' active':'');tile.dataset.action='pati-media-select';tile.dataset.id=String(i);tile.setAttribute('aria-label',(i+1)+'. '+(isVideo?'video':'fotoğraf')+' önizle');const preview=document.createElement(isVideo?'video':'img');preview.src=makePatiMediaUrl(file);if(isVideo){preview.muted=true;preview.playsInline=true;preview.preload='metadata'}else preview.alt='Fotoğraf '+(i+1);tile.appendChild(preview);const actions=document.createElement('div');actions.className='pati-media-review-tools';for(const [action,arrow,label] of [['prev','←','Öne taşı'],['next','→','Sona taşı'],['remove','×','Sil']]){const btn=document.createElement('button');btn.type='button';btn.dataset.action='pati-media-'+action;btn.dataset.kind=isVideo?'video':'photo';btn.dataset.id=String(i);btn.textContent=arrow;btn.setAttribute('aria-label',(i+1)+'. dosyayı '+label);if(action==='prev')btn.disabled=i===0;if(action==='next')btn.disabled=i===files.length-1;actions.appendChild(btn)}item.append(tile,actions);thumbs.appendChild(item)})}
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
function mountPatiyizCamera(mode){
 const form=document.getElementById('post-form');if(!form)return;
 const mediaFlow=window.PatiyizSystemMediaFlow;
 if(!mediaFlow){notify('Telefon kamerası ve galeri seçicisi yüklenemedi. Sayfayı yenile.',true);closeModal(true);return}
 form.dataset.cameraFirst='1';
 form.dataset.selfieMirror='false';
 const aspect=form.querySelector('input[name="aspect"]');
 if(aspect)aspect.value=mode==='post'?'1:1':'9:16';
 // The standard modal stays hidden; camera UI owns the caption and share button.
 // Retain the existing authenticated publication transaction, not an editor step.
 mediaFlow.open({
  mode,userId:me.id,
  onSwitch(nextMode){
   // Keep the bottom mode strip functional, not decorative.
   closeModal(true);
   if(nextMode==='post')startPatiCameraPost();
   else if(nextMode==='story')startPatiCameraStory();
   else if(nextMode==='reels')startPatiCameraReels();
  },
  onMirrorChange(enabled){form.dataset.selfieMirror=enabled?'true':'false'},
  async onBeforePublish(audience){return mode==='story'&&audience==='close_friends'?await patiCloseFriendsPicker():true;},
  onMedia(files,type){
   const photo=form.querySelector('input[name="photo"]');
   const video=form.querySelector('input[name="video"]');
   const input=type==='video'?video:photo,other=type==='video'?photo:video;
   if(!input)throw Error('Paylaşım dosyası açılamadı.');
   const transfer=new DataTransfer();
   files.forEach(file=>transfer.items.add(file));
   other.value='';input.files=transfer.files;
   // Keep the hidden composer in sync with the file selection.
   input.dispatchEvent(new Event('change',{bubbles:true}));
  },
  onCancel(){closeModal(true)},
  async onPublish(caption){
    form.dataset.storyAudience=document.getElementById('pati-system-audience')?.value||'everyone';
   if(!form.isConnected)throw Error('Paylaşım ekranı kapandı.');
   const body=form.querySelector('textarea[name="body"]');if(body)body.value=caption;
   const f=new FormData(form),str=k=>String(f.get(k)||'').trim();
   if(mode==='story'){
    const result=await createStoryPublication(form,f,str);
    void window.PatiyizCameraDraft?.clear(me.id);
    data.stories=[result,...data.stories.filter(x=>x.id!==result.id)];
    mediaFlow?.close();closeModal(true);render();
    notify('Hikâyen 24 saat boyunca görüntülenecek.');
   }else{
    const result=await createPostPublication(form,f,str);
    void window.PatiyizCameraDraft?.clear(me.id);
    profileCountCache.delete(me.id);
    mediaFlow?.close();closeModal(true);
    try{await refresh()}catch(error){console.warn('Paylaşım kaydedildi, akış yenilemesi başarısız:',error.message)}
    notify('Paylaşım yayınlandı.');
    try{localStorage.removeItem(patiDraftKey())}catch(_){}
   }
  }
 });
}
function startPatiCameraPost(){
 compose(null,'post',false);
 mountPatiyizCamera('post');
}
function startPatiCameraStory(){
 compose(null,'story',false);
 mountPatiyizCamera('story');
}
function startPatiCameraReels(){
 compose(null,'reels',false);
 mountPatiyizCamera('reels');
}

function compose(post,mode='post',autoPick=true){
 postCropX=.5;postCropY=.5;postCropRatio=mode==='story'||mode==='reels'?'9:16':'original';postCropZoom=1;postCropIndex=0;clearPatiMediaUrls();
 const reel=!post&&mode==='reels',story=!post&&mode==='story',textOnly=!post&&mode==='text';
 const title=post?'Paylaşımı düzenle':story?'Yeni hikâye':reel?'Yeni Reels':textOnly?'Yeni yazı':'Yeni gönderi';
 const sizes=story?[['9:16','▯ Dikey'],['1:1','□ Kare'],['1.91:1','▭ Yatay']]:[['original','⬚ Orijinal'],['4:5','▯ Dikey'],['1.91:1','▭ Yatay'],['1:1','□ Kare']];
 const editor=!post&&!textOnly?'<div class="pati-media-controls" hidden><label>Fotoğrafın kadrajını düzenle</label><div class="pati-ratio-options">'+sizes.map(([key,label],i)=>'<button type="button" class="'+(i===0?'active':'')+'" data-action="post-ratio" data-id="'+key+'">'+label+'</button>').join('')+'</div><input type="hidden" name="aspect" value="'+(story?'9:16':'original')+'"><button type="button" class="pati-inline-crop-toggle" data-action="post-crop-open">Fotoğrafı kırp</button><div class="pati-crop-preview" hidden><div class="pati-crop-pages"><button type="button" data-action="post-crop-prev" aria-label="Önceki fotoğraf">‹</button><strong id="pati-crop-index">1 / 1</strong><button type="button" data-action="post-crop-next" aria-label="Sonraki fotoğraf">›</button></div><canvas id="pati-crop-canvas" width="320" height="400" aria-label="Fotoğraf kırpma önizlemesi"></canvas><p>Fotoğrafı sürükleyerek istediğin kadrajı seç.</p><label>Yakınlaştır <input type="range" name="crop_zoom" min="1" max="2.5" value="1" step="0.05"></label></div></div>':textOnly?'':'<p class="small-note">Düzenleme sırasında mevcut medya korunur.</p>';
 const flow=!post&&!textOnly?'<div class="pati-composer-flow" aria-label="Paylaşım adımları"><span><b>1</b> Medya seç</span><i>›</i><span><b>2</b> Düzenle</span><i>›</i><span><b>3</b> Paylaş</span></div>':'';
 const invite=!post&&!story?(window.PatiyizCollabPicker?.makeMarkup('pati-collab-handle')||''):'';
 const tagButton=!story&&!post?'<button type="button" class="pati-mention-open" data-action="pati-mention-open" data-id="post"><span aria-hidden="true">@</span> Etiketle</button>':'';
 const storyAudienceSelect=story?'<div class="pati-field"><label>Kimler görebilir?<select name="story_audience"><option value="everyone">Herkes</option><option value="close_friends">Yakın Arkadaşlar</option></select></label></div>':'';
 const formBody=flow+(!post&&!textOnly?postMediaField(mode):'')+textField('body',textOnly?'Ne düşünüyorsun?':story?'Hikâye açıklaması (isteğe bağlı)':'Açıklama (isteğe bağlı)',post?.body||'',textOnly,story?300:1500)+tagButton+storyAudienceSelect+editor+invite;
 modal(title,formBody,'post-form');
 const f=document.getElementById('post-form');if(!post&&!story)window.PatiyizCollabPicker?.mount(f,{sb,userId:me?.id,blocked,localProfiles:data.profiles,avatar,escape:esc});const captionField=f.querySelector('textarea[name="body"]');if(captionField&&!textOnly)captionField.required=false;f.dataset.edit=post?.id||'';f.dataset.mode=story?'story':reel?'reels':textOnly?'text':'post';
 const submit=f.querySelector('.modal-footer button[type="submit"]');if(submit)submit.textContent=post?'Değişiklikleri kaydet':story?'Hikâyeyi paylaş':reel?'Reels paylaş':textOnly?'Yazıyı paylaş':'Paylaş';
 if(!post&&!story){const controls=document.createElement('div');controls.className='pati-draft-controls';controls.innerHTML='<button type="button" data-action="pati-draft-save">▤ Açıklama taslağını kaydet</button><button type="button" data-action="pati-draft-load">↺ Taslağı aç</button>';f.querySelector('.modal-content')?.appendChild(controls)}
 if(reel&&autoPick){if(!window.PatiyizReelsEditor)notify('Reels düzenleyici yüklenemedi. Sayfayı yenile.',true);else window.PatiyizReelsEditor.mount(f)}
 if(!post&&!textOnly&&autoPick)openComposerMediaPicker('gallery');
 if(textOnly)f.querySelector('textarea[name="body"]')?.focus();
}
function uploadStatus(message){const form=document.querySelector('#modal-root form');const status=form?.querySelector('.pati-upload-status');if(status){status.hidden=false;status.querySelector('span').textContent=message}const label=form?.querySelector('.modal-footer .primary-btn');if(label){label.dataset.originalText||=label.textContent;label.textContent='⏳ '+message}const camera=document.querySelector('#patiyiz-camera-screen');if(camera){const stage=camera.querySelector('#pati-camera-selected-count');if(stage)stage.textContent=message;const publish=camera.querySelector('#pati-camera-publish');if(publish?.disabled)publish.textContent='Yükleniyor…'}}
async function preparePhoto(file){if(!file||!file.size)return null;if(!file.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))throw Error('Lütfen bir fotoğraf dosyası seç.');const accepted=['image/jpeg','image/png','image/webp'];if(accepted.includes(file.type)&&file.size<=3*1024*1024)return file;uploadStatus('Fotoğraf hazırlanıyor…');let url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{img.onload=null;img.onerror=null;reject(new Error('Fotoğraf hazırlanırken zaman aşımına uğradı. Daha küçük bir fotoğraf dene.'))},18000);img.onload=()=>{clearTimeout(timer);resolve()};img.onerror=()=>{clearTimeout(timer);reject(new Error('Fotoğraf açılamadı. HEIC dosyası kullanıyorsan galeride JPG olarak dışa aktar.'))}});const max=2048,ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));if(!blob)throw Error('Fotoğraf işlenemedi.');if(blob.size>6291456)throw Error('Fotoğraf boyutu çok büyük.');return new File([blob],'patiyiz-'+Date.now()+'.jpg',{type:'image/jpeg'})}finally{URL.revokeObjectURL(url)}}
/* Full-screen, photo-by-photo crop editor. Drafts are applied only on Bitti,
   so cancel never changes the media that will be uploaded. */
const patiCropEdits=new WeakMap();
// Filter definitions apply to the actual exported pixels, not only CSS previews.
const patiCropFilters={
 original:{name:'Orijinal',css:'',tint:'#dce0e5'},
 vibrant:{name:'Canlı',css:'saturate(1.38) contrast(1.08)',tint:'#e78b47'},
 warm:{name:'Sıcak',css:'sepia(.2) saturate(1.2) hue-rotate(-9deg)',tint:'#e0a66d'},
 cool:{name:'Soğuk',css:'saturate(.92) hue-rotate(16deg)',tint:'#89b2ce'},
 mono:{name:'Siyah Beyaz',css:'grayscale(1) contrast(1.12)',tint:'#909090'},
 vintage:{name:'Vintage',css:'sepia(.36) saturate(.75) contrast(.96)',tint:'#b6a27a'},
 soft:{name:'Pastel',css:'saturate(.74) contrast(.91) brightness(1.08)',tint:'#e7bfd0'},
 cinema:{name:'Sinematik',css:'contrast(1.16) saturate(.77) sepia(.08)',tint:'#777e99'}
};
function patiMediaDefaultRatio(mode){return mode==='story'||mode==='reels'||mode==='reel'?'9:16':'4:5'}
function patiMediaAllowedRatios(mode){return mode==='story'||mode==='reels'||mode==='reel'?['9:16']:['4:5','1:1','1.91:1']}
function patiCropDefault(file,ratio){
 return {ratio:ratio||'4:5',zoom:1,x:.5,y:.5,rotation:0,flip:false,filter:'original',brightness:100,contrast:100};
}
function patiCropFilterCSS(state){
 const preset=patiCropFilters[state.filter]||patiCropFilters.original;
 const bright=Math.max(50,Math.min(150,Number(state.brightness)||100));
 const contrast=Math.max(50,Math.min(150,Number(state.contrast)||100));
 return [preset.css,'brightness('+bright+'%)','contrast('+contrast+'%)'].filter(Boolean).join(' ');
}
function patiCropSize(ratio,img,rotation=0,quality='export'){
 const side=quality==='preview'?540:1080;
 const sizes={'9:16':[side,Math.round(side*16/9)],'4:5':[side,Math.round(side*5/4)],'1:1':[side,side],'1.91:1':[side,Math.round(side*566/1080)]};
 if(sizes[ratio])return sizes[ratio];
 const rotate=rotation%180!==0,rw=rotate?img.naturalHeight:img.naturalWidth,rh=rotate?img.naturalWidth:img.naturalHeight;
 const max=2048,scale=Math.min(1,max/Math.max(rw,rh));
 return [Math.max(1,Math.round(rw*scale)),Math.max(1,Math.round(rh*scale))];
}
/* Pixel-based filters: iOS WebKit can ignore CanvasRenderingContext2D.filter.
   Process the exact cropped canvas using ImageData, shared by preview and upload. */
function patiCropApplyPixelFilter(ctx,width,height,state){
 const name=patiCropFilters[state.filter]?state.filter:'original';
 const brightness=Math.max(.5,Math.min(1.5,(Number(state.brightness)||100)/100));
 const contrast=Math.max(.5,Math.min(1.5,(Number(state.contrast)||100)/100));
 if(name==='original'&&brightness===1&&contrast===1)return;
 const config={
  original:[1,0,1,1,0,0,0],
  vibrant:[1.38,0,1.08,1,0,0,0],
  warm:[1.2,.2,1,1,8,-1,-8],
  cool:[.92,0,1,1,-5,0,12],
  mono:[0,0,1.12,1,0,0,0],
  vintage:[.75,.36,.96,1,0,0,0],
  soft:[.74,0,.91,1.08,0,0,0],
  cinema:[.77,.08,1.16,1,0,0,0]
 }[name]||[1,0,1,1,0,0,0];
 let image;try{image=ctx.getImageData(0,0,width,height)}catch(error){console.warn('Piksel filtresi desteklenmiyor:',error);return false}const bytes=image.data;
 const [saturation,sepia,presetContrast,presetBrightness,redShift,greenShift,blueShift]=config;
 const finalContrast=contrast*presetContrast,finalBrightness=brightness*presetBrightness;
 for(let i=0;i<bytes.length;i+=4){
  let red=bytes[i],green=bytes[i+1],blue=bytes[i+2];
  if(sepia){
   const sr=.393*red+.769*green+.189*blue;
   const sg=.349*red+.686*green+.168*blue;
   const sb=.272*red+.534*green+.131*blue;
   red=red*(1-sepia)+sr*sepia;
   green=green*(1-sepia)+sg*sepia;
   blue=blue*(1-sepia)+sb*sepia;
  }
  if(saturation!==1){
   const gray=.2126*red+.7152*green+.0722*blue;
   red=gray+(red-gray)*saturation;
   green=gray+(green-gray)*saturation;
   blue=gray+(blue-gray)*saturation;
  }
  bytes[i]=Math.max(0,Math.min(255,((red+redShift)*finalBrightness-128)*finalContrast+128));
  bytes[i+1]=Math.max(0,Math.min(255,((green+greenShift)*finalBrightness-128)*finalContrast+128));
  bytes[i+2]=Math.max(0,Math.min(255,((blue+blueShift)*finalBrightness-128)*finalContrast+128));
 }
 ctx.putImageData(image,0,0);
 return true;
}
function patiCropPaint(canvas,img,state,quality='export'){
 const [w,h]=patiCropSize(state.ratio,img,state.rotation,quality);
 if(canvas.width!==w)canvas.width=w;
 if(canvas.height!==h)canvas.height=h;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Fotoğraf düzenleyici açılamadı.');
 ctx.clearRect(0,0,w,h);
 const rotated=(state.rotation%180)!==0,rw=rotated?img.naturalHeight:img.naturalWidth,rh=rotated?img.naturalWidth:img.naturalHeight;
 const scale=Math.max(w/rw,h/rh)*state.zoom;
 const extraX=rw*scale-w,extraY=rh*scale-h;
 const cx=w/2+extraX*(.5-state.x),cy=h/2+extraY*(.5-state.y);
 ctx.save();ctx.filter=patiCropFilterCSS(state);ctx.translate(cx,cy);ctx.rotate(state.rotation*Math.PI/180);
 if(state.flip)ctx.scale(-1,1);
 ctx.drawImage(img,-img.naturalWidth*scale/2,-img.naturalHeight*scale/2,img.naturalWidth*scale,img.naturalHeight*scale);
 ctx.restore();
 if(typeof ctx.getImageData==='function'){
  try{ctx.clearRect(0,0,w,h);ctx.save();ctx.filter='none';ctx.translate(cx,cy);ctx.rotate(state.rotation*Math.PI/180);if(state.flip)ctx.scale(-1,1);ctx.drawImage(img,-img.naturalWidth*scale/2,-img.naturalHeight*scale/2,img.naturalWidth*scale,img.naturalHeight*scale);ctx.restore();const success=patiCropApplyPixelFilter(ctx,w,h,state);if(success===false){ctx.clearRect(0,0,w,h);ctx.save();ctx.filter=patiCropFilterCSS(state);ctx.translate(cx,cy);ctx.rotate(state.rotation*Math.PI/180);if(state.flip)ctx.scale(-1,1);ctx.drawImage(img,-img.naturalWidth*scale/2,-img.naturalHeight*scale/2,img.naturalWidth*scale,img.naturalHeight*scale);ctx.restore()}}catch(error){console.warn('Fotoğraf filtresi:',error)}
 }
 return {extraX:Math.max(0,extraX),extraY:Math.max(0,extraY)};
}
async function patiCropOpen(options={}){
 const form=document.getElementById('post-form');
 const primary=[...(form?.querySelector('input[name="photo"]')?.files||[])];
 const cover=form?.querySelector('input[name="cover_photo"]')?.files?.[0];
 const files=primary.length?primary:cover?.size?[cover]:[];
 if(!files.length)return notify('Düzenlemek için bir fotoğraf veya video kapağı seç.',true);
 document.getElementById('pati-full-crop-dialog')?.close();
 const popup=document.createElement('dialog');popup.id='pati-full-crop-dialog';popup.className='pati-full-crop-dialog';
 const drafts=new Map(),imageCache=new Map(),urls=[];
 let index=Math.min(postCropIndex,files.length-1),busy=false,drawToken=0,drag=null;
 const getState=i=>{
  if(!drafts.has(i)){
   const saved=patiCropEdits.get(files[i]);
   const mode=form.dataset.mode||'post';
   drafts.set(i,saved?{...saved,ratio:patiMediaAllowedRatios(mode).includes(saved.ratio)?saved.ratio:patiMediaDefaultRatio(mode)}:patiCropDefault(files[i],patiMediaDefaultRatio(mode)));
  }
  return drafts.get(i);
 };
 popup.innerHTML='<div class="pati-full-crop-shell">'+
  '<header class="pati-full-crop-head"><button type="button" data-crop-action="cancel">Vazgeç</button><strong>Fotoğrafı Düzenle</strong><button class="pati-crop-done" type="button" data-crop-action="done">Bitti</button></header>'+
  '<div class="pati-full-crop-stage"><canvas id="pati-full-crop-canvas" aria-label="Kırpma önizlemesi"></canvas><span class="pati-full-crop-guide" aria-hidden="true"></span></div>'+
  '<div class="pati-full-crop-controls"><div class="pati-crop-top-controls">'+
  '<button type="button" data-crop-action="flip" aria-label="Yatay çevir">⇋ <small>Ayna</small></button>'+
  '<button type="button" data-crop-action="rotate" aria-label="90 derece döndür">↻ <small>Döndür</small></button>'+
  '<span class="pati-full-crop-counter" id="pati-full-crop-counter"></span>'+
  '</div><div class="pati-crop-ratios" role="group" aria-label="Kırpma oranı">'+
  patiMediaAllowedRatios(form.dataset.mode||'post').map(ratio=>[ratio,({'4:5':'4:5 · Dikey','1:1':'1:1 · Kare','1.91:1':'1.91:1 · Yatay','9:16':'9:16 · Tam ekran'})[ratio]]).map(([ratio,label])=>
  '<button type="button" data-crop-action="ratio" data-ratio="'+ratio+'">'+label+'</button>').join('')+'</div>'+
  '<section class="pati-crop-color-panel" aria-label="Renk filtreleri ve fotoğraf ayarları"><div class="pati-crop-color-heading"><strong>Renk filtreleri</strong><button type="button" data-crop-action="reset-color">Sıfırla</button></div>'+
  '<div class="pati-crop-filter-strip" role="group" aria-label="Fotoğraf filtreleri">'+Object.entries(patiCropFilters).map(([key,preset])=>
  '<button type="button" class="pati-crop-filter-tile" data-crop-action="filter" data-filter="'+key+'" aria-pressed="false"><span class="pati-crop-filter-swatch" style="--pati-filter-tint:'+preset.tint+'"></span><small>'+preset.name+'</small></button>').join('')+'</div>'+
  '<div class="pati-crop-adjustments"><label for="pati-crop-brightness">Parlaklık <output id="pati-crop-brightness-value" for="pati-crop-brightness">100%</output></label><input type="range" id="pati-crop-brightness" min="50" max="150" value="100" step="1" aria-label="Parlaklık">'+
  '<label for="pati-crop-contrast">Kontrast <output id="pati-crop-contrast-value" for="pati-crop-contrast">100%</output></label><input type="range" id="pati-crop-contrast" min="50" max="150" value="100" step="1" aria-label="Kontrast"></div></section>'+
  '<label class="pati-full-crop-zoom">Yakınlaştır <input type="range" min="1" max="3" step=".01" value="1" id="pati-full-crop-zoom"></label>'+
  (files.length>1?'<div class="pati-crop-pagination"><button type="button" data-crop-action="prev">‹ Önceki</button><button type="button" data-crop-action="next">Sonraki ›</button></div>':'')+
  '<p>Fotoğrafı sürükleyerek kadrajı ayarla. İstersen oranını değiştir.</p><p class="pati-crop-status" role="status" aria-live="polite"></p></div></div>';
 document.body.appendChild(popup);const canvas=popup.querySelector('#pati-full-crop-canvas'),status=popup.querySelector('.pati-crop-status');
 popup.addEventListener('close',()=>{drawToken++;urls.forEach(x=>URL.revokeObjectURL(x));popup.remove()},{once:true});
 popup.addEventListener('cancel',e=>{if(busy)e.preventDefault()});
 async function loadImage(i){
  if(imageCache.has(i))return imageCache.get(i);
  const url=URL.createObjectURL(files[i]);urls.push(url);
  const img=new Image();img.src=url;await img.decode();imageCache.set(i,img);
  return img;
 }
 async function draw(){
  const token=++drawToken,state=getState(index);
  status.textContent='Fotoğraf hazırlanıyor…';
  try{
   const img=await loadImage(index);
   if(token!==drawToken||!popup.isConnected)return;
   const extras=patiCropPaint(canvas,img,state,'preview');
   canvas.dataset.extraX=String(extras.extraX);canvas.dataset.extraY=String(extras.extraY);
   popup.querySelector('.pati-full-crop-stage').style.setProperty('--pati-crop-aspect',canvas.width+' / '+canvas.height);
   popup.querySelector('#pati-full-crop-counter').textContent=files.length>1?(index+1)+' / '+files.length:'Fotoğraf';
   popup.querySelector('#pati-full-crop-zoom').value=String(state.zoom);
   for(const key of ['brightness','contrast']){
    const control=popup.querySelector('#pati-crop-'+key);
    if(control){control.value=String(state[key]??100);popup.querySelector('#pati-crop-'+key+'-value').textContent=control.value+'%'}
   }
   popup.querySelectorAll('[data-crop-action="filter"]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===(state.filter||'original'));b.setAttribute('aria-pressed',String(b.dataset.filter===(state.filter||'original')))});
   popup.querySelectorAll('[data-crop-action="ratio"]').forEach(b=>{b.classList.toggle('active',b.dataset.ratio===state.ratio);b.setAttribute('aria-pressed',String(b.dataset.ratio===state.ratio))});
   status.textContent='';
  }catch(e){status.textContent='Fotoğraf açılamadı. Galeriden JPG olarak yeniden deneyebilirsin.';console.warn('Kırpma önizlemesi:',e)}
 }
 popup.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-crop-action]');if(!btn||busy)return;
  const action=btn.dataset.cropAction,state=getState(index);
  if(action==='cancel'){popup.close();return}
  if(action==='done'){
   busy=true;btn.disabled=true;
   for(const [i,edit] of drafts)patiCropEdits.set(files[i],{...edit});
   postCropIndex=index;popup.close();updatePostMediaPreview();options.onDone?.();return;
  }
  if(action==='prev'||action==='next'){index=(index+(action==='next'?1:-1)+files.length)%files.length;await draw();return}
  if(action==='filter'){if(!patiCropFilters[btn.dataset.filter])return;state.filter=btn.dataset.filter;await draw();return}
  if(action==='reset-color'){state.filter='original';state.brightness=100;state.contrast=100;await draw();return}
  if(action==='flip')state.flip=!state.flip;
  if(action==='rotate'){state.rotation=(state.rotation+90)%360;state.x=.5;state.y=.5}
  if(action==='ratio'){state.ratio=btn.dataset.ratio;state.x=.5;state.y=.5;state.zoom=1}
  await draw();
 });
 popup.querySelector('#pati-full-crop-zoom').addEventListener('input',event=>{
  getState(index).zoom=Number(event.target.value)||1;void draw();
 });
 for(const property of ['brightness','contrast']){
  popup.querySelector('#pati-crop-'+property).addEventListener('input',event=>{
   getState(index)[property]=Number(event.target.value);
   popup.querySelector('#pati-crop-'+property+'-value').textContent=event.target.value+'%';
   void draw();
  });
 }
 const endDrag=()=>{drag=null};
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;event.preventDefault();
  drag={id:event.pointerId,x:event.clientX,y:event.clientY};
  canvas.setPointerCapture(event.pointerId);
 });
 canvas.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  event.preventDefault();
  const rect=canvas.getBoundingClientRect(),state=getState(index),ex=Number(canvas.dataset.extraX)||0,ey=Number(canvas.dataset.extraY)||0;
  if(ex>0)state.x=Math.max(0,Math.min(1,state.x-(event.clientX-drag.x)*canvas.width/Math.max(1,rect.width)/ex));
  if(ey>0)state.y=Math.max(0,Math.min(1,state.y-(event.clientY-drag.y)*canvas.height/Math.max(1,rect.height)/ey));
  drag.x=event.clientX;drag.y=event.clientY;void draw();
 });
 canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
 popup.showModal();await draw();
}
/* Reuse the exact same editor and export settings in the native camera/gallery flow.
   The preview uses a separate blob; source files and publication identity are unchanged. */
if(typeof window!=='undefined')window.PatiyizCropMedia={
 open:onDone=>patiCropOpen({onDone}),
 async preview(file){
  if(!patiCropEdits.has(file))return null;
  return cropPostPhoto(file,'original');
 },
 has:file=>patiCropEdits.has(file)
};
async function drawPostCrop(){
 // Legacy inline editor is replaced by the full-screen media editor.
 const inline=document.querySelector('#post-form .pati-crop-preview');
 if(inline)inline.hidden=true;
}
async function cropPostPhoto(file,aspect){
 if(!file?.size)return file;
 const state=patiCropEdits.get(file)||patiCropDefault(file,aspect||'4:5');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  const canvas=document.createElement('canvas');
  patiCropPaint(canvas,img,state);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.87));
  if(!blob)throw Error('Fotoğraf kırpılamadı.');
  return new File([blob],'patiyiz-post-'+Date.now()+'.jpg',{type:'image/jpeg'});
 }finally{URL.revokeObjectURL(url)}
}
/* Network retries can arrive after Storage already saved the object. Only accept
   a retry as successful after verifying its exact path and byte size. */
function patiUploadRetryable(error){
 return /timeout|network|fetch|502|503|504|ECONN|ETIMEDOUT|already exists|duplicate|409/i.test(String(error?.message||error||''));
}
async function patiStorageUploadConfirmed(bucket,key,expectedBytes){
 try{
  const storage=sb.storage.from(bucket);
  if(typeof storage.info!=='function')return false;
  const {data,error}=await storage.info(key);
  if(error||!data)return false;
  const bytes=Number(data.size??data.metadata?.size);
  return Number.isFinite(bytes)&&bytes===expectedBytes;
 }catch(_){return false}
}
async function uploadPrivatePublicationMedia(file,kind){
 if(!globalThis.PatiyizPrivateMedia)throw Error('Güvenli medya yükleyici başlatılamadı. Sayfayı yenile.');
 if(!file?.size)return null;
 if(navigator.onLine===false)throw Error('Medya yüklemek için internet bağlantısı gerekli.');
 if(kind==='video'&&file.size>50*1024*1024){
  if(!window.PatiyizVideoPrepare?.prepare)throw Error('Video çok büyük. 50 MB altında bir dosya seç.');
  uploadStatus('Video güvenli yükleme için hazırlanıyor…');
  file=await window.PatiyizVideoPrepare.prepare(file,uploadStatus);
 }
 if(kind==='image')file=await preparePhoto(file);
 const contentType=kind==='video'?(['video/mp4','video/webm','video/quicktime'].includes(file.type)?file.type:/\.mov$/i.test(file.name)?'video/quicktime':/\.webm$/i.test(file.name)?'video/webm':'video/mp4'):file.type;
 const prepared=file.type===contentType?file:new File([file],file.name||'patiyiz-private-media',{type:contentType});
 uploadStatus('Medya özel depoya yükleniyor…');
 return globalThis.PatiyizPrivateMedia.upload(prepared,kind,me.id,sb,{projectUrl:cfg.supabaseUrl,onProgress:p=>uploadStatus('Güvenli yükleme… %'+p)});
}
async function uploadVideo(file){
 if(!file||!file.size)return null;
 const max=50*1024*1024;
 // Free storage allows up to 50 MB per object. Try local compression without
 // uploading the original when a supported browser can preserve the sound.
 if(file.size>max){
  if(typeof window==='undefined'||!window.PatiyizVideoPrepare?.prepare)throw Error('Video 50 MB sınırını aşıyor. 720p MP4 olarak dışa aktarıp tekrar dene.');
  uploadStatus('Büyük video cihazında sıkıştırılıyor…');
  file=await window.PatiyizVideoPrepare.prepare(file,message=>uploadStatus(message));
 }
 if(file.size>max)throw Error('Video 50 MB altında olmalı. Lütfen videoyu daha düşük çözünürlükte kaydet.');
 if(navigator.onLine===false)throw Error('İnternet bağlantısı yok. Video bağlantı geldiğinde yüklenebilir.');
 const guessed=/\.mov$/i.test(file.name)?'video/quicktime':/\.webm$/i.test(file.name)?'video/webm':/\.mp4$/i.test(file.name)?'video/mp4':'';
 const mime=['video/mp4','video/webm','video/quicktime'].includes(file.type)?file.type:(!file.type||file.type==='application/octet-stream'?guessed:file.type);
 if(!['video/mp4','video/webm','video/quicktime'].includes(mime))throw Error('MP4, WebM veya MOV video seç.');
 const ext=mime==='video/quicktime'?'mov':mime==='video/webm'?'webm':'mp4';
 const key=me.id+'/'+crypto.randomUUID()+'.'+ext;
 uploadStatus('Video yükleniyor…');
 let result;
 for(let attempt=0;attempt<3;attempt++){
  try{
   result=(typeof window!=='undefined'&&window.PatiyizReliableUpload?.upload)
    ?await window.PatiyizReliableUpload.upload({sb,projectUrl:cfg.supabaseUrl,bucket:'patiyiz-videos',key,file,contentType:mime,onProgress:p=>uploadStatus('Video yükleniyor… %'+p)})
    :await sb.storage.from('patiyiz-videos').upload(key,file,{contentType:mime,cacheControl:'86400',upsert:false});
   if(!result.error)break;
   throw result.error;
  }catch(error){
   if(typeof patiStorageUploadConfirmed==='function'&&await patiStorageUploadConfirmed('patiyiz-videos',key,file.size)){result={error:null};break;}
   if(attempt===2||!(typeof patiUploadRetryable==='function'?patiUploadRetryable(error):/timeout|network|fetch|502|503|504/i.test(String(error?.message||error))))throw error;
   uploadStatus('Video bağlantısı tekrar deneniyor… ('+(attempt+2)+'/3)');
   await new Promise(resolve=>setTimeout(resolve,900*(attempt+1)));
  }
 }
 if(result?.error)throw result.error;
 return sb.storage.from('patiyiz-videos').getPublicUrl(key).data.publicUrl;
}
async function upload(file){if(!file||!file.size)return null;if(navigator.onLine===false)throw Error('İnternet bağlantısı yok. Fotoğrafı bağlantı geldiğinde yükle.');if(file.size>30*1024*1024)throw Error('Fotoğraf en fazla 30 MB olabilir.');uploadStatus('Fotoğraf hazırlanıyor…');const prepared=await preparePhoto(file);const ext=prepared.type==='image/png'?'png':prepared.type==='image/webp'?'webp':'jpg';const key=me.id+'/'+crypto.randomUUID()+'.'+ext;uploadStatus('Fotoğraf yükleniyor…');let up;for(let attempt=0;attempt<2;attempt++){try{up=(typeof window!=='undefined'&&window.PatiyizReliableUpload?.upload)?await window.PatiyizReliableUpload.upload({sb,projectUrl:cfg.supabaseUrl,bucket:'patiyiz-media',key,file:prepared,contentType:prepared.type,onProgress:p=>uploadStatus('Fotoğraf yükleniyor… %'+p)}):await sb.storage.from('patiyiz-media').upload(key,prepared,{contentType:prepared.type,cacheControl:'86400',upsert:false});if(!up.error)break;if(await patiStorageUploadConfirmed('patiyiz-media',key,prepared.size)){up={error:null};break}if(attempt===1||!patiUploadRetryable(up.error))throw up.error}catch(err){if(await patiStorageUploadConfirmed('patiyiz-media',key,prepared.size)){up={error:null};break}if(attempt===1||!patiUploadRetryable(err))throw err}uploadStatus('Bağlantı yeniden deneniyor…');await new Promise(r=>setTimeout(r,900))}if(up?.error)throw up.error;uploadStatus('Paylaşım hazırlanıyor…');return sb.storage.from('patiyiz-media').getPublicUrl(key).data.publicUrl}
/* Publication transaction: protect against duplicate posts and clean up only unreferenced, owned media. */
function publicationMediaReference(url,owner){
 const privatePath=globalThis.PatiyizPrivateMedia?.getPath(url);
 if(privatePath&&privatePath.startsWith(owner+'/'))return {bucket:'patiyiz-private-posts',name:privatePath,url};
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
   const url=await uploadPrivatePublicationMedia(file,kind);
   if(url)uploaded.push(url);
   return url;
  });
  if(me?.id!==owner)throw Error('Oturum değişti. Paylaşımı tekrar başlat.');
  form.dataset.patiPublishAttempted='yes';
  const response=await sb.from(table).insert({...record,id,author_id:owner}).select('*').single();
  if(response.error)throw response.error;
  if(!response.data)throw Error('Paylaşım kaydı doğrulanamadı.');
  recordMetric('success');const media=globalThis.PatiyizPrivateMedia;
  return media?(await media.hydrateRows([response.data],owner,sb))[0]:response.data;
 }catch(error){
  const checked=await checkPublishedRecord(table,id,owner);
  if(checked.known){
   const references=new Set(checked.row?[checked.row.image_url,checked.row.video_url,checked.row.video_cover_url,...(checked.row.images||[]),...(checked.row.media_videos||[])].filter(Boolean):[]);
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
 const videoFiles=[...(form.querySelector('input[name="video"]')?.files||[])].filter(x=>x?.size),videoFile=videoFiles[0],hasVideo=videoFiles.length>0,body=str('body').trim();
 if(form.dataset.mode!=='reels'&&videoFiles.length>4)throw Error('Bir gönderide en fazla 4 video paylaşabilirsin.');
 if(form.dataset.mode==='text'&&!body)throw Error('Yazı paylaşmak için önce bir metin yaz.');
 if(form.dataset.mode==='reels'&&!hasVideo)throw Error('Reels paylaşmak için önce bir video seç.');
 if(photoFiles.length>10)throw Error('En fazla 10 fotoğraf seçebilirsin.');
 if(photoFiles.length&&hasVideo)throw Error('Bir paylaşımda fotoğraf veya video seçebilirsin.');
 if(!body&&!photoFiles.length&&!hasVideo)throw Error('Paylaşmak için bir fotoğraf, video veya yazı ekle.');
 return publishMediaRecord('posts',form,async send=>{
  const record={body,species:'Diğer',pet_id:null,images:[],media_videos:[],post_format:form.dataset.mode==='reels'?'reels':'post',selfie_mirrored:hasVideo&&form.dataset.selfieMirror==='true'};
  for(let i=0;i<photoFiles.length;i++){
   uploadStatus('Fotoğraf '+(i+1)+' / '+photoFiles.length+' hazırlanıyor…');
   const file=await cropPostPhoto(photoFiles[i],patiMediaDefaultRatio(form.dataset.mode||'post'));
   const url=await send(file,'image');
   if(url)record.images.push(url);
  }
  record.image_url=record.images[0]||null;
  let video=videoFile;
  if(form.dataset.mode==='reels'&&hasVideo&&form.dataset.cameraFirst!=='1'){
   if(!window.PatiyizReelsEditor)throw Error('Reels editörü yüklenemedi. Sayfayı yenile.');
   uploadStatus('Reels klipleri hazırlanıyor…');
   video=await window.PatiyizReelsEditor.exportVideo(percent=>uploadStatus('Reels işleniyor… %'+percent));
  }
  record.video_url=await send(video,'video');
 if(record.video_url)record.media_videos.push(record.video_url);
 if(form.dataset.mode!=='reels'&&videoFiles.length>1){
  for(let i=1;i<videoFiles.length;i++){
   uploadStatus('Video '+(i+1)+' / '+videoFiles.length+' yükleniyor…');
   const url=await send(videoFiles[i],'video');if(url)record.media_videos.push(url);
  }
 }
  if(video?.size){
   record.video_subtitle=str('video_subtitle').slice(0,220)||null;
   const cover=form.querySelector('input[name="cover_photo"]')?.files?.[0];
   const selectedCover=cover?.size?cover:await patiGenerateVideoCover(video);
    if(selectedCover?.size){uploadStatus('Video kapağı kaydediliyor…');record.video_cover_url=await send(await cropPostPhoto(selectedCover,form.dataset.mode==='reels'?'9:16':'4:5'),'image')}
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
 const audience=form.dataset.storyAudience||str('story_audience')||'everyone';
 if(audience==='close_friends')return patiCreateCloseFriendStory(form,f,str);
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
   const img=shared||patiCropEdits.has(photo)?await cropPostPhoto(photo,'9:16'):await cropPostPhoto(await renderEditedStoryFile(photo,form),'9:16');
   image_url=await send(img,'image');
  }else{
   uploadStatus('Hikâye videosu hazırlanıyor…');
   const chosen=form.querySelector('input[name="cover_photo"]')?.files?.[0];
   const poster=chosen?.size?chosen:await patiGenerateVideoCover(video)||await patiFallbackStoryPoster();
   image_url=await send(await cropPostPhoto(poster,'9:16'),'image');
   video_url=await send(video,'video');
   if(!video_url)throw Error('Hikâye videosu yüklenemedi.');
  }
  if(!image_url)throw Error('Hikâye kapağı yüklenemedi.');
  uploadStatus('Hikâye kaydediliyor…');
  return {image_url,video_url,selfie_mirrored:!!video_url&&form.dataset.selfieMirror==='true',caption:shared?str('body').slice(0,300):str('caption'),is_highlight:false,
   poll_question:null,poll_options:null,question_prompt:null};
 });
}
async function patiRateQuestion(questionId,helpful){
 if(!me?.id||!data.questions.some(q=>q.id===questionId))throw Error('Soru bulunamadı.');
 if(patiQuestionVotePending.has(questionId))return;
 const uid=me.id,existing=data.votes.find(x=>x.question_id===questionId&&x.user_id===uid);
 const same=!!existing&&(existing.is_helpful!==false)===helpful;
 const snapshot=existing?{...existing}:null;
 patiQuestionVotePending.add(questionId);
 data.votes=data.votes.filter(x=>!(x.question_id===questionId&&x.user_id===uid));
 if(!same)data.votes.push({question_id:questionId,user_id:uid,is_helpful:helpful});
 voted=new Set(data.votes.filter(x=>x.user_id===uid&&x.is_helpful!==false).map(x=>x.question_id));
 patiQuestionVotePaint(questionId);
 try{
  if(existing){
   const removed=await sb.from('question_votes').delete().eq('question_id',questionId).eq('user_id',uid);
   if(removed.error)throw removed.error;
  }
  if(!same){
   const inserted=await sb.from('question_votes').insert({question_id:questionId,user_id:uid,is_helpful:helpful}).select('*').single();
   if(inserted.error)throw inserted.error;
   if(me?.id===uid){
    data.votes=data.votes.map(x=>x.question_id===questionId&&x.user_id===uid?inserted.data:x);
   }
  }
 }catch(error){
  if(me?.id===uid){
   try{
    const actual=await sb.from('question_votes').select('*').eq('question_id',questionId).eq('user_id',uid).maybeSingle();
    data.votes=data.votes.filter(x=>!(x.question_id===questionId&&x.user_id===uid));
    if(!actual.error&&actual.data)data.votes.push(actual.data);
    else if(actual.error&&snapshot)data.votes.push(snapshot);
   }catch(_){
    data.votes=data.votes.filter(x=>!(x.question_id===questionId&&x.user_id===uid));
    if(snapshot)data.votes.push(snapshot);
   }
   voted=new Set(data.votes.filter(x=>x.user_id===uid&&x.is_helpful!==false).map(x=>x.question_id));
   notify('Değerlendirme kaydedilemedi: '+friendly(error),true);
  }
 }finally{patiQuestionVotePending.delete(questionId);if(me?.id===uid)patiQuestionVotePaint(questionId);}
}
function composeQuestion(){modal('Topluluğa soru sor','<div class="pati-community-form-intro"><strong>Merak ettiğin konuyu paylaş.</strong><p>Bir soru sor; topluluk sana farklı bakış açıları ve yanıtlar sunsun.</p></div>'+formField('title','Soru başlığı (5–150 karakter)','text','',true)+selectField('category','Kategori',PATI_QUESTION_CATEGORIES)+textField('body','Sorunu biraz daha açıkla (en az 5 karakter)','',true,2000)+'<p class="pati-community-form-note">Sorulara Faydalı veya Faydalı değil değerlendirmesi yapılabilir.</p>','question-form');const f=$('#question-form');if(f){f.querySelector('[name="title"]').minLength=5;f.querySelector('[name="title"]').maxLength=150;f.querySelector('[name="body"]').minLength=5;f.querySelector('.modal-footer .primary-btn').textContent='Soruyu paylaş';document.querySelector('#modal-root .modal')?.classList.add('pati-question-fullscreen');document.querySelector('#modal-root .modal-backdrop')?.classList.add('pati-question-backdrop');f.querySelector('[name="title"]')?.focus({preventScroll:true})}}
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
 const editId=typeof arguments[1]==='string'?arguments[1]:'';
 if(record.title.length<2||record.title.length>110)throw Error('Görev adı 2–110 karakter arasında olmalı.');
 if(!CARE_CATEGORIES.includes(record.category))throw Error('Geçerli bakım kategorisi seç.');
 if(!careDateValid(record.due_date))throw Error('Geçerli görev tarihi seç.');
 if(record.pet_id&&!data.pets.some(p=>p.id===record.pet_id&&p.owner_id===me?.id))throw Error('Bu hayvan profiline görev ekleme yetkin yok.');
 const key=patiCareTaskKey(record);
 if(data.care.some(x=>x.owner_id===me?.id&&x.id!==editId&&patiCareTaskKey(x)===key))throw Error('Bu bakım görevi aynı tarihte zaten mevcut.');
 const kind={Aşı:'vaccine',Veteriner:'vet',İlaç:'medicine',Mama:'food',Bakım:'care'}[record.category];
 if(record.pet_id&&typeof patiWellness!=='undefined'&&Array.isArray(patiWellness.reminders)&&patiWellness.reminders.some(x=>x.pet_id===record.pet_id&&patiCareDate(x.due_at)===record.due_date&&careFold(x.title)===careFold(record.title)&&({vaccine:'Aşı',vet:'Veteriner',medicine:'İlaç',food:'Mama'}[x.kind]||'Bakım')===record.category))
  throw Error('Bu görev sağlık hatırlatmalarında zaten mevcut.');
 return record;
}
function editProfile(){
 const p=current();
 const pic=p.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="Mevcut profil fotoğrafın">':'<span>'+esc((p.display_name||'P').slice(0,1).toUpperCase())+'</span>';
 const fields='<section class="pati-edit-cover"><div class="pati-edit-avatar">'+pic+'</div><div class="pati-edit-photo-tools"><strong>Profil fotoğrafın</strong><label class="pati-edit-photo-select" for="pati-profile-photo">Fotoğrafı değiştir</label><input id="pati-profile-photo" name="photo" type="file" accept="image/*,.heic,.heif" aria-label="Yeni profil fotoğrafı seç"><small>JPG, PNG veya HEIC fotoğraf yükle</small></div><div class="pati-upload-preview" hidden></div></section>'+
 '<div class="pati-edit-sections"><div class="pati-edit-section-title">Profil bilgileri</div>'+
 formField('display_name','Ad','text',p.display_name,true)+
 formField('handle','Kullanıcı adı','text',p.handle,true)+
 '<div class="pati-field pati-profile-title-field"><label id="pati-profile-title-label" for="pati-profile-title-open">Profil unvanı (isteğe bağlı)</label>'+
 '<input id="f-professional_title" name="professional_title" type="hidden" value="'+esc(p.professional_title||'')+'">'+
 '<button id="pati-profile-title-open" class="pati-profile-title-open" type="button" data-pati-profile-title-open aria-labelledby="pati-profile-title-label pati-profile-title-value">'+
 '<span id="pati-profile-title-value" data-pati-profile-title-current>'+esc(String(p.professional_title||'').trim()||'Unvan seç')+'</span><span aria-hidden="true" class="pati-profile-title-chevron">›</span></button>'+
 '<small>Dokunup unvan ara, birden fazla seç veya kendin yeni bir unvan yaz.</small></div>'+
 textField('bio','Biyografi',p.bio||'',false,500)+
 formField('city','Şehir','text',p.city||'')+
 '<div class="pati-field pati-gender-option"><label for="pati-profile-gender">Cinsiyet (isteğe bağlı)</label><select id="pati-profile-gender" name="analytics_gender"><option value="">Seçim yapmadan devam et</option><option value="woman">Kadın</option><option value="man">Erkek</option><option value="other">Diğer</option><option value="undisclosed">Paylaşmak istemiyorum</option></select><small>Hesabında görünmez; yalnızca yeterli sayıda ziyaretçi varsa toplu istatistiklere dahil edilir.</small></div>'+
 '<section class="pati-edit-links-section"><div class="pati-edit-section-title">Bağlantılar</div><p class="pati-edit-hint">Web siteni, sosyal medya hesaplarını veya istediğin diğer web adreslerini ekleyebilirsin.</p><div id="pati-profile-links-editor">'+patiProfileLinks(p).map(patiProfileLinkEditorRow).join('')+'</div><div class="pati-profile-links-editor-foot"><span id="pati-profile-links-count"></span><button type="button" data-action="pati-profile-link-add">'+ico('plus')+' Bağlantı ekle</button></div></section>'+
 '<p class="pati-edit-hint">Kullanıcı adı 3–24 karakter olmalı. Kaydettiğin bilgiler profilinde görünür.</p></div>';
 modal('Profili düzenle',fields,'profile-form');
 const root=document.querySelector('#modal-root .modal');
 root?.classList.add('pati-profile-edit-modal');
 patiBindProfileLinkEditor(document.getElementById('profile-form'));
 void sb.from('patiyiz_audience_demographics').select('gender').eq('user_id',me.id).maybeSingle().then(({data,error})=>{
  if(error)return;
  const field=document.querySelector('#pati-profile-gender');
  if(field&&!field.value&&data?.gender)field.value=data.gender;
 }).catch(()=>{});
 const submit=document.querySelector('#profile-form .modal-footer button[type="submit"]');
 if(submit)submit.textContent='Bitti';
}
function editPet(p){
 if(typeof patiPetPhotoObjectUrl!=='undefined'&&patiPetPhotoObjectUrl){URL.revokeObjectURL(patiPetPhotoObjectUrl);patiPetPhotoObjectUrl=''}
 if(p&&p.owner_id!==me.id)return notify('Yalnızca kendi hayvanını düzenleyebilirsin.',true);
 const photo=p?.photo_url?'<img src="'+esc(p.photo_url)+'" alt="Mevcut hayvan fotoğrafı" loading="eager">':'<span class="pati-pet-placeholder">'+petIcon(p?.species||'Kedi')+'</span>';
 const fields='<section class="pati-edit-cover pati-pet-edit-cover"><div class="pati-edit-avatar pati-pet-edit-photo">'+photo+'</div><div class="pati-edit-photo-tools pati-pet-edit-photo-tools"><strong>Hayvanının fotoğrafı</strong><label class="pati-edit-photo-select pati-pet-photo-select" for="pati-pet-photo">Fotoğrafı '+(p?'değiştir':'ekle')+'</label><input id="pati-pet-photo" name="photo" type="file" accept="image/*,.heic,.heif" aria-label="Hayvan fotoğrafı seç"><small>JPG, PNG veya HEIC · Fotoğraf eklemek isteğe bağlı</small></div><div class="pati-upload-preview" hidden></div></section>'+
 '<div class="pati-edit-sections pati-pet-edit-sections"><div class="pati-edit-section-title">Hayvan bilgileri</div>'+
 formField('name','Hayvanın adı','text',p?.name||'',true)+
 selectField('species','Tür',p?.species&&!species.includes(p.species)?[p.species,...species]:species,p?.species||'Kedi')+
 selectField('gender','Cinsiyet',petGenders,p?.gender||'Belirtilmedi')+
 '<div class="pati-pet-edit-fields-row">'+formField('age','Yaş','text',p?.age||'')+'<div class="pati-pet-breed-area"><div class="pati-pet-breed-picker" hidden><label for="pati-pet-breed-choice">Irk</label><select name="breed_choice" id="pati-pet-breed-choice" aria-label="Hayvanın ırkı"></select></div><div class="pati-pet-free-breed">'+formField('breed','Irk / diğer ırk','text',p?.breed||'')+'</div></div></div>'+
 '<div class="pati-edit-section-title pati-pet-edit-secondary-heading">Ek bilgiler</div>'+
 formField('personality','Karakter','text',p?.personality||'')+
 textField('notes','Notlar',p?.notes||'',false,500)+
 '<p class="pati-edit-hint">Bilgileri daha sonra Hayvanım Merkezi üzerinden değiştirebilirsin.</p></div>';
 modal(p?'Hayvan profilini düzenle':'Yeni hayvan ekle',fields,'pet-form');
 const form=$('#pet-form');form.dataset.edit=p?.id||'';
 if(typeof patiSyncPetBreedSelect==='function'){
  patiSyncPetBreedSelect(form,p?.breed||'');
  form.querySelector('[name="species"]')?.addEventListener?.('change',()=>patiSyncPetBreedSelect(form));
  form.querySelector('[name="breed_choice"]')?.addEventListener?.('change',()=>patiSyncPetBreedSelect(form,form.querySelector('[name="breed_choice"]').value));
 }
 document.querySelector('#modal-root .modal')?.classList.add('pati-profile-edit-modal','pati-pet-edit-modal');
 const submit=form.querySelector('.modal-footer button[type="submit"]');
 if(submit)submit.textContent='Bitti';
 if(p){
  const footer=form.querySelector('.modal-footer');
  if(footer)footer.insertAdjacentHTML('afterbegin','<button class="pati-pet-delete" type="button" data-action="pet-delete" data-id="'+esc(p.id)+'">Hayvan profilini sil</button>');
 }
}
function questionReplies(id){
 const q=data.questions.find(x=>x.id===id);if(!q||!me)return;
 const state=typeof patiCommunityReplyPages!=='undefined'?patiCommunityReplyPages.get(me.id+':'+id):null;
 const previous=document.getElementById('reply-form'),same=previous?.dataset.question===id;
 const draft=same?previous.querySelector('[name="body"]')?.value||'':'';
 const scroll=same?previous.querySelector('.comment-list')?.scrollTop||0:0;
 const source=state?.ready?state.rows:data.replies.filter(r=>r.question_id===id);
 const replies=[...source].filter(r=>!blocked.has(r.author_id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 const owner=profile(q.author_id);
 const top='<section class="pati-comment-post-summary pati-question-reply-summary">'+
  '<div class="pati-comment-post-user">'+
  '<button type="button" class="pati-comment-profile-avatar" data-action="view-user" data-id="'+esc(q.author_id)+'" aria-label="'+esc(displayName(owner))+' profiline git">'+avatar(owner,'s')+'</button>'+
  '<button type="button" class="pati-comment-profile-name" data-action="view-user" data-id="'+esc(q.author_id)+'">'+displayName(owner)+'</button>'+
  '</div><h3>'+esc(q.title||'Topluluk sorusu')+'</h3><p class="pati-community-question-description">'+esc(q.body||'')+'</p></section>';
 const entries=replies.map(x=>{
  const person=profile(x.author_id),name=displayName(person),mine=x.author_id===me.id;
  return '<div class="comment-item pati-sheet-comment pati-question-reply-row" data-reply-id="'+esc(x.id)+'">'+
   '<div class="pati-sheet-comment-avatar"><button type="button" class="pati-comment-profile-avatar" data-action="view-user" data-id="'+esc(x.author_id)+'" aria-label="'+esc(name)+' profiline git">'+avatar(person,'s')+'</button></div>'+
   '<div class="pati-sheet-comment-main"><div class="pati-sheet-comment-line">'+
   '<button type="button" class="pati-comment-profile-name" data-action="view-user" data-id="'+esc(x.author_id)+'">'+name+'</button>'+
   '<time datetime="'+esc(x.created_at||'')+'">'+patiCommentAge(x.created_at)+'</time></div>'+
   '<p>'+patiMentionsHTML(x.body||'')+'</p>'+
   '<div class="comment-actions"><button type="button" data-action="question-reply-to" data-id="'+esc(x.author_id)+'">Yanıtla</button>'+
   (mine?'<button type="button" data-action="question-reply-delete" data-id="'+esc(x.id)+'">Sil</button>':
    '<button type="button" data-action="report" data-kind="reply" data-id="'+esc(x.id)+'">Bildir</button>')+
   '</div></div></div>';
 }).join('');
 modal('Yanıtlar',top+
 '<div class="comment-list pati-question-reply-list" role="list" aria-label="Soruya verilen yanıtlar">'+
 (state?.error?'<p class="pati-note" role="alert">'+esc(state.error)+'</p>':'')+
 (state?.loading?'<p class="pati-note" role="status">Yanıtlar yükleniyor…</p>':'')+
 (state?.hasMore||state?.error?'<div class="pati-load-more">'+button(state.error?'Yeniden dene':'Önceki cevapları yükle','community-replies-more','data-id="'+esc(id)+'"')+'</div>':'')+
 (entries||(!state?.loading?'<p class="pati-comments-empty">Henüz yanıt yok. İlk yanıtı sen yazabilirsin.</p>':''))+
 '</div>','reply-form');
 const form=document.getElementById('reply-form');if(!form)return;
 form.dataset.question=id;
 const dialog=form.closest('.modal');dialog?.classList.add('pati-instagram-comments','pati-question-comments');
 const backdrop=form.closest('.modal-backdrop');backdrop?.classList.add('pati-instagram-comments-backdrop');
 const footer=form.querySelector('.modal-footer');
 if(footer)footer.innerHTML='<div class="pati-comment-quick">'+['❤️','🙌','🔥','👏','🥹','😍','😂'].map(e=>'<button type="button" data-action="question-reply-emoji" data-emoji="'+e+'">'+e+'</button>').join('')+'</div>'+
 '<div class="pati-comment-editor-row"><div class="pati-comment-me">'+avatar(current(),'s')+'</div>'+
 '<textarea name="body" aria-label="Yanıt yaz" rows="1" maxlength="1000" required placeholder="Yanıt yaz..."></textarea>'+
 '<button type="submit" class="pati-comment-send">Gönder</button></div>';
 const input=footer?.querySelector('textarea[name="body"]');if(input)input.value=draft;
 const list=form.querySelector('.comment-list');if(list)list.scrollTop=scroll;
}
/* Never display a confirmed heart until Supabase has persisted and verified it.
 * One in-flight mutation per post; a concurrent bootstrap cannot overwrite the result. */
async function togglePostLike(id){
 if(!id||!me||!sb||pendingPostLikes.has(id))return;
 const post=(typeof patiFindSocialPost==='function'?patiFindSocialPost(id):data.posts?.find(x=>x.id===id));
 if(!post){notify('Gönderi yüklenemedi. Yenileyip tekrar dene.',true);return;}
 // Users may like or unlike their own posts and Reels. Message reactions are separate.
 const owner=me.id,wasLiked=liked.has(id);
 pendingPostLikes.add(id);likesChangeEpoch++;
 const buttons=[...document.querySelectorAll('[data-action="like"][data-id="'+id+'"]')];
 buttons.forEach(btn=>{btn.disabled=true;btn.setAttribute('aria-busy','true')});
 try{
  if(wasLiked){
   const out=await sb.from('post_likes').delete().eq('post_id',id).eq('user_id',owner);
   if(out.error)throw out.error;
  }else{
   const out=await sb.from('post_likes').insert({user_id:owner,post_id:id});
   // RLS grants INSERT/DELETE only. UPSERT may require an unauthorized UPDATE.
   if(out.error&&out.error.code!=='23505')throw out.error;
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
  if(savedLike&&togglePostLike.heartTargets?.has(id))window.PatiyizMotion?.heart(togglePostLike.heartTargets.get(id));
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
  togglePostLike.heartTargets?.delete(id);
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
  if(typeof patiEngagementCounts!=='undefined'&&typeof patiScheduleEngagement==='function'){patiEngagementCounts.delete(id);patiScheduleEngagement();}
  notify(stored?'Gönderi kaydedildi. Kaydettiklerim bölümünde bulabilirsin.':'Gönderi kayıtlardan kaldırıldı.');
  if(stored && window.PatiyizSavedV2 && view!=='saved-posts'){
   window.PatiyizSavedV2.choose(id,{
    data,me,saved,blocked,sb,navigate,openPost,fetchMissingSavedPosts,notify,rerender:render
   });
  }
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
 // Only private accounts need an approval RPC; public follows keep the
 // stable optimistic Reels behavior and existing zero-reflow animations.
 if(table==='follows'&&((typeof profile==='function'&&profile(keys.followee_id)?.is_private)||(typeof patiIsFollowRequested==='function'&&patiIsFollowRequested(keys.followee_id))))
  return patiSocialFollow(keys.followee_id);
 const config={post_likes:['likes','post_id',liked],post_saves:['saves','post_id',saved],follows:['follows','followee_id',followed],question_votes:['votes','question_id',voted],kb_bookmarks:['bookmarks','article_id',favorites]};
 const item=config[table],rowKey=item&&keys[item[1]];
 const isFollow=table==='follows',pendingKey=isFollow?keys.follower_id+'|'+keys.followee_id:'';
 const followRect=isFollow&&typeof document!=='undefined'?document.querySelector?.('[data-action="follow"][data-id="'+rowKey+'"]')?.getBoundingClientRect?.():null;
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
   if(typeof window!=='undefined')window.PatiyizDelight?.followConfirmed(followRect,!present);
   // Refresh server-confirmed numbers without delaying the immediate UI update.
   const id=profileId||me?.id;
   if(id&&snapshots.has(id))void syncProfileCounts(id,true);
   if(view==='follows-list')void patiLoadFollowPage(true);
   if(typeof patiFollowingState!=='undefined'){patiFollowingState.ready=false;if(view==='home'&&patiHomeTab==='following')void patiFollowingFetch(false)}
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
async function remove(table,id){
 if(table==='posts'){
  const old=patiFindSocialPost(id);
  if(!me||!old||old.author_id!==me.id)return notify('Yalnızca kendi gönderini silebilirsin.',true);
  await run(async()=>{
   const owner=me.id;
   const r=await sb.from('posts').delete().eq('id',id).eq('author_id',owner).select('id');
   if(r.error)throw r.error;
   if(!r.data?.length)throw Error('Gönderi silinemedi veya silme iznin yok.');
   if(me?.id!==owner)return;
   data.posts=data.posts.filter(p=>p.id!==id);
   data.reposts=data.reposts.filter(p=>p.post_id!==id);
   data.pins=data.pins.filter(p=>p.post_id!==id);
   profileCountCache.delete(owner);
   const fromDetail=selectedPostId===id;
   if(fromDetail){selectedPostId='';patiDetailState=null;profileId=owner;view='profile'}
   closeModal(true);render();
   try{await deleteOwnedMedia(old)}catch(e){console.warn('Gönderi medya temizliği:',e)}
   try{await refresh()}catch(e){console.warn('Silme sonrası yenileme:',e)}
  },'Gönderi silindi.');
  return;
 }
 if(!confirm('Bu kaydı silmek istediğine emin misin?'))return;
 await run(async()=>{const r=await sb.from(table).delete().eq('id',id).select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error('Kayıt silinemedi veya izin yok.');await refresh()},'Silindi');
}
async function save(table,record,id){if(table==='posts')profileCountCache.delete(me.id);let r=id?await sb.from(table).update(record).eq('id',id).select('*'):await sb.from(table).insert(record).select('*');if(r.error)throw r.error;if(!r.data?.length)throw Error('Kayıt doğrulanamadı. İşlemi yeniden dene veya hesap izinlerini kontrol et.');closeModal(true);try{await refresh()}catch(refreshError){console.warn('Kayıt oluşturuldu, yenileme başarısız:',refreshError.message)}notify(({posts:id?'Paylaşım güncellendi.':'Paylaşım yayınlandı.',lost_reports:'Kayıp ilanı oluşturuldu.',care_tasks:id?'Bakım görevi güncellendi.':'Bakım görevi eklendi.',profiles:'Profil güncellendi.',pets:id?'Hayvan profili güncellendi.':'Hayvan profili eklendi.',adoption_listings:id?'Sahiplendirme ilanı güncellendi.':'Sahiplendirme ilanı yayınlandı.',comments:'Yorum yayınlandı.',replies:'Cevap yayınlandı.'})[table]||'İşlem kaydedildi.');return r.data[0]}
function processClick(e){const video=e.target.closest('.pati-post-video');if(video&&!e.target.closest('button')){
 const reelCard=video.closest('.pati-feed-reel-card');
 if(reelCard?.dataset?.postId){patiOpenFeedReel(reelCard.dataset.postId);return;}
 if(video.paused){delete video.dataset.userPaused;document.querySelectorAll('#main-content .pati-post-video').forEach(other=>{if(other!==video)other.pause()});patiyizFeedActiveVideo=video;video.play().catch(()=>{});}else{video.dataset.userPaused='1';video.pause();}return;}let target=e.target.closest('[data-view],[data-action]');if(!target)return;let v=target.dataset.view;if(v){patiInsightsClose();closePatiCreate();profileId='';selectedPostId='';if(v==='messages')mobileChatOpen=false;closeModal();navigate(v);return}let act=target.dataset.action,id=target.dataset.id;switch(act){
case 'dm-receipts-toggle':run(async()=>{
 const button=target;button.disabled=true;
 try{
 const user=me.id,next=!patiDmReadReceiptsEnabled();
 const r=await sb.from('profiles').update({read_receipts_enabled:next}).eq('id',user).select('read_receipts_enabled').single();
 if(r.error)throw r.error;
 if(me?.id!==user)return;
 const p=data.profiles.find(x=>x.id===user);if(p)p.read_receipts_enabled=r.data.read_receipts_enabled;
 render();
 }finally{button.disabled=false}
},'Görüldü tercihin kaydedildi.');break;case 'pati-streak-refresh':patiStreakGoalState.error='';void patiStreakGoalLoad();break;case 'pati-streak-goal':{const target=Number(id);if([3,7,14,30].includes(target))void patiStreakGoalLoad(target);break;}case 'pati-streak-collect':{const target=Number(id);if([3,7,14,30].includes(target))void patiStreakClaim(target);break;}case 'pati-streak-60-claim':void patiStreak60Claim();break;case 'pati-streak-60-refresh':void patiStreak60Load();break;case 'pati-streak-back':patiGoBack();break;case 'paticoin-claim':patiCoinSync(true);break;case 'pati-weekly-refresh':void patiWeeklyRefresh(true);break;case 'paticoin-refresh':void patiCoinSync(false);break;case 'paticoin-invite-redeem':void patiInviteRedeem();break;case 'paticoin-invite-share':patiInviteShare();break;case 'paticoin-shop':navigate('shop');break;case 'paticoin-shop-filter':{if(['all','available','budget','food','supply','donation'].includes(id)){patiShopFilter=id;patiShopPage()}break}case 'paticoin-rewards':navigate('rewards');break;case 'saved-posts':navigate('saved-posts');break;case 'paticoin-buy':patiCoinShowCheckout(id);break;case 'paticoin-confirm':patiCoinConfirm();break;case 'hashtag':navigate('explore');search='#'+(id||'');render();break;case 'pati-create-open':openPatiCreate();break;case 'pati-onboarding-dismiss':patiDismissOnboarding();break;case 'pati-feed-open-reel':patiOpenFeedReel(id);break;case 'reel-speed':{const v=target.closest('.pati-reel-item')?.querySelector('video');if(v){const rates=[1,1.25,1.5,2,.75],i=rates.indexOf(v.playbackRate);v.playbackRate=rates[(i+1)%rates.length];const label=target.querySelector('.pati-reel-tool-label');if(label)label.textContent=v.playbackRate+'×';target.setAttribute('aria-label','Oynatma hızı '+v.playbackRate+'×')}break}case 'reels-more':void patiLoadMoreReels();break;case 'reel-play':reelHandleTap(target);break;case 'reel-sound':reelToggleSound(target);break;
 case 'reel-seek':break;case 'pati-media-gallery':openComposerMediaPicker('gallery');break;case 'pati-dm-gallery-open':document.querySelector('#message-form input[name="dm_gallery"]')?.click();break;case 'pati-media-video':{const f=document.getElementById('post-form');const file=f?.querySelector('input[name="video"]');if(file){file.removeAttribute('capture');file.click()}break}case 'pati-media-camera':openComposerMediaPicker('camera');break;case 'pati-draft-save':draftSave();break;case 'pati-draft-load':draftRestore();break;case 'pati-media-select':{postCropIndex=Number(id)||0;updatePostMediaPreview();if(postCropRatio!=='original')void drawPostCrop();break}
case 'pati-media-prev':case 'pati-media-next':case 'pati-media-remove':patiComposerReorder(target.dataset.kind,Number(id),act==='pati-media-prev'?-1:1,act==='pati-media-remove');break;case 'pati-story-gallery':document.querySelector('#story-form input[name="story_gallery"]')?.click();break;case 'pati-story-camera':document.querySelector('#story-form input[name="story_camera"]')?.click();break;case 'pati-create-close':closePatiCreate();break;case 'pati-create-post':closePatiCreate();startPatiCameraPost();break;case 'pati-create-text':closePatiCreate();compose(null,'text',false);break;case 'pati-create-story':closePatiCreate();startPatiCameraStory();break;case 'pati-create-reels':closePatiCreate();startPatiCameraReels();break;case 'pati-create-question':closePatiCreate();navigate('community');composeQuestion();break;case 'story-close':closeStory();break;case 'story-sound':{const video=document.querySelector('#story-overlay .story-big-video');if(video){patiyizStorySoundEnabled=video.muted;video.muted=!patiyizStorySoundEnabled;target.textContent=video.muted?'Ses aç':'Ses kapat';target.setAttribute('aria-label',video.muted?'Hikâye sesini aç':'Hikâye sesini kapat');if(!video.muted)video.play().catch(e=>{video.muted=true;target.textContent='Ses aç';target.setAttribute('aria-label','Hikâye sesini aç');console.warn('Hikâye sesi tarayıcı tarafından engellendi:',e?.message||e)})}break}case 'story-poll':run(async()=>{if(data.storyResponses.some(x=>x.story_id===id&&x.user_id===me.id&&x.kind==='poll'))throw Error('Bu ankete zaten oy verdin.');const result=await sb.from('patiyiz_story_responses').insert({story_id:id,user_id:me.id,kind:'poll',option_index:Number(target.dataset.index)});if(result.error)throw result.error;data.storyResponses.push({story_id:id,user_id:me.id,kind:'poll',option_index:Number(target.dataset.index)})},'Oyun kaydedildi.');break;case 'story-question':{const x=storyItems.find(x=>x.id===id);if(x){clearTimeout(storyTimer);storyTimer=null;modal('Hikâye sorusuna yanıt',textField('response','Yanıtın','',true,220),'story-answer-form');document.getElementById('story-answer-form').dataset.story=id}break}case 'story-emoji':run(async()=>{if(data.storyResponses.some(x=>x.story_id===id&&x.user_id===me.id&&x.kind==='emoji'))throw Error('Bu hikâyeye zaten tepki verdin.');const result=await sb.from('patiyiz_story_responses').insert({story_id:id,user_id:me.id,kind:'emoji',response:'🐾'});if(result.error)throw result.error;data.storyResponses.push({story_id:id,user_id:me.id,kind:'emoji',response:'🐾'})},'Tepki gönderildi.');break;case 'story-like':toggleStoryLike(id);break;case 'story-viewers':showStoryViewers();break;case 'story-viewer-profile':{if(!id||blocked.has(id))break;closeStory(false);lastDetailView=view;followReturnList=false;profileId=id;navigate('profile');break;}case 'story-viewer-chat':{if(!id||id===me.id||blocked.has(id))break;closeStory(false);patiActiveGroupId='';patiGroupLiveStop();patiDmOpenAtLatest(id);personId=id;mobileChatOpen=true;navigate('messages');break;}case 'story-viewers-close':{patiStopStoryActivityRefresh();const el=document.getElementById('story-viewers-sheet');if(el)el.hidden=true;document.getElementById('story-overlay')?.classList.remove('pati-story-viewers-open');document.querySelector('#story-overlay .story-big-video')?.play?.()?.catch?.(()=>{});clearTimeout(storyTimer);if(storyItems.length)storyTimer=setTimeout(()=>stepStory(1),storyItems[storyIndex]?.video_url?15000:6000);break}case 'story-create':startPatiCameraStory();break;case 'story-create-highlight':newHighlightAlbum();break;case 'story-highlight-choose':chooseStoryHighlight(id);break;case 'story-highlight-new':newHighlightAlbum(id);break;case 'story-highlight-album':run(()=>addStoryToHighlightAlbum(target.dataset.story,id));break;case 'story-view':openStory(id);break;case 'story-highlights':openHighlights(id);break;case 'highlight-album-open':openHighlightAlbum(id);break;case 'highlight-album-new':newHighlightAlbum();break;case 'highlight-album-manage':manageHighlightAlbums();break;case 'highlight-album-delete':if(confirm('Bu albüm silinsin mi? Hikâyelerin silinmeyecek.'))run(async()=>{const out=await sb.from('patiyiz_highlight_albums').delete().eq('id',id).eq('owner_id',me.id);if(out.error)throw out.error;closeModal(true);await refresh()},'Albüm silindi.');break;case 'highlight-album-add':{const stories=data.stories.filter(x=>x.author_id===me.id&&x.is_highlight);if(!stories.length){notify('Önce bir hikâyeyi kalıcı olarak sabitle.',true);break}modal('Albüme hikâye ekle','<div class="pati-field"><label>Hikâyeyi seç</label><select name="story_id">'+stories.map(x=>'<option value="'+esc(x.id)+'">'+esc(cut(x.caption||day(x.created_at),65))+'</option>').join('')+'</select></div>','highlight-album-add-form');document.getElementById('highlight-album-add-form').dataset.album=id;break}case 'story-highlight-open':openHighlightStory(id);break;case 'story-pet-highlight':openPetHighlight(id);break;case 'pati-task-follow':exploreTab='users';navigate('explore');break;case 'story-prev':stepStory(-1);break;case 'story-next':stepStory(1);break;case 'story-delete':if(confirm('Hikâyeni silmek istiyor musun?'))run(async()=>{const original=data.stories.find(x=>x.id===id&&x.author_id===me.id);const r=await sb.from('patiyiz_stories').delete().eq('id',id).eq('author_id',me.id).select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error('Hikâye silinemedi.');closeStory();await refresh();if(original?.private_image_path){const paths=[original.private_image_path,original.private_video_path].filter(Boolean);const cleanup=await sb.storage.from('patiyiz-close-stories').remove(paths);if(cleanup.error)console.warn('Özel hikâye dosyaları silinemedi:',cleanup.error.message)}else if(original&&!original.shared_post_id)await deleteOwnedMedia(original)},'Hikâye silindi.');break;case 'verification-request':{const meProfile=current();if(meProfile.is_verified){notify('Hesabın zaten doğrulanmış.');break}run(async()=>{const r=await sb.from('verification_requests').select('status').eq('user_id',me.id).eq('status','pending').limit(1);if(r.error)throw r.error;if(r.data?.length){notify('Mavi tik talebin inceleme bekliyor.');return}modal('Mavi tik talebi',textField('note','Doğrulama gerekçen (isteğe bağlı)','',false,500),'verification-request-form')});break}case 'open-admin':if(isAdmin){window.location.href='admin.html'}else notify('Yönetici yetkisi doğrulanamadı.',true);break;case 'close':if(e.target.classList.contains('modal-backdrop')||target.tagName==='BUTTON')closeModal();break;case 'home-retry':run(()=>refresh());break;case 'load-more':if(['posts','messages','notifications'].includes(id))run(()=>loadMore(id));break;case 'compose':if(view==='community')composeQuestion();else if(view==='care')composeCare();else if(view==='lost')composeLost();else if(view==='adoption')composeAdoption();else if(view==='home'||view==='profile')startPatiCameraPost();break;case 'question':composeQuestion();break;case 'community-more':void patiLoadCommunity();break;case 'community-replies-more':void patiLoadQuestionReplies(id,true);break;case 'community-filter':communityCategory=id;render();void patiLoadCommunity(true);break;case 'pati-care-day':patiCareSelectedDate=patiCareSelectedDate===id?'':id;patiCareMonth=id.slice(0,7);careFilter='all';carePage();break;
case 'pati-care-clear-day':patiCareSelectedDate='';careFilter='all';carePage();break;
case 'pati-care-month':{
 const month=/^\d{4}-\d{2}$/.test(patiCareMonth)?patiCareMonth:careToday().slice(0,7);
 const [y,m]=month.split('-').map(Number),next=new Date(y,m-1+(Number(id)===-1?-1:1),1);
 patiCareMonth=next.toLocaleDateString('sv-SE').slice(0,7);
 patiCareSelectedDate='';carePage();break;
}case 'care-filter':patiCareSelectedDate='';careFilter=id;carePage();break;
case 'care-pet-filter':carePetFilter=id;carePage();break;
case 'care-category':careCategoryFilter=id;carePage();break;
case 'care-clear':careSearch='';carePage();document.getElementById('care-search')?.focus();break;
case 'care-reset':patiCareSelectedDate='';careFilter='all';carePetFilter='all';careCategoryFilter='Tümü';careSearch='';carePage();break;
case 'care-refresh':void careRefresh();break;case 'pati-care-quick':{if(['vaccine','vet','medicine','food'].includes(id))patiWellnessReminderDialog(null,id);break;}
case 'care-edit':{const item=data.care.find(x=>x.id===id&&x.owner_id===me.id);if(item)composeCare(item);break;}case 'lost-add':composeLost();break;case 'adoption-add':composeAdoption();break;case 'adoption-edit':{const a=data.adoption.find(x=>x.id===id&&x.owner_id===me.id);if(a)composeAdoption(a);break}case 'adoption-toggle':{const a=data.adoption.find(x=>x.id===id&&x.owner_id===me.id);if(!a)break;const adopted=!a.adopted;
 if(!confirm(adopted?'Bu hayvan sahiplendirildi mi? İlan tamamlandı olarak görünecek.':'İlanı tekrar yuva arıyor durumuna almak istiyor musun?'))break;
 run(async()=>{const r=await sb.from('adoption_listings').update({adopted}).eq('id',id).eq('owner_id',me.id).select('*');
 if(r.error)throw r.error;if(!r.data?.length)throw Error('İlan güncellenemedi veya yetkin yok.');
 data.adoption=data.adoption.map(x=>x.id===id?r.data[0]:x);if(view==='adoption')adoptionPage();
 },adopted?'İlan sahiplendirildi olarak işaretlendi.':'İlan yeniden yayına alındı.');break}case 'adoption-delete':remove('adoption_listings',id);break;case 'care-add':composeCare();break;case 'wellness-open':patiMyPetTab='wellness';navigate('my-pet');break;case 'pati-health-back':patiHealthLanding=true;render();break;case 'pati-health-action':patiHealthLanding=false;patiHealthTopic=id;patiWellnessTab='active';render();if(id==='weight')requestAnimationFrame(()=>document.querySelector('.pati-wellness-weights')?.scrollIntoView({block:'start'}));break;case 'pati-hub-select-pet':patiHubSelectedPetId=id;patiWellnessPetId=id;render();break;case 'pati-my-pet-tab':{if(['hub','care','wellness','own-pets'].includes(id)){patiMyPetTab=id;if(id==='wellness')patiHealthLanding=true;render()}break}case 'wellness-reminder-add':patiWellnessReminderDialog();break;case 'wellness-weight-add':patiWellnessWeightDialog();break;case 'wellness-pet':patiWellnessPetId=id;patiHubSelectedPetId=id;render();break;
case 'wellness-filter':patiWellnessTab=id;render();break;
case 'wellness-refresh':patiWellness.error='';void patiWellnessFetch();break;
case 'wellness-reminder-edit':{const item=patiWellness.reminders.find(x=>x.id===id&&!x.completed_at&&patiWellnessOwnedPets().some(p=>p.id===x.pet_id));if(item)patiWellnessReminderDialog(item);break;}
case 'wellness-weight-edit':{const item=patiWellness.weights.find(x=>x.id===id&&patiWellnessOwnedPets().some(p=>p.id===x.pet_id));if(item)patiWellnessWeightDialog(item);break;}
case 'wellness-reminder-done':void patiWellnessToggle(id);break;case 'wellness-reminder-delete':void patiWellnessDelete('patiyiz_pet_reminders',id);break;case 'wellness-weight-delete':void patiWellnessDelete('patiyiz_pet_weights',id);break;case 'profile-posts-tab':patiInsightsClose();profilePostsTab=id;render();break;case 'profile-open-post':{const selected=patiFindSocialPost(id);if(profilePostsTab==='media'&&selected&&!(selected.image_url||selected.images?.length||selected.video_url||selected.media_videos?.length))profilePostsTab='text';openPost(id);break;}case 'profile-pet-details':{const pet=data.pets.find(x=>x.id===id);if(pet)modal(pet.name,'<p>'+esc(pet.species||'')+' · '+esc(pet.breed||'')+'</p><p>'+esc(pet.personality||'')+'</p>','profile-pet-details-form');break;}case 'profile-share':{const u=location.origin+location.pathname; if(navigator.share){navigator.share({title:'Patiyiz profilim',url:u}).catch(()=>{});}else if(navigator.clipboard){navigator.clipboard.writeText(u).then(()=>notify('Patiyiz bağlantısı kopyalandı.')).catch(()=>notify('Bağlantı kopyalanamadı.',true));}break;}case 'edit-profile':editProfile();break;case 'pet-add':editPet();break;case 'pet-edit':{const pet=data.pets.find(p=>p.id===id);
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
case 'my-profile':profileId='';lastDetailView='';navigate('profile');break;case 'view-user':patiOpenProfileOnly(id);break;case 'pati-page-back':case 'pati-global-back':patiGoBack();break;case 'profile-back':{const dest=lastDetailView&&allowed.includes(lastDetailView)?lastDetailView:'explore';lastDetailView='';profileId='';followReturnList=false;navigate(dest);break}case 'open-notification':if(target.closest('#tools-form'))closeModal(true);openNotification(id);break;case 'post-back':{
 const detail=patiDetailState;patiDetailState=null;selectedPostId='';
 const returnPeer=patiDmSharedReturnPeer;patiDmSharedReturnPeer='';const back=returnPeer?'messages':detail?.origin||(patiExploreReturnTo?'explore':'home');if(returnPeer){personId=returnPeer;mobileChatOpen=true}patiExploreReturnTo=false;
 if(detail?.origin==='profile'){profileId=detail.profileId;profilePostsTab=detail.profilePostsTab}
 navigate(back);
 if(detail)requestAnimationFrame(()=>window.scrollTo({top:detail.returnScroll||0,behavior:'instant'}));
 break}case 'open-knowledge':navigate('knowledge');break;case 'health-add-pet':navigate('pets');break;
case 'education-exit':educationLesson='';educationCategory='Tümü';navigate('home');break;
case 'education-open':{if(!educationCanOpen(id)){notify('Önce önceki dersi tamamla. 🔒',true);break}educationBackScroll=window.scrollY||0;educationLesson=id;educationCategory=patiyizLessons.find(l=>l.id===id)?.cat||educationCategory;educationRemember(id);render();window.scrollTo(0,0);break;}case 'education-back':educationLesson='';render();requestAnimationFrame(()=>window.scrollTo(0,educationBackScroll));break;case 'education-next':case 'education-previous':{if(!educationCanOpen(id)){notify('Bu ders henüz kilitli. Önce mevcut dersi bitir.',true);break}educationLesson=id;educationCategory=patiyizLessons.find(l=>l.id===id)?.cat||educationCategory;educationRemember(id);window.scrollTo(0,0);render();break;}case 'education-continue':{if(!educationCanOpen(id)){notify('Bu ders henüz kilitli.',true);break}educationBackScroll=window.scrollY||0;educationLesson=id;educationCategory=patiyizLessons.find(l=>l.id===id)?.cat||educationCategory;educationRemember(id);window.scrollTo(0,0);render();break;}case 'education-status':educationStatus=id;render();break;case 'pati-academy-home':educationCategory='Tümü';educationSearch='';educationStatus='Tümü';patiAcademyBrowseAll=false;render();break;case 'pati-academy-search-open':patiAcademyBrowseAll=true;render();document.getElementById('pati-academy-search')?.focus();break;case 'education-filter':if(id!=='Tümü'&&!patiyizLessons.some(l=>l.cat===id))break;educationCategory=id;educationLesson='';educationSearch='';educationStatus='Tümü';render();break;case 'education-clear':educationSearch='';educationUpdateResults();document.getElementById('pati-academy-search')?.focus();break;case 'education-reset':educationSearch='';educationCategory='Tümü';educationStatus='Tümü';render();break;case 'education-answer':{const l=patiyizLessons.find(x=>x.id===id);if(l&&educationLesson===id&&educationCanOpen(id)&&!educationDone().has(id)){if(window.PatiyizLessonWorkshop&&!window.PatiyizLessonWorkshop.ready(id,me?.id)){notify('Mini sınav için önce 10 dakika aktif çalışma süresini tamamla.',true);break;}educationAnswer[id]=Number(target.dataset.choice);const succeeded=educationAnswer[id]===l.answer;if(succeeded)educationMark(id);render();if(succeeded)window.PatiyizDelight?.lessonCompleted()}break;}case 'kb-read':kbListScroll=window.scrollY||0;articleId=id;render();window.scrollTo(0,0);break;case 'knowledge-back':articleId='';render();requestAnimationFrame(()=>window.scrollTo(0,kbListScroll));break;case 'pati-kb-home':kbCategory='Tümü';kbFilter='Tümü';kbSearch='';patiKbBrowseAll=false;render();break;case 'pati-kb-search-open':patiKbBrowseAll=true;render();document.getElementById('kb-search')?.focus();break;case 'kb-filter':kbFilter=id;render();break;case 'kb-category':kbCategory=id;render();break;case 'kb-clear':kbSearch='';render();document.getElementById('kb-search')?.focus();break;case 'kb-reset':kbFilter='Tümü';kbCategory='Tümü';kbSearch='';render();break;case 'kb-search':kbSearch=$('#kb-search')?.value||'';kbUpdateResults();break;case 'explore-more':void patiExploreLoadMedia();break;case 'explore-sort':{if(['popular','views','likes','recent'].includes(id)&&patiExploreSort!==id){patiExploreSort=id;explorePage();void patiExploreLoadMedia(true)}break}case 'explore-search-retry':void patiExploreLookup(search);break;case 'explore-open-post':openPost(id);break;case 'pati-search-open':search='';exploreTab='users';explorePage();requestAnimationFrame(()=>document.getElementById('explore-search')?.focus());void patiExploreLookup('');break;case 'pati-search-cancel':search='';exploreTab='media';explorePage();break;case 'pati-search-discover':exploreTab='media';search='';explorePage();break;case 'explore-tab':exploreTab=id;render();break;case 'explore-animal':exploreAnimal=id;render();break;case 'explore-sort':exploreSort=exploreSort==='latest'?'popular':exploreSort==='popular'?'recommended':'latest';render();break;case 'explore-search':search=$('#explore-search')?.value||'';render();break;case 'lost-search':lostSearch=$('#lost-search')?.value||'';lostUpdateResults();break;
case 'pati-lost-open':patiLostDetailId=id;render();window.scrollTo(0,0);break;case 'pati-lost-back':patiLostDetailId='';render();break;case 'pati-adoption-open':patiAdoptionDetailId=id;render();window.scrollTo(0,0);break;case 'pati-adoption-back':patiAdoptionDetailId='';render();break;case 'lost-status':lostStatus=id;lostPage();break;
case 'lost-species':lostSpecies=id;lostPage();break;
case 'lost-clear':lostSearch='';lostPage();document.getElementById('lost-search')?.focus();break;
case 'lost-reset':lostSearch='';lostStatus='missing';lostSpecies='Tümü';lostPage();break;
case 'lost-refresh':void lostRefresh();break;case 'lost-city-alert-toggle':void patiLostAlertToggle();break;
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
case 'dm-delete-thread':run(()=>patiDmDeleteConversation(id));break;
case 'pati-close-friends-open':void patiCloseFriendsPicker().catch(e=>notify(friendly(e),true));break;
case 'pati-close-friend-toggle':run(()=>patiCloseFriendToggle(id));break;
case 'pati-group-list':void patiGroupList().catch(e=>notify(friendly(e),true));break;
case 'pati-group-create-open':patiGroupCreateDialog();break;
case 'pati-group-open':void patiGroupOpen(id).catch(e=>notify(friendly(e),true));break;
case 'pati-group-members':void patiGroupMembersDialog(id).catch(e=>notify(friendly(e),true));break;
case 'pati-group-role':run(async()=>{const r=await sb.rpc('patiyiz_group_set_role',{p_group:id,p_member:target.dataset.peer,p_role:target.dataset.role});if(r.error)throw r.error;await patiGroupMembersDialog(id);},'Grup yöneticisi güncellendi.');break;
case 'pati-group-delete-message':run(async()=>{
 const group=target.dataset.groupId,owner=me.id;
 const out=await sb.from('patiyiz_group_messages').delete().eq('id',id).eq('group_id',group).eq('sender_id',owner).select('id');
 if(out.error)throw out.error;
 if(!out.data?.length)throw Error('Bu mesaj silinemedi.');
 await patiGroupRefreshActive(group,true);
 void patiGroupFetchInbox(true);
},'Mesaj silindi.');break;
case 'pati-group-add-open':void patiGroupAddDialog(id).catch(e=>notify(friendly(e),true));break;
case 'pati-group-add-member':run(async()=>{const out=await sb.rpc('patiyiz_group_add_member',{p_group:id,p_user:target.dataset.peer});if(out.error)throw out.error;await patiGroupMembersDialog(id)});break;
case 'pati-group-delete-check':case 'pati-group-delete':run(async()=>{await patiGroupDeletePermanent(id)});break;
case 'pati-group-remove':run(async()=>{
 const peer=target.dataset.peer;
 const out=await sb.rpc('patiyiz_group_remove_member',{p_group:id,p_user:peer});
 if(out.error)throw out.error;
 if(peer===me.id){patiGroupChatState={owner:'',id:'',group:null,members:[],rows:[],ready:false,error:''};await patiGroupList()}else await patiGroupMembersDialog(id);
});break;
case 'dm-search-open':patiDmSearchOpen(id||personId);break;
case 'dm-schedule-open':patiDmScheduleOpen(id||personId);break;
case 'dm-scheduled-list':void patiDmScheduledList(id||personId).catch(e=>notify(friendly(e),true));break;
case 'dm-scheduled-cancel':run(async()=>{
 const r=await sb.from('patiyiz_scheduled_messages').delete().eq('id',id).eq('sender_id',me.id).eq('status','pending').select('id');
 if(r.error)throw r.error;
 if(!r.data?.length)throw Error('Mesaj zaten gönderilmiş veya iptal edilmiş.');
 await patiDmScheduledList(target.dataset.peer);
},'Zamanlanan mesaj iptal edildi.');break;
case 'dm-search-jump':run(()=>patiDmSearchJump(target.dataset.peer,id));break;
case 'dm-theme-open':patiDmThemeDialog(id||personId);break;
case 'dm-theme-set':run(()=>patiDmThemeSet(target.dataset.peer,id));break;
case 'dm-sticker-open':patiDmStickerDialog(personId);break;
case 'dm-gif-open':document.querySelector('#message-form input[name="dm_gif"]')?.click();break;
case 'dm-sticker-send':run(async()=>{
 const peer=target.dataset.peer,body=target.dataset.emoji;
 if(!PATI_DM_STICKERS.includes(body)||!peer||!me||blocked.has(peer))throw Error('Çıkartma gönderilemedi.');
 const r=await sb.from('messages').insert({sender_id:me.id,receiver_id:peer,body}).select('*').single();
 if(r.error)throw r.error;
 if(!data.messages.some(m=>m.id===r.data.id))data.messages.push(r.data);
 closeModal(true);if(view==='messages')render();
},'Çıkartma gönderildi.');break;
case 'pati-follower-cash-claim':run(async()=>{
 const threshold=Number(id);
 if(![10000,50000,100000].includes(threshold))throw Error('Geçersiz ödül hedefi.');
 if(!confirm(threshold.toLocaleString('tr-TR')+' takipçi nakit ödülü için başvuru oluşturulsun mu? Ödeme doğrulama ve inceleme sonrasında gerçekleşir.'))return;
 const owner=me.id;
 const response=await sb.rpc('patiyiz_claim_cash_milestone',{p_threshold:threshold});
 if(response.error)throw response.error;
 if(me?.id!==owner)return;
 const r=await sb.from('patiyiz_follower_cash_claims').select('threshold,amount_try,status,created_at').eq('user_id',owner);
 if(r.error)throw r.error;
 patiFollowerRewardState.cash=r.data||[];
 if(view==='rewards')render();
 notify('Nakit ödül başvurun alındı; doğrulama ve onay bekliyor.');
});break;
case 'dm-request-accept':run(()=>patiDmAcceptRequest(id));break;
case 'dm-thread-older':void patiDmLoadThread(personId,true);break;
case 'chat':if(!id||id===me.id)return notify('Kendine mesaj gönderemezsin.',true);patiActiveGroupId='';patiGroupLiveStop();closeModal(true);patiDmOpenAtLatest(id);personId=id;mobileChatOpen=true;navigate('messages');break;case 'open-unread-chat':{patiActiveGroupId='';patiGroupLiveStop();const source=unreadMessageSources().find(x=>x.id===id)||unreadMessageSources()[0];if(!source)break;closeModal();patiDmPendingLatestPeer=source.id;personId=source.id;mobileChatOpen=true;navigate('messages');break}case 'dm-tab':if(!['primary','requests','general'].includes(id))break;chatFilter=id;personId='';if(id!=='primary'){patiActiveGroupId='';patiGroupLiveStop()}mobileChatOpen=false;render();break;case 'post-crop-next':case 'post-crop-prev':{const files=document.querySelector('#post-form input[name="photo"]')?.files;if(files?.length){postCropIndex=(postCropIndex+(act==='post-crop-next'?1:-1)+files.length)%files.length;drawPostCrop()}break}case 'post-ratio':{postCropRatio=id;postCropX=.5;postCropY=.5;document.querySelectorAll('.pati-ratio-options button').forEach(b=>b.classList.toggle('active',b.dataset.id===id));const f=document.querySelector('#post-form input[name="aspect"]');if(f)f.value=id;updatePostMediaPreview();if(id==='original'){const crop=document.querySelector('.pati-crop-preview');if(crop)crop.hidden=true}else if(!document.querySelector('.pati-crop-preview')?.hidden)void drawPostCrop();break}case 'post-crop-open':void patiCropOpen();break;case 'carousel-prev':case 'carousel-next':{const root=target.closest('.pati-carousel'),track=root?.querySelector('.pati-carousel-track');if(track){const delta=track.clientWidth*(act==='carousel-next'?1:-1);track.scrollBy({left:delta,behavior:'smooth'})}break}case 'video-sound':{const v=target.parentElement?.querySelector('video');if(v){
 patiyizFeedSoundEnabled=v.muted;
 v.muted=!patiyizFeedSoundEnabled;
 patiFeedSoundButton(v);
 if(!v.muted){document.querySelectorAll('#main-content .pati-post-video').forEach(other=>{if(other!==v)other.pause()});patiyizFeedActiveVideo=v;v.play().catch(err=>{v.muted=true;patiFeedSoundButton(v);console.warn('Akış sesi açılamadı:',err?.message||err)})}
 }break;}case 'dm-record':run(()=>startDmRecord());break;case 'dm-record-stop':if(dmRecorder?.state==='recording')dmRecorder.stop();break;case 'dm-record-cancel':dmCancel=true;if(dmRecorder?.state==='recording')dmRecorder.stop();break;case 'dm-exit':patiDmTypingInput('');mobileChatOpen=false;patiDmDisconnectTyping();navigate(patiDmReturnView&&patiDmReturnView!=='messages'?patiDmReturnView:'home');break;case 'chat-back':patiDmTypingInput('');mobileChatOpen=false;patiDmDisconnectTyping();render();break;case 'dm-message-pin':run(()=>patiDmPinSave(id),'Mesaj sabitlendi.');break;
case 'dm-message-unpin':run(()=>patiDmPinRemove(id),'Sabitlenen mesaj kaldırıldı.');break;
case 'dm-pin-jump':patiDmPinJump(id);break;
case 'dm-image-open':patiDmOpenPhoto(id);break;
case 'dm-react-open':patiDmOpenReactionPicker(id);break;
case 'dm-react-set':{const emoji=target.dataset.emoji||'';closeModal(true);run(()=>patiDmSetReaction(id,emoji));break;}
case 'dm-reply-jump':run(()=>patiDmSearchJump(personId,id,'reply'));break;
case 'dm-reply-cancel':{const f=document.getElementById('message-form');if(f){delete f.dataset.reply;const box=f.querySelector('.pati-dm-reply-compose');if(box)box.hidden=true;const input=f.querySelector('input[name="body"]');if(input)input.placeholder='Mesaj yaz...'}break}
case 'dm-hide-for-me':{
 const m=patiDmFindMessage(id);
 if(!m||!me||!((m.sender_id===me.id&&m.receiver_id===personId)||(m.receiver_id===me.id&&m.sender_id===personId)))break;
 if(!confirm('Mesaj yalnızca senin sohbetinden silinsin mi?'))break;
 run(async()=>{
  const owner=me.id;
  const result=await sb.from('message_hidden').insert({user_id:owner,message_id:id}).select('user_id,message_id');
  if(result.error&&result.error.code!=='23505')throw result.error;
  if(me?.id!==owner)return;
  if(!data.messageHidden.some(x=>x.user_id===owner&&x.message_id===id))
   data.messageHidden.push({user_id:owner,message_id:id});
  render();
 },'Mesaj yalnızca senden silindi.');
 break;
}
case 'dm-context-copy':{const m=patiDmFindMessage(id);if(!m||!me||!((m.sender_id===me.id&&m.receiver_id===personId)||(m.receiver_id===me.id&&m.sender_id===personId)))break;const value=String(m.body||'');if(value){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>notify('Mesaj kopyalandı.'),()=>notify('Mesaj kopyalanamadı.',true));else notify('Bu cihazda kopyalama kullanılamıyor.',true);}break;}
case 'dm-reply':patiDmBeginReply(id);break;case 'dm-edit':{const m=patiDmFindMessage(id);if(m?.sender_id!==me.id)break;if(!m||m.attachment_path)break;modal('Mesajı düzenle',textField('body','Mesaj',m.body,true,1000),'dm-edit-form');document.getElementById('dm-edit-form').dataset.message=id;break}case 'message-delete':{
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
  if(typeof patiDmPinState!=='undefined'){for(const [peer,pinned] of patiDmPinState.byPeer)if(pinned===m.id)patiDmPinState.byPeer.delete(peer);patiDmPinState.details.delete(m.id)}
  data.messageHidden=data.messageHidden.filter(x=>x.message_id!==m.id);
  render();
 },'Mesaj iki tarafın sohbetinden silindi.');
 break;
}case 'comment':showComments(id);void patiFetchPostComments(id);break;case 'comment-more':void patiFetchPostComments(id,true);break;case 'question-reply-emoji':{const ta=document.querySelector('#reply-form textarea[name="body"]');if(ta){ta.value+=target.dataset.emoji||'';ta.focus()}break;}case 'question-reply-to':{
 const form=document.getElementById('reply-form'),input=form?.querySelector('textarea[name="body"]');
 if(input){const person=profile(id),handle=String(person.handle||'').trim();
  const prefix=handle?'@'+handle+' ':'';
  if(prefix&&!input.value.includes(prefix))input.value=(input.value.trim()?input.value.trim()+' ':'')+prefix;
  input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);
 }break;
}case 'question-reply-delete':{
 const form=document.getElementById('reply-form'),questionId=form?.dataset.question;
 const row=(patiCommunityReplyPages.get(me.id+':'+questionId)?.rows||data.replies).find(r=>r.id===id&&r.question_id===questionId);
 if(!row||row.author_id!==me.id||!confirm('Yanıtın silinsin mi?'))break;
 run(async()=>{
  const result=await sb.from('replies').delete().eq('id',id).eq('author_id',me.id).select('id');
  if(result.error)throw result.error;
  if(!result.data?.length)throw Error('Bu yanıtı silme yetkin yok.');
  data.replies=data.replies.filter(r=>r.id!==id);
  const state=patiCommunityReplyPages.get(me.id+':'+questionId);
  if(state){state.rows=state.rows.filter(r=>r.id!==id);state.offset=Math.max(0,state.offset-1);}
  questionReplies(questionId);
 },'Yanıt silindi.');break;
}case 'comment-emoji':{const ta=document.querySelector('#comment-form textarea[name="body"]');if(ta){ta.value+=target.dataset.emoji||'';ta.focus()}break;}case 'comment-reply':{const f=$('#comment-form');if(f){f.dataset.parent=id;const who=profile(data.comments.find(x=>x.id===id)?.author_id).display_name;const hint=$('#comment-reply-hint');if(hint)hint.innerHTML='↳ '+esc(who)+' kullanıcısına yanıt <button type="button" data-action="comment-reply-cancel">× Vazgeç</button>';f.querySelector('textarea')?.focus()}break}case 'comment-reply-cancel':{const f=$('#comment-form');if(f)f.dataset.parent='';const hint=$('#comment-reply-hint');if(hint)hint.textContent='';break}case 'comment-thread-toggle':{const form=$('#comment-form');const postId=form?.dataset.post;if(!postId)break;if(patiyizCommentExpandedReplies.has(id))patiyizCommentExpandedReplies.delete(id);else patiyizCommentExpandedReplies.add(id);showComments(postId);break;}case 'comment-pin':run(()=>patiCommentPinToggle(id));break;
case 'pati-mention-open':patiMentionOpen(id==='comment'?'comment':'post');break;
case 'pati-mention-profile':e.preventDefault();void patiOpenMentionProfile(target.dataset.handle,target.dataset.id||'');break;
case 'pati-mention-select':{const picker=target.closest('.pati-mention-picker'),form=picker?.closest('form'),textarea=form?.querySelector('textarea[name="body"]');if(textarea){const name='@'+(target.dataset.handle||'');textarea.setRangeText(name+' ',textarea.selectionStart||textarea.value.length,textarea.selectionEnd||textarea.value.length,'end');textarea.focus();}picker?.remove();break}
case 'comment-like':run(async()=>{const form=$('#comment-form');const postId=form?.dataset.post||'',draft=form?.querySelector('textarea')?.value||'',parent=form?.dataset.parent||'';const liked=data.commentLikes.some(x=>x.comment_id===id&&x.user_id===me.id);let r=liked?await sb.from('comment_likes').delete().eq('comment_id',id).eq('user_id',me.id):await sb.from('comment_likes').insert({comment_id:id,user_id:me.id});if(r.error)throw r.error;await load();showComments(postId);const next=$('#comment-form');if(next){next.querySelector('textarea').value=draft;next.dataset.parent=parent;const hint=$('#comment-reply-hint');if(parent&&hint)hint.textContent=profile(data.comments.find(c=>c.id===parent)?.author_id).display_name+' kullanıcısına cevap veriyorsun';}});break;case 'comment-delete':{const c=data.comments.find(x=>x.id===id);if(!c||c.author_id!==me.id)break;if(!confirm('Yorum silinsin mi?'))break;run(async()=>{const post=$('#comment-form')?.dataset.post;const r=await sb.from('comments').delete().eq('id',id).eq('author_id',me.id);if(r.error)throw r.error;
  data.comments=data.comments.filter(row=>row.id!==id);
  const state=patiPostCommentPages.get(post);
  if(state){state.rows=state.rows.filter(row=>row.id!==id);state.at=0}
  patiHomeCountCache.delete(post);showComments(post);
 },'Yorum silindi');break}case 'replies':questionReplies(id);void patiLoadQuestionReplies(id);break;case 'post-menu':{const post=patiFindSocialPost(id);if(!post)break;const own=post.author_id===me.id;modal('Gönderi seçenekleri','<div class="pati-post-menu-list">'+(own?'<button type="button" data-action="edit-post" data-id="'+esc(id)+'">'+ico('edit')+' Gönderiyi düzenle</button><button type="button" data-action="pati-pin" data-id="'+esc(id)+'">'+(patiOwnPin(id)?'↻ Sabiti kaldır':'↻ Profilde sabitle')+'</button><button type="button" data-action="collab-invite-open" data-id="'+esc(id)+'">Ortak davet et</button>'+(patiCollabs.rows.some(x=>x.post_id===id)?'<button type="button" data-action="collab-remove" data-id="'+esc(id)+'">Ortak davetini kaldır</button>':'')+'<button type="button" class="danger" data-action="delete-post" data-id="'+esc(id)+'">'+ico('trash')+' Gönderiyi sil</button>':'<button type="button" data-action="report" data-kind="post" data-id="'+esc(id)+'">'+ico('alert')+' Gönderiyi bildir</button>'+(patiCollabs.rows.some(x=>x.post_id===id&&x.user_id===me.id&&x.status==='accepted')?'<button type="button" data-action="collab-remove" data-id="'+esc(id)+'">Ortaklıktan ayrıl</button>':''))+'</div>','post-actions-form');break}case 'collab-invite-open':{const p=data.posts.find(x=>x.id===id&&x.author_id===me?.id);if(!p)break;closeModal(true);modal('Ortak gönderi daveti',window.PatiyizCollabPicker?.makeMarkup('collab-handle')||'','collab-invite-form');const collabForm=document.getElementById('collab-invite-form');collabForm.dataset.post=id;window.PatiyizCollabPicker?.mount(collabForm,{sb,userId:me?.id,blocked,localProfiles:data.profiles,avatar,escape:esc});break;}
case 'pati-repost':run(()=>patiToggleRepost(id));break;
case 'pati-pin':run(()=>patiTogglePin(id));break;
case 'pati-share-story':if(confirm('Bu gönderi hikâyende 24 saat paylaşılsın mı?'))run(()=>patiSharePostToStory(id));break;
case 'pati-story-open-post':run(()=>patiOpenSharedStoryPost(id));break;case 'pati-story-share-author':if(id&&!blocked.has(id)){closeStory(false);patiOpenProfileOnly(id)}break;
case 'collab-remove':run(()=>patiCollabRemove(id),'Ortaklık daveti kaldırıldı.');break;
case 'collab-accept':run(()=>patiCollabRespond(id,'accepted'),'Ortak gönderi kabul edildi.');break;
case 'collab-decline':run(()=>patiCollabRespond(id,'declined'),'Ortak gönderi reddedildi.');break;
case 'collab-refresh':void patiCollabRefresh();break;
case 'home-feed-tab':{patiHomeTab='all';render();break;}
case 'home-following-refresh':void patiFollowingFetch(false);break;
case 'home-following-more':void patiFollowingFetch(true);break;
case 'edit-post':compose(data.posts.find(p=>p.id===id));break;case 'delete-post':remove('posts',id);break;case 'delete-question':remove('questions',id);break;case 'delete-lost':remove('lost_reports',id);break;case 'care-del':{const item=data.care.find(x=>x.id===id&&x.owner_id===me.id);if(!item)break;
 if(!confirm('Bakım görevini kalıcı olarak silmek istiyor musun?'))break;
 run(async()=>{
  const result=await sb.from('care_tasks').delete().eq('id',id).eq('owner_id',me.id).select('id');
  if(result.error)throw result.error;
  if(!result.data?.length)throw Error('Görev silinemedi veya yetkin yok.');
  data.care=data.care.filter(x=>x.id!==id);if(view==='care'||(view==='my-pet'&&patiMyPetTab==='care'))render();
 },'Bakım görevi silindi.');break;}case 'logout':run(async()=>{globalThis.PatiyizPrivateMedia?.clear();patiDmPhotoClear();const r=await sb.auth.signOut();if(r.error)throw r.error;me=null;isAdmin=false;authMode='login';showAuth()},'Çıkış yapıldı');break;
case 'post-likers-more':void patiLoadPostLikers();break;case 'post-likers':patiOpenPostLikers(id);break;case 'like':void togglePostLike(id);break;case 'share-post':openPatiShareModal(id);break;case 'pati-copy-post':{const link=location.origin+location.pathname+'#post-'+id;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>notify('Paylaşım bağlantısı kopyalandı.'),()=>notify('Bağlantı kopyalanamadı.',true));else notify(link);break}case 'pati-share-system':{const link=location.origin+location.pathname+'#post-'+id;if(navigator.share)navigator.share({title:'Patiyiz paylaşımı',url:link}).catch(()=>{});else if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>notify('Bağlantı kopyalandı.'));break}case 'dm-story-open':{if(!patiDmHasActiveStory(id))return notify('Bu kullanıcının aktif hikâyesi bulunmuyor.',true);openStory(id);break}case 'dm-open-shared-post':run(()=>patiDmOpenSharedPost(id,target.dataset.comment||''));break;case 'send-post-dm':{const post=data.posts.find(x=>x.id===target.dataset.post);if(!post||id===me.id)break;run(async()=>{const r=await sb.from('messages').insert({sender_id:me.id,receiver_id:id,body:'📨 Paylaşım: '+location.origin+location.pathname+'#post-'+post.id});if(r.error)throw r.error;if(typeof patiEngagementCounts!=='undefined'&&typeof patiScheduleEngagement==='function'){patiEngagementCounts.delete(post.id);patiScheduleEngagement();}closeModal();},'Paylaşım mesajla gönderildi.');break;}case 'save':void togglePostSave(id);break;case 'follow':run(()=>doToggle('follows',{follower_id:me.id,followee_id:id},followed.has(id)||patiFollowPageState.viewerFollowing.has(id)));break;
case 'pati-follow-accept':run(()=>patiFollowDecision(id,true));break;
case 'pati-follow-decline':run(()=>patiFollowDecision(id,false));break;
case 'pati-restrict':run(()=>patiRestrictToggle(id));break;
case 'pati-insights':void patiCreatorInsights().catch(e=>notify(friendly(e),true));break;case 'pati-insights-tab':patiInsightsNavigate(id);break;case 'pati-insights-detail':patiInsightsDetail(id);break;case 'pati-insights-visitors':void patiCreatorVisitors(true);break;case 'pati-insights-person':{if(!id||id===me.id)break;patiInsightsClose();lastDetailView=view;profileId=id;navigate('profile');break;}case 'pati-insights-post':{const post=patiFindSocialPost(id);if(!post)break;patiInsightsClose();openPost(id);break;}
case 'pati-insights-close':patiInsightsClose();break;
case 'pati-insights-period':void patiCreatorInsights(Number(id)).catch(e=>notify(friendly(e),true));break;
case 'pati-settings-notifications':navigate('notifications');break;case 'pati-private-toggle':run(async()=>{
 const owner=me.id,next=!current().is_private;
 if(next){
  const {data:session,error:sessionError}=await sb.auth.getSession();
  if(sessionError||!session.session?.access_token)throw Error('Oturumu yenileyip tekrar dene.');
  notify('Eski fotoğraf ve videolar güvenli depoya taşınıyor…');
  const response=await fetch(cfg.supabaseUrl+'/functions/v1/patiyiz-secure-account-media',{
    method:'POST',headers:{authorization:'Bearer '+session.session.access_token,apikey:cfg.supabasePublishableKey,'content-type':'application/json'},body:'{}'
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok)throw Error(result.message||'Dosyalar güvene alınmadan hesap gizliye geçirilemez.');
 }
 const r=await sb.from('profiles').update({is_private:next}).eq('id',owner).select('*').single();
 if(r.error)throw r.error;
 data.profiles=data.profiles.map(p=>p.id===owner?r.data:p);
 globalThis.PatiyizPrivateMedia?.clear();
 if(typeof patiReelsFeed!=='undefined')patiReelsFeed={owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
 if(typeof patiExploreMedia!=='undefined')patiExploreMedia={owner:'',sort:'popular',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};
 if(typeof patiFollowingState!=='undefined')patiFollowingState={owner:'',rows:[],ready:false,loading:false,hasMore:true,cursor:null,error:''};
 await load();
 patiSafetyState.loaded=false;render();
},'Hesap gizliliği güncellendi.');break;
case 'pati-dm-policy':run(async()=>{
 const r=await sb.from('profiles').update({dm_policy:id}).eq('id',me.id).select('*').single();
 if(r.error)throw r.error;
 data.profiles=data.profiles.map(p=>p.id===me.id?r.data:p);render();
},'Mesaj tercihi güncellendi.');break;
case 'pati-comment-filter':modal('Yorum filtresi','<p>Virgülle ayırdığın kelimeleri içeren yeni yorumlar sunucu tarafından reddedilir.</p>'+textField('words','Filtre kelimeleri',(current().blocked_words||[]).join(', '),false,600),'pati-filter-form');break;case 'vote':void patiRateQuestion(id,true).catch(e=>notify(friendly(e),true));break;case 'vote-negative':void patiRateQuestion(id,false).catch(e=>notify(friendly(e),true));break;case 'kb-save':run(()=>doToggle('kb_bookmarks',{article_id:id,user_id:me.id},favorites.has(id)));break;
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
case 'notification-delete':run(async()=>{
 const uid=me.id;const record=data.notifications.find(x=>x.id===id&&x.owner_id===uid);if(!record)return;
 const r=await sb.from('notifications').delete().eq('id',id).eq('owner_id',uid).select('id');
 if(r.error)throw r.error;if(!r.data?.length)throw Error('Bildirim silinemedi veya yetkin yok.');
 if(me?.id!==uid)return;data.notifications=data.notifications.filter(x=>x.id!==id);
 navRender();if(view==='notifications')notificationsPage();patiMenuRenderNotifications();
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

let patiDmContextDialog=null;
function patiDmCloseContextMenu(){
 if(!patiDmContextDialog)return;
 const dialog=patiDmContextDialog;patiDmContextDialog=null;
 try{if(dialog.open)dialog.close()}catch(_){}
 dialog.remove();
}
function openMessageOptions(el){
 if(!el||view!=='messages'||!me)return;
 const id=el.dataset.messageId,msg=patiDmFindMessage(id);
 if(!msg||!personId||!((msg.sender_id===me.id&&msg.receiver_id===personId)||(msg.receiver_id===me.id&&msg.sender_id===personId)))return;
 const mine=msg.sender_id===me.id,pin=typeof patiDmPinState!=='undefined'&&patiDmPinState.byPeer.get(personId)===id;
 const canEdit=mine&&!msg.attachment_path&&!msg.attachment_type&&Date.now()-new Date(msg.created_at).getTime()<900000;
 const canCopy=!!String(msg.body||'').trim()&&!msg.attachment_path&&!msg.attachment_type;
 const icons={
  reply:'<path d="M9 10 4 15l5 5"/><path d="M4 15h10a7 7 0 0 1 7 7"/>',
  copy:'<rect x="8" y="8" width="12" height="14" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  unsend:'<path d="M9 7 4 12l5 5"/><path d="M4 12h10a7 7 0 0 1 0 14"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  pin:'<path d="m7 3 10 10M14 2l8 8M4 22l7-7M11 7 7 11l6 6 4-4"/>',
  edit:'<path d="m4 20 4-.5L20 7.5 16.5 4 4.5 16zM14.5 6 18 9.5"/>',
  back:'<path d="m14 6-6 6 6 6"/>'
 };
 const svg=(icon)=>'<svg class="pati-dm-context-svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[icon]+'</svg>';
 const option=(action,label,icon,extra='')=>'<button type="button" class="pati-dm-context-item '+extra+'" data-action="'+action+'" data-id="'+esc(id)+'"><span class="pati-dm-context-symbol" aria-hidden="true">'+svg(icon)+'</span><span>'+label+'</span>'+(action==='dm-context-more'?'<span class="pati-dm-context-chevron">›</span>':'')+'</button>';
 const reaction=!mine?'<div class="pati-dm-context-reactions" role="group" aria-label="Mesaja tepki ver">'+
  (window.PatiDmEmojiPicker?.getQuick?.()||patiDmEmojis.slice(0,6)).map(emoji=>'<button type="button" data-action="dm-react-set" data-id="'+esc(id)+'" data-emoji="'+esc(emoji)+'" aria-label="'+esc(emoji)+' ile tepki ver">'+emoji+'</button>').join('')+
  '<button type="button" class="pati-dm-reaction-more" data-action="dm-react-open" data-id="'+esc(id)+'" aria-label="Diğer tepkiler">＋</button></div>':'';
 const preview=msg.attachment_type==='image'?'📷 Fotoğraf':msg.attachment_type==='audio'?'🎤 Sesli mesaj':msg.attachment_type==='video'?'🎬 Video':String(msg.body||'Mesaj');
 const options=option('dm-reply','Yanıtla','reply')+
  (canCopy?option('dm-context-copy','Kopyala','copy'):'')+
  option('dm-hide-for-me','Kendin için sil','trash')+
  (mine?option('message-delete','Gönderimi geri al','unsend','is-danger'):'')+
  option('dm-context-more','Daha fazla','more');
 const extras=option('dm-context-back','Geri','back')+
  (canEdit?option('dm-edit','Düzenle','edit'):'')+
  option(pin?'dm-message-unpin':'dm-message-pin',pin?'Sabitlemeyi kaldır':'Sabitle','pin');
 patiDmCloseContextMenu();
 const dialog=document.createElement('dialog');
 dialog.className='pati-dm-context-menu';
 dialog.setAttribute('aria-label','Mesaj işlemleri');
 dialog.dataset.side=mine?'mine':'theirs';
 const rect=el.getBoundingClientRect();
 const estimatedHeight=mine?620:570;
 const proposedTop=Math.max(12,Math.min(rect.top-92,window.innerHeight-estimatedHeight));
 dialog.style.setProperty('--pati-dm-context-top',Math.max(10,proposedTop)+'px');
 dialog.innerHTML='<div class="pati-dm-context-content">'+
  reaction+
  '<div class="pati-dm-context-preview '+(mine?'is-mine':'')+'"><span>'+esc(cut(preview,190))+'</span><small>'+esc(clock(msg.created_at))+'</small></div>'+
  '<div class="pati-dm-context-actions">'+options+'</div>'+
  '<div class="pati-dm-context-actions pati-dm-context-extra" hidden>'+extras+'</div>'+
  '</div>';
 document.body.append(dialog);patiDmContextDialog=dialog;
 dialog.addEventListener('close',()=>{if(patiDmContextDialog===dialog)patiDmContextDialog=null;dialog.remove()},{once:true});
 dialog.addEventListener('cancel',event=>{event.preventDefault();patiDmCloseContextMenu()});
 dialog.addEventListener('click',event=>{
  const control=event.target.closest('button[data-action]');
  if(!control){if(event.target===dialog)patiDmCloseContextMenu();return;}
  event.stopPropagation();
  const action=control.dataset.action;
  if(action==='dm-context-more'||action==='dm-context-back'){
   const expanded=action==='dm-context-more';
   dialog.querySelector('.pati-dm-context-extra').hidden=!expanded;
   dialog.querySelector('.pati-dm-context-actions:not(.pati-dm-context-extra)').hidden=expanded;
   return;
  }
  if(action==='dm-context-close'){patiDmCloseContextMenu();return;}
  patiDmCloseContextMenu();
  processClick({target:control});
 });
 if(typeof dialog.showModal==='function')dialog.showModal();
 else dialog.setAttribute('open','');
}
document.addEventListener('contextmenu',e=>{
 const bubble=e.target.closest('.bubble-chat[data-message-id]');
 if(bubble){e.preventDefault();openMessageOptions(bubble);return;}
 if(e.target.closest?.('#pati-creator-dashboard, #message-options-form'))e.preventDefault();
});
document.addEventListener('selectstart',e=>{
 if(e.target.closest?.('input,textarea,[contenteditable="true"]'))return;
 if(e.target.closest?.('#main-content .pati-dm-layout .bubble-chat, #pati-creator-dashboard, #message-options-form'))e.preventDefault();
},true);
let patiDmSwipe=null;
document.addEventListener('touchstart',event=>{
 if(event.touches.length!==1||view!=='messages')return;
 const bubble=event.target.closest?.('#main-content .pati-dm-layout .bubble-chat[data-message-id]');
 if(!bubble)return;
 const t=event.touches[0];
 patiDmSwipe={bubble,id:bubble.dataset.messageId,x:t.clientX,y:t.clientY,active:false};
},{passive:true});
document.addEventListener('touchmove',event=>{
 const g=patiDmSwipe;
 if(!g||event.touches.length!==1||!g.bubble.isConnected)return;
 const t=event.touches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;
 if(dx>12&&Math.abs(dy)<Math.abs(dx)*.75){
  g.active=true;g.bubble.style.setProperty('--pati-dm-swipe-x',Math.min(42,dx*.36)+'px');g.bubble.classList.add('pati-dm-swiping');
 }else if(Math.abs(dy)>24){g.bubble.classList.remove('pati-dm-swiping');g.bubble.style.removeProperty('--pati-dm-swipe-x');patiDmSwipe=null;}
},{passive:true});
document.addEventListener('touchend',event=>{
 const g=patiDmSwipe;patiDmSwipe=null;if(!g)return;
 if(g.bubble.isConnected){g.bubble.classList.remove('pati-dm-swiping');g.bubble.style.removeProperty('--pati-dm-swipe-x');}
 const t=event.changedTouches[0];if(!t||view!=='messages'||!g.active)return;
 const dx=t.clientX-g.x,dy=t.clientY-g.y;
 if(dx>=67&&Math.abs(dy)<Math.abs(dx)*.65){messageLongPressed=false;patiDmBeginReply(g.id);}
},{passive:true});
document.addEventListener('touchcancel',()=>{if(patiDmSwipe?.bubble?.isConnected){patiDmSwipe.bubble.classList.remove('pati-dm-swiping');patiDmSwipe.bubble.style.removeProperty('--pati-dm-swipe-x')}patiDmSwipe=null;},{passive:true});
document.addEventListener('pointerdown',e=>{const bubble=e.target.closest('.bubble-chat[data-message-id]');if(!bubble||e.pointerType==='mouse')return;clearTimeout(messagePressTimer);messagePressOrigin={x:e.clientX,y:e.clientY,id:bubble.dataset.messageId};messagePressTimer=setTimeout(()=>{messageLongPressed=true;openMessageOptions(bubble);messagePressTimer=null},520)});
document.addEventListener('pointermove',e=>{if(messagePressOrigin&&(Math.abs(e.clientX-messagePressOrigin.x)>12||Math.abs(e.clientY-messagePressOrigin.y)>12)){clearTimeout(messagePressTimer);messagePressTimer=null;messagePressOrigin=null}});
for(const ev of ['pointerup','pointercancel','scroll'])document.addEventListener(ev,()=>{clearTimeout(messagePressTimer);messagePressTimer=null;messagePressOrigin=null},true);
document.addEventListener('click',e=>{if(!messageLongPressed)return;
 if(e.target.closest?.('.bubble-chat[data-message-id]')){e.preventDefault();e.stopImmediatePropagation();}
 messageLongPressed=false;
},true);
document.addEventListener('input',e=>{if(e.target?.name==='crop_zoom'){postCropZoom=+e.target.value;drawPostCrop()}});
document.addEventListener('input',e=>{
 if(e.target?.matches?.('#message-form input[name="body"]'))patiDmTypingInput(e.target.value);
});
document.addEventListener('focusout',e=>{
 if(e.target?.matches?.('#message-form input[name="body"]'))patiDmTypingInput('');
});

let patiPinch=null;
const patiFeedImagePaint=()=>{
 const p=patiPinch;if(!p?.image?.isConnected)return;
 const img=p.image,base=img.getBoundingClientRect(),parent=img.closest('.pati-photo')||img.parentElement;
 if(!parent)return;
 const frame=parent.getBoundingClientRect();
 const maxX=Math.max(0,(frame.width*(p.scale-1))/2);
 const maxY=Math.max(0,(frame.height*(p.scale-1))/2);
 p.tx=Math.max(-maxX,Math.min(maxX,p.tx));
 p.ty=Math.max(-maxY,Math.min(maxY,p.ty));
 img.style.transformOrigin='center center';
 img.style.transform='translate3d('+p.tx.toFixed(1)+'px,'+p.ty.toFixed(1)+'px,0) scale('+p.scale.toFixed(3)+')';
};
document.addEventListener('touchstart',e=>{
 const image=e.target.closest?.('.pati-carousel-slide .pati-photo img, .pati-doubletap-photo .pati-photo img');
 if(e.touches.length===2&&image){
  const [first,second]=e.touches;
  const distance=Math.hypot(first.clientX-second.clientX,first.clientY-second.clientY);
  if(distance<8)return;
  if(!patiPinch||patiPinch.image!==image){
   patiPinch={image,scale:1,tx:0,ty:0,distance,center:{x:(first.clientX+second.clientX)/2,y:(first.clientY+second.clientY)/2},lastTouch:null};
   image.classList.add('pati-pinching');
  }else{
   patiPinch.distance=distance;
   patiPinch.center={x:(first.clientX+second.clientX)/2,y:(first.clientY+second.clientY)/2};
  }
 }else if(e.touches.length===1&&patiPinch?.image.isConnected){
  const touch=e.touches[0];patiPinch.lastTouch={x:touch.clientX,y:touch.clientY};
 }
},{passive:true});
document.addEventListener('touchmove',e=>{
 const p=patiPinch;
 if(!p||!p.image.isConnected){patiPinch=null;return}
 if(e.touches.length===2){
  const [first,second]=e.touches;
  const distance=Math.hypot(first.clientX-second.clientX,first.clientY-second.clientY);
  const center={x:(first.clientX+second.clientX)/2,y:(first.clientY+second.clientY)/2};
  if(p.distance>0)p.scale=Math.max(1,Math.min(4,p.scale*distance/p.distance));
  if(p.center){p.tx+=center.x-p.center.x;p.ty+=center.y-p.center.y}
  p.distance=distance;p.center=center;p.lastTouch=null;
  patiFeedImagePaint();if(e.cancelable)e.preventDefault();
 }else if(e.touches.length===1&&p.scale>1){
  const touch=e.touches[0],prev=p.lastTouch;
  if(prev){p.tx+=touch.clientX-prev.x;p.ty+=touch.clientY-prev.y}
  p.lastTouch={x:touch.clientX,y:touch.clientY};
  patiFeedImagePaint();if(e.cancelable)e.preventDefault();
 }
},{passive:false});
const patiFinishPinch=()=>{
 if(!patiPinch)return;
 const image=patiPinch.image;patiPinch=null;
 image.classList.remove('pati-pinching');
 image.style.transform='';image.style.transformOrigin='';
};
document.addEventListener('touchend',e=>{
 if(!patiPinch)return;
 if(e.touches.length===0)patiFinishPinch();
 else if(e.touches.length===1){
  const touch=e.touches[0];patiPinch.distance=0;patiPinch.center=null;
  patiPinch.lastTouch={x:touch.clientX,y:touch.clientY};
 }
},{passive:true});
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
 if(input?.name==='dm_gif'){
  const file=input.files?.[0];input.value='';
  if(file)run(async()=>{
   if(file.type!=='image/gif'||file.size>8388608)throw Error('En fazla 8 MB GIF dosyası seç.');
   await sendDmImage(file);
  },'GIF gönderildi.');
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
  if(input.name==='video'&&post.dataset.mode==='post'&&!input.hasAttribute('capture'))input.multiple=true;
  if(input.files?.length){const other=post.querySelector('input[name="'+(input.name==='photo'?'video':'photo')+'"]');if(other)other.value=''}
  postCropIndex=0;postCropX=.5;postCropY=.5;postCropZoom=1;
  // Camera-first flow already owns the selected files and preview. Do not
  // open a second gallery sheet or mount the legacy Reels editor underneath.
  if(post.dataset.cameraFirst==='1')return;
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

let patiyizFeedVideoTap={id:'',time:0};
document.addEventListener('click',event=>{
 const video=event.target.closest?.('.pati-reel-video, .pati-feed-card .pati-post-video');
 if(!video)return;
 if(video.matches('.pati-reel-video')){
  const tap=video.closest('.pati-reel-item')?.querySelector('.pati-reel-tap');
  if(tap){event.preventDefault();reelHandleTap(tap);}
  return;
 }
 const card=video.closest('.pati-feed-card'),id=card?.dataset.postId;
 if(!id)return;
 const now=Date.now(),frame=video.closest('.pati-video-frame');
 if(patiyizFeedVideoTap.id===id&&now-patiyizFeedVideoTap.time<390){
  event.preventDefault();patiyizFeedVideoTap={id:'',time:0};
  if(frame){
   let burst=frame.querySelector('.pati-heart-burst');
   if(!burst){burst=document.createElement('span');burst.className='pati-heart-burst pati-video-heart-burst';burst.setAttribute('aria-hidden','true');burst.textContent='♥';frame.appendChild(burst);}
   frame.dataset.postId=id;
   if(liked.has(id))window.PatiyizMotion?.heart(frame);
   else{togglePostLike.heartTargets||=new Map();togglePostLike.heartTargets.set(id,frame);void togglePostLike(id);}
  }
 }else patiyizFeedVideoTap={id,time:now};
},true);
let lastPhotoTap={id:'',time:0},tapTimer=0;
function heartOnPhoto(el){const id=el.dataset.postId;if(!id)return;
 if(liked.has(id))window.PatiyizMotion?.heart(el);
 else{
  togglePostLike.heartTargets||=new Map();
  togglePostLike.heartTargets.set(id,el);
  if(!liked.has(id))void togglePostLike(id);
 }
}
document.addEventListener('click',e=>{const el=e.target.closest('.pati-doubletap-photo');if(!el)return;const now=Date.now();if(lastPhotoTap.id===el.dataset.postId&&now-lastPhotoTap.time<380){e.preventDefault();lastPhotoTap.time=0;heartOnPhoto(el)}else lastPhotoTap={id:el.dataset.postId,time:now}},true);
/* Instagram-like mobile tab gestures: 4 destination tabs, excluding the Share action. */
const patiSwipeTabs=['home','explore','reels','profile'];
let patiPageSwipe=null;
function patiCanSwipePage(target){
 if(!me||!patiSwipeTabs.includes(view)||!target?.closest?.('#main-content'))return false;
 if(view==='profile'&&profileId&&profileId!==me.id)return false;
 if(view==='explore'&&exploreTab==='users')return false;
 if(window.matchMedia?.('(max-width:740px)')?.matches===false)return false;
 if(document.getElementById('story-overlay')||patiRightMenuDialog?.open||document.querySelector('#modal-root .modal')||document.querySelector('#pati-create-sheet:not([hidden])'))return false;
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
document.addEventListener('touchend',e=>{if(storyTouchY===null)return;const target=e.target;const point=e.changedTouches[0];const diff=point?.clientY-storyTouchY,side=point?.clientX-storyTouchX;storyTouchY=null;storyTouchX=null;if(!target.closest('#story-overlay')||target.closest('.story-viewers-sheet'))return;if(Math.abs(diff)>65&&Math.abs(diff)>Math.abs(side)*1.25){if(diff<0){if(storyItems[storyIndex]?.author_id===me.id)showStoryViewers();}else if(storyItems[storyIndex]?.author_id!==me.id)closeStory();return}
 if(Math.abs(side)>70&&Math.abs(side)>Math.abs(diff)*1.5&&!target.closest('button,input,textarea,[contenteditable],.story-viewers-sheet,.story-actions'))stepStory(side<0?1:-1)},{passive:true});
document.addEventListener('keydown',e=>{
 if(!e.target?.matches?.('[data-action="post-likers"][role="button"]')||!['Enter',' '].includes(e.key))return;
 e.preventDefault();e.target.click();
});
document.addEventListener('click',processClick);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.PatiyizGalleryPicker?.active){window.PatiyizGalleryPicker.close();return}else if(e.key==='Escape'&&!$('#pati-create-sheet')?.hidden){closePatiCreate();return}else if(e.key==='Escape'&&document.getElementById('story-viewers-sheet')?.hidden===false){document.querySelector('#story-viewers-sheet [data-action="story-viewers-close"]')?.click();return}else if(e.key==='Escape'&&document.getElementById('story-overlay'))closeStory();else if(e.key==='Escape'&&$('#modal-root .modal'))closeModal()});
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
document.addEventListener('focusin',e=>{if(e.target.matches('.pati-mention-search'))return;if(e.target.matches('.chat-form input, .modal input, .modal textarea'))requestAnimationFrame(()=>e.target.scrollIntoView({block:'nearest',behavior:'smooth'}))});
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
document.addEventListener('submit',async e=>{let form=e.target,id=form.id;if(id==='pati-explore-form'){e.preventDefault();search=$('#explore-search')?.value.trim()||'';render();return}if(id==='settings-password-form'){e.preventDefault();const password=String(new FormData(form).get('new_password')||'');if(password.length<8)return notify('Yeni şifre en az 8 karakter olmalı.',true);await run(async()=>{const r=await sb.auth.updateUser({password});if(r.error)throw r.error;closeModal();},'Şifren güncellendi.');return}if(id==='auth-form')return;if(id==='delete-account-form'){e.preventDefault();if(busy)return;const formData=new FormData(form);const password=String(formData.get('delete_password')||'');const confirmation=String(formData.get('delete_confirm')||'').trim();if(confirmation!=='HESABIMI SIL')return notify('Onay için HESABIMI SIL yazmalısın.',true);if(!password)return notify('Mevcut şifren gerekli.',true);if(!confirm('Hesabın ve tüm kişisel verilerin kalıcı olarak silinsin mi?'))return;await run(async()=>{const session=await sb.auth.getSession();if(!session.data.session)throw Error('Lütfen yeniden giriş yap.');const response=await fetch(cfg.supabaseUrl+'/functions/v1/patiyiz-delete-account',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.data.session.access_token,'apikey':cfg.supabasePublishableKey},body:JSON.stringify({password,confirmation})});let result;try{result=await response.json()}catch{}if(!response.ok)throw Error(result?.message||'Hesap silinemedi.');closeModal();await sb.auth.signOut();me=null;isAdmin=false;showAuth('Hesabın silindi.');},null);return}if(!['wellness-reminder-form','wellness-weight-form','collab-invite-form','post-form','question-form','lost-form','care-form','profile-form','pet-form','reply-form','comment-form','report-form','message-form','dm-edit-form','verification-request-form','adoption-form','story-form','story-answer-form','highlight-album-form','highlight-album-add-form','pati-group-create-form','pati-group-message-form'].includes(id))return;e.preventDefault();if(busy)return;const primary=form.querySelector('.modal-footer button[type="submit"]');if(primary){primary.disabled=true;primary.dataset.originalText=primary.textContent;primary.textContent='⏳ Paylaşım hazırlanıyor…'}const status=form.querySelector('.pati-upload-status');if(status){status.hidden=false;status.querySelector('span').textContent='Paylaşım hazırlanıyor…'}window.PatiyizMotion?.loading(form);const f=new FormData(form),str=k=>String(f.get(k)||'').trim();await run(async()=>{switch(id){case 'pati-group-create-form':{
 const title=str('group_title');
 const members=[...form.querySelectorAll('input[name="group_members"]:checked')].map(x=>x.value);
 if(!title||title.length>80||members.length>19)throw Error('Grup adı veya üye sayısı geçersiz.');
 const out=await sb.rpc('patiyiz_create_group_chat',{p_title:title,p_members:members});
 if(out.error)throw out.error;
 closeModal(true);await patiGroupOpen(out.data);notify('Grup oluşturuldu.');break;
}
case 'pati-group-message-form':{
 const group=str('group_id'),body=str('group_body');
 if(!group||!body||body.length>2000||group!==patiActiveGroupId)throw Error('Mesaj ya da grup geçersiz.');
 const owner=me.id;
 const out=await sb.from('patiyiz_group_messages').insert({group_id:group,sender_id:owner,body}).select('*').single();
 if(out.error)throw out.error;
 if(me?.id!==owner)return;
 form.querySelector('[name="group_body"]').value='';
 if(patiGroupChatState.id===group&&patiGroupChatState.owner===owner){
  patiGroupChatState.rows=[...patiGroupChatState.rows.filter(x=>x.id!==out.data.id),out.data];
 }
 patiDmSafeRender();
 await patiGroupRefreshActive(group,true);
  window.PatiyizMotion?.messageSent(out.data.id,true);
 void patiGroupFetchInbox(true);break;
}
case 'story-answer-form':{const out=await sb.from('patiyiz_story_responses').insert({story_id:form.dataset.story,user_id:me.id,kind:'question',response:str('response')});if(out.error)throw out.error;closeModal(true);notify('Yanıtın gönderildi.');break}case 'story-form':{const result=await createStoryPublication(form,f,str);data.stories=[result,...data.stories.filter(x=>x.id!==result.id)];closeModal(true);render();notify(result.is_highlight?'Hikâyen profilinde kalıcı olarak görünecek.':'Hikâyen 24 saat boyunca görüntülenecek.');break}case 'verification-request-form':{if(current().is_verified)throw Error('Hesabın zaten doğrulanmış.');const uid=me.id;const r=await sb.from('verification_requests').insert({user_id:uid,note:str('note')});if(r.error){if(r.error.code==='23505')throw Error('Zaten bekleyen bir mavi tik talebin var.');throw r.error}if(me?.id!==uid)break;patiVerificationState={owner:uid,loaded:true,loading:false,latest:{status:'pending',created_at:new Date().toISOString()}};closeModal();if(view==='profile'&&(!profileId||profileId===uid))render();notify('Mavi tik talebin yöneticiye gönderildi.');break}case 'highlight-album-form':{const title=str('title').trim(),story_id=str('story_id');if(!title||title.length>32)throw Error('Albüm adı 1–32 karakter olmalı.');const story=data.stories.find(x=>x.id===story_id&&x.author_id===me.id);if(!story)throw Error('Hikâye bulunamadı.');if(!story.is_highlight){const mark=await sb.from('patiyiz_stories').update({is_highlight:true}).eq('id',story_id).eq('author_id',me.id);if(mark.error)throw mark.error;story.is_highlight=true}const out=await sb.from('patiyiz_highlight_albums').insert({owner_id:me.id,title}).select('id').single();if(out.error)throw out.error;const item=await sb.from('patiyiz_highlight_items').insert({album_id:out.data.id,story_id});if(item.error){await sb.from('patiyiz_highlight_albums').delete().eq('id',out.data.id);throw item.error}closeModal(true);await refresh();notify('Yeni öne çıkanlar albümü oluşturuldu.');break}
case 'highlight-album-add-form':{const story_id=str('story_id'),album_id=form.dataset.album;if(!story_id||!album_id)throw Error('Hikâye ve albüm seç.');const out=await sb.from('patiyiz_highlight_items').upsert({album_id,story_id},{onConflict:'album_id,story_id'});if(out.error)throw out.error;closeModal(true);await refresh();notify('Hikâye albüme eklendi.');break}
case 'collab-invite-form':{const postId=form.dataset.post,post=data.posts.find(p=>p.id===postId&&p.author_id===me.id);if(!post)throw Error('Bu gönderiye ortak davet edemezsin.');const selected=window.PatiyizCollabPicker?.selectedId(form,true);await patiCollabInvite(postId,str('collab_handle'),selected);closeModal(true);notify('Ortak daveti gönderildi.');render();break;}
case 'pati-filter-form':{
 const words=str('words').split(',').map(x=>x.trim()).filter(x=>x.length>=3).slice(0,30);
 const r=await sb.from('profiles').update({blocked_words:words}).eq('id',me.id).select('*').single();
 if(r.error)throw r.error;
 data.profiles=data.profiles.map(p=>p.id===me.id?r.data:p);
 closeModal(true);render();notify('Yorum filtreleri güncellendi.');break;
}
case 'post-form':{if(form.dataset.mode==='story'){const result=await createStoryPublication(form,f,str);data.stories=[result,...data.stories.filter(x=>x.id!==result.id)];closeModal(true);render();notify('Hikâyen 24 saat boyunca görüntülenecek.')}else if(form.dataset.edit){await save('posts',{body:str('body').trim()},form.dataset.edit)}else{const selectedCollab=window.PatiyizCollabPicker?.selectedId(form,false)||'';const result=await createPostPublication(form,f,str);profileCountCache.delete(me.id);let inviteMessage='Paylaşım yayınlandı.';if(selectedCollab){try{await patiCollabInvite(result.id,str('collab_handle'),selectedCollab);inviteMessage='Paylaşım yayınlandı; ortak daveti gönderildi.'}catch(error){console.warn('Ortak gönderi daveti:',error);inviteMessage='Paylaşım yayınlandı fakat ortak daveti gönderilemedi: '+friendly(error)}}closeModal(true);try{await refresh()}catch(error){console.warn('Paylaşım kaydedildi, akış yenilemesi başarısız:',error.message)}notify(inviteMessage,inviteMessage.includes('gönderilemedi'));void patiCollabRefresh();try{localStorage.removeItem(patiDraftKey())}catch{}}break}case 'question-form':{const title=str('title'),body=str('body');if(title.length<5||title.length>150)throw Error('Soru başlığı 5–150 karakter arasında olmalı.');if(body.length<5||body.length>2000)throw Error('Soru açıklaması 5–2000 karakter arasında olmalı.');const author=me.id,cat=str('category');
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
 const rec=careValidateRecord({title:str('title'),category:str('category'),due_date:str('due_date'),pet_id:str('pet_id')||null},editId);
 if(!editId)rec.owner_id=me.id;
 const result=editId?await sb.from('care_tasks').update(rec).eq('id',editId).eq('owner_id',me.id).select('*'):
  await sb.from('care_tasks').insert(rec).select('*');
 if(result.error)throw result.error;
 if(!result.data?.length)throw Error('Görev kaydedilemedi. Oturum ve hesap izinlerini kontrol et.');
 const item=result.data[0];data.care=[item,...data.care.filter(x=>x.id!==item.id)];
 patiyizLoadedTables.add('care_tasks');closeModal(true);if(view==='care'||(view==='my-pet'&&patiMyPetTab==='care'))render();
 notify(editId?'Bakım görevi güncellendi.':'Bakım görevi eklendi.');break;}
case 'profile-form':{let handle=str('handle').toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(handle))throw Error('Kullanıcı adı 3–24 karakter, küçük harf, rakam veya alt çizgi olmalı.');let professionalTitle=str('professional_title').replace(/\s+/g,' ').trim();if(professionalTitle.length>60)throw Error('Profil unvanın en fazla 60 karakter olabilir.');let o={display_name:str('display_name'),handle,city:str('city'),professional_title:professionalTitle,bio:str('bio'),profile_links:patiCollectProfileLinks(form)},image=await upload(f.get('photo'));if(image)o.avatar_url=image;await save('profiles',o,me.id);
 const audienceGender=str('analytics_gender');
 if(['woman','man','other'].includes(audienceGender)){
  const added=await sb.from('patiyiz_audience_demographics').upsert({user_id:me.id,gender:audienceGender,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(added.error)throw added.error;
 }else if(audienceGender==='undisclosed'){
  const removed=await sb.from('patiyiz_audience_demographics').delete().eq('user_id',me.id);
  if(removed.error)throw removed.error;
 }
 break}
case 'pet-form':{
 const owner=me.id,editId=form.dataset.edit||'',existing=editId?data.pets.find(p=>p.id===editId):null;
 if(editId&&(!existing||existing.owner_id!==owner))throw Error('Bu hayvanı düzenleme yetkin yok.');
 const name=str('name').trim();
 if(name.length<2||name.length>70)throw Error('Hayvanın adı 2–70 karakter arasında olmalı.');
 const type=str('species'),choice=str('breed_choice');const customBreed=str('breed');
 const chosenBreed=patiPetBreedOptions(type).length&&choice&&choice!=='Diğer'?choice:customBreed;
 const o={name,species:type,gender:str('gender')||'Belirtilmedi',age:str('age').slice(0,60),breed:chosenBreed.slice(0,90),personality:str('personality').slice(0,180),notes:str('notes').slice(0,500)};
 const image=f.get('photo')?.size?await uploadPrivatePublicationMedia(f.get('photo'),'image'):null;if(image)o.photo_url=image;
 if(!editId)o.owner_id=owner;
 const savedPet=await save('pets',o,editId);
 if(!editId&&me?.id===owner&&savedPet?.id){
  patiHubSelectedPetId=savedPet.id;
  if(view==='my-pet'&&patiMyPetTab==='hub')render();
  window.PatiyizMotion?.petAdded(savedPet.id);
 }
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
 const editor=form.querySelector('textarea[name="body"]');if(editor)editor.value='';
 questionReplies(questionId);
 const list=document.querySelector('#reply-form .comment-list');if(list)list.scrollTop=list.scrollHeight;
 notify('Cevap yayınlandı.');break}
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
case 'dm-edit-form':{const body=str('body');if(!body)throw Error('Mesaj boş olamaz');const out=await sb.from('messages').update({body,edited_at:new Date().toISOString()}).eq('id',form.dataset.message).eq('sender_id',me.id);if(out.error)throw out.error;closeModal(true);await refreshKeys([['messages','messages']]);break}case 'pati-dm-search-form':{
 const peer=form.dataset.peer,results=form.querySelector('#pati-dm-search-results');
 if(results)results.textContent='Aranıyor…';
 const rows=await patiDmSearchMessages(peer,str('query'));
 if(results)results.innerHTML=rows.length?rows.map(m=>'<button type="button" class="pati-dm-search-result" data-action="dm-search-jump" data-id="'+esc(m.id)+'" data-peer="'+esc(peer)+'"><strong>'+esc(m.sender_id===me.id?'Sen':profile(m.sender_id).display_name||'Kullanıcı')+'</strong><span>'+esc(cut(m.body||'Medya',130))+'</span><small>'+esc(new Date(m.created_at).toLocaleString('tr-TR'))+'</small></button>').join(''):'<p>Bu sohbetin mesajlarında sonuç bulunamadı.</p>';
 break;
}
case 'pati-dm-schedule-form':{
 const peer=form.dataset.peer,body=str('body'),at=new Date(str('send_at'));
 if(!body||body.length>1000||!Number.isFinite(at.getTime())||at.getTime()<Date.now()+60000||at.getTime()>Date.now()+30*86400000)throw Error('1 dakika ile 30 gün arasında bir tarih seç.');
 const r=await sb.from('patiyiz_scheduled_messages').insert({sender_id:me.id,receiver_id:peer,body,send_at:at.toISOString()}).select('id').single();
 if(r.error)throw r.error;
 closeModal(true);notify('Mesaj gönderimi zamanlandı.');
 break;
}
case 'message-form':{patiDmTypingInput('');if(!personId||personId===me.id)return;if(!str('body').trim())return;if(blocked.has(personId))throw Error('Engellenmiş kullanıcıya mesaj gönderilemez.');const sender=me.id,recipient=personId;
 let r=await sb.from('messages').insert({sender_id:sender,receiver_id:recipient,body:str('body'),reply_to:form.dataset.reply||null}).select('*').single();
 if(r.error)throw r.error;
 form.reset();delete form.dataset.reply;
 if(me?.id===sender&&personId===recipient){
  data.messages=data.messages.filter(x=>x.id!==r.data.id);data.messages.push(r.data);
  navRender();render();window.PatiyizMotion?.messageSent(r.data.id);
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
 }});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLive();else refreshOnReturn()});window.addEventListener('focus',refreshOnReturn);
function resetSessionState(){
 if(typeof patiGroupLiveStop==='function')patiGroupLiveStop();
 if(typeof patiGroupInboxStop==='function')patiGroupInboxStop();
 patiActiveGroupId='';patiGroupInboxState={owner:'',rows:[],ready:false,loading:false,error:''};
 patiGroupChatState={owner:'',id:'',group:null,members:[],rows:[],ready:false,error:''};
 if(typeof patiOwnPetsRequest!=='undefined')patiOwnPetsRequest++;
 if(typeof patiPetPhotoObjectUrl!=='undefined'&&patiPetPhotoObjectUrl){URL.revokeObjectURL(patiPetPhotoObjectUrl);patiPetPhotoObjectUrl=''}
 if(typeof patiCommunityPage!=='undefined'){patiCommunityPage={owner:'',category:'',rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''};patiCommunityReplyPages.clear()}

 if(typeof patiExploreMedia!=='undefined'){patiExploreMetrics.clear();patiExploreSort='popular';patiExploreMedia={owner:'',rows:[],offset:0,hasMore:true,ready:false,loading:false,error:''};patiExploreUsers={owner:'',query:'',rows:[],ready:false,loading:false,error:''};if(patiExploreSearchTimer)clearTimeout(patiExploreSearchTimer);patiExploreSearchTimer=null}

 if(typeof patiDmDisconnectTyping==='function')patiDmDisconnectTyping();
 if(typeof patiDmLocalSeenCache!=='undefined'){patiDmLocalSeenOwner='';patiDmLocalSeenCache.clear()}
 patiDmPendingLatestPeer='';patiDmAcceptedState={owner:'',ids:new Set(),ready:false,loading:false,error:''};if(typeof patiDmHiddenConversations!=='undefined')patiDmHiddenConversations={owner:'',ready:false,busy:false,error:false,cutoffs:new Map()};if(typeof patiDmThreads!=='undefined')patiDmThreads.clear();if(typeof patiDmInbox!=='undefined')patiDmInbox={owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''};

 if(typeof window!=='undefined')window.PatiyizDelight?.closeStreak();
 patiStreakState={owner:'',count:0,best:0,ready:false,loading:false,checkedOn:''};patiStreakGoalState={owner:'',ready:false,loading:false,goal:null,earned:[],error:''};patiStreak60State={owner:'',ready:false,loading:false,eligible:false,claimed:false,cash_status:'',error:''};patiyizLoadToken++;patiyizLoadedTables.clear();patiyizDeferredLoading=null;
 if(typeof patiHomeFeedIds!=='undefined'){patiHomeFeedIds=null;patiHomeFeedCursor=null;patiHomeLoadError=''};if(typeof patiHomeCountCache!=='undefined'){patiHomeCountCache.clear();patiHomeCountsLoading.clear()};if(typeof patiPostCommentPages!=='undefined')patiPostCommentPages.clear();patiWellness={reminders:[],weights:[],loaded:false,loading:false,notified:new Set()};patiWeeklyState={owner:'',loading:false,ready:false,error:'',updatedAt:0,result:null};patiInviteState={code:'',invited_count:0,already_used:false,coins_each:50,loading:false};patiDmReturnView='home';mobileChatOpen=false;patiCoinState={balance:0,earned:0,claims:[],items:[],orders:[],history:[],loading:false};patiFollowerRewardState={followers:null,claimed:[],cash:[]};document.getElementById('paticoin-celebration')?.remove();
 if(typeof patiDmSharedPosts!=='undefined'){patiDmSharedPosts.clear();patiDmSharedFetched.clear();patiDmSharedReturnPeer='';patiDmSharedRetryAt=0}
 data=Object.fromEntries(Object.keys(data).map(key=>[key,[]]));
 for(const group of [favorites,followed,liked,saved,voted,blocked])group.clear();
 blockedProfiles=[];patiDmSignedCache.clear();profileCountCache.clear();profileCountInFlight.clear();
 if(typeof patiPostSeen!=='undefined')patiPostSeen.clear();if(typeof patiPostViewCounts!=='undefined')patiPostViewCounts.clear();if(typeof patiPostViewObserver!=='undefined'&&patiPostViewObserver){patiPostViewObserver.disconnect();patiPostViewObserver=null}pageLimits={posts:40,messages:150,notifications:150};pageMore={posts:true,messages:true,notifications:true};
 if(typeof healthFilePortal!=='undefined')healthFilePortal=null;if(typeof healthFileOwner!=='undefined')healthFileOwner='';if(typeof educationCloudDone!=='undefined')educationCloudDone.clear();if(typeof educationCloudUser!=='undefined')educationCloudUser='';if(typeof pendingPostLikes!=='undefined')pendingPostLikes.clear();if(typeof likesChangeEpoch==='number')likesChangeEpoch++;if(typeof savesChangeEpoch==='number')savesChangeEpoch++;if(typeof pendingPostSaves!=='undefined')pendingPostSaves.clear();if(typeof savedMissingAttempted!=='undefined')savedMissingAttempted.clear();personId='';profileId='';selectedPostId='';followListId='';patiFollowPageState={key:'',rows:[],next:0,hasMore:true,loading:false,error:'',viewerFollowing:new Set()};search='';view='home';chatFilter='primary';mobileChatOpen=false;isAdmin=false;
 patiDetailState=null;patiPageSwipe=null;patiSwipeNavDirection=0;storyItems=[];storyLikes=[];storyIndex=0;clearTimeout(storyTimer);storyTimer=null;lastPhotoTap={id:'',time:0};
 document.getElementById('story-overlay')?.remove();document.body.classList.remove('story-fullscreen-open');
 window.PatiyizGalleryPicker?.close();window.PatiyizSystemMediaFlow?.close?.();window.PatiyizCameraFlow?.close?.();window.PatiyizReelsEditor?.dispose();clearPatiMediaUrls();
 document.getElementById('modal-root')?.replaceChildren();
 dmCancel=true;if(dmRecorder?.state==='recording')try{dmRecorder.stop()}catch(e){console.warn('Ses kaydı durdurulamadı',e)}
 dmStream?.getTracks().forEach(track=>track.stop());dmStream=null;dmRecipient=null;dmParts=[];dmMediaSending=false;
}

globalThis.PatiyizPrivateMedia?.onRefresh(async()=>{
 if(!me?.id||!sb)return;
 const uid=me.id;
 data.posts=await globalThis.PatiyizPrivateMedia.hydrateRows(data.posts,uid,sb);
 data.stories=await globalThis.PatiyizPrivateMedia.hydrateRows(data.stories,uid,sb);
 data.pets=await globalThis.PatiyizPrivateMedia.hydrateRows(data.pets,uid,sb);
 if(patiReelsFeed?.owner===uid)patiReelsFeed.rows=await globalThis.PatiyizPrivateMedia.hydrateRows(patiReelsFeed.rows,uid,sb);
 if(patiExploreMedia?.owner===uid)patiExploreMedia.rows=await globalThis.PatiyizPrivateMedia.hydrateRows(patiExploreMedia.rows,uid,sb);
 if(patiFollowingState?.owner===uid)patiFollowingState.rows=await globalThis.PatiyizPrivateMedia.hydrateRows(patiFollowingState.rows,uid,sb);
 if(patiDmSharedPosts?.size){
  const refs=await globalThis.PatiyizPrivateMedia.hydrateRows([...patiDmSharedPosts.values()],uid,sb);
  for(const post of refs)patiDmSharedPosts.set(post.id,post);
 }
 if(me?.id===uid)render();
});
async function boot(){if(!ready){showSetup();return}
 if(typeof window.supabase?.createClient!=='function'){
  starter();appRoot.classList.add('hidden');authRoot.classList.remove('hidden');
  authRoot.innerHTML='<div class="auth-card" role="alert"><div class="auth-brand"><img src="patiyiz-selected-logo.svg" alt="Patiyiz" width="64" height="64"></div><h2>Bağlantı kurulamadı</h2><p class="auth-sub">Güvenli giriş sistemi yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.</p><button class="primary-btn auth-submit" type="button" data-auth-sdk-retry>Yeniden dene</button></div>';
  return;
 }
 try{sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);let {data:result,error}=await sb.auth.getSession();if(error)throw error;me=result.session?.user;if(me){showApp()}else{showAuth()}sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){stopLive();resetSessionState();me=null;authMode='login';showAuth()}else if(event==='PASSWORD_RECOVERY'){modal('Yeni şifre belirle',formField('password','Yeni şifre','password','',true),'reset-password-form');}else if(event==='SIGNED_IN'&&session?.user&&(!me||me.id!==session.user.id)){stopLive();resetSessionState();me=session.user;const signedUser=me.id;setTimeout(async()=>{if(me?.id!==signedUser)return;if(me?.id===signedUser)showApp()},0)}})}catch(e){starter();showAuth('Bağlantı kurulamadı. Supabase ayarlarını kontrol et.');notify(friendly(e),true)}}
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
document.addEventListener('change',event=>{
 const input=event.target.closest?.('input[data-pati-group-avatar]');
 if(!input?.files?.length)return;
 const id=input.dataset.patiGroupAvatar;
 const file=input.files[0];input.value='';void patiGroupAvatarCropOpen(id,file).catch(error=>notify(friendly(error),true));
});
/* Privacy-safe telemetry: no messages, URLs, stack traces or form contents. */
 const PATI_ERROR_RELEASE='20261031-audit2',patiReportedErrors=new Map();
 let patiLastUiAction='unknown';
 function patiSafeErrorLabel(value){
  const str=String(value||'unknown').toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(str)?str:'unknown';
 }
 document.addEventListener('click',event=>{
  const target=event.target.closest?.('[data-action],[data-view],[data-auth]');
  if(target)patiLastUiAction=patiSafeErrorLabel(target.dataset.action||target.dataset.view||target.dataset.auth);
 },true);
 document.addEventListener('submit',event=>{
  patiLastUiAction=patiSafeErrorLabel(event.target?.id||'form');
 },true);
 function patiTrackClientError(kind){
  if(!me?.id||!sb||navigator.onLine===false)return;
  const screen=patiSafeErrorLabel(view||'unknown'),action=patiLastUiAction;
  const key=me.id+':'+kind+':'+screen+':'+action,now=Date.now();
  if(now-(patiReportedErrors.get(key)||0)<60000)return;
  patiReportedErrors.set(key,now);
  void sb.rpc('patiyiz_track_client_error_context',{
   p_kind:kind,p_screen:screen,p_action:action,p_release:PATI_ERROR_RELEASE
  }).then(({error})=>{if(error)console.warn('İstemci hata sayacı gönderilemedi.')}).catch(()=>{});
 }
 window.addEventListener('error',event=>{
  patiTrackClientError(event.target instanceof HTMLImageElement||event.target instanceof HTMLVideoElement?'asset':'script');
 },true);
 window.addEventListener('unhandledrejection',()=>patiTrackClientError('promise'));
document.addEventListener('click',event=>{const menu=document.querySelector('#main-content .pati-profile-more-wrap[open]');if(menu&&!menu.contains(event.target))menu.open=false;});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const menu=document.querySelector('#main-content .pati-profile-more-wrap[open]');if(menu){menu.open=false;menu.querySelector('summary')?.focus();}});
 boot();
})();
