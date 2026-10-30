// Patiyiz QR identity gateway — self-hosted, no paid CAPTCHA provider.
// Visitor checks use HMAC-signed single-use arithmetic challenges, honeypot and owner-scoped rate limits.
// Public lookup contains an intentionally minimal pet card; never returns owner identifiers.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const URL_BASE=Deno.env.get('SUPABASE_URL')||'';
const SECRET=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const PEPPER=Deno.env.get('PATI_RATE_PEPPER')||SECRET; // Supabase supplies SECRET server-side; never sent to clients.
const admin=createClient(URL_BASE,SECRET,{auth:{autoRefreshToken:false,persistSession:false}});
const origins=new Set(['https://patiyiz.com','https://www.patiyiz.com','https://iyiyolakademi-cpu.github.io','https://localhost','capacitor://localhost']);
function cors(origin:string|null){
 const ok=origin&&origins.has(origin)?origin:'https://patiyiz.com';
 return {'Access-Control-Allow-Origin':ok,'Vary':'Origin','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
}
function respond(data:unknown,status=200,origin:string|null=null){
 return new Response(JSON.stringify(data),{status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8'}});
}
const err=(message:string,status=400,origin:string|null=null)=>respond({ok:false,error:message},status,origin);
function randomToken(){
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function sha(value:string){
 const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(b)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function tokenOk(v:unknown){return typeof v==='string'&&/^[a-zA-Z0-9_-]{40,50}$/.test(v)}
function uuidOk(v:unknown){return typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)}
function bodyOk(v:unknown){return typeof v==='string'&&v.trim().length>0&&v.trim().length<=1000}
function ipOf(req:Request){return (req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,70)}
async function limit(key:string,max:number,seconds:number){
 const key_hash=await sha(PEPPER+':'+key);
 const {data,error}=await admin.rpc('pati_identity_throttle',{p_key_hash:key_hash,p_limit:max,p_window_seconds:seconds});
 return !error&&data===true;
}
/* HMAC signed five-minute challenge; all secrets and rate limits are server-side.
 * This is a practical free abuse barrier, NOT equivalent to a managed CAPTCHA. */
function randomInt(min:number,max:number){const bytes=crypto.getRandomValues(new Uint32Array(1));return min+(bytes[0]%(max-min+1))}
async function hmacKey(){return crypto.subtle.importKey('raw',new TextEncoder().encode(PEPPER),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
function challengeData(nonce:string,a:number,b:number,expires:number,tagId:string){return [nonce,a,b,expires,tagId].join(':')}
async function issueChallenge(tagId:string){
 const nonce=randomToken(),a=randomInt(4,13),b=randomInt(3,12),expires=Date.now()+5*60*1000;
 const signature=new Uint8Array(await crypto.subtle.sign('HMAC',await hmacKey(),new TextEncoder().encode(challengeData(nonce,a,b,expires,tagId))));
 return {nonce,a,b,expires,signature:[...signature].map(x=>x.toString(16).padStart(2,'0')).join('')};
}
async function verifyChallenge(tagId:string,input:any){
 const p=input?.challenge;
 if(!p||!tokenOk(p.nonce)||!Number.isSafeInteger(p.a)||p.a<4||p.a>13||!Number.isSafeInteger(p.b)||p.b<3||p.b>12||
   !Number.isSafeInteger(p.expires)||p.expires<=Date.now()||p.expires>Date.now()+300000||
   typeof p.signature!=='string'||!/^[a-f0-9]{64}$/.test(p.signature)||
   String(input?.answer??'').trim()!==String(p.a+p.b))return false;
 if(typeof input?.website==='string'&&input.website.trim())return false;
 const signature=Uint8Array.from(p.signature.match(/../g)!.map((hex:string)=>parseInt(hex,16)));
 const valid=await crypto.subtle.verify('HMAC',await hmacKey(),signature,
   new TextEncoder().encode(challengeData(p.nonce,p.a,p.b,p.expires,tagId)));
 return valid&&await limit('challenge-once:'+p.nonce,1,86400);
}

async function getOwner(req:Request){
 const jwt=req.headers.get('authorization')?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
 if(!jwt)return null;
 const {data,error}=await admin.auth.getUser(jwt);
 return error?null:data.user;
}
async function findTag(token:unknown){
 if(!tokenOk(token))return null;
 const {data,error}=await admin.from('pati_identity_tags').select('id,pet_id,owner_id,enabled,show_photo,public_note').eq('token_hash',await sha(token as string)).maybeSingle();
 return error||!data||!data.enabled?null:data;
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin');
 if(req.method==='OPTIONS')return new Response('',{status:204,headers:cors(origin)});
 if(req.method!=='POST')return err('Unsupported request.',405,origin);
 if(origin&&!origins.has(origin))return err('Origin is not permitted.',403,origin);
 try {
  const input=await req.json();
  const action=String(input?.action||'');
  const ip=ipOf(req);
  if(action==='config')return respond({ok:true,mode:'self-hosted',contactReady:!!PEPPER},200,origin);
  if(action==='challenge'){
   const tag=await findTag(input.token);
   if(!tag)return err('Bu Pati Kimliği aktif değil.',404,origin);
   if(!await limit('challenge-ip:'+ip,24,3600)||!await limit('challenge-tag:'+tag.id,150,3600))return err('Çok sık deneme. Daha sonra tekrar dene.',429,origin);
   return respond({ok:true,challenge:await issueChallenge(tag.id)},200,origin);
  }
  if(action==='lookup'){
   if(!await limit('scan:'+ip,120,3600))return err('Çok sayıda istek. Daha sonra dene.',429,origin);
   const tag=await findTag(input.token);
   if(!tag)return err('Bu Pati Kimliği bulunamadı veya devre dışı.',404,origin);
   const {data:pet,error}=await admin.from('pets').select('name,species,breed,photo_url').eq('id',tag.pet_id).maybeSingle();
   if(error||!pet)return err('Hayvan bilgisi alınamadı.',404,origin);
   return respond({ok:true,pet:{name:pet.name||'Patili dost',species:pet.species||'Hayvan',breed:pet.breed||'',photo_url:tag.show_photo?pet.photo_url:null,note:tag.public_note||''}},200,origin);
  }
  if(action==='read-thread'){
   if(!await limit('read-thread:'+ip,100,3600))return err('Çok sık kontrol yapıldı.',429,origin);
   const tag=await findTag(input.token);
   if(!tag||!tokenOk(input.receipt))return err('Özel konuşma bağlantısı geçersiz.',404,origin);
   const {data:t}=await admin.from('pati_identity_threads').select('id,expires_at,status').eq('tag_id',tag.id).eq('receipt_hash',await sha(input.receipt)).maybeSingle();
   if(!t||Date.parse(t.expires_at)<Date.now())return err('Konuşmanın süresi doldu.',404,origin);
   const {data:messages,error}=await admin.from('pati_identity_messages').select('id,sender,body,created_at').eq('thread_id',t.id).order('created_at',{ascending:true}).limit(100);
   if(error)return err('Konuşma yüklenemedi.',500,origin);
   return respond({ok:true,status:t.status,messages:messages||[]},200,origin);
  }
  if(action==='send'||action==='finder-reply'){
   const tag=await findTag(input.token);
   if(!tag)return err('Bu Pati Kimliği artık aktif değil.',404,origin);
   if(!bodyOk(input.message))return err('Mesaj 1–1000 karakter olmalı.',400,origin);
   if(!await limit('send-ip:'+ip+':'+tag.id,8,3600))return err('Mesaj deneme sınırına ulaştın.',429,origin);
   if(!await verifyChallenge(tag.id,input))return err('Güvenlik sorusu yanlış, kullanılmış veya süresi dolmuş. Yeniden dene.',403,origin);
   if(!await limit('tag-global:'+tag.id,30,3600))return err('Bu hayvan için mesaj sınırına ulaşıldı.',429,origin);
   let receipt:string|undefined,thread:string|undefined;
   if(action==='send'){
    receipt=randomToken();
    const {data,error}=await admin.from('pati_identity_threads').insert({tag_id:tag.id,owner_id:tag.owner_id,receipt_hash:await sha(receipt)}).select('id').single();
    if(error||!data)return err('İletişim başlatılamadı.',500,origin);
    thread=data.id;
   }else{
    if(!tokenOk(input.receipt))return err('Özel konuşma bağlantısı geçersiz.',404,origin);
    const {data:t}=await admin.from('pati_identity_threads').select('id,status,expires_at').eq('tag_id',tag.id).eq('receipt_hash',await sha(input.receipt)).maybeSingle();
    if(!t||t.status!=='open'||Date.parse(t.expires_at)<Date.now())return err('Konuşma kapalı veya süresi dolmuş.',403,origin);
    thread=t.id;
   }
   const {error}=await admin.from('pati_identity_messages').insert({thread_id:thread,owner_id:tag.owner_id,sender:'finder',body:input.message.trim()});
   if(error){if(receipt)await admin.from('pati_identity_threads').delete().eq('id',thread);return err('Mesaj kaydedilemedi.',500,origin)}
   return respond({ok:true,receipt:receipt||null},200,origin);
  }
  if(!action.startsWith('owner-'))return err('Geçersiz işlem.',400,origin);
  const user=await getOwner(req);
  if(!user)return err('Oturum gerekli.',401,origin);
  if(action==='owner-list'){
   const {data:tags,error}=await admin.from('pati_identity_tags').select('id,pet_id,enabled,show_photo,public_note,token_hint,updated_at').eq('owner_id',user.id).limit(100);
   if(error)return err('Kimlikler yüklenemedi.',500,origin);
   const {data:threads}=await admin.from('pati_identity_threads').select('id,tag_id,status,created_at,expires_at').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(50);
   const ids=(threads||[]).map(t=>t.id);
   const {data:messages}=ids.length?await admin.from('pati_identity_messages').select('id,thread_id,sender,body,created_at').eq('owner_id',user.id).in('thread_id',ids).order('created_at',{ascending:true}).limit(1000):{data:[]};
   return respond({ok:true,tags:tags||[],threads:threads||[],messages:messages||[]},200,origin);
  }
  if(action==='owner-create'){
   if(!uuidOk(input.petId))return err('Hayvan seçimi geçersiz.',400,origin);
   const {data:pet}=await admin.from('pets').select('id').eq('id',input.petId).eq('owner_id',user.id).maybeSingle();
   if(!pet)return err('Bu hayvanın kaydına erişimin yok.',403,origin);
   const token=randomToken();
   const {data,error}=await admin.from('pati_identity_tags').upsert({pet_id:pet.id,owner_id:user.id,token_hash:await sha(token),token_hint:token.slice(-4),enabled:true,updated_at:new Date().toISOString()},{onConflict:'pet_id'}).select('id,pet_id,enabled,token_hint').single();
   if(error||!data)return err('QR oluşturulamadı.',500,origin);
   return respond({ok:true,tag:data,token},200,origin);
  }
  if(action==='owner-toggle'){
   if(!uuidOk(input.tagId))return err('Kimlik seçimi geçersiz.',400,origin);
   const {data,error}=await admin.from('pati_identity_tags').update({enabled:input.enabled===true,updated_at:new Date().toISOString()}).eq('owner_id',user.id).eq('id',input.tagId).select('id,enabled').maybeSingle();
   if(error||!data)return err('Kimlik güncellenemedi.',403,origin);
   return respond({ok:true,tag:data},200,origin);
  }
  if(action==='owner-settings'){
   if(!uuidOk(input.tagId))return err('Kimlik seçimi geçersiz.',400,origin);
   const public_note=String(input.public_note||'').trim();
   if(public_note.length>200||/@|\+?\d[\d\s()-]{7,}\d/.test(public_note))return err('Notta telefon veya e-posta paylaşma (en fazla 200 karakter).',400,origin);
   const {data,error}=await admin.from('pati_identity_tags').update({public_note,show_photo:input.show_photo===true,updated_at:new Date().toISOString()}).eq('owner_id',user.id).eq('id',input.tagId).select('id').maybeSingle();
   return error||!data?err('Gizlilik ayarları kaydedilemedi.',403,origin):respond({ok:true},200,origin);
  }
  if(action==='owner-reply'){
   if(!uuidOk(input.threadId)||!bodyOk(input.message))return err('Yanıt geçersiz.',400,origin);
   const {data:t}=await admin.from('pati_identity_threads').select('id,status,expires_at').eq('owner_id',user.id).eq('id',input.threadId).maybeSingle();
   if(!t||t.status!=='open'||Date.parse(t.expires_at)<Date.now())return err('Bu konuşma artık açık değil.',403,origin);
   const {error}=await admin.from('pati_identity_messages').insert({thread_id:t.id,owner_id:user.id,sender:'owner',body:input.message.trim()});
   return error?err('Yanıt gönderilemedi.',500,origin):respond({ok:true},200,origin);
  }
  if(action==='owner-close'){
   if(!uuidOk(input.threadId))return err('Görüşme geçersiz.',400,origin);
   const {data,error}=await admin.from('pati_identity_threads').update({status:'closed'}).eq('owner_id',user.id).eq('id',input.threadId).select('id').maybeSingle();
   return error||!data?err('Görüşme kapatılamadı.',403,origin):respond({ok:true},200,origin);
  }
  return err('Geçersiz işlem.',400,origin);
 }catch(e){console.error('pati-identity error:',String((e as Error)?.message||'unexpected').slice(0,120));return err('İşlem gerçekleştirilemedi.',500,origin)}
});
