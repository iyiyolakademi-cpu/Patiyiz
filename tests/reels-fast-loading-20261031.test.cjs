const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('patiyiz-reels-fast-feed-20261031.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

test('Hidden buffering indicators do not render when no buffering occurs', () => {
 assert.match(css, /\.pati-reel-buffering\[hidden\]/);
 assert.match(css, /\.pati-reels-load-more\[hidden\]/);
 assert.match(css, /\.pati-reel-buffering\[hidden\],[\s\S]*?display:none!important/);
 assert.match(app, /pati-reel-buffering" role="status" aria-live="polite" hidden/);
});

test('Buffer indicators wait for sustained stalls and are cleared by playback', () => {
 assert.match(app, /pendingBuffer=setTimeout\(\(\)=>\{[\s\S]*?readyState<3\)busy\(true\);\s*\},1500\)/);
 assert.match(app, /\['playing','canplay','seeked','pause'\]/);
});

test('Current, following, and upcoming videos warm without downloading the whole feed', () => {
 const start=app.indexOf('let lastPreparedIndex=-1;');
 const end=app.indexOf(' const loadNearEnd=()=>{',start);
 assert.ok(start>=0&&end>start,'Reels prefetch controller should exist');
 const controller=app.slice(start,end);
 for(const lowData of [false,true]){
  const videos=Array.from({length:8},(_,i)=>({id:i,preload:'none',src:'',getAttribute(name){return name==='src'?this.src:''}}));
  const attach=video=>{if(!video.src)video.src='reel-'+video.id+'.mp4'};
  const api=vm.runInNewContext(`(()=>{const videos=globalVideos,lowData=globalLowData,attach=globalAttach;${controller};return {prepareNext,videos};})()`,{globalVideos:videos,globalLowData:lowData,globalAttach:attach});
  api.prepareNext(videos[2]);
  assert.equal(videos[2].preload,'auto');
  assert.equal(videos[3].preload,lowData?'metadata':'auto');
  assert.equal(videos[3].src,'reel-3.mp4');
  assert.equal(videos[4].src,lowData?'':'reel-4.mp4');
  assert.equal(videos[0].src,'','Distant clips should not be prefetched');
  assert.equal(videos[7].src,'','The last clip should not be requested early');
  if(!lowData)assert.equal(videos[1].preload,'metadata');
 }
});

test('Pagination fetches the next page early and media asset versions are refreshed', () => {
 assert.match(app, /if\(idx\+6>=videos\.length\)void patiLoadMoreReels\(\)/);
 assert.match(html, /patiyiz-reels-fast-feed-20261031\.css\?v=2/);
 assert.match(html, /reels_stream_fast=20261031v2/);
});
