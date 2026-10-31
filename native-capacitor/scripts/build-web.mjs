/* Build a native-only static copy. Production PWA files are unchanged. */
import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const native=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(native,'..'),out=path.join(native,'www');
const files=[
'index.html','admin.html','privacy.html','terms.html','delete-account.html',
'style.css','patiyiz-inspired.css','ios-reels.css','follower-milestones.css','dm-fullscreen.css','pets-completion.css','reels-stage4.css','manifest.webmanifest','config.js','push-config.js',
'knowledge.js','reels-editor.js','gallery-picker.js','academy-curriculum.js',
'academy-101-part1.js','academy-101-part2.js','follower-milestones.js',
'instagram-share-clean.css','post-detail-twitter-text-stage16.css','patiyiz-avatar-crop-20261030.js','patiyiz-upload.js','patiyiz-video-prepare.js','patiyiz-camera-draft.js','patiyiz-system-media.js','app.js','patiyiz-sw.js','patiyiz-camera-flow.js',
'pati-coin.svg','profile-explore-coin-polish.css','patiyiz-mobile-rewards-shop-20261025.css','patiyiz-ux-hayvanim-20261025.css','patiyiz-shared-create-studio-20261025.css','patiyiz-selected-logo.svg','patiyiz-icon.svg','patiyiz-app-icon-192.png',
'patiyiz-app-icon-512.png','patiyiz-apple-touch-icon.png','patiyiz-favicon-48.png',
'patiyiz-profile-chat-photo-polish-20261028.css','patiyiz-social-phase1-20261028.css','patiyiz-social-private-groups-20261028.css',
'patiyiz-desktop-responsive-story-20261029.css','patiyiz-delight-20261029.css','patiyiz-theme-contrast-20261029.css','patiyiz-delight-20261029.js','patiyiz-streak-popup-20261029.css','patiyiz-dark-contrast-audit-20261029.css','patiyiz-theme-unified-20261029.css','patiyiz-polish-collab-dm-story-20261029.css','patiyiz-collab-picker-20261029.js','patiyiz-story-view-time-20261029.css','patiyiz-mascot.svg','patiyiz-micro-motion-20261029.css','patiyiz-micro-motion-20261029.js','patiyiz-dm-content-studio-20261029.css','patiyiz-neutral-chat-profile-20261029.css','patiyiz-profile-chat-repair-20261029.css','patiyiz-story-seen-dark-final-20261029.css','patiyiz-creator-crop-20261029.css','patiyiz-compose-stability-20261029.css','patiyiz-crop-insights-mobile-final-20261029.css','patiyiz-settings-private-20261030.css','patiyiz-direct-reposts-dm-media-20261030.css','patiyiz-story-media-mentions-20261030.css','patiyiz-mention-mobile-fix-20261030.css','patiyiz-blue-mentions-dm-20261030.css','patiyiz-comment-profile-only-20261030.css','patiyiz-post-likers-fullscreen-20261030.css','patiyiz-compact-shared-story-20261030.css','patiyiz-black-outgoing-messages-20261030.css','patiyiz-mobile-auth-redesign-20261030.css','patiyiz-clean-story-dm-shares-20261030.css','patiyiz-pan-zoom-photos-20261030.css','patiyiz-social-quality-20261029.css','patiyiz-social-quality-20261029.js'];
// Include every referenced same-origin CSS/JS/image automatically in the native app.
const htmlSource=await readFile(path.join(root,'index.html'),'utf8');
const referenced=[...htmlSource.matchAll(/(?:href|src)="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
for(const file of referenced){
 if(/^[a-zA-Z0-9._-]+\.(?:css|js|svg|png|webp|webmanifest)$/.test(file)&&!files.includes(file))files.push(file);
}
await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'vendor'),{recursive:true});
for(const name of files)await cp(path.join(root,name),path.join(out,name));
await cp(path.join(native,'src/native-reels.css'),path.join(out,'native-reels.css'));
let html=await readFile(path.join(out,'index.html'),'utf8');
let app=await readFile(path.join(out,'app.js'),'utf8');
function replace(s,a,b,label){if(!s.includes(a))throw Error('Missing native source anchor: '+label);return s.replace(a,b);}
html=replace(html,'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
 '<script src="vendor/supabase-compat.js"></script>','Supabase CDN');
html=replace(html,'<script src="https://cdn.jsdelivr.net/npm/tus-js-client@4.3.1/dist/tus.min.js" defer></script>',
 '<script src="vendor/tus-compat.js" defer></script>','TUS CDN');
html=replace(html,'<script src="app.js?', '<script src="native-shell.js" defer></script><script src="app.js?','native entry');
html=replace(html,'</head>','<link rel="stylesheet" href="native-reels.css">\n</head>','native Reels CSS');
html=html.replace(/<link rel="canonical" href="https:\/\/patiyiz\.com\/">/,'');
// Preserve the cascade order but serve one stylesheet inside Capacitor.
 // Source files remain separate and editable. This removes dozens of runtime CSS requests.
 const sourceStyles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
 const stylesheetPieces=[];
 for(const match of sourceStyles){
  const filename=match[1].split('?')[0];
  if(!/^[a-zA-Z0-9._-]+\.css$/.test(filename))throw Error('Unexpected stylesheet reference: '+filename);
  const css=await readFile(path.join(out,filename),'utf8');
  if(/@import\s/i.test(css))throw Error('CSS imports require additional bundle handling: '+filename);
  stylesheetPieces.push('/* '+filename+' */\n'+css);
 }
 if(sourceStyles.length){
  await writeFile(path.join(out,'patiyiz-native-styles.css'),stylesheetPieces.join('\n'));
  html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,'');
  html=html.replace('</head>','<link rel="stylesheet" href="patiyiz-native-styles.css"></head>');
 }
 await writeFile(path.join(out,'index.html'),html);
let admin=await readFile(path.join(out,'admin.html'),'utf8');
admin=admin.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2(?:\.\d+\.\d+)?(?:\/dist\/umd\/supabase\.js)?/g,'vendor/supabase-compat.js');
await writeFile(path.join(out,'admin.html'),admin);
// Native origin is https://localhost. Emails confirm/reset on public HTTPS site,
// then the person returns to the native app and signs in with email/password.
app=app.replaceAll('redirectTo:location.origin+location.pathname',"redirectTo:'https://patiyiz.com/'");
app=app.replaceAll('emailRedirectTo:location.origin+location.pathname',"emailRedirectTo:'https://patiyiz.com/'");
app=replace(app,"function showApp(){starter();","function showApp(){starter();if(window.PatiyizNative?.isNative)window.PatiyizNative.setSession(me?.id,sb);",'native auth session');
app=replace(app,"authRoot.classList.add('hidden');appRoot.classList.remove('hidden');navigate(view);","authRoot.classList.add('hidden');appRoot.classList.remove('hidden');navigate(window.PatiyizNative?.consumeScreen()||view);",'native initial route');
app=replace(app,"case 'logout':run(async()=>{globalThis.PatiyizPrivateMedia?.clear();const r=await sb.auth.signOut();",
 "case 'logout':run(async()=>{globalThis.PatiyizPrivateMedia?.clear();if(window.PatiyizNative?.isNative)await window.PatiyizNative.nativeLogout();const r=await sb.auth.signOut();",'native safe signout');
app=replace(app,"async function disablePhonePush(){if(!me)throw Error('Önce giriş yapmalısın.');",
 "async function disablePhonePush(){if(!me)throw Error('Önce giriş yapmalısın.');if(window.PatiyizNative?.isNative){await window.PatiyizNative.disablePush();return}",'native opt-out');
app=replace(app,"const input=form.querySelector('input[name=\"'+(reel?'video':'photo')+'\"]');if(!input)return;",
 "const input=form.querySelector('input[name=\"'+(reel?'video':'photo')+'\"]');if(!input)return;\n if(!reel&&window.PatiyizNative?.isNative){void window.PatiyizNative.pickPhotoForInput(input,kind==='camera'?'camera':'photos',kind!=='camera');return}",'native composer picker');
// Camera-first story flow handles native gallery and camera through PatiyizCameraFlow.
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
" if(document.getElementById('pati-dm-lightbox')?.open){document.getElementById('pati-dm-lightbox').close();event.preventDefault();return}",
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
console.log('Native Android web assets bundled: '+files.length+' files, local Supabase/TUS and native shell.');
