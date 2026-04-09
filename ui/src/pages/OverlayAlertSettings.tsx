import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'
import type { NormalizedUser } from '../lib/normalizeUser'

function OverlayAlertSettings() {
  useDocumentTitle('Alert Overlay Settings')
  const [user, setUser] = useState<NormalizedUser | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [testCooldown, setTestCooldown] = useState(0)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setUser(normalized)
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

  useEffect(() => {
    if (testCooldown <= 0) return
    const timer = window.setInterval(() => {
      setTestCooldown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [testCooldown])

  const overlayPath = user?.uuid ? `/overlays/alert/${user.uuid}` : ''
  const overlayUrl = overlayPath ? `${window.location.origin}${overlayPath}` : ''

  return (
    <main className="page">
      <div className={`toast-container ${toastVisible ? 'toast-show' : ''}`} role="status" aria-live="polite">
        <div className="toast">{toastMessage}</div>
      </div>

      <section className="dashboard-header">
        <div>
          <h2>Alert Overlay</h2>
          <p className="lead">Kelola link overlay dan lakukan tes alert.</p>
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
              {user?.uuid && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={testCooldown > 0}
                  onClick={() => {
                    if (testCooldown > 0) return
                    setTestCooldown(5)
                    fetchWithAuth(`/user/${user.uuid}/test-alert`, { method: 'POST' })
                      .then(() => showToast('Test alert dikirim'))
                      .catch(() => showToast('Gagal mengirim test alert'))
                  }}
                >
                  {testCooldown > 0 ? `Tunggu ${testCooldown}s` : 'Test'}
                </button>
              )}
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Pengaturan</h3>
          </div>
          <div className="profile-form">
            <p className="muted text-center" style={{ padding: '20px' }}>
              Belum ada konfigurasi tambahan untuk alert overlay.
            </p>
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

export default OverlayAlertSettings
