# RadBill Customer Web

Portal mandiri pelanggan RadBill yang dibangun dengan React, TypeScript, Vite,
dan Progressive Web App (PWA). Source ini disediakan agar pengguna RadBill
berlisensi dapat menyesuaikan identitas visual dan pengalaman portal pelanggan
tanpa mengubah binary backend.

> [!IMPORTANT]
> Source ini merupakan bagian dari produk proprietary RadBill, bukan proyek
> open-source. Penggunaan, modifikasi, dan distribusinya mengikuti perjanjian
> lisensi RadBill yang berlaku.

## Prasyarat

- Node.js yang kompatibel dengan dependency di `package-lock.json`.
- npm.
- RadBill API yang dapat diakses untuk menguji login dan data portal.

## Menjalankan secara lokal

```bash
npm ci
npm run dev
```

Vite menggunakan port `5173` dan meneruskan request `/api` ke
`http://localhost:8080`. Jika port sudah dipakai:

```bash
npm run dev -- --port 5174
```

Buka `http://localhost:5173/portal/` atau port pengganti yang dipilih.

## Perintah tersedia

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run lint` | Menjalankan pemeriksaan Oxlint |
| `npm run build` | Type-check dan membuat build production |
| `npm run preview` | Menampilkan hasil build secara lokal |

Sebelum memasang hasil kustomisasi:

```bash
npm run lint
npm run build
```

## Bagian yang dapat dikustomisasi

- `src/styles/tokens.css`: warna, tipografi, spacing, radius, dan shadow.
- `src/styles/portal/`: layout dan style tiap area portal.
- `src/features/portal/`: halaman serta komponen fitur pelanggan.
- `src/features/auth/`: halaman login, OTP, dan penjaga route.
- `src/shared/ui/`: komponen antarmuka yang digunakan lintas fitur.
- `public/`: favicon dan ikon PWA.
- `vite.config.ts`: metadata manifest PWA.

Utamakan design token untuk perubahan visual global. Hindari menaruh secret,
credential server, license key, atau private key di source frontend maupun
variable `VITE_*`, karena seluruh nilai frontend dapat dibaca dari browser.

## Kontrak integrasi RadBill

Pertahankan ketentuan berikut agar portal tetap kompatibel dengan binary RadBill:

- base path aplikasi adalah `/portal/`;
- request API default menggunakan `/api` pada origin yang sama;
- service worker hanya memakai scope `/portal/`;
- API, route, nama field, dan alur autentikasi tidak diubah sepihak;
- file hasil build harus berada langsung di root folder portal, bukan di dalam
  folder `dist` tambahan.

`VITE_API_URL` dapat mengubah base URL API saat build, tetapi deployment same-origin
melalui `/api` adalah konfigurasi standar dan paling sederhana.

## Struktur source

```text
src/
|-- app/                 # Router dan komposisi aplikasi
|-- features/
|   |-- auth/            # Login, OTP, dan penjaga route
|   |-- portal/          # Overview, invoice, profil, Wi-Fi, dan addon
|   `-- push/            # Push notification pelanggan
|-- shared/
|   |-- api/             # HTTP client dan error API bersama
|   `-- ui/              # Komponen UI reusable
|-- styles/
|   `-- portal/          # Style portal berdasarkan area UI
|-- main.tsx             # Bootstrap React
`-- sw.ts                # Service worker PWA
```

## Konvensi pengembangan

- Letakkan kode bisnis di `features/<nama-feature>`.
- Gunakan `shared/ui` hanya untuk komponen yang benar-benar reusable.
- Gunakan HTTP client pada `shared/api`; jangan membuat implementasi fetch kedua.
- Tambahkan nilai visual global ke `styles/tokens.css` agar tema konsisten.
- Pertahankan urutan import stylesheet global pada `main.tsx`.
- Gunakan akhiran `Page` untuk halaman dan nama berbasis peran untuk komponen.
- Jalankan lint dan build setelah mengubah dependency, route, atau service worker.

## Build dan deployment

Buat build production:

```bash
npm ci
npm run lint
npm run build
```

Hasilnya berada di `dist/`. Pada instalasi Linux standar, API membaca portal dari:

```text
/opt/radbill/bin/customer/
```

Pasang isi `dist/`:

```bash
sudo install -d -m 0755 -o radbill -g radbill /opt/radbill/bin/customer
sudo cp -R dist/. /opt/radbill/bin/customer/
sudo chown -R radbill:radbill /opt/radbill/bin/customer
```

Lokasi lain dapat digunakan melalui `CUSTOMER_WEB_DIR` pada
`/etc/radbill/radbill.env`. Setelah mengubah variable tersebut, restart API:

```bash
sudo systemctl restart radbill-api
```

API membaca file portal langsung dari disk, sehingga restart biasanya tidak
diperlukan jika hanya mengganti isi pada folder yang sama.

## Checklist setelah deployment

- `/portal/` dapat dibuka tanpa error.
- Refresh pada route seperti `/portal/invoices` tetap membuka aplikasi.
- Login dan verifikasi OTP berhasil.
- Daftar serta detail invoice dapat dimuat.
- Checkout pembayaran membuka alur yang benar.
- Profil, addon, Wi-Fi, dan preferensi notifikasi berfungsi sesuai lisensi.
- Ikon, manifest, dan service worker PWA termuat dari scope `/portal/`.
- Tidak ada secret atau source map sensitif di folder hasil build.

Simpan source kustom dan backup build Anda sendiri. Sebelum memperbarui binary
RadBill, baca catatan rilis untuk memastikan portal tetap kompatibel dengan versi
API yang akan dipasang.
