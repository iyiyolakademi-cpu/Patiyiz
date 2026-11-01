/* Patiyiz push notification service worker */
self.addEventListener('push', event=>{
 let payload={title:'Patiyiz 🐾',body:'Yeni bir bildirimin var.',url:'./'};
 try{const incoming=event.data?.json();if(incoming&&typeof incoming==='object')payload={...payload,...incoming}}catch(_){}
 const title=String(payload.title||'Patiyiz 🐾').slice(0,120);
 const body=String(payload.body||'Yeni bir bildirimin var.').slice(0,220);
 event.waitUntil(self.registration.showNotification(title,{
  body,icon:'./patiyiz-icon.svg?v=20261024-new-p-logo-1',badge:'./patiyiz-icon.svg?v=20261024-new-p-logo-1',tag:'patiyiz-'+String(payload.id||'notice'),
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


/* Small same-origin static cache: faster return visits without storing API/user data.
   Bump the cache version whenever this worker changes. URLs keep their release
   query parameters, so updated CSS/JS assets are distinct cache entries. */
const PATIYIZ_STATIC_CACHE='patiyiz-static-v20261101-mobile-feed-controls-fix';
const PATIYIZ_STATIC_PREFIX='patiyiz-static-v';
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  // Only the anonymous offline shell is cached for navigation fallback.
  const cache=await caches.open(PATIYIZ_STATIC_CACHE);
  try{await cache.add('./offline.html')}catch(_){}
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith(PATIYIZ_STATIC_PREFIX)&&k!==PATIYIZ_STATIC_CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.cache==='no-store')return;
 if(request.mode==='navigate'){
  // User-specific app HTML is never cached. Offline fallback contains no data.
  event.respondWith(fetch(request).catch(async()=>{
   const cache=await caches.open(PATIYIZ_STATIC_CACHE);
   return await cache.match('./offline.html')||Response.error();
  }));
  return;
 }
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 // Never cache HTML, private data, credentials, API requests or media uploads.
 if(!/\.(?:css|js|svg|png|webp|woff2|webmanifest)$/i.test(url.pathname))return;
 if(url.pathname.endsWith('/patiyiz-sw.js'))return;
 event.respondWith((async()=>{
  const cache=await caches.open(PATIYIZ_STATIC_CACHE);
  const cached=await cache.match(request);
  // Keep core application code and styling fresh on iOS home-screen PWAs.
  // If the network is offline, use only an existing cached copy.
  if(/\.(?:js|css)$/i.test(url.pathname)){
   try{
    const fresh=await fetch(request,{cache:'no-store'});
    if(fresh.ok&&fresh.type==='basic'){
     try{await cache.put(request,fresh.clone())}catch(_){}
     return fresh;
    }
    return cached||fresh;
   }catch(error){
    if(cached)return cached;
    throw error;
   }
  }
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok&&response.type==='basic'){
   try{await cache.put(request,response.clone())}catch(_){} // Quota is best effort.
  }
  return response;
 })());
});
