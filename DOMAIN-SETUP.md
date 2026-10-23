# Patiyiz.com alan adı geçişi

Bu dosya **kurulum planıdır**, DNS ve GitHub Pages doğrulaması tamamlanmadan "canlıya alındı" anlamına gelmez.

## Hedef
- Asıl adres: `https://patiyiz.com/`
- `https://www.patiyiz.com/` → asıl adrese GitHub Pages tarafından yönlendirilecek
- Eski Pages adresi: `https://iyiyolakademi-cpu.github.io/Patiyiz/`
- GitHub repo: `iyiyolakademi-cpu/Patiyiz`
- Mevcut Supabase projesi korunur, veri taşınmaz

## DNS (alan adının gerçekten yetkili DNS yönetim panelinde)
Kayıtların sahip olduğu ad ve tür **ayrı ayrı** girilmeli:

| Tür | Ad / Host | Değer | TTL |
|---|---|---|---|
| A | @ | 185.199.108.153 | Otomatik veya 3600 |
| A | @ | 185.199.109.153 | Otomatik veya 3600 |
| A | @ | 185.199.110.153 | Otomatik veya 3600 |
| A | @ | 185.199.111.153 | Otomatik veya 3600 |
| CNAME | www | iyiyolakademi-cpu.github.io | Otomatik veya 3600 |

İsteğe bağlı IPv6 için @ AAAA kayıtları:
`2606:50c0:8000::153`, `2606:50c0:8001::153`,
`2606:50c0:8002::153`, `2606:50c0:8003::153`.

Var olan **çakışan** @ A / AAAA ve www CNAME/A kayıtları dikkatle kontrol edilip, yalnız web sitesine ait olanlar değiştirilmelidir. E-posta MX, SPF, DKIM, DMARC veya doğrulama TXT kayıtlarını silmeyin. Wildcard (`*`) kullanmayın.

## Kesintisiz geçiş sırası
1. Alan adının DNS yetkili panelini belirleyin ve varsa gereksiz park sayfası kayıtlarını kontrol edin.
2. Domain sahipliğini GitHub Pages hesabı üzerinden doğrulamak güvenlik için önerilir.
3. DNS değişiminden önce `CNAME` dosyası ve kök `/` PWA düzenlemelerini içeren hazırlık PR'sini `main`e alın. **Bu işlem mevcut github.io Pages adresini yeni alan adına yönlendirebilir.** Bu yüzden DNS hazırlıkları tamamlandıktan hemen sonra yapılmalıdır.
4. GitHub repo **Settings → Pages → Custom domain** alanında `patiyiz.com` kayıtlı olmalı. Pages kaynağı bir branch ise `main / (root)` ve `CNAME` geçerli. GitHub Actions ile deployment özel olarak yapılıyorsa GitHub Pages ayarı ayrıca yapılmalı; `CNAME` tek başına yetmez.
5. Yukarıdaki A ve www CNAME kayıtlarını alan adı DNS panelinde kaydedin.
6. DNS yayılımı ve GitHub Pages sertifikası hazır olunca **Enforce HTTPS** etkinleştirin. Yayılım 24 saate kadar sürebilir; HTTPS hazır olmadan `https://` zorlamayın.
7. Supabase → Authentication → URL Configuration:
   - **Site URL:** `https://patiyiz.com/`
   - **Redirect URLs:** `https://patiyiz.com/**` (veya kullanılan kesin rotalar), `https://www.patiyiz.com/**` (gerekirse) ve geçiş boyunca `https://iyiyolakademi-cpu.github.io/Patiyiz/**`.
   - Kayıt e-posta doğrulama ve şifre yenileme akışlarını test edin.
8. `https://patiyiz.com` ve `https://www.patiyiz.com` erişimi, login, medya, hikâye, Reels, bildirim, PWA "Ana Ekrana Ekle" davranışını gerçek telefonda test edin.
9. Kullanıcılara yeni adresin farklı **origin** olduğunu; oturumu yeniden açmaları, ana ekran kısayolunu tekrar eklemeleri ve bildirim izni vermeleri gerekebileceğini bildirin.

## GitHub ve Supabase ayarları
- GitHub Pages: https://github.com/iyiyolakademi-cpu/Patiyiz/settings/pages
- Supabase URL Configuration: https://supabase.com/dashboard/project/tqnvvrgrsxrvzxbjbsgl/auth/url-configuration
- Resmî GitHub yönergesi: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- Resmî Supabase yönergesi: https://supabase.com/docs/guides/auth/redirect-urls

## Teknik detay
`manifest.webmanifest` içinde eski GitHub Pages proje yolu `/Patiyiz/` yerine `/` tanımlanır; uygulamadaki medya, CSS, service worker ve JSON dosyaları göreli yollarla çağrıldığından kök alan adında açılabilir. `CNAME`, SEO canonical, robots.txt ve sitemap.xml alan adı kesimiyle eşzamanlı aktifleştirilmelidir.

**Durum: hazırlık PR'si. Gerçek DNS veya HTTPS doğrulaması yapılmadı.**
