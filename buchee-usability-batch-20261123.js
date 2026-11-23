/* Buchee usability: settings-only font control, inbox-only unread filter, profile menu copy. */
(()=>{'use strict';
const root=document.getElementById('app-root');if(!root)return;
const css=document.createElement('style');css.textContent=`
.buchee-ux-tools{display:flex;gap:8px;align-items:center;margin:8px 12px}
.buchee-ux-tools button{border:1px solid #d5d5d5;border-radius:9px;background:#fff;color:#111;padding:8px 11px;font:600 13px system-ui;cursor:pointer}
.buchee-ux-tools button[aria-pressed="true"]{background:#111;color:#fff}
html[data-buchee-text-scale="large"] #main-content{font-size:1.1em}
html[data-buchee-text-scale="larger"] #main-content{font-size:1.2em}
html[data-buchee-text-scale="large"] #main-content input,html[data-buchee-text-scale="large"] #main-content textarea{font-size:17px}
html[data-buchee-text-scale="larger"] #main-content input,html[data-buchee-text-scale="larger"] #main-content textarea{font-size:19px}
html[data-buchee-text-scale="large"] #main-content .pati-post-caption,html[data-buchee-text-scale="large"] #main-content .bubble-chat{font-size:1.08em}
html[data-buchee-text-scale="larger"] #main-content .pati-post-caption,html[data-buchee-text-scale="larger"] #main-content .bubble-chat{font-size:1.16em}
.pati-dm-layout:not(.mobile-chat-list) .buchee-ux-tools{display:none!important}
.pati-dm-layout:has(.chat-window:not([hidden])) .buchee-ux-tools{display:none!important}
`;document.head.append(css);
const toast=message=>{const el=document.createElement('div');el.textContent=message;el.setAttribute('role','status');el.style.cssText='position:fixed;bottom:140px;left:50%;transform:translateX(-50%);background:#111;color:white;padding:10px 16px;border-radius:12px;z-index:99999;font:14px system-ui';document.body.append(el);setTimeout(()=>el.remove(),1900)};
const copy=async value=>{try{await navigator.clipboard.writeText(value);toast('Kullanıcı adı kopyalandı')}catch{toast('Kopyalama başarısız')}};
const values=['normal','large','larger'];let unreadOnly=false,scheduled=false;
function enhance(){scheduled=false;
document.querySelectorAll('.buchee-copy-handle,.buchee-text-size').forEach(el=>el.remove());
const list=document.querySelector('.pati-dm-layout.mobile-chat-list .chat-people');
document.querySelectorAll('.buchee-ux-tools').forEach(bar=>{if(!list||bar.nextElementSibling!==list)bar.remove()});
if(list){let bar=list.previousElementSibling;if(!bar?.classList.contains('buchee-ux-tools')){bar=document.createElement('div');bar.className='buchee-ux-tools';bar.innerHTML='<button type="button" data-buchee-unread aria-pressed="false">Okunmamışlar</button>';list.before(bar)}
bar.querySelector('[data-buchee-unread]').setAttribute('aria-pressed',String(unreadOnly));
for(const row of list.querySelectorAll('.pati-dm-list-row'))row.hidden=unreadOnly&&!row.querySelector('.chat-unread');
}
const setting=document.querySelector('[data-action="buchee-text-scale"] .pati-settings-copy small');
if(setting){const current=document.documentElement.dataset.bucheeTextScale||'normal';setting.textContent='Şu an: '+(current==='normal'?'Normal':current==='large'?'Büyük':'Çok büyük')}
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance)}
document.addEventListener('click',e=>{
const unread=e.target.closest('[data-buchee-unread]');if(unread){unreadOnly=!unreadOnly;schedule();return}
const handle=e.target.closest('[data-action="buchee-copy-username"]');if(handle){e.preventDefault();e.stopImmediatePropagation();const username=document.querySelector('.pati-profile-visitor-username')?.textContent?.trim();if(username)void copy(username);return}
if(e.target.closest('[data-action="buchee-text-scale"]')){e.preventDefault();e.stopImmediatePropagation();const current=document.documentElement.dataset.bucheeTextScale||'normal';const next=values[(values.indexOf(current)+1)%values.length];document.documentElement.dataset.bucheeTextScale=next;try{localStorage.setItem('buchee_text_scale',next)}catch{}toast(next==='normal'?'Normal yazı boyutu':next==='large'?'Büyük yazı':'Çok büyük yazı');schedule()}
},true);
try{const scale=localStorage.getItem('buchee_text_scale');if(values.includes(scale))document.documentElement.dataset.bucheeTextScale=scale}catch{}
new MutationObserver(schedule).observe(root,{childList:true,subtree:true});schedule();
})();