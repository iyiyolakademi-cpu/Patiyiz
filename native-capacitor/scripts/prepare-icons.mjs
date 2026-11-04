/* Generate Android source images from the EXACT published BucheeSocial icon.
 * No invented logo or third party brand asset is used.
 */
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=path.resolve(directory,'..','buchee-concept4-icon.svg');
const splashWordmark=path.resolve(directory,'..','buchee-word-only-icon.svg');
const dest=path.join(directory,'assets');
await mkdir(dest,{recursive:true});
const resized=sharp(input).resize(1024,1024,{fit:'contain'}).png();
await resized.toFile(path.join(dest,'icon.png'));
await sharp(splashWordmark).resize(1024,1024,{fit:'contain'}).png().toFile(path.join(dest,'logo.png'));
console.log('Android launcher icon uses Concept 4; splash retains the existing Buchee wordmark.');
