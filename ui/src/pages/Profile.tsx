import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_URL } from '../lib/api'

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

  useEffect(() => {
    setLoading(true)
    // Fetch User
    fetch(`${API_URL}/user/${username}`)
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(console.error)

    // Fetch Stats
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

  return (
    <main className="page page-center" style={{ gap: '32px', paddingBottom: '100px' }}>
      {/* Header Profile */}
      <div className="login-card" style={{ textAlign: 'center', alignItems: 'center', gap: '20px', width: 'min(500px, 100%)' }}>
        <div className="brand-mark" style={{ width: '80px', height: '80px', borderRadius: '32px' }} />
        <div>
          <h2 style={{ marginBottom: '4px' }}>{user.name}</h2>
          <p className="muted">@{user.username}</p>
        </div>
        <p className="lead" style={{ fontSize: '14px', opacity: 0.8 }}>
          Dukung saya agar bisa terus berkarya dan memberikan konten terbaik!
        </p>
        <Link to={`/${username}/donate`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Kirim Dukungan
        </Link>
      </div>

      <div className="dashboard-grid" style={{ width: 'min(1000px, 100%)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Stats Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="stats" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="stat">
              <p className="stat-label">Total Dukungan</p>
              <p className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>{formatCurrency(stats?.total_amount || 0)}</p>
            </div>
            <div className="stat">
              <p className="stat-label">Supporters</p>
              <p className="stat-value" style={{ fontSize: '1.2rem' }}>{stats?.total_donors || 0}</p>
            </div>
          </div>

          {/* Top Supporters */}
          <article className="card">
            <div className="card-header" style={{ marginBottom: '12px' }}>
              <h3>Top Supporters</h3>
              <select 
                value={topFilter} 
                onChange={(e) => setTopFilter(e.target.value as any)}
                style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border)' }}
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
                    <div>
                      <p className="feed-name">{s.sender}</p>
                    </div>
                    <div className="feed-meta">
                      <span className="amount">{formatCurrency(s.amount)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted" style={{ textAlign: 'center', padding: '20px' }}>Belum ada data</p>
              )}
            </div>
          </article>
        </div>

        {/* Recent Donations */}
        <article className="card">
          <div className="card-header">
            <h3>Recent Donations</h3>
          </div>
          <div className="feed">
            {stats?.recent?.length ? (
              stats.recent.map((tx) => (
                <div key={tx.uuid} className="feed-row">
                  <div style={{ flex: 1 }}>
                    <p className="feed-name">{tx.sender}</p>
                    <p className="feed-note" style={{ fontSize: '12px' }}>{tx.note}</p>
                  </div>
                  <div className="feed-meta">
                    <span className="amount">{formatCurrency(tx.base_amount)}</span>
                    <span style={{ fontSize: '10px' }}>{new Date(tx.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted" style={{ textAlign: 'center', padding: '20px' }}>Belum ada donasi</p>
            )}
          </div>
        </article>

      </div>
    </main>
  )
}

export default Profile
