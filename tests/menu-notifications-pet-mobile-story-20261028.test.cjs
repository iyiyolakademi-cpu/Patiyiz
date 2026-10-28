const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const media=fs.readFileSync('patiyiz-system-media.js','utf8');
const camera=fs.readFileSync('patiyiz-camera-flow.js','utf8');
const css=fs.readFileSync('patiyiz-menu-pet-profile-portrait-20261028.css','utf8');
function between(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a+' range');return s.slice(i,j)}

test('New app/system camera JavaScript remains parsable',()=>{
 new vm.Script(app,{filename:'app.js'});
 new vm.Script(media,{filename:'patiyiz-system-media.js'});
});
test('Top-right notification bell is removed, left share button and features menu remain',()=>{
 const header=html.slice(html.indexOf('<header class="mobile-header">'),html.indexOf('</header>',html.indexOf('<header class="mobile-header">')));
 assert.match(header,/id="pati-header-share"/);
 assert.match(header,/id="pati-header-menu"/);
 assert.doesNotMatch(header,/id="pati-header-notifications"/);
 const script=between(app,'function navRender(){','function patiMenuNotificationsHTML(){');
 assert.match(script,/#pati-header-notifications/); // legacy no-op safe when element is absent
 assert.match(html,/menu_pet_story_20261028=1/);
});
test('Features menu contains actual current notification rows and per-item delete button',()=>{
 const src=between(app,'function patiMenuNotificationsHTML(){','const patiCoinTasks=');
 let page='',updated='',removed=false;
 const input={notificationVisible:()=>[{id:'notice-1',text:'Selam'}],notificationRows:items=>items.map(x=>'<button data-action="notification-delete" data-id="'+x.id+'">Sil</button>').join(''),
  esc:String,ico:()=>'<svg/>',isAdmin:false,
  modal:(title,body)=>{page=body},$:(q)=>q==='#tools-form .modal-footer'?{remove(){removed=true}}:null,
  document:{getElementById:()=>({set innerHTML(x){updated=x}})}
 };
 vm.createContext(input);
 vm.runInContext(src+'\nglobalThis.api={openMobileFeaturesMenu,patiMenuRenderNotifications}',input);
 input.api.openMobileFeaturesMenu();
 assert.match(page,/pati-feature-notifications-content/);
 assert.match(page,/data-action="notification-delete" data-id="notice-1"/);
 assert.match(page,/data-view="notifications"/);
 assert.equal(removed,true);
 input.api.patiMenuRenderNotifications();
 assert.match(updated,/notice-1/);
});
test('Existing notification delete still verifies owner and updates menu after deletion',()=>{
 const p=app.slice(app.indexOf("case 'notification-delete':"),app.indexOf("case 'notifications-delete-all':"));
 assert.match(p,/\.delete\(\)\.eq\('id',id\)\.eq\('owner_id',uid\)/);
 assert.match(p,/patiMenuRenderNotifications\(\)/);
 assert.match(app,/case 'open-notification':if\(target\.closest\('#tools-form'\)\)closeModal\(true\)/);
});
test('New pet entry uses the same profile edit visual layout without touching data field names',()=>{
 const src=between(app,'function editPet(p){','function questionReplies(id){');
 let result='';
 const ctx={me:{id:'u'},petIcon:()=> '🐱',esc:String,
  species:['Kedi','Köpek'],petGenders:['Belirtilmedi'],formField:(name)=>'<input name="'+name+'">',selectField:(name)=>'<select name="'+name+'"></select>',
  textField:(name)=>'<textarea name="'+name+'"></textarea>',
  modal:(title,fields)=>{result=title+' '+fields},$:()=>({dataset:{edit:''},querySelector:()=>({textContent:''})}),
  document:{querySelector:()=>({classList:{add(){} }})},notify:()=>{}};
 vm.runInNewContext(src+'\neditPet',ctx)();
 for(const name of ['name','species','gender','age','breed','personality','notes'])assert.match(result,new RegExp('name="'+name+'"'));
 assert.match(result,/pati-edit-cover/);assert.match(result,/pati-edit-sections/);
 assert.match(result,/pati-edit-avatar/);assert.match(result,/pati-pet-photo/);
 assert.match(css,/pati-pet-edit-fields-row/);
});
test('Mobile profile stays Instagram-like with 3 equal tile columns and no added UI functions',()=>{
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/pati-ig-summary/);
 assert.match(css,/pati-ig-avatar/);
 assert.match(css,/pati-ig-stats/);
 assert.match(css,/pati-profile-tile/);
 assert.match(css,/@media\(max-width:370px\)/);
});
test('Story photo opens platform camera, not an embedded viewfinder',()=>{
 const mount=between(app,'function mountPatiyizCamera(mode){','function startPatiCameraPost(){');
 assert.match(mount,/const mediaFlow=window\.PatiyizSystemMediaFlow/);
 assert.match(mount,/mediaFlow\.open\(/);
 assert.doesNotMatch(mount,/window\.PatiyizCameraFlow|onStoryPhotoCamera/);
 assert.match(media,/capture="environment"/);
 assert.match(media,/name==='camera-photo'/);
 assert.match(media,/pickPhotoForInput\(input,'camera',false\)/);
 assert.doesNotMatch(media,/action==='camera-photo'&&state\.mode==='story'/);
});

