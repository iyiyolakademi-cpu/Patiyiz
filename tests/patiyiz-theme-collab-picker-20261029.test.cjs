const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const picker=fs.readFileSync('patiyiz-collab-picker-20261029.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-theme-unified-20261029.css','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const runtime={};vm.runInNewContext(picker,{window:runtime,console});
const api=runtime.PatiyizCollabPicker;
function fakeForm(typed,id,selectedHandle){
 const input={value:typed},hidden={value:id};
 const wrap={dataset:{selectedHandle},querySelector:q=>q==='input[name="collab_handle"]'?input:q==='input[name="collab_user_id"]'?hidden:null};
 return {querySelector:q=>q==='[data-pati-collab-picker]'?wrap:null};
}
test('Live profile suggestions and accessible account selection',()=>{
 assert.match(picker,/from\('profiles'\)\.select\('id,handle,display_name,avatar_url,is_verified'\)/);
 assert.match(picker,/\.ilike\('handle',pattern\)/);
 assert.match(picker,/\.ilike\('display_name',pattern\)/);
 for(const t of ['role="combobox"','role="listbox"','role="option"',"event.key==='ArrowDown'","event.key==='Enter'","results.addEventListener('click'","idField.value=p.id"])assert.ok(picker.includes(t),t);
 assert.match(api.makeMarkup('pati-collab-handle'),/name="collab_user_id"/);
});
test('Typed username cannot silently become collaborator',()=>{
 assert.equal(api.selectedId(fakeForm('','',''),false),'');
 assert.equal(api.selectedId(fakeForm('@example','00000000-0000-4000-8000-000000000001','example'),false),'00000000-0000-4000-8000-000000000001');
 assert.throws(()=>api.selectedId(fakeForm('@example','',''),false),/çıkan profillerden/);
 assert.throws(()=>api.selectedId(fakeForm('@changed','00000000-0000-4000-8000-000000000001','example'),false),/çıkan profillerden/);
 assert.throws(()=>api.selectedId(fakeForm('','',''),true),/çıkan profillerden/);
 assert.equal(api.normal('@MiXeD.Name'),'mixed.name');
});
test('Composer and existing post invitation validate selected server profile ID',()=>{
 for(const t of ["makeMarkup('pati-collab-handle')","makeMarkup('collab-handle')","selectedId(form,false)","selectedId(form,true)","patiCollabInvite(postId,rawHandle,selectedUserId)",".eq('id',target).maybeSingle()","user_id:found.data.id"])assert.ok(app.includes(t),t);
});
test('Main routes and paired theme tokens cover light/dark content',()=>{
 const families=['.pati-explore-media-screen','.pati-ig-profile','.pati-feed-card','.pati-dm-layout','.pati-ref-academy-home','.pati-edu-path-home','.pati-pets-page','.pati-pet-hub','.p4-hub','.p4-health','.pati-ref-care','.pati-shop-v2','.p4-shop','.pati-ref-kb-home','.kb-v2','.pati-settings-list','.pati-community-card','.pati-notifications-simple','.care-v2','.wellness-v2','.lost-v2','.adopt-v2','.pati-collab-picker','.pati-ig-summary','.pati-edu-path-item','.empty-state'];
 for(const t of families)assert.ok(css.includes(t),t);
 for(const t of ['--pui-page','--pui-paper','--pui-raised','--pui-text','--pui-secondary','--pui-border','--pui-active','--pui-active-text','html[data-pati-theme="light"]','html[data-pati-theme="dark"]'])assert.ok(css.includes(t),t);
 assert.match(css,/background-color:var\(--pui-paper\)!important;color:var\(--pui-text\)!important/);
 assert.match(css,/background:var\(--pui-active\)!important;color:var\(--pui-active-text\)!important/);
 assert.match(css,/\.mobile-nav-btn\.active :is\(\.icon,small,svg\)/);
});
function luminance(hex){const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function ratio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('Main foreground/background palette passes 4.5:1 contrast',()=>{
 for(const pair of [['#f6f7fa','#1c1e24'],['#c4c7d2','#1c1e24'],['#f6f7fa','#292c35'],['#1c1e23','#ffffff'],['#545864','#ffffff'],['#1c1e23','#f2f3f6'],['#191a20','#f2f3f6']])assert.ok(ratio(...pair)>=4.5,pair.join(' / '));
});
test('New CSS loads last; picker before app; native has both',()=>{
 const sheets=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(sheets.at(-1).includes('patiyiz-profile-chat-repair-20261029.css'), 'final profile and chat fixes should load last');
 assert.ok(sheets.findIndex(x=>x.includes('patiyiz-polish-collab-dm-story-20261029.css'))<sheets.findIndex(x=>x.includes('patiyiz-dm-content-studio-20261029.css')), 'new design follows and preserves existing theme');
 assert.ok(sheets.some(x=>x.includes('patiyiz-theme-unified-20261029.css?v=2')));
 assert.ok(html.indexOf('patiyiz-collab-picker-20261029.js?v=3')<html.indexOf('<script src="app.js?'));
 assert.match(html,/collab_picker_theme_integrity=20261029/);
 assert.match(native,/'patiyiz-collab-picker-20261029\.js'/);
});
