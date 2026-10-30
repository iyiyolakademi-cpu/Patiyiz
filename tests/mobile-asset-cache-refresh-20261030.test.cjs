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
