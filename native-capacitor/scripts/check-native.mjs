/* Fast source-only checks; no npm install or Android SDK needed. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(root,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'capacitor.config.json'),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const build=fs.readFileSync(path.join(root,'scripts','build-web.mjs'),'utf8');
const shell=fs.readFileSync(path.join(root,'src','native-shell.js'),'utf8');
function check(ok,message){if(!ok)throw Error(message);console.log('OK '+message)}
check(config.appId==='com.patiyiz.app','Android Play app ID matches existing Patiyiz listing');
check(config.appName==='Patiyiz','Native recent-apps label is Patiyiz');
check(config.webDir==='www','Native app uses bundled www assets');
check(!config.server.url,'No remote website wrapping via server.url');
check(pkg.dependencies['@capacitor/android'].startsWith('^8.'),'Capacitor Android 8 supports target SDK 36');
check(build.includes("'index.html'")&&build.includes("'app.js'"),'Current Patiyiz application packaged');
check(build.includes('vendor/supabase-compat.js')&&build.includes('vendor/tus-compat.js'),'Supabase and resumable uploads are local assets');
check(build.includes("redirectTo:'https://patiyiz.com/'"),'Password-reset email uses public HTTPS domain');
check(build.includes('Firebase/FCM'), 'Unsupported native push feature is not misrepresented as working');
check(shell.includes("App.addListener('backButton'"),'Android back button wired to native UI');
check(fs.existsSync(path.join(repo,'patiyiz-app-icon-512.png')),'Real Patiyiz logo available');
console.log('Patiyiz Capacitor native Android source checks passed.');
