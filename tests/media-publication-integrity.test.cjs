const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');

const part=(start,end)=>{
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'missing source segment: '+start);
 return app.slice(a,b);
};
const flow=part('function publicationMediaReference(', 'function composeQuestion(){');

function env(extra={}){
 const removed=[],state={author:'owner'};
 const context={
  cfg:{supabaseUrl:'https://example.supabase.co'},
  me:{id:'owner'},
  crypto:{randomUUID(){return '65049122-976f-4fb6-8731-1fb66a6f8027'}},
  URL,Map,Set,console,
  sb:{
   storage:{from(bucket){return{async remove(keys){removed.push({bucket,keys});return{error:null}}}}},
   from(table){return {
    insert(row){state.lastInserted=row;return {select(){return {async single(){return state.insertResult||{data:row,error:null}}}}}},
    select(){return{eq(){return this},async maybeSingle(){return state.readResult||{data:null,error:null}}}}
   }}
  },
  upload:async file=>'https://example.supabase.co/storage/v1/object/public/patiyiz-media/owner/'+file.name,
  uploadVideo:async file=>file?.size?'https://example.supabase.co/storage/v1/object/public/patiyiz-videos/owner/'+file.name:null,
  uploadStatus(){},
  cropPostPhoto:async file=>file,
  renderEditedStoryFile:async file=>file,
  window:{PatiyizReelsEditor:{exportVideo:async()=>({size:800,name:'movie.mp4'})}},
  ...extra
 };
 const fns=vm.runInNewContext(flow+'\n({publicationMediaReference,cleanPublicationMedia,publishMediaRecord,createPostPublication,createStoryPublication})',context);
 return {...fns,context,removed,state};
}
const form=(mode='post',photos=[],video=null)=>({
 dataset:{mode},
 querySelector(sel){
  if(sel.includes('name="photo"'))return{files:photos};
  if(sel.includes('name="cover_photo"'))return{files:[]};
  return null;
 }
});
const data=(video=null)=>({get(name){return name==='video'?video:null}});

test('Paylaşım boşsa ağ veya depolama isteği yapmadan reddedilir',async()=>{
 let requested=0;
 const x=env({upload:async()=>{requested++;return''}});
 await assert.rejects(()=>x.createPostPublication(form(),data(),()=>''),/fotoğraf, video veya yazı/);
 assert.equal(requested,0);
 assert.equal(x.state.lastInserted,undefined);
});

test('Anketin iki seçeneği ve soru başlığı medya yüklemesinden ÖNCE doğrulanır',async()=>{
 let requested=0;
 const x=env({upload:async()=>{requested++;return''}});
 const f={dataset:{storyInput:'story_gallery'}};
 const fdata={get(name){return name==='story_gallery'?{size:100,name:'pet.jpg'}:null}};
 const missingQuestion=k=>({interaction_mode:'poll',interaction_prompt:'',poll_a:'Kedi',poll_b:'Köpek'})[k]||'';
 const missingOption=k=>({interaction_mode:'poll',interaction_prompt:'Favorin?',poll_a:'Kedi',poll_b:''})[k]||'';
 await assert.rejects(()=>x.createStoryPublication(f,fdata,missingQuestion),/başlığı gerekli/);
 await assert.rejects(()=>x.createStoryPublication(f,fdata,missingOption),/iki seçenek gerekli/);
 assert.equal(requested,0);
 assert.equal(x.state.lastInserted,undefined);
});

test('Birden fazla görselden sonra işleme hatasında yüklenmiş dosya yalnızca sahibinden temizlenir',async()=>{
 const x=env();
 const f=form();
 await assert.rejects(
  ()=>x.publishMediaRecord('posts',f,async send=>{
   await send({size:100,name:'first.jpg'},'image');
   throw Error('İkinci görsel bozuk');
  }),
  /İkinci görsel bozuk/
 );
 assert.deepEqual(JSON.parse(JSON.stringify(x.removed)),[{bucket:'patiyiz-media',keys:['owner/first.jpg']}]);
 assert.equal(x.state.lastInserted,undefined);
});

test('DB kaydı reddedilince yüklenen fotoğraf silinir ve kayıt kimliği tekrar denenebilir',async()=>{
 const x=env();
 x.state.insertResult={data:null,error:{message:'RLS insert rejected',code:'42501'}};
 const f=form();
 await assert.rejects(
  ()=>x.publishMediaRecord('posts',f,async send=>({image_url:await send({size:10,name:'unpublished.jpg'},'image')})),
  error=>error.message==='RLS insert rejected'
 );
 assert.deepEqual(JSON.parse(JSON.stringify(x.removed)),[{bucket:'patiyiz-media',keys:['owner/unpublished.jpg']}]);
 assert.equal(f.dataset.patiPublishAttempted,'yes');
 assert.equal(f.dataset.patiPublishId,'65049122-976f-4fb6-8731-1fb66a6f8027');
});

test('İşlemin sonucu bilinmiyorsa dosyalar korunur ve körlemesine ikinci gönderi açılmaz',async()=>{
 const x=env();
 const f=form();
 x.state.insertResult={data:null,error:{message:'NetworkError'}};
 x.state.readResult={data:null,error:{message:'NetworkError'}};
 let sent=0;
 await assert.rejects(()=>x.publishMediaRecord('posts',f,async send=>{sent++;return{image_url:await send({size:10,name:'safe.jpg'},'image')}}),error=>error.message==='NetworkError');
 assert.equal(x.removed.length,0);
 await assert.rejects(()=>x.publishMediaRecord('posts',f,async send=>{sent++;return{}}),/durumu kontrol edilemiyor/);
 assert.equal(sent,1);
});

test('Zaman aşımından sonra aynı kayıt zaten oluşmuşsa yeniden medya yüklenmez',async()=>{
 const x=env();
 const f=form();f.dataset.patiPublishAttempted='yes';f.dataset.patiPublishId='existing-id';
 x.state.readResult={data:{id:'existing-id',author_id:'owner'},error:null};
 let called=0;
 const result=await x.publishMediaRecord('posts',f,async()=>{called++;return{}});
 assert.equal(result.id,'existing-id');
 assert.equal(called,0);
});

test('Görsel temizliği yabancı hesabın dosyasını veya başka bucket dosyalarını silemez',async()=>{
 const x=env();
 await x.cleanPublicationMedia([
  'https://example.supabase.co/storage/v1/object/public/patiyiz-media/owner/own.jpg',
  'https://example.supabase.co/storage/v1/object/public/patiyiz-media/another/no.jpg',
  'https://foreign.invalid/storage/v1/object/public/patiyiz-media/owner/danger.jpg',
  'https://example.supabase.co/storage/v1/object/public/unrelated/owner/no.jpg'
 ],'owner');
 assert.deepEqual(JSON.parse(JSON.stringify(x.removed)),[{bucket:'patiyiz-media',keys:['owner/own.jpg']}]);
});

test('Fotoğraf ve video seçimi varken metin boş olsa da paylaşım yapılabilir',async()=>{
 const x=env();
 const f=form('post',[{size:120,name:'pet.jpg'}]);
 const record=await x.createPostPublication(f,data(),k=>k==='species'?'Kedi':'');
 assert.equal(record.image_url,'https://example.supabase.co/storage/v1/object/public/patiyiz-media/owner/pet.jpg');
 assert.equal(record.id,'65049122-976f-4fb6-8731-1fb66a6f8027');
});

test('MP4 veya WebM MIME eksikse dosya uzantısından geçerli video türü seçilir',async()=>{
 const src=part('async function uploadVideo(file)','async function upload(file)');
 let type='';
 const context={me:{id:'owner'},crypto:{randomUUID:()=> 'uuid'},navigator:{onLine:true},
  uploadStatus(){},console,setTimeout(fn){fn()},
  sb:{storage:{from(){return{
   async upload(_key,_file,options){type=options.contentType;return{error:null}},
   getPublicUrl(){return{data:{publicUrl:'https://example.supabase.co/ok.mp4'}}}
  }}}}
 };
 const upload=vm.runInNewContext(src+'\nuploadVideo',context);
 const url=await upload({size:500,name:'clip.mp4',type:''});
 assert.match(url,/ok\.mp4/);assert.equal(type,'video/mp4');
 await upload({size:500,name:'clip.webm',type:'application/octet-stream'});
 assert.equal(type,'video/webm');
});

test('Yeni yayın akışı kayıt kimliğini sabit tutar ve başarısız içerik doğrulamasını temizler',()=>{
 assert.match(app,/case 'story-form':\{const result=await createStoryPublication\(/);
 assert.match(app,/case 'post-form':\{if\(form.dataset.edit\)/);
 assert.match(app,/if\(!body&&!photoFiles.length&&!hasVideo\)/);
 assert.match(app,/await cleanPublicationMedia\(uploaded\.filter\(url=>!references\.has\(url\)\),owner\)/);
});
