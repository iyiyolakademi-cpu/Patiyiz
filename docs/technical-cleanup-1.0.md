# Buchee — Teknik Temizlik 1.0

## Kapsam ve mevcut durum
- Depo: `iyiyolakademi-cpu/Patiyiz`, temel dal: `main`.
- Denetlenen: `index.html`, `app.js` ve üst menüye müdahale eden dört CSS dosyası.
- `index.html`: 72.576 karakter; 11 satır içi `style` bloğu; 73 `script` etiketi (68 dış JS + 5 satır içi); 230 dış CSS.
- `app.js`: 9.617 satır, yaklaşık 813 KB kaynak metin.
- HTML'de `lang="tr"`, viewport ve kritik `id` alanları bulundu. Statik incelemede tekrarlanan `id` bulunmadı.
- Aynı üst menü bileşenlerine etki eden çok sayıda tarihli stil dosyası bulunuyor. Sırf dosya sayısı tek başına arıza kanıtı değildir; risk, aynı seçicilerin farklı katmanlarda tanımlanmasıdır.
- Önceki mobil ekran görüntüleri üst menüde siyah butonların farklı boyutlandığını gösterdi; gerçek iOS tarayıcı testleri henüz yapılmadı.

## Değişiklik güvenliği
1. **Üretim dalını koru.** Önce ayrı dal + taslak PR, sonra test ve inceleme.
2. **Ölç ve kaydet.** iOS Safari ve Android Chrome ekran görüntüleri, kritik kullanıcı akışları, ağ ve JS hata kayıtları.
3. **Küçük kapsamlı değişiklik.** Her PR bir bileşen veya davranış; eski CSS/JS kaldırmadan önce hangi ekranda kullanıldığını doğrula.
4. **Regresyon kontrolü.** Giriş/kayıt, ana akış, filtreler, takip, profil, gönderi, Reels, mesaj ve ses kaydı, bildirimler, ayarlar, ödüller.
5. **Geri dönüş.** Sorun halinde tek PR geri alınabilmeli; veri tabanı şemasına dokunulursa ayrı yedek ve geçiş planı gerekir.

## Aşama 1 — Tamamlanan hazırlık
- Bağımsız bakım dalı oluşturuldu.
- `scripts/check_frontend_integrity.py`: HTML dil/viewport/kimlik, tekrar eden JS-CSS bağlantıları, eksik yerel varlıklar ve kritik işaretleyiciler için bağımlılıksız statik kontrol.
- `.github/workflows/frontend-integrity.yml`: PR ve elle tetiklenebilir kontrol.
- Bu aşama kullanıcı arayüzü, veri tabanı ve üretim davranışını değiştirmez.

## Aşama 2 — Sıradaki kontrollü refaktör
- Önce üst menü CSS seçicilerinin kullanım haritası ve tarayıcıdaki hesaplanmış stil ölçümleri.
- Tek ortak header bileşeni; eşit kutu ölçüleri, beyaz simgeler ve dokunma hedefleri.
- Eski kuralları, yalnızca ekran karşılaştırması ve testten sonra kaldır.
- Mesaj izin hataları ve mikrofon akışında iOS Safari regresyon testleri.

## Aşama 3 — Daha sonra
- Stil ve betik dosyalarını kullanım alanlarına göre birleştir.
- Görsel karşılaştırma testleri, erişilebilirlik, performans bütçesi.
- Supabase sorgu/abonelik ve depolama denetimini ayrı planla; veri değişikliklerini bu PR'a karıştırma.

## Test durumu ve sınırlamalar
- GitHub kaynakları okundu ve yeni dosyalar bakım dalına yazıldı.
- Temel HTML kimlikleri, Türkçe dil ve viewport kaynak üzerinde kontrol edildi.
- **CI çalışması, tüm yerel dosyaların varlığı, iPhone görünümü, Supabase işlemleri ve canlı site bu aşamada henüz doğrulanmadı.**
- Kontroller başarısız olursa sonuç bir başlangıç bulgusu olarak ele alınmalı; testleri susturmak için kod değiştirilmemeli.
