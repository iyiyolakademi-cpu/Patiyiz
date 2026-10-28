# Patiyiz · Seçilen 6 Instagram özelliği — uygulama planı
Tarih: 28 Ekim 2026

## İlk aşama — geliştirme dalında uygulanıyor
1. **Yeniden paylaş (Repost):** Var olan `patiyiz_reposts` tablosu kullanıldı. Başkasının fotoğraf/video/yazı gönderisini yeniden paylaşma ve geri alma; profilde yeni Repost sekmesi; Takip Edilenler akışında yeniden paylaşan kullanıcının adı. Orijinal gönderinin sahibi, beğenileri ve yorumları değişmez. Kişinin kendi gönderisi yeniden paylaşılamaz.
2. **Profilde gönderi sabitleme:** Var olan `patiyiz_post_pins` tablosu kullanıldı. Profilde en fazla üç kendi gönderisini sabitleme/kaldırma; sabitli içeriklerin diğer içeriklerden önce görünmesi. Sıra ve limit veritabanı politikasında da korunur.
3. **Özel mesajlara emoji tepkisi:** Altı emoji; mesajın altında özet ve emoji seçim penceresi. `patiyiz_dm_reactions` tablosu yalnızca mevcut mesajın alıcı/göndericisine okunur; sadece kendi tepkisini yazabilir/silebilir. Her kişi/mesaj için bir tepki saklanır.
4. **Gönderiyi hikâyeye ekleme:** Gönderi seçeneklerinden 24 saatlik hikâye oluşturulur, asıl kullanıcıya atıf ve orijinal gönderiye dönüş bağlantısı bulunur. Var olan medyayı yeniden yüklemez; `patiyiz_stories.shared_post_id` isteğe bağlı alanı kullanır. Başka hesaplar engelliyse paylaşım yapılmaz.

### Entegrasyon kabul ölçütleri
- Mevcut gönderi beğenileri, yorumlar, kaydetmeler, mesaj silme, fotoğraf açma ve hikâye oluşturma akışları çalışmaya devam eder.
- Yeni özelliklerin hiçbirisi mevcut PatiCoin kurallarına otomatik ödül kazandırmaz; suistimali önler.
- Repost/Pin ilk açılış sorgu kümesine alınmaz; arka planda yüklenir, önbellek hızlı açılır.
- Her dört özellik için oturum, sahiplik ve kaydın bulunmaması durumları güvenli biçimde ele alınır; otomatik testler çalıştırılır.
- Android Capacitor paketine stil dosyaları eklenir ve gerçek cihazda ayrıca doğrulanır.

## İkinci aşama — henüz etkin değil
5. **Yakın arkadaşlar:**
   - Kullanıcının yakın arkadaş listesini ekleme, çıkarma ve yönetme.
   - Hikâyeyi herkese veya yakın arkadaşlara özel oluşturma seçimi.
   - **Kritik güvenlik şartı:** Yalnızca ekrandaki halkayı gizlemek yeterli değildir. `patiyiz_stories` SELECT RLS, hikâye yanıtları, beğeniler, görüntüleyenler, kalıcı hikâyeler ve paylaşılan medya erişimi birlikte sınırlandırılmalı; fotoğraf/video depolaması özel bucket ve süreli bağlantıyla korunmalıdır. Halihazırda açık medya URL'sini yakın arkadaşlara özel içerik olarak etiketlemeyeceğiz.
   - Test: yakın arkadaş olmayan ikinci bir hesap özel hikâyenin içerik ve medya URL'sini sorgulayamaz; listeden çıkarıldıktan sonra erişemez.

6. **Grup sohbetleri:**
   - Mevcut bire bir mesaj tablolarını değiştirmeyen ayrı `groups`, `group_members` ve `group_messages` veri yapısı.
   - Grup oluşturma, üye daveti/onayı, isim/fotoğraf, çıkma, yönetici yetkileri, üye çıkarma, mesaj/medya gönderme, emoji tepkileri ve bildirimler.
   - **Kritik güvenlik şartı:** Sadece üyeler mesaj okuyabilmeli; çıkarılan üye yeni mesaj ve medyaya erişememeli, üyelik değişimleri kayıtlara tutarlı yansımalıdır. Özel mesajlarda kullanılan global silme ve tek hesap gizleme kuralı grup sohbetine gelişigüzel kopyalanmamalıdır.
   - Test: üyelik, davet, çıkış, engelleme, eski/yeni mesaj yetkisi, iOS/Android klavye ve mesaj sırası.

## Yayınlama kapıları
- [ ] GitHub kalite testleri başarılı
- [ ] Supabase yeni tablo ve sütunların doğrulanması
- [ ] Android QA derlemesi ve iPhone/Android manuel testleri
- [ ] Repost ve sabitleme çift hesaplı canlı doğrulama
- [ ] Emoji tepkisinin kullanıcılar arasında görünmesi
- [ ] Hikâyeden gönderi açma; silinen gönderi ve engellenmiş kullanıcı durumları
- [ ] Yakın arkadaşlar ve gruplar için ayrıca gizlilik denetimi; ikinci aşama hazır olmadan canlıya çıkmaz
