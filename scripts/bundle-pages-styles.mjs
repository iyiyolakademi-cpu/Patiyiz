// Run in the Pages staging directory. Keep linked styles on either side of an
// inline style, lazy link, or script in their original cascade order.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const filename='index.html';
const html=fs.readFileSync(filename,'utf8');
const link=/<link rel="stylesheet" href="([\w.-]+\.css)(?:\?[^"]*)?">/g;
const adjacent=new RegExp('(?:'+link.source+'\\s*){2,}','g');
const bundled=html.replace(adjacent,group=>{
  const sources=[...group.matchAll(link)].map(match=>match[1]);
  const css=sources.map(source=>fs.readFileSync(source,'utf8')).join('\n');
  if(/@import\s|@charset\s/i.test(css))throw new Error('Stylesheets with imports or charset must stay separate');
  const hash=createHash('sha256').update(css).digest('hex').slice(0,16);
  const asset='buchee-styles-'+hash+'.css';
  fs.writeFileSync(asset,css);
  return '<link rel="stylesheet" href="'+asset+'">\n';
});
fs.writeFileSync(filename,bundled);
