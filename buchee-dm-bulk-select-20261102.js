/* Buchee DM multi-selection: invokes existing per-thread delete action, preserving server permissions. */
(()=>{'use strict';let selecting=false,selected=new Set(),busy=false,pending=false;
const main=()=>document.getElementById('main-content');
function sync(){
 const root=main(),top=root?.querySelector(':scope > .pati-dm-top'),list=root?.querySelector('.pati-dm-layout.mobile-chat-list');if(!top||!list){selecting=false;selected.clear();return}
 let trigger=top.querySelector('.buchee-dm-bulk-trigger');if(!trigger){trigger=document.createElement('button');trigger.type='button';trigger.className='buchee-dm-bulk-trigger';trigger.textContent='⋯';trigger.setAttribute('aria-label','Sohbetleri seç ve toplu sil');trigger.title='Toplu sil';top.querySelector('.pati-dm-top-actions')?.prepend(trigger)}
 trigger.disabled=busy;
 root.classList.toggle('buchee-dm-selecting',selecting);
 let toolbar=root.querySelector('.buchee-dm-bulk-toolbar');
 if(selecting&&!toolbar){toolbar=document.createElement('div');toolbar.className='buchee-dm-bulk-toolbar';top.insertAdjacentElement('afterend',toolbar)}
 if(!selecting)toolbar?.remove();
 for(const row of list.querySelectorAll('.pati-dm-list-row[data-chat-peer]')){let checkbox=row.querySelector('.buchee-dm-checkbox');if(selecting){if(!checkbox){checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='buchee-dm-checkbox';checkbox.setAttribute('aria-label','Sohbeti seç');row.prepend(checkbox)}checkbox.disabled=busy;checkbox.checked=selected.has(row.dataset.chatPeer)}else checkbox?.remove()}
 if(toolbar){toolbar.replaceChildren();const status=document.createElement('span');status.textContent=selected.size+' sohbet seçildi';const del=document.createElement('button');del.className='buchee-dm-remove';del.textContent=busy?'Kaldırılıyor…':'Listemden kaldır';del.disabled=!selected.size||busy;const cancel=document.createElement('button');cancel.textContent='Vazgeç';cancel.disabled=busy;cancel.addEventListener('click',()=>{selecting=false;selected.clear();sync()});del.addEventListener('click',remove);toolbar.append(status,del,cancel)}
}
async function remove(){if(busy||!selected.size)return;const ids=[...selected];if(!confirm(ids.length+' sohbet listenden kaldırılacak. Karşı taraftaki mesajlar silinmez. Devam edilsin mi?'))return;
 busy=true;sync();
 try {if(typeof window.BucheeBulkHideDmThreads!=='function')throw new Error('Toplu silme servisi yüklenmedi.');
 const outcome=await window.BucheeBulkHideDmThreads(ids);
 selected=new Set(outcome.failedIds);selecting=selected.size>0;}
 catch(err){alert(err?.message||'Silme işlemi tamamlanamadı.')}
 finally{busy=false;sync()}
}
document.addEventListener('click',e=>{const t=e.target.closest('.buchee-dm-bulk-trigger');if(t){e.preventDefault();selecting=!selecting;selected.clear();sync();return}if(selecting&&e.target.closest('.pati-dm-list-row[data-chat-peer]')&&!e.target.closest('.buchee-dm-checkbox')){const row=e.target.closest('.pati-dm-list-row');const cb=row.querySelector('.buchee-dm-checkbox');if(cb){e.preventDefault();e.stopPropagation();if(busy)return;cb.checked=!cb.checked;cb.dispatchEvent(new Event('change',{bubbles:true}))}}},true);
document.addEventListener('change',e=>{if(!e.target.matches('.buchee-dm-checkbox'))return;const id=e.target.closest('[data-chat-peer]')?.dataset.chatPeer;if(!id)return;e.target.checked?selected.add(id):selected.delete(id);sync()});
const observer=new MutationObserver(records=>{if(!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('buchee-dm-bulk-toolbar')&&!n.classList?.contains('buchee-dm-checkbox')&&!n.closest?.('.buchee-dm-bulk-toolbar'))))return;if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;sync()})});if(main())observer.observe(main(),{subtree:true,childList:true});sync();
})();