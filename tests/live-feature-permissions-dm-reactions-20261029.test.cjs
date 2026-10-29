const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-live-feature-error-fixes-20261029.sql','utf8');
const start=app.indexOf('async function patiDmSetReaction(');
const end=app.indexOf('/* DM previews are always',start);
const section=app.slice(start,end);
assert.ok(start>=0&&end>start,'DM reaction source should exist');
function runtime(existing=null,alreadyInDB=false){
 const events=[],cache=existing?[{message_id:'message',user_id:'owner',emoji:existing}]:[];
 let db=alreadyInDB?{message_id:'message',user_id:'owner',emoji:'❤️'}:(existing?{...cache[0]}:null);
 const sb={from(table){
  assert.equal(table,'patiyiz_dm_reactions');
  return {
   insert(payload){events.push({op:'insert',payload});return {select:async()=>{
    if(db)return {error:{code:'23505',message:'Unique conflict'},data:null};
    db={...payload};return {data:[db],error:null};
   }}},
   update(patch){events.push({op:'update',patch});return {
    eq(){return this},select:async()=>{
     if(db)db={...db,...patch};
     return {data:db?[db]:[],error:null};
    }
   }},
   delete(){events.push({op:'delete'});return {
    eq(){return this},select:async()=>{
     if(!db)return {data:[],error:null};
     db=null;return {data:[{message_id:'message'}],error:null};
    }
   }}
  };
 }};
 let renders=0,modalCloses=0;
 const ctx={
  me:{id:'owner'},sb,data:{dmReactions:cache},
  patiDmEmojis:['❤️','😂','🐾'],
  patiDmFindMessage:()=>({sender_id:'owner',receiver_id:'peer'}),
  blocked:new Set(),
  closeModal:()=>{modalCloses++},
  render:()=>{renders++},
  Error,Promise
 };
 vm.createContext(ctx);
 vm.runInContext(section+'\nglobalThis.react=patiDmSetReaction;',ctx);
 return {ctx,events,read:()=>({db,modalCloses,renders})};
}
test('new DM reaction inserts one row with no key updates',async()=>{
 const x=runtime();
 await x.ctx.react('message','❤️');
 assert.deepEqual(x.events.map(v=>v.op),['insert']);
 assert.equal(x.ctx.data.dmReactions.length,1);
 assert.equal(x.read().renders,1);
});
test('changing a reaction updates the emoji column only',async()=>{
 const x=runtime('❤️');
 await x.ctx.react('message','😂');
 assert.deepEqual(x.events.map(v=>v.op),['update']);
 assert.deepEqual(Object.keys(x.events[0].patch),['emoji']);
 assert.equal(x.ctx.data.dmReactions[0].emoji,'😂');
});
test('tapping the same reaction again deletes the row',async()=>{
 const x=runtime('🐾');
 await x.ctx.react('message','🐾');
 assert.deepEqual(x.events.map(v=>v.op),['delete']);
 assert.equal(x.ctx.data.dmReactions.length,0);
});
test('stale cache with duplicate reaction updates safely after an insert conflict',async()=>{
 const x=runtime(null,true);
 await x.ctx.react('message','😂');
 assert.deepEqual(x.events.map(v=>v.op),['insert','update']);
 assert.deepEqual(Object.keys(x.events[1].patch),['emoji']);
 assert.equal(x.ctx.data.dmReactions[0].emoji,'😂');
});
test('database patches preserve private access while fixing broken operations',()=>{
 assert.match(sql,/GRANT SELECT,DELETE ON TABLE public\.messages TO service_role/);
 assert.match(sql,/GRANT UPDATE\(emoji\) ON TABLE public\.patiyiz_dm_reactions TO authenticated/);
 assert.doesNotMatch(sql,/GRANT UPDATE ON TABLE public\.patiyiz_dm_reactions TO authenticated/);
 assert.match(sql,/GRANT SELECT ON TABLE public\.patiyiz_admins TO service_role/);
 assert.match(sql,/GRANT SELECT,DELETE ON TABLE public\.patiyiz_native_push_tokens TO service_role/);
 assert.match(sql,/private_image_path IS NOT NULL/);
 assert.match(sql,/coalesce\(video_url,''\)/);
 assert.match(sql,/array_length\(media_videos,1\)/);
 assert.match(app,/\.\.\.\(checked\.row\.media_videos\|\|\[\]\)/);
 assert.doesNotMatch(section,/\.upsert\(/);
 assert.doesNotThrow(()=>new vm.Script(app));
});
