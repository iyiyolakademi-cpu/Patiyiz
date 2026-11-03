# Buchee | 6. aşama yayın öncesi doğrulama raporu

**Tarih:** 3 Kasım 2026
**Dal:** main
**Geri dönüş:** backup/buchee-before-release-phase6-20261103

## Yapılan kod değişiklikleri

- Akış, Keşfet, Mesajlar, Reels ve Profil için güncel JS/CSS/SVG/manifest dosyaları PWA'da network-first okunur. İnternetsiz durumda önceden yüklenmiş statik dosyalar yedek olarak kullanılır.
- Yalnız uygulama kökündeki tanımlı statik dosya türleri önbelleğe girer; alt dizin özel medya URL'leri, token/signature parametreli URL'ler bu mekanizmadan hariç tutulmuştur.
- Güncelleme aktif form, modal, içerik oluşturma veya gönderilmemiş sohbet mesajı sırasında zorla yenileme yapmaz.
- Android Capacitor sürümünün kendi paketlenmiş dosyaları vardır; PWA servis çalışanı yerel Android uygulamasına uygulanmaz.
- GitHub kalite iş akışı kod testi yanında ayrı bir sürüm hazırlığı denetimi de yayımlar.
- Uygulamanın hesap, paylaşım, takipçi, bakiye veya özel mesaj veritabanına müdahale edilmemiştir.

## Otomatik doğrulama

| Denetim | Sonuç |
|---|---|
| Yeni 6. aşama testleri | 6/6 başarılı |
| Bütün regresyon testleri | 921 test / 726 geçti / 195 önceden kalan başarısızlık |
| Yeni test hatası | 0 |
| GitHub Pages dağıtımı | Başarılı |
| Özel medya güvenliği CI | Başarılı |
| Yayın hazırlığı denetimi | 19 kontrolden 7 geçti; 12 manuel kapı açık |

**Önemli:** Genel kalite iş akışı, eski 195 test nedeniyle başarısızdır. Bu borç giderilmeden tüm testler yeşil olarak bildirilemez. Gerçek cihaz testleri ve ölçülmüş açılış/FPS sonuçları yoktur.

## Mağaza yayını öncesi gerçek doğrulama sırası

| Öncelik | Manuel test | Beklenen sonuç |
|---|---|---|
| P0 | İki hesap arasında özel medya erişimi | B hesabı, A hesabının yetkisiz özel medya veya mesajına erişemez |
| P0 | Gerçek Android, iki hesap | Kamera, galeri, video/Reels, mesajlaşma, push ve oturum aç/kapat çalışır |
| P0 | iPhone Safari ve ana ekran PWA | Beş sekme, üst başlık, güvenli alan, Reels sesi ve mesaj klavyesi doğru görünür |
| P0 | Hesap silme | Kullanıcı verileri ve ilişkili özel dosyalar gerçekten silinir; başka hesaplar etkilenmez |
| P0 | Sızdırılmış şifre koruması | Supabase ayarında doğrulanır ve reddetme senaryosu test edilir |
| P0 | Yedek/geri yükleme ve kapasite | Test ortamında güvenli geri yükleme ve yük altında veri bütünlüğü kanıtlanır |
| P0 | Play Console AAB/kapalı test | Aynı paket kimliğiyle imzalı güncel BucheeSocial test sürümü yüklenebilir |
| P1 | Puan ve nakit isteklerinde yarış koşulları | Çift ödül/puan veya çifte nakit talebi oluşturulamaz |
| P1 | Moderasyon, engelleme, şikâyet | Erişim sınırları ve yönetici işlemleri doğru çalışır |
| P1 | Kayıp ilanı bildirimleri | Abonelik/opt-in ve bulundu bildirimi gerçek cihazda doğrulanır |
| P1 | Destek ve veri sorumlusu hukuki inceleme | Belgelerin doğruluğu, KVKK, aktarım ve saklama yükümlülükleri onaylanır |
| P2 | iOS TestFlight / App Store | iOS yayın kapsamı varsa gerçek dağıtım ve inceleme tamamlanır |

**12 doğrulama kapısının hiçbiri tamamlanmış işaretlenmedi.** Kanıt dosyası docs/patiyiz-1-0-launch-evidence.json içerir.

## Beş ekran için tekrar kontrol listesi

- **Akış:** Tümü/Takip Ettiklerim, ilk yazı modu, yeni paylaşım, beğeni/yorum/kaydetme ve geri.
- **Keşfet:** Arama/son aramalar, beş sıralama seçeneği, galeri, kaydedilenler.
- **Mesajlar:** Tek liste, arama koruma, okunmamış, klavye, medya mesajları, toplu kaldırma ve grup güvenliği.
- **Reels:** Yatay olmayan dikey kaydırma, tek oynayan video, sessiz/sesli, seek, sağ etkileşimler, kamera.
- **Profil:** Beş sekme, düzenle/istatistikler, takipçi sayaçları, özel hesap ve sunucudan alınan bakiye.
- **Kurulu PWA:** Eski sürümden yeni sürüme geçerken ekranlar doğru yenilenir; gönderilmemiş mesaj kaybolmaz.
- **Android geri:** Sohbet, modal ve gönderi ayrıntısında tek geri adımı test edilir.

## Açık teknik/yayın riskleri

1. Genel testlerde 195 önceden kalan başarısızlık bulunmaktadır. Bunlar otomatik olarak susturulmadı veya baz çizgiye eklenmedi.
2. Gerçek iOS/Android fonksiyon testleri, bellek/FPS/ilk açılış metriği ve ağ profili karşılaştırması yapılmadı. Hız artışı sayısal olarak kanıtlanmış değildir.
3. Android paket kimliği com.patiyiz.app olarak kalmaktadır; kullanıcıya görünen uygulama adı BucheeSocial'dır. Paket kimliği Play Console devamlılığı incelenmeden değiştirilmemelidir.
4. Web canonical ve Android e-posta yönlendirmesi patiyiz.com adresini kullanmaktadır; alan adı ve marka yönlendirmesi yayın sahibi tarafından doğrulanmalıdır.
5. Destek ve işletmeci kimliği belgelerde yer alsa da resmi hukuki onay henüz kaydedilmemiştir.

## Yayın kararı

**Web/PWA dağıtımı: başarılı.**
**Mağaza / genel kullanıma koşulsuz yayına hazır: HAYIR.**
Bu karar, 12 manuel kapı tamamlandıktan ve kalite regresyon riski değerlendirildikten sonra yenilenmelidir.

## Geri dönüş

Bu aşama öncesi kod dalı backup/buchee-before-release-phase6-20261103 üzerinde korunmaktadır. Geri dönüşte GitHub dalının güncel SHA'sı doğrulanmalı, kullanıcı veritabanına ve depolama dosyalarına yazma veya silme işlemi yapılmamalıdır.
