# Buchee Social — React Native / Expo

Bu, **WebView kullanmadan** iOS ve Android için React Native ekranları oluşturan **ayrı bir mobil önizleme projesidir**. Depodaki web uygulaması, Capacitor sürümü, GitHub Pages, canlı Supabase ve mevcut Play Store uygulaması değiştirilmez.

## Durum

Bu depo içindeki kod çalışan sunucu verilerine bağlanacak şekilde yazılmış **ilk native geliştirici önizlemesidir**; üretim yayını veya web sürümüyle tam özellik eşitliği değildir. Cihaz üzerinde test, güvenlik doğrulaması ve yayın sertifikaları henüz gereklidir.

**İlk sürümde geliştirilen ekranlar**
- Supabase ile e-posta/şifre girişi, kayıt, şifre sıfırlama isteği ve kalıcı oturum
- Gerçek React Native bileşenleriyle akış, Yazılar ve Sorular/Gönderiler sekmeleri
- Metin gönderisi ve soru yazma, beğenme, kaydetme
- Takip edilen hesapların görünebilir fotoğraf hikâyeleri
- Expo Video ile native Reels video oynatma ve dikey kaydırmayla sonraki/önceki
- Kullanıcı arama, kişi profilini açma, profili düzenleme ve kaydedilenleri görüntüleme
- Mesaj kutusu, metin sohbeti ve bildirim listesi

**Henüz tamamlanmamış, üretime geçmeden zorunlu geliştirmeler**
- Fotoğraf/video/hikâye/Reels **yükleme** ve hikâyede video; kamera, sistem galeri seçicisi
- Özel fotoğraf/video erişimi: mevcut özel depolama + kısa ömürlü imzalı URL akışını React Native'e güvenle taşıma, gizli hesap ve engelleme uç durumları
- Beğeni/yorum ayrıntıları, anketler, hikâye yanıtları ve görüntüleyenler, takip onayı, canlı akış ve bildirimler
- Mesajlarda medya, grup sohbetleri, yazıyor/okundu, silme, reaksiyon, engelleme ve şikâyet
- Gelişmiş keşfet ızgarası, profil içerik sekmeleri, istatistikler, mevcut ekstra modüller, ödeme/bakiye ve premium sistemleri
- FCM/APNs push, cihaz izinleri, bildirim yönlendirmeleri, erişilebilirlik, tüm ekranlarda çevrimdışı/online davranışı
- Gerçek Android/iOS cihaz QA, Supabase RLS testleri, mağaza incelemesi ve release imzalama

> Hâlihazırda canlı kullanılan Supabase tablolarına bu branştan **hiçbir şema değişikliği uygulanmadı**. Aynı hesaplarla giriş yapılması amaçlanmıştır. Mobil uygulama istemcisindeki yetkilendirme güvenlik kontrolü değildir; nihai yetkiyi RLS uygular.

## Windows + Android Studio emülatöründe deneme

Gerekenler: Node.js 22.13+, Android Studio ve çalışır Android emülatörü.

```powershell
git clone https://github.com/iyiyolakademi-cpu/Patiyiz.git
cd Patiyiz
git switch feature/buchee-react-native
cd mobile-native
npm install
npm run check
npx expo start
```

Expo arayüzü açıldığında **a** tuşuyla Android emülatörünü aç. Gerekirse:

```powershell
npx expo run:android
```

Bu Android komutu yerel Android projesini üretir, derleyip emülatöre yükler. iOS için macOS + Xcode ile `npx expo run:ios` kullanılabilir. Mağaza sürümü için EAS Build veya yerel imzalı release hazırlığı gerekir.

GitHub'daki sürüm bağımlılıkları ve kodunun Expo SDK 58 için doğrulanması CI iş akışı ile yapılır; başarılı kod paketi dahi gerçek cihaz doğrulaması anlamına gelmez.

## Android kimliği ve yayın güvenliği

Android geliştirici önizlemesi `com.buchee.social.preview` kullanır; Play Console'da kayıtlı `com.patiyiz.app` uygulamasının üzerine **kurulmaz**, yanında çalışır. Eski uygulamayı kaldırmaya gerek yoktur. Canlı Play uygulamasının kimliğini/sertifikasını yalnızca final yayın geçişinde, imza anahtarlarını güvenli biçimde doğruladıktan sonra kullanın.

Mevcut logo `assets/icon.png` içine kaynak dosyanın **aynı kopyası** olarak alındı.

## Supabase bağlantısı

`src/client.js` mevcut webde **zaten herkese açık** `config.js` içindeki Supabase project URL ve publishable key değerlerini kullanır. Farklı geliştirme projesine bağlanmak gerekirse `.env.example` içindeki `EXPO_PUBLIC_` alanlarına göre yerel `.env` oluşturun. Bu değerler **gizli değildir**. `service_role`, secret, SMTP, veritabanı parolası veya Firebase service-account verisini istemciye / GitHub'a koymayın.

**Özel medyanın fotoğraf/video URL'leri şu an güvenlik gerekçesiyle uygulamada otomatik görünür yapılmıyor.** Production öncesinde backend'in RLS ve imzalı URL servisiyle uyumlu, giriş yapan kullanıcıyı doğrulayan bir modül gerekir.

## Test kontrol listesi

- [ ] Aynı Supabase kullanıcısıyla eski web ve yeni native uygulamaya giriş
- [ ] Ana akış sırası, metin gönderme, soru, beğeni, kaydet, profiller
- [ ] Reels tam ekran/performans/ses, hikâye izleme
- [ ] İki hesap arasında mesaj gönder/al ve bildirim
- [ ] Gizli hesap, engellenmiş kullanıcı ve özel medya RLS
- [ ] Oturumu sonlandırınca cache / kullanıcı verilerinin ekranda kalmaması
- [ ] Android geri tuşu, klavye, sistem çubuğu, bağlantı kesintisi
- [ ] Pixel 8 emülatörü ve en az bir gerçek cihaz
- [ ] Play ve App Store yayın öncesi ayrı test/sürüm çalışmaları
