import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'
import type { NormalizedUser } from '../lib/normalizeUser'

interface CustomField {
  key: string
  label: string
  required: boolean
  required_error?: string
}

function Settings() {
  useDocumentTitle('Konfigurasi Global')
  const [user, setUser] = useState<NormalizedUser | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const [formData, setFormData] = useState({
    min_donation: 0,
    quick_amounts: [] as number[],
    custom_input_schema: [] as CustomField[]
  })
  const [newQuickAmount, setNewQuickAmount] = useState('')
  const [newField, setNewField] = useState({ label: '', required: false, required_error: '' })

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
      setFormData({
        min_donation: parsed.min_donation || 0,
        quick_amounts: parsed.quick_amounts || [],
        custom_input_schema: parsed.custom_input_schema || []
      })
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setUser(normalized)
        setFormData({
          min_donation: normalized.min_donation || 0,
          quick_amounts: normalized.quick_amounts || [],
          custom_input_schema: normalized.custom_input_schema || []
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

  function handleEdit() {
    setIsEditing(true)
    setError('')
  }

  function handleCancel() {
    setIsEditing(false)
    setError('')
    if (user) {
      setFormData({
        min_donation: user.min_donation || 0,
        quick_amounts: user.quick_amounts || [],
        custom_input_schema: user.custom_input_schema || []
      })
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      const res = await fetchWithAuth('/me/config', {
        method: 'POST',
        body: JSON.stringify({
          min_donation: Number(formData.min_donation),
          quick_amounts: formData.quick_amounts,
          custom_input_schema: formData.custom_input_schema
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
      setIsEditing(false)
      showToast('Konfigurasi disimpan')
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const addQuickAmount = () => {
    const amt = parseInt(newQuickAmount)
    if (amt > 0 && !formData.quick_amounts.includes(amt)) {
      setFormData({ ...formData, quick_amounts: [...formData.quick_amounts, amt].sort((a,b) => a-b) })
      setNewQuickAmount('')
    }
  }

  const removeQuickAmount = (amt: number) => {
    setFormData({ ...formData, quick_amounts: formData.quick_amounts.filter(a => a !== amt) })
  }

  const addField = () => {
    if (!newField.label.trim()) return
    const field: CustomField = {
      key: `field_${Date.now()}`,
      label: newField.label,
      required: newField.required,
      required_error: newField.required_error
    }
    setFormData({ ...formData, custom_input_schema: [...formData.custom_input_schema, field] })
    setNewField({ label: '', required: false, required_error: '' })
  }

  const removeField = (key: string) => {
    setFormData({ ...formData, custom_input_schema: formData.custom_input_schema.filter(f => f.key !== key) })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <main className="page">
      <div className={`toast-container ${toastVisible ? 'toast-show' : ''}`} role="status" aria-live="polite">
        <div className="toast">{toastMessage}</div>
      </div>

      <section className="dashboard-header">
        <div>
          <h2>Pengaturan</h2>
          <p className="lead">Atur preferensi donasi dan formulir kustom untuk donatur.</p>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid">
        <article className="card card-wide">
          <div className="card-header">
            <h3>Preferensi Donasi</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>

              {/* Section 1: Batasan & Nominal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label>Minimal Donasi (IDR)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.min_donation}
                      onChange={e => setFormData({ ...formData, min_donation: parseInt(e.target.value) || 0 })}
                      className="input"
                    />
                  ) : (
                    <p className="profile-value">{formatCurrency(user?.min_donation || 0)}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Nominal Cepat (Quick Amounts)</label>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          placeholder="Contoh: 5000"
                          className="input"
                          value={newQuickAmount}
                          onChange={e => setNewQuickAmount(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addQuickAmount()}
                        />
                        <button className="btn btn-primary btn-sm" onClick={addQuickAmount}>Tambah</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {formData.quick_amounts.map(amt => (
                          <div key={amt} className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
                            {new Intl.NumberFormat('id-ID').format(amt)}
                            <button
                              onClick={() => removeQuickAmount(amt)}
                              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {user?.quick_amounts?.length ? user.quick_amounts.map(amt => (
                        <span key={amt} className="badge badge-active">{new Intl.NumberFormat('id-ID').format(amt)}</span>
                      )) : <p className="muted">Belum ada nominal cepat.</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Input Kustom */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label>Formulir Tambahan Donatur</label>
                  <p className="muted" style={{ fontSize: '12px', marginBottom: '12px' }}>
                    Donatur akan melihat input ini saat melakukan donasi (contoh: ID In-game, Username roblox, dll).
                  </p>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
                        <input
                          type="text"
                          placeholder="Label Input (misal: ID Roblox)"
                          className="input"
                          value={newField.label}
                          onChange={e => setNewField({ ...newField, label: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Pesan Error Kustom (Opsional)"
                            className="input"
                            style={{ flex: 1 }}
                            value={newField.required_error}
                            onChange={e => setNewField({ ...newField, required_error: e.target.value })}
                          />
                          <button className="btn btn-primary btn-sm" onClick={addField}>Tambah</button>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={newField.required}
                            onChange={e => setNewField({ ...newField, required: e.target.checked })}
                            style={{ width: 'auto' }}
                          /> Wajib diisi
                        </label>
                      </div>

                      <div className="feed" style={{ marginTop: '8px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                        {formData.custom_input_schema.length === 0 ? (
                          <p className="muted text-center" style={{ padding: '12px' }}>Belum ada input kustom</p>
                        ) : formData.custom_input_schema.map(f => (
                          <div key={f.key} className="feed-row" style={{ padding: '10px 14px' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, fontSize: '14px' }}>{f.label}</p>
                              <p className="muted" style={{ fontSize: '11px' }}>
                                {f.required ? (f.required_error || 'Wajib') : 'Opsional'}
                              </p>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => removeField(f.key)} style={{ color: '#dc2626' }}>Hapus</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="feed" style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                      {user?.custom_input_schema?.length ? user.custom_input_schema.map(f => (
                        <div key={f.key} className="feed-row" style={{ padding: '10px 14px' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: '14px' }}>{f.label}</p>
                            <p className="muted" style={{ fontSize: '11px' }}>
                              {f.required ? (f.required_error || 'Wajib') : 'Opsional'}
                            </p>
                          </div>
                        </div>
                      )) : <p className="muted text-center" style={{ padding: '12px' }}>Belum ada input kustom.</p>}
                    </div>
                  )}
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

export default Settings
