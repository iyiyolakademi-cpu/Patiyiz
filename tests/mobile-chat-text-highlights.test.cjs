const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const extract=(first,last)=>{
 const i=app.indexOf(first);
 const j=app.indexOf(last,i+first.length);
 assert.ok(i>=0&&j>i,'Missing source block '+first);
 return app.slice(i,j);
};

test('Üst başlıkta mesajlara doğrudan ulaşım bulunur',()=>{
 assert.match(html,/id="pati-header-messages"[^>]*data-view="messages"/);
 assert.match(html,/<use href="#i-message"><\/use>/);
 const navSource=extract('function navRender(){','function side(){');
 const dom={
  '#pati-header-messages':{innerHTML:'',attrs:{},classList:{toggle(){}},setAttribute(a,v){this.attrs[a]=v}},
  '#pati-header-notifications':{innerHTML:'',classList:{toggle(){}}},
  '#desktop-nav':{innerHTML:''},
  '#mobile-nav':{innerHTML:''}
 };
 const context={
  $:selector=>dom[selector]||null,
  view:'home',isAdmin:false,me:{id:'me'},
  unreadCounts:()=>({messages:3,notifications:2}),
  ico:n=>'<svg>'+n+'</svg>',countBadge:n=>'<b>'+n+'</b>',
  nav:[['home','Ana sayfa','home'],['messages','Mesajlar','message']],
  avatar:()=>'<span class="avatar"></span>',current:()=>({id:'me'}),
  data:{},console
 };
 const navRender=vm.runInNewContext(navSource+'\nnavRender',context);
 navRender();
 assert.match(dom['#pati-header-messages'].innerHTML,/message/);
 assert.match(dom['#pati-header-messages'].innerHTML,/>3</);
 assert.equal(dom['#pati-header-messages'].attrs['aria-label'],'Mesajlar, 3 okunmamış mesaj');
 assert.match(dom['#desktop-nav'].innerHTML,/data-view="messages"/);
});

test('Mesaj kutusundan yeni sohbet açılabilir ve diğer kullanıcıya geçilebilir',()=>{
 const msg=extract('function messagesPage(){','function notificationsPage(){');
 assert.match(msg,/data-action="dm-new"/);
 assert.match(app,/case 'dm-new':/);
 assert.ok(app.includes('data-action="chat"'));
 assert.match(app,/case 'chat':if\(!id\|\|id===me.id\)/);
 assert.match(app,/closeModal\(true\);patiDmPendingLatestPeer=id;personId=id;mobileChatOpen=true;navigate\('messages'\)/);
});

test('Paylaş menüsünde ayrı Yazı seçeneği bulunur',()=>{
 assert.match(html,/id="i-text-create"/);
 assert.match(html,/data-action="pati-create-text"/);
 assert.match(html,/href="#i-text-create"/);
 assert.match(app,/case 'pati-create-text':closePatiCreate\(\);compose\(null,'text',false\)/);
});
test('Yazı oluştururken galeri açılmaz, medya alanları gizlenir ve yazı gerekli olur',()=>{
 const source=extract("function compose(post,mode='post',autoPick=true){",'function uploadStatus(');
 let title='',body='',gallery=0,focus=0;
 const form={
  dataset:{},
  querySelector(sel){
   if(sel==='.modal-footer button[type="submit"]')return {set textContent(x){form.submitText=x}};
   if(sel==='.modal-content')return {appendChild(){}};
   if(sel==='textarea[name="body"]')return {focus(){focus++}};
   return null;
  }
 };
 const context={postCropX:0,postCropY:0,postCropRatio:'',postCropZoom:0,postCropIndex:0,
  clearPatiMediaUrls(){},modal:(name,inner)=>{title=name;body=inner},
  postMediaField:()=>'<section data-test="gallery">Photo</section>',
  textField:(name,label,value,required)=>'<textarea name="'+name+'" '+(required?'required':'')+'>'+value+'</textarea>',
  selectField:()=>'<select name="species"></select>',
  petOptions:()=>'<select name="pet_id"></select>',
  document:{getElementById:()=>form,createElement:()=>({className:'',innerHTML:''})},
  species:['Kedi'],window:{},notify(){},
  openComposerMediaPicker:()=>gallery++
 };
 const compose=vm.runInNewContext(source+'\ncompose',context);
 compose(null,'text');
 assert.equal(title,'Yeni yazı');
 assert.equal(form.dataset.mode,'text');
 assert.equal(form.submitText,'Yazıyı paylaş');
 assert.match(body,/name="body" required/);
 assert.doesNotMatch(body,/data-test="gallery"|name="pet_id"|Düzenleme sırasında mevcut medya/);
 assert.equal(gallery,0);
 assert.equal(focus,1);
 compose(null,'post',false);
 assert.match(body,/data-test="gallery"/);
 assert.equal(form.dataset.mode,'post');
 assert.equal(gallery,0);
 assert.match(app,/form\.dataset\.mode==='text'&&!body/);
});

test('Profilde Instagram gibi ayrı öne çıkan albümler oluşturulur',()=>{
 const profile=extract('function profilePage(){','function formField(');
 assert.doesNotMatch(profile,/data-action="highlight-album-new"|pati-ig-highlight-section|Yeni<\/small>/);
 assert.doesNotMatch(profile,/data-action="story-create-highlight"/);
 assert.match(app,/function chooseStoryHighlight\(storyId\)/);
 assert.match(app,/function addStoryToHighlightAlbum\(storyId,albumId\)/);
 assert.match(app,/case 'story-highlight-choose':chooseStoryHighlight\(id\)/);
 assert.match(app,/case 'story-highlight-album'/);
 const composer=extract('function openStoryComposer(','async function renderEditedStoryFile(');
 assert.doesNotMatch(composer,/name="is_highlight"|makeHighlight\?'checked':''/);
 assert.match(app,/is_highlight:false/);
});

test('Mobil uygulama bütün ekran genişliğini, güvenli alanları ve DM sayfasını kullanır',()=>{
 assert.match(html,/viewport-fit=cover/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/#app-root>\.app-shell\{[\s\S]*?max-width:100%!important/);
 assert.match(css,/#app-root>\.mobile-header \.pati-header-messages/);
 assert.match(css,/#main-content \.pati-reels-viewport\{/);
 assert.match(css,/#main-content \.modern-chat\.mobile-chat-open \.chat-window/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/#pati-create-sheet \.pati-create-choice/);
});
