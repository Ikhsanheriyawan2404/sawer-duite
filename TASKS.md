# 📋 Task List & Roadmap

Daftar fitur yang sudah diimplementasikan (done) dan rencana pengembangan ke depan (roadmap).

## 📱 Android App (Listener)
- [x] Mendengarkan notifikasi DANA Business.
- [x] Mendengarkan notifikasi GoPay Merchant.
- [x] Ekstraksi nominal (parsing) otomatis menggunakan Regex.
- [x] Ekstraksi nama bank pengirim (parsing).
- [x] Sistem Retry pengiriman data ke backend jika gagal koneksi.
- [x] Foreground Service (Keep-Alive) agar aplikasi tidak dimatikan sistem.
- [x] Boot Receiver agar aplikasi otomatis jalan saat HP dinyalakan.
- [x] Watchdog Service untuk memantau kesehatan listener secara berkala.
- [x] Sistem Logging Client untuk debugging jarak jauh.

## ⚙️ Backend API
- [x] REST API menggunakan Go (Chi Router).
- [x] Integrasi Database PostgreSQL dengan GORM.
- [x] Autentikasi JWT (Access & Refresh Token).
- [x] Real-time Alert System menggunakan WebSocket/Event Streamer.
- [x] Integrasi Google Text-to-Speech (TTS) untuk notifikasi suara.
- [x] Rate Limiting untuk keamanan API.
- [x] Health Check endpoint untuk monitoring.
- [x] Media Storage menggunakan MinIO/S3.

## 🖥️ Web UI & Dashboard
- [x] Dashboard manajemen user & profil.
- [x] Halaman login & registrasi.
- [x] Overlay System (Alert, Queue, Media) untuk OBS/Tiktok Studio.
- [x] Pengaturan QRIS Payload di dashboard.
- [x] Halaman Donasi publik.
- [x] Preview testing alert dari dashboard.

## 🚀 Roadmap (Upcoming)
- [ ] Support parsing notifikasi OVO Merchant.
- [ ] Support parsing notifikasi ShopeePay Merchant.
- [ ] Tema Overlay yang lebih bervariasi.
- [ ] Dashboard Statistik & Analytics pendapatan.
