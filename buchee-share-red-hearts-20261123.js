/* Red hearts for sharing, and success-only floating heart bubbles. */
(function(){
'use strict';
function redHearts(root){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode())if(walker.currentNode.nodeValue.includes('💜'))nodes.push(walker.currentNode);
 nodes.forEach(node=>{node.nodeValue=node.nodeValue.replace(/💜/g,'❤️')});
}
let queued=false;
function update(){queued=false;const modal=document.querySelector('#modal-root');if(modal&&modal.querySelector('#post-form'))redHearts(modal)}
function queue(){if(queued)return;queued=true;requestAnimationFrame(update)}
function start(){const root=document.getElementById('modal-root');if(root)new MutationObserver(queue).observe(root,{childList:true,subtree:true,characterData:true});update()}
window.BucheeShareHearts={celebrate(){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const layer=document.createElement('div');layer.className='buchee-share-heart-layer';layer.setAttribute('aria-hidden','true');
 document.body.appendChild(layer);
 for(let i=0;i<18;i++){
  const heart=document.createElement('span');heart.className='buchee-share-heart';heart.textContent='❤️';
  heart.style.setProperty('--offset',String((i-8.5)*17)+'px');
  heart.style.setProperty('--delay',String((i%6)*85)+'ms');
  heart.style.setProperty('--duration',String(1250+(i%5)*190)+'ms');
  heart.style.setProperty('--size',String(16+(i%4)*7)+'px');
  layer.appendChild(heart);
 }
 setTimeout(()=>layer.remove(),3300);
}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();