const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-academy-learning-path-20261028.css','utf8');
const extract=(from,to)=>{const a=app.indexOf(from),b=app.indexOf(to,a+from.length);assert.ok(a>=0&&b>a,from);return app.slice(a,b)};
const courseLessons=[
 {id:'cat-1',cat:'Kedi',name:'Kedi birinci',desc:'Ders 1 açıklama',minutes:4,icon:'🐈',parts:['Metin'],q:'Soru?',opts:['Doğru','Yanlış'],answer:0},
 {id:'cat-2',cat:'Kedi',name:'Kedi ikinci',desc:'Ders 2 açıklama',minutes:5,icon:'🐈',parts:['Metin'],q:'Soru?',opts:['Doğru','Yanlış'],answer:0},
 {id:'bird-1',cat:'Kuş',name:'Kuş ilk dersi',desc:'Ders 1 açıklama',minutes:5,icon:'🐦',parts:['Metin'],q:'Soru?',opts:['Doğru','Yanlış'],answer:0},
 {id:'fish-1',cat:'Balık',name:'Balık ilk dersi',desc:'Ders 1 açıklama',minutes:5,icon:'🐟',parts:['Metin'],q:'Soru?',opts:['Doğru','Yanlış'],answer:0}
];
function setup(done=[]){
 const main={innerHTML:''},store=new Map();
 const ctx={patiyizLessons:courseLessons,educationCategory:'Tümü',educationLesson:'',educationAnswer:{},educationSearch:'',educationCloudUser:'me',
  me:{id:'me'},main,view:'education',educationDone:()=>new Set(done),educationStatus:'Tümü',
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  esc:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')};
 vm.createContext(ctx);
 vm.runInContext(extract("let educationStatus='Tümü'","/* Private pet wellness")+'\nglobalThis.api={educationTopicArtwork,educationCanOpen,educationPathCards,educationPage,educationTopicNext,educationTopicLessons}',ctx);
 return {ctx,main,api:ctx.api};
}
test('Learning path preserves full 101 original lesson IDs and existing cloud/local progress',()=>{
 assert.match(app,/patiyizLessons\.push\(\.\.\.\(window\.PATIYIZ_EXTRA_LESSONS\|\|\[\]\)\)/);
 assert.match(app,/patiyiz_education_progress/);
 assert.match(app,/upsert\(\{user_id:uid,lesson_id:id\}/);
 assert.match(app,/10 konuda 101 ücretsiz ders/);
});
test('First screen is categories before recommended lessons and has correct bird/fish images',()=>{
 const {api,main}=setup();
 api.educationPage();
 assert.match(main.innerHTML,/Eğitimleri Keşfet/);
 assert.match(main.innerHTML,/pati-ref-academy-topics/);
 assert.match(main.innerHTML,/pati-illustration-fish\.svg/);
 assert.match(main.innerHTML,/pati-illustration-bird\.svg/);
 assert.doesNotMatch(main.innerHTML,/pati-recommended-lessons/);
 assert.ok(main.innerHTML.indexOf('pati-ref-academy-topics')<main.innerHTML.indexOf('pati-academy-total-progress'));
});
test('Each topic has an independent chain and later lessons cannot open',()=>{
 const {api,ctx,main}=setup([]);
 assert.equal(api.educationCanOpen('cat-1'),true);
 assert.equal(api.educationCanOpen('cat-2'),false);
 assert.equal(api.educationCanOpen('bird-1'),true);
 assert.equal(api.educationCanOpen('fish-1'),true);
 ctx.educationCategory='Kedi';api.educationPage();
 assert.match(main.innerHTML,/data-id="cat-1"/);
 assert.match(main.innerHTML,/Kedi ikinci/);
 assert.match(main.innerHTML,/is-locked/);
 assert.doesNotMatch(main.innerHTML,/data-action="education-open" data-id="cat-2"/);
 ctx.educationLesson='cat-2';api.educationPage();
 assert.equal(ctx.educationLesson,'');
 assert.match(main.innerHTML,/pati-edu-path-list/);
});
test('Correct completion unlocks precisely the next lesson in the selected category',()=>{
 const {api,ctx,main}=setup(['cat-1']);
 assert.equal(api.educationCanOpen('cat-2'),true);
 ctx.educationCategory='Kedi';api.educationPage();
 assert.match(main.innerHTML,/data-action="education-open" data-id="cat-2"/);
 ctx.educationLesson='cat-2';api.educationPage();
 assert.match(main.innerHTML,/Ders 2 \/ 2/);
 assert.match(main.innerHTML,/Önceki ders/);
 ctx.educationCategory='Kuş';ctx.educationLesson='bird-1';api.educationPage();
 assert.match(main.innerHTML,/Ders 1 \/ 1/);
});
test('Previous completion remains reviewable while quiz-gated next remains disabled',()=>{
 const {api,ctx,main}=setup([]);
 ctx.educationCategory='Kedi';ctx.educationLesson='cat-1';
 api.educationPage();
 assert.match(main.innerHTML,/pati-edu-next-locked/);
 assert.doesNotMatch(main.innerHTML,/data-action="education-next" data-id="cat-2"/);
 assert.match(app,/if\(!educationCanOpen\(id\)\)\{notify\('Önce önceki dersi/);
 assert.match(app,/if\(l&&educationLesson===id&&educationCanOpen\(id\)/);
 const done=setup(['cat-1','cat-2']);
 assert.equal(done.api.educationCanOpen('cat-1'),true);
 done.ctx.educationCategory='Kedi';done.api.educationPage();
 assert.match(done.main.innerHTML,/Bu konunun tüm derslerini tamamladın/);
});
test('Pet hub shows its photo hero first and omits greeting/header and pet button',()=>{
 const part=extract('function patiMyPetCenterPage(){',"let educationStatus='Tümü'");
 const mock={main:{innerHTML:''},patiMyPetTab:'hub',me:{id:'owner'},data:{pets:[{id:'pet',owner_id:'owner',name:'Tarçın',species:'Kedi',breed:'British',photo_url:'cat-photo.jpg'}]},
  patiHubSelectedPetId:'',careOwnItems:()=>[],careToday:()=>'',esc:String,current:()=>({display_name:'Berke'}),view:'my-pet'};
 const render=vm.runInNewContext(part+'\npatiMyPetCenterPage',mock);render();
 assert.match(mock.main.innerHTML,/p4-hub-direct-hero/);
 assert.ok(mock.main.innerHTML.indexOf('p4-hub-hero')<mock.main.innerHTML.indexOf('p4-hub-status'));
 assert.match(mock.main.innerHTML,/Tarçın/);
 assert.match(mock.main.innerHTML,/Hızlı İşlemler/);
 assert.doesNotMatch(mock.main.innerHTML,/Merhaba Berke|p4-hub-header|p4-header-icon/);
 assert.doesNotMatch(mock.main.innerHTML,/p4-pet-picker/);
});
test('New CSS and artwork are loaded and available for all animal topics',()=>{
 assert.match(html,/patiyiz-academy-learning-path-20261028\.css\?v=1/);
 assert.match(html,/academy_path=20261028/);
 assert.match(css,/pati-edu-path-item\.is-locked/);
 assert.match(css,/@media\(max-width:470px\)/);
 for(const path of ['pati-illustration-bird.svg','pati-illustration-fish.svg']){
  const art=fs.readFileSync(path,'utf8');assert.match(art,/<svg /);assert.match(art,/viewBox/);
 }
});
