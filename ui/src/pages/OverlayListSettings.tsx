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

  // State for custom dropdowns
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: 'Daftar Donatur',
    sort_by: 'created_at_desc',
    limit: 10,
    aggregation_type: 'transaction',
    starts_at: '',
    ends_at: ''
  })
  const [initialDates, setInitialDates] = useState({ starts_at: '', ends_at: '' })

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
      setFormData({
        title: parsed.list_config?.title || 'Daftar Donatur',
        sort_by: parsed.list_config?.sort_by || 'created_at_desc',
        limit: parsed.list_config?.limit || 10,
        aggregation_type: parsed.list_config?.aggregation_type || 'transaction',
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
          sort_by: normalized.list_config?.sort_by || 'created_at_desc',
          limit: normalized.list_config?.limit || 10,
          aggregation_type: normalized.list_config?.aggregation_type || 'transaction',
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
        title: formData.title,
        sort_by: formData.sort_by,
        limit: formData.limit,
        aggregation_type: formData.aggregation_type
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

          <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', margin: '0 0 4px 0' }}>
            Gunakan link ini pada OBS Browser Source Anda.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, margin: 0 }}>VERTICAL LIST</p>
              <div className="password-wrapper">
                <input
                  readOnly
                  value={maskLink(verticalUrl)}
                  className="input"
                  style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', paddingRight: '100px' }}
                />
                <button
                  className="password-toggle"
                  style={{ color: 'var(--accent)', right: '16px' }}
                  onClick={() => {
                    if (!verticalUrl) return
                    navigator.clipboard.writeText(verticalUrl)
                    showToast('Link vertikal disalin')
                  }}
                >
                  SALIN
                </button>
              </div>
              <div className="form-actions">
                {verticalPath && (
                  <a
                    href={verticalPath}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: 'none', flex: 1 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    Preview Vertical
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, margin: 0 }}>HORIZONTAL LIST</p>
              <div className="password-wrapper">
                <input
                  readOnly
                  value={maskLink(horizontalUrl)}
                  className="input"
                  style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', paddingRight: '100px' }}
                />
                <button
                  className="password-toggle"
                  style={{ color: 'var(--accent)', right: '16px' }}
                  onClick={() => {
                    if (!horizontalUrl) return
                    navigator.clipboard.writeText(horizontalUrl)
                    showToast('Link horizontal disalin')
                  }}
                >
                  SALIN
                </button>
              </div>
              <div className="form-actions">
                {horizontalPath && (
                  <a
                    href={horizontalPath}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: 'none', flex: 1 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    Preview Horizontal
                  </a>
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Pengaturan List</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Judul List */}
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

              {/* 2. Urutan Data (Custom Select) */}
              <div className="form-group">
                <label>Urutan Data</label>
                <div className="custom-select-container" onClick={e => e.stopPropagation()}>
                  <div
                    className={`custom-select-trigger ${openDropdown === 'sort' ? 'active' : ''}`}
                    onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                  >
                    <span>{formData.sort_by === 'created_at_desc' ? 'Terbaru (Recent)' : 'Terbesar (Top Amount)'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                  {openDropdown === 'sort' && (
                    <div className="custom-options">
                      <div
                        className={`custom-option ${formData.sort_by === 'created_at_desc' ? 'selected' : ''}`}
                        onClick={() => { setFormData({...formData, sort_by: 'created_at_desc'}); setOpenDropdown(null); }}
                      >
                        Terbaru (Recent)
                      </div>
                      <div
                        className={`custom-option ${formData.sort_by === 'amount_desc' ? 'selected' : ''}`}
                        onClick={() => { setFormData({...formData, sort_by: 'amount_desc'}); setOpenDropdown(null); }}
                      >
                        Terbesar (Top Amount)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Tipe Agregasi (Custom Select) */}
              <div className="form-group">
                <label>Tipe Agregasi</label>
                <div className="custom-select-container" onClick={e => e.stopPropagation()}>
                  <div
                    className={`custom-select-trigger ${openDropdown === 'aggr' ? 'active' : ''}`}
                    onClick={() => setOpenDropdown(openDropdown === 'aggr' ? null : 'aggr')}
                  >
                    <span>{formData.aggregation_type === 'transaction' ? 'Per Transaksi' : 'Akumulasi per User'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                  {openDropdown === 'aggr' && (
                    <div className="custom-options">
                      <div
                        className={`custom-option ${formData.aggregation_type === 'transaction' ? 'selected' : ''}`}
                        onClick={() => { setFormData({...formData, aggregation_type: 'transaction'}); setOpenDropdown(null); }}
                      >
                        Per Transaksi
                      </div>
                      <div
                        className={`custom-option ${formData.aggregation_type === 'supporter' ? 'selected' : ''}`}
                        onClick={() => { setFormData({...formData, aggregation_type: 'supporter'}); setOpenDropdown(null); }}
                      >
                        Akumulasi per User
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Limit */}
              <div className="form-group">
                <label>Limit Tampilan</label>
                <input
                  type="number"
                  className="input"
                  value={formData.limit}
                  onChange={e => setFormData({ ...formData, limit: parseInt(e.target.value) || 10 })}
                  min="1"
                  max="100"
                />
              </div>

              {/* 5. Rentang Tanggal */}
              <div className="form-group">
                <label>Rentang Tanggal (Opsional)</label>
                <div className="date-grid">
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
              </div>

              <p className="muted" style={{ fontSize: '12px' }}>
                Tips: Pilih <b>Akumulasi per User</b> dan <b>Terbesar</b> untuk membuat list "Top Donatur".
              </p>

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
        .custom-select-container {
          position: relative;
          width: 100%;
        }

        .custom-select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          transition: all 0.2s ease;
          min-height: 48px;
        }

        @media (max-width: 640px) {
          .custom-select-trigger {
            padding: 10px 14px;
            font-size: 13px;
          }
          .password-toggle {
            font-size: 11px !important;
            right: 12px !important;
          }
          .password-wrapper input {
            padding-right: 80px !important;
            font-size: 12px !important;
          }
          .form-actions {
            flex-direction: column;
            gap: 8px;
          }
          .form-actions a, .form-actions button {
            width: 100%;
            margin: 0 !important;
          }
        }

        .custom-select-trigger:hover {
          border-color: var(--accent);
        }

        .date-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 500px) {
          .date-grid {
            grid-template-columns: 1fr;
          }
        }

        .custom-select-trigger.active {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(0, 82, 255, 0.1);
        }

        .custom-select-trigger svg {
          color: #64748b;
          transition: transform 0.2s ease;
        }

        .custom-select-trigger.active svg {
          transform: rotate(180deg);
          color: var(--accent);
        }

        .custom-options {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
          z-index: 100;
          overflow: hidden;
          animation: dropdownFade 0.2s ease-out;
        }

        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .custom-option {
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .custom-option:hover {
          background: #f1f5f9;
          color: var(--accent);
        }

        .custom-option.selected {
          background: rgba(0, 82, 255, 0.06);
          color: var(--accent);
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
      `}</style>
    </main>
  )
}

export default OverlayListSettings
