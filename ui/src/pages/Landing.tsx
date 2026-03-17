import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function Landing() {
  useDocumentTitle('Semua Pembayaran di Satu Tempat')
  return (
    <main className="page page-center overlay-page">
      <div className="hero-copy text-center" style={{ alignItems: 'center', maxWidth: '600px' }}>
        <h1 style={{ fontSize: 'clamp(3rem, 10vw, 5rem)', marginBottom: '16px' }}>Saweran.</h1>
        <p className="lead" style={{ marginBottom: '32px' }}>
          Terima dukungan dari penggemarmu dengan mudah, cepat, dan transparan dalam satu tempat.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
            Mulai Sekarang
          </Link>
        </div>
      </div>
    </main>
  )
}

export default Landing
