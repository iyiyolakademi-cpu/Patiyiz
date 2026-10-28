const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('patiyiz-ux-round1-20261028.css', 'utf8');

test('new changes keep app JavaScript syntactically valid', () => {
 new vm.Script(app, {filename:'app.js'});
});
test('home empty state has real create and explore actions without fake posts', () => {
 assert.match(app, /function patiHomeEmptyState\(\)/);
 assert.match(app, /data-action="pati-create-post"/);
 assert.match(app, /data-action="pati-create-text"/);
 assert.match(app, /data-view="explore"/);
 assert.match(app, /:patiHomeEmptyState\(\)/);
});
test('community empty state lets user compose first question', () => {
 assert.match(app, /class="pati-community-empty"/);
 assert.match(app, /data-action="question">İlk soruyu sor/);
 assert.match(app, /case 'question':composeQuestion\(\)/);
});
test('notifications are grouped by Turkish local date and reminder opens care center', () => {
 assert.match(app, /function notificationRows\(list\)\{\s*let lastDay='';/);
 assert.match(app, /toLocaleDateString\('tr-TR',\{day:'numeric',month:'long',year:'numeric'\}\)/);
 assert.match(app, /return dayHeading\+'<article class="pati-alert-row /);
 assert.match(app, /if\(n\.kind==='pet_reminder'\)\{navigate\('wellness'\);return\}/);
});
test('chat pinning is per-account device preference, not a fake server setting', () => {
 assert.match(app, /function patiDmPins\(\)/);
 assert.match(app, /'patiyiz-dm-pins:'\+me.id/);
 assert.match(app, /function patiDmPinToggle\(peerId\)/);
 assert.match(app, /data-action="dm-pin"/);
 assert.match(app, /case 'dm-pin':patiDmPinToggle\(id\)/);
 assert.match(app, /pinnedPeers.has\(b\)/);
});
test('animal selection also scopes care reminders and center counts', () => {
 assert.match(app, /case 'pati-hub-select-pet':patiHubSelectedPetId=id;patiWellnessPetId=id;carePetFilter=id/);
 assert.match(app, /case 'wellness-pet':patiWellnessPetId=id;patiHubSelectedPetId=id;carePetFilter=id/);
 assert.match(app, /healthReminders=patiUnifiedCareReminders\(true\)\.filter\(/);
 assert.match(app, /\(!featured\|\|x.pet_id===featured.id\)/);
});
test('new styles load after existing styles and support mobile and reduced motion', () => {
 assert.match(html, /patiyiz-ux-round1-20261028\.css\?v=1/);
 assert.ok(html.indexOf('patiyiz-ux-round1-20261028.css') > html.indexOf('patiyiz-feature-simplification-20261028.css'));
 assert.match(css, /@media\(max-width:480px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});
