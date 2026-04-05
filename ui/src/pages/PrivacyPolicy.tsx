import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function PrivacyPolicy() {
  useDocumentTitle('Privacy Policy')

  return (
    <main className="page" style={{ maxWidth: '880px', margin: '0 auto', padding: '32px 20px 64px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p className="muted" style={{ margin: 0, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Legal</p>
        <h1 style={{ margin: 0, fontSize: 'clamp(2.2rem, 6vw, 3.4rem)' }}>Privacy Policy</h1>
        <p className="muted" style={{ margin: 0 }}>Terakhir diperbarui: 26 Desember 2025</p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Pendahuluan</h2>
        <p className="muted" style={{ margin: 0 }}>
          Selamat datang di Sawer Duite ("kami", "kita", atau "Sawer Duite"). Sawer Duite adalah layanan yang membantu kreator menerima
          dukungan melalui QRIS dan mencocokkan pembayaran berdasarkan notifikasi dari aplikasi pembayaran (mis. DANA/GOPAY
          Merchant). Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi
          anda saat menggunakan layanan. Dengan mengakses atau menggunakan layanan kami, anda menyetujui Kebijakan Privasi ini.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Informasi Yang Kami Kumpulkan</h2>
        <div className="muted" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Informasi Akun</p>
            <p style={{ margin: 0 }}>Nama, alamat email, dan informasi akun untuk autentikasi layanan.</p>
          </div>
          <div>
            <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Data Transaksi Yang Dicatat</p>
            <p style={{ margin: 0 }}>
              Informasi dari notifikasi pembayaran yang muncul di perangkat (contoh: nominal, bank pengirim, sumber pembayaran,
              judul/pesan notifikasi) untuk mencocokkan pembayaran dan menampilkan status transaksi.
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Data Penggunaan & Teknis</p>
            <p style={{ margin: 0 }}>
              Aktivitas penggunaan fitur, perangkat, browser, serta sistem operasi. Pada aplikasi Android, kami juga dapat
              mengumpulkan informasi diagnostik (log) untuk menjaga stabilitas dan memperbaiki gangguan pengiriman.
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Konfigurasi Aplikasi</p>
            <p style={{ margin: 0 }}>
              URL backend dan token aplikasi yang anda masukkan digunakan untuk mengirim data transaksi ke server anda.
            </p>
          </div>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Cookies & Teknologi Pelacakan</h2>
        <p className="muted" style={{ margin: 0 }}>
          Kami menggunakan cookies dan teknologi serupa untuk menjaga sesi login, melakukan analitik penggunaan layanan, dan
          meningkatkan performa serta pengalaman pengguna. Kami juga dapat menggunakan layanan pihak ketiga (seperti analytics
          tools) yang memiliki kebijakan privasi masing-masing.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Cara Kami Menggunakan Informasi</h2>
        <p className="muted" style={{ margin: 0 }}>
          Menyediakan dan mengoperasikan layanan, mengelola akun pengguna, memverifikasi pembayaran berdasarkan notifikasi,
          menyimpan dan menampilkan status transaksi, meningkatkan fitur dan performa, serta melakukan analitik internal dan
          pengembangan produk.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Penyimpanan & Retensi Data</h2>
        <p className="muted" style={{ margin: 0 }}>
          Kami menyimpan data anda selama akun aktif atau selama dibutuhkan untuk menjalankan layanan serta memenuhi kewajiban
          hukum. Anda dapat meminta penghapusan akun dan data kapan saja.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Pembagian Data</h2>
        <p className="muted" style={{ margin: 0 }}>
          Kami tidak menjual atau menyewakan data pribadi anda. Data hanya dibagikan dengan kondisi: penyedia layanan pihak ketiga
          (hosting, analytics) dengan kewajiban menjaga kerahasiaan, kepatuhan terhadap hukum yang berlaku, serta perlindungan hak
          dan keamanan Sawer Duite maupun pengguna.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Layanan Pihak Ketiga</h2>
        <p className="muted" style={{ margin: 0 }}>
          Layanan kami terhubung dengan platform pihak ketiga seperti aplikasi pembayaran, penyedia infrastruktur cloud, dan
          layanan analitik. Kami tidak bertanggung jawab atas kebijakan privasi layanan pihak ketiga tersebut.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Keamanan Data</h2>
        <p className="muted" style={{ margin: 0 }}>
          Kami menerapkan langkah-langkah teknis dan organisasi yang wajar untuk melindungi data anda. Namun, tidak ada sistem yang
          sepenuhnya bebas dari risiko keamanan digital.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Hak Pengguna</h2>
        <p className="muted" style={{ margin: 0 }}>
          Mengakses dan memperbarui data pribadi, meminta penghapusan akun dan data, serta menarik persetujuan penggunaan data (jika
          berlaku). Permintaan dapat dikirim ke email kontak kami.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Privasi Anak</h2>
        <p className="muted" style={{ margin: 0 }}>
          Sawer Duite tidak ditujukan untuk anak di bawah usia 13 tahun dan kami tidak secara sadar mengumpulkan data dari anak-anak.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Perubahan Kebijakan Privasi</h2>
        <p className="muted" style={{ margin: 0 }}>
          Kami dapat memperbarui kebijakan ini dari waktu ke waktu. Perubahan akan diumumkan melalui halaman ini dengan tanggal
          pembaruan terbaru.
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Hubungi Kami</h2>
        <p className="muted" style={{ margin: 0 }}>Sawer Duite — Email: <a href="mailto:sawer@duitebot.com">sawer@duitebot.com</a></p>
        <p className="muted" style={{ margin: 0 }}>Website: <a href="https://sawer.duitebot.com" target="_blank" rel="noreferrer">sawer.duitebot.com</a></p>
      </section>

      <div>
        <Link to="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Kembali</Link>
      </div>
    </main>
  )
}

export default PrivacyPolicy
