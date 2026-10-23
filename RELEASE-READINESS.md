# Patiyiz — Mağaza Yayın Hazırlığı (24 Ekim 2026)

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
