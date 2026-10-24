/* Build a native-only static copy. Production PWA files are unchanged. */
import {readFile,writeFile,mkdir,cp,rm,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const native=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(native,'..'),out=path.join(native,'www');
const files=[
'index.html','admin.html','privacy.html','terms.html','delete-account.html',
'style.css','patiyiz-inspired.css','manifest.webmanifest','config.js','push-config.js',
'knowledge.js','reels-editor.js','gallery-picker.js','academy-curriculum.js',
'academy-101-part1.js','academy-101-part2.js','premium-academy.js','achievements.js',
'photo-studio.js','patiyiz-upload.js','app.js','patiyiz-sw.js','patiyiz-camera-flow.js',
'patiyiz-selected-logo.svg','patiyiz-icon.svg','patiyiz-app-icon-192.png',
'patiyiz-app-icon-512.png','patiyiz-apple-touch-icon.png','patiyiz-favicon-48.png'];
await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'vendor'),{recursive:true});
for(const name of files)await cp(path.join(root,name),path.join(out,name));
let html=await readFile(path.join(out,'index.html'),'utf8');
let app=await readFile(path.join(out,'app.js'),'utf8');
function replace(s,a,b,label){if(!s.includes(a))throw Error('Missing native source anchor: '+label);return s.replace(a,b);}
html=replace(html,'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
 '<script src="vendor/supabase-compat.js"></script>','Supabase CDN');
html=replace(html,'<script src="https://cdn.jsdelivr.net/npm/tus-js-client@4.3.1/dist/tus.min.js" defer></script>',
 '<script src="vendor/tus-compat.js" defer></script>','TUS CDN');
html=replace(html,'<script src="app.js?', '<script src="native-shell.js" defer></script><script src="app.js?','native entry');
html=html.replace(/<link rel="canonical" href="https:\/\/patiyiz\.com\/">/,'');
await writeFile(path.join(out,'index.html'),html);
let admin=await readFile(path.join(out,'admin.html'),'utf8');
admin=admin.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2(?:\.\d+\.\d+)?(?:\/dist\/umd\/supabase\.js)?/g,'vendor/supabase-compat.js');
await writeFile(path.join(out,'admin.html'),admin);
// Native origin is https://localhost. Emails confirm/reset on public HTTPS site,
// then the person returns to the native app and signs in with email/password.
app=app.replaceAll('redirectTo:location.origin+location.pathname',"redirectTo:'https://patiyiz.com/'");
app=app.replaceAll('emailRedirectTo:location.origin+location.pathname',"emailRedirectTo:'https://patiyiz.com/'");
// Android WebView uses https://localhost internally; public links must use the real domain.
app=replace(app,"case 'profile-share':{const u=location.origin+location.pathname;","case 'profile-share':{const u='https://patiyiz.com/';",'public profile sharing');
const nativePostShareSource="location.origin+location.pathname+'#post-'";
if(!app.includes(nativePostShareSource))throw Error('Missing post share URL anchor for native Android');
app=app.replaceAll(nativePostShareSource,"'https://patiyiz.com/#post-'");
app=replace(app,"function showApp(){starter();","function showApp(){starter();if(window.PatiyizNative?.isNative)window.PatiyizNative.setSession(me?.id,sb);",'native auth session');
app=replace(app,"authRoot.classList.add('hidden');appRoot.classList.remove('hidden');navigate(view);","authRoot.classList.add('hidden');appRoot.classList.remove('hidden');navigate(window.PatiyizNative?.consumeScreen()||view);",'native initial route');
app=replace(app,"case 'logout':run(async()=>{const r=await sb.auth.signOut();",
 "case 'logout':run(async()=>{if(window.PatiyizNative?.isNative)await window.PatiyizNative.nativeLogout();const r=await sb.auth.signOut();",'native safe signout');
app=replace(app,"async function disablePhonePush(){if(!me)throw Error('Önce giriş yapmalısın.');",
 "async function disablePhonePush(){if(!me)throw Error('Önce giriş yapmalısın.');if(window.PatiyizNative?.isNative){await window.PatiyizNative.disablePush();return}",'native opt-out');
app=replace(app,"function openComposerMediaPicker(kind){\n const f=document.getElementById('post-form');if(!f)return;",
 "function openComposerMediaPicker(kind){\n const f=document.getElementById('post-form');if(!f)return;",'composer picker');
app=replace(app,"if(!input)return;\n if(kind==='gallery'&&!video&&window.PatiyizGalleryPicker){",
 "if(!input)return;\n if(!video&&window.PatiyizNative?.isNative){void window.PatiyizNative.pickPhotoForInput(input,kind==='camera'?'camera':'photos',kind!=='camera');return}\n if(kind==='gallery'&&!video&&window.PatiyizGalleryPicker){",'native composer picker');
app=replace(app,"if(autoPick)document.querySelector('#story-form input[name=\"story_gallery\"]')?.click();",
 "if(autoPick){const input=document.querySelector('#story-form input[name=\"story_gallery\"]');if(window.PatiyizNative?.isNative)void window.PatiyizNative.pickPhotoForInput(input,'photos');else input?.click()}",'native story auto picker');
app=replace(app,"case 'pati-story-gallery':document.querySelector('#story-form input[name=\"story_gallery\"]')?.click();break;",
 "case 'pati-story-gallery':{const input=document.querySelector('#story-form input[name=\"story_gallery\"]');if(window.PatiyizNative?.isNative)void window.PatiyizNative.pickPhotoForInput(input,'photos');else input?.click();break}",'native story gallery');
app=replace(app,"case 'pati-story-camera':document.querySelector('#story-form input[name=\"story_camera\"]')?.click();break;",
 "case 'pati-story-camera':{const input=document.querySelector('#story-form input[name=\"story_camera\"]');if(window.PatiyizNative?.isNative)void window.PatiyizNative.pickPhotoForInput(input,'camera');else input?.click();break}",'native story camera');
app=replace(app,"case 'pati-dm-gallery-open':document.querySelector('#message-form input[name=\"dm_gallery\"]')?.click();break;",
 "case 'pati-dm-gallery-open':{const input=document.querySelector('#message-form input[name=\"dm_gallery\"]');if(window.PatiyizNative?.isNative)void window.PatiyizNative.pickPhotoForInput(input,'photos');else input?.click();break}",'native private message gallery');
app=replace(app,"if(input?.name==='dm_camera'||input?.name==='dm_gallery'){",
 "if(input?.name==='dm_camera'||input?.name==='dm_gallery'){",'DM fallback intact');
const pushAnchor="async function enablePhonePush(){\n if(!me)return;";
app=replace(app,pushAnchor,pushAnchor+
 "\n if(window.PatiyizNative?.isNative){await window.PatiyizNative.enablePush(me.id,sb);return;}",
 'native push guard');
const nativeBack=[
"document.addEventListener('patiyiz:native-back',event=>{",
" if(window.PatiyizCameraFlow?.active){window.PatiyizCameraFlow.cancel();event.preventDefault();return}",
" if(window.PatiyizGalleryPicker?.active){window.PatiyizGalleryPicker.close();event.preventDefault();return}",
" const sheet=document.getElementById('pati-create-sheet');",
" if(sheet&&!sheet.hidden){closePatiCreate();event.preventDefault();return}",
" if(document.getElementById('story-overlay')){closeStory();event.preventDefault();return}",
" if(document.querySelector('#modal-root .modal')){closeModal();event.preventDefault();return}",
" if(view==='messages'&&mobileChatOpen){mobileChatOpen=false;render();event.preventDefault();return}",
" if(view==='profile'&&lastDetailView&&allowed.includes(lastDetailView)){const dest=lastDetailView;lastDetailView='';navigate(dest);event.preventDefault();return}",
" if(me&&view!=='home'){navigate('home');event.preventDefault();}",
"});"
].join('\n');
const nativeEvents=[
"document.addEventListener('patiyiz:native-info',event=>{if(event.detail?.message)notify(event.detail.message)})",
"document.addEventListener('patiyiz:native-route',event=>{const screen=event.detail?.screen;if(me&&allowed.includes(screen)){window.PatiyizNative?.consumeScreen();navigate(screen)}})",
].join('\n');
app=replace(app,'async function boot(){',nativeBack+'\n'+nativeEvents+'\nasync function boot(){','native-back integration');
await writeFile(path.join(out,'app.js'),app);
for(const {name,code} of [
{name:'supabase-compat.js',code:"import * as supabase from '@supabase/supabase-js';window.supabase=supabase;"},
{name:'tus-compat.js',code:"import * as tus from 'tus-js-client';window.tus=tus;"}
]){
 await build({stdin:{contents:code,resolveDir:native,sourcefile:name+'.source.js'},bundle:true,platform:'browser',format:'iife',target:'es2020',minify:true,logLevel:'warning',outfile:path.join(out,'vendor',name)});
}
await build({entryPoints:[path.join(native,'src','native-shell.js')],bundle:true,platform:'browser',format:'iife',target:'es2020',minify:true,logLevel:'warning',
 define:{__PATIYIZ_FCM_ENABLED__:process.env.PATIYIZ_FCM_ENABLED==='true'?'true':'false'},
 outfile:path.join(out,'native-shell.js')});
if(html.includes('https://cdn.jsdelivr.net/npm/@supabase/')||html.includes('https://cdn.jsdelivr.net/npm/tus-js-client'))throw Error('Unexpected remote SDK');
// Prevent a seemingly successful APK with missing local JS, CSS, icons or manifest.
for(const tag of html.match(/<(?:script|link|img)[^>]*>/gi)||[]){
 const match=tag.match(/(?:src|href)="([^"]+)"/i);
 if(!match)continue;
 const resource=match[1];
 if(['https:','http:','data:','//','#'].some(prefix=>resource.startsWith(prefix)))continue;
 const relative=resource.split(/[?#]/)[0];
 if(!relative)continue;
 const local=path.resolve(out,relative.startsWith('/')?relative.slice(1):relative);
 if(!local.startsWith(out+path.sep))throw Error('Invalid bundled asset path: '+resource);
 try{await access(local)}catch{throw Error('Missing bundled Android asset: '+resource)}
}
if(app.includes('location.origin+location.pathname'))throw Error('Unconverted localhost URL in native app sharing');
console.log('Native Android web assets bundled: '+files.length+' files, local Supabase/TUS and native shell.');
