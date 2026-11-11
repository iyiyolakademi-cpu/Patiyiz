'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
const config = JSON.parse(read('app.json'));
const app = read('App.js');
const client = read('src/client.js');
const data = read('src/data.js');

assert.equal(pkg.name, 'buchee-social-native');
assert.equal(config.expo.name, 'Buchee Social');
assert.equal(config.expo.android.package, 'com.buchee.social.preview');
assert.equal(config.expo.ios.bundleIdentifier, 'com.buchee.social.preview');
assert.equal(config.expo.icon, './assets/icon.png');
assert.ok(fs.statSync(path.join(root, 'assets/icon.png')).size > 1000);
assert.ok(/createClient\(/.test(client), 'Supabase client missing');
assert.ok(/persistSession:\s*true/.test(client), 'Persistent session missing');
assert.ok(/from\('posts'\)/.test(data), 'Existing posts table not reused');
assert.ok(/from\('messages'\)/.test(data), 'Existing messages table not reused');
assert.ok(/from\('profiles'\)/.test(data), 'Existing profiles table not reused');
assert.ok(!/WebView|react-native-webview|server\.url/.test(app), 'Native app must not host the website');
assert.ok(/FlatList/.test(app), 'Native list UI missing');
assert.ok(/VideoView/.test(app), 'Native Reels video component missing');
assert.ok(!/sb_secret_|SUPABASE_SERVICE_ROLE\s*[:=]|service_role\s*[:=]\s*['\"`]/.test(client), 'Private key pattern found');
for (const file of ['src/client.js','src/data.js']) {
  const checked = spawnSync(process.execPath, ['--check', path.join(root,file)], {encoding:'utf8'});
  assert.equal(checked.status, 0, checked.stderr || file + ' syntax check failed');
}
console.log('Buchee Social: native source checks passed.');
