'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('buchee-story-gestures-20261123.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('story gesture module parses and loads once',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.equal(html.split('src="buchee-story-gestures-20261123.js').length-1,1);
});
test('story dismissal uses existing close action and respects controls',()=>{
 assert.match(source,/data-action="story-close"/);
 assert.match(source,/interactive\(e.target\)/);
 assert.match(source,/dy>105/);
 assert.match(source,/prefers-reduced-motion/);
});
test('story position is restored without new persistence',()=>{
 assert.match(source,/saved.main.scrollTop=saved.top/);
 assert.doesNotMatch(source,/supabase|localStorage|sessionStorage/);
});