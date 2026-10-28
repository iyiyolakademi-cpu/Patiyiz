const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('education-stage7.css','utf8');
const lessons=[
 {id:'cat-intro',name:'Kedilerde tuvalet düzeni',cat:'Kedi',minutes:5,icon:'🐈',desc:'Kum kabını tanıma',parts:['Temiz kum kabı önemlidir.'],q:'Ne yapmalı?',opts:['Temizle','İhmal et','Kapat'],answer:0},
 {id:'dog-care',name:'Köpeklerde davranış',cat:'Köpek',minutes:7,icon:'🐕',desc:'Ödül temelli öğrenme',parts:['Köpeklerin günlük bakımını planla.'],q:'Hangisi doğru?',opts:['Ceza','Ödül','Korkutma'],answer:1},
 {id:'cat-food',name:'Kedilerde mama seçimi',cat:'Kedi',minutes:6,icon:'🍲',desc:'Beslenme planı',parts:['Mama dengesi ve beslenme'],q:'Hangisi uygun?',opts:['Uygun mama','Şeker','Çikolata'],answer:0}
];
function setup(){
 const begin=app.indexOf("let educationStatus='Tümü'");
 const end=app.indexOf('/* Private pet wellness',begin);
 assert.ok(begin>0&&end>begin);
 const store=new Map(),main={innerHTML:''},grid={innerHTML:''},count={textContent:''};
 const ctx={
  patiyizLessons:lessons,educationCategory:'Tümü',educationLesson:'',educationAnswer:{},educationSearch:'',
  me:{id:'person-1'},main,view:'education',educationCloudUser:'person-1',
  educationDone:()=>new Set(['cat-intro']),document:{getElementById:id=>({ 'pati-edu-result-list':grid,'pati-edu-results-count':count })[id]||null},
  localStorage:{getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)},
  esc:val=>String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')
 };
 vm.createContext(ctx);
 vm.runInContext(app.slice(begin,end)+'\nglobalThis.api={educationFold,educationFiltered,educationResumeId,educationRemember,educationCards,educationPage,educationUpdateResults};',ctx);
 return {ctx,api:ctx.api,store,main,grid,count};
}
test('101 dersin mevcut içerikleri ve Supabase ilerlemesi korunuyor',()=>{
 assert.match(app,/patiyizLessons\.push\(\.\.\.\(window\.PATIYIZ_EXTRA_LESSONS\|\|\[\]\)\)/);
 assert.match(app,/upsert\(\{user_id:uid,lesson_id:id\}/);
 assert.match(app,/const missing=\[\.\.\.educationLocalDone\(\)\]/);
 assert.match(app,/10 konuda 101 ücretsiz ders/);
});
test('Türkçe duyarlı arama ders açıklamalarında ve ders metinlerinde çalışır',()=>{
 const {ctx,api}=setup();
 ctx.educationSearch='KEDILERDE';
 assert.deepEqual(Array.from(api.educationFiltered(new Set()),x=>x.id),['cat-intro','cat-food']);
 ctx.educationSearch='ödül';
 assert.deepEqual(Array.from(api.educationFiltered(new Set()),x=>x.id),['dog-care']);
 ctx.educationSearch='kum kabı';
 assert.deepEqual(Array.from(api.educationFiltered(new Set()),x=>x.id),['cat-intro']);
});
test('Konu ve tamamlanma filtresi birlikte çalışır',()=>{
 const {ctx,api}=setup();
 ctx.educationCategory='Kedi';
 vm.runInContext("educationStatus='Tamamlanmayanlar'",ctx);
 assert.deepEqual(Array.from(api.educationFiltered(new Set(['cat-intro'])),x=>x.id),['cat-food']);
 vm.runInContext("educationStatus='Tamamlananlar'",ctx);
 assert.deepEqual(Array.from(api.educationFiltered(new Set(['cat-intro'])),x=>x.id),['cat-intro']);
});
test('Kaldığın yerden devam et her hesaba ait son açılan eksik dersi seçer',()=>{
 const {api,store}=setup();
 api.educationRemember('cat-food');
 assert.equal(store.get('patiyiz-edu-recent-person-1'),'cat-food');
 assert.equal(api.educationResumeId(new Set(['cat-intro'])),'cat-food');
 assert.equal(api.educationResumeId(new Set(['cat-intro','cat-food'])),'dog-care');
 assert.equal(api.educationResumeId(new Set(lessons.map(x=>x.id))),'');
 api.educationRemember('unknown-id');
 assert.equal(store.get('patiyiz-edu-recent-person-1'),'cat-food');
});
test('Academy first shows category selection and real progress before lesson access',()=>{
 const {api,main}=setup();
 api.educationPage();
 assert.match(main.innerHTML,/pati-ref-academy-home/);
 assert.match(main.innerHTML,/pati-ref-academy-topics/);
 assert.match(main.innerHTML,/1 \/ 3 ders tamamlandı/);
 assert.doesNotMatch(main.innerHTML,/data-action="education-continue"/);
 assert.match(main.innerHTML,/Eğitimleri Keşfet/);
 assert.match(main.innerHTML,/data-action="education-filter"/);
 assert.doesNotMatch(main.innerHTML,/pati-recommended-lessons/);
 assert.match(main.innerHTML,/Kedi/);
 assert.match(main.innerHTML,/Köpek/);
});
test('Arama girerken arama alanı yeniden oluşturulmaz, sadece sonuçlar değişir',()=>{
 const {api,ctx,grid,count}=setup();
 ctx.educationSearch='mama';
 api.educationUpdateResults();
 assert.match(grid.innerHTML,/mama seçimi/);
 assert.doesNotMatch(grid.innerHTML,/Köpeklerde davranış/);
 assert.equal(count.textContent,'1 ders');
});
test('Ders ekranı konumu, gezinme, doğru yanıt ve sınav kilidini gösterir',()=>{
 const {api,ctx,main}=setup();
 ctx.educationLesson='dog-care';
 ctx.educationAnswer['dog-care']=2;
 api.educationPage();
 assert.match(main.innerHTML,/Ders 1 \/ 1/);
 assert.match(main.innerHTML,/Köpek derslerine dön/);
 assert.doesNotMatch(main.innerHTML,/data-action="education-next"/);
 assert.match(main.innerHTML,/Yeniden deneyebilirsin/);
 ctx.educationAnswer['dog-care']=1;
 api.educationPage();
 assert.match(main.innerHTML,/Doğru cevap/);
 assert.match(main.innerHTML,/disabled/);
});
test('Tamamlanmış dersin yanıtı, yenilemeden sonra da doğru ve kilitli görünür',()=>{
 const {api,ctx,main}=setup();
 ctx.educationLesson='cat-intro';
 api.educationPage();
 assert.match(main.innerHTML,/✓ Tamamlandı/);
 assert.match(main.innerHTML,/Doğru cevap/);
 assert.match(main.innerHTML,/disabled/);
});
test('Yeni tasarım izole CSS dosyasından yüklenir ve mobil ekranlara uyumludur',()=>{
 assert.ok(html.includes('education-stage7.css?v=20261025-education-v2'));
 assert.ok(html.includes('education20261025=7'));
 assert.match(css,/#main-content \.pati-edu-v2/);
 assert.match(css,/@media\(max-width:660px\)/);
 assert.match(css, /:focus-visible/);
 for(const action of ['education-previous','education-status','education-reset','education-clear'])assert.ok(app.includes("case '"+action+"'"),action);
});