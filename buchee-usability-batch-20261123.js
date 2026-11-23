/* Buchee usability enhancements: UI-only, no Supabase schema changes. */
(()=>{'use strict';
const root=document.getElementById('app-root');if(!root)return;
const css=document.createElement('style');css.textContent=`
.buchee-ux-tools{display:flex;gap:8px;align-items:center;margin:8px 12px}
.buchee-ux-tools button,.buchee-copy-handle,.buchee-text-size{border:1px solid #d5d5d5;border-radius:9px;background:#fff;color:#111;padding:8px 11px;font:600 13px system-ui;cursor:pointer}
.buchee-ux-tools button[aria-pressed="true"]{background:#111;color:#fff}
.buchee-copy-handle{margin-left:8px;padding:5px 8px}
.buchee-text-size{position:fixed;right:12px;bottom:calc(80px + env(safe-area-inset-bottom,0px));z-index:200;box-shadow:0 2px 12px #0002}
html[data-buchee-text-scale="large"] #main-content{font-size:1.1em}
html[data-buchee-text-scale="larger"] #main-content{font-size:1.2em}
html[data-buchee-text-scale="large"] #main-content input,html[data-buchee-text-scale="large"] #main-content textarea{font-size:17px}
html[data-buchee-text-scale="larger"] #main-content input,html[data-buchee-text-scale="larger"] #main-content textarea{font-size:19px}
`;document.head.append(css);
const toast=message=>{const el=document.createElement('div');el.textContent=message;el.setAttribute('role','status');el.style.cssText='position:fixed;bottom:140px;left:50%;transform:translateX(-50%);background:#111;color:white;padding:10px 16px;border-radius:12px;z-index:99999;font:14px system-ui';document.body.append(el);setTimeout(()=>el.remove(),1900)};
const copy=async text=>{try{await navigator.clipboard.writeText(text);toast('Kopyalandı')}catch{toast('Kopyalama başarısız')}};
let unreadOnly=false,scheduled=false;
function enhance(){
scheduled=false;
const list=document.querySelector('.pati-dm-layout .chat-people');
if(list){
let bar=list.previousElementSibling;
if(!bar||!bar.classList.contains('buchee-ux-tools')){bar=document.createElement('div');bar.className='buchee-ux-tools';bar.innerHTML='<button type="button" data-buchee-unread aria-pressed="false">Okunmamışlar</button>';list.before(bar)}
const button=bar.querySelector('[data-buchee-unread]');button.setAttribute('aria-pressed',String(unreadOnly));
const rows=[...list.querySelectorAll('.pati-dm-list-row')];for(const row of rows){row.hidden=unreadOnly&&!row.querySelector('.chat-unread')}
}
const username=document.querySelector('.pati-profile-visitor-username');
if(username&&!username.parentElement.querySelector('.buchee-copy-handle')){const b=document.createElement('button');b.type='button';b.className='buchee-copy-handle';b.textContent='Kopyala';b.setAttribute('aria-label','Kullanıcı adını kopyala');username.after(b)}
if(document.querySelector('#main-content')&&!document.querySelector('.buchee-text-size')){const b=document.createElement('button');b.type='button';b.className='buchee-text-size';b.textContent='Aa';b.title='Yazı boyutunu değiştir';b.setAttribute('aria-label','Yazı boyutunu değiştir');document.body.append(b)}
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance)}
document.addEventListener('click',e=>{
const unread=e.target.closest('[data-buchee-unread]');if(unread){unreadOnly=!unreadOnly;schedule();return}
const handle=e.target.closest('.buchee-copy-handle');if(handle){const value=handle.parentElement.querySelector('.pati-profile-visitor-username')?.textContent?.trim();if(value)void copy(value);return}
if(e.target.closest('.buchee-text-size')){const values=['normal','large','larger'];const current=document.documentElement.dataset.bucheeTextScale||'normal';const next=values[(values.indexOf(current)+1)%values.length];document.documentElement.dataset.bucheeTextScale=next;try{localStorage.setItem('buchee_text_scale',next)}catch{}toast(next==='normal'?'Normal yazı boyutu':next==='large'?'Büyük yazı':'En büyük yazı')}
});
try{const scale=localStorage.getItem('buchee_text_scale');if(['normal','large','larger'].includes(scale))document.documentElement.dataset.bucheeTextScale=scale}catch{}
new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
schedule();
})();