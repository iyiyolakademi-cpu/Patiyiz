const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const motion=fs.readFileSync('patiyiz-micro-motion-20261029.js','utf8');
const motionCss=fs.readFileSync('patiyiz-micro-motion-20261029.css','utf8');
const media=fs.readFileSync('patiyiz-system-media.js','utf8');
const layout=fs.readFileSync('patiyiz-crop-insights-mobile-final-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
test('Startup splash no longer inserts three animated paws',()=>{
 assert.doesNotMatch(motion,/pati-motion-splash-paws|querySelector\('#startup \.pati-splash-center'\)/);
 assert.doesNotMatch(motionCss,/#startup \.pati-motion-splash-paws/);
 assert.match(html,/id="startup" class="startup"/);
 assert.match(html,/pati-splash-icon/);
 assert.match(motion,/function loading\(form\)/);
 assert.match(motion,/function heart\(el\)/);
 assert.doesNotThrow(()=>new Function(motion));
});
test('Story audience label and options use readable white text',()=>{
 assert.match(layout,/#patiyiz-system-media\[data-mode="story"\] \.pati-system-edit-panel label\.pati-system-audience/);
 assert.match(layout,/color:#ffffff!important/);
 assert.match(layout,/#patiyiz-system-media\[data-mode="story"\] \.pati-system-edit-panel #pati-system-audience/);
 assert.match(media,/Kimler görebilir\?<select id="pati-system-audience"/);
 assert.match(media,/value="close_friends">Yakın Arkadaşlar/);
});
test('No old selection restore control, handler or persisted former picker selection',()=>{
 assert.doesNotMatch(media,/pati-system-restore|restoreDraft|Önceki seçimi geri getir|PatiyizCameraDraft/);
 assert.match(media,/data-system="gallery"/);
 assert.match(media,/data-system="rechoose"/);
 assert.match(media,/id="pati-system-publish" data-system="publish"/);
 assert.doesNotThrow(()=>new Function(media));
});
