const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-theme-unified-20261029.css','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
function has(regex,msg){assert.match(css,regex,msg)}
test('Unified theme always loads after the 55 legacy styles and ships in Capacitor',()=>{
 const anchor='patiyiz-dark-contrast-audit-20261029.css?v=1';
 const final='patiyiz-theme-unified-20261029.css?v=2';
 assert.ok(html.indexOf(anchor)>=0);
 assert.ok(html.indexOf(final)>html.indexOf(anchor));
 const all=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(all.findIndex(v=>v.includes('patiyiz-theme-unified-20261029.css'))>=0);
 assert.ok(all.some(x=>x.includes('patiyiz-theme-unified-20261029.css')));
 assert.ok(all.at(-1).includes('patiyiz-neutral-chat-profile-20261029.css'), 'neutral design sheet should load last');
 assert.ok(all.findIndex(x=>x.includes('patiyiz-polish-collab-dm-story-20261029.css'))<all.findIndex(x=>x.includes('patiyiz-dm-content-studio-20261029.css')), 'new design follows and preserves existing theme');
 assert.ok(all.findIndex(v=>v.includes('patiyiz-story-view-time-20261029.css'))<all.findIndex(v=>v.includes('patiyiz-theme-unified-20261029.css')));
 assert.match(native,/'patiyiz-theme-unified-20261029\.css'/);
 assert.match(html,/unified-dark-ui=20261029/);
});
test('Explore screenshot: search, filters, empty card are all dark with visible text',()=>{
 assert.match(app,/class="pati-explore-media-screen"/);
 assert.match(app,/class="pati-explore-search-launch"/);
 assert.match(app,/class="pati-explore-sort"/);
 assert.match(app,/empty\('Henüz fotoğraf veya video yok','İlk paylaşımı sen yap!'\)/);
 has(/html\[data-pati-theme="dark"\] #main-content \.pati-explore-media-screen/);
 has(/html\[data-pati-theme="dark"\] #main-content \.pati-explore-sort button\.active/);
 has(/html\[data-pati-theme="dark"\] #main-content \.pati-explore-sort button\[aria-pressed="true"\]/);
 has(/html\[data-pati-theme="dark"\] #main-content \.pati-explore-media-screen>\.empty/);
 has(/\.empty-state,\.pati-search-empty,\.pati-ig-empty/);
 has(/\.empty-state,\.pati-search-empty,\.pati-ig-empty,\.pati-following-empty\) :is\(strong,h1,h2,h3\)/);
 has(/--patix-panel:#1c1d22/);
 has(/--patix-strong:#f5f5f8/);
 has(/--patix-muted:#bec0cc/);
});
test('All five mobile navigation labels and icons remain visibly contrasted in dark mode',()=>{
 assert.match(app,/\['home','Akış','home'\],\['explore','Keşfet','search'\]/);
 assert.match(app,/\['reels','Reels','reels-tab'\],\['profile','Profil','user'\]/);
 assert.match(app,/class="mobile-nav-btn pati-messages-nav/);
 has(/\.mobile-bottom>\.mobile-nav-btn\.active/);
 has(/\.mobile-bottom>\.mobile-nav-btn\[aria-current="page"\]/);
 has(/color:#ffffff!important;background:#373943!important/);
 has(/\.pati-mobile-nav-glyph svg,/);
 has(/stroke:currentColor!important;opacity:1!important/);
 has(/\.mobile-nav-btn>small\{/);
 has(/color:inherit!important;opacity:1!important/);
});
test('Main screen families and forms are covered without changing light mode',()=>{
 const sections=[
 '.pati-feed-card','.pati-ig-profile','.pati-dm-layout','.pati-settings-list',
 '.pati-feature-group','.pati-pet-hub','.pati-health-profile',
 '.pati-care-simple','.pati-shop-v2','.p4-shop','.pati-edu-path-item',
 '.pati-ref-academy-section','.pati-ref-kb-home','.kb-v2','.pati-own-pets-list',
 '.lost-v2','.adopt-v2','.pati-notifications-simple'
 ];
 for(const section of sections)assert.ok(css.includes(section),section);
 has(/data-pati-theme="dark"/);
 assert.match(css,/html\[data-pati-theme="light"\]/);
 has(/#modal-root/);
 has(/input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),select,textarea/);
 has(/prefers-contrast:more/);
});
test('Images, videos, story and Reels full-screen playback are not recolored',()=>{
 assert.doesNotMatch(css,/filter\s*:\s*(invert|brightness|grayscale)\(/i);
 assert.doesNotMatch(css,/\.pati-reel-item\s*\{/);
 assert.doesNotMatch(css,/(?:img|video)\s*\{\s*(?:background|filter|opacity)/i);
});
