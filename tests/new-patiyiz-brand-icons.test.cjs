const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const logo=fs.readFileSync('patiyiz-selected-logo.svg','utf8');
const push=fs.readFileSync('patiyiz-sw.js','utf8');

test('Sol üst köşe ve giriş ekranları yazısız yeni logo dosyasını kullanıyor',()=>{
 for(const source of [html,app])assert.match(source,/src="patiyiz-selected-logo\.svg\?v=20261024-new-p-logo-1"/);
 assert.match(logo,/viewBox="0 0 768 768"/);
 assert.match(logo,/<rect width="768" height="768" fill="#000"/);
 assert.match(logo,/fill="#fff" fill-rule="evenodd"/);
 assert.doesNotMatch(logo,/<text\b|data:image\/webp|Patiyiz<\/text>/i);
 assert.equal(logo,fs.readFileSync('patiyiz-icon.svg','utf8'));
});
test('Google arama sonucu için 48px PNG favicon kullanılıyor',()=>{
 assert.match(html,/rel="icon" type="image\/png" sizes="48x48" href="patiyiz-favicon-48\.png\?v=20261024-new-p-logo-1"/);
 assert.match(html,/rel="shortcut icon" href="patiyiz-favicon-48\.png\?v=20261024-new-p-logo-1"/);
});
test('iPhone, Android ve PWA kurulum ikonları yeni yazısız logoya bağlı',()=>{
 assert.match(html,/rel="apple-touch-icon" sizes="180x180" href="patiyiz-apple-touch-icon\.png\?v=20261024-new-p-logo-1"/);
 assert.match(html,/manifest\.webmanifest\?v=20261024-new-p-logo-1/);
 assert.deepEqual(manifest.icons.map(x=>x.sizes),['192x192','512x512','any']);
 assert.equal(manifest.icons[0].type,'image/png');
 assert.equal(manifest.icons[1].type,'image/png');
 assert.ok(manifest.icons[1].purpose.includes('maskable'));
 assert.equal(manifest.start_url,'./');
 assert.equal(manifest.id,'./');
 assert.equal(manifest.background_color,'#000000');
});
test('Gerçek PNG dosyaları ve doğru boyutları mevcut',()=>{
 for(const [name,size] of [['patiyiz-favicon-48.png',48],['patiyiz-apple-touch-icon.png',180],['patiyiz-app-icon-192.png',192],['patiyiz-app-icon-512.png',512]]){
  const b=fs.readFileSync(name);
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name);
  assert.equal(b.readUInt32BE(16),size,name+' width');
  assert.equal(b.readUInt32BE(20),size,name+' height');
  assert.ok(b.byteLength>100,name+' content');
 }
});
test('Push bildirimlerinde de eski yeşil pati yerine yeni marka ikonu kullanılır',()=>{
 assert.match(push,/patiyiz-icon\.svg\?v=20261024-new-p-logo-1/);
});
