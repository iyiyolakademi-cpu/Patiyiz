import sharp from 'sharp';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=path.join(root,'buchee-concept4-icon.svg');
for(const [size,name] of [[48,'buchee-app-icon-48.png'],[180,'buchee-app-icon-180.png'],[192,'buchee-app-icon-192.png'],[512,'buchee-app-icon-512.png'],[192,'patiyiz-app-icon-192.png'],[512,'patiyiz-app-icon-512.png'],[180,'patiyiz-apple-touch-icon.png'],[48,'patiyiz-favicon-48.png']]){
 await sharp(source).resize(size,size,{fit:'contain'}).png().toFile(path.join(root,name));
 console.log('Generated '+name);
}
