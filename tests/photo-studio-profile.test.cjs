const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
function between(text,a,b){const i=text.indexOf(a),j=text.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing '+a+' -> '+b);return text.slice(i,j)}

test('Mavi tik sadece onaylı profillerde ve @kullanıcıadının yanında görünür',()=>{
 const badge=between(app,'const verifiedBadge=','const avatar=');
 const context={esc:String};
 const make=vm.runInNewContext(badge+'\nverifiedBadge',context);
 assert.equal(make({is_verified:false}),'');
 assert.match(make({is_verified:true}),/pati-verified-blue/);
 assert.match(make({is_verified:true}),/aria-label="Doğrulanmış hesap"/);
 assert.match(make({is_verified:true}),/#2196f3/);
 const profile=between(app,'function profilePage(){','function formField(');
 assert.match(profile,/class="pati-ig-handle-row"/);
 assert.match(profile,/esc\(p.handle\|\|'patiyiz'\)/);
 assert.match(profile,/verifiedBadge\(p\)/);
 assert.doesNotMatch(profile,/button\('Hayvan ekle','pet-add'\)/);
 assert.doesNotMatch(profile,/button\('Menü','tools'\)/);
 assert.match(profile,/button\('Profili düzenle','edit-profile'\)/);
 assert.match(css,/pati-verified-blue/);
 assert.match(app,/data-action="pet-add"/);
});

test('Fotoğraf Stüdyosu kaldırılırken galeri ve profil düzenleme korunur',()=>{
 assert.equal(fs.existsSync('photo-studio.js'),false);
 assert.doesNotMatch(html,/photo-studio\.js/);
 assert.doesNotMatch(app,/PatiyizPhotoStudio|openPostPhotoStudio|openStoryPhotoStudio/);
 assert.doesNotMatch(css,/#pati-photo-studio/);
 assert.match(app,/function openComposerMediaPicker\(kind\)/);
 assert.match(app,/window\.PatiyizGalleryPicker\.open\(chosen/);
 assert.match(app,/updateStoryMediaPreview\(file\);return;/);
 assert.match(app,/patiyizProgressCard\(\)/);
});
test('Profilini Tamamla sadece kendi profilde kalır; ana sayfayı işgal etmez',()=>{
 const home=between(app,'function homePage(){','let savedPostsLoading=');
 const profile=between(app,'function profilePage(){','function formField(');
 assert.doesNotMatch(home,/patiyizProgressCard\(\)/);
 assert.match(home,/storiesStrip\(\)/);
 assert.match(profile,/own\?patiyizProgressCard\(\)/);
});
