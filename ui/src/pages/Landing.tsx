import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function Landing() {
  useDocumentTitle('Semua Pembayaran di Satu Tempat')
  return (
    <main className="page overlay-page" style={{ gap: '48px' }}>
      <div className="hero-copy text-center" style={{ alignItems: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(3rem, 10vw, 5rem)', marginBottom: '16px' }}>Sawer Om.</h1>
        <p className="lead" style={{ marginBottom: '32px' }}>
          Terima dukungan dari penggemarmu dengan mudah, cepat, dan transparan dalam satu tempat.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
            Mulai Sekarang
          </Link>
        </div>
      </div>

      <section className="merchant-section">
        <p className="merchant-label">Support beberapa merchant</p>
        <div className="merchant-slider">
          <div className="merchant-track">
            <img src="/dana-logo.svg" alt="DANA Business" className="merchant-logo" />
            <img src="/gopay-logo.svg" alt="GoPay Merchant" className="merchant-logo" />
            <img src="/dana-logo.svg" alt="DANA Business" className="merchant-logo" />
            <img src="/gopay-logo.svg" alt="GoPay Merchant" className="merchant-logo" />
          </div>
        </div>
      </section>
    </main>
  )
}

export default Landing
