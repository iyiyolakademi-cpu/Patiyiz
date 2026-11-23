/* Progressive enhancement only: existing message delivery and recorder remain untouched. */
(()=>{'use strict';
const root=document.getElementById('main-content');if(!root)return;
let currentChat='',seen=new Set(),initialized=false;
function enhance(){
 const windowEl=root.querySelector('.chat-window[data-chat-person]');
 if(!windowEl){currentChat='';seen.clear();initialized=false;return}
 const chat=windowEl.getAttribute('data-chat-person')||'';
 const messages=[...windowEl.querySelectorAll('.chat-history .bubble-chat[data-message-id]')];
 if(chat!==currentChat){currentChat=chat;seen=new Set(messages.map(x=>x.getAttribute('data-message-id')));initialized=true}
 else if(!initialized){seen=new Set(messages.map(x=>x.getAttribute('data-message-id')));initialized=true}
 else for(const bubble of messages){
  const id=bubble.getAttribute('data-message-id');
  if(!id||seen.has(id))continue;
  seen.add(id);
  if(bubble.classList.contains('mine')){
   bubble.classList.add('buchee-dm-new-own');
   bubble.addEventListener('animationend',()=>bubble.classList.remove('buchee-dm-new-own'),{once:true});
  }
 }
 const recording=windowEl.querySelector('.pati-dm-rec-state');
 if(recording&&!recording.querySelector('.buchee-dm-record-wave')){
  const wave=document.createElement('span');
  wave.className='buchee-dm-record-wave';
  wave.setAttribute('aria-hidden','true');
  for(let i=0;i<7;i++)wave.appendChild(document.createElement('i'));
  recording.insertBefore(wave,recording.firstChild);
 }
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
enhance();
})();