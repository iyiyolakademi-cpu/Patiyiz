/* Patiyiz Android native bridge. No private Firebase keys belong in this bundle. */
import {Capacitor,registerPlugin} from '@capacitor/core';
import {App} from '@capacitor/app';
import {StatusBar,Style} from '@capacitor/status-bar';
import {Keyboard} from '@capacitor/keyboard';
import {Camera,CameraResultType,CameraSource} from '@capacitor/camera';
import {PushNotifications} from '@capacitor/push-notifications';

const native=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
const firebaseConfigured=__PATIYIZ_FCM_ENABLED__;
const validScreens=new Set(['home','messages','notifications','explore','profile','education','premium','rewards']);
let queuedScreen='',activeUser='',activeClient=null,registeredToken='',notificationListeners=false;
const nativeToast=(message)=>document.dispatchEvent(new CustomEvent('patiyiz:native-info',{detail:{message}}));
function routeWebUrl(raw){
 try{
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.hostname!=='patiyiz.com'||url.pathname.replace(/\/$/,'')!=='/open')return false;
  const screen=url.searchParams.get('screen')||'home';
  if(!validScreens.has(screen))return false;
  queuedScreen=screen;
  document.dispatchEvent(new CustomEvent('patiyiz:native-route',{detail:{screen}}));
  return true;
 }catch{return false}
}
async function blobAsFile(webPath,name){
 const response=await fetch(webPath);
 if(!response.ok)throw new Error('Seçilen fotoğraf okunamadı.');
 const blob=await response.blob();
 if(blob.size>25*1024*1024)throw new Error('Fotoğraf 25 MB sınırını aşıyor.');
 return new File([blob],name,{type:blob.type||'image/jpeg',lastModified:Date.now()});
}
async function pickPhotoForInput(input,source='photos',multiple=false){
 if(!native||!input?.isConnected)return false;
 if(input.dataset.nativePicking==='1')return true;
 input.dataset.nativePicking='1';
 try{
  let photos=[];
  if(source==='photos'&&multiple){
   const selected=await Camera.pickImages({limit:10,quality:85});
   photos=selected.photos||[];
  }else{
   const photo=await Camera.getPhoto({source:source==='camera'?CameraSource.Camera:CameraSource.Photos,resultType:CameraResultType.Uri,quality:85,correctOrientation:true,saveToGallery:false});
   if(photo?.webPath)photos=[photo];
  }
  if(!photos.length)return true;
  const transferred=new DataTransfer();
  for(let i=0;i<Math.min(10,photos.length);i++){
   const p=photos[i];
   if(p.webPath)transferred.items.add(await blobAsFile(p.webPath,'patiyiz-'+Date.now()+'-'+i+'.'+(p.format||'jpeg')));
  }
  if(!transferred.files.length)return true;
  input.files=transferred.files;
  input.dispatchEvent(new Event('change',{bubbles:true}));
 }catch(e){
  const message=String(e?.message||e);
  if(!/cancel|dismiss|iptal|user cancelled/i.test(message))nativeToast('Fotoğraf açılamadı: '+message);
 }finally{delete input.dataset.nativePicking}
 return true;
}
async function saveToken(token){
 if(!activeUser||!activeClient||!token||token.length<40)return;
 const userId=activeUser;
 const result=await activeClient.from('patiyiz_native_push_tokens').upsert({user_id:userId,token,platform:'android'},{onConflict:'token'});
 if(result.error)throw result.error;
 if(activeUser===userId)registeredToken=token;
}
async function attachPushListeners(){
 if(notificationListeners||!firebaseConfigured)return;
 notificationListeners=true;
 await PushNotifications.addListener('registration',async result=>{
  try{await saveToken(result.value)}catch(e){console.warn('Patiyiz FCM registration:',e);nativeToast('Android bildirim kaydı tamamlanamadı.')}
 });
 await PushNotifications.addListener('registrationError',e=>nativeToast('Bildirim kaydı başarısız: '+String(e.error||'FCM')));
 await PushNotifications.addListener('pushNotificationActionPerformed',()=>routeWebUrl('https://patiyiz.com/open?screen=notifications'));
}
async function enablePush(userId,client){
 if(!native)return false;
 if(!firebaseConfigured){nativeToast('Android bildirimleri için Firebase yapılandırması henüz tamamlanmadı.');return false}
 if(!userId||!client)return false;
 activeUser=userId;activeClient=client;
 try{
  await attachPushListeners();
  let permission=await PushNotifications.checkPermissions();
  if(permission.receive!=='granted')permission=await PushNotifications.requestPermissions();
  if(permission.receive!=='granted'){nativeToast('Bildirim izni verilmedi.');return false}
  await PushNotifications.register();
  nativeToast('Android bildirim izni verildi. Cihaz kaydı tamamlanıyor.');
  return true;
 }catch(e){nativeToast('Bildirim etkinleştirilemedi: '+String(e?.message||e));return false}
}
async function disablePush(){
 if(!activeClient||!activeUser)return;
 try{
  if(registeredToken)await activeClient.from('patiyiz_native_push_tokens').delete().eq('token',registeredToken).eq('user_id',activeUser);
 }catch(e){console.warn('FCM device unlink:',e)}
 registeredToken='';
}
async function nativeLogout(){await disablePush();activeUser='';activeClient=null}
// In the packaged Android app, portrait Story/Reels capture may use the
// entire physical screen (the system status bar returns on camera close).
let cameraStatusQueue=Promise.resolve();
function setCameraImmersive(active){
 if(!native)return Promise.resolve();
 cameraStatusQueue=cameraStatusQueue.then(()=>active?StatusBar.hide():StatusBar.show()).catch(err=>console.warn('Camera status bar:',err));
 return cameraStatusQueue;
}
window.PatiyizNative={isNative:native,firebaseConfigured,pickPhotoForInput,enablePush,disablePush,nativeLogout,setCameraImmersive,
 setSession(userId,client){
  activeUser=userId||'';activeClient=client||null;
  if(native&&firebaseConfigured&&activeUser&&activeClient){
   void (async()=>{
    await attachPushListeners();
    const permission=await PushNotifications.checkPermissions();
    if(permission.receive==='granted')await PushNotifications.register();
   })().catch(e=>console.warn('FCM resume registration failed:',e?.message||e));
  }
 },
 consumeScreen(){const screen=queuedScreen;queuedScreen='';return screen},
 routeWebUrl};
if(native){
 window.PATIYIZ_ANDROID_NATIVE=true;
 const NativeGallery=registerPlugin('PatiyizGallery');
 window.PatiyizNativeGallery={
  getPhotos:options=>NativeGallery.getPhotos(options),
  readPhoto:options=>NativeGallery.readPhoto({id:typeof options==='string'?options:options.id}),
  ensureCamera:()=>NativeGallery.ensureCamera()
 };

 document.documentElement.classList.add('patiyiz-native-android');
 void StatusBar.setOverlaysWebView({overlay:false}).catch(console.warn);
 void StatusBar.setBackgroundColor({color:'#000000'}).catch(console.warn);
 void StatusBar.setStyle({style:Style.Light}).catch(console.warn);
 void Keyboard.addListener('keyboardDidShow',()=>document.documentElement.classList.add('patiyiz-native-keyboard-visible')).catch(console.warn);
 void Keyboard.addListener('keyboardDidHide',()=>document.documentElement.classList.remove('patiyiz-native-keyboard-visible')).catch(console.warn);
 void App.addListener('appStateChange',({isActive})=>{
  if(!isActive){document.querySelectorAll('.pati-reel-video,.pati-post-video').forEach(video=>video.pause());return}
  document.dispatchEvent(new Event('patiyiz:native-resume-media'));
 }).catch(console.warn);
 void App.addListener('backButton',async()=>{
  const back=new CustomEvent('patiyiz:native-back',{cancelable:true});document.dispatchEvent(back);
  if(!back.defaultPrevented)await App.minimizeApp().catch(console.warn);
 }).catch(console.warn);
 if(firebaseConfigured)void attachPushListeners().catch(e=>console.warn('FCM listeners unavailable:',e?.message||e));
 void App.addListener('appUrlOpen',e=>routeWebUrl(e.url)).catch(console.warn);
 void App.getLaunchUrl().then(e=>{if(e?.url)routeWebUrl(e.url)}).catch(console.warn);
}
