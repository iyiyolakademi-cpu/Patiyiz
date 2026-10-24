const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const block=(start,end)=>{
 const i=app.indexOf(start),j=app.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'Missing '+start);
 return app.slice(i,j);
};

test('Ana sayfada hikâyelerden hemen sonra bütün gönderi türleri gelir, sekme bulunmaz',()=>{
 const main={innerHTML:''};
 const posts=[
  {id:'text1',body:'Yazı',created_at:'2026-10-21T00:00:00Z'},
  {id:'image1',image_url:'photo.jpg',created_at:'2026-10-23T00:00:00Z'},
  {id:'video1',video_url:'movie.mp4',created_at:'2026-10-22T00:00:00Z'}
 ];
 const ctx={data:{posts},blocked:new Set(),selectedPostId:'',
  main,patiyizProgressCard:()=>'',storiesStrip:()=>'<div id="stories"></div>',
  postCard:p=>'<article data-post="'+p.id+'"></article>',
  pageMore:{posts:false},empty:(title)=>title,header:()=>'',button:()=>''};
 const home=vm.runInNewContext(block('function homePage(){','function explorePage()')+'\nhomePage',ctx);
 home();
 assert.match(main.innerHTML,/<div id="stories"><\/div><div class="pati-feed-posts">/);
 assert.doesNotMatch(main.innerHTML,/pati-feed-switch|pati-feed-follow|Fotoğraf &amp; Video|Yazılar|Takip ettiklerim|Tüm gönderiler/);
 assert.deepEqual([...main.innerHTML.matchAll(/data-post="([^"]+)"/g)].map(x=>x[1]),['image1','video1','text1']);
 assert.doesNotMatch(block('function homePage(){','function explorePage()'),/data\.reposts|feedMediaMode|feedFilter/);
});

test('Gönderilerde yeniden paylaş ve başa sabitle düğmeleri kaldırıldı',()=>{
 const src=block('function postCard(', 'function openPost(');
 const profileSrc=block('function profilePage(){','function formField(');
 assert.doesNotMatch(src,/post-repost|post-pin|Yeniden paylaş|Başa sabitle/);
 assert.doesNotMatch(profileSrc,/pati-pin-mark|data\.pins/);
 assert.doesNotMatch(app,/case 'post-repost'|case 'post-pin'/);
 assert.match(src,/data-action="share-post"/);
 assert.match(src,/data-action="save"/);
 assert.match(src,/data-action="comment"/);
 assert.match(src,/data-action="like"/);
 assert.match(src,/data-action="post-menu"/);
 assert.match(app,/case 'post-menu'/);
 assert.match(app,/data-action="edit-post"/);
});

test('Paylaşım penceresinde takip edilenler önce ve yuvarlak avatarlar görünür',()=>{
 const src=block('function openPatiShareModal(','function homePage(){');
 const post={id:'p1',author_id:'me',body:'Patimin hikâyesi',image_url:'https://example.org/cat.jpg'};
 const profiles=[
  {id:'me',display_name:'Ben',handle:'ben',avatar_url:'self.jpg'},
  {id:'a',display_name:'Ayşe',handle:'ayse',avatar_url:'a.jpg'},
  {id:'b',display_name:'Burak',handle:'burak',avatar_url:'b.jpg'}
 ];
 let caption='',markup='',mode='',onInput=null;
 const search={value:'',addEventListener(type,cb){if(type==='input')onInput=cb}};
 const els=[{dataset:{name:'Ayşe ayse'},hidden:false},{dataset:{name:'Burak burak'},hidden:false}];
 const noMatch={hidden:true};
 const context={data:{posts:[post],profiles},blocked:new Set(),followed:new Set(['b']),me:{id:'me'},
  profile:id=>profiles.find(x=>x.id===id),cut:(s,n)=>s.slice(0,n),esc:String,
  avatar:p=>'<span class="avatar l"><img src="'+p.avatar_url+'"></span>',
  displayName:p=>p.display_name,ico:n=>'<svg>'+n+'</svg>',
  modal:(title,contents,id)=>{caption=title;markup=contents;mode=id},
  document:{
   getElementById:id=>id==='pati-share-search'?search:null,
   querySelectorAll:()=>els,
   querySelector:()=>noMatch
  },notify:()=>{}
 };
 const fn=vm.runInNewContext(src+'\nopenPatiShareModal',context);
 fn('p1');
 assert.equal(caption,'Paylaş');
 assert.equal(mode,'share-post-form');
 assert.match(markup,/pati-share-preview/);
 assert.match(markup,/pati-share-avatar/);
 assert.match(markup,/pati-share-people-grid/);
 assert.match(markup,/id="pati-share-search"/);
 assert.match(markup,/data-action="send-post-dm"/);
 assert.match(markup,/a\.jpg/);
 assert.match(markup,/b\.jpg/);
 assert.ok(markup.indexOf('data-id="b"')<markup.indexOf('data-id="a"'),'followed accounts first');
 assert.match(markup,/data-action="pati-copy-post"/);
 assert.match(markup,/data-action="pati-share-system"/);
 search.value='ayşe';onInput();
 assert.equal(els[0].hidden,false);assert.equal(els[1].hidden,true);
 assert.equal(noMatch.hidden,true);
 search.value='bulunamayan';onInput();assert.equal(noMatch.hidden,false);
});

test('Paylaşım ızgarası küçük ekranlarda yuvarlak profil resmi ve erişilebilir dokunma alanı sağlar',()=>{
 assert.match(css,/#share-post-form \.pati-share-people-grid/);
 assert.match(css,/#share-post-form \.pati-share-avatar\{/);
 assert.match(css,/border-radius:50%!important/);
 assert.match(css,/#share-post-form \.pati-share-person\[hidden\]/);
 assert.match(css,/#share-post-form \.pati-share-quick/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(html,/patiyiz-inspired\.css\?v=20261024-search-gallery-1/);
 assert.match(html,/app\.js\?v=20261024-search-gallery-1/);
});

test('Mevcut DM ile paylaşım düğmesi profil kişisine gönderimi sürdürür',()=>{
 assert.match(app,/case 'share-post':openPatiShareModal\(id\)/);
 assert.match(app,/case 'send-post-dm'/);
 assert.match(app,/sb\.from\('messages'\)\.insert\(\{sender_id:me\.id,receiver_id:id,body:/);
});
