const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-instagram-reels-dm-story-ring-20261028.css','utf8');
const sql=fs.readFileSync('supabase/patiyiz-profile-instagram-url-20261028.sql','utf8');
const section=(start,end)=>{const a=app.indexOf(start),b=app.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return app.slice(a,b)};
test('App still parses and references the new stylesheet',()=>{
 new vm.Script(app);
 assert.match(html,/patiyiz-instagram-reels-dm-story-ring-20261028\.css/);
 assert.match(css,/pati-dm-story-trigger/);
});
test('Instagram user names and links normalize safely without open redirect',()=>{
 const norm=vm.runInNewContext(section('function patiNormalizeInstagramUrl(','function patiInstagramProfileLink(')+'\npatiNormalizeInstagramUrl',{URL});
 assert.equal(norm('@berke_yuksekdag'),'https://www.instagram.com/berke_yuksekdag/');
 assert.equal(norm('https://instagram.com/merhaba.test/?igsh=123'),'https://www.instagram.com/merhaba.test/');
 assert.equal(norm(''),'');
 for(const unsafe of ['https://evil.com/foo','https://instagram.com.evil.com/abc','https://instagram.com/reel/abc','javascript:alert(1)','some/path','https://instagram.com/@bad']){
  assert.throws(()=>norm(unsafe),unsafe);
 }
 assert.match(app,/instagram_url:patiNormalizeInstagramUrl\(str\('instagram_url'\)\)/);
 assert.match(app,/patiInstagramProfileLink\(p\)/);
 assert.match(app,/rel="noopener noreferrer"/);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS instagram_url/);
});
test('DM links decode only internal persisted post links (including legacy messages)',()=>{
 const extract=vm.runInNewContext(section('function patiDmSharedPostId(','function patiDmHasActiveStory(')+'\npatiDmSharedPostId');
 const id='12345678-1234-4123-8123-abcdef123456';
 assert.equal(extract('📨 Paylaşım: https://patiyiz.com/#post-'+id),id);
 assert.equal(extract('📨 Paylaşım: https://patiyiz.com/index.html#post-'+id),id);
 assert.equal(extract('https://notpatiyiz.com/#post-'+id),'');
 assert.equal(extract('Merhaba 📩 #post-'+id),'');
 assert.equal(extract('📨 Paylaşım: javascript:alert(1)#post-'+id),'');
});
test('DM Reels uses a visual cover card, opens original post and preserves conversation return',()=>{
 assert.match(app,/patiDmSharedCard\(x\)/);
 assert.match(app,/pati-dm-shared-reel/);
 assert.match(app,/patiDmHydrateSharedPosts\(conv,personId\)/);
 assert.match(app,/case 'dm-open-shared-post':run\(\(\)=>patiDmOpenSharedPost\(id\)\)/);
 assert.match(app,/patiDmSharedReturnPeer=personId/);
 assert.match(app,/const returnPeer=patiDmSharedReturnPeer/);
 assert.match(css,/aspect-ratio:9\/13/);
});
test('Only non-expired accessible story records produce rings in DM',()=>{
 const s=section('function patiDmHasActiveStory(','function patiDmStoryRingButton(');
 const now=Date.now();
 const f=vm.runInNewContext(s+'\npatiDmHasActiveStory',{data:{stories:[
   {author_id:'A',expires_at:new Date(now+180000).toISOString()},
   {author_id:'B',expires_at:new Date(now-5000).toISOString()}
 ]},blocked:new Set(['C']),Date});
 assert.equal(f('A'),true);
 assert.equal(f('B'),false);
 assert.equal(f('C'),false);
 assert.match(app,/case 'dm-story-open':/);
 assert.match(app,/patiDmStoryRingButton\(personId\)/);
 assert.match(css,/linear-gradient\(35deg,#ffb831/);
});
