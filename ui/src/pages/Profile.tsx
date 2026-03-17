import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_URL } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'

interface Supporter {
  sender: string
  amount: number
}

interface Stats {
  total_amount: number
  total_donors: number
  recent: any[]
  top_supporters: {
    all: Supporter[]
    day: Supporter[]
    week: Supporter[]
    month: Supporter[]
  }
}

function Profile() {
  const { username } = useParams()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [topFilter, setTopFilter] = useState<'all' | 'day' | 'week' | 'month'>('all')

  useDocumentTitle(user?.name ? `${user.name} (@${username})` : username)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/user/${username}`)
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(console.error)

    fetch(`${API_URL}/user/${username}/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [username])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  if (loading) return <main className="page page-center"><p>Loading...</p></main>
  if (!user) return <main className="page page-center"><h2>Not found</h2></main>

  const handle = user?.username || username || ''
  const socials = [
    { 
      label: 'Instagram', 
      url: `https://instagram.com/${handle}`, 
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      )
    },
    { 
      label: 'TikTok', 
      url: `https://www.tiktok.com/@${handle}`, 
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
        </svg>
      )
    },
    { 
      label: 'YouTube', 
      url: `https://www.youtube.com/@${handle}`, 
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z"></path>
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon>
        </svg>
      )
    },
    { 
      label: 'X', 
      url: `https://x.com/${handle}`, 
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
          <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
        </svg>
      )
    },
  ]

  return (
    <main className="page page-center">
      <div className="login-card" style={{ textAlign: 'center', alignItems: 'center' }}>
        <div className="brand-mark" style={{ width: '80px', height: '80px', borderRadius: '24px', marginBottom: '8px' }} />
        <div>
          <h2 style={{ marginBottom: '4px' }}>{user.name}</h2>
          <p className="muted" style={{ fontWeight: 600 }}>@{user.username}</p>
        </div>
        <p className="lead text-center" style={{ opacity: 0.8 }}>
          Dukung saya agar bisa terus berkarya dan memberikan konten terbaik!
        </p>
        
        <div className="w-full">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                title={s.label}
                style={{ padding: '0', width: '44px', height: '44px', borderRadius: '12px' }}
              >
                {s.icon}
              </a>
            ))}
          </div>
          <Link to={`/${username}/donate`} className="btn btn-primary w-full" style={{ height: '56px', fontSize: '16px', borderRadius: '16px' }}>
            Kirim Dukungan
          </Link>
        </div>
      </div>

      <div className="dashboard-grid w-full" style={{ maxWidth: '1000px' }}>
        <div className="page" style={{ gap: '20px' }}>
          <div className="stats">
            <div className="stat">
              <p className="stat-label">Total Dukungan</p>
              <p className="stat-value" style={{ color: 'var(--accent)' }}>{formatCurrency(stats?.total_amount || 0)}</p>
            </div>
            <div className="stat">
              <p className="stat-label">Supporters</p>
              <p className="stat-value">{stats?.total_donors || 0}</p>
            </div>
          </div>

          <article className="card">
            <div className="card-header">
              <h3>Top Supporters</h3>
              <select
                value={topFilter}
                onChange={(e) => setTopFilter(e.target.value as any)}
                className="input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
              >
                <option value="all">Semua</option>
                <option value="day">Hari ini</option>
                <option value="week">Minggu ini</option>
                <option value="month">Bulan ini</option>
              </select>
            </div>
            <div className="feed">
              {stats?.top_supporters[topFilter]?.length ? (
                stats.top_supporters[topFilter].map((s, i) => (
                  <div key={i} className="feed-row">
                    <div className="feed-user-info">
                      <div className="feed-avatar">{s.sender[0]}</div>
                      <p className="feed-name">{s.sender}</p>
                    </div>
                    <span className="feed-amount" style={{ color: 'var(--accent)' }}>{formatCurrency(s.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="muted text-center" style={{ padding: '20px' }}>Belum ada data</p>
              )}
            </div>
          </article>
        </div>

        <article className="card">
          <div className="card-header">
            <h3>Recent Donations</h3>
          </div>
          <div className="feed">
            {stats?.recent?.length ? (
              stats.recent.map((tx) => (
                <div key={tx.uuid} className="feed-row" style={{ alignItems: 'flex-start' }}>
                  <div className="feed-user-info">
                    <div className="feed-avatar">{tx.sender[0]}</div>
                    <div className="feed-text">
                      <p className="feed-name">{tx.sender}</p>
                      <p className="feed-note" style={{ whiteSpace: 'normal' }}>{tx.note || 'Terima kasih!'}</p>
                    </div>
                  </div>
                  <div className="feed-meta">
                    <p className="feed-amount">{formatCurrency(tx.base_amount)}</p>
                    <p style={{ fontSize: '10px', opacity: 0.5 }}>{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted text-center" style={{ padding: '20px' }}>Belum ada donasi</p>
            )}
          </div>
        </article>
      </div>
    </main>
  )
}

export default Profile
