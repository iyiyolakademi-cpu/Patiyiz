/* Android native bridge: only runs from a Capacitor WebView. */
import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {StatusBar,Style} from '@capacitor/status-bar';
import {Keyboard} from '@capacitor/keyboard';

if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'){
 window.PATIYIZ_ANDROID_NATIVE=true;
 document.documentElement.classList.add('patiyiz-native-android');
 // Android owns the top system bar; Patiyiz owns the in-app navigation.
 void StatusBar.setOverlaysWebView({overlay:false}).catch(console.warn);
 void StatusBar.setBackgroundColor({color:'#000000'}).catch(console.warn);
 void StatusBar.setStyle({style:Style.Light}).catch(console.warn);
 void Keyboard.addListener('keyboardDidShow',()=>{
  document.documentElement.classList.add('patiyiz-native-keyboard-visible');
 }).catch(console.warn);
 void Keyboard.addListener('keyboardDidHide',()=>{
  document.documentElement.classList.remove('patiyiz-native-keyboard-visible');
 }).catch(console.warn);
 void App.addListener('backButton',async()=>{
  const back=new CustomEvent('patiyiz:native-back',{cancelable:true});
  document.dispatchEvent(back);
  if(!back.defaultPrevented)await App.minimizeApp().catch(console.warn);
 }).catch(console.warn);
}
