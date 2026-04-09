import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'
import type { NormalizedUser } from '../lib/normalizeUser'

function OverlayListSettings() {
  useDocumentTitle('List Overlay Settings')
  const [user, setUser] = useState<NormalizedUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [formData, setFormData] = useState({
    title: 'Daftar Donatur',
    starts_at: '',
    ends_at: ''
  })
  const [initialDates, setInitialDates] = useState({ starts_at: '', ends_at: '' })

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
      setFormData({
        title: parsed.list_config?.title || 'Daftar Donatur',
        starts_at: parsed.list_config?.starts_at ? parsed.list_config.starts_at.slice(0, 10) : '',
        ends_at: parsed.list_config?.ends_at ? parsed.list_config.ends_at.slice(0, 10) : ''
      })
      setInitialDates({
        starts_at: parsed.list_config?.starts_at ? parsed.list_config.starts_at.slice(0, 10) : '',
        ends_at: parsed.list_config?.ends_at ? parsed.list_config.ends_at.slice(0, 10) : ''
      })
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setUser(normalized)
        setFormData({
          title: normalized.list_config?.title || 'Daftar Donatur',
          starts_at: normalized.list_config?.starts_at ? normalized.list_config.starts_at.slice(0, 10) : '',
          ends_at: normalized.list_config?.ends_at ? normalized.list_config.ends_at.slice(0, 10) : ''
        })
        setInitialDates({
          starts_at: normalized.list_config?.starts_at ? normalized.list_config.starts_at.slice(0, 10) : '',
          ends_at: normalized.list_config?.ends_at ? normalized.list_config.ends_at.slice(0, 10) : ''
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

  function toOffsetRFC3339(dateStr: string) {
    if (!dateStr) return null
    const date = new Date(`${dateStr}T00:00:00`)
    const offsetMinutes = -date.getTimezoneOffset()
    const sign = offsetMinutes >= 0 ? '+' : '-'
    const abs = Math.abs(offsetMinutes)
    const hh = String(Math.floor(abs / 60)).padStart(2, '0')
    const mm = String(abs % 60).padStart(2, '0')
    return `${dateStr}T00:00:00${sign}${hh}:${mm}`
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      const payload: Record<string, any> = {
        title: formData.title
      }

      if (formData.starts_at) payload.starts_at = toOffsetRFC3339(formData.starts_at)
      if (formData.ends_at) payload.ends_at = toOffsetRFC3339(formData.ends_at)

      if (!formData.starts_at && initialDates.starts_at) payload.clear_starts_at = true
      if (!formData.ends_at && initialDates.ends_at) payload.clear_ends_at = true

      const res = await fetchWithAuth('/me/list-config', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Gagal menyimpan')
        return
      }

      const updated = normalizeMeUser(await res.json())
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
      setInitialDates({
        starts_at: updated.list_config?.starts_at ? updated.list_config.starts_at.slice(0, 10) : '',
        ends_at: updated.list_config?.ends_at ? updated.list_config.ends_at.slice(0, 10) : ''
      })
      showToast('Pengaturan disimpan')
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const verticalPath = user?.uuid ? `/overlays/list-vertical/${user.uuid}` : ''
  const horizontalPath = user?.uuid ? `/overlays/list-horizontal/${user.uuid}` : ''
  const verticalUrl = verticalPath ? `${window.location.origin}${verticalPath}` : ''
  const horizontalUrl = horizontalPath ? `${window.location.origin}${horizontalPath}` : ''

  function maskLink(value: string) {
    if (!value) return 'Memuat...'
    try {
      const url = new URL(value)
      return `${url.origin}/••••••`
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
          <h2>List Overlay</h2>
          <p className="lead">Tampilkan daftar donatur pada overlay horizontal atau vertikal.</p>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <h3>Link Overlay</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="input" style={{ fontSize: '12px' }}>{maskLink(verticalUrl)}</div>
            <div className="form-actions">
              <button
                className="btn btn-secondary btn-sm"
                disabled={!verticalUrl}
                onClick={() => {
                  if (!verticalUrl) return
                  navigator.clipboard.writeText(verticalUrl)
                  showToast('Link vertikal disalin')
                }}
              >
                Salin (Vertical)
              </button>
              {verticalPath && (
                <a href={verticalPath} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  Buka
                </a>
              )}
            </div>

            <div className="input" style={{ fontSize: '12px' }}>{maskLink(horizontalUrl)}</div>
            <div className="form-actions">
              <button
                className="btn btn-secondary btn-sm"
                disabled={!horizontalUrl}
                onClick={() => {
                  if (!horizontalUrl) return
                  navigator.clipboard.writeText(horizontalUrl)
                  showToast('Link horizontal disalin')
                }}
              >
                Salin (Horizontal)
              </button>
              {horizontalPath && (
                <a href={horizontalPath} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  Buka
                </a>
              )}
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Pengaturan List</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Judul List</label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Daftar Donatur"
                />
              </div>
              <div className="form-group">
                <label>Rentang Tanggal (Opsional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input
                    type="date"
                    className="input"
                    value={formData.starts_at}
                    onChange={e => setFormData({ ...formData, starts_at: e.target.value })}
                  />
                  <input
                    type="date"
                    className="input"
                    value={formData.ends_at}
                    onChange={e => setFormData({ ...formData, ends_at: e.target.value })}
                  />
                </div>
                <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>
                  Jika kosong, akan menampilkan semua transaksi paid.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
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

export default OverlayListSettings
