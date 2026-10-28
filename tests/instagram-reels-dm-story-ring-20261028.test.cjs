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
test('Profile links accept safe external web destinations across all services',()=>{
 const helper=section('const PATI_PROFILE_LINK_LIMIT=12;','function patiProfileLinksHTML(');
 const api=vm.runInNewContext(helper+'\n({patiNormalizeProfileUrl,patiProfileLinks})',{URL});
 const norm=api.patiNormalizeProfileUrl;
 assert.equal(norm('example.com'),'https://example.com/');
 assert.equal(norm('https://www.youtube.com/watch?v=abc'),'https://www.youtube.com/watch?v=abc');
 assert.equal(norm('tiktok.com/@example'),'https://tiktok.com/@example');
 assert.equal(norm('https://instagram.com/merhaba.test/?igsh=123'),'https://instagram.com/merhaba.test/?igsh=123');
 assert.equal(norm('https://patiyiz.com'),'https://patiyiz.com/');
 for(const unsafe of ['javascript:alert(1)','file:///etc/passwd','data:text/html,x','https://evil.com@localhost','https://localhost/path','http://127.0.0.1/','https://10.0.0.5/','some/path','https://user:password@example.com/']){
  assert.throws(()=>norm(unsafe),unsafe);
 }
 const links=api.patiProfileLinks({profile_links:[{title:'Mağazam',url:'shop.example.org'},{title:'Kanal',url:'https://youtube.com/@channel'}]});
 assert.equal(links.length,2);
 assert.equal(links[0].title,'Mağazam');
 assert.equal(links[1].url,'https://youtube.com/@channel');
 assert.match(app,/profile_links:patiCollectProfileLinks\(form\)/);
 assert.match(app,/patiProfileLinksHTML\(p\)/);
 assert.match(app,/patiBindProfileLinkEditor\(document.getElementById\('profile-form'\)\)/);
 assert.doesNotMatch(app,/Instagram bağlantısı veya @kullanıcıadı/);
 assert.match(app,/rel="noopener noreferrer"/);
 assert.match(html,/patiyiz-profile-links-general-20261028\.css/);
 assert.match(app,/data-action="pati-profile-link-add"/);
 assert.match(app,/data-action="pati-profile-link-remove"/);
});
test('Multiple links are validated, deduplicated and bounded',()=>{
 const script=section('const PATI_PROFILE_LINK_LIMIT=12;','function patiProfileLinksHTML(')+
   section('function patiCollectProfileLinks(','function patiBindProfileLinkEditor(');
 const collect=vm.runInNewContext(script+'\npatiCollectProfileLinks',{URL});
 const row=(title,url)=>({querySelector:(selector)=>({value:selector.includes('link_title')?title:url})});
 assert.equal(JSON.stringify(collect({querySelectorAll:()=>[row('Web sitem','example.com'),row('Kanalım','youtube.com/@test')]})),
  JSON.stringify([{title:'Web sitem',url:'https://example.com/'},{title:'Kanalım',url:'https://youtube.com/@test'}]));
 assert.equal(collect({querySelectorAll:()=>[row('','')]}).length,0);
 assert.throws(()=>collect({querySelectorAll:()=>[row('Biri','example.com'),row('İki','https://example.com/')]}),/Aynı bağlantıyı/);
 assert.throws(()=>collect({querySelectorAll:()=>Array.from({length:13},(_,i)=>row('Link '+i,'site'+i+'.com'))}),/En fazla 12/);
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
