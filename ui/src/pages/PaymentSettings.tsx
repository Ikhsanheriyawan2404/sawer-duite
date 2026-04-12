import { useEffect, useRef, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'
import type { NormalizedUser } from '../lib/normalizeUser'

interface DonationPackage {
  label: string
  amount: number
}

function PaymentSettings() {
  useDocumentTitle('Pengaturan Pembayaran')
  const [user, setUser] = useState<NormalizedUser | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    tiktok: '',
    instagram: '',
    youtube: '',
    min_donation: 0,
    active_goal: null as any,
    quick_amounts: [] as number[],
    donation_packages: [] as DonationPackage[],
    queue_title: '',
    static_qris: '',
    provider: 'DANA'
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
      setFormData({
        name: parsed.name || '',
        username: parsed.username || '',
        bio: parsed.bio || '',
        tiktok: parsed.tiktok || '',
        instagram: parsed.instagram || '',
        youtube: parsed.youtube || '',
        min_donation: parsed.min_donation || 0,
        active_goal: parsed.active_goal || null,
        quick_amounts: parsed.quick_amounts || [],
        donation_packages: parsed.donation_packages || [],
        queue_title: parsed.queue_title || '',
        static_qris: parsed.static_qris || '',
        provider: parsed.provider || 'DANA'
      })
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setUser(normalized)
        setFormData({
          name: normalized.name || '',
          username: normalized.username || '',
          bio: normalized.bio || '',
          tiktok: normalized.tiktok || '',
          instagram: normalized.instagram || '',
          youtube: normalized.youtube || '',
          min_donation: normalized.min_donation || 0,
          active_goal: normalized.active_goal || null,
          quick_amounts: normalized.quick_amounts || [],
          donation_packages: normalized.donation_packages || [],
          queue_title: normalized.queue_title || '',
          static_qris: normalized.static_qris || '',
          provider: normalized.provider || 'DANA'
        })
        localStorage.setItem('user', JSON.stringify(normalized))
      })
      .catch(err => console.error('Failed to fetch profile', err))
  }, [])

  function showToast(message: string) {
    setToastMessage(message)
    setToastVisible(true)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false)
    }, 2200)
  }

  function maskToken(value: string) {
    if (!value) return 'Token belum tersedia'
    if (value.length <= 6) return '••••••'
    return `${value.slice(0, 4)}••••••${value.slice(-2)}`
  }

  function handleEdit() {
    setIsEditing(true)
    setError('')
  }

  function handleCancel() {
    setIsEditing(false)
    setError('')
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        bio: user.bio || '',
        tiktok: user.tiktok || '',
        instagram: user.instagram || '',
        youtube: user.youtube || '',
        min_donation: user.min_donation || 0,
        active_goal: user.active_goal || null,
        quick_amounts: user.quick_amounts || [],
        donation_packages: user.donation_packages || [],
        queue_title: user.queue_title || '',
        static_qris: user.static_qris || '',
        provider: user.provider || 'DANA'
      })
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      const res = await fetchWithAuth('/me/payment', {
        method: 'POST',
        body: JSON.stringify({
          provider: formData.provider,
          static_qris: formData.static_qris
        }),
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

      const updatedUser = normalizeMeUser(await res.json())
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setIsEditing(false)
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <div className={`toast-container ${toastVisible ? 'toast-show' : ''}`} role="status" aria-live="polite">
        <div className="toast">{toastMessage}</div>
      </div>

      <section className="dashboard-header">
        <div>
          <h2>Pengaturan Pembayaran</h2>
          <p className="lead">Atur provider merchant, QRIS, dan token aplikasi Android.</p>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <h3>Pengaturan Pembayaran</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Provider Merchant</label>
                  <div className="provider-selector">
                    {[
                      { id: 'DANA', label: 'DANA Business', logo: '/dana-logo.svg' },
                      { id: 'GOPAY', label: 'GoPay Merchant', logo: '/gopay-logo.svg' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className={`provider-card ${formData.provider === p.id ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, provider: p.id })}
                      >
                        <div className="provider-logo-container">
                          <img src={p.logo} alt={p.label} width="80" height="24" />
                        </div>
                        <span className="provider-label-text">{p.label}</span>
                        {formData.provider === p.id && (
                          <div className="provider-check">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Kode QRIS Statis</label>
                  <textarea
                    value={formData.static_qris}
                    onChange={e => setFormData({ ...formData, static_qris: e.target.value })}
                    className="input"
                    placeholder="Paste kode QRIS dari aplikasi (000201010211...)"
                    style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                    Pastikan Anda menyalin kode string QRIS dengan benar (bukan gambar).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button className="btn btn-secondary" onClick={handleCancel}>
                    Batal
                  </button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="profile-display">
                  <div className="profile-field">
                    <p className="profile-label">Provider Merchant</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                      <div className="provider-logo-display">
                        <img 
                          src={user?.provider === 'GOPAY' ? '/gopay-logo.svg' : '/dana-logo.svg'} 
                          alt={user?.provider} 
                          width="72"
                          height="24"
                        />
                      </div>
                      <p className="profile-value">
                        {user?.provider === 'GOPAY' ? 'GoPay Merchant' : user?.provider === 'DANA' ? 'DANA Business' : (user?.provider || '-')}
                      </p>
                    </div>
                  </div>
                  <div className="profile-field">
                    <p className="profile-label">Status QRIS</p>
                    <p className="profile-value" style={{ fontSize: '14px' }}>
                      {user?.static_qris ? (
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Terkonfigurasi ✓</span>
                      ) : (
                        <span style={{ color: '#dc2626' }}>Belum disetel</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="profile-display" style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div className="profile-field" style={{ width: '100%' }}>
                    <p className="profile-label">App Token (Untuk Aplikasi Android Listener)</p>
                    <p className="muted" style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#dc2626' }}>
                      Jaga kerahasiaannya. Jangan bagikan token ini ke pihak lain.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        readOnly
                        value={maskToken(user?.app_token || '')}
                        className="input"
                        style={{ flex: '1 1 200px', fontFamily: 'monospace', fontSize: '12px', background: 'var(--muted)', minWidth: 0 }}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: '0 0 auto' }}
                        onClick={() => {
                          if (user?.app_token) {
                            navigator.clipboard.writeText(user.app_token)
                            showToast('Token disalin')
                          }
                        }}
                      >
                        Salin
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={handleEdit}>Edit</button>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>

      <style>{`
        .provider-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 4px;
        }
        .provider-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          background: #fff;
          border: 2px solid var(--border);
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
        }
        .provider-card:hover:not(.active) {
          border-color: #cbd5e1;
          background: #f8fafc;
          transform: translateY(-2px);
        }
        .provider-card.active {
          border-color: var(--accent);
          background: rgba(0, 82, 255, 0.04);
          box-shadow: 0 4px 12px rgba(0, 82, 255, 0.08);
        }
        .provider-logo-container {
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .provider-logo-container img {
          max-height: 100%;
          width: auto;
          object-fit: contain;
          filter: grayscale(0.2);
          transition: filter 0.2s;
        }
        .provider-card.active .provider-logo-container img {
          filter: grayscale(0);
        }
        .provider-label-text {
          font-size: 13px;
          font-weight: 700;
          color: var(--muted-foreground);
          transition: color 0.2s;
        }
        .provider-card.active .provider-label-text {
          color: var(--accent);
        }
        .provider-check {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          background: var(--accent);
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          box-shadow: 0 2px 6px rgba(0, 82, 255, 0.3);
          border: 2px solid #fff;
        }
        .provider-logo-display {
          height: 32px;
          min-width: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          padding: 4px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        .provider-logo-display img {
          max-height: 24px;
          width: auto;
          object-fit: contain;
        }
        .toast-container {
          position: fixed;
          top: calc(12px + env(safe-area-inset-top));
          left: 50%;
          transform: translateX(-50%);
          width: min(92vw, 420px);
          z-index: 9999;
          pointer-events: none;
        }
        .toast {
          background: var(--foreground);
          color: #fff;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          letter-spacing: 0.01em;
          box-shadow: var(--shadow-lg);
          opacity: 0;
          transform: translateY(-8px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .toast-show .toast {
          opacity: 1;
          transform: translateY(0);
        }
        @media (min-width: 640px) {
          .toast {
            font-size: 13px;
            padding: 12px 16px;
          }
        }
      `}</style>
    </main>
  )
}

export default PaymentSettings
