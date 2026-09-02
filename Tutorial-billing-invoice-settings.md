# Tutorial Billing, Payment Type, Billing Type, Invoice, dan Billing Settings

Panduan ini menjelaskan konfigurasi billing RadBill dari awal sampai pembayaran invoice. Materi mencakup:

- perbedaan **payment type** dan metode pembayaran;
- arti setiap **billing type**;
- kombinasi billing yang didukung;
- konfigurasi halaman **Billing Settings**;
- pembuatan subscription dan jadwal billing;
- pembuatan invoice otomatis dan manual;
- pembayaran penuh maupun sebagian;
- status invoice, grace period, suspend, dan notifikasi.

> [!IMPORTANT]
> Contoh tanggal dan nominal dalam dokumen ini hanya ilustrasi. Selalu uji konfigurasi pada satu pelanggan sebelum menerapkannya secara massal.

## 1. Konsep utama

Alur billing RadBill terdiri dari empat lapisan:

1. **Service Profile** menentukan layanan, harga, dan interval paket.
2. **Subscription** menghubungkan pelanggan ke Service Profile serta menyimpan payment type, billing type, pajak, diskon, status, dan jadwal.
3. **Invoice** menagihkan satu atau beberapa periode subscription.
4. **Payment** mencatat uang masuk dan mengalokasikannya ke invoice.

```text
Service Profile
      ↓
Subscription pelanggan
      ↓
Invoice otomatis/manual
      ↓
Payment → lunas/partial → lifecycle layanan diperbarui
```

## 2. Payment type bukan metode pembayaran

**Payment type** menentukan kapan pelanggan membayar terhadap periode layanan.

| Payment type | Label UI   | Arti                                                                                           |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| `postpaid`   | Pascabayar | Pelanggan memakai layanan lebih dahulu, lalu membayar tagihan periode tersebut                 |
| `prepaid`    | Prabayar   | Pelanggan membayar lebih dahulu untuk memperoleh atau memperpanjang periode layanan berikutnya |

Payment type berbeda dari **metode pembayaran** seperti:

- Tunai (`cash`);
- Transfer (`transfer`);
- Transfer bank (`bank_transfer`);
- Manual (`manual`);
- payment gateway, bila provider sudah dikonfigurasi.

Contoh: subscription dapat bertipe **Prabayar**, tetapi invoice-nya dibayar dengan metode **Transfer bank**.

## 3. Billing type

Billing type menentukan anchor tanggal dan cara jadwal periode berikutnya dihitung.

### 3.1 Siklus (`cycle`)

Semua pelanggan mengikuti siklus bulanan organisasi:

- invoice dibuat pada tanggal `1`;
- jatuh tempo/suspend cycle mengikuti **Tanggal suspend billing cycle**;
- periode awal dapat diprorata jika pelanggan mulai di tengah bulan;
- jadwal berikutnya tetap mengikuti kalender organisasi.

Contoh dengan tanggal suspend cycle `7`:

```text
Pelanggan mulai       : 15 Januari
Invoice pertama       : 1 Februari
Jatuh tempo           : 7 Februari
Periode yang ditagih  : 15–31 Januari, dihitung prorata
Invoice berikutnya    : 1 Maret
```

Mode ini cocok untuk ISP yang menagih seluruh pelanggan pada tanggal yang sama.

### 3.2 Tanggal tetap (`fixed_date`)

Jadwal mengikuti tanggal mulai subscription dan tidak bergeser karena pembayaran terlambat.

Contoh subscription mulai `15 Januari` dengan interval satu bulan:

```text
Batas periode pertama : 15 Februari
Invoice dijadwalkan   : 7 hari sebelumnya
Jatuh tempo           : 15 Februari
Batas berikutnya      : 15 Maret
```

Jika invoice dibayar pada `18 Februari`, anchor berikutnya tetap tanggal `15`, bukan tanggal `18`.

### 3.3 Perpanjangan (`renewal`)

Mode renewal digunakan untuk prabayar. Periode berikutnya diperpanjang setelah invoice lunas.

- pembayaran tepat waktu memperpanjang dari batas periode saat ini;
- pembayaran terlambat memakai tanggal pembayaran sebagai anchor baru;
- jadwal invoice renewal ditahan sampai pembayaran selesai agar tidak membuat tagihan periode berikutnya sebelum renewal aktif.

Contoh:

```text
Masa aktif berakhir   : 15 Februari
Pembayaran terlambat  : 18 Februari
Periode baru          : 18 Februari–17 Maret
```

Mode ini cocok untuk layanan yang masa aktifnya dimulai kembali ketika pelanggan membayar.

## 4. Kombinasi yang didukung

UI RadBill menyediakan kombinasi berikut:

| Payment type | Billing type  | Kegunaan umum                                                       |
| ------------ | ------------- | ------------------------------------------------------------------- |
| Pascabayar   | Siklus        | Tagihan kalender bulanan dengan tanggal invoice dan suspend seragam |
| Pascabayar   | Tanggal tetap | Tagihan berdasarkan tanggal aktivasi pelanggan                      |
| Prabayar     | Tanggal tetap | Membayar periode ke depan tanpa menggeser anchor tetap              |
| Prabayar     | Perpanjangan  | Masa aktif diperpanjang berdasarkan pembayaran                      |

Kombinasi **Prabayar + Siklus** tidak disediakan pada form dan berada di luar lifecycle invoice prabayar. Kombinasi **Pascabayar + Perpanjangan** juga tidak disediakan pada form.

### Rekomendasi pemilihan

- Gunakan **Pascabayar + Siklus** jika seluruh pelanggan ditagih tanggal 1 dan disuspend pada tanggal organisasi yang sama.
- Gunakan **Pascabayar + Tanggal tetap** jika jatuh tempo mengikuti tanggal pemasangan masing-masing pelanggan.
- Gunakan **Prabayar + Tanggal tetap** jika pelanggan membayar di muka tetapi tanggal periode harus tetap.
- Gunakan **Prabayar + Perpanjangan** jika masa aktif baru dimulai atau bergeser mengikuti tanggal pembayaran.

## 5. Konfigurasi Billing Settings

Buka **Billing → Billing Settings**. Pengaturan disimpan per organisasi.

Permission yang digunakan:

- `billing.settings.read` untuk melihat;
- `billing.settings.manage` untuk mengubah.

### 5.1 Arti setiap field

| Field                             | Default | Fungsi                                                                                    |
| --------------------------------- | ------: | ----------------------------------------------------------------------------------------- |
| Tanggal suspend billing cycle     |     `7` | Tanggal jatuh tempo dan anchor suspend untuk subscription billing cycle                   |
| Hari reminder sebelum jatuh tempo |     `3` | Menjadwalkan reminder beberapa hari sebelum `due_date` invoice                            |
| Grace days sebelum suspend        |     `0` | Tambahan hari setelah waktu suspend sebelum subscription pascabayar benar-benar disuspend |
| Invoice generation time           | `00:05` | Jam worker membuat invoice pada tanggal `next_invoice_at`                                 |
| Daily suspension time             | `12:15` | Jam worker menjalankan evaluasi suspend pada tanggal jatuh tempo                          |
| Invoice reminder send time        | `09:00` | Jam pengiriman reminder terjadwal                                                         |

Seluruh jam mengikuti timezone organisasi, bukan timezone browser operator.

> [!NOTE]
> **Hari reminder sebelum jatuh tempo** hanya mengatur notifikasi reminder. Field ini tidak mengubah tanggal pembuatan invoice. Untuk billing `fixed_date` dan `renewal`, invoice dijadwalkan tujuh hari sebelum batas periode. Untuk billing `cycle`, tanggal invoice tetap tanggal 1.

### 5.2 Contoh konfigurasi pascabayar cycle

```text
Tanggal suspend cycle          : 7
Hari reminder                  : 3
Grace days                     : 2
Invoice generation time        : 00:05
Daily suspension time          : 12:15
Invoice reminder send time     : 09:00
```

Alur yang dihasilkan:

```text
1 Februari 00:05  → invoice diterbitkan
4 Februari 09:00  → reminder dikirim, yaitu 3 hari sebelum jatuh tempo
7 Februari 12:15  → invoice overdue dan subscription masuk grace
9 Februari 12:15  → subscription disuspend jika invoice masih relevan dan belum dibayar
```

Grace days diterapkan pada subscription **pascabayar**. Subscription prabayar dalam lifecycle invoice dapat langsung disuspend pada waktu suspend ketika invoice masih outstanding.

### 5.3 Pengaturan notifikasi

| Checkbox                                     |  Default | Event                                             |
| -------------------------------------------- | -------: | ------------------------------------------------- |
| Kirim notifikasi saat invoice terbit         | Nonaktif | Invoice baru berhasil dibuat                      |
| Kirim notifikasi reminder invoice            |    Aktif | Jadwal due date dikurangi reminder lead days      |
| Kirim notifikasi saat invoice jatuh tempo    | Nonaktif | Invoice berubah menjadi overdue                   |
| Kirim notifikasi saat subscription disuspend | Nonaktif | Lifecycle mengubah subscription menjadi suspended |

Mengaktifkan checkbox tidak otomatis menjamin pesan terkirim. Pastikan:

- kanal notifikasi organisasi sudah aktif;
- template event terkait tersedia;
- pelanggan mempunyai email/nomor tujuan yang valid;
- consent atau opt-in kanal sudah memenuhi aturan;
- worker dan scheduled job dispatcher berjalan.

### 5.4 Dampak perubahan Billing Settings

Perubahan settings berlaku untuk proses automation berikutnya. Perubahan tidak menulis ulang invoice yang sudah terbit dan tidak otomatis mengubah semua jadwal tersimpan pada subscription lama saat tombol **Simpan** ditekan.

Sebelum mengganti tanggal cycle atau grace secara besar-besaran:

1. periksa subscription yang sudah mempunyai `next_invoice_at` dan `next_suspend_at`;
2. periksa invoice outstanding;
3. uji satu pelanggan;
4. hindari perubahan tepat saat worker billing sedang berjalan.

## 6. Siapkan Service Profile

Sebelum membuat subscription, pastikan Service Profile sudah mempunyai:

- nama paket;
- service type yang sesuai, PPPoE atau Hotspot;
- harga;
- interval paket dalam bulan;
- konfigurasi kecepatan/atribut RADIUS yang diperlukan.

Harga dan interval Service Profile dipakai saat invoice subscription dibuat. Contoh:

```text
Nama paket     : Internet 20 Mbps
Harga          : Rp300.000
Interval       : 1 bulan
```

Jika operator memilih `3 periode` ketika membuat invoice manual, total dasar menjadi tiga kali harga interval tersebut, sebelum diskon dan pajak subscription.

## 7. Buat pelanggan dan subscription

Subscription dapat dibuat saat membuat pelanggan, akun RADIUS, atau dari detail pelanggan sesuai alur yang tersedia.

Isi data billing subscription:

| Field              | Fungsi                                                       |
| ------------------ | ------------------------------------------------------------ |
| Service Profile    | Menentukan paket, harga, interval, dan tipe layanan          |
| Jenis pembayaran   | Prabayar atau Pascabayar                                     |
| Jenis billing      | Siklus, Tanggal tetap, atau Perpanjangan sesuai payment type |
| Pajak (%)          | Persentase pajak invoice subscription                        |
| Tipe diskon        | Tanpa diskon, persen, atau nominal rupiah                    |
| Nilai diskon       | Besar diskon sesuai tipe                                     |
| Mulai pada         | Anchor awal perhitungan periode                              |
| Invoice berikutnya | Jadwal invoice; kosongkan agar dihitung otomatis             |
| Suspend berikutnya | Batas layanan; kosongkan agar dihitung otomatis              |
| Status             | Pending, Aktif, Grace, Suspended, atau Closed                |

Gunakan petunjuk UI untuk mengosongkan field jadwal jika ingin RadBill menghitungnya dari payment type, billing type, tanggal mulai, interval profil, dan Billing Settings.

### Pajak dan diskon

Urutan perhitungan invoice subscription:

```text
Subtotal = jumlah item × harga
Setelah diskon = subtotal − diskon
Pajak = persentase pajak × nilai setelah diskon
Total = subtotal − diskon + penalti + pajak
```

Diskon persen dibatasi `0–100`. Nilai diskon dan pajak tidak boleh negatif.

## 8. Pembuatan invoice otomatis

Worker billing membuat invoice ketika:

- subscription berada pada status yang dapat ditagih;
- tanggal `next_invoice_at` sudah tercapai;
- waktu organisasi sudah melewati **Invoice generation time**;
- Service Profile dan jadwal subscription valid;
- invoice untuk periode tersebut belum pernah dibuat.

Invoice otomatis:

- berstatus awal **Issued**;
- mempunyai tanggal terbit dari jadwal;
- mempunyai due date berdasarkan `next_suspend_at`;
- mengambil harga dan interval Service Profile;
- menerapkan pajak dan diskon subscription;
- membuat item `subscription_fee`;
- dapat memasukkan prorata awal untuk billing cycle;
- dilindungi dari duplikasi periode.

Worker juga dapat mengejar periode yang tertinggal dalam batas pengaman, tetapi jadwal yang tidak konsisten akan ditolak dan dicatat sebagai error daripada menghasilkan invoice ganda.

### Periode invoice pascabayar dan prabayar

- Invoice **pascabayar** menagihkan periode layanan yang sudah berjalan menuju due date.
- Invoice **prabayar** menagihkan periode setelah due date agar pembayaran membuka atau memperpanjang layanan berikutnya.

## 9. Membuat invoice manual

Saat ini tombol pembuatan invoice subscription tersedia dari detail pelanggan, bukan dari halaman daftar invoice global.

Langkahnya:

1. Buka **Pelanggan**.
2. Pilih pelanggan yang akan ditagih.
3. Buka bagian/tab **Invoice** pada detail pelanggan.
4. Klik **Buat invoice**.
5. Pilih subscription pelanggan.
6. Pilih **Jumlah periode**, dari `1` sampai `12`.
7. Klik **Buat invoice**.

Subscription yang dapat dipilih:

- Pascabayar berstatus **Aktif** atau **Grace**;
- Prabayar `fixed_date` atau `renewal` berstatus **Aktif**, **Grace**, atau **Suspended**.

Subscription `closed`, `pending`, kombinasi yang tidak didukung, atau subscription tanpa Service Profile valid tidak dapat dibuatkan invoice manual.

### Perilaku invoice manual

- tanggal terbit menggunakan waktu saat operator membuat invoice;
- periode tetap dihitung dari anchor jadwal subscription;
- harga dan interval mengikuti Service Profile;
- pajak dan diskon mengikuti subscription;
- periode yang sudah mempunyai invoice tidak dapat dibuat ulang;
- jika jadwal berubah saat modal masih terbuka, muat ulang data sebelum mencoba kembali;
- untuk prepaid renewal, jadwal periode berikutnya baru maju setelah invoice dibayar;
- untuk mode lain, cursor invoice berikutnya maju setelah invoice manual berhasil dibuat, sedangkan batas layanan maju melalui lifecycle pembayaran.

> [!WARNING]
> Jangan membuat invoice manual hanya untuk memperbaiki invoice yang salah tanpa memeriksa periodenya. Sistem mencegah duplikasi periode dan perubahan cursor jadwal dapat memengaruhi automation berikutnya.

## 10. Mengelola invoice

Buka **Billing → Invoice** untuk:

- mencari invoice berdasarkan nomor, pelanggan, atau subscription;
- memfilter bulan terbit dan status;
- melihat rincian item dan periode;
- mencetak invoice;
- menyalin public payment link jika payment gateway tersedia;
- mengirim reminder manual;
- mencatat pembayaran satu invoice;
- membayar beberapa invoice terpilih sekaligus.

### Status invoice

| Status  | Arti                                                             |
| ------- | ---------------------------------------------------------------- |
| Draft   | Invoice belum diterbitkan; tidak masuk lifecycle reminder normal |
| Issued  | Invoice sudah diterbitkan dan belum dibayar                      |
| Partial | Invoice sudah dibayar sebagian                                   |
| Overdue | Due date telah tercapai dan saldo masih outstanding              |
| Paid    | Total invoice sudah lunas                                        |
| Carried | Sisa invoice partial dibawa ke invoice berikutnya                |
| Void    | Invoice dibatalkan dan tidak lagi ditagih                        |

## 11. Mencatat pembayaran invoice

### Pembayaran satu invoice

1. Buka **Billing → Invoice** atau invoice pada detail pelanggan.
2. Klik ikon/aksi **Catat pembayaran**.
3. Periksa nomor invoice, pelanggan, due date, dan sisa tagihan.
4. Isi jumlah bayar.
5. Pilih metode pembayaran.
6. Isi nomor referensi bila ada.
7. Simpan pembayaran.

Jumlah pembayaran harus lebih dari nol dan tidak boleh melebihi sisa invoice.

### Pembayaran beberapa invoice

1. Centang invoice yang akan dibayar pada halaman **Invoice**.
2. Klik **Pay Selected**.
3. Periksa total outstanding.
4. Pilih metode dan isi referensi.
5. Konfirmasi pembayaran.

Setiap invoice diproses sebagai pembayaran teralokasi. Jika sebagian gagal, UI menampilkan hasil parsial dan invoice yang berhasil tetap tersimpan.

### Pembayaran sebagian

Jika jumlah lebih kecil dari saldo:

- invoice berubah menjadi **Partial**;
- sisa tagihan tetap tercatat;
- pembayaran berikutnya dapat melunasi saldo.

Perilaku suspend saat partial berbeda:

- pada pascabayar, invoice yang sudah mempunyai pembayaran sebagian tidak dipakai sebagai pemicu suspend otomatis saat ini;
- pada prabayar `fixed_date`/`renewal`, saldo yang masih outstanding tetap dapat mempertahankan subscription dalam lifecycle suspend.

### Pembayaran lunas

Ketika total pembayaran mencapai total invoice:

- invoice menjadi **Paid**;
- tanggal closed disimpan;
- jadwal layanan subscription diperpanjang sesuai billing type;
- subscription Grace/Suspended dapat kembali **Aktif**;
- akun RADIUS yang terkait dapat diaktifkan kembali;
- untuk renewal yang dibayar terlambat, tanggal pembayaran dapat menjadi anchor baru.

## 12. Status subscription dan suspend

| Status    | Arti                                                                |
| --------- | ------------------------------------------------------------------- |
| Pending   | Subscription belum mulai atau belum aktif                           |
| Active    | Layanan aktif                                                       |
| Grace     | Pascabayar melewati waktu jatuh tempo tetapi masih dalam grace days |
| Suspended | Layanan disuspend oleh lifecycle atau operator                      |
| Closed    | Subscription ditutup dan tidak lagi ditagih                         |

Pada saat suspend otomatis, RadBill juga mencoba mengubah status akun RADIUS yang terikat ke subscription menjadi `suspended`. Ketika pembayaran lunas mengaktifkan kembali subscription, akun RADIUS terkait dapat dikembalikan menjadi `active`.

## 13. Contoh konfigurasi

### Contoh A — Pascabayar cycle

```text
Payment type       : Pascabayar
Billing type       : Siklus
Harga profil       : Rp300.000 / bulan
Mulai              : 15 Januari
Cycle suspend day  : 7
Grace              : 2 hari
```

Hasil utama:

- invoice pertama dibuat 1 Februari;
- periode pertama 15–31 Januari diprorata;
- due date 7 Februari;
- jika belum dibayar, masuk Grace pada 7 Februari pukul suspend;
- disuspend setelah grace berakhir;
- invoice berikutnya mengikuti tanggal 1.

### Contoh B — Pascabayar tanggal tetap

```text
Payment type       : Pascabayar
Billing type       : Tanggal tetap
Mulai              : 15 Januari
Interval           : 1 bulan
```

Hasil utama:

- batas periode dan due date 15 Februari;
- invoice dijadwalkan tujuh hari sebelumnya;
- pembayaran terlambat tidak menggeser tanggal 15.

### Contoh C — Prabayar renewal

```text
Payment type       : Prabayar
Billing type       : Perpanjangan
Masa aktif sampai  : 15 Februari
Bayar              : 18 Februari
```

Hasil utama:

- subscription dapat disuspend ketika masa aktif habis dan invoice masih outstanding;
- setelah lunas pada 18 Februari, subscription aktif kembali;
- masa aktif berikutnya dihitung dari 18 Februari.

## 14. Troubleshooting

### Subscription tidak muncul saat membuat invoice

Periksa:

- status subscription memenuhi syarat;
- kombinasi payment type dan billing type didukung;
- Service Profile masih tersedia;
- subscription milik pelanggan yang sedang dibuka;
- akun mempunyai permission `invoice.create`.

### Invoice otomatis tidak terbentuk

Periksa:

- worker billing berjalan;
- `next_invoice_at` sudah tercapai;
- waktu saat ini sudah melewati Invoice generation time pada timezone organisasi;
- status subscription dapat ditagih;
- harga dan interval Service Profile valid;
- belum ada invoice untuk periode yang sama;
- log worker tidak menunjukkan jadwal subscription tidak konsisten.

### Invoice langsung overdue

Periksa issue date, due date, `next_suspend_at`, dan timezone organisasi. Invoice berubah menjadi overdue ketika waktu lifecycle mencapai due date dan saldo belum lunas.

### Pelanggan tidak disuspend

Periksa:

- subscription termasuk lifecycle pascabayar atau prabayar invoice;
- invoice belum lunas dan relevan untuk suspend;
- Daily suspension time sudah tercapai;
- grace days untuk pascabayar sudah berakhir;
- invoice pascabayar tidak berstatus partial atau mempunyai pembayaran sebagian;
- worker billing dan sinkronisasi akun RADIUS berjalan.

### Reminder tidak terkirim

Periksa:

- checkbox reminder aktif;
- jadwal due date dikurangi reminder lead days sudah tercapai;
- reminder time dan timezone organisasi benar;
- invoice belum Paid/Void/Draft;
- pelanggan mempunyai kanal yang eligible;
- template dan dispatcher notifikasi aktif.

### Pembayaran lunas tetapi layanan belum aktif

Periksa:

- payment berstatus confirmed;
- payment dialokasikan ke invoice yang benar;
- total alokasi sudah menutup seluruh saldo invoice;
- invoice mempunyai subscription ID;
- akun RADIUS terikat ke subscription tersebut;
- log payment lifecycle tidak menunjukkan kegagalan update.

## 15. Checklist implementasi organisasi

- [ ] Timezone organisasi sudah benar.
- [ ] Billing Settings sudah ditinjau dan disimpan.
- [ ] Tanggal suspend cycle sesuai kebijakan bisnis.
- [ ] Grace days sesuai kebijakan isolir pelanggan.
- [ ] Jam generate, suspend, dan reminder sudah benar.
- [ ] Kanal serta template notifikasi sudah aktif.
- [ ] Service Profile mempunyai harga dan interval yang benar.
- [ ] Payment type dan billing type subscription sudah sesuai.
- [ ] Pajak dan diskon sudah diuji pada satu invoice.
- [ ] Invoice otomatis sudah diuji sampai overdue/suspend.
- [ ] Invoice manual 1–12 periode sudah diuji.
- [ ] Pembayaran partial dan lunas sudah diuji.
- [ ] Unsuspend subscription dan akun RADIUS setelah lunas sudah diverifikasi.
