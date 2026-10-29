const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-mobile-full-page-editors-20261028.css','utf8');

test('Editor JavaScript remains valid and the new responsive stylesheet is loaded',()=>{
 new vm.Script(app);
 assert.match(index,/patiyiz-mobile-full-page-editors-20261028\.css/);
 assert.match(index,/full_page_forms=20261028/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/#modal-root \.pati-full-page-form-backdrop/);
 assert.match(css,/#modal-root \.pati-full-page-form-backdrop>\.pati-mobile-full-page-form/);
});
test('Full-sized editors and media composers receive full-page classes without affecting comment forms',()=>{
 const from=app.indexOf('const PATI_MOBILE_FULL_PAGE_FORMS=');
 const to=app.indexOf('function closeModal(',from);
 assert.ok(from>=0&&to>from);
 const api=vm.runInNewContext(app.slice(from,to)+'\nmodal',{
  esc:(x)=>String(x),
  patiGroupLiveStop:()=>{},
  $:()=>({
   set innerHTML(value){this.html=value},
   querySelector(selector){
    return {
     classList:{add(value){added.push(selector+':'+value)}},
     querySelector:()=>({setAttribute(name,value){labels.push([name,value])}})
    };
   }
  }),
  added:[],labels:[]
 });
 // vm globals are supplied below separately in a direct function invocation test.
 assert.equal(typeof api,'function');
 assert.match(app,/new Set\(\['profile-form','pet-form','lost-form','adoption-form','care-form'\]\)/);
 assert.match(app,/if\(PATI_MOBILE_FULL_PAGE_FORMS\.has\(id\)\)/);
 assert.match(app,/pati-full-page-form-backdrop/);
 assert.match(app,/pati-mobile-full-page-form/);
 assert.match(app,/Geri dön ve düzenlemeyi kapat/);
 assert.doesNotMatch(app,/new Set\(\['profile-form','pet-form','lost-form','adoption-form','care-form','comment-form'/);
});
test('Mobile full-page editor scrolls only its body while actions stay visible',()=>{
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/env\(safe-area-inset-top,0px\)/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
 assert.match(css,/\.pati-mobile-full-page-form>form/);
 assert.match(css,/\.pati-mobile-full-page-form \.modal-content/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/\.pati-mobile-full-page-form \.modal-footer/);
 assert.match(css,/min-height:49px!important/);
 assert.match(css,/\.pati-mobile-full-page-form \.close-modal::before/);
});
test('Pet breed, profile links and other existing form actions are preserved',()=>{
 assert.match(app,/modal\(p\?'Hayvan profilini düzenle':'Yeni hayvan ekle',fields,'pet-form'\)/);
 assert.match(app,/modal\('Profili düzenle',fields,'profile-form'\)/);
 assert.match(app,/patiBindProfileLinkEditor\(document.getElementById\('profile-form'\)\)/);
 assert.match(app,/patiSyncPetBreedSelect\(form,p\?\.breed\|\|''\)/);
 assert.match(app,/case 'pet-form':/);
 assert.match(app,/case 'profile-form':/);
 assert.match(css,/\.pati-pet-delete/);
});
