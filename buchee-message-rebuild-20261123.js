/* Single source of truth for the two header actions. */
(()=>{'use strict';
const icon='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath d="M20.5 11.6c0 4.5-3.7 8.1-8.4 8.1-1.4 0-2.7-.3-3.9-.9L3.6 20l1.5-4.3a7.9 7.9 0 0 1-1.4-4.1c0-4.5 3.7-8.1 8.4-8.1s8.4 3.6 8.4 8.1Z" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/%3E%3C/svg%3E';
function repair(){
 const header=document.querySelector('#app-root > header.mobile-header');if(!header)return;
 const group=header.querySelector('.pati-header-actions');const heart=header.querySelector('#pati-header-notifications');
 if(!group||!heart)return;
 let msg=header.querySelector('#buchee-header-messages');
 if(!msg){msg=document.createElement('button');msg.type='button';msg.id='buchee-header-messages';group.append(msg)}
 msg.dataset.view='messages';msg.setAttribute('aria-label','Mesajlar');msg.title='Mesajlar';
 msg.className='buchee-header-message-rebuilt';
 // Use an HTML element with an image background: independent of SVG <use> sprites and icon stroke overrides.
 let glyph=msg.querySelector('.buchee-message-glyph');
 if(!glyph){msg.replaceChildren();glyph=document.createElement('span');glyph.className='buchee-message-glyph';glyph.setAttribute('aria-hidden','true');msg.append(glyph)}
 glyph.style.setProperty('background-image','url("'+icon+'")','important');
 for(const [key,value] of Object.entries({'display':'block','visibility':'visible','opacity':'1','width':'29px','height':'29px','min-width':'29px','min-height':'29px','background-repeat':'no-repeat','background-position':'center','background-size':'contain','background-color':'transparent','filter':'none'}))glyph.style.setProperty(key,value,'important');
 group.querySelectorAll('button[data-view="messages"]').forEach(el=>{if(el!==msg)el.remove()});
 if(msg.parentElement!==group)group.append(msg);
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})}
function start(){repair();const header=document.querySelector('#app-root > header.mobile-header');if(header)new MutationObserver(schedule).observe(header,{childList:true,subtree:false})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();