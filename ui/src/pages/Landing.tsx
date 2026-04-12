import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { API_URL } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function Landing() {
  useDocumentTitle('Semua Pembayaran di Satu Tempat')
  const [users, setUsers] = useState<{ username: string; name: string }[]>([])

  useEffect(() => {
    fetch(`${API_URL}/users?limit=12`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data.filter(u => u?.username && u?.name))
        }
      })
      .catch(() => {})
  }, [])

  const userLoop = useMemo(() => {
    if (users.length === 0) return []
    return [...users, ...users]
  }, [users])

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'SO'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <main className="page overlay-page" style={{ gap: '32px' }}>
      <div className="hero-copy text-center" style={{ alignItems: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(3rem, 10vw, 5rem)', marginBottom: '16px' }}>Sawer Duite.</h1>
        <p className="lead" style={{ marginBottom: '32px' }}>
          Terima dukungan fans secara utuh: 100% milikmu, instan lewat QRIS, tanpa biaya potongan sepeser pun
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px', textDecoration: 'none' }}>
            Mulai Sekarang
          </Link>
        </div>
      </div>

      <section className="merchant-section">
        <p className="merchant-label">Support beberapa merchant</p>
        <div className="merchant-slider">
          <div className="merchant-track">
            <img src="/dana-logo.svg" alt="DANA Business" width="96" height="32" className="merchant-logo" />
            <img src="/gopay-logo.svg" alt="GoPay Merchant" width="96" height="32" className="merchant-logo" />
            <img src="/dana-logo.svg" alt="DANA Business" width="96" height="32" className="merchant-logo" />
            <img src="/gopay-logo.svg" alt="GoPay Merchant" width="96" height="32" className="merchant-logo" />
          </div>
        </div>
      </section>

      {users.length > 0 && (
        <section className="merchant-section" style={{ marginTop: '-6px' }}>
          <p className="merchant-label">Creator Yang Sudah Pakai</p>
          <div className="user-slider">
            <div className="user-track">
              {userLoop.map((user, idx) => (
                <div key={`${user.username}-${idx}`} className="user-pill">
                  <div className="user-avatar" aria-hidden="true">
                    {getInitials(user.name)}
                  </div>
                  <div className="user-info">
                    <div className="user-name-row">
                      <p className="user-name">{user.name}</p>
                      <div className="verified-badge-container">
                        <svg
                          className="verified-badge"
                          style={{ transform: 'translateY(-1px)' }}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="1.6 1.6 18.79 18.79"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.540.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                            fill="#2f8cff"
                          />
                        </svg>
                        <span className="verified-tooltip">Verified Account</span>
                      </div>
                    </div>
                    <p className="user-handle">@{user.username}</p>
                  </div>
                  <Link to={`/${user.username}`} className="btn btn-secondary user-button" style={{ textDecoration: 'none' }}>
                    Lihat Profil
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        <p className="muted" style={{ margin: 0, fontSize: '12px', textAlign: 'center' }}>
          <Link to="/privacy">Privacy Policy</Link>
          {' '}•{' '}
          <Link to="/terms">Terms of Service</Link>
          {' '}•{' '}
          Copyright {new Date().getFullYear()} by brogrammer.id
        </p>
      </footer>
    </main>
  )
}

export default Landing
