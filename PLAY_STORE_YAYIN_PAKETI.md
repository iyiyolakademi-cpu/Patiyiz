# Patiyiz — Google Play Android Yayın Paketi (21.10.2026)

## Mevcut teknik durum
- Canlı web: https://iyiyolakademi-cpu.github.io/Patiyiz/
- PWA manifest: https://iyiyolakademi-cpu.github.io/Patiyiz/manifest.webmanifest
- Gizlilik: https://iyiyolakademi-cpu.github.io/Patiyiz/privacy.html
- Hesap silme: https://iyiyolakademi-cpu.github.io/Patiyiz/delete-account.html
- Kullanım koşulları: https://iyiyolakademi-cpu.github.io/Patiyiz/terms.html

## Android: TWA / Bubblewrap 
Resmî dokümantasyon: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start

```sh
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://iyiyolakademi-cpu.github.io/Patiyiz/manifest.webmanifest
# package id önerisi: com.patiyiz.app (Play Console'da önceden kullanılmışsa değiştirmeyin)
# name: Patiyiz, launcherName: Patiyiz, başlangıç URL: https://iyiyolakademi-cpu.github.io/Patiyiz/
bubblewrap build
```

**Kritik:** GitHub Pages proje yolu `/Patiyiz/` olsa da Digital Asset Links dosyası **alan adının kökünde** `https://iyiyolakademi-cpu.github.io/.well-known/assetlinks.json` bulunmalıdır. Bu depodaki `Patiyiz/.well-known/` yolu yeterli DEĞİLDİR. Bunun için hesap adına ait `iyiyolakademi-cpu.github.io` kullanıcı-sitesi deposu veya sahip olunan özel bir alan adı gerekir. Alan adı farklıysa yeni origin/scope/mobil paket ayarlarını tutarlı değiştirin.

`assetlinks.json` içeriği **Play App Signing sertifikasının SHA-256'sı** bilinmeden güvenli şekilde tamamlanamaz:
```json
[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.patiyiz.app","sha256_cert_fingerprints":["PLAY_APP_SIGNING_SHA256_BURAYA"]}}]
```
Play Console > Release > Setup > App integrity (veya App signing) ekranından **App signing key certificate** SHA-256'sını alın. Yükleme (upload) anahtarıyla karıştırmayın. Keystore dosyasını/parolasını GitHub'a yüklemeyin; üretimde Play App Signing kullanın.

**Hedef SDK:** Güncel Play Console gereksiniminin üzerine veya eşit olmalı (2026 için yeni uygulamalarda Android 16/API 36 hedefine uyum kontrol edilmeli). Üretilen Android projesinin `targetSdkVersion` değerini kontrol edin. Eski Bubblewrap çıktılarını direkt yüklemeyin.

## Google Play Console tamamlanacak alanlar
1. Patiyiz uygulama kaydını oluştur (uygulama türü, ücretsiz/ücretli, ülke).
2. Gizlilik ve hesap silme bağlantılarını ekle; işletmeci iletişim ve KVKK metni taslakları gerçek bilgilerle tamamlanmadan yayınlama.
3. Uygulama erişimi: giriş gerektirir; inceleme ekibine işlevsel test hesabı ve yönerge ver (gerçek hesap şifresi paylaşma).
4. Veri güvenliği: e-posta, kimlik/profil, kullanıcı tarafından oluşturulan fotoğraf/video/ses, mesajlar, cihaz bildirim abonelikleri ve varsa konum bilgisinin gerçek işlenişini açıklayın; şifrelerin kullanıcı içeriği olarak gönderilmediğini doğrulayın.
5. İçerik derecelendirmesi, hedef kitle, reklam/abone beyanları, finansal/diğer bildirimi doğru doldurun. Uygulama kullanıcı içeriği barındırır: şikâyet/engelleme/moderasyon aktif olsun.
6. 512×512 uygulama simgesi; 1024×500 özellik görseli; gerçek Android cihazdan en az iki telefon ekran görüntüsü; kısa/tam açıklama ekle.
7. Android AAB dosyasını **önce Dahili test** alanına yükle ve fiziksel Android'de kamera/mikrofon/push/hikâye/yükleme/hesap silme akışlarını doğrula.
8. Play Console kişisel geliştirici hesabı 13 Kasım 2023 sonrasında açıldıysa genellikle **12 testçi, 14 gün kesintisiz kapalı test** gerekir; hesap ekranındaki koşulu izle.
9. Kapalı test/production erişimi ve Play incelemesi tamamlanınca üretime gönder.

## Patiyiz mağaza metinleri — taslak
**Kısa açıklama:** Patili dostlarını paylaş, hayvanseverlerle tanış ve birlikte öğren.

**Tam açıklama:**
Patiyiz, hayvan dostlarını ve hayvanseverleri bir araya getiren sosyal bir topluluktur.

• Fotoğraf ve video paylaş, diğer kullanıcıların gönderilerini keşfet.
• Evcil dostuna özel bir profil oluştur.
• Topluluğa sorular sor, deneyimlerini paylaş.
• Diğer hayvanseverlerle mesajlaş.
• Kayıp ilanlarını ve sahiplendirme paylaşımlarını görüntüle.
• Bakım takvimini ve hayvan bilgi merkezini kullan.

Güvenli topluluk deneyimi için içerik bildirme, kullanıcı engelleme ve hesap silme araçları sunulur.

Premium sesli yorum, yalnızca premium erişim tanımlanan hesaplarda kullanılabilir. **Ödeme altyapısı bağlanmadan mağaza açıklamasında ücretli abonelik satışı vaat etmeyin.**

## Yayın engelleri
- Destek e-postası ve veri sorumlusu iletişim bilgileri gizlilik sayfasında henüz tamamlanmadı.
- Android AAB imzalama / TWA doğrulama (SHA-256) / mağaza beyanları elle tamamlanmalı.
- Supabase Auth leaked-password koruması Dashboard'da kapalı (varsa plan yetkilerine göre açılmalı).
- Premium ödeme ve sunucu taraflı satın alma doğrulaması yok. Premiumu gerçek para karşılığı etkinleştirmeyin.
