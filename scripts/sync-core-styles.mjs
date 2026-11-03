// The source template preserves stylesheet order and doubles as a build manifest.
// Use --check in CI, or run without arguments to refresh the shipped asset.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const html=fs.readFileSync('index.html','utf8');
const manifest=html.match(/<template id="buchee-core-style-sources">([\s\S]*?)<\/template>/);
if(!manifest)throw Error('Core stylesheet manifest missing');
const styles=[...manifest[1].matchAll(/<link rel="stylesheet" href="([\w.-]+\.css)(?:\?[^"]*)?">/g)];
if(!styles.length)throw Error('Empty stylesheet manifest');
const css=styles.map(([,name])=>'/* '+name+' */\n'+fs.readFileSync(name,'utf8')).join('\n');
if(/@import\s|@charset\s/i.test(css))throw Error('Imports and charsets must remain standalone');
const hash=createHash('sha256').update(css).digest('hex').slice(0,16);
const updated=html.replace(/href="buchee-core\.css\?v=[\w-]+"/,'href="buchee-core.css?v='+hash+'"');
if(process.argv.includes('--check')){
  if(updated!==html||fs.readFileSync('buchee-core.css','utf8')!==css)throw Error('Run node scripts/sync-core-styles.mjs to refresh the core styles.');
}else{
  fs.writeFileSync('buchee-core.css',css);
  fs.writeFileSync('index.html',updated);
}
