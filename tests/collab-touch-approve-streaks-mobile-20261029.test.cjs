const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const pickerCode=fs.readFileSync('patiyiz-collab-picker-20261029.js','utf8');
const delightCode=fs.readFileSync('patiyiz-delight-20261029.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-polish-collab-dm-story-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const mock=(profiles=[],dbProfiles=[])=>{
 const callbacks={input:{},results:{},selected:{},wrap:{}};
 const timers=[];
 const input={value:'',addEventListener:(n,fn)=>callbacks.input[n]=fn,setAttribute(){},blur(){},focus(){}};
 const hidden={value:''};
 const selected={hidden:true,innerHTML:'',addEventListener:(n,fn)=>callbacks.selected[n]=fn};
 const results={hidden:true,innerHTML:'',addEventListener:(n,fn)=>callbacks.results[n]=fn,contains:x=>!!x?._approve,querySelectorAll:()=>[],setAttribute(){}};
 const wrap={isConnected:true,dataset:{},querySelector(q){return q==='input[name="collab_handle"]'?input:
 q==='input[name="collab_user_id"]'?hidden:q==='.pati-collab-search-results'?results:q==='.pati-collab-selected'?selected:null},
 addEventListener:(n,fn)=>callbacks.wrap[n]=fn,contains:()=>false};
 const form={querySelector:q=>q==='[data-pati-collab-picker]'?wrap:null};
 const queries=[];
 const sb={from(table){assert.equal(table,'profiles');return {select(){return {ilike(col,pat){queries.push([col,pat]);return {limit(){return Promise.resolve({data:dbProfiles.filter(p=>(p[col]||'').toLowerCase().includes(pat.replace(/[%\\]/g,'').toLowerCase()))})}}}}}}}};
 const sandbox={console,window:{setTimeout(fn){timers.push(fn);return timers.length}},document:{activeElement:null},setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){},setInterval(){},clearInterval(){}};
 vm.runInNewContext(pickerCode,sandbox);
 const api=sandbox.window.PatiyizCollabPicker;
 api.mount(form,{sb,userId:'owner',blocked:new Set(),localProfiles:profiles,escape:x=>String(x)});
 const approve=id=>{
  const button={_approve:true,dataset:{patiApproveId:id}};
  const event={target:{closest:q=>q==='button[data-pati-approve-id]'?button:null},preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};
  callbacks.results.pointerdown(event);
  return event;
 };
 return {api,form,input,hidden,selected,results,wrap,callbacks,timers,queries,approve};
};
test('Typing only the middle of a username shows its profile and Onayla selects immediately',async()=>{
 const profile={id:'user-111',handle:'berkedenizyuksekdag',display_name:'Berke Deniz'};
 const m=mock([profile]);
 m.input.value='sek';
 m.callbacks.input.input();
 assert.equal(m.timers.length,1);
 m.timers.shift()();
 assert.match(m.results.innerHTML,/Onayla<\/button>/);
 assert.match(m.results.innerHTML,/berkedenizyuksekdag/);
 const ev=m.approve(profile.id);
 assert.equal(ev.prevented,true);
 assert.equal(m.hidden.value,profile.id);
 assert.equal(m.input.value,'@berkedenizyuksekdag');
 assert.equal(m.selected.hidden,false);
 assert.equal(m.api.selectedId(m.form,true),profile.id);
 assert.equal(m.results.hidden,true);
});
test('iPhone touch approval before input blur stays selected and cannot be undone by focusout timer',()=>{
 const p={id:'user-222',handle:'beyzasahin',display_name:'Beyza Şahin'};
 const m=mock([p]);m.input.value='sah';m.callbacks.input.input();m.timers.shift()();
 const button={_approve:true,dataset:{patiApproveId:p.id}};
 const event={target:{closest:()=>button},preventDefault(){},stopPropagation(){}};
 m.callbacks.results.touchstart(event);
 m.callbacks.wrap.focusout({relatedTarget:null});
 for(const fn of m.timers.splice(0))fn();
 assert.equal(m.hidden.value,p.id);assert.equal(m.selected.hidden,false);
 assert.equal(m.api.selectedId(m.form,true),p.id);
});
test('Server search matches fragments anywhere, not only startsWith prefixes',async()=>{
 const p={id:'user-333',handle:'beyzasahin',display_name:'Beyza Şahin'};
 const m=mock([], [p]);m.input.value='yza';m.callbacks.input.input();m.timers.shift()();
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(m.queries.some(([field,pattern])=>field==='handle'&&pattern==='%yza%'),JSON.stringify(m.queries));
 assert.match(m.results.innerHTML,/beyzasahin/);
 m.approve(p.id);
 assert.equal(m.api.selectedId(m.form,true),p.id);
});
test('Typing after approval clears the account instead of sending to an unverified profile',()=>{
 const p={id:'user-444',handle:'patiyizofficial',display_name:'Patiyiz'};
 const m=mock([p]);m.input.value='official';m.callbacks.input.input();m.timers.shift()();m.approve(p.id);
 m.input.value='different';m.callbacks.input.input();
 assert.equal(m.hidden.value,'');
 assert.throws(()=>m.api.selectedId(m.form,false),/çıkan profillerden/);
});
test('Seriler uses a compact hero and one-column touch friendly goals on phones',()=>{
 assert.match(delightCode,/pati-streak-hero-eyebrow/);
 assert.match(app,/class="pati-streak-title"/);
 assert.match(app,/class="pati-streak-goal-current"/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/\.pati-streak-goal-grid\{grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/\.pati-streak-goal-footer\{\s*display:grid!important;grid-template-columns:minmax\(0,1fr\) minmax\(106px,auto\)!important/);
 assert.match(css,/html\[data-pati-theme="dark"\] #main-content \.pati-streak-page-card/);
 assert.match(css,/\.pati-streak-page-card \.pati-streak-week/);
 assert.match(css,/touch-action:manipulation/);
 assert.match(html,/patiyiz-collab-picker-20261029\.js\?v=3/);
 assert.match(html,/patiyiz-delight-20261029\.js\?v=4/);
 assert.match(html,/patiyiz-polish-collab-dm-story-20261029\.css\?v=3/);
});
