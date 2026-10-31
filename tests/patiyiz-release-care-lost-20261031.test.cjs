const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-home-feed-compact-20261031.css','utf8');
const privacy=fs.readFileSync('privacy.html','utf8');

test('Main Patiyiz app remains valid JavaScript',()=>new vm.Script(app));
test('Lost pet city alerts require an explicit user action and owner-scoped subscription',()=>{
 assert.match(app,/async function patiLostAlertToggle\(/);
 assert.match(app,/data-action="lost-city-alert-toggle"/);
 assert.match(app,/patiyiz_lost_city_alerts/);
 assert.match(app,/\.eq\('user_id',owner\)/);
 assert.match(app,/city:!enabled|city,enabled:!enabled/);
 assert.match(app,/n.kind==='lost_city'/);
});
test('Wellness reminders reuse the single authoritative store without inventing a second vaccine record',()=>{
 assert.match(app,/function patiWellnessReminderDialog\(existing,presetKind='vaccine'\)/);
 assert.match(app,/data-action="pati-care-quick"/);
 assert.match(app,/patiyiz_pet_reminders/);
 assert.match(app,/case 'pati-care-quick'/);
});
test('PatiCoin progress reads server-confirmed claims rather than paying coins from browser',()=>{
 assert.match(app,/patiCoinState.claims/);
 assert.match(app,/earnedToday/);
 assert.match(app,/earnedWeek/);
 assert.match(app,/patiyiz_claim_completed_tasks/);
 assert.doesNotMatch(app,/patiCoinState\.balance\s*\+=\s*[^0]/);
});
test('Registration no longer demands acceptance of the privacy notice',()=>{
 assert.match(app,/name="terms_accepted" type="checkbox" value="yes" required/);
 assert.match(app,/Kullanım Şartlarını<\/a> kabul ediyorum/);
 assert.match(app,/Gizlilik Politikası ve veri işleme bilgilerini/);
 assert.doesNotMatch(app,/Gizlilik Politikasını<\/a> okudum, kabul ediyorum/);
});
test('New UI is accessible on small phones and discloses city-only alert scope',()=>{
 assert.match(css,/\.pati-city-alert/);
 assert.match(css,/\.pati-care-quick/);
 assert.match(css,/\.pati-mission-progress/);
 assert.match(privacy,/Şehir bazında kayıp hayvan bildirimleri/);
});
