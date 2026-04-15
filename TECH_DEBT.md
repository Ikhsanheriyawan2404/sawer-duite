# Tech Debt

## 2026-04-12
- Potensi false positive/false negative pada parsing notifikasi: saat `parseAmount()` menghasilkan `0`, data sebelumnya tetap bisa terkirim dan dianggap pembayaran sah.
- Antrean Alert nyangkut (hang) selama ~1 menit jika browser di-refresh saat animasi sedang berjalan. Hal ini disebabkan backend menunggu `ackTimeout` (Safety Timeout) sebelum membersihkan status `PLAYING`. Diperlukan mekanisme *proactive resync* saat WebSocket baru terhubung.
