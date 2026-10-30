const {readFileSync,existsSync}=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=readFileSync(path.join(root,'index.html'),'utf8');
const native=readFileSync(path.join(root,'native-capacitor/scripts/build-web.mjs'),'utf8');
const refs=[...html.matchAll(/(?:href|src)="([^"]+)"/g)]
 .map(m=>m[1].split('?')[0])
 .filter(s=>/^[a-zA-Z0-9._-]+\.(?:css|js|svg|png|webp|webmanifest)$/.test(s));
const missing=[...new Set(refs.filter(s=>!existsSync(path.join(root,s))))];
if(missing.length)throw Error('Missing source assets: '+missing.join(', '));
for(const retired of ['pati-identity-owner.js','pati-identity-owner.css','pati-kimligi.html']){
 if(native.includes("'"+retired+"'"))throw Error('Retired asset in Android build: '+retired);
}
if(!native.includes('htmlSource.matchAll'))throw Error('Native packager no longer scans HTML');
const css=refs.filter(s=>s.endsWith('.css'));
if(new Set(css).size!==css.length)throw Error('Duplicate stylesheets');
process.stdout.write('Verified '+refs.length+' references and '+css.length+' stylesheets.\n');
