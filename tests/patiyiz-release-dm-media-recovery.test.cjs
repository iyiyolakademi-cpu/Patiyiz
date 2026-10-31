const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const helper=fs.readFileSync('patiyiz-private-media-20261031.js','utf8');
const start=app.indexOf('const patiDmSignedCache=new Map();');
const end=app.indexOf('async function sendDmImage',start);
assert.ok(start>=0&&end>start,'DM media loader exists');
const fragment=app.slice(start,end);

function element(path){
 const events={};
 return {dataset:{privatePath:path},src:'',tagName:'IMG',isConnected:true,
  closest(){return null},
  addEventListener(name,fn){events[name]=fn},
  removeAttribute(name){if(name==='src')this.src=''},
  events};
}
function setup(items,sign){
 let calls=0;
 const context={Promise,Date,console,
  document:{querySelectorAll(){return items}},
  me:{id:'11111111-1111-1111-1111-111111111111'},
  sb:{storage:{from(bucket){assert.equal(bucket,'patiyiz-private-messages');return {
   async createSignedUrl(path,ttl){calls++;assert.equal(ttl,1800);return sign(path,calls)}
  }}}}
 };
 vm.runInNewContext(fragment+';globalThis.api={loadDmMedia,patiDmSignedCache,patiDmSigningPending}',context);
 return {api:context.api,count:()=>calls};
}
test('DM attachments share one signed URL request, without exposing paths or tokens as text',async()=>{
 const a=element('11111111-1111-1111-1111-111111111111/a.png');
 const b=element(a.dataset.privatePath);
 const ctx=setup([a,b],async(_,i)=>({data:{signedUrl:'https://signed.example/file?token='+i},error:null}));
 await ctx.api.loadDmMedia();
 assert.equal(ctx.count(),1);
 assert.equal(a.src,b.src);
 await ctx.api.loadDmMedia();
 assert.equal(ctx.count(),1);
 assert.equal(ctx.api.patiDmSigningPending.size,0);
 assert.equal(a.dataset.patiDmMediaBound,'1');
});
test('A failed media link re-signs once and allows manual retry without infinite requests',async()=>{
 const a=element('11111111-1111-1111-1111-111111111111/a.png');
 const ctx=setup([a],async(_,i)=>({data:{signedUrl:'https://signed.example/file?token='+i},error:null}));
 await ctx.api.loadDmMedia();
 a.events.error();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ctx.count(),2);
 a.events.error();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ctx.count(),2);
});
test('Denied storage reads never set a media src',async()=>{
 const a=element('11111111-1111-1111-1111-111111111111/a.png');
 const ctx=setup([a],async()=>({data:null,error:{message:'Forbidden'}}));
 await ctx.api.loadDmMedia();
 assert.equal(a.src,'');
 assert.equal(ctx.count(),1);
});
test('Private media links refresh immediately after returning from a suspended app',async()=>{
 const events={};
 const fakeWindow={document:{hidden:false,addEventListener(name,fn){events[name]=fn}},
  setInterval(fn){fakeWindow.interval=fn}};
 vm.runInNewContext(helper,{window:fakeWindow,console,Date,Promise,crypto:{randomUUID:()=> '22222222-2222-2222-2222-222222222222'}});
 const media=fakeWindow.PatiyizPrivateMedia;
 const owner='11111111-1111-1111-1111-111111111111',path=owner+'/22222222-2222-2222-2222-222222222222.jpg';
 const sb={storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://signed.example/private'},error:null})})}};
 await media.hydrateRows([{id:'1',image_url:'patiyiz-private-posts:'+path}],owner,sb);
 let refreshed=0;media.onRefresh(async()=>{refreshed++});
 events.visibilitychange();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(refreshed,1);
 fakeWindow.document.hidden=true;events.visibilitychange();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(refreshed,1);
});
