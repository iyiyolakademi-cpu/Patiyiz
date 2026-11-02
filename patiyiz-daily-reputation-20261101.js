/* Daily question poll only. Reputation system removed. */
(()=>{'use strict';
const prompts=[
['Sence sosyal medyanın en büyük sorunu ne?',['Sahte hesaplar','Bağımlılık','Yanlış bilgi','Gizlilik']],
['Bir arkadaşta en önemli özellik hangisi?',['Dürüstlük','Sadakat','Anlayış','Mizah']],
['Yapay zekâ en çok hangi alanı değiştirecek?',['Eğitim','Sağlık','İş hayatı','Sanat']],
['Bir gün internetsiz kalsan en çok neyi özlersin?',['Mesajlaşma','Müzik','Video','Oyun']],
['Başarının en önemli anahtarı nedir?',['Disiplin','Şans','Çevre','Yetenek']],
['Sosyal medyada görmek istediğin içerik hangisi?',['Bilgi','Eğlence','Gündem','Yaratıcılık']],
['Öğrenmek istediğin yeni beceri hangisi?',['Yeni dil','Yazılım','Müzik','Tasarım']]
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let client=null,snapshot=null,loadedDay='',lastRefresh=0,refreshing=false;
function getClient(){if(client)return client;const c=window.PATIYIZ_CONFIG;if(!c?.supabaseUrl||!c?.supabasePublishableKey||!window.supabase?.createClient)return null;client=window.supabase.createClient(c.supabaseUrl,c.supabasePublishableKey,{});return client}
function turkeyDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function question(day){const n=Math.floor(Date.parse(day+'T12:00:00Z')/86400000);return prompts[((n%prompts.length)+prompts.length)%prompts.length]}
function main(){return document.getElementById('main-content')}
function currentView(){return document.documentElement.dataset.patiView||''}
async function refresh(){if(refreshing)return;refreshing=true;try{const c=getClient();if(!c)return;const {data:{session}}=await c.auth.getSession();if(!session)return;const {data,error}=await c.rpc('pati_daily_snapshot');if(error)throw error;snapshot=data;loadedDay=turkeyDay();lastRefresh=Date.now()}finally{refreshing=false}}
async function action(name,extra={}){const c=getClient();if(!c)return;try{const {error}=await c.rpc('pati_daily_action',{p_action:name,p_choice:null,p_body:null,p_answer_id:null,...extra});if(error)throw error;await refresh();renderCard()}catch(e){alert(e.message||'İşlem tamamlanamadı')}}
function card(){const q=question(turkeyDay()),scores=snapshot?.votes||{},choice=snapshot?.my_choice,total=Object.values(scores).reduce((a,v)=>a+Number(v||0),0);return '<section class="pati-daily-card pati-daily-poll"><div class="pati-daily-top"><span class="pati-daily-icon" aria-hidden="true">?</span><span class="pati-daily-top-copy">Günün Sorusu <small>Günlük anket</small></span><span class="pati-daily-clock" data-daily-clock>--:--:--</span></div><strong>'+esc(q[0])+'</strong><div class="pati-daily-inline-options">'+q[1].map((label,i)=>'<button type="button" data-daily-vote="'+i+'" class="'+(choice===i?'selected':'')+'"><span>'+esc(label)+'</span>'+(choice!=null?'<b>'+Math.round(Number(scores[i]||0)*100/Math.max(1,total))+'%</b>':'')+'</button>').join('')+'</div><div class="pati-daily-footer"><span>'+total+' katılım</span><span>Her gün 00.00’da yeni soru</span></div></section>'}
function updateClock(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const remaining=86400-(Number(p.hour)*3600+Number(p.minute)*60+Number(p.second));const value=[Math.floor(remaining/3600),Math.floor(remaining%3600/60),remaining%60].map(x=>String(x).padStart(2,'0')).join(':');document.querySelectorAll('[data-daily-clock]').forEach(n=>{n.textContent=value;n.title='Günün sorusunun bitmesine kalan süre'});if(loadedDay&&loadedDay!==turkeyDay())refresh().then(renderCard).catch(()=>{})}
function renderCard(){const m=main();if(!m)return;const textMode=document.querySelector('[data-pati-feed-choice="text"]')?.getAttribute('aria-checked')==='true' || /tweet|soru/i.test(document.querySelector('.pati-feed-current')?.textContent||'');const home=currentView()==='home' && textMode && !m.querySelector('.pati-detail-screen,.pati-detail-toolbar,#pati-detail-list') && document.documentElement.dataset.patiScreen==='feed';const existing=m.querySelector('.pati-daily-card');if(!home){existing?.remove();return}if(existing){const updated=card();if(existing.outerHTML!==updated)existing.outerHTML=updated;updateClock();return}if(m.querySelector('.pati-community-head'))m.querySelector('.pati-community-head').insertAdjacentHTML('afterend',card());else m.insertAdjacentHTML('afterbegin',card());updateClock()}
let queued=false;
const observer=new MutationObserver(list=>{if(list.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1&&!n.classList?.contains('pati-daily-card')))){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;renderCard()})}}});
function boot(){const m=main();if(!m)return;observer.observe(m,{childList:true});renderCard();refresh().then(()=>{renderCard();}).catch(e=>console.warn('Günün Sorusu yüklenemedi',e))}
document.addEventListener('click',e=>{const v=e.target.closest('[data-daily-vote]');if(v)void action('vote',{p_choice:Number(v.dataset.dailyVote)});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().then(renderCard).catch(()=>{})});
setInterval(()=>{if(!document.hidden)updateClock()},1000);
// Poll every 12 seconds while visible, so other users' votes appear automatically.
setInterval(()=>{if(!document.hidden&&document.querySelector('.pati-daily-card')&&Date.now()-lastRefresh>11000)refresh().then(renderCard).catch(()=>{})},12000);
window.addEventListener('patiyiz:pull-refresh',()=>refresh().then(renderCard).catch(()=>{}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();