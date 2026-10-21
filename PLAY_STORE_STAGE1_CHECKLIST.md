# Patiyiz — Google Play sürüm hazırlığı (21.10.2026)

## Aşama 1 uygulandı
- Hesap silme kullanıcı arayüzü: **Ayarlar ve Gizlilik > Hesabımı kalıcı olarak sil**. Mevcut şifre + metin onayı + uyarı.
- Edge Function `patiyiz-delete-account`: token doğrulama, parola ile yeniden doğrulama, admin hesabı koruması, Storage API üzerinden kullanıcı dosyalarını kaldırma, Auth admin silme (ilişkiler CASCADE).
- Herkese açık hesap silme açıklaması: `delete-account.html`.
- Gizlilik politikası: `privacy.html`. Topluluk kuralları/kullanım şartları: `terms.html`.
- Kayıt ekranında gizlilik ve kullanım koşullarını kabul kutusu.
- Profil, hikâye, sesli yorum, ilan ve yazılı yorum için şikâyet düğmeleri.
- Admin panelinde hikâye, sesli yorum, sahiplendirme içeriğini inceleme ve kaldırma.
- Moderasyon RPC'lerinde admin kimlik kontrolü, denetim kayıtları.
- İnceleme yapan yönetici silindiğinde yabancı anahtar tıkanıklığını önleyen `ON DELETE SET NULL` ve altı FK indeksi.

## Yayına çıkmadan yapılacaklar
1. **Gerçek iki test hesabında uçtan uca test**: hesap silme yalnızca test hesabında ve kendi verileriyle. Testin ardından kullanıcının Auth kaydı, veritabanı kayıtları ve dosyalarının silindiğini doğrula. Üretim hesaplarını test amacıyla silme.
2. **Yasal içerik kontrolü**: işletmeci tüzel/gerçek kişi unvanı, geçerli iletişim adresi, destek e-postası, Veri Sorumlusu/KVKK metni, saklama süreleri ve uluslararası aktarım değerlendirmesi kesinleştirilmeli. Mevcut metinler taslaktır.
3. Supabase Dashboard > Authentication > Settings/Security: **Leaked Password Protection** elle etkinleştirilmeli.
4. Yedi `SECURITY DEFINER` RPC'nin ayrıntılı izin testi: admin olmayan kullanıcılar admin işlevini çalıştıramamalı. İşlevler `auth.uid()` doğrular; linter yine imza bazlı uyarı gösterebilir.
5. Moderasyonun **görsel ve ses dosyası temizliği**: içerik kaldırılınca Storage'daki bağımsız dosyanın temizlenmesi için uygulama akışı tasarlanmalı.
6. Şikâyetleri yanıtlayacak destek/moderasyon iletişim noktası netleştirilmeli.
7. PWA kamera, mikrofon, bildirim, dosya yükleme, navigasyon, ekran okuma ve erişilebilirlik cihaz testi yapılmalı.
8. Android paket kimliği, imza anahtarı, doğru uygulama simgeleri, TWA Digital Asset Links doğrulaması ve Android App Bundle hazırlanmalı.
9. Play Console içeriği: gizlilik URL'si, hesap silme URL'si, Veri Güvenliği formu, ekran görüntüleri, içerik derecelendirmesi, test hesabı yönergeleri, test programı.

## Kontrol bağlantıları
- https://iyiyolakademi-cpu.github.io/Patiyiz/
- https://iyiyolakademi-cpu.github.io/Patiyiz/privacy.html
- https://iyiyolakademi-cpu.github.io/Patiyiz/terms.html
- https://iyiyolakademi-cpu.github.io/Patiyiz/delete-account.html

Not: Yapısal kod/söz dizimi kontrolleri başarılı oldu; gerçek cihaz ve silme testleri yapılmadı. Kullanıcı verileri bu geliştirmelerde silinmedi.
