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

  const socials = [
    {
      label: 'TikTok',
      url: user.tiktok || 'https://www.tiktok.com/@ongobkun',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
        </svg>
      )
    },
    {
      label: 'Instagram',
      url: user.instagram || 'https://www.instagram.com/kychan.real/',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      )
    },
    {
      label: 'YouTube',
      url: user.youtube || 'https://www.youtube.com/@aikyyfishit',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z"></path>
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon>
        </svg>
      )
    },
  ]

  // Hitung Progress Target
  const totalAmount = stats?.total_amount || 0
  const targetAmount = user?.target_amount || 0
  const progressPercent = targetAmount > 0 ? Math.min(Math.round((totalAmount / targetAmount) * 100), 100) : 0
  const realPercent = targetAmount > 0 ? Math.round((totalAmount / targetAmount) * 100) : 0

  return (
    <main className="page page-center">
      {/* CARD PROFILE */}
      <div className="login-card" style={{ textAlign: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <img
            src="/profile.jpg"
            alt={user.name}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--accent)',
              boxShadow: '0 4px 14px rgba(0, 82, 255, 0.25)'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            padding: '4px 12px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid var(--border)',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}>
            <img src="/verified.png" alt="verified" style={{ width: '16px', height: '16px' }} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Verified Account
            </span>
          </div>
        </div>

        <div style={{ marginTop: '8px' }}>
          <h2 style={{ marginBottom: '4px' }}>{user.name}</h2>
          <p className="muted" style={{ fontWeight: 600, marginBottom: '12px' }}>@{user.username}</p>
          {user.bio && (
            <p style={{
              fontSize: '15px',
              lineHeight: '1.6',
              color: 'var(--foreground)',
              maxWidth: '420px',
              margin: '0 auto 16px',
              padding: '16px 20px',
              background: 'var(--muted)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              fontWeight: 500
            }}>
              {user.bio}
            </p>
          )}
        </div>

        <div className="w-full">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
            {socials.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="btn btn-secondary" title={s.label} style={{ padding: '0', width: '44px', height: '44px', borderRadius: '12px' }}>
                {s.icon}
              </a>
            ))}
          </div>
          <Link to={`/${username}/donate`} className="btn btn-primary w-full" style={{ height: '56px', fontSize: '16px', borderRadius: '16px' }}>
            Donate Disini
          </Link>
        </div>
      </div>

      {/* SECTION BAWAH (SINGLE COLUMN) */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
        
        {/* BARIS 0: PILIHAN DUKUNGAN (PAKET) */}
        {user?.donation_packages?.length > 0 && (
          <article className="card" style={{ padding: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', textAlign: 'center' }}>
              Pilih Paket Dukungan
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {user.donation_packages.map((p: any, i: number) => (
                <div
                  key={i}
                  style={{ 
                    padding: '16px 20px', 
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    background: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--foreground)', lineHeight: '1.3' }}>
                    {p.label}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '16px' }}>
                      {formatCurrency(p.amount)}
                    </span>
                    <Link
                      to={`/${username}/donate?amount=${p.amount}&note=${encodeURIComponent(p.label)}&fixed=true`}
                      className="btn btn-primary"
                      style={{ 
                        padding: '6px 16px', 
                        fontSize: '13px', 
                        height: 'auto',
                        borderRadius: '10px',
                        minWidth: '70px',
                        textAlign: 'center'
                      }}
                    >
                      Pilih
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* BARIS 1: TOTAL DUKUNGAN & TARGET */}
        <article className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Dukungan</p>
              <h3 style={{ fontSize: '32px', color: 'var(--accent)' }}>{formatCurrency(totalAmount)}</h3>
            </div>

            {targetAmount > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>Target: {user.target_description || 'Dukungan Kreator'}</p>
                    <p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Terkumpul {progressPercent}% dari {formatCurrency(targetAmount)}</p>
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>{realPercent}%</span>
                </div>
                <div style={{ height: '12px', background: 'var(--muted)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: 'var(--gradient)', 
                      width: `${progressPercent}%`,
                      transition: 'width 1s ease-in-out',
                      boxShadow: '0 0 10px rgba(0, 82, 255, 0.3)'
                    }} 
                  />
                </div>
              </div>
            )}
          </div>
        </article>

        {/* BARIS 2: TOTAL SUPPORTER */}
        <article className="card" style={{ padding: '24px' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', marginBottom: '4px' }}>Supporters</p>
          <h3 style={{ fontSize: '32px' }}>{stats?.total_donors || 0} <span style={{ fontSize: '16px', color: 'var(--muted-foreground)', fontWeight: 500 }}>Orang</span></h3>
        </article>

        {/* BARIS 3: TOP SUPPORTERS */}
        <article className="card">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <h3>Top Supporters</h3>
            <select
              value={topFilter}
              onChange={(e) => setTopFilter(e.target.value as any)}
              className="input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', borderRadius: '10px' }}
            >
              <option value="all">Semua Waktu</option>
              <option value="day">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>
          <div className="feed">
            {stats?.top_supporters[topFilter]?.length ? (
              stats.top_supporters[topFilter].slice(0, 10).map((s, i) => (
                <div key={i} className="feed-row" style={{ padding: '12px 0' }}>
                  <div className="feed-user-info">
                    <div className="feed-avatar" style={{ background: i < 3 ? 'var(--accent)' : '#e2e8f0', color: i < 3 ? '#fff' : 'inherit' }}>
                      {i + 1}
                    </div>
                    <p className="feed-name" style={{ fontWeight: 700 }}>{s.sender}</p>
                  </div>
                  <span className="feed-amount" style={{ color: 'var(--accent)', fontWeight: 800 }}>{formatCurrency(s.amount)}</span>
                </div>
              ))
            ) : (
              <p className="muted text-center" style={{ padding: '40px' }}>Belum ada data untuk periode ini</p>
            )}
          </div>
        </article>

        {/* BARIS 4: RECENT DONATIONS */}
        <article className="card">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <h3>Recent Donations</h3>
          </div>
          <div className="feed">
            {stats?.recent?.length ? (
              stats.recent.slice(0, 10).map((tx) => (
                <div key={tx.uuid} className="feed-row" style={{ alignItems: 'flex-start', padding: '16px 0' }}>
                  <div className="feed-user-info">
                    <div className="feed-avatar">{tx.sender[0]?.toUpperCase()}</div>
                    <div className="feed-text">
                      <p className="feed-name" style={{ fontWeight: 700 }}>{tx.sender}</p>
                      <p className="feed-note" style={{ whiteSpace: 'normal', fontSize: '14px', marginTop: '4px' }}>{tx.note || 'Terima kasih!'}</p>
                    </div>
                  </div>
                  <div className="feed-meta" style={{ textAlign: 'right' }}>
                    <p className="feed-amount" style={{ fontWeight: 700 }}>{formatCurrency(tx.base_amount)}</p>
                    <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted text-center" style={{ padding: '40px' }}>Belum ada donasi baru</p>
            )}
          </div>
        </article>

      </div>
    </main>
  )
}

export default Profile
