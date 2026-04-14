import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'
import type { NormalizedUser } from '../lib/normalizeUser'

function OverlayQRSettings() {
  useDocumentTitle('QR Overlay Settings')
  const [user, setUser] = useState<NormalizedUser | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const [formData, setFormData] = useState({
    top_text: 'Dukung Saya',
    bottom_text: 'Scan QR untuk donasi'
  })

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
      setFormData({
        top_text: parsed.qr_config?.top_text || 'Dukung Saya',
        bottom_text: parsed.qr_config?.bottom_text || 'Scan QR untuk donasi'
      })

      const url = `${window.location.origin}/${parsed.username}`
      QRCode.toDataURL(url, { margin: 0, width: 240, errorCorrectionLevel: 'H' }).then(setQrDataUrl)
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setUser(normalized)
        setFormData({
          top_text: normalized.qr_config?.top_text || 'Dukung Saya',
          bottom_text: normalized.qr_config?.bottom_text || 'Scan QR untuk donasi'
        })
        localStorage.setItem('user', JSON.stringify(normalized))

        // Generate QR for preview
        const url = `${window.location.origin}/${normalized.username}`
        QRCode.toDataURL(url, { margin: 0, width: 240, errorCorrectionLevel: 'H' }).then(setQrDataUrl)
      })
      .catch(() => {})
  }, [])

  function showToast(message: string) {
    setToastMessage(message)
    setToastVisible(true)
    window.setTimeout(() => setToastVisible(false), 2200)
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
        top_text: user.qr_config?.top_text || 'Dukung Saya',
        bottom_text: user.qr_config?.bottom_text || 'Scan QR untuk donasi'
      })
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      const res = await fetchWithAuth('/me/qr-config', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Gagal menyimpan')
        return
      }

      const updated = normalizeMeUser(await res.json())
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
      setIsEditing(false)
      showToast('Pengaturan disimpan')
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const overlayPath = user?.uuid ? `/overlays/qr/${user.uuid}` : ''
  const overlayUrl = overlayPath ? `${window.location.origin}${overlayPath}` : ''

  function maskLink(value: string) {
    if (!value) return 'Memuat...'
    try {
      const url = new URL(value)
      return `${url.origin}/••••••••••••••••••••`
    } catch {
      return '••••••'
    }
  }

  return (
    <main className="page">
      <div className={`toast-container ${toastVisible ? 'toast-show' : ''}`} role="status" aria-live="polite">
        <div className="toast">{toastMessage}</div>
      </div>

      <section className="dashboard-header">
        <div>
          <h2>QR Overlay Settings</h2>
          <p className="lead">Atur tampilan teks pada overlay QR donasi Anda.</p>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <article className="card">
            <div className="card-header">
              <h3>Link Overlay</h3>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>
              Gunakan link ini pada OBS Browser Source Anda.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="password-wrapper">
                <input
                  readOnly
                  value={maskLink(overlayUrl)}
                  type="text"
                  className="input"
                  style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', paddingRight: '100px' }}
                />
                <button
                  className="password-toggle"
                  style={{ color: 'var(--accent)', right: '16px' }}
                  onClick={() => {
                    if (!overlayUrl) return
                    navigator.clipboard.writeText(overlayUrl)
                    showToast('Link disalin')
                  }}
                >
                  SALIN
                </button>
              </div>

              <div className="form-actions">
                <a
                  href={overlayPath}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none', flex: 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  Preview Window
                </a>
              </div>
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <h3>Konfigurasi Teks</h3>
              <button
                className={`btn btn-sm ${isEditing ? 'btn-ghost' : 'btn-secondary'}`}
                onClick={isEditing ? handleCancel : handleEdit}
              >
                {isEditing ? 'Batal' : 'Edit Teks'}
              </button>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="profile-form">
              <div className="form-group">
                <label>Teks Atas (Headline)</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.top_text}
                    onChange={e => setFormData({ ...formData, top_text: e.target.value })}
                    className="input"
                    placeholder="Contoh: Dukung Saya"
                  />
                ) : (
                  <div className="profile-field" style={{ padding: '12px 16px' }}>
                    <p className="profile-value" style={{ fontSize: '15px' }}>{user?.qr_config?.top_text || 'Dukung Saya'}</p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Teks Bawah (Sub-headline)</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.bottom_text}
                    onChange={e => setFormData({ ...formData, bottom_text: e.target.value })}
                    className="input"
                    placeholder="Contoh: Scan untuk donasi"
                  />
                ) : (
                  <div className="profile-field" style={{ padding: '12px 16px' }}>
                    <p className="profile-value" style={{ fontSize: '15px' }}>{user?.qr_config?.bottom_text || 'Scan untuk donasi'}</p>
                  </div>
                )}
              </div>

              {isEditing && (
                <button
                  className="btn btn-primary w-full"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ marginTop: '8px' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              )}
            </div>
          </article>
        </div>

        <article className="card" style={{ background: 'var(--muted)', border: '1px dashed var(--border)' }}>
          <div className="card-header">
            <h3>Live Preview</h3>
          </div>

          <div className="preview-container">
            <div className="qr-preview-card">
              <p className="qr-preview-label">{formData.top_text || 'TOP TEXT'}</p>
              <div className="qr-preview-box">
                {qrDataUrl ? (
                  <>
                    <img src={qrDataUrl} alt="QR Preview" className="qr-code-img" />
                    <img src="/logo.svg" alt="Logo" className="qr-logo" />
                  </>
                ) : (
                  <div className="qr-preview-placeholder" />
                )}
              </div>
              <p className="qr-preview-link">{formData.bottom_text || 'BOTTOM TEXT'}</p>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '12px' }}>
            Pratinjau ini menunjukkan bagaimana overlay akan muncul di streaming Anda.
          </p>
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

        .preview-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uInGs0Ak8PhneGfJlE0M6mRD8n797MIsInSgl6eGFTY6K7kSgMAfSstSAn76IkAAAAASUVORK5CYII=');
          border-radius: 16px;
          min-height: 400px;
        }

        .qr-preview-card {
          width: fit-content;
          max-width: 280px;
          background: #ffffff;
          border-radius: 24px;
          padding: 16px 20px;
          border: 6px solid #0052ff;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .qr-preview-label {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.02em;
          color: #0052ff;
          text-transform: uppercase;
          margin: 0 0 10px 0;
          line-height: 1.1;
        }

        .qr-preview-box {
          position: relative;
          width: 180px;
          height: 180px;
          margin: 0 auto 10px;
          background: #ffffff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .qr-preview-box .qr-code-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .qr-logo {
          position: absolute;
          width: 44px;
          height: 44px;
          background: #fff;
          padding: 4px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 2;
        }

        .qr-preview-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          background: #f1f5f9;
        }

        .qr-preview-link {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          word-break: break-all;
          margin: 0;
          line-height: 1.2;
          background: #f1f5f9;
          padding: 6px 12px;
          border-radius: 10px;
          width: 100%;
        }
      `}</style>
    </main>
  )
}

export default OverlayQRSettings
