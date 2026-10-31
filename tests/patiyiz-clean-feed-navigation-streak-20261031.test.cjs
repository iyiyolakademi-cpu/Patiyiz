const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-clean-release-20261031.css','utf8');
const streakSQL=fs.readFileSync('supabase/patiyiz-streak-explicit-claim-20261031.sql','utf8');
test('One clean feed without duplicate for-you/following tabs or top coin badge',()=>{
 assert.match(app,/function homePage\(\)\{\s*\/\/ The existing central feed stays unified; duplicated feed selector is removed\.\s*patiHomeTab='all'/);
 assert.doesNotMatch(app,/<div class="pati-home-feed-tabs"/);
 assert.doesNotMatch(html,/id="pati-feed-menu"/);
 assert.doesNotMatch(html,/id="pati-feed-menu-trigger"/);
 assert.match(css,/#pati-header-coins,#pati-desktop-coins\{display:none!important\}/);
 assert.match(app,/\['rewards','PatiCoin Merkezi','grid'\]/);
});
test('Profile completion is fully optional and hide preference is per user',()=>{
 assert.match(app,/patiyiz-profile-optional-hidden-v2:/);
 assert.match(app,/if\(patiOnboardingHidden\(\)\)return ''/);
 assert.match(app,/pati-onboarding-dismiss/);
 assert.match(app,/case 'pati-onboarding-dismiss':patiDismissOnboarding\(\)/);
 assert.match(css,/\.pati-optional-onboarding/);
});
test('Global and per-page back buttons route through one central handler',()=>{
 assert.match(html,/id="pati-global-back"/);
 assert.match(app,/function patiGoBack\(\)/);
 assert.match(app,/case 'pati-page-back':case 'pati-global-back':patiGoBack\(\)/);
 assert.match(app,/if\(document\.getElementById\('story-overlay'\)\)\{closeStory\(\);return\}/);
 assert.match(app,/if\(view==='messages'&&mobileChatOpen\)/);
 assert.match(app,/if\(!patiNavigatingBack\)\{patiViewTrail\.push\(previous\)/);
});
test('Share sheet has Q&A and uses existing question form',()=>{
 assert.match(html,/data-action="pati-create-question"/);
 assert.match(app,/case 'pati-create-question':closePatiCreate\(\);navigate\('community'\);composeQuestion\(\)/);
});
test('Menus scroll vertically, creator stats compact',()=>{
 assert.match(css,/#tools-form \.pati-mobile-menu-list\{display:flex!important;flex-direction:column!important/);
 assert.match(css,/#tools-form \.modal-content\{max-height:/);
 assert.match(css,/\.pati-ig-profile \.pati-profile-insights-preview\{display:flex!important/);
});
test('Streak payout is idempotent, explicit and never animated before confirmation',()=>{
 assert.match(app,/case 'pati-streak-collect'/);
 assert.match(app,/async function patiStreakClaim\(target\)/);
 assert.match(app,/sb\.rpc\('patiyiz_claim_streak_reward',\{p_target:target\}\)/);
 assert.match(app,/if\(coins>0\)\{\s*patiCoinAnimation\(coins/);
 assert.match(app,/Puanı topla/);
 assert.match(streakSQL,/on conflict\(user_id,task_code\) do nothing/i);
 assert.match(streakSQL,/perform 1 from public\.patiyiz_reward_wallets where user_id=uid for update/i);
 assert.match(streakSQL,/revoke all on function public\.patiyiz_claim_streak_reward\(integer\) from public,anon/);
 const legacySQL=streakSQL.split('CREATE OR REPLACE FUNCTION public.patiyiz_streak_goal')[1];
 assert.ok(legacySQL);
 assert.doesNotMatch(legacySQL,/insert into public\.patiyiz_reward_ledger/);
});
