const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const owner=fs.readFileSync('pati-identity-owner.js','utf8');
const scan=fs.readFileSync('pati-kimligi.html','utf8');
const sql=fs.readFileSync('docs/pati-identity-schema-proposal.sql','utf8');
const edge=fs.readFileSync('supabase/functions/pati-identity/index.ts','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
test('Pati Kimliği appears from Hayvanım and safely routes to authenticated owner dashboard',()=>{
 assert.match(app,/\['pati-identity','Pati Kimliği'/);
 assert.match(app,/'pati-identity':\(\)=>window\.PatiyizPatiIdentity\?\.mount/);
 assert.match(owner,/owner-list/);assert.match(owner,/owner-create/);
 assert.match(owner,/data-view="my-pet"/);
 assert.match(index,/pati-identity-owner\.js\?v=20261030/);
 assert.match(index,/pati-identity-owner\.css\?v=20261030/);
 assert.match(native,/'pati-identity-owner\.js'/);
 assert.match(native,/'pati-kimligi\.html'/);
});
test('QR scanner avoids private information and retains self-contained secret in URL fragment',()=>{
 assert.match(scan,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(scan,/<meta name="referrer" content="no-referrer">/);
 assert.match(scan,/location\.hash/);
 assert.match(scan,/id="question"/);
 assert.match(scan,/id="answer"/);
 assert.match(scan,/new-challenge/);
 assert.doesNotMatch(scan,/turnstile|cloudflare/i);
 assert.doesNotMatch(scan,/SUPABASE_SERVICE_ROLE_KEY/);
});
test('identity storage and messages are owner-only under RLS and anonymous contact is challenge guarded',()=>{
 for(const table of ['pati_identity_tags','pati_identity_threads','pati_identity_messages'])assert.match(sql,new RegExp('ALTER TABLE public\\.'+table+' ENABLE ROW LEVEL SECURITY'));
 assert.match(sql,/REVOKE ALL ON public\.pati_identity_tags FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT SELECT ON public\.pati_identity_tags/);
 assert.match(sql,/FOR SELECT TO authenticated USING\(owner_id=\(select auth\.uid\(\)\)\)/);
 assert.match(sql,/show_photo boolean NOT NULL DEFAULT false/);
 assert.match(sql,/SECURITY INVOKER SET search_path/);
 assert.match(sql,/GRANT SELECT,INSERT,UPDATE,DELETE ON public.pati_identity_tags/);
 assert.match(edge,/await verifyChallenge\(tag\.id,input\)/);
 assert.match(edge,/crypto\.subtle\.verify\('HMAC'/);
 assert.match(edge,/challenge-once:/);
 assert.match(edge,/action==='challenge'/);
 assert.match(edge,/action==='config'/);
 assert.match(edge,/input\.website/);
 assert.doesNotMatch(edge,/turnstile|cloudflare/i);
 assert.match(edge,/tag-global:/);
 assert.match(edge,/\.eq\('owner_id',user\.id\)/);
 assert.match(edge,/if\(!user\)return err\('Oturum gerekli.'/);
 assert.match(edge,/https:\/\/localhost/);
});
test('Original Patiyiz core JavaScript and scan/owner scripts parse',()=>{
 assert.doesNotThrow(()=>new Function(app));
 assert.doesNotThrow(()=>new Function(owner));
 const match=scan.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
 assert.ok(match);
 assert.doesNotThrow(()=>new Function(match[1]));
});

test('Challenge rate limits and self-hosted confirmation remain server-side',()=>{
 assert.match(edge,/limit\('challenge-ip:'/);
 assert.match(edge,/limit\('challenge-tag:'/);
 assert.match(edge,/limit\('send-ip:'/);
 assert.match(edge,/limit\('tag-global:'/);
 assert.match(edge,/Date\.now\(\)\+5\*60\*1000/);
 assert.match(scan,/await call\('challenge',\{token:tag\}\)/);
 assert.match(scan,/answer:\$\('answer'\)\.value/);
 assert.match(scan,/website:\$\('website'\)\.value/);
});
