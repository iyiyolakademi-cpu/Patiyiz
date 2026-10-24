/* Build a native-only static copy. Production PWA files are unchanged. */
import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
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
'photo-studio.js','patiyiz-upload.js','app.js','patiyiz-sw.js',
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
const pushAnchor="async function enablePhonePush(){\n if(!me)return;";
app=replace(app,pushAnchor,pushAnchor+
 "\n if(window.Capacitor?.isNativePlatform?.()){notify('Bu Android test sürümünde bildirimler henüz etkin değil; Firebase/FCM bağlantısı gerekiyor.',true);return;}",
 'native push guard');
const nativeBack=[
"document.addEventListener('patiyiz:native-back',event=>{",
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
app=replace(app,'async function boot(){',nativeBack+'\nasync function boot(){','native-back integration');
await writeFile(path.join(out,'app.js'),app);
for(const {name,code} of [
{name:'supabase-compat.js',code:"import * as supabase from '@supabase/supabase-js';window.supabase=supabase;"},
{name:'tus-compat.js',code:"import * as tus from 'tus-js-client';window.tus=tus;"}
]){
 await build({stdin:{contents:code,resolveDir:native,sourcefile:name+'.source.js'},bundle:true,platform:'browser',format:'iife',target:'es2020',minify:true,logLevel:'warning',outfile:path.join(out,'vendor',name)});
}
await build({entryPoints:[path.join(native,'src','native-shell.js')],bundle:true,platform:'browser',format:'iife',target:'es2020',minify:true,logLevel:'warning',outfile:path.join(out,'native-shell.js')});
if(html.includes('https://cdn.jsdelivr.net/npm/@supabase/')||html.includes('https://cdn.jsdelivr.net/npm/tus-js-client'))throw Error('Unexpected remote SDK');
console.log('Native Android web assets bundled: '+files.length+' files, local Supabase/TUS and native shell.');
