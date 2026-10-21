# Patiyiz — yayın ve kurulum rehberi

Bu proje statik HTML/CSS/JavaScript ön yüzü + Supabase Auth/Database/Storage kullanır.
**NOT:** Bağımsız canlı backend kurulumu olmadan yalnızca ön yüz kodudur; gerçek e-posta ve veritabanı işlemleri için Supabase hesabı ve yapılandırma gerektirir.

## 1. GitHub'da yeni depo

1. https://github.com/new adresini açın.
2. Repository name: `patiyiz` (isteğe bağlı başka bir ad kullanabilirsiniz).
3. Public seçin (GitHub Free ile GitHub Pages için).
4. Create repository.
5. Depoya girmeden önce aşağıdaki Supabase adımını tamamlayabilirsiniz.

## 2. Supabase projesi ve tablolar

1. https://supabase.com/dashboard -> New project -> proje adı Patiyiz, güçlü bir veritabanı parolası seçin.
2. SQL Editor > New query. `supabase_kurulum.sql` dosyasını açın, içeriği kopyalayıp Run'a basın. Yeni/boş proje için hazırlanmıştır.
3. Authentication > Providers > Email bölümünde Email girişini açın ve Confirm Email doğrulamasını etkin tutun.
4. Authentication > URL Configuration bölümünde `Site URL` ve `Redirect URLs` olarak GitHub Pages adresini ekleyin. Örneğin depo `patiyiz` ise ve GitHub kullanıcı adınız `iyiyolakademi-cpu` ise `https://iyiyolakademi-cpu.github.io/patiyiz/`.
5. Project Settings > API Keys'te **publishable key** bulun. Project URL için Project Settings > Data API (arayüz değişirse Project URL alanı) kullanın.

## 3. config.js dosyasını düzenleyin

```
window.PATIYIZ_CONFIG = {
  supabaseUrl: 'https://PROJE_ID.supabase.co',
  supabasePublishableKey: 'sb_publishable_...'
};
```

Yalnızca `publishable` veya eski tip `anon` anahtarını kullanın. **service_role / secret / veritabanı parolası / SMTP parolası GitHub'a yüklenmez!**

## 4. GitHub Pages'e yayın

1. Depoya girin -> Add file -> Upload files. ZIP'in içindeki `index.html`, `app.js`, `style.css`, `knowledge.js`, `config.js`, `.nojekyll` ve isteğe bağlı `README_KURULUM.md` ile `supabase_kurulum.sql` dosyalarını **ZIP olarak değil, tek tek** yükleyin.
2. Commit changes.
3. Settings -> Pages -> Build and deployment -> Source: Deploy from a branch.
4. Branch: `main`, folder: `/(root)` -> Save.
5. Pages adresi örnek: `https://iyiyolakademi-cpu.github.io/patiyiz/`.
6. E-posta ile kayıt olmayı, gelen doğrulama e-postasını, giriş/çıkışı, gönderi ve yorumları iki farklı test hesabıyla sınayın.

## 5. Kayıt e-postaları konusunda kritik bilgi

Supabase varsayılan e-posta göndericisi herkese açık canlı bir sistem için uygun değildir ve doğrulama e-postaları çoğu yeni adrese gönderilmez. **Gerçek kullanıcı kayıtlarını açmadan önce** Authentication > SMTP Settings üzerinden Resend, Brevo, Postmark vb. bir sağlayıcı ile özel SMTP yapılandırılması gerekir. SMTP şifresi yalnızca Supabase panelinde tutulmalıdır, frontend'e konulmaz.

## Şu anda içerilenler

- E-posta ile kayıt/giriş, doğrulama, şifre sıfırlama, çıkış
- Kullanıcı profili, hayvan profili, fotoğraf yükleme
- Sosyal gönderi, beğeni, yorum, kaydetme, takip
- Keşfet ve topluluk soru-cevap
- Gerçek veritabanında özel mesajlar
- Kayıp hayvan ilanları ve bakım takvimi
- Bildirim listesi ve içerik şikâyeti / kullanıcı engelleme
- 66 rehberlik Hayvan Bilgi Merkezi ve kaydetme

## Kısıtlamalar ve yayın öncesi gereklilikler

- Supabase hesap ve yayın bilgileri olmadan uçtan uca çevrimiçi test yapılamaz. Her özellik iki farklı hesapla test edilmeli.
- Bildirimler ve mesajlar şu sürümde sayfa yenilenince güncellenir; canlı anlık senkronizasyon henüz eklenmedi.
- Bakım takvimi otomatik e-posta/SMS hatırlatmaz.
- Topluluk içerik şikâyetleri veritabanına kaydedilir fakat moderatör yönetim paneli henüz yok; geniş kitleye açılmadan önce moderasyon süreci gerekir.
- Hayvan bilgilerinin bazıları genel rehberdir, veteriner tavsiyesinin yerine geçmez. İçerik uzman incelemesi için plan yapın.
- Kullanıcı verileri için gizlilik politikası, KVKK metinleri, silme süreci, yedekleme, hız sınırları, spam kontrolü, kötüye kullanım önlemleri ve operasyonel denetim tamamlanmalıdır.
- Tarayıcı üzerinden yapılabilen prototip testleri canlı Supabase entegrasyon testi yerine geçmez.

## Marka ve dosya notu

Bu paket **Patiyiz** markasını kullanır. CSS sınıf isimlerindeki `.pati-*` parçaları teknik seçicidir; görsel marka metni değildir. Bu sürüm yeni bir Supabase kurulumu için `patiyiz-media` depolama alanını oluşturur. Eğer daha önce `pati-media` kullanan canlı bir sistem kurduysanız veri taşıma planı olmadan yeni SQL dosyasını mevcut veritabanınızda çalıştırmayın.
