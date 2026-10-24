# Patiyiz · Android APK ve AAB hazırlığı

**24 Ekim 2026 · Hazırlık aşaması.** Bu klasördeki yapı yalnızca Android paketleme içindir. Çalışan GitHub Pages sitesi, Supabase, mevcut kullanıcılar ve PWA dosyaları değiştirilmez.

## Seçilen yöntem

- **Trusted Web Activity (TWA)**: mevcut Patiyiz web uygulamasını Android'de tam ekran açar.
- Paket kimliği (ilk öneri): **`com.patiyiz.app`**.
- Asıl web adresi: **`https://patiyiz.com/`**.
- Uygulama adı: **Patiyiz**; mevcut 192px/512px Patiyiz ikonları.
- Sürüm: **1.0.0 / versionCode 1**. Play Console'da aynı paket kimliğinde bir uygulama varsa önce paket kimliğini ve sonraki sürüm kodunu mevcut kayda göre güncelleyin.
- Play Console, 31 Ağustos 2026'dan itibaren yeni uygulama ve güncellemelerde Android **API 36 veya üzeri** istiyor; Bubblewrap'ın ürettiği Gradle projesini derlemeden önce kontrol edin.

## 1. Ön kontroller

```bash
node android/check-readiness.mjs
node android/check-readiness.mjs --online
```

İlk komut yerel dosyaları kontrol eder. İkincisi `patiyiz.com` ve zorunlu HTTPS URL'lerini canlı olarak kontrol eder. İnternet veya DNS erişilemiyorsa ikinci komut başarısız olur. **Başarısız çevrimiçi kontrolden sonra APK/AAB hazır demeyin.**

- [ ] `https://patiyiz.com/` telefonda HTTPS ile açılıyor.
- [ ] `https://patiyiz.com/manifest.webmanifest` yanıt veriyor.
- [ ] `https://patiyiz.com/patiyiz-app-icon-512.png` doğrudan görüntüleniyor.
- [ ] Gizlilik, kullanım koşulları ve hesap silme sayfaları gerçek bilgilerle tamamlanmış.
- [ ] Android üzerinde login, paylaşımlar, Reels, mesajlaşma, silme, kamera, mikrofon, bildirim ve PatiCoin testleri için iki test hesabı hazırlanmış.

## 2. En kolay yol: PWABuilder

1. [PWABuilder](https://www.pwabuilder.com/) sayfasını aç, **`https://patiyiz.com/`** yaz.
2. PWA kalite kontrolü yap. Android paketlemeye geç.
3. **Patiyiz**, ikonlar ve **`com.patiyiz.app`** değerlerini kullan (mevcut Play paket kimliğin farklıysa onu kullan).
4. Android sürümünü **API 36+** olacak şekilde doğrula. 2026 API 36 desteklemeyen eski şablonla AAB yayımlama.
5. İmzalanmış **APK**'yı gerçek Android telefonda test et. **AAB**'yi Play Console iç testine yükle.
6. PWABuilder'ın ürettiği **imza anahtarı / keystore** dosyasını ve parolalarını güvenli, yedekli yerde sakla; GitHub'a veya sohbete yükleme.

**Not:** PWABuilder'ın ekranları ve sunduğu indirme biçimi zaman içinde değişebilir; yüklenen paketin gerçek API hedefini, imzalama durumunu ve uygulama kimliğini ayrıca doğrula.

## 3. Alternatif: Bubblewrap projesi ve yerel build

`android/twa-manifest.json` başlangıç TWA yapılandırmasıdır. [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) ile:

```bash
npm install -g @bubblewrap/cli
cd android
bubblewrap update --skipVersionUpgrade
# Oluşturulan app/build.gradle içinde targetSdkVersion 36 veya üstü olduğunu doğrula.
bubblewrap build
```

`bubblewrap build`, imza parolalarını isteyebilir ve paketleri genellikle `android/app-release-signed.apk` ile `android/app-release-bundle.aab` olarak üretir. Derleme ilk çalıştırmada JDK ve Android SDK araçlarını kurmayı gerektirebilir. Paket kimliği aynı kalmalı; sonraki Play sürümlerinde `appVersionCode` artırılmalı.

`android/twa-manifest.json` içindeki imza dosyası yolu örnektir. Gerçek anahtar dosyasını yalnızca **yerel cihazda** veya GitHub Actions Secret olarak kullan.

## 4. GitHub'dan imzalı APK + AAB üretme (hazır manuel iş akışı)

GitHub **Settings → Secrets and variables → Actions → New repository secret** bölümüne dört secret ekleyin:

| Secret | Anlamı |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Gerçek Android upload keystore dosyasının **base64** kodlanmış içeriği |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore parolası |
| `ANDROID_KEY_PASSWORD` | Anahtar parolası |
| `ANDROID_KEY_ALIAS` | Keystore alias'ı (bu yapılandırmada `patiyiz-upload`) |

Windows PowerShell'de `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\\GIZLI\\patiyiz-upload.keystore"))` ile keystore içeriği base64 biçimine çevrilebilir. Bu değeri **yalnızca GitHub Secret** içine koy; commit, mesaj veya sohbet üzerinden gönderme.

Bunları sen eklemeden ChatGPT imzalama anahtarını bilemez. Secrets tamamlanınca GitHub → **Actions → Patiyiz Android APK / AAB (manual) → Run workflow** yolunu izle. İşlem başarılı olursa Actions çalışmasının **Artifacts** bölümünden APK ve AAB'yi indirebilirsin. Dosyalar 7 gün tutulacak şekilde ayarlanmıştır. Güvenli imzalama ve API 36 denetimi gerçekleşmeden paket yayınlanmaz.

**Önemli:** Bu otomatik Android iş akışı, imzalama anahtarları eksik olduğu için henüz gerçek APK/AAB derlemesiyle test edilmemiştir. Şimdilik yalnız hazırlık ve sözdizimi kontrollerinden geçmelidir.

## 5. Tam ekran görünüm için Digital Asset Links — zorunlu

Android TWA'nın adres çubuğunu gizleyebilmesi için **uygulama imzasının web sitesinde doğrulanması gerekir**. Gerçek SHA-256 sertifika izi bilinmeden `.well-known/assetlinks.json` oluşturulmaz. İmzalanan sertifika ile dosyada tanımlanan iz eşleşmiyorsa uygulama Chrome Custom Tab (adres çubuklu) olarak açılabilir.

Google Play Console → **App integrity / Uygulama bütünlüğü → App signing key certificate** bölümünden **SHA-256** değerini al. Doğrudan yüklenen test APK'sı farklı upload anahtarıyla imzalıysa `keytool -list -v -keystore <dosya>` komutundan onun SHA-256 değerini de al.

```bash
node android/generate-assetlinks.mjs --fingerprint "AA:BB:...(32 çift)"
# Test APK ayrı sertifikaysa bir ikinci --fingerprint seçeneği ekle.
```

Komut gerçek fingerprint verildiğinde projenin **kökünde** `.well-known/assetlinks.json` üretir. Dosya `main` dalına yayımlanınca mutlaka `https://patiyiz.com/.well-known/assetlinks.json` adresinde yanıt verdiğini kontrol et.

- `https://iyiyolakademi-cpu.github.io/Patiyiz/.well-known/assetlinks.json` **yeterli değildir**; alan adı origin'inin kök yolu gerekir.
- `ANDROID_KEYSTORE_BASE64` ya da parola `assetlinks.json` içine **yazılmaz**.
- Play Store'un imzaladığı uygulama için **App signing key** SHA-256 kullanılmalı; yalnız upload key yeterli değildir.

## 6. Play Store'a geçmeden önce

- [ ] **APK fiziksel Android cihazda** test edildi.
- [ ] **AAB Play Console dahili teste** yüklendi.
- [ ] `com.patiyiz.app` paket kimliği mevcut Play uygulamasıyla (varsa) birebir eşleşiyor.
- [ ] **TWA Digital Asset Links** onayı ve tam ekran görünüm doğrulandı.
- [ ] Gerçek cihazda kamera, fotoğraf, Reels video, mikrofon ve **Web Push** izin/teslimatları kontrol edildi.
- [ ] İki kullanıcı arasında özel mesaj, fotoğraf, düzenleme ve iki taraflı silme testleri yapıldı.
- [ ] KVKK, gizlilik, hesap silme, veri güvenliği ve moderasyon beyanları güncel.
- [ ] Premium dijital satış yalnızca doğrulanmış ödeme altyapısı hazırsa etkinleştirilecek.
- [ ] Gerekiyorsa kapalı test ve Play inceleme koşulları tamamlandı.

### Kaynaklar

- Android TWA: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
- Bubblewrap CLI: https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli
- Play hedef API şartı: https://support.google.com/googleplay/android-developer/answer/11926878
- Play Console: https://play.google.com/console/
