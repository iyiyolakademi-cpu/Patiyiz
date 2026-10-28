const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const system=fs.readFileSync('patiyiz-system-media.js','utf8');
const css=fs.readFileSync('patiyiz-story-community-carousel-20261028.css','utf8');
const html=fs.readFileSync('index.html','utf8');

test('Multi-photo composer includes accessible prev/next, counter and swipe syncing',()=>{
 new vm.Script(app);
 new vm.Script(system);
 for(const marker of ['data-system="preview-prev"','data-system="preview-next"','id="pati-system-carousel-count"','pati-system-carousel-dots','updateCarouselControls(current)','media.scrollTo(','current.previewIndex']){
  assert.ok(system.includes(marker),marker);
 }
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(css,/pati-system-carousel-controls/);
 assert.match(html,/patiyiz-story-community-carousel-20261028\.css/);
});
test('Caption may remain empty when posting photos; text only still needs a body',()=>{
 assert.match(app,/if\(!body&&!photoFiles\.length&&!hasVideo\)/);
 assert.match(app,/if\(captionField&&!textOnly\)captionField.required=false/);
 assert.match(system,/Açıklama \(isteğe bağlı\)/);
});
test('Story viewer rows link to profiles and close-friends get green badge',()=>{
 assert.match(app,/data-action="story-viewer-profile"/);
 assert.match(app,/case 'story-viewer-profile':/);
 assert.match(app,/pati-story-close-friends-label/);
 assert.match(app,/root\.dataset\.audience=/);
 assert.match(css,/\.pati-story-close-friends-label/);
 assert.match(css,/#story-overlay\.pati-story-own \.story-caption/);
 assert.match(css,/#story-overlay\.pati-story-has-source \.story-caption/);
});
test('Question creation is full-screen mobile and secondary screens have back controls',()=>{
 assert.match(app,/pati-question-fullscreen/);
 assert.match(app,/case 'pati-page-back'/);
 assert.match(app,/patiEnsurePageBack/);
 assert.match(css,/#modal-root \.pati-question-fullscreen/);
 assert.match(css,/#main-content \.pati-page-back/);
});
test('Positive, negative and undo question ratings are mutually exclusive and persisted',async()=>{
 const start=app.indexOf('async function patiRateQuestion('),end=app.indexOf('function composeQuestion(){',start);
 assert.ok(start>=0&&end>start);
 const rows=[];
 const ctx={
  me:{id:'viewer'},view:'home',data:{questions:[{id:'q1'}],votes:[]},
  voted:new Set(),Set,
  notify(){},
  sb:{from(table){
   assert.equal(table,'question_votes');
   return {
    delete(){return this},
    eq(key,val){this.match={...(this.match||{}),[key]:val};return this},
    then(resolve,reject){if(this.match){for(let i=rows.length-1;i>=0;i--)if(rows[i].question_id===this.match.question_id&&rows[i].user_id===this.match.user_id)rows.splice(i,1);}return Promise.resolve({error:null}).then(resolve,reject)},
    insert(record){rows.push({...record});return {select(){return {single(){return Promise.resolve({data:record,error:null})}}}}}
   };
  }}
 };
 const rate=vm.runInNewContext(app.slice(start,end)+'\npatiRateQuestion',ctx);
 await rate('q1',true);
 assert.equal(rows.length,1);assert.equal(rows[0].is_helpful,true);
 await rate('q1',false);
 assert.equal(rows.length,1);assert.equal(rows[0].is_helpful,false);
 assert.equal(ctx.data.votes.length,1);
 await rate('q1',false);
 assert.equal(rows.length,0);assert.equal(ctx.data.votes.length,0);
});
