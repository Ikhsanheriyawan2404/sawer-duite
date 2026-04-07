import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { API_URL, getTokens, refreshTokens, setTokens } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function Register() {
  useDocumentTitle('Daftar Akun')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    const { accessToken, refreshToken } = getTokens()
    if (accessToken) {
      navigate('/home', { replace: true })
      return
    }
    if (refreshToken) {
      refreshTokens().then((newAccessToken) => {
        if (isMounted && newAccessToken) {
          navigate('/home', { replace: true })
        }
      })
    }

    return () => {
      isMounted = false
    }
  }, [navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirmation) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    if (password.length < 8) {
      setError('Password minimal 8 karakter')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          password_confirmation: passwordConfirmation 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mendaftar')
      }

      setTokens(data.access_token, data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      navigate('/home')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page page-center">
      <section className="login-card">
        <p className="section-intro-label">MULAI SEKARANG</p>
        <h2>Buat akun baru.</h2>

        {error && <p style={{ color: '#ff4d4d', fontSize: '14px', margin: 0 }}>{error}</p>}

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              placeholder="kamu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <label>
            Konfirmasi Password
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Ulangi password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="muted" style={{ fontSize: '14px', textAlign: 'center', marginTop: '8px' }}>
          Sudah punya akun? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Masuk di sini</Link>
        </p>
      </section>
    </main>
  )
}

export default Register
