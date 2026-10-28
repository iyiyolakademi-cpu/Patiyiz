const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('style.css','utf8');
const app=fs.readFileSync('app.js','utf8');
const nav=app.slice(app.indexOf('function navRender()'),app.indexOf('function openMobileFeaturesMenu()'));
test('Mobil genişlik ayarı ve Patiyiz başlık bölümü var',()=>{assert.match(html,/name="viewport" content="width=device-width,initial-scale=1(?:,viewport-fit=cover)?"/);assert.match(html,/class="mobile-header"/);assert.match(html,/class="mobile-bottom"/)});
test('Mobil alt menü Akış, Keşfet, Mesajlar, Reels ve Profil içerir',()=>{for(const name of ["'Akış'","'Keşfet'","'Reels'","'Profil'","pati-messages-nav","data-view=\"messages\""])assert.ok(nav.includes(name),name);assert.doesNotMatch(nav,/\['education','Akademi'|\['pets','Patiler'/);assert.match(nav,/data-view/)});
test('Patiyiz menüsü diğer uygulamanın sekmelerini içermez',()=>{assert.doesNotMatch(nav,/founderhub|pets-feed|mobile-more/);assert.match(nav,/pati-messages-nav/);assert.match(nav,/small>\$\{label\}<\/small>/)});
test('Ekran boyutlarına göre uyumlu stiller bulunuyor',()=>{assert.match(css,/@media\(max-width:690px\)/);assert.match(css,/@media\(max-width:740px\)/);assert.match(css,/\.mobile-bottom/);assert.match(css,/\.mobile-header/)});
test('Mobil formda klavye ve güvenli alan stilleri korunur',()=>{assert.match(css,/safe-area-inset-bottom/);assert.match(css,/font-size:16px/);assert.match(html,/id="modal-root"/)});
test('Mobil bildirimler ve içerik paylaşımı erişilebilir',()=>{assert.doesNotMatch(html,/id="pati-header-notifications"/);assert.match(html,/id="pati-header-menu"/);assert.match(app,/pati-feature-notifications-content/);assert.match(html,/class="mobile-fab"/);assert.match(html,/data-action="compose"/)});
test('PWA uygulaması özel alanda ve GitHub Pages alt yolunda açılır',()=>{const m=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));assert.equal(m.id,'./');assert.equal(m.start_url,'./');assert.equal(m.scope,'./')});

test('Gönder, hikâye, Reels menüsü telefonda açılıp kapatılabiliyor',()=>{assert.match(html,/id="pati-create-sheet" hidden/);assert.match(html,/data-action="pati-create-post"/);assert.match(html,/data-action="pati-create-story"/);assert.match(html,/data-action="pati-create-reels"/);assert.match(app,/function openPatiCreate\(\)/);assert.match(app,/function closePatiCreate\(\)/)});
test('Mobil siyah tema güvenli alan ve erişilebilir dokunma hedefleri sunar',()=>{const s=fs.readFileSync('patiyiz-inspired.css','utf8');assert.match(s,/--pati-pink:#17181b/);assert.doesNotMatch(s,/#d02b70|#ed5f9a|#fff0f6/);assert.match(s,/\.pati-media-gallery/);assert.match(s,/@media\(max-width:740px\)/);assert.match(s,/safe-area-inset-bottom/);assert.match(s,/font-size:16px!important/)});

test('Özel alan adı doğrulama dosyası ve yönlendirmeler hazırlanmıştır',()=>{assert.equal(fs.readFileSync('CNAME','utf8').trim(),'patiyiz.com');assert.match(html,/rel="canonical" href="https:\/\/patiyiz\.com\/"/);assert.match(html,/og:url" content="https:\/\/patiyiz\.com\/"/);assert.match(html,/manifest\.webmanifest\?v=20261024-new-p-logo-1/);assert.ok(fs.existsSync('robots.txt'));assert.ok(fs.existsSync('sitemap.xml'));});
