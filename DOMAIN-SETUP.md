# Buchee Social — bucheesocial.com alan adı geçişi (4 Kasım 2026)

Bu belge yeni alan adını mevcut Buchee Social uygulamasına geçirmek için kontrol listesidir. **GitHub kodunun hazırlanması, DNS ve GitHub Pages yapılandırmasının tamamlandığı anlamına gelmez.**

## Hedef
- Ana web sitesi: https://bucheesocial.com/
- www.bucheesocial.com → https://bucheesocial.com/ yönlendirmesi
- Depo: iyiyolakademi-cpu/Patiyiz, mevcut Supabase projesi korunur.
- Eski patiyiz.com alan adı geçiş sırasında kendi başına yeni adrese yönlenmez. Eski site için 301 yönlendirmesi ayrıca eski alan adının DNS/hosting sağlayıcısında yapılandırılmalıdır.
- Android paket kimliği `com.patiyiz.app` değiştirilmez: Play Console'daki mevcut uygulama kimliği korunur.

## GitHub Pages (yapılması gereken)
1. GitHub Pages yayın kaynağının branch mi GitHub Actions mı olduğunu Settings → Pages'ten kontrol edin.
2. Settings → Pages → Custom domain alanına **bucheesocial.com** yazıp kaydedin. **GitHub Actions ile yayın yapılıyorsa depodaki CNAME dosyası tek başına yeterli değildir.**
3. GitHub kullanıcı ayarları → Pages'te bucheesocial.com alan adını TXT doğrulamasıyla doğrulayın (güvenlik için önerilir).
4. DNS kayıtları doğrulandıktan ve sertifika çıkarıldıktan sonra **Enforce HTTPS** seçeneğini etkinleştirin.

## DNS (yalnız bucheesocial.com alan adı yetkili DNS panelinde)

| Kayıt | Host | Değer |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | iyiyolakademi-cpu.github.io |

TTL: Otomatik ya da 3600. Mevcut web park A/AAAA kayıtlarıyla çakışma olmadığından emin olun. **MX, SPF, DKIM, DMARC, TXT** e-posta/doğrulama kayıtlarını silmeyin. Wildcard (*) tanımlamayın. GitHub Pages DNS yayılımı 24 saate kadar sürebilir.

## Supabase Auth: mutlaka kontrol edin

https://supabase.com/dashboard/project/tqnvvrgrsxrvzxbjbsgl/auth/url-configuration

- Site URL: **https://bucheesocial.com/**
- Redirect URLs: üretim için **https://bucheesocial.com/**, ihtiyaç duyulan yönlendirme yolları ve geçici olarak eski adres. Uygulama birden fazla rota kullanıyorsa **https://bucheesocial.com/** yanında ilgili kesin rotaları tanımlayın.
- Geçiş için gerekirse **https://patiyiz.com/** ile mevcut GitHub Pages test adresini izinli listede tutun.
- E-posta doğrulaması, giriş, şifre sıfırlama ve oturum geri dönüşünü yeni kök adreste gerçek cihazdan test edin.
- Supabase projesi, veritabanı, kullanıcılar ve API anahtarları değişmez; hesabın oturum çerezi yeni alan adına otomatik taşınmaz.

## Android, PWA ve mağaza

- Android TWA manifestinin web hostu ve kaynak URL'leri yeni domaine taşındı. `.well-known/assetlinks.json` yeni domaine de yayımlanmalı ve gerçek Play App Signing SHA-256 doğrulanmalı.
- Native Capacitor paket kimliği aynı kalır, App Links ve doğrulama/şifre sıfırlama tarayıcı URL'leri yeni domaindir.
- Mevcut APK/AAB kendiliğinden güncellenmez. Kod değişiminden sonra yeni paket üretip Play Console uyumluluğunu test edin; mevcut Play packageId ve üretim imzasını koruyun.
- iPhone ana ekrana eklenen eski PWA eski origin'e bağlı kalabilir; yeni siteyi tekrar ana ekrana eklemek gerekebilir.
- Yeni origin üzerinde service worker, simgeler, bildirimler, kayıt/giriş, Reels, mesajlaşma, medya yükleme ve hesap silme kontrolleri yapılmalı.
- Eski `patiyiz.com` için ayrı kalıcı 301 yönlendirmesi yapılana kadar bağlantıların kendiliğinden çalışacağı varsayılmamalı.

## Yayına alma sırası
1. Yeni domaini GitHub kullanıcı hesabında doğrula (TXT).
2. Pages Custom domain ayarını güncelle; DNS kayıtlarını yeni domain paneline ekle.
3. Uygulama kodu geçiş PR'sini `main`e birleştir ve Pages dağıtımını doğrula.
4. HTTPS hazır olduğunda `https://bucheesocial.com/` ve `https://www.bucheesocial.com/` adreslerini kontrol et.
5. Supabase Site URL/Redirect URLs değerlerini tamamla; gerçek cihazda hesap ve içerik testleri yap.
6. Eski adrese erişim gerekiyorsa bağımsız 301 yönlendirmeyi yapılandır ve Android yayınını ayrıca güncelle.

GitHub Pages: https://github.com/iyiyolakademi-cpu/Patiyiz/settings/pages
Resmî GitHub: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
Supabase: https://supabase.com/docs/guides/auth/redirect-urls
