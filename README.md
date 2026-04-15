# 💰 Sawer Duite: Transparan, Real-time, 0% Potongan

**Sawer Duite** adalah platform donasi dan notifikasi pembayaran yang mengutamakan transparansi. Project ini **Open Source** sepenuhnya agar Anda dapat melihat langsung bagaimana data Anda diproses. Tidak ada kode tersembunyi, tidak ada pengambilan data pribadi secara ilegal, dan yang terpenting: **0% potongan** karena uang langsung masuk ke kantong/merchant Anda sendiri.

Sistem ini bekerja dengan cara "mendengarkan" notifikasi pembayaran dari aplikasi Merchant di Android Anda dan meneruskannya menjadi alert di OBS/Tiktok Studio/Browser secara real-time.

Lihat daftar fitur lengkap dan rencana pengembangan di: [TASKS.md](./TASKS.md)

---

## 🛡️ Transparansi & Keamanan
Kami memahami bahwa memberikan izin akses notifikasi adalah hal yang sensitif. Oleh karena itu:
- **Audit Sendiri**: Seluruh kode sumber (Backend, UI, Android) tersedia di sini. Silakan periksa tidak ada aktivitas "aneh".
- **Direct to You**: Kami tidak memproses uang Anda. Uang masuk langsung ke saldo DANA/Gopay Anda.
- **Privacy First**: Aplikasi hanya memfilter notifikasi spesifik dari aplikasi merchant yang didukung.

## 🔐 Keamanan & Mekanisme Listener (Detail)
Bagian ini menjelaskan bagaimana aplikasi Android bekerja agar transparan soal data yang dibaca dan dikirim.
- **Cara kerja**: Android `NotificationListenerService` menerima semua notifikasi sistem, lalu **segera difilter** berdasarkan package yang didukung. Notifikasi dari aplikasi lain di-*skip*.
- **Aplikasi yang didukung**: `id.dana`, `id.dana.business`, `com.gojek.gopaymerchant`.  
- **Aplikasi yang tidak dibaca**: SMS, m-banking, email, dan aplikasi lain **tidak diproses** karena filter package sudah dipasang di awal.
- **Data yang diproses**: judul notifikasi, isi notifikasi, waktu, dan package sumber.  
- **Data yang dikirim ke backend**: hasil parsing nominal, bank, sumber, plus judul dan isi notifikasi yang relevan.  
- **Tidak ada izin SMS**: aplikasi **tidak** meminta izin SMS/contacts/location.  
- **Tracing/Log**: aplikasi menyimpan log lokal (`client_logs.jsonl`) dan mengunggahnya ke endpoint `/client-logs` untuk kebutuhan debugging.
- **Keep-alive**: aplikasi menjalankan foreground service untuk mencegah sistem mematikan proses listener.

### Versi Aplikasi Merchant yang Terbukti Jalan (Per Laporan Terakhir)
- GoPay Merchant `1.23.0`
- DANA Business `2.120.1`

---

## 🚀 Panduan Setup User (Langkah demi Langkah)

### 1. Registrasi di Platform
Daftar terlebih dahulu melalui dashboard resmi di [sawer.duitebot.com](https://sawer.duitebot.com) untuk mendapatkan akun dan akses ke panel kontrol overlay.

### 2. Siapkan QRIS Merchant
Sawer Duite saat ini mendukung notifikasi dari:
- **DANA Business**
- **Gopay Merchant**

Pastikan Anda sudah terdaftar sebagai merchant di salah satu platform tersebut dan dapat menerima notifikasi pembayaran masuk di HP Android Anda.

### 3. Konfigurasi QRIS di Dashboard
Setelah mendapatkan QRIS Statis dari merchant (DANA/Gopay):
1. Scan kode QRIS Anda menggunakan aplikasi QR Scanner apa saja di HP (atau gunakan tool online).
2. Anda akan mendapatkan **kode teks/payload QRIS** (biasanya diawali dengan `000201...`).
3. Copy kode tersebut, lalu buka Dashboard Web Sawer Duite.
4. Masukkan kode tersebut di menu **Settings > QRIS Configuration**.
5. Simpan. Ini diperlukan agar sistem dapat memvalidasi data pembayaran dengan lebih akurat.

### 4. Instalasi Aplikasi Android (Listener)
Aplikasi Android ini adalah jantung dari sistem yang bertugas mengirim notifikasi ke dashboard.
1. Download file `.apk` terbaru dari [GitHub Release](https://github.com/Ikhsanheriyawan2404/sawer-duite/releases).
2. **Disclaimer & Keamanan**:
   - **Play Protect**: Karena aplikasi ini didownload di luar Play Store, Google mungkin akan menampilkan peringatan "Blocked by Play Protect". Pilih **Install Anyway**. Ini normal untuk aplikasi open source yang tidak didaftarkan secara berbayar ke Google.
   - **Izin Notifikasi**: Aplikasi akan meminta izin **Notification Access**. Izin ini wajib diberikan agar aplikasi bisa membaca pesan "Pembayaran Masuk" dari DANA/Gopay.
   - **Saran Device**: Sangat disarankan untuk menggunakan **device/HP khusus** (HP cadangan) untuk menjalankan listener ini, demi menjaga privasi device utama Anda.

### 4. Konfigurasi Aplikasi
> [!TIP]
> **Tempat Gambar: Tampilan Konfigurasi App Android**
> ![App Configuration](docs/images/android-config.png)

1. Buka aplikasi Sawer Duite di Android.
2. Masukkan **Backend URL**: `https://sawer-api.duitebot.com` (atau URL server Anda jika self-host).
3. Masukkan **App Token**: Ambil token ini dari Dashboard Web Anda.
4. Klik **Simpan Perubahan**.
5. Klik **Test Koneksi** untuk memastikan statusnya "Berhasil".

### 5. Pengaturan Agar Aplikasi Selalu Aktif (Keep Alive)
Agar notifikasi tidak telat atau terhenti oleh sistem Android:
- **Akses Notifikasi**: Pastikan status di aplikasi menunjukkan centang hijau (Aktif).
- **Battery Optimization**: Matikan optimasi baterai untuk aplikasi ini (Set ke "Don't Optimize" atau "Unrestricted").
- **Auto-Start**: Izinkan aplikasi untuk berjalan otomatis saat HP dinyalakan (Aplikasi kami sudah dilengkapi `BootReceiver` untuk membantu ini).
- **Keep-Alive Service**: Aplikasi menjalankan *Foreground Service* (ada icon di notifikasi bar) untuk memastikan Android tidak mematikan proses di background.

---

## 🧪 Testing
Setelah setup selesai:
1. Klik tombol **Test Connection** di aplikasi Android.
2. Lakukan transaksi pembayaran percobaan (misal Rp 1.000) ke QRIS Anda.
3. Cek apakah suara notifikasi muncul di dashboard web atau overlay OBS Anda secara realtime.

---

## 🛠 Kontribusi
Jika Anda seorang developer dan ingin membantu meningkatkan sistem ini:
- **Backend**: Go (Chi + GORM)
- **Frontend**: React 19 + TypeScript
- **Android**: Kotlin (NotificationListenerService)

Kami sangat menghargai Pull Request untuk perbaikan bug, penambahan fitur parsing merchant lain, atau optimasi performa.

---

## 📄 Lisensi
Project ini dilisensikan di bawah [MIT License](LICENSE). Anda bebas menggunakan, memodifikasi, dan mendistribusikannya selama menyertakan atribusi asli.
