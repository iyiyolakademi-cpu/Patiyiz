/* Equalize the BLACK BUTTON BOXES, not the glyphs. */
(()=>{'use strict';
function fix(){
 const h=document.querySelector('#app-root > header.mobile-header');
 const a=h?.querySelector('#pati-header-notifications'),b=h?.querySelector('#buchee-header-messages');
 if(!a||!b)return;
 const group=a.parentElement;
 if(group&&b.parentElement===group){
  group.style.setProperty('display','flex','important');
  group.style.setProperty('gap','9px','important');
  group.style.setProperty('width','85px','important');
  group.style.setProperty('min-width','85px','important');
  group.style.setProperty('max-width','85px','important');
 }
 [a,b].forEach(el=>{
  const props={
   'box-sizing':'border-box','display':'flex','position':'relative','align-items':'center',
   'justify-content':'center','flex':'0 0 38px','flex-basis':'38px',
   'width':'38px','min-width':'38px','max-width':'38px',
   'height':'38px','min-height':'38px','max-height':'38px',
   'inline-size':'38px','block-size':'38px','min-inline-size':'38px','max-inline-size':'38px',
   'min-block-size':'38px','max-block-size':'38px',
   'aspect-ratio':'1 / 1','padding':'7px','margin':'0',
   'background':'#111214','background-color':'#111214','background-image':'none',
   'border':'1px solid #111214','border-radius':'11px',
   'box-shadow':'none','filter':'none','transform':'none',
   'scale':'1','opacity':'1','visibility':'visible','overflow':'hidden'
  };
  for(const [k,v] of Object.entries(props))el.style.setProperty(k,v,'important');
 });
}
let scheduled=false;
function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;fix()})}
function start(){fix();const header=document.querySelector('#app-root > header.mobile-header');if(header)new MutationObserver(queue).observe(header,{childList:true,subtree:false});window.addEventListener('resize',queue,{passive:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();