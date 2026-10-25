import { createClient } from "npm:@supabase/supabase-js@2";
const allowedOrigins=new Set(["https://patiyiz.com","https://www.patiyiz.com","https://iyiyolakademi-cpu.github.io"]);
Deno.serve(async req=>{
 const origin=req.headers.get("origin");
 if(origin&&!allowedOrigins.has(origin))return new Response(JSON.stringify({message:"Origin not allowed"}),{status:403,headers:{"content-type":"application/json","vary":"Origin"}});
 const headers={"content-type":"application/json","access-control-allow-origin":origin||"https://patiyiz.com","access-control-allow-headers":"authorization,apikey,content-type,x-client-info,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version","access-control-allow-methods":"POST,OPTIONS","vary":"Origin"};
 const answer=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return answer(405,"Method not allowed");
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return answer(401,"Oturum gerekli.");
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 if(!url||!anon||!service)return answer(503,"Servis hazır değil.");
 const userClient=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}}});
 const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:verified,error:authError}=await userClient.auth.getUser();
 if(authError||!verified.user)return answer(401,"Oturum doğrulanamadı.");
 const uid=verified.user.id;
 const {data:adminRecord,error:adminError}=await admin.from("patiyiz_admins").select("user_id").eq("user_id",uid).maybeSingle();
 if(adminError)return answer(503,"Yetki kontrolü tamamlanamadı.");
 if(adminRecord)return answer(403,"Yönetici hesabını bu ekrandan silemezsin.");
 let json:any;try{json=await req.json()}catch{return answer(400,"Geçersiz istek.")}
 if(json?.confirmation!=="HESABIMI SIL"||typeof json.password!=="string"||json.password.length<1)return answer(400,"Hesap silme onayı ve mevcut şifren gerekli.");
 if(!verified.user.email)return answer(400,"Bu hesap için doğrulama yapılamıyor.");
 const passwordClient=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:passwordCheck,error:passwordError}=await passwordClient.auth.signInWithPassword({email:verified.user.email,password:json.password});
 if(passwordError||passwordCheck.user?.id!==uid)return answer(403,"Şifren doğrulanamadı. Hesap silinmedi.");
 // Clean up owned files using Storage API, not direct storage.objects SQL.
 // Include private chat uploads authored by this user; never leave sensitive attachments orphaned.
 for(const bucket of ["patiyiz-media","patiyiz-voice-comments","patiyiz-videos","patiyiz-private-messages"]){
  for(let page=0;page<300;page++){
   const {data:objects,error:listingError}=await admin.storage.from(bucket).list(uid,{limit:100,offset:0});
   if(listingError)return answer(503,"Dosyalar listelenemedi; hesap silinmedi.");
   if(!objects?.length)break;
   const paths=objects.filter(o=>o.name&&o.id).map(o=>uid+"/"+o.name);
   if(!paths.length)return answer(503,"Dosya temizleme doğrulanamadı; hesap silinmedi.");
   const {error:removeError}=await admin.storage.from(bucket).remove(paths);
   if(removeError)return answer(503,"Dosyalar silinemedi; hesap silinmedi.");
   if(objects.length<100)break;
   if(page===299)return answer(503,"Dosya temizleme sınırına ulaşıldı; hesap silinmedi.");
  }
 }
 // Health records are nested in owner/pet/document; delete PRIVATE objects before auth user cascade.
 const healthBucket="patiyiz-health-private";
 for(let batch=0;batch<300;batch++){
  const {data:folders,error:folderError}=await admin.storage.from(healthBucket).list(uid,{limit:100,offset:0});
  if(folderError)return answer(503,"Özel sağlık belgeleri listelenemedi; hesap silinmedi.");
  if(!folders?.length)break;
  for(const folder of folders){
   const prefix=uid+"/"+folder.name;
   if(folder.id){
    const {error:removeError}=await admin.storage.from(healthBucket).remove([prefix]);
    if(removeError)return answer(503,"Özel sağlık belgesi silinemedi; hesap silinmedi.");
    continue;
   }
   for(let page=0;page<300;page++){
    const {data:entries,error:listError}=await admin.storage.from(healthBucket).list(prefix,{limit:100,offset:0});
    if(listError)return answer(503,"Özel sağlık belgeleri listelenemedi; hesap silinmedi.");
    if(!entries?.length)break;
    const paths=entries.filter(o=>o.id&&o.name).map(o=>prefix+"/"+o.name);
    if(!paths.length)return answer(503,"Özel sağlık belgelerinin temizlenmesi doğrulanamadı; hesap silinmedi.");
    const {error:removeError}=await admin.storage.from(healthBucket).remove(paths);
    if(removeError)return answer(503,"Özel sağlık belgeleri silinemedi; hesap silinmedi.");
    if(entries.length<100)break;
    if(page===299)return answer(503,"Özel sağlık belgesi sayfa sınırına ulaşıldı; hesap silinmedi.");
   }
  }
  if(folders.length<100)break;
  if(batch===299)return answer(503,"Özel sağlık dosyası temizleme sınırına ulaşıldı; hesap silinmedi.");
 }
 const {error:deleteError}=await admin.auth.admin.deleteUser(uid);
 if(deleteError){console.error("Delete user failed",deleteError.message);return answer(503,"Hesap silinemedi, lütfen yeniden dene.");}
 return answer(200,"Hesabın ve ona bağlı veriler silindi.");
});
