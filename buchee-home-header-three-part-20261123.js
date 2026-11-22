/* Keep the original feed selector. Remove the duplicate injected by an older header patch. */
(function(){
'use strict';
function cleanup(){
 const header=document.querySelector('#app-root > header.mobile-header');
 if(!header)return;
 header.querySelectorAll('#buchee-home-feed-switch').forEach(el=>el.remove());
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;cleanup()})}
function start(){cleanup();const header=document.querySelector('#app-root > header.mobile-header');if(header)new MutationObserver(schedule).observe(header,{childList:true,subtree:false})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();