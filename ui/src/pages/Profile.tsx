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
    if (!username) return
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
      url: user?.social_links?.tiktok,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
        </svg>
      )
    },
    {
      label: 'Instagram',
      url: user?.social_links?.instagram,
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
      url: user?.social_links?.youtube,
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
      <div className="login-card" style={{ textAlign: 'center', alignItems: 'center', padding: '32px', gap: '0' }}>
        {/* Photo Profile */}
        <div style={{ marginBottom: '12px' }}>
          <img
            src={user.avatar_url || '/profile.jpg'}
            alt={user.name}
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--accent)',
              boxShadow: '0 4px 14px rgba(0, 82, 255, 0.2)'
            }}
          />
        </div>

        {/* Name & Verified Icon Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '26px', margin: 0, fontWeight: 700 }}>{user.name}</h2>
          <div className="verified-badge-container">
            <svg
              className="verified-badge"
              style={{ transform: 'translateY(-2px)', height: '99%' }}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="1.6 1.6 18.79 18.79"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                fill="#0095f6"
              />
            </svg>
            <span className="verified-tooltip">Verified Account</span>
          </div>
        </div>

        <style>{`
          .verified-badge-container {
            position: relative;
            display: inline-block;
          }
          .verified-badge {
            width: 22px;
            height: 22px;
            display: block;
          }
          .verified-tooltip {
            visibility: hidden;
            width: 120px;
            background-color: var(--foreground);
            color: #fff;
            text-align: center;
            border-radius: 8px;
            padding: 6px 0;
            position: absolute;
            z-index: 10;
            bottom: 125%;
            left: 50%;
            margin-left: -60px;
            opacity: 0;
            transition: opacity 0.2s, transform 0.2s;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            pointer-events: none;
            transform: translateY(10px);
            box-shadow: var(--shadow-lg);
          }
          .verified-tooltip::after {
            content: "";
            position: absolute;
            top: 100%;
            left: 50%;
            margin-left: -5px;
            border-width: 5px;
            border-style: solid;
            border-color: var(--foreground) transparent transparent transparent;
          }
          .verified-badge-container:hover .verified-tooltip {
            visibility: visible;
            opacity: 1;
            transform: translateY(0);
          }
        `}</style>

        {/* Social Media Links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
          {socials.filter(s => s.url).map((s) => (
            <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="btn btn-secondary" title={s.label} style={{ padding: '0', width: '44px', height: '44px', borderRadius: '12px' }}>
              {s.icon}
            </a>
          ))}
        </div>

        {/* Donate Button */}
        <Link to={`/${username}/donate`} className="btn btn-primary w-full" style={{ height: '52px', fontSize: '16px', borderRadius: '14px', marginBottom: '16px', textDecoration: 'none' }}>
          Donate Disini
        </Link>

        {/* Bio */}
        {user.bio && (
          <p style={{
            fontSize: '15px',
            lineHeight: '1.6',
            color: 'var(--foreground)',
            padding: '16px 20px',
            background: 'var(--muted)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            fontWeight: 500,
            width: '100%',
            textAlign: 'center',
            margin: 0
          }}>
            {user.bio}
          </p>
        )}
      </div>

      {/* SECTION BAWAH (SINGLE COLUMN) */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>

        {/* BARIS 0: PILIHAN DUKUNGAN (PAKET) */}
        {user?.donation_packages?.length > 0 && (
          <article className="card" style={{ padding: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', textAlign: 'center' }}>
              Pilih Paket Dukungan
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {user.donation_packages.map((p: any, i: number) => (
                <div
                  key={i}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    background: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--muted-foreground)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {p.label}
                    </p>
                    <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>
                      {formatCurrency(p.amount)}
                    </p>
                  </div>
                  <Link
                    to={`/${username}/donate?amount=${p.amount}&note=${encodeURIComponent(p.label)}&fixed=true`}
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', height: '40px', borderRadius: '12px' }}
                  >
                    Pilih
                  </Link>
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
                <div key={i} className="feed-row" style={{ minWidth: 0 }}>
                  <div className="feed-user-info" style={{ minWidth: 0, flex: 1 }}>
                    <div className="feed-avatar" style={{ background: i < 3 ? 'var(--accent)' : '#e2e8f0', color: i < 3 ? '#fff' : 'inherit', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div className="feed-text" style={{ minWidth: 0, flex: 1 }}>
                      <p className="feed-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>
                        {s.sender}
                      </p>
                    </div>
                  </div>
                  <div className="feed-meta" style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p className="feed-amount" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                      {formatCurrency(s.amount)}
                    </p>
                  </div>
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
                <div key={tx.uuid} className="feed-row" style={{ minWidth: 0 }}>
                  <div className="feed-user-info" style={{ minWidth: 0, flex: 1 }}>
                    <div className="feed-avatar" style={{ flexShrink: 0 }}>{tx.sender[0]?.toUpperCase()}</div>
                    <div className="feed-text" style={{ minWidth: 0, flex: 1 }}>
                      <p className="feed-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>{tx.sender}</p>
                      <p className="feed-note" style={{ whiteSpace: 'normal', fontSize: '14px', marginTop: '4px', color: 'var(--muted-foreground)' }}>
                        {tx.note || 'Terima kasih!'}
                      </p>
                    </div>
                  </div>
                  <div className="feed-meta" style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p className="feed-amount" style={{ fontWeight: 700 }}>{formatCurrency(tx.base_amount)}</p>
                    <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
                      {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
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
