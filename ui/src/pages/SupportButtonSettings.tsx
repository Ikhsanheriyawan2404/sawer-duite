import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'

interface DonationPackage {
  label: string
  amount: number
  color?: string | null
  category?: string
}

interface NewDonationPackage {
  label: string
  amount: string
  color: string | null
}

const DEFAULT_COLOR = null
const FALLBACK_PICKER_COLOR = '#0052ff'
const COLOR_OPTIONS: Array<string | null> = [DEFAULT_COLOR, '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0f172a']

function SupportButtonSettings() {
  useDocumentTitle('Tombol Dukungan')
  const [packages, setPackages] = useState<DonationPackage[]>([])
  const [newPackage, setNewPackage] = useState<NewDonationPackage>({ label: '', amount: '', color: DEFAULT_COLOR })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const CATEGORY = 'button'
  const filterButtonPackages = (items: DonationPackage[]) => items.filter(p => p.category === CATEGORY)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setPackages(filterButtonPackages(parsed.donation_packages || []))
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setPackages(filterButtonPackages(normalized.donation_packages || []))
        localStorage.setItem('user', JSON.stringify(normalized))
      })
      .catch(() => {})
  }, [])

  function showToast(message: string) {
    setToastMessage(message)
    setToastVisible(true)
    window.setTimeout(() => setToastVisible(false), 2200)
  }

  async function savePackages(nextPackages: DonationPackage[]) {
    setSaving(true)
    setError('')
    try {
      const res = await fetchWithAuth(`/me/donation-packages?category=${CATEGORY}`, {
        method: 'POST',
        body: JSON.stringify(nextPackages)
      })

      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Gagal menyimpan')
        return
      }

      const updated = normalizeMeUser(await res.json())
      setPackages(filterButtonPackages(updated.donation_packages || []))
      localStorage.setItem('user', JSON.stringify(updated))
      showToast('Tombol dukungan diperbarui')
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  function addPackage() {
    const amt = parseInt(newPackage.amount)
    if (!newPackage.label || !amt || amt <= 0) {
      setError('Label dan nominal wajib diisi')
      return
    }
    setError('')
    const nextPackages = [...packages, { label: newPackage.label, amount: amt, color: newPackage.color, category: CATEGORY }]
    setPackages(nextPackages)
    savePackages(nextPackages)
    setNewPackage({ label: '', amount: '', color: DEFAULT_COLOR })
  }

  function removePackage(index: number) {
    const nextPackages = packages.filter((_, i) => i !== index)
    setPackages(nextPackages)
    savePackages(nextPackages)
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  return (
    <main className="page">
      <div className={`toast-container ${toastVisible ? 'toast-show' : ''}`} role="status" aria-live="polite">
        <div className="toast">{toastMessage}</div>
      </div>

      <section className="dashboard-header">
        <div>
          <h2>Tombol Dukungan</h2>
          <p className="lead">Tambahkan tombol donasi cepat yang akan tampil di bawah foto profil kamu.</p>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <h3>Tambah Tombol</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Teks Tombol</label>
              <input
                type="text"
                value={newPackage.label}
                onChange={e => setNewPackage({ ...newPackage, label: e.target.value })}
                className="input"
                placeholder="Contoh: Beli Kopi"
              />
            </div>
            <div className="form-group">
              <label>Nominal (IDR)</label>
              <input
                type="number"
                value={newPackage.amount}
                onChange={e => setNewPackage({ ...newPackage, amount: e.target.value })}
                className="input"
                placeholder="5000"
              />
            </div>
            <div className="form-group">
              <label>Warna Tombol</label>
              <div className="color-picker-row">
                <label className="color-input-wrap" title="Pilih warna custom">
                  <input
                    type="color"
                    value={newPackage.color || FALLBACK_PICKER_COLOR}
                    onChange={e => setNewPackage({ ...newPackage, color: e.target.value })}
                    aria-label="Pilih warna tombol"
                  />
                </label>
                <div className="color-swatches" aria-label="Pilihan warna cepat">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color || 'default'}
                      type="button"
                      className={`color-swatch ${color === null ? 'color-swatch-default' : ''} ${newPackage.color === color ? 'color-swatch-active' : ''}`}
                      style={color ? { backgroundColor: color } : undefined}
                      onClick={() => setNewPackage({ ...newPackage, color })}
                      aria-label={color ? `Pilih warna ${color}` : 'Pakai warna default'}
                      title={color ? color : 'Default'}
                    />
                  ))}
                </div>
              </div>
              <div
                className={`button-preview ${newPackage.color ? '' : 'button-preview-default'}`}
                style={newPackage.color ? { background: newPackage.color } : undefined}
              >
                {newPackage.label || 'Preview Tombol'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={addPackage}>Tambah</button>
            </div>
          </div>
        </article>

        <article className="card card-wide">
          <div className="card-header">
            <div>
              <h3>Daftar Tombol</h3>
              <p className="muted" style={{ fontSize: '13px' }}>Klik tombol hapus untuk mengeluarkan tombol dari daftar.</p>
            </div>
            {saving && <span className="chip chip-soft" style={{ fontSize: '11px' }}>Menyimpan...</span>}
          </div>

          {packages.length === 0 ? (
            <div className="empty-state">
              <p className="muted">Belum ada tombol dukungan yang dibuat.</p>
            </div>
          ) : (
            <div className="package-grid">
              {packages.map((p, i) => (
                <div key={`${p.label}-${i}`} className="package-item" style={{ borderColor: p.color || undefined }}>
                  <div className="package-content">
                    <div className="package-icon" style={p.color ? { backgroundColor: p.color, color: '#fff' } : undefined}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v8M8 12h8"/>
                      </svg>
                    </div>
                    <div className="package-info">
                      <span className="package-label">{p.label}</span>
                      <span className="package-amount">{formatCurrency(p.amount)}</span>
                      <span className="package-color">{p.color || 'Warna default'}</span>
                    </div>
                  </div>
                  <button
                    className="package-delete"
                    onClick={() => removePackage(i)}
                    title="Hapus tombol"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
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
        .chip {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          background: #f1f5f9;
        }
        .chip-soft {
          background: #e2e8f0;
          color: #475569;
        }
        .empty-state {
          padding: 40px 20px;
          text-align: center;
          background: #f8fafc;
          border-radius: 16px;
          border: 2px dashed #e2e8f0;
        }
        .color-picker-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .color-input-wrap {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 44px;
          padding: 6px 10px;
          border: 1px solid #dbe3ef;
          border-radius: 12px;
          background: #fff;
          cursor: pointer;
        }
        .color-input-wrap input {
          width: 32px;
          height: 32px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
        }
        .color-preview {
          width: 22px;
          height: 22px;
          border-radius: 8px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.45), 0 0 0 1px rgba(15,23,42,0.1);
        }
        .color-swatches {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .color-swatch {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 2px solid #fff;
          box-shadow: 0 0 0 1px rgba(15,23,42,0.16);
          cursor: pointer;
        }
        .color-swatch-default {
          background: var(--gradient);
        }
        .color-swatch-active {
          box-shadow: 0 0 0 3px rgba(0,82,255,0.22), 0 0 0 1px rgba(15,23,42,0.16);
        }
        .button-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          margin-top: 10px;
          padding: 10px 14px;
          border-radius: 14px;
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
        }
        .button-preview-default {
          background: var(--gradient);
        }
        .package-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        @media (min-width: 640px) {
          .package-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }
        }
        .package-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          transition: all 0.2s ease;
        }
        .package-item:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
          transform: translateY(-1px);
        }
        .package-content {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .package-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: #f1f5f9;
          color: #64748b;
          border-radius: 12px;
        }
        .package-item:hover .package-icon {
          background: rgba(79, 70, 229, 0.1);
          color: var(--accent);
        }
        .package-info {
          display: flex;
          flex-direction: column;
        }
        .package-label {
          font-weight: 700;
          font-size: 14px;
          color: #0f172a;
        }
        .package-amount {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
        }
        .package-color {
          margin-top: 2px;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }
        .package-delete {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .package-delete:hover {
          background: #fee2e2;
          color: #ef4444;
        }
      `}</style>
    </main>
  )
}

export default SupportButtonSettings
