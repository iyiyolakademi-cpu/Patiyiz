## 24 Ekim 2026 — mesajlaşma kalite düzeltmesi
- Mesajlaşma mobilde bağımsız, tam ekran sohbet olarak tasarlandı: sabit sohbet başlığı ve altta sabit yazma kutusu; yalnız mesaj geçmişi kayar. Klavye yüksekliği `visualViewport` üzerinden hesaplanır. Sohbete girildiğinde en son mesaj görüntülenir; okundu/Realtime güncellemeleri ekranı gereksiz yere başa kaydırmaz.
- Fotoğraf seçimi ikinci onay ekranı gerektirmez; seçimden itibaren “gönderiliyor” önizlemesi gösterilir, yükleme ve mesaj kaydı sunucudan onaylanır. Onaylanmazsa gönderildi sayılmaz. Sesli mesaj ve özel Supabase Storage korunur.
- Mesaj seçeneklerinde yalnız **Sil** bulunur. Her iki katılımcı da mesajı kalıcı kaldırabilir; yetkiyi sunucudaki `patiyiz-delete-message` Edge Function kontrol eder. Mesaja ait özel depolama dosyası da silinir; depolama temizleme hatası sunucuda ayrıca raporlanır.
- Her iki katılımcının ekranını otomatik yenilemek için sahibine özel RLS'li `patiyiz_dm_deletion_events` Realtime olayı eklendi. Bildirim mesaj gövdesi taşımaz.
- Mesaj düzenleme `body, edited_at` sütunlarına sınırlandırıldı. 15 dakikalık gönderici doğrulaması ve veritabanı düzenleme tetikleyicisi korunur.
- Otomatik testler ve Supabase rol kontrolleri yapıldıktan sonra sürüm sunulur. Gerçek iki telefonda klavye, yükleme, silme, düzenleme, ses kaydı ve Realtime teslim testi ayrıca gerekir.

## 24 Ekim 2026 — PatiCoin, akış ve kaydetme düzenlemesi

- **Sağlık Dosyası** arayüzden ve menüden kaldırıldı. Eski özel sağlık belgeleri, varsa, veri kaybı yaşanmaması için silinmedi; mevcut temel Aşı, Veteriner ve Sağlık takvimi korunur.
- **En Aktif 5 Pati** artık akışın başında görünmez: İkinci gönderiden hemen sonra gösterilir. Akışta yalnızca bir gönderi varsa o gönderinin arkasında gösterilir; hiç gönderi yoksa gösterilmez.
- **Kaydet** düğmesi kullanıcıya ait `post_saves` kaydını Supabase üzerinde doğrular, başarılı olmadan kaydedildi göstermez; kullanıcılar `Kaydettiklerim` arşivine erişebilir. Paralel kaydetme istekleri engellenir.
- **24 görev:** 15 tek seferlik, 5 günlük, 4 haftalık. Günlük görevler İstanbul yerel tarihine, haftalık görevler pazartesi başlangıcına göre `task_code` ile kayıt altına alınır. Aynı görev aynı gün/hafta ikinci kez PatiCoin kazandırmaz. Her görev gerçekten gerçekleşmiş olmalıdır; sunucu `patiyiz_claim_completed_tasks` içinde doğrular. Önceki bakiye ve talepler korunur.
- **Menü:** PatiCoin miktarı telefon üst menüsünün solunda ve masaüstü sol menüde görünür. PatiCoin Görevler ile Pati Mağaza profilden ve kalabalık ana menüden kaldırıldı, yan özellik menüsünün `PatiCoin Merkezi` bölümünde birlikte yer alır.
- Gerçek hesapta kaydet/kaldır, farklı tarayıcıda kaydetme kalıcılığı, görev yenilenmesi ve sipariş bakiye senaryoları ayrıca cihaz üzerinde doğrulanmalıdır.

## 24 Ekim 2026 — özel Sağlık Dosyası, Premium kontrol paneli, rozetler ve yönetici bildirimleri

- **Dijital Pati Sağlık Dosyası:** Her kullanıcı yalnız kendi hayvanının aşı, muayene, tahlil, ilaç ve diğer kayıtlarını görebilir. İsteğe bağlı PDF/görseller yalnız *özel* Supabase Storage alanına yüklenir (10 MB sınırı). Görüntüleme bağlantıları en fazla 90 saniyelik imzalı bağlantılardır. Sağlık özeti yazdırılarak PDF kaydedilebilir. **Veteriner teşhisi veya resmî sağlık belgesi değildir.**
- **Premium Kontrol Paneli:** Doğrulanmış Premium hakkı olan üyeler tamamlanan görevleri, üç programdaki toplam ilerlemeyi ve önerilen sıradaki günlük görevi tek ekranda görür. Ödeme bağlantısı hâlâ hazır değildir; erişim yetkileri yalnız server tarafında tutulur.
- **Başarı Rozetleri:** 1, 10, 25, 50 ve 101 ücretsiz ders eşiği; 101 dersin tümü ve her Premium programın tüm görevleri tamamlanırsa kişisel katılım belgesi için yazdırma/PDF imkânı. **Akredite veya mesleki sertifika değildir.**
- **Admin → Bildirim Gönder:** Yönetici hesabı ile giriş yaptıktan sonra başlık ve metin girilip kullanıcı sayısı görülerek gönderim onaylanır. Sunucu 10 dakika bekleme, günde beş duyuru, 1000 alıcı üst sınırı ve kampanya kimliği tekrar koruması uygular. Gönderilen bildirimler uygulama içi **notifications** tablosuna yazılır; mevcut Web Push tetikleyicisi yalnız izin veren cihazlara gönderim dener. Gerçek telefonlara teslim garantisi yoktur. **Bu güncellemede test amaçlı dahi gerçek toplu bildirim gönderilmedi.**
- **Gizlilik:** Sağlık tabloları ve dosyaları kullanıcı bazlı RLS ile sınırlıdır. Canlı hesap silme Edge Function v5, özel sağlık dosyalarını silme sırasını içerir. Gerçek hesap silme testi mevcut kullanıcı kaybına yol açacağı için yapılmadı.
- **Güvenlik sınırları:** Kullanıcılar bildirim geçmişini okuyamaz, admin duyuru yetkisi alamaz. RLS ve özel depolama kontrolleri SQL üzerinden denetlenmiştir.
- **Kontrol listesi:** İki hesapla çapraz belge erişimi, PDF/PNG yükleme, iPhone/Android yazdırma, push izni açık/kapalı testleri ve gerçek cihaz UX kontrolleri üretim öncesinde ayrıca yapılmalıdır.

## 24 Ekim 2026 — 101 derslik Patiyiz Akademi

- Mevcut 6 çekirdek ders ve 26 ek derse **69 yeni eğitim** eklenerek toplam **101 özgün ders ve 101 mini sınav** sunuldu.
- Konular: genel bakım, kedi, köpek, sağlık, beslenme, kuş, balık, diğer hayvanlar, sahiplendirme ve ilk yardım (10 kategori).
- İçerikler temel bakım ve risk önleme odaklıdır. Tıbbi teşhis, tedavi, ilaç dozu veya acil veteriner desteği yerine geçmez.
- Akademi ekranına 101 ders içerisinde arama ve kaldığı yerden devam etme işlevi eklendi; kategori filtreleri, ilerleme çubuğu ve hesap bazlı mevcut `patiyiz_education_progress` kaydı korundu.
- Geçmişte tamamlanan derslerin sabit kimlikleri değişmediği için kullanıcı ilerlemesi silinmez.
- Yeni içerikler `academy-101-part1.js` (36 ders) ve `academy-101-part2.js` (33 ders) dosyalarındadır. Regresyon testi `tests/academy-101.test.cjs` tam 101 dersi, benzersiz kimlikleri ve geçerli sınavları doğrular.

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
