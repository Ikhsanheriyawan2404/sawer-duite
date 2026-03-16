import { Link } from 'react-router-dom'

function Landing() {
  return (
    <main className="page page-center overlay-page">
      <div className="hero-copy" style={{ textAlign: 'center', alignItems: 'center' }}>
        <h1>Ongob.</h1>
        <p className="lead">Semua pembayaran di satu tempat.</p>
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary">Mulai Sekarang</Link>
        </div>
      </div>
    </main>
  )
}

export default Landing


