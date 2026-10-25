const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('knowledge-center-v2.css', 'utf8');
const dataScript = fs.readFileSync('knowledge.js', 'utf8');
const rawKnowledge = dataScript.split('\n')[0].replace(/^window\.PATIYIZ_KNOWLEDGE=/, '').replace(/;$/, '');
const knowledge = JSON.parse(rawKnowledge);

function setup() {
  const start = app.indexOf("let kbCategory='Tümü'");
  const end = app.indexOf('function knowledgePage(){', start);
  assert.ok(start > 0 && end > start, 'Bilgi Merkezi filtering functions found');
  const elements = Object.fromEntries(['kb-results', 'kb-count', 'kb-saved-count'].map(id => [id, {innerHTML:'',textContent:''}]));
  const sandbox = {
    knowledge: [
      {id:'kb1',species:'Kedi',category:'Bakım',title:'Kum kabı',excerpt:'Tuvalet düzeni',content:'Kum temizliği',tips:[]},
      {id:'kb2',species:'Köpek',category:'Sağlık',title:'İshal durumunda dikkat',excerpt:'Veteriner desteği',content:'İshal hakkında',tips:['Gözlemleri kaydet']},
      {id:'kb3',species:'Kedi',category:'Beslenme',title:'Mama seçimi',excerpt:'Besin dengesi',content:'Beslenme koşulları',tips:[]}
    ],
    favorites:new Set(['kb2']), kbFilter:'Tümü', kbSearch:'', view:'knowledge', articleId:'',
    document:{getElementById:id=>elements[id]||null},
    petIcon:()=> '🐾',
    esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')
  };
  vm.createContext(sandbox);
  vm.runInContext(app.slice(start,end)+'\nglobalThis.api = {kbFold,kbResults,kbSavedCount,kbCards,kbUpdateResults};', sandbox);
  return {sandbox,elements,api:sandbox.api};
}

test('original 66 rehber, stable ids and source mapping remain intact', () => {
  assert.equal(knowledge.length,66);
  assert.equal(new Set(knowledge.map(a=>a.id)).size,66);
  const sourceLine=dataScript.split('\n')[1];
  const sources=JSON.parse(sourceLine.replace(/^window\.PATIYIZ_SOURCES=/,'').replace(/;$/,''));
  for(const article of knowledge) {
    assert.ok(article.title && article.excerpt && article.content,article.id);
    assert.ok(Array.isArray(article.tips),article.id);
    assert.ok(sources[article.source], 'Source missing for '+article.id);
    assert.match(sources[article.source][1], /^https:\/\//);
  }
});
test('instant Turkish search includes content, tips and accents',()=>{
  const {sandbox,api}=setup();
  sandbox.kbSearch='ISHAL';
  assert.deepEqual(Array.from(api.kbResults(),a=>a.id),['kb2']);
  sandbox.kbSearch='veteriner';
  assert.deepEqual(Array.from(api.kbResults(),a=>a.id),['kb2']);
  sandbox.kbSearch='mama';
  assert.deepEqual(Array.from(api.kbResults(),a=>a.id),['kb3']);
});
test('species and topic filters intersect correctly',()=>{
  const {sandbox,api}=setup();
  sandbox.kbFilter='Kedi';
  vm.runInContext("kbCategory='Beslenme'",sandbox);
  assert.deepEqual(Array.from(api.kbResults(),a=>a.id),['kb3']);
  sandbox.kbSearch='köpek';
  assert.equal(api.kbResults().length,0);
});
test('saved filter shows only the viewer saved articles',()=>{
  const {sandbox,api}=setup();
  sandbox.kbFilter='Kaydedilenler';
  assert.deepEqual(Array.from(api.kbResults(),a=>a.id),['kb2']);
  assert.equal(api.kbSavedCount(),1);
  sandbox.favorites.delete('kb2');
  assert.equal(api.kbSavedCount(),0);
  assert.match(api.kbCards(api.kbResults()),/Henüz kaydettiğin rehber yok/);
});
test('article cards have separate accessible save buttons',()=>{
  const {api}=setup();
  const markup=api.kbCards(api.kbResults());
  assert.match(markup,/data-action="kb-read"/);
  assert.match(markup,/data-action="kb-save"/);
  assert.match(markup,/aria-pressed="true"/);
  assert.match(markup,/aria-pressed="false"/);
  assert.doesNotMatch(markup,/<button[^>]*>\s*<button/);
});
test('instant search changes results without replacing search input',()=>{
  const {sandbox,elements,api}=setup();
  sandbox.kbSearch='mama';
  api.kbUpdateResults();
  assert.match(elements['kb-results'].innerHTML,/Mama seçimi/);
  assert.doesNotMatch(elements['kb-results'].innerHTML,/Kum kabı/);
  assert.equal(elements['kb-count'].textContent,'1 rehber bulundu');
  assert.equal(elements['kb-saved-count'].textContent,1);
});
test('existing Supabase bookmarks are scoped to the authenticated user',()=>{
  assert.match(app,/if\(table==='kb_bookmarks'\)req=req\.eq\('user_id',userId\)/);
  assert.match(app,/if\(table==='kb_bookmarks'\)req=req\.eq\('user_id',requestedUser\)/);
  assert.match(app,/if\(table==='kb_bookmarks'\)favorites=new Set\(rows\.map\(x=>x\.article_id\)\)/);
  assert.match(app,/case 'kb-save':run\(\(\)=>doToggle\('kb_bookmarks'/);
});
test('new controls are handled, source links use the original mapping',()=>{
  for(const fragment of ["case 'kb-category':","case 'kb-clear':","case 'kb-reset':","e.target?.id!=='kb-search'","window.PATIYIZ_SOURCES?.[a.source]"])assert.ok(app.includes(fragment),fragment);
});
test('knowledge stylesheet and cache busting are loaded after existing skins',()=>{
  const old=html.indexOf('reels-stage4.css');
  const current=html.indexOf('knowledge-center-v2.css');
  assert.ok(old>=0&&current>old);
  assert.ok(html.includes('knowledge20261025=2'));
  assert.match(css,/\.kb-v2-grid/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css, /:focus-visible/);
});