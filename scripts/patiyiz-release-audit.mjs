#!/usr/bin/env node
/* A fail-closed release readiness audit. No credentials or network access needed. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const exists=name=>fs.existsSync(path.join(root,name));
const check=(name,ok,reason)=>({name,passed:!!ok,reason:ok?'':reason});
let evidence;
try{evidence=JSON.parse(read('docs/patiyiz-1-0-launch-evidence.json'))}
catch(e){console.error('Release evidence could not be read:',e.message);process.exit(2)}
const app=read('app.js'),html=read('index.html'),privacy=read('privacy.html'),terms=read('terms.html');
const checks=[
 check('Public release has an account-deletion page',exists('delete-account.html')&&/Hesabımı kalıcı olarak sil/.test(read('delete-account.html')),'Account deletion documentation is missing'),
 check('App includes private-media helper before app code',html.indexOf('patiyiz-private-media-20261031.js')>=0&&html.indexOf('patiyiz-private-media-20261031.js')<html.indexOf('app.js?'),'Private media helper is not loaded first'),
 check('Private content migration is guarded',app.includes('patiyiz-secure-account-media')&&app.includes('uploadPrivatePublicationMedia'),'Secure media publish/migration is missing'),
 check('Private media fallback exists',exists('patiyiz-private-media-20261031.js')&&read('patiyiz-private-media-20261031.js').includes('createSignedUrl'),'Private media signing is missing'),
 check('Message attachment recovery is enabled',app.includes('patiDmSigningPending')&&app.includes('patiDmMediaNotice'),'Private message recovery is missing'),
 check('Data controller and support contacts are filled',/mailto:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(privacy)&&!/(Resmî başvuru iletişim bilgileri yayına çıkmadan|işletmeci iletişim bilgileri ve hukuki değerlendirme ayrıca tamamlanmalıdır)/i.test(privacy),'Privacy policy is still a draft and has no confirmed contact'),
 check('Terms specify a verified operator',!/(işletmeci bilgileriyle tamamlanmalıdır)/i.test(terms),'Terms still contain draft operator placeholders')
];
for(const [name,value] of Object.entries(evidence.manual_gates||{}))
 checks.push(check('MANUAL '+name,value===true,'A real device/owner/legal check has not been recorded'));
const passed=checks.filter(x=>x.passed).length,failed=checks.filter(x=>!x.passed);
const report={ready:failed.length===0,checked_at:evidence.last_checked||null,passed,total:checks.length,blocked:failed.map(x=>({name:x.name,reason:x.reason})),checks};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else {
 console.log('Patiyiz 1.0 release readiness: '+(report.ready?'READY':'BLOCKED')+' ('+passed+'/'+checks.length+')');
 for(const x of checks)console.log((x.passed?'✓ ':'✗ ')+x.name+(x.passed?'':' — '+x.reason));
}
if(process.argv.includes('--require-ready')&&!report.ready)process.exitCode=1;
