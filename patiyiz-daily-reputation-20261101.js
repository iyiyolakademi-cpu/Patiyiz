/* Daily question + reputation. Independent of Pati Coin. */
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
const levels=[[0,'Yeni Üye'],[100,'Katılımcı'],[400,'Aktif Üye'],[1000,'Katkı Sağlayan'],[2500,'Topluluk Yıldızı'],[6000,'Öncü'],[15000,'Efsane']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let client=null,snapshot=null,loading=false,open=false,loadedDay='';
function getClient(){if(client)return client;const c=window.PATIYIZ_CONFIG;if(!c?.supabaseUrl||!c?.supabasePublishableKey||!window.supabase?.createClient)return null;client=window.supabase.createClient(c.supabaseUrl,c.supabasePublishableKey,{});return client}
function turkeyDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function question(day){const n=Math.floor(Date.parse(day+'T12:00:00Z')/86400000);return prompts[((n%prompts.length)+prompts.length)%prompts.length]}
function level(points){let n=0;for(let i=0;i<levels.length;i++)if(points>=levels[i][0])n=i;return {index:n,name:levels[n][1],next:levels[n+1]||null}}
function main(){return document.getElementById('main-content')}
function currentView(){return document.documentElement.dataset.patiView||''}
async function refresh(){const c=getClient();if(!c)return;const {data:{session}}=await c.auth.getSession();if(!session)return;const {data,error}=await c.rpc('pati_daily_snapshot');if(error)throw error;snapshot=data;loadedDay=turkeyDay()}
async function action(name,extra={}){const c=getClient();if(!c)return;try{const {error}=await c.rpc('pati_daily_action',{p_action:name,p_choice:null,p_body:null,p_answer_id:null,...extra});if(error)throw error;await refresh();renderCard()}catch(e){alert(e.message||'İşlem tamamlanamadı')}}
function card(){const points=Number(snapshot?.points||0),l=level(points),q=question(turkeyDay()),scores=snapshot?.votes||{},choice=snapshot?.my_choice,total=Object.values(scores).reduce((a,v)=>a+Number(v||0),0);return '<section class="pati-daily-card pati-daily-poll"><div class="pati-daily-top"><span class="pati-daily-icon" aria-hidden="true">?</span><span class="pati-daily-top-copy">Günün Sorusu <small>Günlük anket</small></span></div><strong>'+esc(q[0])+'</strong><div class="pati-daily-inline-options">'+q[1].map((label,i)=>'<button type="button" data-daily-vote="'+i+'" class="'+(choice===i?'selected':'')+'"><span>'+esc(label)+'</span>'+(choice!=null?'<b>'+Math.round(Number(scores[i]||0)*100/Math.max(1,total))+'%</b>':'')+'</button>').join('')+'</div><div class="pati-daily-footer"><span>'+total+' katılım</span><span>İtibar seviyesi '+(l.index+1)+' · '+esc(l.name)+'</span></div></section>'}
function renderCard(){const m=main();if(!m)return;const home=currentView()==='home'||!!m.querySelector('.stories-section');const existing=m.querySelector('.pati-daily-card');if(!home){existing?.remove();return}if(existing){const updated=card();if(existing.outerHTML!==updated)existing.outerHTML=updated;return}m.insertAdjacentHTML('afterbegin',card())}
function renderModal(){
 let root=document.getElementById('pati-daily-overlay');if(!root){root=document.createElement('div');root.id='pati-daily-overlay';document.body.appendChild(root)}
 if(!open){root.hidden=true;return}
 root.hidden=false;
 const day=turkeyDay(),q=question(day),scores=snapshot?.votes||{},total=Object.values(scores).reduce((a,v)=>a+Number(v||0),0),choice=snapshot?.my_choice,answers=snapshot?.answers||[],points=Number(snapshot?.points||0),l=level(points),next=l.next;
 root.innerHTML='<div class="pati-daily-panel"><header><div class="pati-daily-header-left"><span class="pati-daily-icon" aria-hidden="true">?</span><strong>Günün Sorusu</strong></div><button type="button" data-daily-close aria-label="Kapat">×</button></header><div class="pati-daily-content"><small>'+esc(day)+' · Günlük tek oy, değiştirilebilir</small><h2>'+esc(q[0])+'</h2><div class="pati-daily-options">'+q[1].map((label,i)=>'<button type="button" data-daily-vote="'+i+'" class="'+(choice===i?'selected':'')+'"><span>'+esc(label)+'</span>'+(choice!==null&&choice!==undefined?'<b>'+Math.round(Number(scores[i]||0)*100/Math.max(1,total))+'%</b>':'')+'</button>').join('')+'</div><p>'+total+' katılım · Oylama sonrası sonuçlar görünür.</p><div class="pati-daily-reputation"><strong>İtibar: '+points+' puan</strong><span>Seviye '+(l.index+1)+' · '+esc(l.name)+'</span>'+(next?'<progress value="'+(points-levels[l.index][0])+'" max="'+(next[0]-levels[l.index][0])+'"></progress><small>Sonraki seviyeye '+(next[0]-points)+' puan</small>':'<small>En yüksek seviyedesin</small>')+'<small>Oy +1 · Günlük cevap +2 · Faydalı bulunan cevap +5. Pati Coin ile bağlantılı değildir.</small></div><h3>Günün cevapları</h3><form id="pati-daily-answer-form"><textarea maxlength="500" minlength="3" placeholder="Düşünceni yaz (günde bir cevap)">'+esc(answers.find(a=>a.user_id===window.__patiDailySelf)?.body||'')+'</textarea><button type="submit">Cevabımı kaydet</button></form><div class="pati-daily-answers">'+answers.map(a=>'<article><strong>'+esc(a.display_name||a.handle||'Kullanıcı')+'</strong><p>'+esc(a.body)+'</p><button type="button" data-daily-helpful="'+esc(a.id)+'" '+(a.mine?'disabled':'')+'>Faydalı · '+Number(a.helpful||0)+'</button></article>').join('')+'</div></div></div>';
}
let queued=false;
const observer=new MutationObserver(list=>{if(list.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1&&!n.classList?.contains('pati-daily-card')))){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;renderCard()})}}});
function boot(){const m=main();if(!m)return;observer.observe(m,{childList:true});renderCard();refresh().then(()=>{renderCard();if(open)renderModal()}).catch(e=>console.warn('Günün Sorusu yüklenemedi',e))}
document.addEventListener('click',e=>{const v=e.target.closest('[data-daily-vote]');if(v)void action('vote',{p_choice:Number(v.dataset.dailyVote)});const helpful=e.target.closest('[data-daily-helpful]');if(helpful)void action('helpful',{p_answer_id:helpful.dataset.dailyHelpful})});
document.addEventListener('submit',e=>{if(e.target.id!=='pati-daily-answer-form')return;e.preventDefault();void action('answer',{p_body:e.target.querySelector('textarea')?.value||''})});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loadedDay!==turkeyDay())refresh().then(()=>{renderCard()}).catch(()=>{})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();