'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const cfg=fs.readFileSync('config.js','utf8');

test('passwordless existing accounts receive password reset guidance',()=>{
 assert.match(app,/Henüz şifre belirlemediysen Şifremi unuttum seçeneğiyle şifre oluştur/);
 assert.match(app,/over_email_send_rate_limit/);
 assert.ok(app.includes("resetPasswordForEmail(email,{redirectTo:'https://bucheesocial.com/'})"));
 assert.match(app,/Hesabına ait bir adres varsa şifre belirleme bağlantısı gönderilir/);
});
test('non-message pagination only reloads the requested table',()=>{
 assert.match(app,/mode\.startsWith\('single:'\)/);
 assert.match(app,/specs\.filter\(\(\[,key\]\)=>key===mode\.slice\(7\)\)/);
 assert.match(app,/await load\('single:'\+key\);navRender\(\);render\(\);return/);
 assert.doesNotMatch(app,/if\(key!=='messages'&&key!=='notifications'\)\{await refresh\(\);return\}/);
});
test('repeated pull-refresh gestures cannot launch duplicate full refreshes',()=>{
 assert.match(app,/now-bucheeLastPullRefreshAt<10000/);
});
test('preconnect points to the current Buchee Supabase project',()=>{
 const id=cfg.match(/https:\/\/([a-z]+)\.supabase\.co/);
 assert.ok(id);
 assert.match(html,new RegExp('rel="preconnect" href="https://'+id[1]+'\\.supabase\\.co"'));
});

test('Buchee uses original Patiyiz Supabase project without changing the public brand',()=>{assert.match(cfg,/tqnvvrgrsxrvzxbjbsgl\.supabase\.co/);assert.match(cfg,/sb_publishable_94x0ozPL38-3HJer2l5tqQ_BrpQZYH-/);});
