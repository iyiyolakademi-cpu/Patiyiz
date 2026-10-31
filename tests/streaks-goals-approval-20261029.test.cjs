const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('supabase/patiyiz-streak-goals-20261029.sql','utf8');
const currentSQL=fs.readFileSync('supabase/patiyiz-streak-explicit-claim-20261031.sql','utf8');
const picker=fs.readFileSync('patiyiz-collab-picker-20261029.js','utf8');
const delight=fs.readFileSync('patiyiz-delight-20261029.js','utf8');
const css=fs.readFileSync('patiyiz-polish-collab-dm-story-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
test('Existing app, live collaborator picker and streak animation compile',()=>{
 new vm.Script(app);new vm.Script(picker);new vm.Script(delight);
});
test('Menu and desktop nav contain Seriler and selecting it renders a permanent card',()=>{
 assert.match(app,/const allowed=\[[^\]]*'streaks'/);
 assert.match(app,/\['streaks','Seriler','calendar'\]/);
 assert.match(app,/items:\[\['rewards','PatiCoin Merkezi','grid'\],\['streaks','Seriler','calendar'\]/);
 assert.match(app,/streaks:patiStreaksPage/);
 assert.match(app,/function patiStreaksPage\(\)/);
 assert.match(app,/window\.PatiyizDelight\?\.streakPanel\(\{count:days,best\},patiStreakToday\(\)\)/);
 assert.match(delight,/function streakPanel\(state=\{\},day=''\)/);
 assert.match(app,/Serini tamamladığında Puanı topla butonuyla ödülünü hesabına ekle/);
 assert.doesNotMatch(app,/window\.PatiyizDelight\?\.showStreakOnce\(patiStreakState/);
});
test('Exactly four fixed targets and rewards; progress follows only server-confirmed streak',()=>{
 const area=app.slice(app.indexOf('const patiStreakGoals='),app.indexOf('async function patiStreakGoalLoad'));
 for(const [days,coins] of [[3,10],[7,25],[14,60],[30,150]]){
  assert.ok(area.includes('{days:'+days+',coins:'+coins+','),'missing '+days);
  assert.match(sql,new RegExp('when '+days+' then '+coins));
 }
 assert.match(app,/\.rpc\('patiyiz_streak_goal',\{p_target:target\}\)/);
 assert.match(app,/patiStreakGoalState\.earned/);
 assert.match(app,/data-action="'\+\(claimable\?'pati-streak-collect':'pati-streak-goal'\)/);
 assert.match(css,/\.pati-streak-goal-grid/);
 assert.match(css,/\.pati-streak-progress/);
});
test('Server-controlled PatiCoin reward is idempotent, user-specific and privilege-limited',()=>{
 assert.match(sql,/patiyiz_streak_goals\(/);
 assert.match(sql,/target_days integer not null check\(target_days in \(3,7,14,30\)\)/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/revoke all on public\.patiyiz_streak_goals from public,anon,authenticated/);
 assert.match(sql,/grant select on public\.patiyiz_streak_goals to authenticated/);
 assert.match(sql,/uid uuid := \(select auth\.uid\(\)\)/);
});
test('Streak awards are credited only by verified, explicit one-time claim',()=>{
 assert.match(currentSQL,/CREATE OR REPLACE FUNCTION public\.patiyiz_claim_streak_reward\(p_target integer\)/i);
 assert.match(currentSQL,/if selected_target is distinct from p_target/i);
 assert.match(currentSQL,/coalesce\(streak,0\)<p_target/i);
 assert.match(currentSQL,/on conflict\(user_id,task_code\) do nothing returning id into inserted/i);
 assert.match(currentSQL,/balance=balance\+coins,lifetime_earned=lifetime_earned\+coins/i);
 assert.match(currentSQL,/perform 1 from public\.patiyiz_reward_wallets where user_id=uid for update/i);
 assert.match(currentSQL,/revoke all on function public\.patiyiz_claim_streak_reward\(integer\) from public,anon/i);
 assert.match(currentSQL,/grant execute on function public\.patiyiz_claim_streak_reward\(integer\) to authenticated/i);
 assert.match(app,/sb\.rpc\('patiyiz_claim_streak_reward'/);
 assert.match(app,/patiCoinAnimation\(coins,\['Seri ödülün toplandı'\]\)/);
 assert.match(app,/patiCoinSync\(false\)/);
 const old=currentSQL.split('CREATE OR REPLACE FUNCTION public.patiyiz_streak_goal')[1];
 assert.ok(old);
 assert.doesNotMatch(old,/insert into public\.patiyiz_reward_ledger/);
});
test('Right-side Onayla button is the only pointer click selection trigger',()=>{
 assert.match(picker,/class="pati-collab-approve"/);
 assert.match(picker,/data-pati-approve-id/);
 assert.match(picker,/>Onayla<\/button>/);
 assert.match(picker,/const approve=event\.target\?\.closest\?\.\('button\[data-pati-approve-id\]'\)/);
 assert.match(picker,/results\.addEventListener\('pointerdown',approveFromEvent\)/);
 assert.match(picker,/results\.addEventListener\('touchstart',approveFromEvent/);
 assert.match(picker,/if\(!approve\|\|!results\.contains\(approve\)\)return false/);
 assert.match(picker,/choose\(p\)/);
 assert.doesNotMatch(picker,/event\.target\.closest\('\[data-pati-user-id\]'\)/);
 assert.match(css,/\.pati-collab-search-results \.pati-collab-approve/);
 assert.match(css,/html\[data-pati-theme="dark"\] \.pati-collab-search-results \.pati-collab-approve/);
});
test('Cache invalidations and responsive dark/light styles remain intact',()=>{
 assert.match(html,/patiyiz-delight-20261029\.js\?v=4/);
 assert.match(html,/patiyiz-collab-picker-20261029\.js\?v=3/);
 assert.match(html,/streak_menu_rewards_collab_approve=20261029/);
 assert.match(css,/html\[data-pati-theme="light"\]/);
 assert.match(css,/html\[data-pati-theme="dark"\]/);
 assert.match(css,/@media\(max-width:540px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
