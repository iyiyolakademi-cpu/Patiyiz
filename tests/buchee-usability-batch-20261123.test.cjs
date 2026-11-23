'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const js=fs.readFileSync('buchee-usability-batch-20261123.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('Buchee usability module parses and is loaded once',()=>{
assert.doesNotThrow(()=>new vm.Script(js));
assert.equal(html.split('src="buchee-usability-batch-20261123.js').length-1,1);
});
test('Unread filtering targets the existing DM row structure',()=>{
assert.match(js,/pati-dm-list-row/);
assert.match(js,/chat-unread/);
assert.match(js,/aria-pressed/);
});
test('Handle copy and font scale do not modify server data',()=>{
assert.match(js,/pati-profile-visitor-username/);
assert.match(js,/navigator.clipboard.writeText/);
assert.match(js,/buchee_text_scale/);
assert.doesNotMatch(js,/supabase\.from\(|\.insert\(|\.delete\(/);
});