import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.58.0";
const project=Deno.env.get("SUPABASE_URL")||"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const origin=new URL(project).origin;
const marker="patiyiz-private-posts:";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const fields={posts:["image_url","images","video_url","video_cover_url","media_videos"],patiyiz_stories:["image_url","video_url"],pets:["photo_url"]} as const;
type OriginItem={bucket:string,path:string};
function fromPublic(value:unknown,uid:string):OriginItem|null{
 if(typeof value!=="string"||!value)return null;
 if(value.startsWith(marker)){
  if(!value.startsWith(marker+uid+"/"))throw Error("Gönderi başka hesabın özel dosyasını kullanıyor.");
  return null;
 }
 if(!/^https?:\/\//i.test(value))throw Error("Desteklenmeyen medya kaynağı bulundu; hesap gizliliği etkinleştirilmedi.");
 const url=new URL(value);
 if(url.origin!==origin)throw Error("Harici medya kaynağı var; önce bu medya kaldırılmalı.");
 const match=url.pathname.match(/^\/storage\/v1\/object\/public\/(patiyiz-media|patiyiz-videos)\/(.+)$/);
 if(!match)throw Error("Bilinmeyen herkese açık medya kaynağı.");
 const path=decodeURIComponent(match[2]);
 if(!path.startsWith(uid+"/")||path.includes("..")||!/^[-0-9a-f]{36}\/[-0-9a-f]{36}[.](jpg|jpeg|png|webp|gif|mp4|webm|mov)$/i.test(path))
  throw Error("Kaynağın sahibi veya dosya yolu doğrulanamadı.");
 return {bucket:match[1],path};
}
Deno.serve(async(request)=>{
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(request.method!=="POST")return reply(405,{error:"METHOD_NOT_ALLOWED"});
 if(!project||!serviceKey)return reply(503,{error:"SERVICE_NOT_CONFIGURED"});
 const bearer=request.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/i.test(bearer))return reply(401,{error:"LOGIN_REQUIRED"});
 const token=bearer.replace(/^Bearer\s+/i,"").trim();
 const admin=createClient(project,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:{user},error:authenticationError}=await admin.auth.getUser(token);
 if(authenticationError||!user)return reply(401,{error:"LOGIN_REQUIRED"});
 const uid=user.id;
 let filesCopied=0,filesRemoved=0,recordsChanged=0;
 try{
  const sources:Record<string,any[]>={};
  for(const table of Object.keys(fields)){
   const {data,error}=await admin.from(table).select("*").eq(table==="pets"?"owner_id":"author_id",uid).limit(500);
   if(error)throw error;
   if((data||[]).length===500)throw Error("Çok fazla kayıt bulundu. Güvenli toplu taşıma gerektiriyor.");
   sources[table]=data||[];
  }
  const originals=new Map<string,OriginItem>();
  const transformed:Record<string,Array<{id:string,changes:Record<string,unknown>}>>={posts:[],patiyiz_stories:[],pets:[]};
  for(const [table,rows] of Object.entries(sources)){
   for(const row of rows){
    const changes:Record<string,unknown>={};
    const shared=table==="patiyiz_stories"&&!!row.shared_post_id;
    for(const field of fields[table as keyof typeof fields]){
     const val=row[field];
     const change= (url:unknown):unknown=>{
       if(!url)return url;
       if(shared)return field==="image_url"?"":null; // Use linked post; never duplicate its signed URL.
       const item=fromPublic(url,uid);
       if(!item)return url;
       const key=item.bucket+"/"+item.path;
       originals.set(key,item);
       return marker+item.path;
     };
     if(Array.isArray(val)){
      const updated=val.map(change);
      if(JSON.stringify(updated)!==JSON.stringify(val))changes[field]=updated;
     }else{
      const updated=change(val);
      if(updated!==val)changes[field]=updated;
     }
    }
    if(Object.keys(changes).length)transformed[table].push({id:row.id,changes});
   }
  }
  for(const item of originals.values()){
   const {error}=await admin.from("patiyiz_private_media_migration_manifest").upsert({
    user_id:uid,source_bucket:item.bucket,source_path:item.path
   },{onConflict:"user_id,source_bucket,source_path",ignoreDuplicates:true});
   if(error)throw error;
   const exists=await admin.storage.from("patiyiz-private-posts").info(item.path);
   if(!exists.error&&exists.data)continue;
   const {data:blob,error:readError}=await admin.storage.from(item.bucket).download(item.path);
   if(readError||!blob)throw Error("Eski dosya okunamadı; gizli hesaba geçiş durduruldu.");
   const {error:writeError}=await admin.storage.from("patiyiz-private-posts").upload(item.path,blob,{
    contentType:(()=>{
      const ext=item.path.split(".").pop()?.toLowerCase();
      return ({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",
       heic:"image/heic",heif:"image/heif",mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime"})[ext||""]||"application/octet-stream";
    })(),upsert:false,cacheControl:"60"
   });
   if(writeError){
    const check=await admin.storage.from("patiyiz-private-posts").info(item.path);
    if(check.error||!check.data)throw Error("Özel depoya kopyalama başarısız.");
   }
   filesCopied++;
  }
  // Rewriting rows is idempotent; the manifest allows cleanup to resume after interruption.
  for(const [table,changes] of Object.entries(transformed)){
   for(const row of changes){
    const {data,error}=await admin.from(table).update(row.changes).eq("id",row.id).eq(table==="pets"?"owner_id":"author_id",uid).select("id").single();
    if(error||!data)throw Error("Paylaşım güvenli kayda dönüştürülemedi.");
    recordsChanged++;
   }
  }
  for(const table of Object.keys(fields)){
   const {data,error}=await admin.from(table).select("*").eq(table==="pets"?"owner_id":"author_id",uid).limit(500);
   if(error)throw error;
   for(const row of data||[]){
    for(const field of fields[table as keyof typeof fields]){
     const all=Array.isArray(row[field])?row[field]:[row[field]];
     for(const value of all){
      if(!value)continue;
      if(table==="patiyiz_stories"&&row.shared_post_id&&typeof value==="string"&&value.startsWith("http"))
       throw Error("Eski hikâye bağlantısı kaldı.");
      if(typeof value!=="string"||!value.startsWith(marker+uid+"/"))
       throw Error("Herkese açık medya kaldı; gizli hesaba geçilmedi.");
     }
    }
   }
  }
  const {data:pending,error:pendingError}=await admin.from("patiyiz_private_media_migration_manifest")
   .select("source_bucket,source_path").eq("user_id",uid).is("completed_at",null).limit(1000);
  if(pendingError)throw pendingError;
  for(const item of pending||[]){
   // Abort rather than remove files also linked by a separate public feature.
   const oldUrl=admin.storage.from(item.source_bucket).getPublicUrl(item.source_path).data.publicUrl;
   const [profile,pet,lost,adoption]=await Promise.all([
    admin.from("profiles").select("id").eq("avatar_url",oldUrl).limit(1),
    admin.from("pets").select("id").eq("photo_url",oldUrl).limit(1),
    admin.from("lost_reports").select("id").eq("photo_url",oldUrl).limit(1),
    admin.from("adoption_listings").select("id").eq("photo_url",oldUrl).limit(1)
   ]);
   if([profile,pet,lost,adoption].some(r=>r.error||(r.data||[]).length))
    throw Error("Bir dosya başka açık profilde kullanılıyor; taşıma güvenle bitirilemedi.");
   const {error:deleteError}=await admin.storage.from(item.source_bucket).remove([item.source_path]);
   if(deleteError)throw Error("Eski herkese açık dosya silinemedi.");
   const stillThere=await admin.storage.from(item.source_bucket).info(item.source_path);
   if(!stillThere.error&&stillThere.data)throw Error("Eski dosyanın silinmesi doğrulanamadı.");
   const {error:markError}=await admin.from("patiyiz_private_media_migration_manifest").update({completed_at:new Date().toISOString()})
    .eq("user_id",uid).eq("source_bucket",item.source_bucket).eq("source_path",item.source_path);
   if(markError)throw markError;
   filesRemoved++;
  }
  const {data:remaining,error:remainError}=await admin.from("patiyiz_private_media_migration_manifest")
   .select("source_path").eq("user_id",uid).is("completed_at",null).limit(1);
  if(remainError||(remaining||[]).length)throw Error("Eski dosya temizliği tamamlanmadı.");
  // Privacy flips only after old public files were removed. Existing cached copies may linger on external caches.
  const {data:profile,error:setError}=await admin.from("profiles").update({is_private:true}).eq("id",uid).select("id,is_private").single();
  if(setError||!profile?.is_private)throw Error("Hesap gizliye alınamadı.");
  return reply(200,{ok:true,private:true,filesCopied,filesRemoved,recordsChanged});
 }catch(err){
  return reply(409,{ok:false,error:"MIGRATION_INCOMPLETE",message:err instanceof Error?err.message:"Gizli hesap geçişi tamamlanamadı."});
 }
});
