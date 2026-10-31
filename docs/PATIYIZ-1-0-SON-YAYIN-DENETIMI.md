# PATİYİZ 1.0 — Yayın kapıları ve doğrulama (31.10.2026)

**Karar: Kapalı test uygun; genel lansman ve mağaza dağıtımı henüz onaylı değil.**

## Otomatik doğrulananlar
- GitHub main: gizli medya değişikliği PR #202 ve kalite geliştirmesi PR #203.
- GitHub Pages dağıtımı, genel JavaScript/regresyon testleri ve özel medya testleri başarılı.
- Supabase: özel gönderi depolama alanı ve sahiplik/desteklenen görüntüleme RLS politikası mevcut; yeni medya erişim bağlantıları süreli.
- Güvenli eski medya taşıma fonksiyonu v4 dağıtıldı; bir eksik pets taşıma listesi hatası düzeltildi.
- Mesajlarda özel dosya bağlantı hatası ve zaman aşımı için tekrar deneme kontrolleri geliştiriliyor.
- **Bunlar gerçek iki hesapla yetkisiz erişim veya eski medyaların başarıyla taşındığına dair kanıt değildir.**

## Ayrı doğrulanması gerekenler
Sıralama: (1) Birbirini takip etmeyen iki gerçek hesapla post, Reels, hikâye, pet fotoğrafı ve Storage signed-url yetki testi; (2) açık hesaptan gizliye geçişte eski dosyaların korunarak taşınması; (3) Android ve iOS'ta kayıt, giriş, mesaj, ses ve medya; (4) sağlık hatırlatmaları, PatiCoin tekrarlı/tam zamanlı ödüller ve ilanlar; (5) moderasyon, hesap silme, push, yükleme başarısızlığı; (6) KVKK/veri sorumlusu ve destek, gerçek iletişim bilgileri; (7) AAB, Play Console, TestFlight ve mağaza beyanları.

## Supabase denetimi
- 17 tablo RLS etkin ancak politika yok: bunları otomatik açmak güvenlik açığı yaratabilir. Erişim gereksinimleri tek tek incelenmeli. Birçoğu yalnızca sunucu tarafından yazılan sayaç, admin veya günlük tablolarıdır.
- 48 `SECURITY DEFINER` fonksiyonu, authenticated rolü ile çağrılabilir. **Uyarı otomatik olarak açık değildir.** İncelenen yetki/oturum kuralları korunarak ayrı fonksiyon bazlı abuse testleri yapılmalı. Özellikle `patiyiz_active_top_five` görünürlük/mahremiyet incelemesi gerektirir.
- Leaked Password Protection özelliği Supabase Auth panelinde kapalı görüldü; panelde hesap sahibi tarafından etkinleştirilmeli.
- Mevcut public post/video depolama alanındaki eski dosyaları test için silme veya otomatik taşıma yapılmadı.

## Hukuki ve mağaza bilgileri
`privacy.html` ve `terms.html` üzerinde işletmeci/veri sorumlusu ve destek bilgileri henüz kesinleştirilmemiş durumda. Goodvanta A.Ş. henüz tescil edilmediyse böyleymiş gibi göstermeyin. Yalnız doğrulanmış gerçek kişi veya tüzel kişi bilgilerini kullanın.

## Release gate komutu
`node scripts/patiyiz-release-audit.mjs` — mevcut durum
`node scripts/patiyiz-release-audit.mjs --require-ready` — tamamlanmamış kapılarda kod 1
`node scripts/patiyiz-release-audit.mjs --json` — makine tarafından okunabilir sonuç

`docs/patiyiz-1-0-launch-evidence.json` içindeki her manuel kapı yalnızca gerçek tarihli doğrulamadan sonra `true` yapılmalıdır. Otomatik testler bu dosyayı kendiliğinden onaylamaz.
