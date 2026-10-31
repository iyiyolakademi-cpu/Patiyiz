const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
test('Patiyiz still parses',()=>new vm.Script(app));
test('Private posts and reels do not use the public buckets',()=>{
 assert.match(app,/if\(current\(\)\?\.is_private\).*?patiPrivateMediaUpload\(file,'video'\)/s);
 assert.match(app,/if\(current\(\)\?\.is_private\).*?patiPrivateMediaUpload\(prepared,'image'\)/s);
 assert.match(app,/PATI_PRIVATE_MEDIA_PREFIX='patiyiz-private-posts:'/);
 assert.match(app,/storage\.from\('patiyiz-private-posts'\)\.upload/);
});
test('Private post sources require signed URLs, and raw markers never appear in cards',()=>{
 assert.match(app,/createSignedUrl\(path,60\)/);
 assert.match(app,/patiHydratePrivatePosts\(\)/);
 assert.match(app,/privateUnresolved/);
 assert.match(app,/filter\(x=>!patiPrivateMediaPath\(x\)\)/);
});
test('Private-account stories stay in private storage, including close-friends stories',()=>{
 assert.match(app,/if\(current\(\)\?\.is_private\)return patiCreateCloseFriendStory\(form,f,str,'everyone'\)/);
 assert.match(app,/const close=data\.stories\.filter\(x=>x\.private_image_path/);
 assert.match(app,/storage\.from\('patiyiz-close-stories'\)\.createSignedUrl/);
});
test('Private media cleanup validates ownership and does not leak public URL',()=>{
 assert.match(app,/if\(patiPrivateMediaPath\(url\)\)/);
 assert.match(app,/name\.startsWith\(owner\+'\/'\)/);
 assert.match(app,/bucket:'patiyiz-private-posts'/);
});
