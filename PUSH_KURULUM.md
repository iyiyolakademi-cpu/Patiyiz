# Patiyiz push bildirimleri - kurulum
Bu dosyalar GitHub'a kaydedildi ancak **telefon push sistemi otomatik etkinleşmez**.
1. Supabase SQL Editor'da `supabase_canli_mesaj_push.sql` dosyasını çalıştır.
2. Supabase Realtime ayarlarında `messages` ve `notifications` yayınını doğrula.
3. VAPID anahtarları oluştur (bir public, bir private). Public anahtar tarayıcıya verilir; private anahtarı **ASLA GitHub'a koyma**.
4. Supabase Edge Functions'a `supabase/functions/patiyiz-push/index.ts` içeriğini `patiyiz-push` adıyla dağıt. JWT doğrulamayı bu webhook için kapat (secrets ile doğrulanır).
5. Edge function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (örn. mailto:admin@alanadi.com), `PUSH_WEBHOOK_SECRET` (güçlü rastgele değer). Secret değerlerini paylaşma.
6. Database Webhooks > notifications > INSERT: Edge Function endpointine POST; `x-patiyiz-webhook-secret` başlığına aynı webhook secretını koy.
7. `push-config.js` dosyasına **yalnızca VAPID_PUBLIC_KEY** değerini yaz.
8. Telefonda Patiyiz > Bildirimler > Telefon bildirimlerini aç'a basıp izin ver.
9. Android Chrome'da web push; iOS 16.4+ üzerinde Safari > Ana Ekrana Ekle üzerinden açılan web uygulaması ve bildirim izni gereklidir. Özel/gizli modda çalışmayabilir.
10. Gerçek cihazda iki hesapla beğeni, yorum, takip ve mesaj bildirimlerini test et.
Push teslimatı cihaz, işletim sistemi, ağ, izinler ve tarayıcı ayarlarına bağlıdır; garanti değildir.
