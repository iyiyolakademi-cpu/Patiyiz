const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const all=fs.readFileSync('academy-series-1010-20261101.js','utf8');
const originalScripts=['academy-curriculum.js','academy-101-part1.js','academy-101-part2.js'];
function catalog(){
 const context={window:{}};vm.createContext(context);
 for(const name of originalScripts)vm.runInContext(fs.readFileSync(name,'utf8'),context,{filename:name});
 vm.runInContext(all,context,{filename:'academy-series-1010-20261101.js'});
 return context.window;
}
test('10 independent educational series contain exactly 1010 unique short lessons',()=>{
 const cat=catalog();
 const legacyIds=[...app.slice(app.indexOf('const patiyizLessons=['),app.indexOf('];\npatiyizLessons.push(')).matchAll(/\{id:'([^']+)'/g)].map(m=>m[1]);
 const originalCount=legacyIds.length+cat.PATIYIZ_EXTRA_LESSONS.length;
 assert.equal(originalCount,101);
 assert.equal(cat.PATIYIZ_SERIES_CATALOG.length,10);
 assert.equal(cat.PATIYIZ_SERIES_LESSONS.length,909);
 assert.equal(new Set([...legacyIds,...cat.PATIYIZ_EXTRA_LESSONS.map(x=>x.id),...cat.PATIYIZ_SERIES_LESSONS.map(x=>x.id)]).size,1010);
 for(const item of cat.PATIYIZ_SERIES_CATALOG.slice(1)){
  const lessons=cat.PATIYIZ_SERIES_LESSONS.filter(l=>l.cat===item.title);
  assert.equal(lessons.length,101,item.title);
  for(const lesson of lessons){
   assert.ok(lesson.parts.length>=9,'at least nine reading and practice sections');
   assert.ok(lesson.minutes>=10,'each lesson is at least ten minutes');
   assert.ok(lesson.name&&lesson.q&&lesson.opts.length>=3);
   assert.ok(lesson.answer>=0&&lesson.answer<lesson.opts.length);
  }
 }
 assert.match(app,/lesson\.subtopic=lesson\.cat;lesson\.cat='101 Hayvan'/);
 assert.match(app,/lesson\.minutes=12/);
 assert.match(app,/pati-edu-duration-guide/);
 const fullCss=fs.readFileSync('patiyiz-101-series-20261101.css','utf8');
 assert.match(fullCss,/#app-root:not\(\.hidden\) #main-content>\.pati-edu/);
 assert.match(app,/data-action="education-exit"/);
});
test('Education moves to its own menu, independent from the pet center',()=>{
 assert.match(app,/title:'101 Eğitim Serileri'/);
 assert.match(app,/\['education','10 seri · Her biri 101 ders','library'\]/);
 assert.doesNotMatch(app,/\['education','Eğitim','academy','violet'/);
 assert.doesNotMatch(app,/patiPetHubScreens=new Set\(\['pets','education'/);
 assert.match(html,/academy-series-1010-20261101\.js\?v=1/);
 assert.match(html,/patiyiz-101-series-20261101\.css\?v=1/);
});
test('Message long-press presents a modal reaction row and functional compact actions',()=>{
 assert.match(app,/dialog\.className='pati-dm-context-menu'/);
 assert.match(app,/dialog\.showModal\(\)/);
 assert.match(app,/getBoundingClientRect\(\)/);
 assert.match(app,/--dm-popup-top/);
 assert.match(app,/pati-dm-context-reactions/);
 assert.match(app,/data-action="dm-react-set"/);
 assert.match(app,/dm-context-copy/);
 assert.match(app,/option\('dm-reply','Yanıtla'/);
 assert.match(app,/option\('message-delete','Sil'/);
 assert.match(app,/msg\.sender_id===owner\|\|msg\.receiver_id!==owner/);
 assert.match(html,/patiyiz-dm-longpress-20261101\.css\?v=1/);
 const css=fs.readFileSync('patiyiz-dm-longpress-20261101.css','utf8');
 assert.match(css,/\.pati-dm-context-menu::backdrop/);
 assert.match(css,/\.pati-dm-context-actions/);
});
