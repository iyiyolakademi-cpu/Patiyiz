// Deploy with Supabase Edge Functions, verify_jwt=false.
// Webhook: notifications INSERT -> POST /functions/v1/patiyiz-push
// HTTP header: x-patiyiz-webhook-secret = PUSH_WEBHOOK_SECRET
// Set secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_WEBHOOK_SECRET.
// Never expose PRIVATE/ROLE/WEBHOOK values to the frontend.
import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const url=Deno.env.get('SUPABASE_URL')||'';
const role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const secret=Deno.env.get('PUSH_WEBHOOK_SECRET')||'';
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')||'mailto:admin@example.com',
 Deno.env.get('VAPID_PUBLIC_KEY')||'',Deno.env.get('VAPID_PRIVATE_KEY')||'');
const db=createClient(url,role,{auth:{persistSession:false}});
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 if(!secret||req.headers.get('x-patiyiz-webhook-secret')!==secret)return new Response('Unauthorized',{status:401});
 try{
  const event=await req.json();
  if(event.type!=='INSERT'||event.table!=='notifications'||!event.record?.id)return new Response('Ignored',{status:200});
  const id=event.record.id;
  // Read authoritative recipient and message; never trust caller-supplied content.
  const {data:n,error:ne}=await db.from('notifications').select('id,owner_id,kind,text').eq('id',id).single();
  if(ne||!n)return new Response('Not found',{status:404});
  const {data:subs,error:se}=await db.from('push_subscriptions').select('id,endpoint,p256dh,auth_secret').eq('user_id',n.owner_id);
  if(se)throw se;
  const payload=JSON.stringify({id:n.id,title:'Patiyiz 🐾',body:n.text});
  await Promise.all((subs||[]).map(async s=>{
   try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_secret}},payload,{TTL:1800})}
   catch(err){if([404,410].includes(err?.statusCode))await db.from('push_subscriptions').delete().eq('id',s.id);else console.error('Push delivery failed',err?.statusCode||err?.message)}
  }));
  return new Response('OK',{status:200});
 }catch(err){console.error(err);return new Response('Internal error',{status:500})}
});
