# Tutorial Membuat NAS dan Mengatur Network & Security

Panduan ini menjelaskan cara mendaftarkan NAS MikroTik ke RadBill dan mengatur akses RADIUS pada halaman **Network & Security**. Panduan mencakup dua skenario:

1. NAS terhubung ke RadBill melalui WireGuard VPN; dan
2. NAS terhubung tanpa VPN menggunakan IP publik yang harus dimasukkan ke allowlist/whitelist firewall.

> [!IMPORTANT]
> Gunakan placeholder pada contoh perintah. Jangan menaruh shared secret, private key, token, atau IP produksi di dokumentasi dan repository.

## Konsep yang perlu dipahami

RadBill mengenali NAS dari **IP sumber paket RADIUS**. Nilai **Alamat IP** pada data NAS harus sama dengan IP yang terlihat oleh server RadBill ketika menerima paket UDP `1812` atau `1813`.

| Jalur NAS | Alamat IP pada data NAS | Pengaturan di Network & Security |
|---|---|---|
| WireGuard VPN | IP VPN yang dialokasikan untuk peer NAS | Aktifkan trafik dari interface VPN, misalnya `wg0` |
| Internet tanpa VPN | IP publik keluar yang terlihat oleh RadBill | Tambahkan IP publik sebagai source `/32` pada **IP/CIDR tambahan** |
| Jaringan privat yang terhubung langsung | IP privat sumber yang terlihat oleh RadBill | Tambahkan IP privat `/32` atau subnet yang benar jika tidak masuk lewat interface VPN |

Pendaftaran NAS dan allowlist firewall adalah dua hal terpisah:

- data NAS menentukan identitas perangkat, organisasi, status, dan shared secret;
- firewall menentukan sumber mana yang boleh mencapai UDP `1812/1813` pada server Linux.

Membuat NAS tidak otomatis menambahkan IP ke firewall. Sebaliknya, menambahkan IP ke firewall tidak otomatis membuat data NAS.

## Port yang digunakan

| Port | Arah | Fungsi |
|---|---|---|
| UDP `1812` | NAS ke RadBill | RADIUS authentication |
| UDP `1813` | NAS ke RadBill | RADIUS accounting dan interim update |
| UDP `3799` | RadBill ke NAS | CoA/Disconnect-Request, bila digunakan |
| UDP `161` | RadBill ke NAS | Monitoring SNMP opsional |

Firewall RADIUS pada halaman **Network & Security** hanya mengelola UDP `1812/1813` melalui tabel nftables `inet radbill_radius`. Firewall cloud, security group VPS, router perimeter, NAT, UDP `3799`, dan UDP `161` tetap harus dikonfigurasi terpisah.

## Persiapan

Sebelum mulai, pastikan:

- layanan RadBill API, RADIUS, dan RadBill Agent berjalan;
- akun operator mempunyai permission `nas.manage` untuk mengelola NAS;
- akun platform mempunyai permission `platform.manage` untuk membuka **Network & Security**;
- NAS menggunakan IP sumber yang stabil;
- waktu pada server dan MikroTik sudah benar;
- Anda sudah menyiapkan shared secret yang kuat dan unik untuk setiap NAS;
- firewall provider/VPS mengizinkan trafik yang diperlukan hanya dari sumber tepercaya.

> [!WARNING]
> Beberapa NAS di balik satu public NAT akan terlihat memakai IP publik yang sama. RadBill memerlukan IP NAS yang unik agar paket dapat dipetakan ke satu perangkat dan satu shared secret. Gunakan WireGuard VPN atau IP publik yang berbeda untuk skenario tersebut.

## Skenario A — NAS tanpa VPN

Gunakan skenario ini hanya jika NAS mempunyai IP publik keluar yang stabil atau jalur privat langsung yang stabil. WireGuard lebih disarankan untuk NAS di balik CGNAT, public NAT bersama, atau IP dinamis.

### 1. Tentukan IP sumber NAS

Tentukan IP yang akan terlihat oleh server RadBill:

- jika MikroTik mempunyai IP publik langsung, gunakan IP publik tersebut;
- jika MikroTik berada di belakang NAT, gunakan IP publik keluar milik NAT;
- jangan memasukkan IP LAN seperti `192.168.x.x` apabila server menerima paket dari IP publik NAT;
- pastikan IP tidak berubah. Jika ISP memberikan IP dinamis, gunakan VPN.

Contoh dalam tutorial:

```text
IP publik NAS       : 203.0.113.10
IP server RadBill   : 198.51.100.20
Shared secret       : <SHARED_SECRET_KUAT>
```

### 2. Tambahkan IP ke whitelist Network & Security

1. Masuk menggunakan akun yang mempunyai akses platform.
2. Buka **Platform → Network & Security**.
3. Pilih tab **Firewall RADIUS**.
4. Pada bagian **IP/CIDR tambahan**, klik **Tambah IP**.
5. Isi form:

   | Field | Contoh | Keterangan |
   |---|---|---|
   | Nama | `NAS Cabang Surabaya` | Nama yang mudah dikenali |
   | Source IP atau CIDR | `203.0.113.10/32` | IP publik keluar NAS; `/32` direkomendasikan untuk satu NAS |
   | Masa berlaku | Kosong | Isi hanya untuk akses sementara |
   | Aturan aktif | Aktif | Aturan nonaktif tidak diterapkan |

6. Klik **Simpan**.
7. Pastikan aturan muncul dan berstatus **Aktif**.

Gunakan CIDR yang lebih lebar, misalnya `/29`, hanya jika seluruh alamat di dalam subnet benar-benar dipercaya. Allowlist CIDR tidak menggantikan kebutuhan data NAS dengan satu alamat IP yang tepat.

### 3. Aktifkan kebijakan Firewall RADIUS

Masih pada tab **Firewall RADIUS**:

1. Aktifkan **Proteksi firewall untuk UDP 1812/1813**.
2. Jika deployment juga memakai VPN, biarkan **Izinkan trafik dari interface VPN** aktif dan isi nama interface, misalnya `wg0`.
3. Jika deployment tidak memakai VPN, opsi interface VPN boleh dinonaktifkan.
4. Klik **Terapkan kebijakan**.
5. Pastikan badge sinkronisasi menunjukkan `synced`.

Jika badge menunjukkan `failed`, baca pesan error, perbaiki konfigurasi RadBill Agent atau nftables, lalu klik **Sinkronkan ulang**. Jangan menganggap whitelist aktif sebelum status berhasil tersinkronisasi.

> [!TIP]
> Jika proteksi belum aktif pada instalasi baru, tambahkan seluruh source tepercaya terlebih dahulu, lalu aktifkan kebijakan. Ini mengurangi risiko memutus trafik RADIUS yang sedang berjalan.

### 4. Daftarkan NAS di RadBill

1. Buka **Network → NAS & VPN**.
2. Pilih tab **Perangkat NAS**.
3. Pada form **Buat perangkat NAS**, isi:

   | Field | Contoh | Keterangan |
   |---|---|---|
   | Nama | `NAS Cabang Surabaya` | Nama unik dan mudah dikenali |
   | Alamat IP | `203.0.113.10` | Harus sama dengan IP sumber yang terlihat oleh RadBill |
   | Vendor | `Mikrotik` | Vendor yang tersedia saat ini |
   | Tipe | `RouterOS PPPoE` | Keterangan bebas, misalnya PPPoE, Hotspot, atau router |
   | Shared secret | `<SHARED_SECRET_KUAT>` | Harus sama persis dengan konfigurasi RADIUS di MikroTik |
   | Status | `Aktif` | Hanya NAS aktif yang diterima runtime RADIUS |

4. Klik **Simpan**.
5. Pastikan NAS tampil pada daftar dengan IP dan status yang benar.

Nilai **Alamat IP** pada data NAS adalah satu IP, bukan CIDR. Walaupun firewall mengizinkan `203.0.113.8/29`, setiap NAS tetap harus terdaftar dengan IP sumbernya masing-masing.

### 5. Konfigurasikan RADIUS pada MikroTik

Gunakan IP server RadBill yang dapat dicapai oleh MikroTik. Jalankan hanya service yang memang digunakan.

Contoh RouterOS CLI untuk PPPoE dan Hotspot:

```routeros
/radius
add address=<RADBILL_SERVER_IP> secret="<SHARED_SECRET_KUAT>" service=ppp,hotspot authentication-port=1812 accounting-port=1813 timeout=1s

/ppp aaa
set use-radius=yes accounting=yes interim-update=5m

/radius incoming
set accept=yes port=3799
```

Untuk Hotspot, aktifkan RADIUS pada profile Hotspot yang dipakai:

```routeros
/ip hotspot profile
set [find where name="<NAMA_PROFILE_HOTSPOT>"] use-radius=yes
```

Catatan:

- `<RADBILL_SERVER_IP>` adalah IP server RADIUS yang dapat dicapai NAS;
- shared secret harus sama persis, termasuk huruf besar/kecil;
- jangan menyalin tanda `<` dan `>`;
- pengaturan `/radius incoming` diperlukan untuk CoA/disconnect;
- jika MikroTik berada di belakang NAT, forward UDP `3799` hanya dari IP server RadBill apabila fitur disconnect diperlukan.

## Skenario B — NAS melalui WireGuard VPN

Pada skenario VPN, paket RADIUS diterima melalui interface WireGuard. IP peer VPN menjadi identitas NAS di RadBill. IP peer tidak perlu ditambahkan lagi ke daftar **IP/CIDR tambahan** selama interface VPN diizinkan oleh kebijakan firewall.

### 1. Pastikan infrastruktur VPN tersedia

Langkah ini dilakukan oleh platform owner:

1. Buka **Platform → Network & Security**.
2. Pilih tab **VPN & IP Pool**.
3. Pastikan server VPN dan pool IP tersedia.
4. Kembali ke tab **Firewall RADIUS**.
5. Aktifkan **Izinkan trafik dari interface VPN**.
6. Isi interface yang benar, misalnya `wg0`. Pisahkan dengan koma jika ada lebih dari satu.
7. Klik **Terapkan kebijakan** dan pastikan status `synced`.

Nama interface harus termasuk interface yang diizinkan pada konfigurasi RadBill Agent. Nama yang tidak diizinkan akan menyebabkan sinkronisasi gagal.

### 2. Buat koneksi VPN untuk NAS

1. Buka **Network → NAS & VPN**.
2. Pilih tab **Koneksi VPN**.
3. Klik **Buat VPN**.
4. Isi nama koneksi, misalnya `VPN NAS Cabang Surabaya`.
5. Ikuti wizard untuk membuat interface WireGuard pada MikroTik dan memperoleh public key.
6. Masukkan public key ke wizard RadBill.
7. Setelah peer dibuat, salin script koneksi dari RadBill dan jalankan di terminal MikroTik.
8. Catat **IP VPN** yang dialokasikan, misalnya `10.90.0.2`.
9. Tunggu status handshake menjadi terhubung.

Gunakan script yang dihasilkan aplikasi karena public key server, endpoint, port, gateway, dan IP peer berasal dari konfigurasi deployment aktual.

### 3. Buat data NAS menggunakan IP VPN

Pada tab **Perangkat NAS**, buat NAS dengan ketentuan:

- **Alamat IP** diisi dengan IP VPN peer, misalnya `10.90.0.2`;
- **Shared secret** tetap wajib dan berbeda dari key WireGuard;
- status diatur **Aktif**.

WireGuard key mengamankan tunnel. Shared secret RADIUS mengautentikasi paket RADIUS. Keduanya bukan credential yang sama.

### 4. Arahkan MikroTik ke gateway VPN RadBill

Gunakan alamat gateway/server VPN yang ditampilkan oleh konfigurasi RadBill sebagai alamat server RADIUS. Agar IP sumber konsisten, gunakan IP VPN NAS sebagai `src-address` bila tersedia pada versi RouterOS Anda.

```routeros
/radius
add address=<IP_GATEWAY_VPN_RADBILL> src-address=<IP_VPN_NAS> secret="<SHARED_SECRET_KUAT>" service=ppp,hotspot authentication-port=1812 accounting-port=1813 timeout=1s

/ppp aaa
set use-radius=yes accounting=yes interim-update=5m

/radius incoming
set accept=yes port=3799
```

Jangan melakukan masquerade/SNAT trafik RADIUS di dalam tunnel menjadi satu IP bersama. Server harus melihat IP VPN unik milik setiap NAS.

## Verifikasi setelah konfigurasi

Lakukan pemeriksaan berikut:

1. Pastikan status firewall pada **Network & Security** adalah `synced`.
2. Pastikan rule IP non-VPN aktif dan belum kedaluwarsa.
3. Pastikan NAS terdaftar dengan status **Aktif**.
4. Pastikan IP pada data NAS sama dengan source paket yang diterima RadBill.
5. Pastikan shared secret RadBill dan MikroTik sama.
6. Lakukan login uji PPPoE atau Hotspot.
7. Buka halaman **Sessions** dan pastikan authentication/accounting tercatat.
8. Uji disconnect bila CoA digunakan.
9. Periksa log RADIUS dan counter firewall jika request masih timeout.

Monitoring **Online/Offline** pada daftar NAS menggunakan SNMP dan terpisah dari koneksi RADIUS. Status **Belum diperiksa** tidak selalu berarti RADIUS gagal. Konfigurasikan SNMP melalui aksi **Konfigurasi SNMP** jika monitoring diperlukan.

## Troubleshooting

### Request RADIUS timeout

Periksa:

- IP sumber NAS sudah ada di allowlist `/32` untuk koneksi non-VPN;
- interface VPN yang benar sudah diizinkan untuk koneksi VPN;
- status sinkronisasi firewall adalah `synced`;
- firewall cloud/security group juga mengizinkan UDP `1812/1813` dari sumber yang tepat;
- route dari NAS ke server RadBill tersedia;
- service RADIUS sedang berjalan.

### NAS tidak dikenal atau request ditolak sebelum autentikasi

Kemungkinan penyebab:

- **Alamat IP** pada data NAS berbeda dari source paket aktual;
- NAS berada di belakang NAT dan RadBill melihat IP publik NAT;
- beberapa NAS memakai satu IP public NAT yang sama;
- status NAS bukan **Aktif**;
- data NAS sudah diarsipkan.

Gunakan VPN untuk memberi setiap NAS IP sumber yang unik.

### Shared secret tidak cocok

Pastikan nilai pada MikroTik identik dengan **Shared secret** NAS di RadBill. Saat mengedit NAS, field shared secret boleh dikosongkan untuk mempertahankan secret lama; isi hanya jika ingin menggantinya.

### Authentication berhasil tetapi accounting tidak masuk

Periksa:

- UDP `1813` tidak diblokir;
- `accounting=yes` aktif pada PPP AAA;
- profile Hotspot memakai RADIUS;
- interim update sudah dikonfigurasi;
- NAS mengirim accounting ke server yang sama.

### Disconnect/CoA gagal

Firewall **Network & Security** tidak mengatur port ini. Periksa:

- `/radius incoming set accept=yes port=3799` pada MikroTik;
- UDP `3799` dapat dijangkau dari server RadBill ke NAS;
- NAT/port-forward dan firewall MikroTik hanya mengizinkan sumber server RadBill;
- IP NAS di RadBill dapat dirutekan dari server.

### Status firewall `failed`

Periksa pesan error pada halaman, lalu verifikasi:

- RadBill Agent aktif dan dapat dihubungi API;
- nftables tersedia pada server Linux;
- interface VPN ditulis dengan benar dan diizinkan oleh agent;
- source berisi IP atau CIDR yang valid;
- masa berlaku rule berada di masa depan.

Setelah diperbaiki, klik **Sinkronkan ulang**.

## Checklist produksi

- [ ] Setiap NAS memakai IP sumber yang unik dan stabil.
- [ ] Setiap NAS memakai shared secret yang kuat dan unik.
- [ ] NAS non-VPN di-allowlist menggunakan `/32` bila memungkinkan.
- [ ] NAS VPN memakai IP peer VPN sebagai alamat NAS.
- [ ] Interface VPN yang benar diizinkan pada Firewall RADIUS.
- [ ] Status sinkronisasi firewall `synced`.
- [ ] Firewall cloud tidak membuka UDP `1812/1813` ke seluruh internet.
- [ ] UDP `3799` hanya dapat diakses dari server RadBill jika CoA digunakan.
- [ ] SNMP tidak dibuka ke internet; gunakan SNMPv3 atau jaringan VPN.
- [ ] Authentication, accounting, interim update, dan disconnect sudah diuji.

## Referensi RouterOS

- [MikroTik RouterOS — RADIUS](https://help.mikrotik.com/docs/spaces/ROS/pages/328097/RADIUS)
- [MikroTik RouterOS — PPP AAA](https://help.mikrotik.com/docs/spaces/ROS/pages/132350049/PPP%2BAAA)
