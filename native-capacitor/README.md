# Patiyiz · gerçek Capacitor Android uygulaması (ayrı QA sürümü)

Bu klasör **PWABuilder / TWA'dan ayrı** native Android prototipidir. PWABuilder ile kurulu APK, canlı patiyiz.com sitesi, Supabase verileri ve ana web uygulaması değişmez.

## Neyi değiştirdik?

- Android'de Patiyiz, Chrome Custom Tab değil, kendi uygulama etkinliği içinde açılır; **son uygulamalar ekranında Patiyiz** olarak görünmesi hedeflenir.
- Web arayüzü, Reels, hikâyeler, özel mesajlar, PatiCoin ve Akademi'nin aynı kaynak dosyaları APK içine kopyalanır. **\`server.url\` kullanılmaz.**
- Supabase ve TUS kütüphaneleri CDN'den değil, paket içinden yüklenir. Supabase veri alışverişi ve medya yüklemeleri için **internet gerekir**.
- Android sistem durum çubuğu koyu, yazılar açık; fiziksel geri tuşu modal/sohbet/ekranları kapatır.
- Telefonun uygulama simgesi mevcut 512px Patiyiz logosundan hazırlanır; splash açılışı Patiyiz logosuyla eşleşir.
- Google Play paket kimliği **\`com.patiyiz.app\`** korunur, ancak **test için üretilen debug APK, eski PWABuilder imzasıyla aynı değildir**.

## GitHub'dan test APK'sı alma

1. [GitHub Actions](https://github.com/iyiyolakademi-cpu/Patiyiz/actions) aç.
2. **Patiyiz Native Android (Capacitor QA APK)** iş akışını bul. 
3. **Run workflow** çalıştır veya ilgili Pull Request testini aç.
4. İşlem başarıyla tamamlandığında **Artifacts → Patiyiz-Capacitor-Android-Debug-APK** dosyasını indir.
5. ZIP içindeki \`app-debug.apk\` dosyasını Android telefonuna yükle.

**Önemli:** Eski \`com.patiyiz.app\` TWA uygulamasını kaldırmadan debug APK'yı üzerine kuramazsın; aynı paket kimliğinde farklı imza bulunur. Kaldırmak yerel oturumu temizler, fakat Supabase hesabını silmez. Test öncesi giriş bilgilerini doğrula. İstersen eski TWA paketinin ZIP/APK dosyasını sakla.

Bu debug APK, Google Play'e gönderilecek **AAB değildir**. Play Console için imzalı release AAB ve ayrı, gizli **yeni upload keystore** gerekir. Daha önce sohbette paylaşılan upload anahtarı ve parolası güvenli kabul edilmemeli; bu test iş akışı hiçbir gizli anahtar gerektirmez veya yayımlamaz.

## Windows / Android Studio ile yerel geliştirme

Node 22+, Android Studio 2025.2.1+, Java 21, Android SDK 36 gerekli. Kök proje içindeki web kaynakları zaten var.

\`\`\`powershell
cd native-capacitor
npm install
npm run build:web
npx cap add android
npx cap sync android
npm run prepare:icons
npx capacitor-assets generate --android --iconBackgroundColor "#FFFFFF" --splashBackgroundColor "#FFFFFF"
npx cap open android
\`\`\`

Android Studio'da **Run** veya \`Build > Build APK(s)\` ile \`app-debug.apk\` oluştur. Gradle / Android SDK derlemesi için ilk çalıştırmada internet gerekli.

## İlk testlerde özellikle kontrol edilecekler

- [ ] APK'nın son uygulamalar menüsünde **Chrome değil, Patiyiz** olarak görünmesi.
- [ ] Açılış ekranında Patiyiz logosu, siyah üst sistem çubuğu ve ekran ölçüleri.
- [ ] E-posta/şifreyle giriş, çıkış, tekrar giriş, oturum kalıcılığı.
- [ ] Akış, beğeni, kaydet, paylaşım, Reels video/ses ve hikâyeler.
- [ ] Mesajlaşma; klavye açıkken düzen; iki kullanıcıda mesaj silme; fotoğraf yükleme.
- [ ] Gerçek Android kamera, galeri seçimi, mikrofon/sesli mesaj izni.
- [ ] PatiCoin, mağaza, Akademi, Premium erişim ve PDF işlemleri.
- [ ] Android geri tuşu ve uygulamayı arka plana gönderme.
- [ ] Mobil ağdan Wi-Fi'ye geçiş, bağlantı kesilmesi ve yeniden açılış.

## Bilerek henüz hazır olmayanlar

1. **Yerel Android push:** Eski Web Push/Service Worker aboneliği WebView içinde otomatik native push'a dönüşmez. Bunun için Firebase projesi + FCM, \`google-services.json\`, Android push eklentisi ve Supabase'den FCM gönderim entegrasyonu gerekir. Bu sürümde bildirimleri açma butonu doğru biçimde *hazır değil* mesajı verir.
2. **E-posta bağlantısı / şifre sıfırlama:** Kayıt onayı ve parola değiştirme bağlantıları \`https://patiyiz.com/\` üzerinden normal tarayıcıda tamamlanır. Sonrasında Patiyiz APK'ya dönüp giriş yapılır. Yerel Android deep link / App Link oturum aktarımı henüz yapılmadı.
3. **Play Store için AAB:** Debug APK'nın imzası yalnız cihaz testi içindir. Kendi üretim sürümümüz imzalanmadan ve Play Console'da iç teste yüklenmeden yayınlanamaz.
4. **Gerçek telefon doğrulaması:** Kod ve Actions derlemesi gerçek cihaz testinin yerini tutmaz.

## Neden sadece sitenin adresini WebView'e açmadık?

Capacitor belgelerinde \`server.url\` **canlı yeniden yükleme/geliştirme için** tasarlanmıştır, üretim için değildir. Bu yapılandırmada \`webDir: "www"\` ile Patiyiz'in HTML/CSS/JS dosyaları yerel Android paketinin içindedir.

Kaynaklar: https://capacitorjs.com/docs/getting-started · https://capacitorjs.com/docs/android
