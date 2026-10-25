# Patiyiz — 15. Aşama / Genel Kalite ve Yayın Hazırlığı

Tarih: 25 Ekim 2026

## İncelenen kapsam

Önceki geliştirme bölümlerinin yanında, masaüstü menüsündeki aşağıdaki beş ekran da yayın öncesi kalite kapsamına dahildir:

1. **Rozetler & Belgeler:** ücretsiz ders ve Premium ilerlemesi, belge kazanma koşulları, yazdırma/PDF.
2. **Mesajlar:** gelen kutusu, konuşmalar, istekler, okundu bilgisi, fotoğraf/ses, canlı mesajlar ve sayaç.
3. **Bildirimler:** okunmamış sayaçları, takip, beğeni, yorum, mesaj, bakım ve Web Push.
4. **Profilim:** kendi profilini açma, diğer kullanıcı profillerinden dönüş, takipler, profili düzenleme, gönderi/hikâyeler.
5. **Ayarlar ve Gizlilik:** tema, görüldü tercihi, şifre, bildirim izinleri, engelleme, hukuki metinler ve hesap silme.

Ek denetimler: Sağlık Dosyası mobil menü erişimi, ekranlar arası yönlendirme, mobil menü sayaç yerleşimi, PWA manifesti, Supabase RLS durumu ve mevcut regresyon testleri.

## Bu değişiklikte uygulananlar

- Mobil **Tüm Özellikler** menüsüne eksik **Profilim** ve **Sağlık Dosyası** bağlantıları eklendi.
- Menü ve masaüstü menüde **Mesajlar/Bildirimler** sayacı, seçili sekme ve erişilebilir etiketler düzenlendi.
- Ayarlar'daki yinelenen bildirim aç/kapat düğmeleri yerine cihaz aboneliğini gerçekten kontrol eden **Bildirim Merkezi**'ne bağlantı eklendi.
- Rozetlerde hesap ilerlemesi doğrulanmadan kazanıldı durumu gösterilmemesi sağlandı.
- Premium eğitim belgelerinde yalnızca ilgili programın geçerli günlerinin (1…N) tamamlanmış olmasına bakılması sağlandı.
- Gizlilik Politikası ve Kullanım Şartları'nın yeşil renkleri siyah-beyaz kimlikle eşleştirildi; **hukuki metinleri değiştirmeden**.
- Beş ekranın yönlendirme ve işlevlerinin korunmasına ilişkin otomatik regresyon testleri eklendi.

## Otomatik doğrulama

- GitHub Actions kalite/test akışı sonuçları esas alınır. Test geçmesi **gerçek cihaz ve mağaza incelemesinin tamamlandığı anlamına gelmez**.
- Supabase'de mesaj, bildirim, profil, engelleme, Premium ilerleme ve sağlık belgeleri tabloları için **RLS etkin** olduğu okuma sorgusuyla doğrulandı. Her senaryonun ayrı bir gerçek kullanıcı hesabıyla uçtan uca sınanması yapılmadı.
- PWA manifesti `display: standalone` olarak ayarlanmış ve 192/512 piksel ikonları tanımlanmış durumda.

## Yayın kapıları — MANUEL TEST GEREKİYOR

| Alan | Deneme | Sonuç |
| --- | --- | --- |
| Android | İki farklı gerçek hesapla giriş, gönderi, takip, mesajlaşma, ses/fotoğraf, bildirim tıklaması | **DOĞRULANMADI** |
| iPhone | Safari/PWA veya natif uygulama, ekran güvenli alanları, kamera/galeri, klavye ve bildirim izinleri | **DOĞRULANMADI** |
| Rozetler & Belgeler | 0/101, ara eşikler, 101/101, Premium üyelik bitişi, PDF çıktısı | **DOĞRULANMADI** |
| Mesajlar | İki hesapla gerçek zamanlı iletim, görüntülendi, uzun basma/silme, resim/ses | **DOĞRULANMADI** |
| Bildirimler | Android/iPhone kilit ekranı push, kapalı uygulamada teslimat, izin iptali, yanlış hesaba gitmeme | **DOĞRULANMADI** |
| Profilim | Profil düzenleme, görsel yükleme, takipçi sayısı, 3 sütun keşfet, kullanıcıdan geri dönüş | **DOĞRULANMADI** |
| Ayarlar | Şifre değiştirme, oturumu kapatma, engelleme, hesap silme, aydınlatma/izinler | **DOĞRULANMADI** |
| Gizlilik Politikası | İşletmeci iletişim/veri sorumlusu bilgileri ve hukuki inceleme | **TAMAMLANMADI** |
| Kullanım Şartları | İşletmeci bilgileri ve yayın öncesi hukuk kontrolü | **TAMAMLANMADI** |
| Play Store | Güncel AAB, imza, uygulama adı/ikon/sürüm, mağaza içeriği, veri güvenliği formu ve test kanalı | **DOĞRULANMADI** |
| Performans | Android ve iPhone üzerinde düşük ağ hızında akış, görsel, Reels ve DM yükleme süresi | **DOĞRULANMADI** |

**Yayın kararı: HENÜZ MAĞAZA YAYININA HAZIR OLDUĞU DOĞRULANMADI.** Otomatik testler ve kod iyileştirmeleri ayrı, gerçek telefon/Play Store onayı ayrı kontrollerdir. Otomatik testler başarılı olduğunda bile yukarıdaki kapılar tamamlanmadan uygulamayı "tamamen hatasız" veya "yayına hazır" saymayın.
