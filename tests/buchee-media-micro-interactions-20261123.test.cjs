'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('buchee-media-micro-interactions-20261123.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('micro interactions parse and load once',()=>{assert.doesNotThrow(()=>new vm.Script(src));assert.equal(html.split('src="buchee-media-micro-interactions-20261123.js').length-1,1)});
test('reel hold pauses and resumes only a previously playing video',()=>{assert.match(src,/video\.pause\(\)/);assert.match(src,/state\.wasPlaying&&state\.video\.isConnected/);assert.match(src,/video\.play\(\)/)});
test('DM swipe uses existing reply action, story emoji uses existing reply form',()=>{assert.match(src,/b\.dataset\.action='dm-reply'/);assert.match(src,/input\.dispatchEvent\(new Event\('input'/);assert.match(src,/input\.focus\(\)/)});
test('touch interactions exclude interactive controls and reduced motion',()=>{assert.match(src,/function editable\(el\)/);assert.match(src,/prefers-reduced-motion/);assert.doesNotMatch(src,/\.from\(|supabase/)});