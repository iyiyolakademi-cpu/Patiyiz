import fs from 'node:fs';
import path from 'node:path';
const manifest=path.resolve('android/app/src/main/AndroidManifest.xml');
if(!fs.existsSync(manifest))throw Error('Capacitor Android platform must be initialized first.');
let xml=fs.readFileSync(manifest,'utf8');
// Migrate an existing generated AndroidManifest without duplicating its App Links filter.
xml=xml.replaceAll('android:host="patiyiz.com"','android:host="bucheesocial.com"');
if(!xml.includes('android:name=".MainActivity"'))throw Error('Capacitor MainActivity not found: cannot safely add App Links.');
const filter=`        <intent-filter android:autoVerify="true">
          <action android:name="android.intent.action.VIEW" />
          <category android:name="android.intent.category.DEFAULT" />
          <category android:name="android.intent.category.BROWSABLE" />
          <data android:scheme="https" android:host="bucheesocial.com" android:pathPrefix="/open" />
        </intent-filter>`;
if(!xml.includes('android:pathPrefix="/open"')){
 const match=/<activity\b[^>]*android:name="\.MainActivity"[^>]*>/s.exec(xml);
 if(!match)throw Error('MainActivity launch tag not detected.');
 const start=match.index+match[0].length,end=xml.indexOf('</activity>',start);
 if(end<0)throw Error('MainActivity end tag not found.');
 xml=xml.slice(0,end)+filter+'\n      '+xml.slice(end);
}
if(!xml.includes('android:autoVerify="true"')||!xml.includes('android:host="bucheesocial.com"'))throw Error('App Link verification config missing.');
fs.writeFileSync(manifest,xml);
console.log('Buchee Social App Links enabled for https://bucheesocial.com/open only.');
