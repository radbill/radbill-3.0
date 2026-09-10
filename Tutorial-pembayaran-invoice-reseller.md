# Panduan pembayaran invoice oleh reseller

Panduan ini menjelaskan pembayaran invoice pelanggan menggunakan wallet reseller di RadBill, mulai dari pengaturan izin, penggunaan saldo dan kredit, pemeriksaan laporan, sampai pembatalan pembayaran. Panduan ditujukan untuk admin, Finance, dan reseller.

**Pembayaran reseller menggunakan saldo wallet terlebih dahulu, kemudian sisa limit kredit jika saldo tidak cukup.** Invoice hanya menerima pembayaran jika dana tersedia mencukupi. Pelunasan, pemakaian dana, dan mutasi wallet disimpan dalam satu transaksi database.

> Panduan ini berlaku setelah pembaruan alur pembayaran dan pengembalian wallet dipasang pada **API dan frontend** server. Pembayaran manual atau pembatalan yang tercatat sebelum pembaruan tidak dikoreksi otomatis.

## 1. Perbedaan pembayaran reseller dan pembayaran manual

| Aspek | Pembayaran oleh reseller | Pembayaran manual oleh admin atau Finance |
| --- | --- | --- |
| Sumber dana | Saldo wallet dan sisa kredit reseller | Uang yang diterima melalui tunai atau transfer |
| Pemeriksaan dana | Saldo dan sisa kredit diperiksa sebelum pembayaran | Tidak bergantung pada saldo wallet reseller |
| Izin pembayaran | `wallet.pay` | `payment.create` dan `payment.confirm` |
| Pencatatan | Pembayaran invoice dan debit wallet | Pembayaran manual |
| Pengaruh pada kredit | Bertambah jika sebagian pembayaran memakai kredit | Tidak mengubah kredit reseller |
| Sumber di Report → Finance | Wallet (saldo/kredit) | Pembayaran manual |

Akun yang terhubung dengan identitas reseller diarahkan ke alur wallet. Backend menolak pembuatan atau konfirmasi pembayaran manual dari akun tersebut, meskipun izin `payment.create` dan `payment.confirm` aktif.

Nama role saja tidak menentukan pemilik dana. **Akun pengguna harus terhubung dengan data reseller** agar sistem mengenali wallet yang digunakan.

## 2. Role dan izin yang diperlukan

Role adalah kumpulan izin. Role bawaan **Reseller** dapat digunakan, atau admin dapat menyiapkan role khusus dengan izin berikut.

### Izin untuk operasi reseller

| Kelompok di pengaturan role | Nama izin pada aplikasi | Kode izin | Kebutuhan |
| --- | --- | --- | --- |
| `billing` | Read invoices | `invoice.read` | Diperlukan untuk melihat dan memilih invoice melalui antarmuka |
| `wallet` | Pay invoices from wallets | `wallet.pay` | Diperlukan untuk membayar dari wallet; juga mengizinkan akses saldo dan mutasi wallet sendiri |
| `customer` | Read customers | `customer.read` | Dianjurkan untuk melihat data dan detail pelanggan |
| `payment` | Read payments | `payment.read` | Dianjurkan untuk memeriksa riwayat dan detail pembayaran |
| `wallet` | View and top up own wallet via checkout | `wallet.topup.self` | Opsional jika reseller boleh topup mandiri melalui payment gateway |

**`invoice.read` berada pada kelompok `billing`, dengan nama “Read invoices”.** Izin tersebut bukan bagian dari kelompok `payment`.

Izin `wallet.pay` tidak memerlukan `payment.create` atau `payment.confirm`. Reseller juga tidak memerlukan izin umum `wallet.read` hanya untuk membaca wallet sendiri.

### Izin yang sebaiknya dikelola oleh admin atau Finance

Berikut rekomendasi pembagian akses, bukan syarat pembayaran reseller.

| Izin | Penggunaan |
| --- | --- |
| `payment.create` dan `payment.confirm` | Mencatat pembayaran manual tunai atau transfer |
| `payment.refund` | Membatalkan pembayaran yang sudah dikonfirmasi |
| `wallet.read` | Membaca wallet untuk pengelolaan dan pemeriksaan oleh admin |
| `wallet.topup.manual` | Menambahkan dana secara manual |
| `wallet.debit.manual` | Mengurangi dana secara manual |
| `wallet.credit_limit.manage` | Menetapkan atau mengubah plafon kredit reseller |
| `report.finance.view` | Membuka laporan Finance |

Untuk penggunaan reseller sehari-hari, tidak perlu memberikan izin penyesuaian saldo manual, pengaturan limit kredit, atau pembatalan pembayaran. Periksa seluruh role yang terpasang pada akun karena izin dapat berasal dari lebih dari satu role.

### Langkah pengaturan akun

1. Hubungkan akun pengguna dengan data reseller yang benar.
2. Buka **Roles/Peran**, pilih role yang digunakan reseller, lalu buka pengaturan izinnya.
3. Aktifkan `invoice.read` dan `wallet.pay`. Tambahkan izin baca pelanggan dan pembayaran sesuai kebutuhan.
4. Aktifkan `wallet.topup.self` hanya jika topup mandiri akan digunakan dan gateway sudah dikonfigurasi.
5. Admin menetapkan limit kredit. Gunakan **Rp0** apabila pembayaran hanya boleh memakai saldo tunai.
6. Simpan pengaturan, lalu masuk ulang pada akun reseller agar sesi menggunakan izin terbaru.

## 3. Memahami saldo dan limit kredit

| Angka pada wallet | Artinya |
| --- | --- |
| Saldo | Dana tunai yang tersimpan pada wallet |
| Limit kredit | Plafon kredit yang ditetapkan admin; tidak berkurang setiap kali dipakai |
| Kredit terpakai | Kredit yang sudah digunakan dan belum dilunasi |
| Sisa kredit | Limit kredit dikurangi kredit terpakai, paling rendah Rp0 |
| Bisa dipakai | Saldo ditambah sisa kredit; jumlah yang tersedia untuk pembayaran |

```text
Sisa kredit = maksimum(Limit kredit - Kredit terpakai, 0)
Bisa dipakai = Saldo + Sisa kredit
```

“Sisa kredit” dan “Bisa dipakai” bernilai sama jika saldo tunai Rp0. Jika saldo tunai masih ada, “Bisa dipakai” lebih besar karena mencakup kedua sumber dana.

### Contoh pembayaran

Misalnya saldo Rp30.000, limit kredit Rp100.000, dan kredit terpakai Rp20.000. Reseller membayar invoice Rp50.000.

| Komponen | Sebelum pembayaran | Setelah pembayaran |
| --- | ---: | ---: |
| Saldo | Rp30.000 | Rp0 |
| Limit kredit | Rp100.000 | Rp100.000 |
| Kredit terpakai | Rp20.000 | Rp40.000 |
| Sisa kredit | Rp80.000 | Rp60.000 |
| Bisa dipakai | Rp110.000 | Rp60.000 |

Pembayaran menggunakan saldo Rp30.000 dan kredit Rp20.000. Contoh ini hanya memperhitungkan pembayaran, tanpa tambahan komisi atau transaksi lain.

Jika saldo Rp0 dan sisa kredit Rp0, pembayaran ditolak. Jika saldo Rp0 tetapi sisa kredit masih cukup, pembayaran tetap dapat dilakukan menggunakan kredit.

## 4. Cara reseller membayar invoice

1. Masuk menggunakan akun reseller.
2. Buka halaman **Invoice**, detail pelanggan, atau pencarian invoice pada bagian atas aplikasi.
3. Pilih invoice yang masih dapat dibayar, lalu buka **Pay Invoice/Bayar invoice**.
4. Periksa nama pelanggan, nomor invoice, sisa tagihan, saldo wallet, kredit terpakai, dan sisa kredit.
5. Isi jumlah pembayaran dan nomor referensi jika diperlukan. Jumlah pembayaran tidak boleh melebihi sisa tagihan.
6. Klik **Bayar dari saldo / kredit**.
7. Setelah berhasil, periksa status invoice serta debit pada mutasi wallet.

Reseller tidak perlu memilih Tunai atau Transfer pada dialog pembayaran wallet. Sistem menentukan penggunaan saldo dan kredit secara otomatis.

Pembayaran sebagian menghasilkan invoice dengan sisa tagihan. Pembayaran penuh melunasi invoice. Pemeriksaan dana di server tetap berlaku meskipun angka pada tampilan belum diperbarui.

### Membayar beberapa invoice

Pembayaran beberapa invoice menggunakan alur wallet untuk setiap invoice. Hasilnya dapat **berhasil sebagian**, misalnya jika dana hanya mencukupi untuk sebagian invoice. Periksa daftar keberhasilan dan kegagalan; jangan mengulang invoice yang sudah berhasil dibayar.

### Invoice yang tidak dapat dibayar

| Kondisi | Penjelasan dan tindakan |
| --- | --- |
| Draft | Invoice belum diterbitkan; minta admin memeriksanya |
| Deferred | Tagihan ditangguhkan; tidak bisa dibayar langsung sebelum penangguhan ditangani |
| Carried | Tagihan sudah dipindahkan; periksa invoice tujuan |
| Void | Invoice dibatalkan dan tidak dapat dibayar |
| Tidak ada sisa tagihan | Muat ulang invoice dan periksa pembayaran yang sudah tercatat |

Jika saldo dan kredit tidak cukup, pembayaran ditolak tanpa mencatat debit baru atau melunasi invoice. Jika salah satu tahap transaksi database gagal, perubahan dalam transaksi tersebut dibatalkan bersama.

## 5. Lokasi riwayat dan laporan

| Kebutuhan | Lokasi |
| --- | --- |
| Reseller melihat saldo, kredit terpakai, sisa kredit, dan mutasi | Menu **Wallet** pada akun reseller |
| Admin memeriksa wallet tertentu | **Reseller → pilih reseller → tab Wallet** |
| Melihat detail pembayaran | Halaman **Payments/Pembayaran**, dengan izin `payment.read` |
| Melihat transaksi dalam laporan Finance | **Report → Finance → filter Sumber → Wallet (saldo/kredit)**, dengan izin `report.finance.view` |

Gunakan filter bulan yang sesuai pada wallet. Mutasi pembayaran menampilkan debit bernilai negatif dengan referensi nomor pembayaran. Secara teknis, jenis mutasinya adalah `invoice_payment_debit`.

Pembayaran dari wallet tercatat dengan metode `internal_balance` dan channel `wallet`. Laporan Finance mengelompokkan pembayaran saldo dan kredit sebagai sumber wallet; laporan ini bukan daftar terpisah khusus penggunaan kredit. Gunakan angka **Kredit terpakai** dan **Sisa kredit** untuk mengetahui posisi kredit saat ini.

Setiap transaksi wallet juga dapat dipengaruhi topup, komisi, atau penyesuaian lain. Cocokkan nomor referensi dan waktu transaksi jika angka akhirnya berbeda dari satu pembayaran yang sedang diperiksa.

## 6. Pembatalan pembayaran dan pengembalian dana

Pembatalan pembayaran yang telah dikonfirmasi dilakukan oleh pengguna dengan izin **Refund payments** (`payment.refund`), biasanya admin atau Finance. Aksi ini berbeda dari membatalkan invoice melalui `invoice.cancel`.

1. Buka halaman pembayaran dan pilih transaksi yang akan dibatalkan.
2. Periksa nomor pembayaran, invoice, jumlah, metode, dan channel.
3. Pilih aksi pembatalan pembayaran, isi alasan, lalu konfirmasi.
4. Setelah berhasil, periksa perubahan invoice dan mutasi pengembalian pada wallet asal.

Untuk pembayaran wallet, dana dikembalikan ke **wallet yang tercatat pada debit asli**, bukan wallet pengguna yang menekan tombol batal. Pengembalian dilakukan dengan urutan berikut:

1. Mengurangi kredit terpakai yang masih ada.
2. Menambahkan sisa pengembalian ke saldo tunai.
3. Mencatat mutasi **Pengembalian pembayaran invoice** (`invoice_payment_refund_credit`).

Limit kredit tetap. Jika kredit telah dilunasi melalui topup sebelum pembayaran dibatalkan, dana pengembalian dapat menjadi saldo tunai. Pengembalian mengikuti posisi wallet saat pembatalan, sehingga pembagian saldo dan kredit tidak selalu identik dengan posisi sebelum pembayaran awal.

**Contoh:** pengembalian Rp50.000 pada wallet dengan kredit terpakai Rp40.000 akan melunasi kredit Rp40.000 dan menambah saldo Rp10.000. Contoh ini belum memperhitungkan pembalikan komisi, jika ada.

Pembatalan, pengembalian wallet, dan perubahan terkait disimpan dalam transaksi database yang sama. Pembatalan berulang pada pembayaran yang sudah dibatalkan tidak menggandakan pengembalian. Jika debit asli tidak ditemukan atau tidak cocok, pembatalan ditolak dan perlu diperiksa oleh admin.

Pembatalan juga dapat ditolak jika tagihan telah dipindahkan atau ditangguhkan. Transaksi yang sudah dibatalkan sebelum pembaruan fitur pengembalian perlu diperiksa secara terpisah; tidak ada pengembalian otomatis untuk riwayat tersebut.

## 7. Pemeriksaan jika terjadi kendala

| Gejala | Yang perlu diperiksa |
| --- | --- |
| Akses ditolak | Izin `wallet.pay`, hubungan akun dengan data reseller, dan izin sesi terbaru |
| Menu Invoice tidak tampil | Izin `invoice.read` pada kelompok `billing` |
| Saldo dan sisa kredit tidak mencukupi | Angka “Bisa dipakai”, jumlah bayar, dan transaksi wallet terbaru |
| Invoice lunas tetapi tidak ada debit wallet | Metode/channel pembayaran dan apakah API serta frontend sudah diperbarui; pembayaran manual tidak memotong wallet |
| Limit kredit tidak berubah | Ini normal; periksa kredit terpakai dan sisa kredit |
| Mutasi tidak terlihat | Filter bulan, wallet reseller yang dipilih, dan nomor referensi pembayaran |
| Pembatalan gagal karena debit asal tidak ditemukan | Cocokkan pembayaran dengan mutasi debit asli; jangan menambahkan pengembalian manual tanpa rekonsiliasi |

Jika hasil pembayaran belum jelas, periksa invoice dan riwayat terlebih dahulu sebelum mencoba lagi. Sertakan nomor invoice, nomor pembayaran, waktu kejadian, dan pesan error ketika meminta bantuan admin.

## 8. Checklist penerapan

- [ ] API dan frontend yang mendukung pembayaran serta pengembalian wallet sudah dipasang.
- [ ] Akun pengguna terhubung dengan data reseller yang benar.
- [ ] Izin `invoice.read` dan `wallet.pay` aktif.
- [ ] Izin baca pelanggan dan pembayaran ditambahkan sesuai kebutuhan.
- [ ] Limit kredit ditetapkan oleh admin; Rp0 jika kredit tidak diizinkan.
- [ ] Pembayaran uji menghasilkan debit wallet dan perubahan invoice yang sesuai.
- [ ] Saldo kosong tanpa sisa kredit menghasilkan penolakan.
- [ ] Pembatalan uji menghasilkan mutasi pengembalian ke wallet asal.
- [ ] Pembayaran manual lama dan pembatalan lama diperiksa terpisah jika memerlukan koreksi.

## Referensi kode

Referensi berikut menggunakan tautan relatif agar dapat dibuka langsung dari GitHub.

- [Daftar nama dan kelompok izin](../internal/modules/auth/default_seed.go)
- [Pemilihan alur pembayaran pada frontend](../web/src/pages/billing/invoices/useInvoicePayment.ts)
- [Izin pembayaran dan akses wallet](../internal/modules/wallet/delivery/http/routes.go)
- [Pembayaran wallet dalam satu transaksi database](../internal/modules/wallet/application/atomic_invoice_payment.go)
- [Pembatasan pembayaran manual reseller](../internal/modules/payment/delivery/http/routes.go)
- [Pengembalian pembayaran ke wallet asal](../internal/modules/payment/application/wallet_payment_refund.go)
- [Pengelompokan transaksi pada laporan Finance](../internal/modules/reporting/infrastructure/sql_store.go)
