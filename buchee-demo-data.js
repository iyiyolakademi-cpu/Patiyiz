function bucheeDemoData(id) {
 const ago = minutes => new Date(Date.now() - minutes * 60000).toISOString();
 const photo = name => 'demo-media/' + name + '.jpg';
 const people = [
  [id, 'Deniz Kaya', 'denizkaya', 'kadikoy', 'İstanbul · Fotoğraf, kitap ve uzun yürüyüşler'],
  ['ece', 'Ece Yılmaz', 'eceyolda', 'kahve', 'Şehirde sakin köşeler arıyorum.'],
  ['mert', 'Mert Aydın', 'mertkadraj', 'sahil', 'Günün ışığını kaçırmam.'],
  ['selin', 'Selin Demir', 'selinokuyor', 'kitap', 'Biraz kitap, biraz kahve.'],
  ['arda', 'Arda Koç', 'ardagundelik', 'kedi', 'Ev arkadaşım Tarçın.'],
  ['irem', 'İrem Aksoy', 'iremyuruyor', 'yuruyus', 'Hafta sonu rotaları.']
 ];
 const profiles = people.map(([id, display_name, handle, image, bio]) => ({
  id, display_name, handle, bio, avatar_url: photo(image), created_at: ago(10080)
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
  {id:'demo-reel-1', author_id:'irem', body:'Hafta sonu yürüyüşünden kısa bir kartpostal.', video_url:'demo-media/rota.mp4', video_cover_url:photo('yuruyus'), post_format:'reels', created_at:ago(75)},
  {id:'demo-reel-2', author_id:'mert', body:'Rüzgârda kır çiçekleri 🌼', video_url:'demo-media/cicek.mp4', post_format:'reels', created_at:ago(120)}
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
 const follows = profiles.slice(1).flatMap(({id: other}) => [
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
  ['mert','like','demo-photo-5','Mert Aydın gönderini beğendi.'],
  ['mert','comment','demo-photo-5','Mert Aydın gönderine yorum yaptı.'],
  ['irem','follow',null,'İrem Aksoy seni takip etmeye başladı.']
 ].map(([actor_id,kind,post_id,body],i)=>({id:'demo-activity-'+i,owner_id:id,actor_id,kind,post_id,entity_id:post_id,body,read:i===2,created_at:ago(4+i*13)}));
 const questions = [
  {id:'demo-question-1',author_id:'irem',title:'İstanbul’dan günübirlik yürüyüş rotası?',body:'Arabasız ulaşabileceğim, 2–3 saatlik bir parkur arıyorum. Öneriniz var mı?',category:'Yaşam',created_at:ago(61)},
  {id:'demo-question-2',author_id:'mert',title:'Sokak fotoğrafına başlamak için ne önerirsiniz?',body:'Telefonla çekiyorum. Işığı daha iyi kullanmak için ilk hangi alıştırmayı yapayım?',category:'Kültür',created_at:ago(165)}
 ];
 const saves=[{post_id:'demo-photo-3',user_id:id,created_at:ago(10)},{post_id:'demo-reel-1',user_id:id,created_at:ago(15)}];
 const replies=[{id:'demo-reply-1',question_id:'demo-question-1',author_id:'ece',body:'Belgrad Ormanı’nın Neşet Suyu parkuruna bakabilirsin.',created_at:ago(27)}];
 return {profiles,posts,stories,questions,replies,messages,comments,follows,likes,saves,notifications};
}

function bucheeDemoQuery(source) {
 let rows = source.slice();
 let offset = 0;
 let limit = Infinity;
 let single = false;
 let head = false;
 const sort = [];
 const filter = predicate => { rows = rows.filter(predicate); return query; };
 const query = {
  select(fields, options) { head = !!options?.head; return this; },
  eq: (key,value) => filter(row => row[key]===value),
  neq: (key,value) => filter(row => row[key]!==value),
  in: (key,values) => filter(row => values.includes(row[key])),
  is: (key,value) => filter(row => (row[key]??null)===value),
  not: (key,operator,value) => operator==='is' ? filter(row => (row[key]??null)!==value) : query,
  gt: (key,value) => filter(row => row[key]>value),
  gte: (key,value) => filter(row => row[key]>=value),
  lt: (key,value) => filter(row => row[key]<value),
  lte: (key,value) => filter(row => row[key]<=value),
  or(expression) {
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
  then(resolve,reject) {
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
 for (const name of ['insert','upsert','update','delete']) query[name]=()=>{rows=[];return query};
 for (const name of ['match','contains','textSearch','ilike']) query[name]=()=>query;
 return query;
}
