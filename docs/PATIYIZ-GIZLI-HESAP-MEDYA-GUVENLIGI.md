# Patiyiz gizli hesap medya güvenliği (31.10.2026)

## Yapı
- Yeni gönderiler, Reels videoları, kapakları ve standart hikâyelerin foto/video dosyaları, hesabın o an açık veya gizli olmasından bağımsız şekilde `patiyiz-private-posts` özel depoya yüklenir.
- Veritabanında açık URL yerine `patiyiz-private-posts:<owner-id>/<object-id>.<ext>` kaydedilir.
- Gönderiler ve hikâyeler sunucu tarafındaki mevcut RLS politikasınca erişilebilir olduğunda medya depolama politikası süreli görüntüleme bağlantısı verir.
- Dosyanın ait olduğu hesapla gönderi sahibinin aynı olması zorunludur. Engellenen kullanıcı veya onaysız takipçi için bağlantı oluşturma isteği reddedilir.
- Hikâyeye gönderi paylaşma, kaynağın geçici URL'sini kopyalamaz; `shared_post_id` üzerinden gerçek yetkiyle gösterir.
- Başka hesaba ait özel medya bağlantısı veya dışarıdan gelen herkese açık medya URL'si gizli hesap içeriği olarak yazılamaz.
- Gizli hesap aktifleştirilmeden önce eski herkese açık gönderi ve hikâyeler kontrol edilir. Eski dosyalar varsa kullanıcı oturumu doğrulanmış `patiyiz-secure-account-media` fonksiyonu bunları güvenli depoya kopyalar, veritabanını günceller ve eski herkese açık dosyaları siler. İşlem yeniden denenebilir.
- Hesap silme fonksiyonu özel gönderi deposunu da temizler.

## Gerçek cihaz test matrisi (canlı veri silmeden ayrı test hesaplarıyla)
1. A açık hesap gönderi/reels/hikâye oluşturur: B giriş yapmışken görebilir; anonim bağlantı görüntüleyemez.
2. A gizliye geçer: mevcut fotoğraf ve video görünür, yalnız A ve onaylı B görebilir.
3. C takip isteği gönderir ama onaylanmaz: post/stories kayıtları ve doğrudan medya isteği reddedilir.
4. B takipten çıkarılır veya engellenir: yeni süreli bağlantı oluşturamaz; uygulama oturumunu yenilediğinde içerik görünmez.
5. A özel gönderi paylaşır: video ve kapak URL'leri veritabanında özel referans olarak saklanır.
6. A gönderiyi hikâyesine ekler: orijinal özel içeriğin başkasına açık kopyası oluşturulmaz.
7. A eski açık hesap gönderileriyle gizliye geçer: fotoğraf/video taşınması sırasında hata olursa hesap açık kalır; korunmayan dosyayla gizlilik iddiası yapılmaz.
8. iOS PWA ve Android Capacitor: yükleme, 5 dakika sonra video oynatma, zayıf internet ve oturum değiştirme test edilir.

## Bilinen sınırlar / operasyon
- Önceden başkalarının cihazına indirilmiş fotoğraflar geri alınamaz. Eski herkese açık URL'ler silinse de tarayıcı/CDN önbelleğinde geçici kopyalar bulunabilir.
- Süreli imzalı bağlantılar (şu an 300 saniye) bağlantıyı bilen kişiye süresi boyunca erişim sağlar. CDN önbelleği bazı durumlarda süre bittikten sonra da yanıt verebilir; önceden paylaşılan URL'ler anında iptal edilemez.
- Gerekli sıkı iptal için medya kaynağını silmek/taşımak ve mümkünse CDN önbelleğini temizlemek gerekir. Sadece takipten çıkarma işlemi mevcut imzalı URL'yi geri çekmez.
- Supabase resmi kaynaklar: https://supabase.com/docs/guides/storage/serving/downloads ve https://supabase.com/docs/guides/storage/cdn/smart-cdn
- Sunucu taşıma fonksiyonu hata halinde gizliliği etkinleştirmez; `patiyiz_private_media_migration_manifest` kaydı tekrar denemede temizlik yapılabilmesi için sunucuya özel tutulur.
- Moderasyon ve yönetici araçlarında medya önizlemeleri için yetkili, denetlenebilir ayrı akış gerekebilir. Bu izin verilmeden doğrudan gizli medya deposunu yöneticiye açmayın.

## Hazırlık durumu
- DB politikaları ve fonksiyon dağıtımı: tamamlandı.
- Web/Android kaynak kod değişiklikleri: PR #202.
- Gerçek hesapla yetkisiz görüntüleme ve eski medya geçişi: iki hesapla ayrıca doğrulanmalı.
