const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const sw=fs.readFileSync('patiyiz-sw.js','utf8'),index=fs.readFileSync('index.html','utf8');
test('iPhone PWA requests current JavaScript and CSS rather than silently serving old cached versions',()=>{
 assert.match(sw,/patiyiz-static-v20261030-mobile-refresh/);
 assert.match(sw,/if\(\/\\\.\(\?:js\|css\)\$\/i\.test\(url\.pathname\)\)/);
 assert.match(sw,/await fetch\(request,\{cache:'no-store'\}\)/);
 assert.match(sw,/if\(cached\)return cached;/);
 assert.match(sw,/await self\.skipWaiting\(\)/);
 assert.match(sw,/await self\.clients\.claim\(\)/);
 assert.match(sw,/request\.mode==='navigate'/);
 assert.match(sw,/self\.registration\.showNotification/);
});
test('Latest profile editor and story layout are linked from app shell',()=>{
 assert.match(index,/patiyiz-avatar-crop-20261030\.js\?v=1/);
 assert.match(index,/avatar_story_crop_fix=20261030/);
 assert.match(index,/story_profile_avatar_fix=20261030/);
 assert.doesNotThrow(()=>new Function(sw));
});

test('Story caption and Hareketler are slightly lower without losing safe-area spacing',()=>{
 const css=fs.readFileSync('patiyiz-crop-insights-mobile-final-20261029.css','utf8');
 assert.match(css,/#story-overlay\.pati-story-own \.pati-own-story-stack\{[\s\S]*?bottom:calc\(4px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
 assert.match(css,/#story-overlay\.pati-story-own \.pati-own-story-stack\{[\s\S]*?gap:6px!important/);
 assert.match(css,/#story-overlay\.pati-story-own \.pati-own-story-actions > \.story-viewers-button\{/);
 assert.match(css,/#story-overlay\.pati-story-own \.pati-own-story-footer > \.story-delete\{/);
 assert.match(index,/story_bottom_lower=20261030/);
});
