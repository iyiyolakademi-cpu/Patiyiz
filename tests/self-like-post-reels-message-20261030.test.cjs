const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-no-self-dm-reactions-20261030.sql','utf8');
const likeSource=app.slice(app.indexOf('async function togglePostLike(id){'),app.indexOf('const pendingPostSaves'));
const feedSource=app.slice(app.indexOf("const controls='<div class=\"pati-actionbar pati-social-actions\""),app.indexOf(" const sourcePost=p.source_post_id"));
const reelSource=app.slice(app.indexOf("'<div class=\"pati-reel-rail\">"),app.indexOf('pati-reel-progress',app.indexOf("'<div class=\"pati-reel-rail\">")+10000)>0?app.indexOf("'</div>'",app.indexOf("'<div class=\"pati-reel-rail\">")):app.indexOf("pati-reel-rail")+3000);

test('owners can tap normal post and Reels heart controls',()=>{
 assert.match(feedSource,/data-action="like" aria-label="Beğen"/);
 assert.doesNotMatch(feedSource,/Kendi gönderine tepki veremezsin/);
 assert.match(app,/class="pati-reel-action '\+\(likedPost\?'active':''\)\+'" data-action="like"/);
 assert.doesNotMatch(app,/Kendi Reels içeriğine tepki veremezsin/);
 assert.doesNotMatch(likeSource,/if\(post\.author_id===me\.id\)/);
 assert.match(likeSource,/\.insert\(\{user_id:owner,post_id:id\}\)/);
});
test('owner can like and unlike their own post, with persisted server verification',async()=>{
 let rows=[];
 const button={disabled:false,attrs:{},
  classList:{toggle(){},remove(){},add(){}},
  setAttribute(k,v){this.attrs[k]=v},
  removeAttribute(k){delete this.attrs[k]},
  querySelector(){return {textContent:''}}
 };
 const ctx={
  me:{id:'owner'},sb:{from(name){
   assert.equal(name,'post_likes');
   return {
    insert:async row=>{rows.push(row);return {error:null}},
    delete(){return {eq(){return this},then(done){rows=[];done({error:null})}}},
    select(){return {eq:async()=>({error:null,data:[...rows]})}}
   };
  }},
  patiFindSocialPost:()=>({id:'mine',author_id:'owner'}),
  data:{likes:[]},liked:new Set(),pendingPostLikes:new Set(),likesChangeEpoch:0,
  console,notify(){},friendly:e=>e?.message||String(e),
  document:{querySelectorAll(q){return q.includes('[data-action="like"]')?[button]:[]}}
 };
 const toggle=vm.runInNewContext(likeSource+'\ntogglePostLike',ctx);
 await toggle('mine');
 assert.equal(rows.length,1);
 assert.equal(ctx.liked.has('mine'),true);
 assert.equal(button.attrs['aria-pressed'],'true');
 await toggle('mine');
 assert.equal(rows.length,0);
 assert.equal(ctx.liked.has('mine'),false);
 assert.equal(button.attrs['aria-pressed'],'false');
 assert.equal(button.disabled,false);
});
test('own direct messages remain non-reactable in UI and database policies',()=>{
 const pick=app.slice(app.indexOf('function patiDmOpenReactionPicker(messageId){'),app.indexOf('async function patiDmSetReaction(messageId,emoji){'));
 const apply=app.slice(app.indexOf('async function patiDmSetReaction(messageId,emoji){'),app.indexOf('function ',app.indexOf('async function patiDmSetReaction(messageId,emoji){')+60));
 assert.match(pick,/msg\.sender_id===me\.id/);
 assert.match(apply,/msg\.sender_id===owner/);
 assert.match(sql,/alter policy "pati_dm_reactions_insert"/);
 assert.match(sql,/alter policy "pati_dm_reactions_update"/);
 assert.match(sql,/m\.receiver_id = \(select auth\.uid\(\)\)/);
 assert.match(sql,/m\.sender_id <> \(select auth\.uid\(\)\)/);
 assert.doesNotMatch(sql,/alter policy "pati_dm_reactions_delete"/);
});
