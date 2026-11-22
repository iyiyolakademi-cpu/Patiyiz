/* Home-only header: keep original profile header and hamburger, hide home brand and inbox on profile. */
(function(){
'use strict';
function sync(){
 var app=document.getElementById('app-root');
 var main=document.getElementById('main-content');
 if(!app||!main)return;
 var profile=!!main.querySelector('.pati-ig-profile');
 app.classList.toggle('buchee-profile-original-header',profile);
}
var scheduled=false;
function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;sync()})}
function start(){sync();var main=document.getElementById('main-content');if(main)new MutationObserver(queue).observe(main,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
