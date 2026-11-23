# Buchee Sosyal Özellikler — Aşama 1

## Kaynak kodu denetimi (2026-11-23)
- `app.js` 9.617 satır, yaklaşık 813 KB. Ana gezinme `navigate(to)` ve `render()` ile yönetiliyor.
- `index.html` 68 dış JS, 230 dış CSS bağlantısı içeriyor. Ekranlar farklı tarihlerde eklenmiş CSS katmanlarından etkileniyor.
- Reels: `buchee-reels-phase4-20261103.css`, `.pati-reels-viewport`, `.pati-reel-item`, video oynatma ve `IntersectionObserver` mantığı.
- Mesajlaşma: `buchee-messages-phase3-20261103.css`, sesli mesaj kayıt akışı `startDmRecord()` ve `MediaRecorder` / `getUserMedia`.
- Ana akış: `buchee-feed-instagram-geometry-20261102.css`; gönderi izleme için `IntersectionObserver`.
- Profil: profil sayaçları `renderProfileCounts()` ile güncelleniyor.
- Bu denetim kod tabanlıdır; canlı mobil tarayıcı testi veya Supabase veritabanı incelemesi yapılmadı.

## Riskler
- Farklı CSS dosyalarında aynı ekrana ilişkin çakışan kurallar.
- `app.js` içinde birbirine bağlı büyük ekran ve işlem akışları; büyük refaktörler regresyon riski taşır.
- Mikrofon izni, mobil video ve mesaj gönderimi gibi tarayıcıya bağlı işlemler gerçek cihazda sınanmalı.
- Mevcut takip, beğeni, yorum, kaydetme ve mesaj akışları bozulmamalı.

## Aşamalı plan
1. **Aşama 1 (bu PR):** Erişilebilirlik için kullanıcı işletim sisteminde azaltılmış hareket seçeneğini açmışsa sosyal ekranlarda yalnızca dekoratif animasyonları azalt. Veri ve olay işleyicilerine dokunma.
2. **Aşama 2:** Mesajlaşma: izin reddi, ses kaydı iptali, mesaj isteği, çevrimiçi durumu; Supabase şeması ve yetki kuralları ayrıca incelenmeli.
3. **Aşama 3:** Reels: çift dokunma/beğeni, kaydırma, oynatma durumunun korunması, hata ve ağ kesintisi senaryoları.
4. **Aşama 4:** Akış ve profil: içerik sıralaması, sayfalama, profil gönderi/Reels arasında devamlı gezinme, filtreler.
5. **Aşama 5:** Keşfet, arama ve bildirim tercihleri; ürün kararları ve ölçümlerle küçük PR'lar.

## Doğrulama kapıları
- Kod dosyaları ve referansları GitHub'dan tekrar okunmalı.
- Statik denetim / mevcut CI kontrolleri başarılı olmalı.
- iOS Safari ve Android Chrome'da ana akış, Reels, profil, takip, mesaj, sesli mesaj, bildirimler manuel test edilmeli.
- Canlıya yalnızca inceleme ve testten sonra alınmalı.
- Bu PR, kullanıcı verisi, Supabase veya üretim `main` dalını değiştirmez.

## Aşama 1'in sınırı
Bu PR yalnızca `prefers-reduced-motion: reduce` seçili cihazlarda sosyal ekranların bazı dekoratif animasyonlarını kısaltır. Video oynatımını, içerik yüklemesini veya Reels kaydırma mantığını değiştirmez. Bu küçük iyileştirme tüm sosyal özelliklerin tamamlandığı anlamına gelmez.
