import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const android=path.join(root,'android');
const activity=path.join(android,'app/src/main/java/com/patiyiz/app/MainActivity.java');
const target=path.join(android,'app/src/main/java/com/patiyiz/app/PatiyizGalleryPlugin.java');
await mkdir(path.dirname(activity),{recursive:true});
await copyFile(path.join(root,'android-source/PatiyizGalleryPlugin.java'),target);
let main=await readFile(activity,'utf8');
if(!main.includes('registerPlugin(PatiyizGalleryPlugin.class)')){
 main=main.replace('public class MainActivity extends BridgeActivity {','public class MainActivity extends BridgeActivity {\n  @Override public void onCreate(android.os.Bundle state) {\n    registerPlugin(PatiyizGalleryPlugin.class);\n    super.onCreate(state);\n  }');
}
await writeFile(activity,main);
const xml=path.join(android,'app/src/main/AndroidManifest.xml');
let manifest=await readFile(xml,'utf8');
const permissions=[
 '<uses-permission android:name="android.permission.CAMERA" />',
 '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
 '<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />',
 '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'
];
for(const permission of permissions){if(!manifest.includes(permission))manifest=manifest.replace('<application',permission+'\n    <application');}
await writeFile(xml,manifest);
console.log('Native Patiyiz camera/gallery plugin registered and Android 14 limited-access permissions configured.');
