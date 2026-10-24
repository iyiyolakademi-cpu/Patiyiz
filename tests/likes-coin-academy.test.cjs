const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const curriculum=fs.readFileSync('academy-curriculum.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-coin-academy-20261024.sql','utf8');
const piece=(begin,end)=>{const a=app.indexOf(begin),b=app.indexOf(end,a+1);assert.ok(a>=0&&b>a,'missing '+begin);return app.slice(a,b)};
test('Likes are present in initial and feed data, and are confirmed by the database',()=>{
 const load=piece("async function load(mode='all')","async function refreshKeys(");
 assert.match(load,/post_likes','likes',2000/);
 assert.match(load,/mode==='initial'.*post_likes/);
 assert.match(load,/mode==='feed'.*post_likes/);
 assert.match(load,/likesEpoch/);
 const action=piece('async function togglePostLike(id){','async function doToggle(');
 assert.match(action,/pendingPostLikes\.has\(id\)/);
 assert.match(action,/ignoreDuplicates:true/);
 assert.match(action,/const verified=await sb\.from\('post_likes'\)\.select\('post_id,user_id'\)\.eq\('post_id',id\)/);
 assert.match(action,/savedLike===wasLiked/);
 assert.match(app,/case 'like':void togglePostLike\(id\);break/);
 assert.match(app,/if\(!liked\.has\(id\)\)void togglePostLike\(id\)/);
 assert.doesNotMatch(app,/run\(\(\)=>doToggle\('post_likes'/);
});
test('A like and unlike persist across reads, including someone else\'s likes',async()=>{
 const code=piece('async function togglePostLike(id){','async function doToggle(');
 let rows=[{user_id:'friend',post_id:'post'}];
 const button={disabled:false,attributes:{},classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},querySelector(){return {textContent:''}}};
 const ctx={me:{id:'owner'},data:{likes:[]},liked:new Set(),pendingPostLikes:new Set(),likesChangeEpoch:0,console,notify(){},friendly:e=>e.message||String(e),
  document:{querySelectorAll(selector){return selector.includes('[data-action="like"]')?[button]:[]}},
  sb:{from(table){assert.equal(table,'post_likes');return {
   upsert:async row=>{if(!rows.some(r=>r.user_id===row.user_id&&r.post_id===row.post_id))rows.push(row);return {error:null}},
   delete(){return {eq(){return this},then(done){rows=rows.filter(r=>r.user_id!=='owner');done({error:null})}}},
   select(){return {eq:async(_key,id)=>({error:null,data:rows.filter(r=>r.post_id===id)})}}
  }}}};
 const fn=vm.runInNewContext(code+'\ntogglePostLike',ctx);
 await fn('post');
 assert.equal(rows.length,2);
 assert.ok(ctx.liked.has('post'));
 assert.equal(ctx.data.likes.length,2);
 await fn('post');
 assert.equal(rows.length,1);
 assert.ok(!ctx.liked.has('post'));
 assert.equal(ctx.data.likes.length,1);
 assert.equal(button.disabled,false);
});
test('PatiCoin is harder, with server-enforced account maturity and cooldown',()=>{
 assert.match(sql,/when 'mama-mini' then 500/);
 assert.match(sql,/when 'mama-kilo' then 1400/);
 assert.match(sql,/when 'mama-kabi' then 900/);
 assert.match(sql,/when 'mama-destek' then 650/);
 assert.match(sql,/interval '7 days'/);
 assert.match(sql,/count\(\*\) from public\.patiyiz_daily_active/);
 assert.match(sql,/interval '14 days'/);
 assert.match(sql,/r\.status <> 'cancelled'/);
 assert.match(sql,/only NEW, unclaimed activity awards/i);
 assert.doesNotMatch(sql,/truncate|delete from public\.patiyiz_reward_wallets/i);
 assert.match(app,/Hesabın en az 7 günlük olmalı/);
});
test('32 academy lessons, 10 courses, mini-quizzes and durable account progress',()=>{
 const browser={};
 vm.runInNewContext(curriculum,{window:browser});
 const additions=browser.PATIYIZ_EXTRA_LESSONS;
 assert.equal(additions.length,26);
 assert.equal(new Set(additions.map(l=>l.id)).size,26);
 for(const l of additions){assert.ok(l.parts.length>=3,l.id);assert.ok(l.parts.every(p=>p.length>80),l.id);
  assert.ok(l.opts.length>=3);assert.ok(l.answer>=0&&l.answer<l.opts.length);}
 assert.match(app,/patiyizLessons\.push\(\.\.\.\(window\.PATIYIZ_EXTRA_LESSONS\|\|\[\]\)\)/);
 assert.match(app,/pati-edu-progressbar/);
 assert.match(app,/education-next/);
 assert.match(app,/function educationCloudLoad\(\)/);
 assert.match(app,/patiyiz_education_progress/);
 assert.match(sql,/create table if not exists public\.patiyiz_education_progress/);
 assert.match(sql,/primary key\(user_id,lesson_id\)/);
 assert.match(sql,/for select to authenticated using\(user_id=\(select auth\.uid\(\)\)\)/);
 assert.match(html,/academy-curriculum\.js/);
});
