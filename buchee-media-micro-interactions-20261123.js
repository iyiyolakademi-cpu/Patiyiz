/* Buchee media + message micro-interactions. Additive and scoped. */
(()=>{'use strict';
const css=document.createElement('style');css.textContent=`
.buchee-reel-hold .pati-reel-play-feedback{opacity:.8}
.buchee-dm-swipe-reply{transition:transform .16s ease}
.buchee-dm-swipe-reply.buchee-dm-swipe-active{transform:translateX(36px)}
.buchee-story-emoji{display:flex;gap:6px;justify-content:center;align-items:center;padding:5px 4px}
.buchee-story-emoji button{background:rgba(20,20,20,.65);color:white;border:1px solid #777;border-radius:100px;min-width:37px;min-height:35px;font-size:19px;cursor:pointer}
@media(prefers-reduced-motion:reduce){.buchee-dm-swipe-reply{transition:none}}
`;document.head.append(css);
let touch=null,held=null;
function editable(el){return !!el?.closest('button,a,input,textarea,select,[contenteditable="true"],[role="button"],.pati-dm-context-menu')}
function start(e){if(e.touches?.length!==1)return;const el=e.target;
const msg=el.closest?.('.chat-history .bubble-chat[data-message-id]');
if(msg&&!editable(el)){touch={kind:'message',el,x:e.touches[0].clientX,y:e.touches[0].clientY,triggered:false};return}
const reel=el.closest?.('.pati-reel-item');const video=reel?.querySelector('video');
if(reel&&video&&!editable(el)){touch={kind:'reel',el:reel,video,x:e.touches[0].clientX,y:e.touches[0].clientY,triggered:false};touch.timer=setTimeout(()=>{if(!touch||touch.kind!=='reel'||touch.el!==reel)return;touch.triggered=true;touch.wasPlaying=!video.paused;if(touch.wasPlaying){video.pause();held=video;reel.classList.add('buchee-reel-hold')}},420)}
}
function move(e){if(!touch||e.touches?.length!==1)return;const dx=e.touches[0].clientX-touch.x,dy=e.touches[0].clientY-touch.y;
if(touch.kind==='reel'&&(Math.abs(dx)>12||Math.abs(dy)>12)){clearTimeout(touch.timer);return}
if(touch.kind==='message'){if(Math.abs(dy)>28){touch=null;return}if(dx>65&&!touch.triggered){touch.triggered=true;touch.el.classList.add('buchee-dm-swipe-reply','buchee-dm-swipe-active')}}}
function end(){if(!touch)return;const state=touch;touch=null;clearTimeout(state.timer);
if(state.kind==='reel'&&state.triggered&&held===state.video){held=null;state.el.classList.remove('buchee-reel-hold');if(state.wasPlaying&&state.video.isConnected)state.video.play().catch(()=>{})}
if(state.kind==='message'&&state.triggered){state.el.classList.remove('buchee-dm-swipe-active');const id=state.el.dataset.messageId;const reply=state.el.querySelector('[data-action="dm-reply"]');if(reply)reply.click();else{const action=document.querySelector('.pati-dm-context-menu [data-action="dm-reply"]');if(action)action.click();else if(id){const b=document.createElement('button');b.type='button';b.hidden=true;b.dataset.action='dm-reply';b.dataset.id=id;state.el.append(b);b.click();b.remove()}}}
}
document.addEventListener('touchstart',start,{passive:true});document.addEventListener('touchmove',move,{passive:true});document.addEventListener('touchend',end,{passive:true});document.addEventListener('touchcancel',end,{passive:true});
function enhance(){
const root=document.getElementById('story-overlay');
if(!root||root.classList.contains('pati-story-own')||root.querySelector('.buchee-story-emoji'))return;
const form=root.querySelector('.buchee-story-reply');const input=form?.querySelector('input[name="reply"]');if(!input)return;
const wrap=document.createElement('div');wrap.className='buchee-story-emoji';wrap.setAttribute('aria-label','Hızlı hikâye yanıtları');
for(const emoji of ['❤️','😂','🔥','👏']){const b=document.createElement('button');b.type='button';b.textContent=emoji;b.setAttribute('aria-label',emoji+' ile yanıtla');b.addEventListener('click',()=>{input.value=emoji;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()});wrap.append(b)}
form.before(wrap)
}
let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}).observe(document.body,{childList:true,subtree:true});enhance();
})();