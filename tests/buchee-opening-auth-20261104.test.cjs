'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');
const app=read('app.js'),html=read('index.html'),native=read('native-capacitor/scripts/build-web.mjs');

test('the signature is allowed to finish before revealing the destination',()=>{
 assert.match(app,/\.buchee-opening-signature path/);
 assert.match(app,/signature\.getAnimations\(\)/);
 assert.match(app,/a\.finished\.catch/);
 assert.match(app,/Math\.max\(0,1750-elapsed\)/);
 assert.match(app,/requestAnimationFrame\(\(\)=>requestAnimationFrame\(resolve\)\)/);
 assert.match(app,/startup\.classList\.add\('buchee-splash-done'\)/);
});
test('splash remains a fullscreen overlay and has a real recovery button',()=>{
 assert.match(html,/#startup:not\(\.hidden\)\{position:fixed!important;inset:0!important/);
 assert.match(html,/data-buchee-launch-recovery/);
 assert.match(html,/data-buchee-launch-retry/);
 assert.match(html,/__bucheeLaunchWatchdog/);
});
test('launch contrast does not change to light before splash dismisses',()=>{
 assert.match(app,/\?'#14021e':'#f7f7f8'/);
 assert.match(app,/startup\.setAttribute\('aria-hidden','true'\);\s*document\.querySelector\('meta\[name="theme-color"\]'\)/);
});
test('recovery UI distinguishes a missing SDK from missing configuration',()=>{
 assert.match(app,/if\(!String\(cfg\.supabaseUrl\|\|''\)/);
 assert.match(app,/if\(typeof window\.supabase\?\.createClient!=='function'\)/);
 assert.match(app,/bucheeConnectionRecovery\('Giriş sistemi yüklenemedi/);
 assert.match(app,/data-auth-sdk-retry/);
 assert.match(app,/auth\.getSession\(\)/);
});
test('offline start does not discard a stored session',()=>{
 assert.match(app,/if\(navigator\.onLine===false\)throw Error\('Çevrimdışısın/);
 assert.match(app,/Hesabın korunuyor/);
 assert.match(app,/bucheeAuthTimed/);
});
test('saved user sessions are verified through the Auth server before app display',()=>{
 assert.match(app,/sb\.auth\.getUser\(\)/);
 assert.match(app,/verified\.user\.id!==result\.session\.user\.id/);
 assert.match(app,/me=verified\.user;\s*showApp\(\)/);
});
test('the password policy enforces letters, digits and punctuation',()=>{
 const match=app.match(/function bucheePasswordProblem\(password\)\{[\s\S]*?\n\}/);
 assert(match,'password validator must exist');
 const policy=new Function(match[0]+'; return bucheePasswordProblem;')();
 assert.equal(policy('abc123!?'),'');
 assert.equal(policy('Örnek123!'),'');
 for(const password of ['abc123!','abcdefgh!','12345678!','abc12345','ab 123!!'])assert.notEqual(policy(password),'',password);
});
test('new-account policy does not prevent existing accounts from signing in',()=>{
 assert.match(app,/const issue=bucheePasswordProblem\(password\);if\(issue\)return notify\(issue,true\);let res=await authBusy\(\(\)=>sb\.auth\.signUp/);
 assert.match(app,/let res=await authBusy\(\(\)=>sb\.auth\.signInWithPassword\(\{email,password\}\)\)/);
 assert.match(app,/minlength="\$\{isSign\?8:6\}"/);
});
test('duplicate submissions are disabled during authentication',()=>{
 assert.match(app,/if\(authRequestInFlight\)return null/);
 assert.match(app,/if\(submit\)submit\.disabled=true/);
 assert.match(app,/finally\{authRequestInFlight=false/);
});
test('forgot-password uses an explicit email redirect, recovery has a new-password UI',()=>{
 assert.match(app,/resetPasswordForEmail\(email,\{redirectTo:location\.origin\+location\.pathname\}\)/);
 assert.match(app,/event==='PASSWORD_RECOVERY'/);
 assert.match(app,/reset-password-form/);
 assert.match(app,/const issue=bucheePasswordProblem\(password\);if\(issue\)return notify\(issue,true\);await run/);
});
test('password changes request global session revocation, ordinary logout is local',()=>{
 const globalCount=(app.match(/sb\.auth\.signOut\(\{scope:'global'\}\)/g)||[]).length;
 assert.equal(globalCount,2);
 assert.match(app,/case 'logout':run\(async\(\)=>\{[\s\S]*?sb\.auth\.signOut\(\{scope:'local'\}\)/);
});
test('account switch and deletion clear media and per-account cached data',()=>{
 assert.match(app,/function resetSessionState\(\)\{\s*globalThis\.PatiyizPrivateMedia\?\.clear\(\);/);
 assert.match(app,/patiAvatarCache\.clear\(\)/);
 assert.match(app,/if\(event==='SIGNED_OUT'\)\{\s*stopLive\(\);resetSessionState\(\);/);
 assert.match(app,/HESABIMI SIL/);
 assert.match(app,/functions\/v1\/patiyiz-delete-account/);
});
test('first-run screen introduces Reels, posts, chat, education and rewards',()=>{
 for(const term of ['Reels','Gönderi','Mesajlar','Eğitim','Puan'])assert(app.includes(term),term);
 assert.match(app,/buchee-welcome/);
});
test('Android build hooks match current app entry point',()=>{
 assert.match(native,/app=replace\(app,"function showApp\(\)\{"/);
 assert.doesNotMatch(native,/app=replace\(app,"function showApp\(\)\{starter\(\);"/);
});
test('the new safety stylesheet is versioned and loaded',()=>{
 assert.match(html,/buchee-launch-auth-safety-20261104\.css\?v=/);
 assert.match(read('buchee-launch-auth-safety-20261104.css'),/buchee-password-hint/);
});
