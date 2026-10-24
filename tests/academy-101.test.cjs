const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const scripts=['academy-curriculum.js','academy-101-part1.js','academy-101-part2.js'];
function loadCurriculum(){
 const ctx={window:{}};
 for(const name of scripts)vm.runInNewContext(fs.readFileSync(name,'utf8'),ctx,{filename:name});
 return ctx.window.PATIYIZ_EXTRA_LESSONS;
}
function nativeIds(){
 const i=app.indexOf('const patiyizLessons=['),j=app.indexOf('];\npatiyizLessons.push(',i);
 assert.ok(i>=0&&j>i);
 return [...app.slice(i,j).matchAll(/\{id:'([^']+)'/g)].map(m=>m[1]);
}
test('Exactly 101 unique Academy lessons: six originals plus 95 additional',()=>{
 const extra=loadCurriculum(),original=nativeIds(),ids=[...original,...extra.map(x=>x.id)];
 assert.equal(original.length,6);
 assert.equal(extra.length,95);
 assert.equal(ids.length,101);
 assert.equal(new Set(ids).size,101);
 assert.equal(extra.filter(l=>l.cat==='Genel').length>=5,true);
 assert.equal(new Set([...extra.map(x=>x.cat),'Genel','Kedi','Köpek','Kuş','Balık','Diğer']).size,10);
});
test('Every new lesson has actual instructional content and a solvable quiz',()=>{
 const extra=loadCurriculum();
 for(const lesson of extra){
  assert.ok(lesson.id.length<=80,lesson.id);
  assert.ok(lesson.name.length>9,lesson.id);
  assert.ok(lesson.desc.length>10,lesson.id);
  assert.ok(lesson.parts.length>=3,lesson.id);
  assert.ok(lesson.parts.every(text=>text.length>=80),lesson.id+' contains a short paragraph');
  assert.ok(lesson.opts.length>=3,lesson.id);
  assert.ok(lesson.opts.every(opt=>opt.length>=5),lesson.id);
  assert.ok(Number.isInteger(lesson.answer)&&lesson.answer>=0&&lesson.answer<lesson.opts.length,lesson.id);
  assert.ok(lesson.minutes>=5&&lesson.minutes<=30,lesson.id);
 }
});
test('All 101 lessons load before app initialization in safe script order',()=>{
 const indexes=scripts.map(name=>html.indexOf('src="'+name));
 assert.ok(indexes.every(i=>i>=0));
 assert.ok(indexes[0]<indexes[1]&&indexes[1]<indexes[2]);
 assert.ok(indexes[2]<html.indexOf('src="app.js'));
 for(const file of scripts)assert.ok(fs.existsSync(file));
 assert.match(html,/lessons=101/);
});
test('Academy offers progress, subject filter, live search, and resume learning',()=>{
 assert.match(app,/10 konuda 101 ücretsiz ders/);
 assert.match(app,/pati-edu-progressbar/);
 assert.match(app,/educationSearch/);
 assert.match(app,/pati-academy-search/);
 assert.match(app,/data-action="education-continue"/);
 assert.match(app,/case 'education-continue'/);
 assert.match(app,/if\(e\.target\?\.id!=='pati-academy-search'\)return/);
 assert.match(app,/patiyizLessons\.filter\(l=>\(educationCategory==='Tümü'/);
 assert.match(app,/educationDone\(\)/);
 assert.match(app,/patiyiz_education_progress/);
 assert.match(app,/upsert\(\{user_id:uid,lesson_id:id\}/);
 assert.match(app,/const missing=\[\.\.\.educationLocalDone\(\)\]/);
});
