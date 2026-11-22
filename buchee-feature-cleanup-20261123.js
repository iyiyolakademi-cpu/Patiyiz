/* Feature presentation cleanup. No account/privacy/reward data is modified. */
(function(){
 'use strict';
 function clean(){
   var root=document.getElementById('app-root');if(!root)return;
   root.querySelectorAll('.pati-ig-profile .pati-ig-tabs button').forEach(function(btn){
     var label=(btn.textContent||'').trim().toLocaleLowerCase('tr');
     if(label==='video'||label==='videolar'){
       btn.hidden=true;btn.style.setProperty('display','none','important');
       btn.setAttribute('aria-hidden','true');btn.tabIndex=-1;
     }
   });
   root.querySelectorAll('.pati-settings-v2 .pati-settings-items').forEach(function(group){
     var seen=new Set();
     Array.from(group.children).forEach(function(el){
       if(!el.classList.contains('pati-settings-row'))return;
       var label=(el.querySelector('.pati-settings-copy strong')?.textContent||'').trim().toLocaleLowerCase('tr');
       var action=el.getAttribute('data-action')||el.getAttribute('data-view')||'';
       if(!label||!action)return;
       var key=label+'|'+action;
       if(seen.has(key)){el.hidden=true;el.style.setProperty('display','none','important');}
       else seen.add(key);
     });
   });
 }
 var scheduled=false;
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;clean()})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){clean();observe()},{once:true});
 else {clean();observe()}
 function observe(){var root=document.getElementById('app-root');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});}
})();
