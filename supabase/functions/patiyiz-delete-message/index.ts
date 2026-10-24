import { createClient } from "npm:@supabase/supabase-js@2";

/** One message is permanently removed for BOTH participants, not "delete for me".
 * Server-only service-role access; never ship privileged keys to a browser.
 * Body and attachment must be inaccessible after the message row is removed.
 */
const origins=new Set(["https://patiyiz.com","https://www.patiyiz.com","https://iyiyolakademi-cpu.github.io"]);
Deno.serve(async req=>{
 const origin=req.headers.get("origin");
 const headers={
  "content-type":"application/json",
  "access-control-allow-origin":origin&&origins.has(origin)?origin:"https://patiyiz.com",
  "access-control-allow-headers":"authorization,apikey,content-type,x-client-info,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version",
  "access-control-allow-methods":"POST,OPTIONS","vary":"Origin",
  "cache-control":"no-store"
 };
 const reply=(code:number,message:string,extra:Record<string,unknown>={})=>new Response(JSON.stringify({message,...extra}),{status:code,headers});
 if(origin&&!origins.has(origin))return reply(403,"Origin not allowed.");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply(405,"Method not allowed.");
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return reply(401,"Oturum açmalısın.");
 let data:unknown;
 try{data=await req.json()}catch{return reply(400,"Geçersiz istek.")}
 const raw=(data as Record<string,unknown>)?.message_id;
 if(typeof raw!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw))
  return reply(400,"Geçersiz mesaj kimliği.");
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return reply(503,"Mesaj hizmeti hazır değil.");
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+token}}});
 const {data:userResult,error:userError}=await client.auth.getUser();
 if(userError||!userResult?.user)return reply(401,"Oturum doğrulanamadı.");
 const uid=userResult.user.id;
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:message,error:readError}=await admin.from("messages")
  .select("id,sender_id,receiver_id,attachment_path")
  .eq("id",raw).maybeSingle();
 if(readError)return reply(503,"Mesaj doğrulanamadı.");
 if(!message)return reply(404,"Mesaj bulunamadı veya zaten silinmiş.");
 if(message.sender_id!==uid&&message.receiver_id!==uid)
  return reply(403,"Bu mesajı silme yetkin yok.");
 const {data:deleted,error:deleteError}=await admin.from("messages").delete().eq("id",raw)
  .or("sender_id.eq."+uid+",receiver_id.eq."+uid).select("id");
 if(deleteError)return reply(503,"Mesaj silinemedi.");
 if(!deleted?.length)return reply(404,"Mesaj bulunamadı veya zaten silinmiş.");
 let attachmentRemoved=true;
 if(message.attachment_path){
  const r=await admin.storage.from("patiyiz-private-messages").remove([message.attachment_path]);
  if(r.error){attachmentRemoved=false;console.error("DM object cleanup failed; manual maintenance required",r.error.message)}
 }
 return reply(200,"Mesaj iki tarafın sohbetinden silindi.",{deleted:true,attachmentRemoved});
});
