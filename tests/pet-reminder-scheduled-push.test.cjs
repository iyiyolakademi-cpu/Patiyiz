const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/patiyiz-scheduled-pet-notifications-20261024.sql','utf8');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');

test('Cron job runs once per minute, with bounded batches',()=>{
 assert.match(sql,/create extension if not exists pg_cron/);
 assert.match(sql,/patiyiz-pet-reminders/);
 assert.match(sql,/'\* \* \* \* \*'/);
 assert.match(sql,/limit 100/);
 assert.match(sql,/r\.due_at >= now\(\)-interval '24 hours'/);
});
test('Reminder dispatch is owner-only, idempotent and race-safe',()=>{
 assert.match(sql,/r\.completed_at is null and r\.notified_at is null/);
 assert.match(sql,/for update of r skip locked/);
 assert.match(sql,/update public\.patiyiz_pet_reminders[\s\S]*?set notified_at=now\(\)/);
 assert.match(sql,/notified_at := null/);
 assert.match(sql,/new\.due_at is distinct from old\.due_at/);
 assert.match(sql,/owner_id=r\.owner_id/);
 assert.match(sql,/revoke all on schema patiyiz_private from public, anon, authenticated/);
 assert.match(sql,/revoke all on function patiyiz_private\.dispatch_due_pet_reminders\(\) from public, anon, authenticated/);
});
test('Scheduled notifications integrate with existing Web Push and care page',()=>{
 assert.match(sql,/insert into public\.notifications\(owner_id,actor_id,kind,text\)/);
 assert.match(sql,/'pet_reminder'/);
 for(const kind of ['vaccine','vet','food','medicine']) assert.ok(sql.includes("when '"+kind+"'"));
 assert.match(app,/if\(n\.kind==='pet_reminder'\)\{navigate\('wellness'\);return\}/);
 assert.match(app,/if\(k==='pet_reminder'\)return \['calendar','Pati bakımı'\]/);
 assert.match(app,/bildirimlerine izin verirsen zamanı geldiğinde uygulama kapalıyken de bildirim gönderilebilir/);
 assert.match(html,/app\.js\?v=20261024-release-reliability-1&amp;pet_push=1/);
});
