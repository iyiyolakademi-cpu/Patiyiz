import {createClient} from "npm:@supabase/supabase-js@2";
const cors={"access-control-allow-origin":"https://iyiyolakademi-cpu.github.io","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS","content-type":"application/json"};
const respond=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:cors});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return respond(405,"Method not allowed");
 if(req.headers.get("origin")&&req.headers.get("origin")!=="https://iyiyolakademi-cpu.github.io")return respond(403,"Origin not allowed");
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
 const spec:any={post:["posts","image_url","patiyiz-media"],lost:["lost_reports","photo_url","patiyiz-media"],adoption:["adoption_listings","photo_url","patiyiz-media"],story:["patiyiz_stories","image_url","patiyiz-media"],voice_comment:["patiyiz_voice_comments","audio_path","patiyiz-voice-comments"]};
 let removePaths:{bucket:string,path:string}[]=[];
 if(action==="delete"&&spec[kind]){
  const [table,col,bucket]=spec[kind];
  const columns=kind==="post"?"image_url,video_url":col;
  const record=await service.from(table).select(columns).eq("id",id).maybeSingle();
  if(record.error)return respond(503,"İçerik dosyaları kontrol edilemedi.");
  const refs=kind==="post"?[[record.data?.image_url,"patiyiz-media"],[record.data?.video_url,"patiyiz-videos"]]:[[record.data?.[col],bucket]];
  for(const [value,b] of refs){if(typeof value!=="string"||!value)continue;let path=value;
   if(/^https?:\/\//.test(value)){try{const u=new URL(value);const prefix="/storage/v1/object/public/"+b+"/";const at=u.pathname.indexOf(prefix);if(at<0)continue;path=decodeURIComponent(u.pathname.slice(at+prefix.length));}catch{continue}}
   if(/^[a-f0-9-]{36}\/[a-f0-9-]+\.(jpg|jpeg|png|webp|mp4|mov|webm|m4a|ogg|aac|mp3)$/i.test(path))removePaths.push({bucket:b,path});
  }
 }
 const result=await actor.rpc("patiyiz_admin_moderate",{p_action:action,p_kind:kind,p_id:id});
 if(result.error)return respond(403,"İşlem başarısız: "+result.error.message);
 let cleanupError=false;
 for(const file of removePaths){const {error}=await service.storage.from(file.bucket).remove([file.path]);if(error){cleanupError=true;console.error("Moderation storage cleanup error",file.bucket,file.path,error.message)}}
 return respond(200,cleanupError?"İçerik kaldırıldı, ancak bazı medya dosyaları temizlenemedi.":"İşlem tamamlandı.");
});