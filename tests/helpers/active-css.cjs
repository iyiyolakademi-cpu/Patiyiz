const fs=require('node:fs');
/* Verify a source stylesheet is loaded either directly or from a linked ordered bundle. */
module.exports=function activeCSS(html,filename){
 const hrefs=[...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map(m=>m[1]);
 return hrefs.some(href=>{
  const file=href.split('?')[0];
  if(file===filename)return true;
  if(!fs.existsSync(file))return false;
  return fs.readFileSync(file,'utf8').includes('/* '+filename+' */');
 });
};
