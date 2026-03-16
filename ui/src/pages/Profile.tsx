import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_URL } from '../lib/api'

function Profile() {
  const { username } = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/user/${username}`)
      .then(res => res.json())
      .then(data => {
        setUser(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [username])

  if (loading) return <main className="page page-center"><p>Loading...</p></main>
  if (!user) return <main className="page page-center"><h2>Not found</h2></main>

  return (
    <main className="page page-center overlay-page">
      <div className="login-card" style={{ textAlign: 'center', alignItems: 'center', gap: '24px' }}>
        <div className="brand-mark" style={{ width: '80px', height: '80px', borderRadius: '32px' }} />

        <div>
          <h2 style={{ marginBottom: '4px' }}>{user.name}</h2>
          <p className="muted">@{user.username}</p>
        </div>

        <p className="lead" style={{ fontSize: '15px' }}>
          Terima kasih sudah berkunjung! Dukung karya saya agar saya bisa terus berkarya.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <a href="#" className="btn btn-ghost" style={{ padding: '8px' }}>
            <svg width="24" height="24" fill="currentColor"><use href="/icons.svg#x-icon"/></svg>
          </a>
          <a href="#" className="btn btn-ghost" style={{ padding: '8px' }}>
            <svg width="24" height="24" fill="currentColor"><use href="/icons.svg#github-icon"/></svg>
          </a>
          <a href="#" className="btn btn-ghost" style={{ padding: '8px' }}>
            <svg width="24" height="24" fill="currentColor"><use href="/icons.svg#bluesky-icon"/></svg>
          </a>
        </div>

        <Link to={`/${username}/donate`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Kirim Dukungan
        </Link>
      </div>
    </main>
  )
}

export default Profile
