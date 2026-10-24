import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const textEncoder=new TextEncoder();
function toBase64Url(bytes:Uint8Array){
 let result='';for(const b of bytes)result+=String.fromCharCode(b);
 return btoa(result).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/g,'');
}
async function getFirebaseOAuth(secretJson:string){
 const credentials=JSON.parse(secretJson);
 if(!credentials.private_key||!credentials.client_email||!/^[\\w-]{4,100}$/.test(credentials.project_id))throw Error('Firebase service account incomplete');
 const raw=credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\\s/g,'');
 const binary=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',binary,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const now=Math.floor(Date.now()/1000);
 const header=toBase64Url(textEncoder.encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
 const claims=toBase64Url(textEncoder.encode(JSON.stringify({
  iss:credentials.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',
  aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3300
 })));
 const part=header+'.'+claims;
 const signature=toBase64Url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,textEncoder.encode(part))));
 const r=await fetch('https://oauth2.googleapis.com/token',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:part+'.'+signature})
 });
 if(!r.ok)throw Error('Firebase OAuth failed: '+r.status);
 const v=await r.json();if(!v.access_token)throw Error('Firebase access token missing');
 return {token:String(v.access_token),project:String(credentials.project_id)};
}
async function deliverFirebase(db:any,n:any){
 const config=Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
 if(!config)return;
 const {data:devices,error}=await db.from('patiyiz_native_push_tokens').select('id,token').eq('user_id',n.owner_id);
 if(error)throw error;
 if(!devices?.length)return;
 const auth=await getFirebaseOAuth(config);
 const text=String(n.text||'Yeni bildirimin var.').slice(0,220);
 for(const device of devices){
  try{
   const response=await fetch('https://fcm.googleapis.com/v1/projects/'+encodeURIComponent(auth.project)+'/messages:send',{
    method:'POST',headers:{Authorization:'Bearer '+auth.token,'Content-Type':'application/json'},
    body:JSON.stringify({message:{
      token:device.token,notification:{title:'Patiyiz 🐾',body:text},
      data:{screen:'notifications',notification_id:String(n.id)},
      android:{priority:'high',ttl:'1800s'}
    }})
   });
   if(!response.ok){
    const failure=await response.json().catch(()=>({}));
    if(JSON.stringify(failure).includes('UNREGISTERED'))await db.from('patiyiz_native_push_tokens').delete().eq('id',device.id);
    else console.error('FCM delivery error HTTP',response.status);
   }
  }catch(e){console.error('FCM network failure',String(e?.message||e).slice(0,100))}
 }
}

Deno.serve(async req => {
  if(req.method!=='POST') return new Response('Method not allowed',{status:405});
  const secret=Deno.env.get('PUSH_WEBHOOK_SECRET');
  if(!secret || req.headers.get('x-patiyiz-webhook-secret')!==secret) return new Response('Unauthorized',{status:401});
  const publicKey=Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey=Deno.env.get('VAPID_PRIVATE_KEY');
  const role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url=Deno.env.get('SUPABASE_URL');
  if(!role||!url)return new Response('Push setup incomplete',{status:503});
  try{
    const payload=await req.json();
    if(payload.type!=='INSERT'||payload.table!=='notifications'||!payload.record?.id) return new Response('Ignored');
    const db=createClient(url,role,{auth:{persistSession:false}});
    const {data:n,error}=await db.from('notifications').select('id,owner_id,actor_id,kind,text').eq('id',payload.record.id).single();
    if(error||!n) return new Response('Notification not found',{status:404});
    const {data:subs,error:err}=await db.from('push_subscriptions').select('id,endpoint,p256dh,auth_secret').eq('user_id',n.owner_id);
    if(err) throw err;
    if((subs||[]).length&&publicKey&&privateKey)webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')||'mailto:support@example.com',publicKey,privateKey);
    // The database notification already contains the real sender's display name.
    // Rechecking the profile here may fail and must never erase that name.
    const notificationBody=String(n.text||'Yeni bildirimin var.').slice(0,220);
    const message=JSON.stringify({id:n.id,title:'Patiyiz 🐾',body:notificationBody});
    await Promise.all((publicKey&&privateKey?subs||[]:[]).map(async s=>{
      try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_secret}},message,{TTL:1800})}
      catch(e){if(e?.statusCode===404||e?.statusCode===410)await db.from('push_subscriptions').delete().eq('id',s.id);else console.error('Push delivery error',e?.statusCode||'unknown')}
    }));
    try{await deliverFirebase(db,n)}catch(e){console.error('FCM setup error',String(e?.message||e).slice(0,130))}
    return new Response('OK');
  }catch(e){console.error(e);return new Response('Internal error',{status:500})}
});