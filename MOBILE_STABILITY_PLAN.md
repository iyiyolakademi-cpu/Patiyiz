# Buchee Social — Mobil istikrar çalışması

Tarih: 2026-11-03
Çalışma dalı: `refactor/mobile-stability-20261103`
Ana dal: `main` (dokunulmayacak; test tamamlanmadan birleştirme yok)

## Başlangıç tespiti
- index.html: 55941 karakter.
- Bağlı CSS dosyası: 166.
- Bağlı JavaScript dosyası: 48.
- iPhone ana ekran başlığına özel art arda CSS override dosyaları var.
- Reels video/oynatma ve DM hizalama için art arda eklenen müdahaleler var.

## Güvenli geçiş sırası
1. **Mobil başlık:** eski/yeni safe-area kurallarını karşılaştır; tek kurala indir. Çekerek yenileme etkisini ayrıca doğrula.
2. **Mesajlar:** hikâye halkalı/halkasız sohbet satırlarını tek düzenle çalıştır; uzun ad ve iPhone klavyesini test et.
3. **Akış:** ilk veri sorgusunu ve medya yüklemeyi ölç; aynı DOM'u tekrar tekrar çizen kodu sadeleştir.
4. **Reels ve hikâyeler:** video bellek tüketimi ve etkileşimlerin olay dinleyicilerini birleştir.
5. **PWA:** Safari ve ana ekrana eklenmiş sürüm için aynı ekran ölçülerini karşılaştır.

## Yayına alma kapıları
- iPhone Safari ve ana ekrana eklenen PWA: 375px/390px/430px ekran kontrolü.
- Akış, Hikâye, Reels, Mesajlar, Profil, Kaydedilenler akışları.
- Kullanıcı hesabı, gönderi, hikâye ve sohbet veri kaybı olmamalı.
- Her işten sonra ayrı commit; ana dala yalnızca testten sonra PR.

## İlk aşamada yapılmayacaklar
- Veritabanı şemasını değiştirmek veya kullanıcı verisini silmek.
- Mevcut `main` sürümüne yeni CSS yamaları eklemek.
- Tüm uygulamayı aynı anda yeni bir teknolojiye taşımak.
