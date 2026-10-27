const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const picker=fs.readFileSync('patiyiz-system-media.js','utf8');
const style=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
test('Every media option uses a distinct inline SVG instead of a placeholder glyph',()=>{
 for(const n of ['photo','video','gallery']){
  assert.match(picker,new RegExp(''+n+":'<svg viewBox="));
  assert.match(picker,new RegExp('pati-system-option-'+n+'" aria-hidden="true"'));
  assert.match(picker,new RegExp('\\\\+optionIcons\\\\.'+n+'\\\\+'));
  assert.match(style,new RegExp('\\\\.pati-system-option-'+n+'\\\\{'));
 }
 assert.doesNotMatch(picker,/pati-system-option-icon">[▣◉▦]/);
});
test('The photo, video and gallery actions retain their current OS picker behavior',()=>{
 assert.match(picker,/data-system="camera-photo"/);
 assert.match(picker,/data-system="camera-video"/);
 assert.match(picker,/data-system="gallery"/);
 assert.match(picker,/window\.PatiyizNative\.pickPhotoForInput\(input,'camera',false\)/);
 assert.match(picker,/try\{input\.click\(\)\}/);
 assert.match(picker,/await state\.onPublish/);
});
test('Icons remain accessible and optimized without an external network icon pack',()=>{
 assert.match(picker,/aria-hidden="true" focusable="false"/);
 assert.match(style,/#patiyiz-system-media \.pati-system-options \.pati-system-option-icon svg/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/patiyiz-system-media\.js\?v=[^"]*icons=20261027/);
 assert.match(html,/patiyiz-inspired\.css\?v=[^"]*icons=20261027/);
});