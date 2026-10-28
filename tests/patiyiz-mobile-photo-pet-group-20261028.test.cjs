const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const system=fs.readFileSync('patiyiz-system-media.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-mobile-photo-review-qa-20261028.css','utf8');
const sql=fs.readFileSync('supabase/patiyiz-group-creator-delete-20261028.sql','utf8');
function part(s,e){const i=app.indexOf(s),j=app.indexOf(e,i+s.length);assert.ok(i>=0&&j>i,s);return app.slice(i,j)}
test('Photo review offers a thumbnail strip, selects, removes and reorders before share',()=>{
 new vm.Script(app);new vm.Script(system);
 for(const k of ['pati-system-thumbnails',"select.dataset.system='photo-select'","remove.dataset.system='photo-remove'",'data-system="photo-move-prev"','data-system="photo-move-next"','state.onMedia(next,\'photo\')','state.files=next','current.previewIndex','pati-system-preview-media'])assert.ok(system.includes(k),k);
 assert.match(system,/next\.splice\(at,1\)/);
 assert.match(system,/\[next\[at\],next\[to\]\]=\[next\[to\],next\[at\]\]/);
 assert.match(css,/pati-system-thumb-remove/);
 assert.match(html,/photo_review_edit=20261028/);
});
test('Group deletion is irreversible and exclusive to the creator',()=>{
 const del=part('async function patiGroupDeletePermanent(','async function patiGroupMembersDialog(');
 assert.match(del,/creator_id!==owner/);
 assert.match(del,/confirm\(/);
 assert.match(del,/\.delete\(\)\.eq\('id',groupId\)\.eq\('creator_id',owner\)/);
 assert.match(del,/patiGroupLiveStop\(\)/);
 assert.match(del,/patiGroupFetchInbox\(true\)/);
 assert.match(app,/case 'pati-group-delete':/);
 assert.match(app,/class="pati-group-danger-zone"/);
 assert.match(sql,/FOR DELETE TO authenticated USING \(creator_id=\(select auth\.uid\(\)\)\)/);
});
test('Cat and dog breeds appear as options while legacy species remain editable',()=>{
 assert.match(app,/const species=\['Kedi','Köpek'/);
 assert.match(app,/Kedi:\['Tekir','British Shorthair'/);
 assert.match(app,/Köpek:\['Golden Retriever','Labrador Retriever'/);
 assert.match(app,/patiSyncPetBreedSelect\(form,p\?\.breed\|\|''\)/);
 assert.match(app,/p\?\.species&&!species\.includes\(p\.species\)/);
 assert.match(app,/breed:chosenBreed\.slice\(0,90\)/);
 assert.match(app,/\[name="breed_choice"\]/);
});
test('Mobile question form is a full-height scrolling dialog with a visible submit button',()=>{
 assert.match(app,/pati-community-mobile-ask/);
 assert.match(app,/pati-question-backdrop/);
 assert.match(css,/#modal-root \.pati-question-backdrop/);
 assert.match(css,/#modal-root \.pati-question-fullscreen \.modal-footer/);
 assert.match(css,/min-height:49px!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(html,/patiyiz-mobile-photo-review-qa-20261028\.css/);
});
