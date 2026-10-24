const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const expected = 'E2:A4:D9:25:71:9D:75:B9:7B:33:71:F2:A1:CD:99:AD:77:28:30:5A:73:4D:EE:C7:5D:75:D2:76:B1:12:A4:D6';
const localApk = 'CA:1E:65:46:4B:BF:33:65:C4:34:FF:04:EB:5A:6F:84:A2:24:E9:74:F9:44:30:FC:E3:78:3F:7E:8D:15:CD:DF';

test('Patiyiz production Digital Asset Links uses its correct app signing certificate', () => {
  const twa = JSON.parse(fs.readFileSync(path.join(root, 'android/twa-manifest.json'), 'utf8'));
  const links = JSON.parse(fs.readFileSync(path.join(root, '.well-known/assetlinks.json'), 'utf8'));
  assert.equal(fs.readFileSync(path.join(root,'CNAME'),'utf8').trim(),'patiyiz.com');
  assert.equal(twa.packageId,'com.patiyiz.app');
  assert.equal(twa.host,'patiyiz.com');
  assert.ok(links.some(link =>
    link.relation.includes('delegate_permission/common.handle_all_urls') &&
    link.target.namespace === 'android_app' &&
    link.target.package_name === twa.packageId &&
    link.target.sha256_cert_fingerprints.includes(expected) &&
    link.target.sha256_cert_fingerprints.includes(localApk)
  ),'Patiyiz must publish the Play app-signing SHA-256 under the production domain');
  assert.equal(expected.split(':').length, 32);
  assert.equal(localApk.split(':').length, 32);
  assert.equal(new Set(links.flatMap(link => link.target.sha256_cert_fingerprints)).size, 2);
  assert.ok(fs.existsSync(path.join(root,'.nojekyll')), 'GitHub Pages must serve dot directories');
});
