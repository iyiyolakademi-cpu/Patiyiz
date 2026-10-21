/* Patiyiz push notification service worker */
self.addEventListener('push', event=>{
 let payload={title:'Patiyiz 🐾',body:'Yeni bir bildirimin var.',url:'./'};
 try{const incoming=event.data?.json();if(incoming&&typeof incoming==='object')payload={...payload,...incoming}}catch(_){}
 const title=String(payload.title||'Patiyiz 🐾').slice(0,120);
 const body=String(payload.body||'Yeni bir bildirimin var.').slice(0,220);
 event.waitUntil(self.registration.showNotification(title,{
  body,icon:'./patiyiz-icon.svg',badge:'./patiyiz-icon.svg',tag:'patiyiz-'+String(payload.id||'notice'),
  data:{url:payload.id?'./?notification='+encodeURIComponent(String(payload.id)):'./'},renotify:false
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const url=new URL(event.notification.data?.url||'./',self.registration.scope).href;
  for(const win of windows){if(new URL(win.url).origin===self.location.origin){if(typeof win.navigate==='function')await win.navigate(url);await win.focus();return}}
  await self.clients.openWindow(url);
 })());
});
