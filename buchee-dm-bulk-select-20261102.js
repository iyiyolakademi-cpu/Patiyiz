/* Buchee DM multi-selection: invokes existing per-thread delete action, preserving server permissions. */
(()=>{'use strict';let selecting=false,selected=new Set(),busy=false,pending=false;
const main=()=>document.getElementById('main-content');
function sync(){
 const root=main(),top=root?.querySelector(':scope > .pati-dm-top'),list=root?.querySelector('.pati-dm-layout.mobile-chat-list');if(!top||!list){selecting=false;selected.clear();return}
 let trigger=top.querySelector('.buchee-dm-bulk-trigger');if(!trigger){trigger=document.createElement('button');trigger.type='button';trigger.className='buchee-dm-bulk-trigger';trigger.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7"/></svg>';trigger.setAttribute('aria-label','Özel sohbetleri seç ve listemden kaldır');trigger.title='Sohbetleri seç';top.querySelector('.pati-dm-top-actions')?.prepend(trigger)}
 trigger.disabled=busy;
 root.classList.toggle('buchee-dm-selecting',selecting);
 let toolbar=root.querySelector('.buchee-dm-bulk-toolbar');
 if(selecting&&!toolbar){toolbar=document.createElement('div');toolbar.className='buchee-dm-bulk-toolbar';top.insertAdjacentElement('afterend',toolbar)}
 if(!selecting)toolbar?.remove();
 for(const row of list.querySelectorAll('.pati-dm-list-row[data-chat-peer]')){let checkbox=row.querySelector('.buchee-dm-checkbox');if(selecting){if(!checkbox){checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='buchee-dm-checkbox';checkbox.setAttribute('aria-label',((row.querySelector('.chat-person-info strong')?.textContent||'Kullanıcı')+' sohbetini seç'));row.prepend(checkbox)}checkbox.disabled=busy;checkbox.checked=selected.has(row.dataset.chatPeer)}else checkbox?.remove()}
 if(toolbar){toolbar.replaceChildren();const status=document.createElement('span');status.textContent=selected.size+' özel sohbet seçildi';const del=document.createElement('button');del.className='buchee-dm-remove';del.textContent=busy?'Kaldırılıyor…':'Listemden kaldır';del.disabled=!selected.size||busy;const cancel=document.createElement('button');cancel.textContent='Vazgeç';cancel.disabled=busy;cancel.addEventListener('click',()=>{selecting=false;selected.clear();sync()});del.addEventListener('click',remove);toolbar.append(status,del,cancel);const hint=document.createElement('small');hint.textContent='Mesajlar silinmez; gruplar bu işlemden etkilenmez.';toolbar.append(hint)}
}
async function remove(){if(busy||!selected.size)return;const ids=[...selected];if(!confirm(ids.length+' özel sohbet yalnızca senin listenden kaldırılacak. Mesajlar ve grup sohbetleri silinmez. Devam edilsin mi?'))return;
 busy=true;sync();
 try {if(typeof window.BucheeBulkHideDmThreads!=='function')throw new Error('Toplu silme servisi yüklenmedi.');
 const outcome=await window.BucheeBulkHideDmThreads(ids);
 selected=new Set(outcome.failedIds);selecting=selected.size>0;}
 catch(err){alert(err?.message||'Silme işlemi tamamlanamadı.')}
 finally{busy=false;sync()}
}
document.addEventListener('click',e=>{if(selecting&&e.target.closest('.pati-group-thread-row')){e.preventDefault();e.stopPropagation();return;}const t=e.target.closest('.buchee-dm-bulk-trigger');if(t){e.preventDefault();selecting=!selecting;selected.clear();sync();return}if(selecting&&e.target.closest('.pati-dm-list-row[data-chat-peer]')&&!e.target.closest('.buchee-dm-checkbox')){const row=e.target.closest('.pati-dm-list-row');const cb=row.querySelector('.buchee-dm-checkbox');if(cb){e.preventDefault();e.stopPropagation();if(busy)return;cb.checked=!cb.checked;cb.dispatchEvent(new Event('change',{bubbles:true}))}}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selecting&&!busy){selecting=false;selected.clear();sync()}});
document.addEventListener('change',e=>{if(!e.target.matches('.buchee-dm-checkbox'))return;const id=e.target.closest('[data-chat-peer]')?.dataset.chatPeer;if(!id)return;e.target.checked?selected.add(id):selected.delete(id);sync()});
const observer=new MutationObserver(records=>{if(!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('buchee-dm-bulk-toolbar')&&!n.classList?.contains('buchee-dm-checkbox')&&!n.closest?.('.buchee-dm-bulk-toolbar'))))return;if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;sync()})});if(main())observer.observe(main(),{subtree:true,childList:true});sync();
})();