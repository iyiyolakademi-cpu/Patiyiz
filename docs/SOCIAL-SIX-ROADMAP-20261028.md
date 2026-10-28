# Patiyiz — Seçilen Altı Sosyal Özellik | Güvenli Geliştirme Planı
Tarih: 28 Ekim 2026

## Mevcut kod incelemesi
| Özellik | Mevcut durum | Sonraki iş |
|---|---|---|
| Yeniden paylaş (Repost) | `patiToggleRepost`, `patiyiz_reposts`, feed/profile entegrasyonu mevcut | Yetki/tekrar tıklama, engellenen kullanıcı ve sıralama testleri |
| Profilde sabitleme | `patiTogglePin`, `patiyiz_post_pins`, en fazla 3 kayıt ve sıralama mevcut | Mobil sabit simgesi ve eşzamanlı sınır testi |
| Mesaj emoji tepkisi | `patiDmOpenReactionPicker`, `patiDmSetReaction`, SQL RLS ve gösterim mevcut | Realtime/çoklu cihaz ve mesaj silme testleri |
| Hikâyeye gönderi ekleme | `patiSharePostToStory`, `shared_post_id`, yönlendirme mevcut | Orijinal gönderi silinmesi/gizlenmesi, telif ve blok testleri |
| Yakın arkadaşlar | Tam görünür akış yok | Yalnızca sahibi yönetilen liste, paylaşım seçici, hikâye SELECT RLS, geçmiş görünürlüğü |
| Grup sohbetleri | Ayrı grup akışı yok | Atomik oluşturma, üyelik, güvenli mesajlaşma, davet/çıkarma, okundu, bildirim ve moderasyon |

## 1. Aşama — Veritabanı temeli (bu dal)
- `supabase/patiyiz-close-friends-group-chat-foundation-20261028.sql`: bağımsız tablolar, sahiplik/üyelik kontrolleri ve grup oluşturma RPC'si.
- **Henüz canlı Supabase'e uygulanmadı.** Mevcut DM tablosu, hikâyeler veya gönderilere dokunulmadı.
- Bu temel tek başına özellikleri kullanıcıya açmaz; kullanıcı ekranları henüz yoktur.

## 2. Aşama — Yakın Arkadaşlar
1. Profil menüsünde “Yakın Arkadaşlar” yönetimi: arama, ekle/çıkar, seçilen kişi sayısı; engellenmiş hesapları ele.
2. Hikâye oluştururken “Herkes” / “Yakın Arkadaşlar” seçimi.
3. Hikâye tablosuna varsayılan `public` olan `audience` alanı ekle; mevcut kayıtların anlamını değiştirme.
4. **Önce** veritabanı SELECT/INSERT/UPDATE RLS ve medya erişimini doğrula; özel hikâyeyi yalnızca JS ile gizleme güvenli değildir. Mevcut herkese açık storage bucket'ındaki URL'lerin paylaşılarak erişilebilir olması ayrıca giderilmeli.
5. Yeşil halka yalnızca yetkili izleyicide; takip, engelleme, gizleme ve 24 saat dolma testleri.

## 3. Aşama — Grup sohbetleri
1. Mesajlarda “Yeni grup” akışı, başlık, üyeler ve grup yöneticisi.
2. Üyeleri yalnızca doğrulanan grup yöneticisi ekleyebilir/çıkarabilir; ayrılan üye artık mesajları okuyamaz.
3. Ayrı tablolarla metin mesajları; ardından uygun saklama politikasına sahip özel ek dosyalar.
4. Grup listeleme, son mesaj, okunmamış sayaç, gerçek zamanlı abonelik, silme/gizleme, raporlama.
5. 1-1 DM ekranına, mevcut özel mesaj RLS kurallarına veya mesaj geçmişine müdahale etme.

## Kabul ve yayına alma kriterleri
- Eski 1-1 DM, fotoğraf, ses, emoji, Reels, hikâye ve profil testleri geçmeli.
- RLS: üye olmayan grup mesajı okuyamaz; yakın arkadaş listesi sahibi dışında okunamaz; gruptan çıkan erişemez.
- Android/iOS/masaüstü küçük ekran testleri ve klavye/geri tuşu testleri.
- Tam migration incelemesi, yalnızca doğru Supabase projesine kontrollü uygulama.
- Özellikler ayrı PR ve aşamalı yayınla açılmalı; başarısız migration'da mevcut ürün çalışmaya devam etmeli.
