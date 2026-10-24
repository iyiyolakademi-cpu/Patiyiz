/* Generate Android source images from the EXACT published Patiyiz icon.
 * No invented logo or third party brand asset is used.
 */
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=path.resolve(directory,'..','patiyiz-app-icon-512.png');
const dest=path.join(directory,'assets');
await mkdir(dest,{recursive:true});
const resized=sharp(input).resize(1024,1024,{fit:'contain'}).png();
await resized.toFile(path.join(dest,'icon.png'));
await sharp(input).resize(1024,1024,{fit:'contain'}).png().toFile(path.join(dest,'logo.png'));
console.log('Android launcher icon and splash image use Patiyiz logo.');
