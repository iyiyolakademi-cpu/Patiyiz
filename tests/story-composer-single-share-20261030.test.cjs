const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'patiyiz-system-media.js'),'utf8');
const css=fs.readFileSync(path.join(root,'patiyiz-crop-insights-mobile-final-20261029.css'),'utf8');
const native=fs.readFileSync(path.join(root,'native-capacitor/scripts/build-web.mjs'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('System media composer has only one visible and wired publish control',()=>{
 assert.equal((ui.match(/data-system="publish"/g)||[]).length,1,'Only bottom Share button exists in composer markup');
 assert.ok(ui.includes('id="pati-system-publish" data-system="publish"'),'A single real publish action is kept');
 assert.ok(!ui.includes('pati-system-head-publish'),'No second header share control or stale handlers');
 assert.ok(ui.includes("if(action==='publish')"),'Existing publication action stays wired');
});
test('Photo crop, choose another, and Share are inside a separated control panel',()=>{
 assert.ok(ui.includes('pati-system-edit-panel'));
 assert.ok(ui.includes('pati-system-crop-entry'));
 assert.ok(ui.includes('pati-system-crop-chevron'));
 assert.ok(ui.includes('data-system="rechoose"'));
 assert.ok(css.includes('#patiyiz-system-media .pati-system-edit-panel'));
 assert.ok(css.includes('position:static!important;'));
 assert.ok(css.includes('grid-template-columns:minmax(0,1fr)!important;'));
 assert.ok(css.includes('max-height:43dvh!important;'));
});
test('Final CSS is loaded on web and is packaged for Capacitor',()=>{
 assert.ok(index.includes('patiyiz-crop-insights-mobile-final-20261029.css'));
 assert.ok(native.includes("'patiyiz-crop-insights-mobile-final-20261029.css'"));
});
test('System media source parses and keeps publication/camera actions',()=>{
 assert.doesNotThrow(()=>new Function(ui));
 assert.ok(ui.includes("if(action==='rechoose')"));
 assert.ok(ui.includes("state.onPublish(root.querySelector('#pati-system-caption').value)"));
});
