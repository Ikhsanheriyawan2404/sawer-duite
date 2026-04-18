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

const DEFAULT_RELEASE_PAGE = 'https://github.com/Ikhsanheriyawan2404/sawer-duite/releases/'

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
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [onboardingSaving, setOnboardingSaving] = useState(false)
  const [onboardingError, setOnboardingError] = useState('')
  const [releaseInfo, setReleaseInfo] = useState({
    tag: '',
    name: '',
    downloadUrl: '',
    pageUrl: DEFAULT_RELEASE_PAGE
  })
  const [releaseLoading, setReleaseLoading] = useState(true)
  const [releaseError, setReleaseError] = useState('')

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

  useEffect(() => {
    if (!user) return
    const dismissed = sessionStorage.getItem('onboarding_qris_dismissed')
    if (!user.static_qris && !dismissed) {
      setOnboardingOpen(true)
      setOnboardingStep(0)
    }
  }, [user])

  useEffect(() => {
    if (!onboardingOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [onboardingOpen])

  useEffect(() => {
    const controller = new AbortController()

    async function loadLatestRelease() {
      try {
        setReleaseLoading(true)
        setReleaseError('')
        const res = await fetch('https://api.github.com/repos/Ikhsanheriyawan2404/sawer-duite/releases/latest', {
          signal: controller.signal,
          headers: { 'Accept': 'application/vnd.github+json' }
        })
        if (!res.ok) throw new Error('Failed to fetch release')
        const data = await res.json()
        const apkAsset = Array.isArray(data.assets)
          ? data.assets.find((asset: any) => typeof asset?.name === 'string' && asset.name.toLowerCase().endsWith('.apk'))
          : null

        setReleaseInfo({
          tag: data.tag_name || '',
          name: data.name || '',
          downloadUrl: apkAsset?.browser_download_url || '',
          pageUrl: data.html_url || DEFAULT_RELEASE_PAGE
        })
      } catch {
        setReleaseError('Gagal memuat versi terbaru')
      } finally {
        setReleaseLoading(false)
      }
    }

    loadLatestRelease()
    return () => controller.abort()
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

  async function handleOnboardingSave() {
    setOnboardingSaving(true)
    setOnboardingError('')

    if (!formData.static_qris.trim()) {
      setOnboardingError('Kode QRIS wajib diisi')
      setOnboardingSaving(false)
      return
    }

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
        setOnboardingError(text || 'Gagal menyimpan QRIS')
        return
      }

      const updatedUser = normalizeMeUser(await res.json())
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setOnboardingStep(prev => Math.min(prev + 1, 4))
    } catch {
      setOnboardingError('Terjadi kesalahan saat menyimpan')
    } finally {
      setOnboardingSaving(false)
    }
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

  function closeOnboarding() {
    setOnboardingOpen(false)
    sessionStorage.setItem('onboarding_qris_dismissed', '1')
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

      {onboardingOpen && (
        <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <div className="onboarding-scrim" onClick={closeOnboarding} />
          <div className="onboarding-modal">
            <header className="onboarding-header">
              <div>
                <h3 id="onboarding-title">Biar Akunmu Siap Terima Donasi dalam 5 Menit</h3>
                <p className="onboarding-subtitle">
                  Ikuti langkah cepat ini sekali saja. Setelah selesai, akunmu langsung siap dipakai.
                </p>
              </div>
              <button className="onboarding-close" onClick={closeOnboarding} aria-label="Tutup">
                ✕
              </button>
            </header>

            <div className="onboarding-steps">
              {[0, 1, 2, 3, 4].map(step => (
                <span key={step} className={`onboarding-step-dot ${onboardingStep === step ? 'active' : onboardingStep > step ? 'done' : ''}`} />
              ))}
            </div>

            <div className="onboarding-body">
              {onboardingStep === 0 && (
                <div className="onboarding-panel">
                  <div className="onboarding-video">
                    <a
                      href="https://youtube.com/shorts/TZ-ab4GCblE"
                      target="_blank"
                      rel="noreferrer"
                      className="video-card"
                    >
                      <img
                        src="https://i.ytimg.com/vi/TZ-ab4GCblE/oardefault.jpg"
                        alt="Tutorial QRIS"
                      />
                      <div className="video-overlay">
                        <span>Putar Video 3 Menit</span>
                      </div>
                    </a>
                    <div className="video-caption">
                      <h4>Lihat dulu demo singkatnya</h4>
                      <p>Video ini menunjukkan alur aktivasi QRIS statis dari awal sampai siap digunakan.</p>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 1 && (
                <div className="onboarding-panel">
                  <div>
                    <h4>Masukkan QRIS Statis</h4>
                    <p className="muted">
                      Salin kode QRIS statis dari aplikasi merchant (string panjang, bukan gambar).
                    </p>
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>Pilih Provider Merchant</label>
                    <div className="provider-selector onboarding-provider">
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
                      placeholder="Paste kode QRIS di sini (contoh: 000201010211...)"
                      style={{ minHeight: '120px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    {onboardingError && <p className="error-text" style={{ marginTop: '8px' }}>{onboardingError}</p>}
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="onboarding-panel">
                  <div>
                    <h4>Salin App Token</h4>
                    <p className="muted">Token ini dipakai di aplikasi Android listener. Simpan di tempat aman.</p>
                  </div>
                  <div className="token-row">
                    <input
                      type="text"
                      readOnly
                      value={maskToken(user?.app_token || '')}
                      className="input"
                      style={{ fontFamily: 'monospace', fontSize: '12px', background: 'var(--muted)' }}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        if (user?.app_token) {
                          navigator.clipboard.writeText(user.app_token)
                          showToast('Token disalin')
                        }
                      }}
                    >
                      Salin Token
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="onboarding-panel">
                  <div>
                    <h4>Download Aplikasi Android</h4>
                    <p className="muted">
                      Gunakan aplikasi listener untuk menangkap notifikasi pembayaran secara real-time.
                    </p>
                  </div>
                  <div className="download-card">
                    <div>
                      <p className="download-title">Versi Terbaru</p>
                      <p className="download-meta">
                        {releaseLoading ? 'Memuat data rilis...' : releaseError ? releaseError : (releaseInfo.name || releaseInfo.tag || 'Release terbaru siap diunduh')}
                      </p>
                    </div>
                    <div className="download-actions">
                      <a
                        className={`btn btn-primary ${releaseLoading || !releaseInfo.downloadUrl ? 'btn-disabled' : ''}`}
                        href={releaseInfo.downloadUrl || releaseInfo.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {releaseInfo.downloadUrl ? `Download APK ${releaseInfo.tag ? `(${releaseInfo.tag})` : ''}` : 'Lihat Halaman Rilis'}
                      </a>
                      <a
                        href={releaseInfo.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                      >
                        Semua Versi
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 4 && (
                <div className="onboarding-panel">
                  <div>
                    <h4>Setup di Android & Selesai</h4>
                    <p className="muted">
                      Buka aplikasi Android, login dengan <code>app_token</code>, dan aktifkan listener. Taraaa—akun siap digunakan.
                    </p>
                  </div>
                  <div className="success-strip">
                    <span>✅ QRIS aktif</span>
                    <span>✅ Token tersalin</span>
                    <span>✅ APK siap dipakai</span>
                  </div>
                </div>
              )}
            </div>

            <footer className="onboarding-footer">
              <div className="onboarding-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setOnboardingStep(prev => Math.max(prev - 1, 0))}
                  disabled={onboardingStep === 0}
                >
                  Kembali
                </button>

                {onboardingStep === 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleOnboardingSave}
                    disabled={onboardingSaving}
                  >
                    {onboardingSaving ? 'Menyimpan...' : 'Simpan & Lanjut'}
                  </button>
                ) : onboardingStep === 4 ? (
                  <button className="btn btn-primary" onClick={() => setOnboardingOpen(false)}>
                    Selesai
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => setOnboardingStep(prev => Math.min(prev + 1, 4))}
                  >
                    Lanjut
                  </button>
                )}
              </div>
              <button className="link-button" onClick={closeOnboarding}>
                Nanti dulu
              </button>
            </footer>
          </div>
        </div>
      )}

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
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          z-index: 1200;
          padding: 16px;
        }
        .onboarding-scrim {
          position: absolute;
          inset: 0;
          background: rgba(8, 15, 30, 0.55);
          backdrop-filter: blur(6px);
        }
        .onboarding-modal {
          position: relative;
          width: min(94vw, 720px);
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 40px 80px rgba(15, 23, 42, 0.3);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 1;
          max-height: min(92vh, 780px);
          overflow: hidden;
        }
        .onboarding-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .onboarding-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
          margin: 0 0 6px 0;
        }
        .onboarding-subtitle {
          margin: 6px 0 0 0;
          color: var(--muted-foreground);
          font-size: 14px;
        }
        .onboarding-close {
          border: none;
          background: rgba(15, 23, 42, 0.08);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
        }
        .onboarding-steps {
          display: flex;
          gap: 8px;
        }
        .onboarding-step-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.5);
        }
        .onboarding-step-dot.active {
          width: 24px;
          background: var(--accent);
        }
        .onboarding-step-dot.done {
          background: rgba(34, 197, 94, 0.6);
        }
        .onboarding-body {
          background: #fff;
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          padding: 18px;
          overflow: auto;
          min-height: 280px;
        }
        .onboarding-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .onboarding-video {
          display: grid;
          gap: 16px;
        }
        .video-card {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.3);
          display: block;
        }
        .video-card img {
          width: 100%;
          height: auto;
          display: block;
        }
        .video-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.3);
          color: #fff;
          font-weight: 700;
          letter-spacing: 0.02em;
          transition: background 0.2s ease;
        }
        .video-card:hover .video-overlay { background: rgba(15, 23, 42, 0.15); }
        .video-caption h4 { margin: 0 0 6px 0; }
        .video-caption p { margin: 0; color: var(--muted-foreground); }
        .onboarding-provider {
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        }
        .token-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .token-row .input { flex: 1 1 240px; }
        .download-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(0, 82, 255, 0.06);
          border: 1px solid rgba(0, 82, 255, 0.12);
          flex-wrap: wrap;
        }
        .download-title { margin: 0; font-weight: 700; }
        .download-meta { margin: 4px 0 0 0; font-size: 12px; color: var(--muted-foreground); }
        .download-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-disabled {
          pointer-events: none;
          opacity: 0.7;
        }
        .success-strip {
          display: grid;
          gap: 8px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          padding: 12px 14px;
          border-radius: 12px;
          font-weight: 600;
          color: #15803d;
        }
        .onboarding-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .onboarding-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .link-button {
          background: none;
          border: none;
          color: var(--muted-foreground);
          cursor: pointer;
          text-decoration: underline;
          font-size: 12px;
        }
        @media (min-width: 640px) {
          .toast {
            font-size: 13px;
            padding: 12px 16px;
          }
        }
        @media (max-width: 520px) {
          .onboarding-modal { padding: 18px; }
          .onboarding-body { min-height: 240px; }
        }
      `}</style>
    </main>
  )
}

export default PaymentSettings
