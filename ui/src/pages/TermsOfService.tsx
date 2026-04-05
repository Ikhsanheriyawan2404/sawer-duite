import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function TermsOfService() {
  useDocumentTitle('Terms of Service')

  return (
    <main className="page" style={{ maxWidth: '880px', margin: '0 auto', padding: '32px 20px 64px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p className="muted" style={{ margin: 0, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Legal</p>
        <h1 style={{ margin: 0, fontSize: 'clamp(2.2rem, 6vw, 3.4rem)' }}>Terms of Service</h1>
        <p className="muted" style={{ margin: 0 }}>Terakhir diperbarui: 26 Desember 2025</p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Penerimaan Syarat</h2>
        <p className="muted" style={{ margin: 0 }}>
          Dengan menggunakan Sawer Duite, anda menyetujui seluruh Syarat dan Ketentuan ini. Jika tidak setuju dengan ketentuan apa pun,
          mohon untuk tidak menggunakan layanan.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Penggunaan Layanan</h2>
        <p className="muted" style={{ margin: 0 }}>
          Anda wajib memberikan informasi yang benar, menjaga keamanan akun, dan menggunakan layanan hanya untuk tujuan yang sah.
          Anda tidak diperkenankan menyalahgunakan bot, sistem, atau infrastruktur kami.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Akun Pengguna</h2>
        <p className="muted" style={{ margin: 0 }}>
          Anda harus membuat akun untuk menggunakan layanan. Anda bertanggung jawab penuh atas aktivitas di akun anda. Segera
          hubungi kami jika terjadi penggunaan tidak sah. Kami berhak menangguhkan atau menghapus akun yang melanggar ketentuan.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Izin Aplikasi & Notifikasi</h2>
        <p className="muted" style={{ margin: 0 }}>
          Aplikasi Android memerlukan izin membaca notifikasi untuk mencocokkan pembayaran. Anda bertanggung jawab memastikan izin
          yang diperlukan tetap aktif agar layanan bekerja dengan benar. Menonaktifkan izin dapat menyebabkan transaksi tidak
          tercatat.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Batasan Tanggung Jawab</h2>
        <p className="muted" style={{ margin: 0 }}>
          Sawer Duite disediakan "sebagaimana adanya". Kami tidak bertanggung jawab atas kehilangan data akibat kesalahan pengguna,
          gangguan layanan, bug, downtime, atau ketidakakuratan pencocokan transaksi yang disebabkan oleh notifikasi pihak ketiga.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Perubahan Layanan</h2>
        <p className="muted" style={{ margin: 0 }}>
          Kami berhak mengubah, menambah, atau menghentikan fitur; mengubah paket layanan dan harga; serta memperbarui Syarat dan
          Ketentuan kapan saja.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Hak Kekayaan Intelektual</h2>
        <p className="muted" style={{ margin: 0 }}>
          Seluruh sistem, bot, dashboard, desain, dan kode adalah milik Sawer Duite. Pengguna tidak diperkenankan menyalin,
          memodifikasi, atau mendistribusikan tanpa izin tertulis dari kami.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Penghentian Layanan</h2>
        <p className="muted" style={{ margin: 0 }}>
          Kami dapat menghentikan akses anda apabila terjadi pelanggaran ketentuan, penggunaan yang merugikan sistem atau pengguna
          lain, atau adanya permintaan hukum/regulasi.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Hukum Yang Berlaku</h2>
        <p className="muted" style={{ margin: 0 }}>
          Syarat dan Ketentuan ini diatur oleh hukum Republik Indonesia. Setiap sengketa akan diselesaikan sesuai hukum yang berlaku
          di Indonesia.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Hubungi Kami</h2>
        <p className="muted" style={{ margin: 0 }}>Email: <a href="mailto:sawer@duitebot.com">sawer@duitebot.com</a></p>
      </section>

      <div>
        <Link to="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Kembali</Link>
      </div>
    </main>
  )
}

export default TermsOfService
