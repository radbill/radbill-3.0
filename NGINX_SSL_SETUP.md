# Panduan Nginx & SSL RadBill (Domain Utama dan Wildcard `{slug}`)

Panduan ini ditujukan untuk RadBill versi baru yang dapat diakses melalui domain utama maupun subdomain tenant:

- `example.com` -> aplikasi RadBill tanpa slug (`127.0.0.1:8080`)
- `{slug}.example.com` -> aplikasi RadBill untuk organisasi tersebut (`127.0.0.1:8080`)

Contoh: aplikasi utama diakses melalui `https://example.com`, sedangkan organisasi dengan slug `maju-jaya` diakses melalui `https://maju-jaya.example.com`.

> Ganti seluruh `example.com` di dokumen ini dengan domain utama Anda. `{slug}` bukan teks literal pada DNS atau Nginx; nilainya berasal dari slug organisasi di RadBill.

## Cara kerja domain utama dan wildcard tenant

Record DNS `@` mengarahkan domain utama ke VPS, sedangkan wildcard `*.example.com` membuat semua subdomain satu tingkat mengarah ke VPS yang sama. Nginx meneruskan hostname asli melalui header `Host`. Jika hostname mempunyai subdomain, RadBill mengambil label pertama sebagai slug dan memeriksa apakah organisasi tersebut ada, aktif, dan tidak diarsipkan.

Dengan demikian:

- `example.com` membuka aplikasi tanpa slug pada hostname;
- `maju-jaya.example.com` mencari organisasi dengan slug `maju-jaya`;
- `client-baru.example.com` langsung dapat dipakai setelah organisasi dengan slug tersebut dibuat, tanpa menambah konfigurasi Nginx;
- slug yang tidak terdaftar tetap sampai ke RadBill, tetapi RadBill akan mengembalikan `404 tenant tidak ditemukan`;
- wildcard hanya digunakan untuk satu tingkat subdomain. Gunakan `{slug}.example.com`, bukan `{slug}.client.example.com`.

Endpoint publik yang membutuhkan konteks tenant akan memakai `DEFAULT_ORG_ID` ketika diakses melalui `example.com`. Pastikan variabel tersebut menunjuk organisasi default yang aktif jika endpoint publik memang harus dapat dipakai tanpa slug.

## 1. Prasyarat

- Server Ubuntu/Debian dengan akses `root` atau `sudo`.
- RadBill aktif pada `127.0.0.1:8080`.
- `DEFAULT_ORG_ID` dikonfigurasi jika fitur publik tenant harus dapat diakses melalui domain utama tanpa slug.
- Port TCP `80` dan `443` terbuka pada firewall/security group.
- Akses ke pengelola DNS domain. Sertifikat wildcard Let's Encrypt wajib diverifikasi melalui DNS-01.

## 2. Konfigurasi DNS

Buat record berikut pada penyedia DNS:

| Type | Name/Host | Value | Keterangan |
|---|---|---|---|
| `A` | `@` | `IP_VPS` | Domain utama `example.com` |
| `A` | `*` | `IP_VPS` | Semua `{slug}.example.com` |

Hanya dua record tersebut yang diperlukan. Setiap organisasi baru langsung dapat memakai subdomain sesuai slug tanpa membuat record DNS tambahan. Jika menggunakan IPv6, tambahkan record `AAAA` untuk `@` dan `*` dengan alamat IPv6 VPS.

Verifikasi propagasi DNS sebelum melanjutkan:

```bash
dig +short example.com
dig +short contoh-slug.example.com
```

Kedua perintah harus menampilkan IP VPS. Record wildcard tidak mencakup domain utama, sehingga record `@` tetap wajib dibuat.

## 3. Install Nginx dan Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot
sudo systemctl enable --now nginx
sudo ufw allow 'Nginx Full'
```

Pastikan status Nginx aktif:

```bash
sudo systemctl status nginx
```

## 4. Buat sertifikat wildcard Let's Encrypt

Sertifikat wildcard tidak dapat diterbitkan dengan challenge HTTP biasa (`certbot --nginx`). Gunakan plugin DNS penyedia domain agar penerbitan dan perpanjangan sertifikat dapat berjalan otomatis.

### Opsi yang disarankan: plugin DNS provider

Nama paket dan parameter berbeda untuk setiap provider. Contoh berikut menggunakan Cloudflare:

```bash
sudo apt install -y python3-certbot-dns-cloudflare
sudo install -d -m 700 /etc/letsencrypt/secrets
sudo nano /etc/letsencrypt/secrets/cloudflare.ini
```

Isi file dengan API token yang hanya memiliki izin mengubah DNS zona terkait:

```ini
dns_cloudflare_api_token = GANTI_DENGAN_API_TOKEN
```

Lindungi file credential, lalu minta sertifikat untuk domain apex dan wildcard:

```bash
sudo chmod 600 /etc/letsencrypt/secrets/cloudflare.ini
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/secrets/cloudflare.ini \
  -d example.com \
  -d '*.example.com'
```

Untuk provider selain Cloudflare, gunakan plugin DNS resmi/kompatibel milik provider tersebut dan ikuti format credential-nya. Hasil akhirnya harus menyediakan sertifikat yang mencakup `example.com` dan `*.example.com`.

### Opsi sementara: challenge DNS manual

Gunakan opsi ini hanya jika provider tidak menyediakan API/plugin:

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d example.com \
  -d '*.example.com'
```

Certbot akan meminta record TXT `_acme-challenge.example.com`. Tunggu sampai record terpropagasi sebelum melanjutkan. Sertifikat mode manual **tidak dapat diperpanjang otomatis** tanpa hook DNS buatan sendiri, sehingga opsi ini tidak disarankan untuk produksi jangka panjang.

Verifikasi path sertifikat:

```bash
sudo certbot certificates
```

Contoh konfigurasi berikut mengasumsikan path:

```text
/etc/letsencrypt/live/example.com/fullchain.pem
/etc/letsencrypt/live/example.com/privkey.pem
```

Sesuaikan path jika `Certificate Name` yang ditampilkan Certbot berbeda.

## 5. Konfigurasi Nginx

Buat file:

```bash
sudo nano /etc/nginx/sites-available/radbill
```

Isi dengan konfigurasi berikut:

```nginx
# Nama host yang tidak dikenali tidak boleh masuk ke aplikasi.
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}

# Tolak hostname HTTPS di luar domain RadBill. Sertifikat tetap dibutuhkan
# agar Nginx dapat menyelesaikan TLS sebelum menolak request.
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    return 444;
}

# Semua host RadBill dialihkan ke HTTPS.
server {
    listen 80;
    listen [::]:80;
    server_name example.com *.example.com;
    return 301 https://$host$request_uri;
}

# Aplikasi RadBill: example.com dan {slug}.example.com
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com *.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # Wajib dipertahankan: RadBill membaca slug dari hostname jika tersedia.
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Jangan menambahkan `rewrite` ke `/portal/client`. RadBill versi baru melayani aplikasi berdasarkan hostname dan routing aplikasi saat ini.

Aktifkan konfigurasi dan nonaktifkan site default:

```bash
sudo ln -s /etc/nginx/sites-available/radbill /etc/nginx/sites-enabled/radbill
sudo unlink /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Jika symbolic link `radbill` sudah ada, abaikan pesan `File exists`. Jika file default sudah tidak ada, abaikan pesan `No such file or directory` dari `unlink`.

## 6. Pengujian

Buat atau pilih organisasi aktif dengan slug uji, misalnya `maju-jaya`, lalu jalankan:

```bash
curl -I https://example.com
curl -I https://maju-jaya.example.com
curl -i https://slug-tidak-ada.example.com/public/hotspot/voucher-catalog
```

Hasil yang diharapkan:

- `example.com` masuk ke aplikasi RadBill tanpa slug pada hostname;
- `maju-jaya.example.com` masuk ke backend RadBill dengan tenant `maju-jaya`;
- endpoint publik pada slug yang tidak terdaftar mengembalikan `404`, bukan data tenant lain;
- sertifikat valid untuk domain utama dan seluruh subdomain satu tingkat.

Jika endpoint publik juga harus diuji tanpa slug, pastikan `DEFAULT_ORG_ID` telah diisi lalu panggil endpoint melalui `example.com`. Tanpa fallback tersebut, endpoint yang membutuhkan tenant akan mengembalikan `400 tenant tidak ditemukan pada hostname`.

Untuk memastikan header hostname tidak hilang:

```bash
sudo tail -f /var/log/nginx/access.log
```

## 7. Auto-renew SSL

Periksa timer dan lakukan simulasi renewal:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

Jika sertifikat dibuat memakai plugin DNS dengan credential tersimpan, dry-run seharusnya berhasil tanpa interaksi. Jika memakai mode `--manual`, siapkan proses renewal manual sebelum masa berlaku habis atau migrasikan ke plugin DNS.

Setelah renewal, Nginx perlu me-reload sertifikat. Pada instalasi Certbot Debian/Ubuntu biasanya deploy hook sudah tersedia. Jika belum, buat hook berikut:

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Isi:

```sh
#!/bin/sh
systemctl reload nginx
```

Lalu aktifkan:

```bash
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo certbot renew --dry-run
```

## 8. Troubleshooting

- **`502 Bad Gateway`**: service RadBill pada `127.0.0.1:8080` tidak aktif. Periksa dengan `ss -lntp | grep ':8080'`.
- **Domain utama ditolak dengan status `444`**: pastikan record DNS `@` tersedia dan kedua blok RadBill memuat `server_name example.com *.example.com`.
- **Semua slug gagal dibuka**: pastikan record DNS `*` mengarah ke IP VPS dan blok `server_name example.com *.example.com` aktif.
- **Endpoint publik gagal tanpa slug**: isi `DEFAULT_ORG_ID` dengan ID organisasi default yang aktif, kemudian restart service RadBill.
- **Tenant selalu tidak ditemukan**: pastikan hostname berbentuk `{slug}.example.com`, slug sama dengan data organisasi, status organisasi `active`, dan header `Host` tidak diubah oleh proxy/CDN di depan Nginx.
- **Sertifikat mismatch**: sertifikat harus memuat SAN `example.com` dan `*.example.com`. Sertifikat wildcard hanya mencakup satu tingkat, bukan `a.b.example.com`.
- **Certbot gagal menerbitkan wildcard**: gunakan DNS-01; challenge HTTP melalui `certbot --nginx` tidak dapat menerbitkan `*.example.com`.
- **Portal masih diarahkan ke `/portal/client`**: hapus aturan `rewrite` atau `return 302 /portal/client` dari konfigurasi lama.
- **Menggunakan Cloudflare proxy**: atur mode SSL/TLS ke `Full (strict)` dan pastikan origin tetap menerima hostname asli.

## 9. Catatan keamanan

- Batasi token API DNS hanya untuk zona yang diperlukan dan izin edit DNS minimum.
- Simpan credential Certbot dengan permission `600`; jangan menaruhnya di repository.
- Jangan meneruskan semua hostname internet dengan `server_name _` ke RadBill. Default server pada contoh di atas menolak host di luar domain yang dikonfigurasi.
- Wildcard Nginx menerima semua bentuk slug yang valid secara DNS, tetapi otorisasi tenant tetap dilakukan oleh RadBill berdasarkan organisasi aktif.
- Domain utama tidak membawa slug. Jangan mengaktifkan fallback `DEFAULT_ORG_ID` jika akses tenant default melalui domain utama tidak diinginkan.
