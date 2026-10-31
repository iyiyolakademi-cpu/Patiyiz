const test=require('node:test');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const path=require('node:path');
const root=path.join(__dirname,'..');
const exec=(...args)=>cp.spawnSync(process.execPath,['scripts/patiyiz-release-audit.mjs',...args],{cwd:root,encoding:'utf8'});
test('Release audit produces structured evidence without changing live data',()=>{
 const run=exec('--json');
 assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(run.stdout);
 assert.equal(report.ready,false);
 assert.ok(report.total>=12);
 assert.equal(report.checks.find(x=>x.name==='Legal operator name and email documented')?.passed,true);
 assert.equal(report.checks.find(x=>x.name==='Legal contact consistent in terms and deletion')?.passed,true);
 assert.ok(report.blocked.some(x=>x.name.includes('support_contact_and_data_controller_legal_review')));
 assert.ok(report.blocked.some(x=>x.name.includes('private_media_two_account_negative_test')));
 assert.ok(report.checks.find(x=>x.name.includes('private-media helper')).passed);
 assert.ok(report.checks.find(x=>x.name.includes('Private content migration')).passed);
});
test('Release audit refuses production while legal/device verification remains incomplete',()=>{
 const run=exec('--require-ready');
 assert.equal(run.status,1,run.stdout+run.stderr);
 assert.match(run.stdout,/BLOCKED/);
});
