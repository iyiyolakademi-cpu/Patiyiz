/* Pati Kimliği — owner-only UI. Messages use separate finder threads, not regular DMs. */
(function(global){
'use strict';
let api=null,owner='',selected='',state={loaded:false,busy:false,tags:[],threads:[],messages:[],token:'',tokenPet:''};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=token=>'https://patiyiz.com/pati-kimligi.html#'+token;
function ownPets(){return (api?.pets||[]).filter(p=>p.owner_id===owner)}
function currentPet(){return ownPets().find(p=>p.id===selected)}
function tag(){return state.tags.find(t=>t.pet_id===selected)}
function active(){return !!api?.main?.querySelector('#pati-identity-root')}
function flash(message,bad){if(api?.notify)api.notify(message,!!bad);else global.alert(message)}
async function invoke(action,extra={}){
 const {data,error}=await api.sb.functions.invoke('pati-identity',{body:{action,...extra}});
 if(error)throw new Error('Pati Kimliği sunucusuna ulaşılamadı. Servis henüz kurulmamış olabilir.');
 if(!data?.ok)throw new Error(data?.error||'İşlem tamamlanamadı.');
 return data;
}
function drawQr(){
 const target=document.getElementById('pati-identity-qr');
 if(!target||!state.token||!global.QRCode)return;
 target.replaceChildren();
 new global.QRCode(target,{text:link(state.token),width:190,height:190,colorDark:'#141619',colorLight:'#ffffff',correctLevel:global.QRCode.CorrectLevel.M});
}
function render(){
 if(!api?.main)return;
 const pets=ownPets(),p=currentPet(),t=tag();
 const received=(state.threads||[]).filter(x=>state.tags.some(t=>t.id===x.tag_id&&t.pet_id===selected));
 const rows=received.map(th=>{
   const msgs=state.messages.filter(m=>m.thread_id===th.id);
   return '<article class="pati-identity-thread"><div class="pati-identity-thread-head"><strong>Bulunma bildirimi</strong><small>'+esc(new Date(th.created_at).toLocaleString('tr-TR'))+'</small></div>'+
   '<div class="pati-identity-thread-messages">'+msgs.map(m=>'<p class="'+(m.sender==='owner'?'mine':'')+'"><b>'+(m.sender==='owner'?'Sen':'Bulan kişi')+': </b>'+esc(m.body)+'</p>').join('')+'</div>'+
   (th.status==='open'?'<form class="pati-identity-reply" data-thread="'+esc(th.id)+'"><label>Güvenli yanıt<input name="message" maxlength="1000" required placeholder="Mesajını yaz"></label><button type="submit">Gönder</button></form><button type="button" data-pk-act="close" data-id="'+esc(th.id)+'">Görüşmeyi kapat</button>':'<small>Görüşme kapatıldı.</small>')+
   '</article>';
 }).join('');
 api.main.innerHTML='<section id="pati-identity-root" class="pati-identity-owner">'+
  '<header class="pati-identity-top"><div><small>PATİYİZ · HAYVANIM</small><h1>Pati Kimliği</h1><p>Dostunun QR kimliğini güvenle yönet.</p></div><button type="button" data-view="my-pet">← Hayvanım</button></header>'+
  '<div class="pati-identity-panel"><label class="pati-identity-label" for="pati-identity-pet">Hayvan seç</label><select id="pati-identity-pet" '+(!pets.length?'disabled':'')+'>'+pets.map(p=>'<option value="'+esc(p.id)+'" '+(selected===p.id?'selected':'')+'>'+esc(p.name||'Patili dost')+'</option>').join('')+'</select>'+
  (!pets.length?'<p>Henüz hayvan kaydın yok. Önce Hayvanım bölümünden hayvan ekle.</p>':state.loaded?
   '<div class="pati-identity-hero"><span class="pati-identity-state '+(t?.enabled?'active':'')+'">'+(t?t.enabled?'Aktif kimlik':'Duraklatılmış':'Henüz QR yok')+'</span><h2>'+esc(p?.name||'Patili dost')+'</h2><p>QR okutulduğunda telefon veya e-posta adresin görünmez.</p></div>'+
   (state.token&&state.tokenPet===selected?'<div class="pati-identity-generated"><div id="pati-identity-qr" role="img" aria-label="Hayvanın Pati Kimliği QR kodu"></div><p>Bu QR kodunu şimdi indir veya bağlantısını kopyala. Güvenlik nedeniyle kodun kendisi sunucuda saklanmaz; yeniden oluşturursan eski QR geçersiz olur.</p><div class="pati-identity-actions"><button data-pk-act="download" type="button">QR indir</button><button data-pk-act="copy" type="button">Bağlantıyı kopyala</button></div></div>':'')+
   '<div class="pati-identity-actions">'+(t?'<button type="button" data-pk-act="rotate">'+(state.token?'QR yeniden oluştur':'Yeni QR üret')+'</button><button type="button" data-pk-act="toggle">'+(t.enabled?'Kimliği duraklat':'Kimliği etkinleştir')+'</button>':'<button type="button" data-pk-act="create">Pati Kimliği oluştur</button>')+
   '<button data-pk-act="refresh" type="button">Yenile</button></div>'+
   (t?'<form class="pati-identity-privacy"><strong>QR kartı gizliliği</strong><label><input type="checkbox" name="show_photo" '+(t.show_photo?'checked':'')+'> Hayvanın fotoğrafını göster</label><label>Bulana gösterilecek kısa not<input type="text" name="public_note" maxlength="200" value="'+esc(t.public_note||'')+'" placeholder="Örneğin: Sakin yaklaşın."></label><button type="submit">Gizlilik ayarlarını kaydet</button></form>':'')+
   '<p class="pati-identity-footnote">QR değiştirildiğinde eski basılı etiket çalışmaz. Bu ekran yalnızca hesap sahibine açıktır. QR notuna telefon veya ev adresi yazma.</p>':
   '<p role="status">Pati Kimliği bilgileri yükleniyor…</p>')+
   '</div><section class="pati-identity-inbox"><h2>Gelen QR bildirimleri</h2>'+
   (state.loaded?(rows||'<p>Henüz bu hayvan için güvenli iletişim kaydı yok.</p>'):'<p>Bildirimler yükleniyor…</p>')+
   '</section></section>';
 drawQr();
}
async function refresh(){
 if(!api||state.busy)return;
 state.busy=true;
 try {
  const res=await invoke('owner-list');
  if(api?.me?.id!==owner)return;
  state.tags=res.tags||[];state.threads=res.threads||[];state.messages=res.messages||[];
  state.loaded=true;
 }catch(e){state.loaded=true;flash(e.message,true)}
 finally{state.busy=false;if(api?.me?.id===owner&&active())render()}
}
function download(){
 const holder=document.getElementById('pati-identity-qr');
 const canvas=holder?.querySelector('canvas'),image=holder?.querySelector('img');
 const uri=canvas?.toDataURL('image/png')||image?.src;
 if(!uri)return flash('QR henüz hazırlanmadı. Bağlantıyı kopyalayabilirsin.',true);
 const a=document.createElement('a');a.href=uri;a.download='Patiyiz-'+(currentPet()?.name||'pati')+'-QR.png';a.click();
}
async function act(name,id){
 if(state.busy)return;
 try{
  if(name==='download')return download();
  if(name==='copy'){
   if(!state.token)throw Error('Önce QR oluştur.');
   await navigator.clipboard.writeText(link(state.token));return flash('Pati Kimliği bağlantısı kopyalandı.');
  }
  if(name==='refresh')return void refresh();
  if(name==='rotate'&&!confirm('Yeni QR oluşturulursa eski tasma etiketinin QR kodu çalışmayacak. Devam edilsin mi?'))return;
  state.busy=true;
  if(name==='create'||name==='rotate'){
   const res=await invoke('owner-create',{petId:selected});
   state.token=res.token;state.tokenPet=selected;flash('QR oluşturuldu. Etiketini şimdi kaydet.');
  }else if(name==='toggle'){
   const t=tag();await invoke('owner-toggle',{tagId:t.id,enabled:!t.enabled});state.token='';state.tokenPet='';
  }else if(name==='close'){
   await invoke('owner-close',{threadId:id});
  }
 }catch(e){flash(e.message,true)}
 finally{state.busy=false;if(api)void refresh()}
}
function mount(context){
 if(!context?.me||!context.sb||!context.main)return;
 api=context;
 if(owner!==context.me.id){owner=context.me.id;selected='';state={loaded:false,busy:false,tags:[],threads:[],messages:[],token:'',tokenPet:''}}
 if(!ownPets().some(p=>p.id===selected))selected=ownPets()[0]?.id||'';
 if(!context.main.__patiIdentityBound){
  context.main.__patiIdentityBound=true;
  context.main.addEventListener('click',e=>{
   const btn=e.target.closest('[data-pk-act]');if(!btn||!btn.closest('#pati-identity-root'))return;
   e.preventDefault();e.stopPropagation();
   void act(btn.dataset.pkAct,btn.dataset.id);
  },true);
  context.main.addEventListener('change',e=>{
   if(e.target?.id!=='pati-identity-pet')return;
   selected=e.target.value;render();
  },true);
  context.main.addEventListener('submit',e=>{
   const form=e.target;
   if(form.matches?.('.pati-identity-privacy')){
    e.preventDefault();e.stopPropagation();
    const t=tag();if(!t)return;
    const input=form.querySelector('[name="public_note"]')?.value.trim()||'';
    const show_photo=!!form.querySelector('[name="show_photo"]')?.checked;
    state.busy=true;
    void invoke('owner-settings',{tagId:t.id,show_photo,public_note:input}).then(()=>flash('QR kartı ayarları kaydedildi.')).catch(error=>flash(error.message,true)).finally(()=>{state.busy=false;void refresh()});
    return;
   }
   if(!form.matches?.('.pati-identity-reply'))return;
   e.preventDefault();e.stopPropagation();
   const message=form.querySelector('[name="message"]')?.value.trim();
   if(!message)return;
   state.busy=true;
   void invoke('owner-reply',{threadId:form.dataset.thread,message}).then(()=>{flash('Yanıt kaydedildi.')}).catch(error=>flash(error.message,true)).finally(()=>{state.busy=false;void refresh()});
  },true);
 }
 render();
 if(!state.loaded&&!state.busy)void refresh();
}
global.PatiyizPatiIdentity=Object.freeze({mount});
})(window);
