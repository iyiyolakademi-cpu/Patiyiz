/**
 * Historical regression tracking, NOT a substitute for resolving old failures.
 * Every test still runs and an unfamiliar failure blocks CI.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'tests/historical-regression-baseline-20261101.json'),'utf8'));
const known=new Set(baseline.failing_test_names);
if(!known.size||known.size!==baseline.failing_test_names.length)throw Error('Invalid regression baseline');
const tests=fs.readdirSync(path.join(root,'tests'))
 .filter(file=>file.endsWith('.test.cjs')).sort().map(file=>path.join('tests',file));
if(tests.length<30)throw Error('Regression suite is unexpectedly incomplete');
const child=spawnSync(process.execPath,['--test',...tests],{
 cwd:root,encoding:'utf8',maxBuffer:128*1024*1024,
 env:{...process.env,FORCE_COLOR:'0',NO_COLOR:'1'}
});
if(child.error)throw child.error;
const output=(child.stdout||'')+'\n'+(child.stderr||'');
const fails=[...output.matchAll(/^not ok \d+ - ([^\r\n]+)\r?$/gm)].map(match=>match[1]);
const summary=[...output.matchAll(/^# (tests|pass|fail|cancelled|skipped) (\d+)$/gm)]
 .reduce((map,entry)=>({...map,[entry[1]]:Number(entry[2])}),{});
const unexpected=fails.filter(name=>!known.has(name));
const historical=fails.filter(name=>known.has(name));
const resolved=[...known].filter(name=>!fails.includes(name));
const malformed=!Number.isInteger(summary.tests)||!Number.isInteger(summary.fail)||
 summary.tests<600||summary.fail!==fails.length||summary.tests!==Number(summary.pass||0)+
 summary.fail+Number(summary.cancelled||0)+Number(summary.skipped||0);
const failed=malformed||unexpected.length>0||Boolean(child.signal)||
 (child.status!==0&&fails.length===0)||
 (child.status===0&&fails.length!==0);
console.log('Tests:',summary.tests||'unknown','Passed:',summary.pass||0,
 'Existing unresolved:',historical.length,'New failures:',unexpected.length,
 'Previous failures now passing:',resolved.length);
if(unexpected.length){console.error('NEW REGRESSION FAILURES:');unexpected.forEach(name=>console.error('  - '+name));}
if(malformed)console.error('Test output incomplete or inconsistent: failing closed.');
if(child.status!==0&&fails.length===0)console.error('Unidentified runner crash: '+String(child.stderr).slice(-1500));
if(historical.length)console.log('::warning::'+historical.length+' historical regression tests still fail; see workflow summary.');
if(resolved.length)console.log('Previously failing tests now passing:',resolved.join(' | '));
const report=[
 '## Patiyiz regression quality gate','',
 '| Metric | Count |','|---|---:|',
 '| Total tests | '+(summary.tests??'unknown')+' |',
 '| Passing | '+(summary.pass??'unknown')+' |',
 '| Existing historical failures (still unresolved) | '+historical.length+' |',
 '| New failing tests (block CI) | '+unexpected.length+' |',
 '| Historical failures now fixed | '+resolved.length+' |','',
 'The historical suite ran in full. Its already-failing assertions remain tracked in tests/historical-regression-baseline-20261101.json. This does not claim those tests pass.','',
 ...(unexpected.length?['### New failures',...unexpected.map(name=>'- '+name),'']:[]),
 '<details><summary>Historical failures requiring work ('+historical.length+')</summary>','',
 ...historical.map(name=>'- '+name),'','</details>',''
].join('\n');
if(process.env.GITHUB_STEP_SUMMARY)try{fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report)}catch(err){console.error('Could not write CI report:',err.message)}
if(failed)process.exitCode=1;
