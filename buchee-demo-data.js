function bucheeDemoData(id) {
 const ago = minutes => new Date(Date.now() - minutes * 60000).toISOString();
 const photo = name => 'demo-media/' + name + '.jpg';
 const portrait = number => number?'demo-media/portraits/tr-'+String(number).padStart(2,'0')+'.jpg':'';
 const people = [
  [id, 'Deniz Kaya', 'denizkaya', 'kadikoy', 'İstanbul · Fotoğraf, kitap ve uzun yürüyüşler'],
  ['ece', 'Ece Yılmaz', 'eceyolda', 'kahve', 'Şehirde sakin köşeler arıyorum.'],
  ['mert', 'Mert Aydın', 'mertkadraj', 'sahil', 'Günün ışığını kaçırmam.'],
  ['selin', 'Selin Demir', 'selinokuyor', 'kitap', 'Biraz kitap, biraz kahve.'],
  ['arda', 'Arda Koç', 'ardagundelik', 'kedi', 'Ev arkadaşım Tarçın.'],
  ['irem', 'İrem Aksoy', 'iremyuruyor', 'yuruyus', 'Hafta sonu rotaları.']
 ];
 // These assignments are for fictional demo characters and their generated portraits.
 const primaryPortraits=[2,1,5,3,0,8];
 const profiles = people.map(([id, display_name, handle, , bio],index) => ({
  id, display_name, handle, bio, avatar_url: portrait(primaryPortraits[index]), created_at: ago(10080)
 }));
 const entries = [
  ['ece', 'kahve', 'Yağmur dinene kadar oturacaktım. İkinci kahveyi söyledim. ☕', 18],
  ['mert', 'kadikoy', 'Vapura yetişmek yerine ışığın değişmesini bekledim.', 34],
  ['arda', 'kedi', 'Tarçın bugün toplantının ortasında klavyeye oturdu. Sanırım artık ekip lideri.', 58],
  ['selin', 'kitap', 'Sahaf turundan elim boş dönemedim. Üstteki kitap bu akşamın planı.', 96],
  ['irem', 'yuruyus', 'Telefonu uçak moduna alıp yürüdüğüm o iki saat çok iyi geldi.', 140],
  [id, 'sahil', 'Bu sabah sahile erken indim. Şehir uyanmadan su bambaşka.', 182]
 ];
 const posts = entries.map(([author_id, image, body, age], i) => ({
  id: 'demo-photo-' + i, author_id, body, image_url: photo(image), post_format: 'image', created_at: ago(age)
 }));
 posts.push(
  {id:'demo-text-1', author_id:'selin', body:'Bir kitabı yarıda bırakmak için kendinize kaç sayfa veriyorsunuz? Benim sınırım 50.', post_format:'text', created_at:ago(42)},
  {id:'demo-text-2', author_id:'ece', body:'Bir arkadaşım İstanbul’a ilk kez geliyor. Tek bir semt gezdirecek olsanız nereyi seçerdiniz?', post_format:'text', created_at:ago(110)},
  {id:'demo-text-3', author_id:id, body:'Hafta sonu için vapur, sahaf ve kahve. Sıralamayı henüz çözemedim.', post_format:'text', created_at:ago(210)},
  {id:'demo-reel-1', author_id:'irem', body:'Hafta sonu yürüyüşünden kısa bir kartpostal.', video_url:'demo-media/rota.mp4', video_cover_url:photo('yuruyus'), post_format:'reels', demo_reel_topic:'gezi', created_at:ago(75)},
  {id:'demo-reel-2', author_id:'mert', body:'Rüzgârda kır çiçekleri 🌼', video_url:'demo-media/cicek.mp4', post_format:'reels', demo_reel_topic:'gezi', created_at:ago(120)}
 );
 const stories = people.slice(1).map(([author_id, name,, image], i) => ({
  id:'demo-story-'+i, author_id, image_url:photo(image), caption:['Günün ilk kahvesi','Vapurdan bir kare','Bugünün sahaf keşfi','Tarçın mesaiye başladı','Sabah yürüyüşü'][i],
  audience:'public', created_at:ago(24+i*13), expires_at:ago(-1200)
 }));
 const comments = [
  ['demo-photo-0','selin','Cam kenarındaki masayı kapmışsın yine. ☕'],
  ['demo-photo-0','mert','Yağmurda buranın havası ayrı güzel.'],
  ['demo-photo-1','ece','Tam da dönüş vapurunda görmek istediğim ışık.'],
  ['demo-photo-2','irem','Tarçın’dan performans değerlendirmesi bekliyoruz.'],
  ['demo-photo-5','mert','Bir dahakine ben de geliyorum.'],
  ['demo-text-1','arda','30 sayfa diyorum ama çoğu zaman 60’ı buluyorum.']
 ].map(([post_id, author_id, body], i) => ({id:'demo-comment-'+i, post_id, author_id, body, created_at:ago(9+i*2)}));
 const follows = profiles.slice(1,6).flatMap(({id: other}) => [
  {follower_id:id, followee_id:other, created_at:ago(4200)},
  {follower_id:other, followee_id:id, created_at:ago(3900)}
 ]);
 const likes = posts.flatMap((post,i) => profiles.filter((p,j) => p.id!==post.author_id && (j+i)%3!==0).map(p => ({post_id:post.id,user_id:p.id,created_at:ago(8)})));
 const messages = [
  ['ece',id,'Cumartesi kahve için 11 uygun mu?',65],
  [id,'ece','Olur. Cam kenarına oturabilirsek harika.',49],
  ['ece',id,'Anlaştık! Vapurdan inince yaz.',28],
  ['mert',id,'Sabahki sahil fotoğrafını çok beğendim.',92],
  ['selin',id,'Bahsettiğim sahafı buldum, haftaya beraber gidelim mi?',154]
 ].map(([sender_id, receiver_id, body, age],i) => ({id:'demo-message-'+i,sender_id,receiver_id,body,created_at:ago(age),read_at:i<2?ago(20):null}));
 const notifications = [
  ['mert','post_likes','demo-photo-5','Mert Aydın gönderini beğendi.'],
  ['mert','comments','demo-photo-5','Mert Aydın gönderine yorum yaptı.'],
  ['irem','follows',null,'İrem Aksoy seni takip etmeye başladı.']
 ].map(([actor_id,kind,post_id,text],i)=>({id:'demo-activity-'+i,owner_id:id,actor_id,kind,post_id,entity_id:post_id,text,read:i===2,created_at:ago(4+i*13)}));
 const questions = [
  {id:'demo-question-1',author_id:'irem',title:'İstanbul’dan günübirlik yürüyüş rotası?',body:'Arabasız ulaşabileceğim, 2–3 saatlik bir parkur arıyorum. Öneriniz var mı?',category:'Yaşam',created_at:ago(61)},
  {id:'demo-question-2',author_id:'mert',title:'Sokak fotoğrafına başlamak için ne önerirsiniz?',body:'Telefonla çekiyorum. Işığı daha iyi kullanmak için ilk hangi alıştırmayı yapayım?',category:'Kültür',created_at:ago(165)}
 ];
 const saves=[{post_id:'demo-photo-3',user_id:id,created_at:ago(10)},{post_id:'demo-reel-1',user_id:id,created_at:ago(15)}];
 const replies=[{id:'demo-reply-1',question_id:'demo-question-1',author_id:'ece',body:'Belgrad Ormanı’nın Neşet Suyu parkuruna bakabilirsin.',created_at:ago(27)}];
 const communityMedia = [10,11,12,13,15,16,17,18,19,24,25,26,28,29,37,42,43,48,49,54,57,58,59,62,65,70,75,76,82,83,84,85,1011,1025];
 const firstNames = ['Ada','Alara','Aslı','Ayça','Baran','Beren','Bora','Cem','Ceren','Derya','Efe','Ela','Elif','Emir','Esra','Gökçe','İdil','Kerem','Lara','Mina','Naz','Nehir','Ozan','Pelin','Rüzgar','Seda','Selen','Sinem','Suna','Umut','Yasemin','Yunus'];
 const surnames = ['Acar','Akın','Aslan','Çelik','Doğan','Ergin','Güneş','Kurt','Özkan','Yıldız','Yücel'];
 const cities = ['İstanbul','İzmir','Ankara','Eskişehir','Bursa','Antalya','Trabzon','Çanakkale','Muğla','Adana','Samsun'];
 const bios = ['Hafta sonu yollarda.','Işık iyi olunca durup bir kare alırım.','Mahalle kahveleri ve yeni tatlar.','Okuduklarımı burada biriktiriyorum.','Müzik, tasarım ve şehir hayatı.','Dışarı çıkmak için bahane arayanlardan.','Küçük anları kayda alıyorum.','Sergi, atölye ve iyi sohbet.'];
 const slug = text => text.toLocaleLowerCase('tr').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const asset = (media,extension='jpg') => 'demo-media/community/'+media+'.'+extension;
 const maleDemoNames=new Set(['Baran','Bora','Cem','Efe','Emir','Kerem','Ozan','Rüzgar','Umut','Yunus']);
 const malePortraits=[4,7,10,12,14,16,18,20,22,23,25,27,29,31,33,36,38,40,41,43,45,47,49,51];
 const femalePortraits=[6,9,11,13,15,17,19,21,24,26,28,30,32,34,35,37,39,42,44,46,48,50,52];
 const communityPortraits=new Map();
 // Give the accounts shown early in the feed priority, then spread out the rest.
 const earlyProfiles=[0,2,4,5,7,9,11,14,18,35,58];
 const profileOrder=new Set([...earlyProfiles,...Array.from({length:94},(_,slot)=>(slot*17)%94)]);
 for(const index of profileOrder){
  const first=firstNames[index%firstNames.length];
  const pool=maleDemoNames.has(first)?malePortraits:femalePortraits;
  if(pool.length)communityPortraits.set(index,pool.shift());
 }
 for(let i=0;i<94;i++){
  const first=firstNames[i%firstNames.length],last=surnames[(i+Math.floor(i/firstNames.length)*3)%surnames.length];
  const city=cities[(i*3)%cities.length],bio=bios[i%bios.length];
  profiles.push({id:'demo-person-'+(i+7),display_name:first+' '+last,handle:slug(first+'.'+last),city,bio,avatar_url:portrait(communityPortraits.get(i)),created_at:ago(11000+i*53)});
 }
 const captions = [
  'Son birkaç gündür aklımda kalan kare bu.',
  'Fotoğrafları ayıklarken buna geri döndüm. Sizce de saklamalık mı?',
  'Bazen en iyi kare, plan yapmadan çektiğim oluyor.',
  'Haftanın koşuşturmacasında böyle bir mola iyi geldi.',
  'Bugünden saklamak istediğim küçük bir detay.',
  'İlk denemede ışık tutmadı, dönüş yolunda bir daha çektim.',
  'Bunu çektiğim anda paylaşmaya karar verdim. Sonra telefon cebimde kaldı.',
  'Arkadaşlarla bir gün daha böyle gezelim diye buraya bırakıyorum.',
  'Kamerayı çantadan çıkarmaya değdiğini düşündüğüm an.',
  'Bu kareye bir şarkı seçsek hangisi olurdu?',
  'Renkleri görünce acele etmeden birkaç kare daha çektim.',
  'Bugünün fotoğrafını seçmek zor oldu, son kararım bu.',
  'Böyle anlarda telefonu kaldırıp biraz da bakmak gerekiyor.',
  'Bir sonraki seride aynı yeri farklı ışıkta çekmek istiyorum.',
  'Arşivde unutulmuş bir kare. Bugün yeniden görünce paylaşmak istedim.',
  'Bunu albümün kapağına koyacak kadar sevdim.'
 ];
 const reelCaptions = [
  'Haftadan birkaç saniye ayırdım. Sesi kapatıp izlemelik.',
  'Bazen tek bir kadraj bütün günü anlatıyor.',
  'Fotoğraf arşivinden kısa bir hareket denemesi.',
  'Bu rengi görünce kısa bir video kartpostal yapmak istedim.',
  'Günlükten bir görsel not.',
  'Biraz yavaşladığımız bir an.',
  'Kısa bir kadraj denemesi. Son hâlini merak ettim.',
  'Bir kareyi birkaç saniye daha izlemek isteyenlere.'
 ];
 const noteStarts = ['Yeni bir alışkanlık deniyorum','Dün arkadaşlarla uzun uzun konuştuk','Bu hafta ufak bir karar aldım','Bugün iş çıkışı düşünürken aklıma geldi','Son zamanlarda hoşuma giden bir şey var','Bir süredir aynı soruya dönüp duruyorum'];
 const noteEnds = ['Her hafta bir akşamı plansız bırakmak iyi geliyor.','Fotoğraf çekmeden gezmek bazen daha çok ayrıntı görmemi sağlıyor.','Aynı kitabı bir arkadaşla okumak bambaşka bir deneyimmiş.','Bir şehri tanımak için ilk neresine gidersiniz?','Yeni bir şey öğrenirken yalnız çalışmayı mı, arkadaşla çalışmayı mı seversiniz?'];
 for(const [i,person] of profiles.slice(6).entries()){
  const media=communityMedia[(i*13)%communityMedia.length];
  posts.push({id:'demo-community-photo-'+i,author_id:person.id,body:captions[i%captions.length],image_url:asset(media),post_format:'image',created_at:ago(21+i*17)});
  if(i<communityMedia.length)posts.push({id:'demo-community-reel-'+i,author_id:person.id,body:reelCaptions[i%reelCaptions.length],video_url:asset(media,'mp4'),video_cover_url:asset(media),post_format:'reels',demo_reel_topic:['gezi','fotograf','kultur'][i%3],created_at:ago(12+i*29)});
  if(i<30)posts.push({id:'demo-community-note-'+i,author_id:person.id,body:noteStarts[i%noteStarts.length]+'. '+noteEnds[Math.floor(i/noteStarts.length)],post_format:'text',created_at:ago(46+i*24)});
  if(i<19)stories.push({id:'demo-community-story-'+i,author_id:person.id,image_url:asset(media),caption:captions[(i+4)%captions.length],audience:'public',created_at:ago(15+i*19),expires_at:ago(-1000)});
 }
 // Follow enough storytellers to fill the strip while keeping discovery suggestions useful.
 for(const person of profiles.slice(6,25))follows.push({follower_id:id,followee_id:person.id,created_at:ago(3600)});
 for(const [i,person] of profiles.entries()){
  for(const step of [1,7,13,21,36]){
   const other=profiles[(i+step)%profiles.length];
   if(!follows.some(f=>f.follower_id===person.id&&f.followee_id===other.id))follows.push({follower_id:person.id,followee_id:other.id,created_at:ago(4200+i*step)});
  }
 }
 const reactions = [
  ['Işık tam yerinde, bu saatte mi çektin?','Gün batımından biraz önceydi, beklediğime değdi.'],
  ['Bu kareyi albüme koymalısın.','Ben de baskısını almayı düşünüyorum.'],
  ['Bir dahaki sefere beraber çıkalım mı?','Olur, bu hafta sonu konuşalım.'],
  ['Renkleri özellikle mi böyle ayarladın?','Çekerken ışık böyleydi, biraz kontrast ekledim.'],
  ['Bunu kaydettim, sonra tekrar bakacağım.','Teşekkür ederim, serinin devamını da paylaşırım.'],
  ['Videonun temposu çok hoşuma gitti.','Keserken mümkün olduğunca kısa tutmaya çalıştım.'],
  ['Bu konu geçen gün bizim masada da açıldı.','Sizin ne düşündüğünüzü de merak ettim.']
 ];
 const extraComments = ['Bu paylaşımı arkadaşıma da yolladım.','Böyle paylaşımların devamı gelsin.','İlk gördüğümde durup bir daha baktım.','Bunu haftanın favorilerine ekledim.','Devamını merak ettim.','Bu fikir aklıma yattı.'];
 const collaborators = [];
 const viewTotals = [];
 for(const [i,post] of posts.entries()){
  const authorIndex=profiles.findIndex(p=>p.id===post.author_id);
  const peer=step=>profiles[(authorIndex+step)%profiles.length].id;
  const age=Math.max(1,Math.round((Date.now()-Date.parse(post.created_at))/60000));
  const prompt=post.post_format==='text'?reactions[6]:post.post_format==='reels'&&i%2?reactions[5]:reactions[i%5];
  const root={id:'demo-thread-'+i,post_id:post.id,author_id:peer(3+i%5),body:prompt[0],created_at:ago(Math.max(1,age-4))};
  comments.push(root,{id:'demo-reply-comment-'+i,post_id:post.id,author_id:post.author_id,parent_id:root.id,body:prompt[1],created_at:ago(Math.max(0,age-9))});
  for(let j=0;j<2+i%4;j++)comments.push({id:'demo-conversation-'+i+'-'+j,post_id:post.id,author_id:peer(15+j*7),body:extraComments[(i+j)%extraComments.length],created_at:ago(Math.max(0,age-13-j*3))});
  if(i>=11){
   for(let j=1;j<=7+(i*11)%49;j++)likes.push({post_id:post.id,user_id:peer(j),created_at:ago(Math.max(0,age-j))});
  }
  if(post.post_format!=='text'&&(i<2||i%5===0))collaborators.push({post_id:post.id,user_id:peer(i%2?7:2),invited_by:post.author_id,status:'accepted',created_at:post.created_at});
  viewTotals.push({post_id:post.id,view_count:145+(i*379)%6400});
 }
 for(const [i,[title,body,answer]] of [
  ['İzmir’de gün batımını nereden izlemeli?','Bu hafta sonu bir arkadaşımı gezdireceğim.','Bostanlı sahilinde biraz erken yer bulursanız çok güzel oluyor.'],
  ['Evde demlediğiniz kahvenin püf noktası ne?','Yeni bir öğütücü aldım, tarif fikrine açığım.','Aynı ölçüyle başlayıp önce sadece öğütme ayarını değiştir.'],
  ['Kitap kulübü için kısa bir roman önerir misiniz?','İlk buluşmamıza herkes yetişsin istiyoruz.','Kürk Mantolu Madonna üzerine güzel bir sohbet çıkabilir.'],
  ['Sokak fotoğrafı için hangi saatte çıkıyorsunuz?','Bulutlu havada çekim yapmayı da öğrenmek istiyorum.','Öğleden sonra iki farklı sokakta aynı konuyu çekip karşılaştır.'],
  ['Haftalık planınızı nasıl tutuyorsunuz?','Çok ayrıntılı listeler bende işe yaramıyor.','Pazar akşamı üç öncelik yazıyorum, gerisi esnek kalıyor.'],
  ['Yeni başlayan biri sergi gezilerine nereden başlasın?','Bu ay kendime iki sergi hedefi koydum.','İlgini çeken bir konu seç, bir de varsa rehberli tura katıl.']
 ].entries()){
  const question_id='demo-community-question-'+i;
  questions.push({id:question_id,author_id:profiles[12+i].id,title,body,category:'Yaşam',created_at:ago(34+i*51)});
  replies.push({id:'demo-community-answer-'+i,question_id,author_id:profiles[32+i].id,body:answer,created_at:ago(23+i*51)});
 }
 // One incoming photo and one incoming Reels invite for the viewer to try.
 collaborators.push(
  {post_id:'demo-photo-3',user_id:id,invited_by:'selin',status:'pending',created_at:ago(6)},
  {post_id:'demo-reel-1',user_id:id,invited_by:'irem',status:'pending',created_at:ago(12)}
 );
 const polls = [
  ['Hafta sonu hangisini seçerdin?',['Sahil yürüyüşü','Bir kahve molası','Sergi gezisi']],
  ['Fotoğrafları nasıl saklıyorsun?',['Telefon albümü','Bulut arşivi','Baskı alıyorum']],
  ['Kitap buluşması ne zaman olsun?',['Cuma akşamı','Cumartesi öğlen','Pazar sabahı']],
  ['Bir günlüğüne nerede olmak isterdin?',['Deniz kenarı','Ormanda','Şehir merkezinde']],
  ['Reels’te en çok hangisini izliyorsun?',['Gezi','Günlük hayat','Kültür ve sanat']],
  ['Kahve molasında yanında ne olsun?',['Kitap','Müzik','Arkadaş sohbeti']]
 ].map(([question,options],i)=>({id:'demo-poll-'+i,author_id:profiles[16+i].id,question,options,ends_at:ago(-4080),created_at:ago(78+i*131)}));
 const buchee_account_country=[
  {user_id:id,country_code:'TR',show_country:false},
  {user_id:'ece',country_code:'TR',show_country:true},
  {user_id:'mert',country_code:'TR',show_country:false}
 ];
 profiles[0].profile_links=[
  {title:'İyi Yol Akademi’yi indir',url:'https://play.google.com/store/apps/details?id=com.iyiyolakademi'},
  {title:'Buchee Social’i aç',url:'https://bucheesocial.com/'}
 ];
 profiles[1].profile_links=[{title:'Şehirde ilham aldığım kareler',url:'https://unsplash.com/t/street-photography'}];
 const demoArchive=[
  [id,'demo-academy-intro','kitap','İyi Yol Akademi · Öğrenmeye küçük bir adımla başla.'],
  [id,'demo-academy-lesson','kahve','Kahve molasında bir ders.'],
  [id,'demo-deniz-walk','sahil','Hafta sonu sahil yürüyüşü.'],
  ['ece','demo-ece-vapur','kadikoy','Vapurdan gün batımı.'],
  ['ece','demo-ece-sea','sahil','Rıhtımda son ışık.'],
  ['ece','demo-ece-close','kitap','Yakın arkadaşlara özel bir not.']
 ];
 for(const [author_id,storyId,image,caption] of demoArchive){
  stories.push({id:storyId,author_id,image_url:photo(image),caption,created_at:ago(4410),expires_at:ago(2970),
   audience:storyId==='demo-ece-close'?'close_friends':'everyone'});
 }
 const storyAlbums=[
  {id:'demo-album-academy',owner:id,title:'İyi Yol Akademi',cover:'demo-academy-intro',stories:['demo-academy-intro','demo-academy-lesson']},
  {id:'demo-album-walk',owner:id,title:'Yürüyüşler',cover:'demo-deniz-walk',stories:['demo-deniz-walk']},
  {id:'demo-album-ece',owner:'ece',title:'Şehir notları',cover:'demo-ece-close',stories:['demo-ece-vapur','demo-ece-close','demo-ece-sea']}
 ];
 return {profiles,posts,stories,questions,replies,messages,comments,follows,likes,saves,notifications,collaborators,viewTotals,polls,buchee_account_country,storyAlbums};
}

function bucheeDemoRpc(tables,name,args={}) {
 const viewer=tables.profiles[0].id;
 if(name==='buchee_story_album_list'){
  const owner=tables.profiles.find(row=>row.id===args.p_owner);
  const own=owner?.id===viewer;
  if(!owner||(!own&&owner.is_private&&!tables.follows.some(row=>row.follower_id===viewer&&row.followee_id===owner.id)))return bucheeDemoQuery([]);
  return bucheeDemoQuery(tables.storyAlbums.filter(album=>album.owner===owner.id&&(!args.p_album||album.id===args.p_album)).flatMap(album=>{
   const stories=album.stories.map(id=>tables.patiyiz_stories.find(row=>row.id===id&&row.author_id===owner.id))
    .filter(story=>story&&(own||story.audience!=='close_friends'));
   const cover=stories.find(story=>story.id===album.cover)||stories[0]||null;
   return own||cover?[{id:album.id,title:album.title,cover,stories:args.p_album?stories:[]}]:[];
  }));
 }
 if(name==='buchee_story_album_save'){
  const album={id:args.p_album||crypto.randomUUID(),owner:viewer,title:args.p_title,cover:args.p_cover,stories:[...args.p_story_ids]};
  const index=tables.storyAlbums.findIndex(row=>row.id===album.id&&row.owner===viewer);
  if(index>=0)tables.storyAlbums[index]=album;else tables.storyAlbums.push(album);
  return Promise.resolve({data:album.id,error:null});
 }
 if(name==='buchee_story_album_manage'){
  const index=tables.storyAlbums.findIndex(row=>row.id===args.p_album&&row.owner===viewer);
  if(index>=0){
   const adjacent=index+(args.p_action==='left'?-1:1);
   if(args.p_action==='delete')tables.storyAlbums.splice(index,1);
   else if(tables.storyAlbums[adjacent]?.owner===viewer)
    [tables.storyAlbums[index],tables.storyAlbums[adjacent]]=[tables.storyAlbums[adjacent],tables.storyAlbums[index]];
  }
  return Promise.resolve({data:null,error:null});
 }
 if(name==='buchee_account_about'){
  const profile=tables.profiles.find(row=>row.id===args.p_account_id);
  if(!profile||(profile.is_private&&profile.id!==viewer&&!tables.follows.some(row=>row.follower_id===viewer&&row.followee_id===profile.id)))return bucheeDemoQuery([]);
  const country=tables.buchee_account_country.find(row=>row.user_id===profile.id&&row.show_country);
  return bucheeDemoQuery([{joined_month:profile.created_at?profile.created_at.slice(0,7)+'-01':null,country_code:country?.country_code||null}]);
 }
 const countByPost = records => {
  const counts=new Map();
  for(const row of records)counts.set(row.post_id,(counts.get(row.post_id)||0)+1);
  return counts;
 };
 if(name==='patiyiz_feed_post_counts'){
  const likes=countByPost(tables.post_likes),comments=countByPost(tables.comments);
  return bucheeDemoQuery(args.p_post_ids.map(post_id=>({post_id,like_count:likes.get(post_id)||0,comment_count:comments.get(post_id)||0})));
 }
 if(name==='patiyiz_explore_ranked'){
  const likes=countByPost(tables.post_likes),views=new Map(tables.patiyiz_post_view_totals.map(row=>[row.post_id,row.view_count]));
  const score=post=>{
   const liked=likes.get(post.id)||0,viewed=views.get(post.id)||0;
   return ({likes:liked,views:viewed,recent:0})[args.p_sort]??liked*8+viewed*.35;
  };
  const reels=tables.posts.filter(post=>post.video_url).sort((a,b)=>score(b)-score(a)||b.created_at.localeCompare(a.created_at));
  return bucheeDemoQuery(reels).range(args.p_offset,args.p_offset+args.p_limit-1);
 }
 return bucheeDemoQuery([]);
}

function bucheeDemoQuery(source, writable=false) {
 let rows = source.slice();
 let offset = 0;
 let limit = Infinity;
 let single = false;
 let head = false;
 let mutation = null;
 let returning = false;
 const mutate = (kind,input) => { mutation={kind,input}; return query; };
 const sort = [];
 const filter = predicate => { rows = rows.filter(predicate); return query; };
 const query = {
  select(fields, options) { head = !!options?.head; returning = true; return this; },
  eq: (key,value) => filter(row => row[key]===value),
  neq: (key,value) => filter(row => row[key]!==value),
  in: (key,values) => filter(row => values.includes(row[key])),
  is: (key,value) => filter(row => (row[key]??null)===value),
  not: (key,operator,value) => operator==='is' ? filter(row => (row[key]??null)!==value) : query,
  gt: (key,value) => filter(row => row[key]>value),
  gte: (key,value) => filter(row => row[key]>=value),
  lt: (key,value) => filter(row => row[key]<value),
  lte: (key,value) => filter(row => row[key]<=value),
  ilike: (key,value) => filter(row => String(row[key]||'').toLocaleLowerCase('tr').includes(value.replace(/^%|%$/g,'').toLocaleLowerCase('tr'))),
  or(expression) {
   const cursor=expression.match(/^created_at\.lt\.([^,]+),and\(created_at\.eq\.([^,]+),id\.lt\.([^,)]+)\)$/);
   if(cursor)return filter(row=>row.created_at<cursor[1]||(row.created_at===cursor[2]&&row.id<cursor[3]));
   if (expression.startsWith('sender_id.eq.') || expression.startsWith('receiver_id.eq.')) {
    const matches = [...expression.matchAll(/(sender_id|receiver_id)\.eq\.([^,()]+)/g)];
    return filter(row => matches.length===4
     ? (row[matches[0][1]]===matches[0][2]&&row[matches[1][1]]===matches[1][2]) ||
       (row[matches[2][1]]===matches[2][2]&&row[matches[3][1]]===matches[3][2])
     : matches.some(([,key,value])=>row[key]===value));
   }
   return this;
  },
  order(key,{ascending=true}={}) { sort.push([key,ascending]); return this; },
  limit(value) { limit=value; return this; },
  range(start,end) { offset=start; limit=end-start+1; return this; },
  single() { single=true; return this; },
  maybeSingle() { return this.single(); },
  insert(input) { return mutate('insert',input); },
  upsert(input,options) {
   mutation={kind:'upsert',input,keys:(options?.onConflict||'user_id,post_id').split(','),ignoreDuplicates:options?.ignoreDuplicates};
   return this;
  },
  delete() { return mutate('delete'); },
  update(input) { return mutate('update',input); },
  then(resolve,reject) {
   if(mutation){
    if(!writable)return Promise.resolve({data:null,error:{message:'Bu işlem demo modunda kullanılamıyor.'},count:0}).then(resolve,reject);
    const {kind,input}=mutation;
    if(kind==='insert'||kind==='upsert'){
     const records=[input].flat();
     rows=records.map(row=>({id:crypto.randomUUID(),created_at:new Date().toISOString(),...row}));
     for(const [index,row] of rows.entries()){
      const duplicate=kind==='upsert'&&source.find(item=>mutation.keys.every(key=>item[key]===row[key]));
      if(!duplicate)source.push(row);
      else if(!mutation.ignoreDuplicates)Object.assign(duplicate,records[index]);
     }
    }else if(kind==='update'){
     rows.forEach(row=>Object.assign(row,input));
    }else{
     const removed=new Set(rows);
     for(let i=source.length-1;i>=0;i--)if(removed.has(source[i]))source.splice(i,1);
    }
    if(!returning)return Promise.resolve({data:null,error:null,count:rows.length}).then(resolve,reject);
   }
   rows.sort((a,b) => {
    for (const [key,ascending] of sort) {
     if (a[key]===b[key]) continue;
     return (a[key]<b[key]?-1:1)*(ascending?1:-1);
    }
    return 0;
   });
   const page = rows.slice(offset,offset+limit).map(row=>({...row}));
   return Promise.resolve({data:head?null:single?page[0]??null:page,error:null,count:rows.length}).then(resolve,reject);
  }
 };
 for (const name of ['match','contains','textSearch']) query[name]=()=>query;
 return query;
}
