import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL, getTokens, refreshTokens, setTokens } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function Login() {
  useDocumentTitle('Login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Email atau password salah')
      }

      const data = await response.json()
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
        <div className="section-label">
          <span className="pulse-dot" />
          <span className="label-text">LOGIN</span>
        </div>
        <h2>Masuk ke akunmu.</h2>

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
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default Login
