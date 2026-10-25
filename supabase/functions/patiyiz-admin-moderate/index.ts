import {createClient} from "npm:@supabase/supabase-js@2";
const allowedOrigins=new Set(["https://patiyiz.com","https://www.patiyiz.com","https://iyiyolakademi-cpu.github.io"]);
Deno.serve(async req=>{
 const origin=req.headers.get("origin");
 if(origin&&!allowedOrigins.has(origin))return new Response(JSON.stringify({message:"Origin not allowed"}),{status:403,headers:{"content-type":"application/json","vary":"Origin"}});
 const cors={"access-control-allow-origin":origin||"https://patiyiz.com","access-control-allow-headers":"authorization,apikey,content-type,x-client-info,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version","access-control-allow-methods":"POST,OPTIONS","content-type":"application/json","vary":"Origin"};
 const respond=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:cors});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return respond(405,"Method not allowed");
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return respond(401,"Oturum gerekli.");
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),role=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!role)return respond(503,"Server secrets missing");
 const actor=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
 const {data:auth,error:authError}=await actor.auth.getUser();
 if(authError||!auth.user)return respond(401,"Oturum doğrulanamadı.");
 const {data:isAdmin,error:checkError}=await actor.rpc("patiyiz_is_admin");
 if(checkError||isAdmin!==true)return respond(403,"Yönetici yetkisi gerekli.");
 let input:any;try{input=await req.json()}catch{return respond(400,"Invalid JSON")}
 const action=input?.action,kind=input?.kind,id=input?.id;
 if(!["delete","resolved","dismissed"].includes(action)||!["report","post","question","comment","lost","adoption","voice_comment","story"].includes(kind)||typeof id!=="string"||!/^[a-f0-9-]{36}$/i.test(id))return respond(400,"Invalid parameters");
 const service=createClient(url,role,{auth:{persistSession:false}});
 // Media records may reference multiple images and video covers. Only ever
 // delete objects that belong to the actual owner of the moderated row.
 const spec:any={
  post:{table:"posts",owner:"author_id",columns:"author_id,image_url,images,video_url,video_cover_url"},
  story:{table:"patiyiz_stories",owner:"author_id",columns:"author_id,image_url"},
  lost:{table:"lost_reports",owner:"owner_id",columns:"owner_id,photo_url"},
  adoption:{table:"adoption_listings",owner:"owner_id",columns:"owner_id,photo_url"},
  voice_comment:{table:"patiyiz_voice_comments",owner:"author_id",columns:"author_id,audio_path"}
 };
 const removals=new Map<string,{bucket:string,path:string}>();
 if(action==="delete"&&spec[kind]){
  const item=spec[kind];
  const record=await service.from(item.table).select(item.columns).eq("id",id).maybeSingle();
  if(record.error)return respond(503,"İçerik dosyaları kontrol edilemedi.");
  const row:any=record.data;
  if(row){
   const owner=String(row[item.owner]||"").toLowerCase();
   const refs:[unknown,string][]=[];
   if(kind==="post"){
    refs.push([row.image_url,"patiyiz-media"]);
    if(Array.isArray(row.images))for(const v of row.images)refs.push([v,"patiyiz-media"]);
    refs.push([row.video_url,"patiyiz-videos"],[row.video_cover_url,"patiyiz-media"]);
   }else if(kind==="voice_comment")refs.push([row.audio_path,"patiyiz-voice-comments"]);
   else refs.push([row[kind==="story"?"image_url":"photo_url"],"patiyiz-media"]);
   const storageOrigin=new URL(url).origin;
   for(const [value,bucket] of refs){
    if(typeof value!=="string"||!value)continue;
    let path=value;
    if(/^https?:\\/\\//i.test(value)){
     try{
      const candidate=new URL(value);
      const publicPrefix="/storage/v1/object/public/"+bucket+"/";
      if(candidate.origin!==storageOrigin||!candidate.pathname.startsWith(publicPrefix))continue;
      path=decodeURIComponent(candidate.pathname.slice(publicPrefix.length));
     }catch{continue}
    }
    // Protect files owned by other users even if a content row contains a forged URL.
    if(!/^[0-9a-f-]{36}$/.test(owner)||!path.toLowerCase().startsWith(owner+"/"))continue;
    if(!/^[0-9a-f-]{36}\\/[a-z0-9._-]{1,220}\\.(jpg|jpeg|png|webp|gif|mp4|mov|webm|m4a|ogg|aac|mp3)$/i.test(path))continue;
    if(path.includes(".."))continue;
    removals.set(bucket+":"+path,{bucket,path});
   }
  }
 }
 const result=await actor.rpc("patiyiz_admin_moderate",{p_action:action,p_kind:kind,p_id:id});
 if(result.error)return respond(403,"İşlem başarısız: "+result.error.message);
 let cleanupError=false;
 for(const file of removals.values()){const {error}=await service.storage.from(file.bucket).remove([file.path]);if(error){cleanupError=true;console.error("Moderation storage cleanup error",file.bucket,file.path,error.message)}}
 return respond(200,cleanupError?"İçerik kaldırıldı, ancak bazı medya dosyaları temizlenemedi.":"İşlem tamamlandı.");
});