# Buchee Blog 1.0 — güvenli ilk sürüm

## Oluşturma menüsü
Mevcut seçenekler: Gönderi (Instagram tarzı), Twit (X tarzı), Hikâye, Reels, Soru & Cevap. Altıncı seçenek: **Blog**. Mevcut soru-cevap özelliği güçlü etkileşim seçeneği olarak korunur.

## Uygulanan
- Başlık (5–140 karakter) ve metin (30–12.000 karakter) alanları.
- Yayınlama, mevcut Supabase `posts` ekleme akışını kullanır. Yeni tablo/RLS değişikliği yok.
- İçerik `post_format='text'` ve `body` alanında `[[BUCHEE_BLOG_V1]]\nBaşlık\nYazı` biçiminde saklanır. Bu bir geçiş çözümüdür; ayrı blog tablosu ve SEO bağlantıları sonraki aşama için değerlendirilmelidir.
- Ana akışta başlık, özet ve `Yazının tamamını oku` eylemi.
- Geniş modal okuyucu, mobilde tam ekran; paragraflar korunur.
- Mevcut düzenleme akışı blog başlığını ve yazısını ayrı alanlarda açar.
- Tüm kullanıcı metni HTML'e eklenmeden önce `esc()` ile kaçışlanır.
- Diğer gönderi, Reels, hikâye, soru ve mesaj gönderimi işleyicileri korunur.

## Bilinen sınırlamalar
- Gönderi veri modelini kullandığı için bloglar henüz ayrı arama, kategori, kapak resmi veya SEO sayfası içermez.
- Bloglar, mevcut metin gönderisi sayfalaması/erişim izinleri kapsamındadır.
- Veritabanı `posts.body` uzunluk kısıtı doğrulanmadı; 12.000 karakter sınırının uçtan uca test edilmesi gerekir.
- Mobil tarayıcı ve gerçek Supabase yayınlama testleri tamamlanmadı.

## Yayına alma kontrol listesi
1. JS ayrıştırma ve statik dosya bağlantıları.
2. iPhone Safari/Android Chrome oluşturma menüsünde altı seçenek ve taşma kontrolü.
3. Başlık/yazı doğrulama; boş, kısa, uzun ve özel karakterli içerikler.
4. Yayınlama sonrası yeniden yüklemede başlık/özet ve tam okuyucu.
5. Kendi blogunu düzenleme; mevcut Twit/Reels/Hikâye/Soru & Cevap regresyonu.
6. Yetkisiz düzenleme, XSS, engellenmiş kullanıcı ve Supabase RLS testleri.
7. Kontroller geçince ana dala birleştirme ve canlı site doğrulaması.
