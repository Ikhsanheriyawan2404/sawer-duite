import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'
import type { NormalizedUser } from '../lib/normalizeUser'

function OverlayMediaSettings() {
  useDocumentTitle('Media Overlay Settings')
  const [user, setUser] = useState<NormalizedUser | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savingLinks, setSavingLinks] = useState(false)
  const [error, setError] = useState('')
  const [configEnabled, setConfigEnabled] = useState(true)
  const [links, setLinks] = useState({
    tiktok: '',
    instagram: '',
    youtube: ''
  })

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
      setConfigEnabled(parsed.media_config?.enabled ?? true)
      setLinks({
        tiktok: parsed.tiktok || '',
        instagram: parsed.instagram || '',
        youtube: parsed.youtube || ''
      })
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setUser(normalized)
        setConfigEnabled(normalized.media_config?.enabled ?? true)
        setLinks({
          tiktok: normalized.tiktok || '',
          instagram: normalized.instagram || '',
          youtube: normalized.youtube || ''
        })
        localStorage.setItem('user', JSON.stringify(normalized))
      })
      .catch(() => {})
  }, [])

  function showToast(message: string) {
    setToastMessage(message)
    setToastVisible(true)
    window.setTimeout(() => setToastVisible(false), 2200)
  }

  function maskLink(value: string) {
    if (!value) return 'Memuat...'
    try {
      const url = new URL(value)
      return `${url.origin}/••••••`
    } catch {
      return '••••••'
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true)
    setError('')
    try {
      const res = await fetchWithAuth('/me/media-config', {
        method: 'POST',
        body: JSON.stringify({ enabled: configEnabled })
      })
      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Gagal menyimpan')
        return
      }
      const updated = normalizeMeUser(await res.json())
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
      showToast('Pengaturan media disimpan')
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSavingConfig(false)
    }
  }

  async function handleSaveLinks() {
    if (!user) return
    setSavingLinks(true)
    setError('')
    try {
      const res = await fetchWithAuth('/me/profile', {
        method: 'POST',
        body: JSON.stringify({
          name: user.name,
          username: user.username,
          bio: user.bio,
          social_links: {
            tiktok: links.tiktok,
            instagram: links.instagram,
            youtube: links.youtube
          }
        })
      })

      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Gagal menyimpan')
        return
      }

      const updated = normalizeMeUser(await res.json())
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
      showToast('Link media tersimpan')
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSavingLinks(false)
    }
  }

  const overlayPath = user?.uuid ? `/overlays/media/${user.uuid}` : ''
  const overlayUrl = overlayPath ? `${window.location.origin}${overlayPath}` : ''

  return (
    <main className="page">
      <div className={`toast-container ${toastVisible ? 'toast-show' : ''}`} role="status" aria-live="polite">
        <div className="toast">{toastMessage}</div>
      </div>

      <section className="dashboard-header">
        <div>
          <h2>Media Overlay</h2>
          <p className="lead">Tampilkan video dari link sosial kamu di overlay.</p>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <h3>Link Overlay</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              readOnly
              value={maskLink(overlayUrl)}
              className="input"
              style={{ fontSize: '12px' }}
            />
            <div className="form-actions">
              <button
                className="btn btn-secondary btn-sm"
                disabled={!overlayUrl}
                onClick={() => {
                  if (!overlayUrl) return
                  navigator.clipboard.writeText(overlayUrl)
                  showToast('Link disalin')
                }}
              >
                Salin
              </button>
              {overlayPath && (
                <a href={overlayPath} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  Buka
                </a>
              )}
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Pengaturan Overlay</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={configEnabled}
                  onChange={e => setConfigEnabled(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Aktifkan Media Overlay
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSaveConfig} disabled={savingConfig}>
                  {savingConfig ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Link Media</h3>
          </div>

          <div className="profile-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>YouTube</label>
                <input
                  type="url"
                  className="input"
                  value={links.youtube}
                  onChange={e => setLinks({ ...links, youtube: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="form-group">
                <label>TikTok</label>
                <input
                  type="url"
                  className="input"
                  value={links.tiktok}
                  onChange={e => setLinks({ ...links, tiktok: e.target.value })}
                  placeholder="https://tiktok.com/@username/video/..."
                />
              </div>
              <div className="form-group">
                <label>Instagram</label>
                <input
                  type="url"
                  className="input"
                  value={links.instagram}
                  onChange={e => setLinks({ ...links, instagram: e.target.value })}
                  placeholder="https://instagram.com/p/..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSaveLinks} disabled={savingLinks}>
                  {savingLinks ? 'Menyimpan...' : 'Simpan Link'}
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <style>{`
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
      `}</style>
    </main>
  )
}

export default OverlayMediaSettings
