/* Home header: left heavy brand, centered feed selector, right black messages. */
(function(){
'use strict';
function mount(){
 const app=document.getElementById('app-root'),header=app?.querySelector(':scope > header.mobile-header');
 if(!header)return;
 const brand=header.querySelector('#pati-feed-menu-trigger'),actions=header.querySelector('.pati-header-actions'),messages=header.querySelector('#pati-header-notifications');
 if(!brand||!actions||!messages)return;
 let selector=header.querySelector('#buchee-home-feed-switch');
 if(!selector){
  selector=document.createElement('button');selector.type='button';selector.id='buchee-home-feed-switch';selector.className='buchee-home-feed-switch';selector.setAttribute('aria-label','Akış türünü değiştir');
  selector.innerHTML='<span class="buchee-home-switch-label">Akış değiştir</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h15m0 0-4-4m4 4-4 4M20 17H5m0 0 4-4m-4 4 4 4"/></svg>';
  brand.after(selector);
  selector.addEventListener('click',()=>brand.click());
 }
 const source=brand.querySelector('.pati-feed-current');
 const label=selector.querySelector('.buchee-home-switch-label');
 if(source&&label){selector.title='Akış değiştir: '+source.textContent;selector.setAttribute('aria-label','Akış değiştir: '+source.textContent)}
 const home=!app.classList.contains('buchee-not-home')&&!document.body.classList.contains('buchee-not-home');
 header.classList.toggle('buchee-home-only-header',home);
}
let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}
function start(){
 mount();
 const app=document.getElementById('app-root');
 if(app)new MutationObserver(schedule).observe(app,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});
 const header=app?.querySelector(':scope > header.mobile-header');
 if(header)new MutationObserver(schedule).observe(header,{childList:true,subtree:true,characterData:true});
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();