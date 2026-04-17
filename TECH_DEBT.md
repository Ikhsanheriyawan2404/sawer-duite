# Tech Debt

## 2026-04-12
- Potensi false positive/false negative pada parsing notifikasi: saat `parseAmount()` menghasilkan `0`, data sebelumnya tetap bisa terkirim dan dianggap pembayaran sah.
- Antrean Alert nyangkut (hang) selama ~1 menit jika browser di-refresh saat animasi sedang berjalan. Hal ini disebabkan backend menunggu `ackTimeout` (Safety Timeout) sebelum membersihkan status `PLAYING`. Diperlukan mekanisme *proactive resync* saat WebSocket baru terhubung.
- **[Android]** Deteksi notifikasi (`isPaymentNotification`) masih kaku; perlu diperluas dengan Regex yang lebih fleksibel dan *unknown package logging* untuk aplikasi finansial (DANA/GoPay/BCA).
- **[Android]** Parser GoPay Merchant sering gagal mendeteksi "BANK" karena variasi teks notifikasi yang tidak mencantumkan kata "DARI" secara eksplisit.
- **[Android]** Belum ada penanganan *retry* yang cerdas jika pengiriman data ke backend gagal di luar masalah autentikasi (misal *rate limit*).
  " secara eksplisit untuk meningkatkan akurasi ekstraksi nama bank/metode pengirim.
  