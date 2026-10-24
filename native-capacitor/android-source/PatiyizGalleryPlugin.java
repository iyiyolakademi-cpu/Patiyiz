package com.patiyiz.app;

import android.Manifest;
import android.content.ContentUris;
import android.content.ContentResolver;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Size;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;
import com.getcapacitor.PluginMethod;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name="PatiyizGallery", permissions={
 @Permission(alias="galleryImages", strings={Manifest.permission.READ_MEDIA_IMAGES}),
 @Permission(alias="galleryPartial", strings={Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED}),
 @Permission(alias="galleryLegacy", strings={Manifest.permission.READ_EXTERNAL_STORAGE}),
 @Permission(alias="camera", strings={Manifest.permission.CAMERA})
})
public class PatiyizGalleryPlugin extends Plugin {
 private boolean galleryAllowed(){
  if(Build.VERSION.SDK_INT>=34)return getPermissionState("galleryImages")==PermissionState.GRANTED || getPermissionState("galleryPartial")==PermissionState.GRANTED;
  if(Build.VERSION.SDK_INT>=33)return getPermissionState("galleryImages")==PermissionState.GRANTED;
  return getPermissionState("galleryLegacy")==PermissionState.GRANTED;
 }
 @PluginMethod
 public void getPhotos(PluginCall call){
  if(!galleryAllowed()){
   if(call.getBoolean("previewOnly",false)){JSObject preview=new JSObject();preview.put("photos",new JSArray());preview.put("hasMore",false);call.resolve(preview);return;}
   if(Build.VERSION.SDK_INT>=34) requestPermissionForAliases(new String[]{"galleryImages","galleryPartial"},call,"galleryReady");
   else requestPermissionForAlias(Build.VERSION.SDK_INT>=33?"galleryImages":"galleryLegacy",call,"galleryReady");
   return;
  }
  queryPhotos(call);
 }
 @PermissionCallback
 private void galleryReady(PluginCall call){
  if(galleryAllowed())queryPhotos(call);
  else call.reject("Galeri izni verilmedi. Sistem fotoğraf seçicisini kullanabilirsin.");
 }
 private void queryPhotos(PluginCall call){
  int offset=Math.max(0,Math.min(10000,call.getInt("offset",0)));
  int limit=Math.max(1,Math.min(48,call.getInt("limit",36)));
  JSArray entries=new JSArray();
  ContentResolver resolver=getContext().getContentResolver();
  String[] fields={MediaStore.Images.Media._ID,MediaStore.Images.Media.DATE_ADDED};
  try(Cursor cursor=resolver.query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,fields,null,null,MediaStore.Images.Media.DATE_ADDED+" DESC")){
   if(cursor!=null&&(offset==0||cursor.moveToPosition(offset-1))){
    int count=0;
    while(cursor.moveToNext()&&count<limit){
     long id=cursor.getLong(0);
     android.net.Uri uri=ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,id);
     try{
      Bitmap bmp;
      if(Build.VERSION.SDK_INT>=29) bmp=resolver.loadThumbnail(uri,new Size(165,165),null);
      else bmp=MediaStore.Images.Thumbnails.getThumbnail(resolver,id,MediaStore.Images.Thumbnails.MINI_KIND,null);
      if(bmp==null)continue;
      ByteArrayOutputStream out=new ByteArrayOutputStream();
      bmp.compress(Bitmap.CompressFormat.JPEG,65,out);
      JSObject item=new JSObject();
      item.put("id",String.valueOf(id)); item.put("thumbnail","data:image/jpeg;base64,"+Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP));
      entries.put(item);count++;
      if(bmp.getWidth()>200||bmp.getHeight()>200)bmp.recycle();
     }catch(Exception ignored){/* A damaged image must not hide other images. */}
    }
   }
  }catch(SecurityException e){call.reject("Fotoğraflara erişim izni gerekli.");return;}
   catch(Exception e){call.reject("Galeri okunamadı: "+e.getClass().getSimpleName());return;}
  JSObject result=new JSObject();result.put("photos",entries);result.put("offset",offset);result.put("hasMore",entries.length()>=limit);
  call.resolve(result);
 }
 @PluginMethod
 public void readPhoto(PluginCall call){
  if(!galleryAllowed()){call.reject("Galeri izni gerekli.");return;}
  String key=call.getString("id","");
  if(!key.matches("[0-9]{1,18}")){call.reject("Geçersiz fotoğraf kimliği.");return;}
  try{
   long id=Long.parseLong(key);
   android.net.Uri uri=ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,id);
   ContentResolver resolver=getContext().getContentResolver();
   BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;
   try(InputStream in=resolver.openInputStream(uri)){if(in==null)throw new Exception("Fotoğraf bulunamadı.");BitmapFactory.decodeStream(in,null,bounds);}
   if(bounds.outWidth<=0||bounds.outHeight<=0)throw new Exception("Fotoğraf çözümlenemedi.");
   BitmapFactory.Options opt=new BitmapFactory.Options();
   int scale=1;while(bounds.outWidth/scale>2048||bounds.outHeight/scale>2048)scale*=2;
   opt.inSampleSize=scale;
   Bitmap bitmap;
   try(InputStream in=resolver.openInputStream(uri)){bitmap=BitmapFactory.decodeStream(in,null,opt);}
   if(bitmap==null)throw new Exception("Fotoğraf açılamadı.");
   ByteArrayOutputStream out=new ByteArrayOutputStream();
   if(!bitmap.compress(Bitmap.CompressFormat.JPEG,85,out))throw new Exception("Fotoğraf dönüştürülemedi.");
   JSObject result=new JSObject();result.put("base64",Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP));
   result.put("mimeType","image/jpeg");result.put("name","patiyiz-"+key+".jpg");call.resolve(result);
   bitmap.recycle();
  }catch(SecurityException e){call.reject("Bu fotoğrafa erişim izni verilmedi.");}
   catch(Exception e){call.reject("Fotoğraf yüklenemedi: "+e.getMessage());}
 }
 @PluginMethod
 public void ensureCamera(PluginCall call){
  if(getPermissionState("camera")==PermissionState.GRANTED){call.resolve();return;}
  requestPermissionForAlias("camera",call,"cameraReady");
 }
 @PermissionCallback
 private void cameraReady(PluginCall call){
  if(getPermissionState("camera")==PermissionState.GRANTED)call.resolve();
  else call.reject("Kamera izni verilmedi.");
 }
}
