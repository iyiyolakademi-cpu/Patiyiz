'use strict';
/* Compare PR test failures against current main, rather than treating known
 * historical debt as regressions. Does not hide or resolve historical debt. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const baseline=path.join(os.tmpdir(),'buchee-auth-main-'+process.pid);
let worktreeAdded=false;
function runTests(dir){
 const names=fs.readdirSync(path.join(dir,'tests')).filter(x=>x.endsWith('.test.cjs')).sort();
 const proc=spawnSync(process.execPath,['--test',...names.map(n=>path.join('tests',n))],{
  cwd:dir,encoding:'utf8',maxBuffer:128*1024*1024,
  env:{...process.env,FORCE_COLOR:'0',NO_COLOR:'1'}
 });
 if(proc.error||proc.signal)throw Error('Runner crashed: '+String(proc.error||proc.signal));
 const output=(proc.stdout||'')+'\n'+(proc.stderr||'');
 const count=Number([...output.matchAll(/^# tests (\d+)$/gm)].at(-1)?.[1]);
 const failCount=Number([...output.matchAll(/^# fail (\d+)$/gm)].at(-1)?.[1]);
 const failures=[...output.matchAll(/^not ok \d+ - ([^\r\n]+)\r?$/gm)].map(x=>x[1]);
 if(!Number.isFinite(count)||!Number.isFinite(failCount)||count<600||failCount!==failures.length)
  throw Error('Incomplete tests in '+dir+' tests='+count+' failures='+failCount+' names='+failures.length);
 return {count,failures:new Set(failures),failCount};
}
try{
 execFileSync('git',['fetch','--no-tags','--depth=1','origin','main'],{cwd:root,stdio:'pipe'});
 execFileSync('git',['worktree','add','--detach',baseline,'FETCH_HEAD'],{cwd:root,stdio:'pipe'});
 worktreeAdded=true;
 const main=runTests(baseline),head=runTests(root);
 const introduced=[...head.failures].filter(name=>!main.failures.has(name));
 const repaired=[...main.failures].filter(name=>!head.failures.has(name));
 console.log('Main:',main.count,'tests,',main.failCount,'failures');
 console.log('PR:',head.count,'tests,',head.failCount,'failures');
 console.log('New failures introduced by PR:',introduced.length);
 console.log('Previously failing cases now passing:',repaired.length);
 if(repaired.length)console.log('Resolved:',repaired.slice(0,15).join(' | '));
 if(introduced.length){introduced.forEach(name=>console.error('::error::NEW PR REGRESSION '+name));process.exitCode=1;}
}catch(err){console.error('::error::Differential regression check failed:',err.message);process.exitCode=1;}
finally{
 if(worktreeAdded)try{execFileSync('git',['worktree','remove','--force',baseline],{cwd:root,stdio:'pipe'});}catch(e){console.warn('Cannot clean worktree:',e.message);}
 try{fs.rmSync(baseline,{recursive:true,force:true});}catch{}
}
