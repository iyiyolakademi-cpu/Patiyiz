# Buchee Premium Mesajlaşma — aşama 1

## Mevcut kodda doğrulanan özellikler
- Mesaj listesi `.chat-history .bubble-chat[data-message-id]` olarak üretiliyor.
- Gönderenin kendi mesajları `.mine` sınıfına sahip.
- `.pati-dm-typing-indicator` ve Supabase broadcast `typing` kanalı zaten var; yeni kanal oluşturulmadı.
- `startDmRecord()` mikrofon izni, `MediaRecorder`, kayıt durdurma ve dosya yükleme akışlarını içeriyor.
- Ses kaydı kontrolleri `.pati-dm-rec-state` içinde; gönder ve iptal eylemleri korunuyor.
- Gerçek çevrim içi kullanıcı durumunu gösteren, gizlilik tercihlerini uygulayan bir presence servisi doğrulanmadı.

## Bu dalda yapılan değişiklikler
- Yeni gönderilen **kendi** mesajları, yalnızca mevcut sohbetin mesaj kimliği listesine sonradan eklendiklerinde hafif kayarak görünür.
- Eski mesajlar ve sohbet değiştirildiğinde yeniden yüklenen geçmiş mesajlar animasyonla gösterilmez.
- Var olan gerçek zamanlı yazıyor göstergesine üç noktalı animasyon ve daha sade görünüm eklenir.
- Ses kaydı sırasında yedi çubuklu **dekoratif hareket göstergesi** görünür. Bu sürüm gerçek mikrofon ses seviyesini ölçmez.
- Mesaj baloncuklarının köşeleri ve gölgeleri sadeleştirilir; gönder yeşil, iptal kırmızı görünür.
- Hareketi azaltma tercihi varsa animasyonlar kapatılır.
- Supabase, mesaj gönderimi, mikrofon kayıt/iptal akışları ve sunucu veri modeli değiştirilmez.

## Çevrim içi durum — sonraki güvenli aşama
Gerçek presence için önce oturum kimliği, Supabase Realtime kanal yetkileri, kullanıcının çevrim içi görünme tercihi, görünmez modu, bağlantı kopma/yeniden bağlanma ve birden fazla cihaz senaryoları incelenmeli. Bu doğrulanmadan yeşil nokta eklenmez.

## Yayına alma koşulları
- PR kalite kontrolleri başarılı olmalı.
- iPhone Safari ve Android Chrome: mesaj gönderimi, yeni mesaj animasyonu, sohbet değiştirme, yazıyor bildirimi, mikrofon izin reddi, kayıt iptali ve sesli mesaj gönderimi test edilmeli.
- Performans, erişilebilirlik ve eski mesajlarda animasyon olmaması doğrulanmalı.
- Bu dal ana dala birleştirilmedikçe canlı site değişmez.
