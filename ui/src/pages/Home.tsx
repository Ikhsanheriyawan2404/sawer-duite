import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'

interface User {
  id: number
  uuid: string
  email: string
  username: string
  name: string
  created_at: string
  updated_at: string
}

function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ name: '', username: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = JSON.parse(savedUser)
      setUser(parsed)
      setFormData({ name: parsed.name, username: parsed.username })
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        setUser(data)
        setFormData({ name: data.name, username: data.username })
        localStorage.setItem('user', JSON.stringify(data))
      })
      .catch(err => console.error('Failed to fetch profile', err))
  }, [])

  function handleEdit() {
    setIsEditing(true)
    setError('')
  }

  function handleCancel() {
    setIsEditing(false)
    setError('')
    if (user) {
      setFormData({ name: user.name, username: user.username })
    }
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.username.trim()) {
      setError('Nama dan username tidak boleh kosong')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await fetchWithAuth('/me', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const text = await res.text()
        if (res.status === 409) {
          setError('Username sudah digunakan')
        } else {
          setError(text || 'Gagal menyimpan')
        }
        return
      }

      const updatedUser = await res.json()
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setIsEditing(false)
    } catch (err) {
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <main className="page">
      <section className="dashboard-header">
        <div>
          <h2>Halo, {user?.name || '...'}</h2>
          <p className="lead">Semua aktivitas pembayaranmu akan muncul di sini.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        {/* Profile Card */}
        <article className="card">
          <div className="card-header">
            <h3>Profil</h3>
            {!isEditing && (
              <button className="btn btn-secondary btn-sm" onClick={handleEdit}>
                Edit
              </button>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            <div className="form-group">
              <label>Nama</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              ) : (
                <p className="form-value">{user?.name || '-'}</p>
              )}
            </div>

            <div className="form-group">
              <label>Username</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="input"
                />
              ) : (
                <p className="form-value">@{user?.username || '-'}</p>
              )}
            </div>

            <div className="form-group">
              <label>Email</label>
              <p className="form-value">{user?.email || '-'}</p>
            </div>

            <div className="form-group">
              <label>Bergabung sejak</label>
              <p className="form-value">{user?.created_at ? formatDate(user.created_at) : '-'}</p>
            </div>

            {isEditing && (
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                  Batal
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            )}
          </div>
        </article>

        {/* Overlay Links Card */}
        <article className="card">
          <div className="card-header">
            <h3>Overlay Widgets</h3>
            <span className="badge">Streaming</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Alert Overlay', path: `/overlays/alert/${user?.uuid}` },
              { label: 'Queue Overlay', path: `/overlays/queue/${user?.uuid}` },
              { label: 'Media Overlay', path: `/overlays/media/${user?.uuid}` },
            ].map((overlay) => (
              <div key={overlay.path} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>{overlay.label}</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    readOnly
                    value={`${window.location.origin}${overlay.path}`}
                    className="input"
                    style={{ flex: 1, fontSize: '11px', padding: '8px' }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${overlay.path}`)
                      alert(`${overlay.label} link copied!`)
                    }}
                  >
                    Salin
                  </button>
                  <a
                    href={overlay.path}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    Buka
                  </a>
                </div>
              </div>
            ))}
          </div>
        </article>

          {/* Recent Transactions */}
        <article className="card card-wide" style={{ borderStyle: 'dashed', background: 'transparent', boxShadow: 'none' }}>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted-foreground)' }}>
            <p>Belum ada transaksi terbaru saat ini.</p>
          </div>
        </article>
      </section>
    </main>
  )
}

export default Home
