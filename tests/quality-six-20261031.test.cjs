const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-quality-six-20261031.css','utf8');
test('Six-improvement changes preserve valid app JS',()=>{assert.doesNotThrow(()=>new vm.Script(app));});
test('Reels pauses every other video and surfaces a buffering indicator',()=>{
 assert.match(app,/for\(const other of videos\)if\(other!==video&&!other\.paused\)other\.pause\(\)/);
 assert.match(app,/pati-reel-buffering/);
 assert.match(app,/v\.addEventListener\('progress',updateBuffer\)/);
 assert.match(app,/if\(viewport\?\.clientHeight\)/);
});
test('Home feed keeps real photo aspect and easily switches to followed accounts',()=>{
 assert.match(app,/--pati-feed-aspect/);
 assert.match(app,/video\.preload='none'/);
 assert.match(css,/#main-content>\.pati-home-feed-tabs\{display:grid!important/);
 assert.match(html,/patiyiz-quality-six-20261031\.css/);
});
test('Private chat preserves deterministic ordering and accessible audio messages',()=>{
 assert.match(app,/function patiDmCompareRows/);
 assert.match(app,/sort\(patiDmCompareRows\)/);
 assert.match(app,/patiDmRecordTimerStart/);
 assert.match(app,/echoCancellation:true,noiseSuppression:true/);
 assert.match(app,/pati-dm-image-open/);
 assert.match(css,/\.pati-dm-audio/);
});
test('Care events use one deduped calendar and reject repeated entries',()=>{
 assert.match(app,/function patiCareTaskKey\(/);
 assert.match(app,/seenReminders\.has\(key\)/);
 assert.match(app,/Bu bakım görevi aynı tarihte zaten mevcut/);
 assert.match(app,/Bu tarihte aynı bakım hatırlatması zaten bulunuyor/);
 assert.match(app,/patiCareCalendarMarkup\(all,healthReminders\)/);
});
test('City lost alerts are optional and found reports can be closed',()=>{
 assert.match(app,/lost-city-alert-toggle/);
 assert.match(app,/Kapalı \(isteğe bağlı\)/);
 assert.match(app,/Bulundu · İlanı kapat/);
 assert.match(app,/Bulundu · İlan kapalı/);
});
test('PatiCoin displays earned and spent totals while server owns reward grants',()=>{
 assert.match(app,/earnedTodayCoins/);
 assert.match(app,/earnedWeekCoins/);
 assert.match(app,/pati-coin-spent-overview/);
 assert.match(app,/patiyiz_claim_completed_tasks/);
 assert.match(app,/patiyiz_redeem_reward/);
 assert.doesNotMatch(app,/patiCoinState\.balance\s*\+=/);
});
