/* Patiyiz build-free static smoke checks. No API credentials or network required. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
let failures=0;
const check=(ok,message)=>{if(!ok){console.error('FAIL:',message);failures++;}else console.log('PASS:',message)};
const assets=[...index.matchAll(/<(?:link|script)\b[^>]*>/g)].map(m=>m[0])
  .map(tag=>tag.match(/\b(?:src|href)="([^"]+)"/)?.[1])
  .filter(Boolean)
  .map(url=>url.replace(/&amp;/g,'&'))
  .filter(url=>!/^https?:\/\//.test(url)&&!url.startsWith('data:')&&!url.startsWith('#'))
  .map(url=>decodeURIComponent(url.split('?')[0]));
for(const asset of assets)check(fs.existsSync(path.join(root,asset)),'asset exists: '+asset);
const cssRefs=[...index.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)/g)]
  .map(m=>m[1]).filter(href=>!href.startsWith('http'));
check(cssRefs.length===12,'12 consolidated stylesheet requests');
const uniqueSources=new Set();
for(const href of cssRefs){
 const file=href.split('?')[0];
 const css=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of css.matchAll(/\/\*\s*([\w.-]+\.css)\s*\*\//g))uniqueSources.add(match[1]);
}
check(uniqueSources.size===89,'89 original CSS sources represented in bundles');
const js=fs.readdirSync(root).filter(file=>file.endsWith('.js'));
for(const file of js){
 try{execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});}
 catch(error){console.error('FAIL: JS syntax in',file,String(error.stderr).slice(0,1200));failures++;}
}
console.log('Checked',js.length,'JavaScript files and',assets.length,'local asset references.');
if(failures)process.exit(1);
