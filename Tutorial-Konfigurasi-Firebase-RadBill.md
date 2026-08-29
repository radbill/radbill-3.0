# Tutorial Konfigurasi Firebase untuk Notifikasi Push RadBill

Panduan ini menjelaskan konfigurasi Firebase Cloud Messaging (FCM) pada RadBill, mulai dari mengambil konfigurasi Firebase Web SDK hingga memasang kredensial Firebase Admin pada server Linux.

> [!IMPORTANT]
> Semua nilai dalam tutorial ini menggunakan placeholder. Jangan memasukkan file service-account JSON, private key, atau kredensial produksi ke dokumentasi, issue GitHub, maupun repository.

## Gambaran singkat

Konfigurasi FCM terdiri dari dua bagian:

1. **Firebase Web SDK**
   
   Dipakai portal web untuk mendaftarkan browser dan memperoleh token notifikasi.

2. **Firebase Admin SDK**
   
   Dipakai backend RadBill untuk mengirim notifikasi melalui Firebase Cloud Messaging. Kredensialnya berupa file JSON dan wajib dirahasiakan.

Konfigurasi Web SDK dan VAPID public key memang digunakan pada sisi client. Sebaliknya, file service-account JSON hanya boleh tersedia pada server.

## Persiapan

Sebelum memulai, pastikan:

- Anda mempunyai akses ke [Firebase Console](https://console.firebase.google.com/).
- Anda dapat mengelola project Firebase yang akan dipakai.
- Anda mempunyai akses `root` atau `sudo` ke server RadBill.
- Domain aplikasi sudah menggunakan HTTPS.
- Anda menggunakan project Firebase yang sesuai dengan environment, misalnya development, staging, atau production.

## 1. Daftarkan aplikasi web di Firebase

1. Masuk ke Firebase Console.
2. Pilih project Firebase yang akan digunakan.
3. Klik ikon roda gigi di samping **Project Overview**.
4. Pilih **Project settings**.
5. Buka tab **General**.
6. Cari bagian **Your apps**.
7. Pilih aplikasi web yang sudah tersedia.
8. Jika belum ada, klik ikon Web (`</>`) untuk mendaftarkan aplikasi baru.
9. Pada bagian **SDK setup and configuration**, pilih opsi **Config**.

Firebase akan menampilkan konfigurasi seperti berikut:

```javascript
const firebaseConfig = {
  apiKey: "<API_KEY>",
  authDomain: "<PROJECT_ID>.firebaseapp.com",
  projectId: "<PROJECT_ID>",
  storageBucket: "<STORAGE_BUCKET>",
  messagingSenderId: "<SENDER_ID>",
  appId: "<APP_ID>"
};
```

Anda tidak perlu menyalin perintah `npm install firebase` untuk mengisi konfigurasi server. Yang diperlukan adalah nilai di dalam object `firebaseConfig`.

## 2. Pindahkan nilai Web SDK ke konfigurasi RadBill

Gunakan pemetaan berikut:

| Firebase Console | Variabel RadBill | Contoh nilai |
|---|---|---|
| `apiKey` | `FIREBASE_WEB_API_KEY` | `AIza...` |
| `authDomain` | `FIREBASE_AUTH_DOMAIN` | `project-id.firebaseapp.com` |
| `projectId` | `FIREBASE_PROJECT_ID` | `project-id` |
| `storageBucket` | `FIREBASE_STORAGE_BUCKET` | `project-id.firebasestorage.app` |
| `messagingSenderId` | `FIREBASE_MESSAGING_SENDER_ID` | `123456789012` |
| `appId` | `FIREBASE_APP_ID` | `1:123456789012:web:abcdef` |

Jangan ikut menyalin nama property JavaScript, tanda koma, atau tanda kutip luarnya ke dalam nama variabel `.env`.

## 3. Buat VAPID public key

1. Di Firebase Console, buka **Project settings**.
2. Pilih tab **Cloud Messaging**.
3. Cari bagian **Web configuration** atau **Web Push certificates**.
4. Jika key belum tersedia, klik **Generate key pair**.
5. Salin public key yang dihasilkan.
6. Gunakan nilai tersebut untuk `FIREBASE_VAPID_PUBLIC_KEY`.

> [!WARNING]
> Gunakan **public key** yang ditampilkan pada bagian Web Push certificates. Jangan memasukkan private key ke konfigurasi frontend.

## 4. Unduh service-account JSON

Service-account JSON dipakai Firebase Admin SDK pada backend.

1. Buka **Project settings** di Firebase Console.
2. Pilih tab **Service accounts**.
3. Klik **Generate new private key**.
4. Konfirmasikan pembuatan private key.
5. Simpan file JSON yang diunduh.
6. Anda dapat mengganti namanya menjadi `firebase-admin.json` agar mudah dikenali.

Jangan menyalin isi `private_key` dari file JSON ke `.env`. RadBill hanya membutuhkan path menuju file JSON tersebut.

> [!CAUTION]
> Service-account JSON merupakan kredensial rahasia tingkat tinggi. Jangan memasukkannya ke Git, folder web publik, dokumentasi, tiket dukungan, atau backup tanpa enkripsi.

## 5. Pasang service-account JSON di server

Contoh lokasi yang disarankan:

```text
/opt/radbill/credentials/firebase-admin.json
```

Buat direktori kredensial:

```bash
sudo install -d -m 0750 -o radbill -g radbill /opt/radbill/credentials
```

Unggah atau salin `firebase-admin.json` ke direktori tersebut. Setelah file tersedia, atur owner dan permission:

```bash
sudo chown radbill:radbill /opt/radbill/credentials/firebase-admin.json
sudo chmod 0600 /opt/radbill/credentials/firebase-admin.json
```

Perintah tersebut mengasumsikan service RadBill berjalan menggunakan user dan group `radbill`. Sesuaikan jika deployment Anda menggunakan akun sistem yang berbeda.

## 6. Isi file konfigurasi RadBill

Konfigurasi utama instalasi Linux RadBill berada di:

```text
/etc/radbill/radbill.env
```

Buka file tersebut:

```bash
sudo nano /etc/radbill/radbill.env
```

Isi bagian Firebase menggunakan nilai dari project Anda:

```dotenv
FCM_ENABLED=true
FIREBASE_WEB_API_KEY=<API_KEY>
FIREBASE_AUTH_DOMAIN=<PROJECT_ID>.firebaseapp.com
FIREBASE_PROJECT_ID=<PROJECT_ID>
FIREBASE_STORAGE_BUCKET=<STORAGE_BUCKET>
FIREBASE_MESSAGING_SENDER_ID=<SENDER_ID>
FIREBASE_APP_ID=<APP_ID>
FIREBASE_VAPID_PUBLIC_KEY=<VAPID_PUBLIC_KEY>
GOOGLE_APPLICATION_CREDENTIALS=/opt/radbill/credentials/firebase-admin.json
```

Ganti seluruh placeholder di antara `<` dan `>` dengan nilai Firebase Anda.

### Apakah nilainya perlu memakai tanda kutip?

Untuk konfigurasi di atas, tanda kutip **tidak diperlukan**. Format tanpa tanda kutip direkomendasikan:

```dotenv
FIREBASE_PROJECT_ID=project-id
```

Pada umumnya, format berikut juga dapat dibaca oleh parser `.env`:

```dotenv
FIREBASE_PROJECT_ID="project-id"
```

Namun, jangan ikut menyalin tanda koma dari object JavaScript Firebase.

Contoh yang salah:

```dotenv
FIREBASE_PROJECT_ID="project-id",
```

Contoh yang benar:

```dotenv
FIREBASE_PROJECT_ID=project-id
```

Untuk path service-account tanpa spasi, gunakan format sederhana berikut:

```dotenv
GOOGLE_APPLICATION_CREDENTIALS=/opt/radbill/credentials/firebase-admin.json
```

## 7. Restart layanan RadBill

Setelah menyimpan konfigurasi, restart API dan worker agar nilai baru dimuat:

```bash
sudo systemctl restart radbill-api radbill-worker
```

Periksa status layanan:

```bash
systemctl status radbill-api radbill-worker --no-pager
```

Periksa endpoint readiness:

```bash
curl http://127.0.0.1:8080/readyz
```

Jika layanan gagal aktif, periksa log:

```bash
sudo journalctl -u radbill-api -n 100 --no-pager
sudo journalctl -u radbill-worker -n 100 --no-pager
```

Log file default juga dapat diperiksa melalui:

```bash
sudo tail -n 100 /var/log/radbill/api.log
sudo tail -n 100 /var/log/radbill/worker.log
```

## 8. Uji notifikasi

1. Buka portal menggunakan domain HTTPS yang digunakan pengguna.
2. Login menggunakan akun pengujian.
3. Aktifkan izin notifikasi ketika browser memintanya.
4. Jika izin pernah ditolak, reset izin notifikasi melalui pengaturan situs pada browser.
5. Pastikan browser atau perangkat berhasil terdaftar sebagai target push.
6. Kirim notifikasi uji atau picu event notifikasi yang tersedia.
7. Verifikasi notifikasi ketika aplikasi sedang dibuka.
8. Verifikasi kembali ketika aplikasi berjalan di background.

## Troubleshooting

### Readiness gagal setelah FCM diaktifkan

Kemungkinan penyebab:

- Salah satu variabel `FIREBASE_*` masih kosong.
- `FIREBASE_VAPID_PUBLIC_KEY` belum diisi.
- Path `GOOGLE_APPLICATION_CREDENTIALS` salah.
- Service tidak dapat membaca file JSON.

Pastikan semua variabel telah terisi dan file JSON tersedia pada path yang ditentukan.

### Muncul error `permission denied` saat membaca JSON

Periksa owner dan permission file:

```bash
sudo ls -l /opt/radbill/credentials/firebase-admin.json
```

Jika service berjalan sebagai user `radbill`, atur kembali permission:

```bash
sudo chown radbill:radbill /opt/radbill/credentials/firebase-admin.json
sudo chmod 0600 /opt/radbill/credentials/firebase-admin.json
```

### Project ID atau sender tidak cocok

Pastikan konfigurasi berikut berasal dari project Firebase yang sama:

- Firebase Web SDK
- VAPID public key
- Service-account JSON

Mencampurkan konfigurasi dari project berbeda dapat menyebabkan token atau pengiriman pesan ditolak.

### Notifikasi tidak muncul di browser

Periksa hal berikut:

- Aplikasi dibuka menggunakan HTTPS.
- Izin notifikasi browser tidak diblokir.
- Browser mendukung Push API dan service worker.
- Service worker aplikasi terdaftar dan aktif.
- Perangkat telah memperoleh token notifikasi terbaru.
- Tidak ada error Firebase pada Developer Tools browser.

### Registration token tidak valid

Token dapat menjadi tidak valid setelah data browser dihapus, aplikasi dipasang ulang, atau Firebase merotasi instalasi.

Hapus target lama, aktifkan ulang notifikasi, lalu biarkan portal mendaftarkan token baru.

## Checklist akhir

- [ ] `FCM_ENABLED=true`.
- [ ] Semua variabel `FIREBASE_*` sudah terisi.
- [ ] `FIREBASE_VAPID_PUBLIC_KEY` berisi public key.
- [ ] Web SDK, VAPID key, dan service account berasal dari project yang sama.
- [ ] Service-account JSON berada di luar folder web publik.
- [ ] Service-account JSON tidak masuk ke Git.
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` menggunakan path absolut yang benar.
- [ ] User service dapat membaca JSON.
- [ ] `radbill-api` dan `radbill-worker` aktif.
- [ ] Endpoint `/readyz` berhasil.
- [ ] Notifikasi sudah diuji pada domain HTTPS produksi atau staging.

Jika seluruh checklist terpenuhi, konfigurasi dasar Firebase Cloud Messaging pada RadBill sudah siap digunakan.
