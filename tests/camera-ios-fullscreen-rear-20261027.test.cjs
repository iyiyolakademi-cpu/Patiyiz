const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const camera=fs.readFileSync('patiyiz-camera-flow.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const block=()=>{
 const begin=camera.indexOf('function applyPortraitFullscreen(');
 const end=camera.indexOf('function showGalleryThumbnail(',begin);
 assert.ok(begin>=0&&end>begin);
 return camera.slice(begin,end);
};
test('Rear lens is the first camera on Story, Reels and Post',()=>{
 assert.match(camera,/facing:'environment',selected:\[\]/);
 assert.match(camera,/facingMode:\{ideal:current\.facing\}/);
 assert.match(camera,/state\.facing=state\.facing==='environment'\?'user':'environment'/);
});
test('Portrait full-screen layout is applied independent of 740px CSS media threshold',()=>{
 assert.match(camera,/if\(mode==='story'\|\|mode==='reels'\)applyPortraitFullscreen\(root\)/);
 const src=block(),fn=vm.runInNewContext(src+'\napplyPortraitFullscreen',{});
 const store=new Map(),make=name=>{
  const cssRules={};
  const el={style:{setProperty(key,value,priority){cssRules[key]={value,priority}}}};
  store.set(name,cssRules);return el;
 };
 const map=new Map();
 for(const name of ['.pati-camera-stage','.pati-camera-viewfinder','#pati-camera-live','#pati-camera-chosen-image','#pati-camera-chosen-video','.pati-camera-head','.pati-camera-bottom','.pati-camera-gallery-panel'])
  map.set(name,make(name));
 const root=make('root');
 root.querySelector=name=>map.get(name);
 fn(root);
 const check=(selector,name,value)=>{const result=store.get(selector)[name];assert.equal(result?.value,value,selector+' '+name);assert.equal(result?.priority,'important')};
 check('root','position','fixed');check('root','inset','0');
 check('root','height','100dvh');check('.pati-camera-stage','height','100%');
 check('.pati-camera-viewfinder','height','100%');
 check('.pati-camera-viewfinder','aspect-ratio','auto');
 check('#pati-camera-live','object-fit','cover');
 check('.pati-camera-head','position','absolute');
 check('.pati-camera-head','z-index','7');
 check('.pati-camera-bottom','position','absolute');
 check('.pati-camera-bottom','bottom','0');
 check('.pati-camera-bottom','background','linear-gradient(0deg,rgba(0,0,0,.74),rgba(0,0,0,.34) 58%,transparent)');
 check('.pati-camera-gallery-panel','bottom','0');
});
test('iPhone photo and video viewfinder cannot be squeezed into letterboxed area',()=>{
 const marker=css.indexOf('/* iPhone full-screen camera reliability');
 assert.ok(marker>0);
 const patch=css.slice(marker);
 assert.match(patch,/data-capture-aspect="portrait"[^{]*\{[^}]*height:100dvh!important/);
 assert.match(patch,/\.pati-camera-stage,[\s\S]*?\.pati-camera-viewfinder\{[\s\S]*?position:absolute!important;inset:0!important/);
 assert.match(patch,/pati-camera-chosen-video\)\{[\s\S]*?object-fit:cover!important/);
 assert.match(patch,/pati-camera-head\{[\s\S]*?position:absolute!important/);
 assert.match(patch,/pati-camera-bottom\{[\s\S]*?position:absolute!important/);
 assert.match(patch,/\.pati-camera-selected-count\{display:none!important/);
});
test('Galeri uses gallery placeholder instead of app icon until actual photo available',()=>{
 assert.match(camera,/class="pati-camera-gallery-placeholder"/);
 assert.match(camera,/id="pati-camera-gallery-thumb" alt="" hidden/);
 assert.match(camera,/showGalleryThumbnail\(current\.root,r\.photos\[0\]\.thumbnail\)/);
 assert.doesNotMatch(camera,/<img id="pati-camera-gallery-thumb"[^>]*patiyiz-app-icon/);
});
test('iOS standalone status style and new static assets are refreshed',()=>{
 assert.match(html,/apple-mobile-web-app-status-bar-style" content="black-translucent"/);
 assert.match(html,/patiyiz-camera-flow\.js[^"]*iphonefix=20261027/);
 assert.match(html,/patiyiz-inspired\.css[^"]*iphonefix=20261027/);
});
