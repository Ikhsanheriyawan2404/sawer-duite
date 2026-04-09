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
      QRCode.toDataURL(url, { margin: 0, width: 240 }).then(setQrDataUrl)
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
        QRCode.toDataURL(url, { margin: 0, width: 240 }).then(setQrDataUrl)
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

  function maskLink(value: string) {
    if (!value) return 'Memuat...'
    try {
      const url = new URL(value)
      return `${url.origin}/••••••`
    } catch {
      return '••••••'
    }
  }

  const overlayPath = user?.uuid ? `/overlays/qr/${user.uuid}` : ''
  const overlayUrl = overlayPath ? `${window.location.origin}${overlayPath}` : ''

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

        <article className="card card-wide">
          <div className="card-header">
            <h3>Konfigurasi Tampilan</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label>Teks Atas</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.top_text}
                      onChange={e => setFormData({ ...formData, top_text: e.target.value })}
                      className="input"
                      placeholder="Contoh: Dukung Saya"
                    />
                  ) : (
                    <p className="profile-value">{user?.qr_config?.top_text || '-'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Teks Bawah</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.bottom_text}
                      onChange={e => setFormData({ ...formData, bottom_text: e.target.value })}
                      className="input"
                      placeholder="Contoh: Scan untuk donasi"
                    />
                  ) : (
                    <p className="profile-value">{user?.qr_config?.bottom_text || '-'}</p>
                  )}
                </div>
              </div>

              {/* Preview Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label>Preview Sederhana</label>
                <div style={{ 
                  background: '#f8fafc', 
                  border: '2px solid var(--border)', 
                  borderRadius: '16px', 
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '12px'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent)', textTransform: 'uppercase' }}>
                    {formData.top_text || 'TOP TEXT'}
                  </div>
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    background: '#fff', 
                    border: '1px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#999',
                    overflow: 'hidden'
                  }}>
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      'QR CODE'
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    {formData.bottom_text || 'BOTTOM TEXT'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              {isEditing ? (
                <>
                  <button className="btn btn-secondary" onClick={handleCancel}>Batal</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </>
              ) : (
                <button className="btn btn-secondary" onClick={handleEdit}>Edit Konfigurasi</button>
              )}
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

export default OverlayQRSettings
