'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Buchee site metadata is consistent with the primary brand',()=>{
 const html=read('index.html');
 assert.match(html,/<title>Buchee Social — Paylaş, keşfet, bağlan<\/title>/);
 assert.match(html,/<div class="brand-word">Buchee<\/div>/);
 assert.match(html,/buchee-concept4-icon\.svg\?v=20261104-concept4/);
 assert.doesNotMatch(html,/BucheeSocial/);
});
test('The home feed keeps its own text wordmark',()=>{
 assert.match(read('index.html'),/id="pati-feed-menu-trigger"[^>]*>[\s\S]*?<span class="buchee-header-serif-wordmark"[^>]*>Buchee<\/span>/);
});
test('Visible copy has no obsolete Patiyiz fallback handle or reward coin terminology',()=>{
 const app=read('app.js');
 assert.doesNotMatch(app,/\|\|'patiyiz'/);
 assert.doesNotMatch(app,/Ödüllere kullanılan coin/);
 assert.match(app,/Ödüllere kullanılan puan/);
 assert.doesNotMatch(app,/<span>patiyiz<\/span>/);
 assert.match(read('patiyiz-camera-flow.js'),/<span>Buchee<\/span>/);
});
test('Visible app copy and placeholders use Buchee',()=>{
 assert.doesNotMatch(read('app.js'),/BucheeSocial|BUCHEESOCIAL/);
 assert.match(read('app.js'),/Buchee’ye katıl!/);
});
test('The selected icon is used in desktop brand and reward feedback',()=>{
 const html=read('index.html');
 for(const file of ['follower-milestones.js','patiyiz-delight-20261029.js','patiyiz-micro-motion-20261029.js']){
  const text=read(file);
  assert.match(text,/buchee-concept4-icon\.svg/);
  assert.doesNotMatch(text,/buchee-social-app-icon\.svg/);
 }
 assert.match(html,/class="brand-icon"><img class="patiyiz-chosen-logo" src="buchee-concept4-icon\.svg/);
});
test('PWA and Android shell share the same brand neutral while technical IDs are retained',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 const android=JSON.parse(read('android/twa-manifest.json'));
 const native=JSON.parse(read('native-capacitor/capacitor.config.json'));
 assert.equal(manifest.name,'Buchee Social');
 assert.equal(manifest.short_name,'Buchee');
 assert.equal(android.name,'Buchee Social');
 assert.equal(android.launcherName,'Buchee');
 assert.equal(native.appName,'Buchee');
 assert.equal(manifest.theme_color,'#17191d');
 assert.equal(manifest.background_color,'#17191d');
 assert(manifest.icons.some(icon=>icon.src.startsWith('buchee-concept4-icon.svg')));
 assert.equal(android.themeColor,'#17191d');
 assert.equal(native.plugins.SplashScreen.backgroundColor,'#17191d');
 assert.equal(android.packageId,'com.patiyiz.app');
 assert.equal(android.host,'patiyiz.com');
});
test('Shared brand CSS is scoped, defines neutral tokens and is linked once',()=>{
 const html=read('index.html');
 const css=read('buchee-brand-identity-20261104.css');
 assert.equal((html.match(/href="buchee-brand-identity-20261104\.css/g)||[]).length,1);
 assert.match(css,/--buchee-brand-ink:#17191d/);
 assert.match(css,/--buchee-brand-subtext:#626873/);
 assert.match(css,/#app-root:not\(\.hidden\) #main-content \.page-intro \.hello/);
});
test('Standalone legal pages have consistent brand name, icon and encoded support links',()=>{
 for(const file of ['privacy.html','terms.html','delete-account.html']){
  const s=read(file);
  assert.match(s,/Buchee Social/);
  assert.match(s,/buchee-concept4-icon\.svg/);
  assert.doesNotMatch(s,/BucheeSocial/);
  assert.doesNotMatch(s,/subject=Buchee Social/);
 }
});
test('Welcome wordmark is monochrome and splash animation itself is not removed',()=>{
 const svg=read('buchee-social-wordmark.svg');
 assert.match(svg,/#17191D/);
 assert.doesNotMatch(svg,/#FC0860|#5700C6/);
 assert.match(read('index.html'),/buchee-opening-caption/);
});
test('PWA push sender name is Buchee, not the old compound label',()=>{
 const sw=read('patiyiz-sw.js');
 assert.match(sw,/title: 'Buchee'/);
 assert.doesNotMatch(sw,/BucheeSocial/);
});