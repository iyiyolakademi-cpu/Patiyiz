# Patiyiz — Mağaza Yayın Hazırlığı (24 Ekim 2026)

## 24 Ekim 2026 — güvenilirlik güncellemesi
- Mesaj / bildirim Realtime bağlantısı hata veya zaman aşımında yeniden bağlanıyor; uygulama yeniden görünür olunca bildirimler tekrar okunuyor.
- Büyük halka açık medya dosyaları (6 MB üzeri) için Supabase'in 6 MB parçalı TUS aktarımı ve gerçek ilerleme yüzdesi eklendi; küçük dosyalarda eski SDK akışı korunuyor. Gerçek iPhone/Android ağ kesintisi ve format testleri hâlâ gerekli.
- PWA manifesti hem kök alan adında hem GitHub Pages alt yolunda göreli kapsam kullanıyor; favicon yolu düzeltildi.
- PatiCoin denetim olaylarına ilişkin iki eksik yabancı anahtar indeksi canlı Supabase veritabanında oluşturuldu ve SQL dosyası depoya eklendi.
- CI yeni yükleme yardımcı dosyasının sözdizimini ve yeni regresyon testlerini çalıştırır.

- Canlı veritabanında **patiyiz-pet-reminders** adlı pg_cron işi aktiftir. Dakikada bir en fazla 100 yaklaşan, tamamlanmamış hatırlatmayı işler. 24 saatten eski gecikmiş hatırlatmalar için geçmişe dönük bildirim göndermez. Kullanıcı zamanı değiştirdiğinde yeniden bildirim hakkı doğar.
- İşlem özel `patiyiz_private` şemasında çalışır; oturum açmış normal kullanıcılar fonksiyonu doğrudan çağıramaz. Dosya: `supabase/patiyiz-scheduled-pet-notifications-20261024.sql`.
- **Telefonlar için ek koşullar:** Android Chrome ile bildirim izni ve uygun service worker; iOS'ta Safari ana ekrana eklenen PWA ve kullanıcı izni. Bu koşullar olmadan bildirim yalnızca uygulama içinde görünür. Gerçek cihaz uçtan uca testleri tamamlanmadı.

### Kalan doğrulamalar ve manuel bağımlılıklar
- Kayıt, mesaj bildirimi, kamera, galeri, video, hikâye, push, hesap silme ve PatiCoin ödül alımı iki gerçek cihaz ve iki gerçek test hesabıyla uçtan uca sınanmalıdır. Veritabanındaki mesaj sayısı, bildirimin telefona teslim edildiğinin kanıtı değildir.
- Supabase Dashboard Auth güvenliğinde sızdırılmış parola korumasını etkinleştirin; yönetici işlemlerini normal kullanıcı oturumu ile negatif test edin. Otomatik güvenlik denetleyicisinin SECURITY DEFINER uyarılarının her biri fonksiyon bazında incelenmelidir.
- Aşı, veteriner, mama ve ilaç hatırlatmaları Supabase Cron ile dakikada bir kontrol edilip, en fazla bir kez bildirim kaydı oluşturacak şekilde etkinleştirildi. Telefon bildirimi ancak kullanıcının Web Push izni ve geçerli aboneliği varsa gönderilir; gerçek cihazda teslimat ayrıca doğrulanmalıdır.
- Web sitesi cihazın bütün fotoğraf arşivini izinsiz okuyamaz. Tam yerel galeri erişimi ve Play Store/AAB hazırlığı için Android/iOS uygulama paketi gerekir.
- Premium ücretli abonelik ve gerçek bağış/ödül teslimatı, ödeme sağlayıcısı ve sunucu doğrulaması olmadan açılmamalıdır.
- Kayıp pati konum bildirimleri, konum izni, gizlilik ve abuse/spam politikaları hazır olmadan otomatik etkinleştirilmemelidir.

## Mevcut durum
- Web/PWA uygulaması: GitHub Pages + Supabase.
- Android Gradle / AAB ve iOS Xcode / IPA kaynakları bu depoda henüz bulunmuyor.
- Testler: JavaScript sözdizimi, regresyon ve responsive testleri GitHub Actions ile kontrol ediliyor; gerçek cihaz uçtan uca testleri henüz tamamlanmadı.
- Play Store ve App Store'a gönderim yapılmadı.

## Yayın öncesi zorunlu kontroller
- [ ] Android/iOS yerel paket stratejisi belirle; cihaz API'leri, push ve yönlendirmeler için gerekirse Capacitor tabanlı uygulama oluştur.
- [ ] Resmî geliştirici hesapları ve uygulama kimliklerini ayarla, imzalama sertifikaları/anahtarları güvenli biçimde sakla.
- [ ] Android App Bundle (.aab), güncel Google Play hedef API şartı ve internal test kanalında cihaz testleri.
- [ ] iOS Xcode/TestFlight paketleri, Apple HIG ve App Review uyumluluğu; yalnızca web sayfası sarmalamasıyla yetinme.
- [ ] 192/512 PNG simgeler, Android adaptive icon, iOS App Store simgeleri, splash ekranı ve ekran görüntüleri.
- [ ] Kayıt, giriş, şifre sıfırlama, hesap silme, gizlilik, engelleme/şikâyet/moderasyon uçtan uca testleri.
- [ ] Kamera/galeri izinleri; HEIC, MP4, MOV; düşük bağlantı ve yükleme iptalinde hata yönetimi.
- [ ] Hikâye anketleri ve soru kutusu yetki testi; aynı kişinin mükerrer yanıtı ve son kullanma tarihi.
- [ ] DM cevap, 15 dk düzenleme, engelleme ve diğer kişilerin mesajını düzenlemeyi reddeden RLS kontrolleri.
- [ ] Push bildirimleri her iki platformda izin alınarak ve gerçek cihazda test edilmeli.
- [ ] Kullanıcı içeriklerinin şikâyet edilmesi/moderasyonu; destek iletişimi, içerik/yaş politikası ve kişisel verilerin korunması.
- [ ] Ağ erişimi, video belleği, büyük dosya yükleme, düşük güçlü cihazlarda kaydırma ve erişilebilirlik testleri.
- [ ] Telif lisansları netleşmeden popüler müzik kataloğu sunma.

## Bu sürümde yapılanlar
- Hikâyelerde anket, soru kutusu, emoji tepkisi; Supabase RLS.
- Mesajlara yanıt ve 15 dakika içinde gönderen tarafından düzenleme; PostgreSQL tetikleyicisi ve politikaları.
- Mobil stiller, PWA metadata iyileştirmeleri, regresyon testleri.

## Açık kalan gelişmiş iş
- Çok klipli Reels montaj, video kesme/birleştirme, geçiş efektleri ve gerçek AI otomatik altyazı için medya işleme altyapısı gereklidir.
- Yerel Android/iOS paketleri ve gerçek cihaz testleri olmadan mağaza hazır ilan edilmemelidir.
