import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'
import type { NormalizedUser } from '../lib/normalizeUser'

interface Goal {
  id: number
  title: string
  target_amount: number
  current_amount: number
  is_active: boolean
  starts_at?: string | null
  ends_at?: string | null
  created_at?: string
}

const emptyForm = {
  title: '',
  target_amount: 0,
  starts_at: '',
  ends_at: '',
  is_active: true
}

function OverlayGoalSettings() {
  useDocumentTitle('Donation Goal Settings')
  const [user, setUser] = useState<NormalizedUser | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loadingGoals, setLoadingGoals] = useState(false)
  const [listError, setListError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [initialDates, setInitialDates] = useState({ starts_at: '', ends_at: '' })

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
    }

    loadUser()
    loadGoals()
  }, [])

  async function loadUser() {
    try {
      const res = await fetchWithAuth('/me')
      const data = await res.json()
      const normalized = normalizeMeUser(data)
      setUser(normalized)
      localStorage.setItem('user', JSON.stringify(normalized))
    } catch {
      // ignore
    }
  }

  async function loadGoals() {
    setLoadingGoals(true)
    setListError('')
    try {
      const res = await fetchWithAuth('/me/goals')
      if (!res.ok) {
        const text = await res.text()
        setListError(text || 'Gagal memuat goals')
        return
      }
      const data = await res.json()
      setGoals(data || [])
    } catch {
      setListError('Gagal memuat goals')
    } finally {
      setLoadingGoals(false)
    }
  }

  function showToast(message: string) {
    setToastMessage(message)
    setToastVisible(true)
    window.setTimeout(() => setToastVisible(false), 2200)
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
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

  function dateInputValue(value?: string | null) {
    if (!value) return ''
    return value.slice(0, 10)
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

  function getGoalType(goal: Goal) {
    if (goal.starts_at && goal.ends_at) return 'Milestone'
    if (goal.ends_at) return 'Goal'
    return 'Wishlist'
  }

  function formatDate(value?: string | null) {
    if (!value) return ''
    try {
      return new Date(value).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return value.slice(0, 10)
    }
  }

  function formatDateRange(goal: Goal) {
    if (goal.starts_at && goal.ends_at) return `${formatDate(goal.starts_at)} - ${formatDate(goal.ends_at)}`
    if (goal.ends_at) return `Sampai ${formatDate(goal.ends_at)}`
    if (goal.starts_at) return `Mulai ${formatDate(goal.starts_at)}`
    return 'Tanpa batas waktu'
  }

  function handleCreate() {
    setIsEditing(true)
    setEditingId(null)
    setFormData({ ...emptyForm, is_active: !goals.some(goal => goal.is_active) })
    setInitialDates({ starts_at: '', ends_at: '' })
    setError('')
  }

  function handleEdit(goal: Goal) {
    setIsEditing(true)
    setEditingId(goal.id)
    setFormData({
      title: goal.title,
      target_amount: goal.target_amount,
      starts_at: dateInputValue(goal.starts_at),
      ends_at: dateInputValue(goal.ends_at),
      is_active: goal.is_active
    })
    setInitialDates({
      starts_at: dateInputValue(goal.starts_at),
      ends_at: dateInputValue(goal.ends_at)
    })
    setError('')
  }

  function handleCancel() {
    setIsEditing(false)
    setEditingId(null)
    setFormData({ ...emptyForm })
    setInitialDates({ starts_at: '', ends_at: '' })
    setError('')
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      const payload: Record<string, any> = {
        title: formData.title,
        target_amount: formData.target_amount,
        is_active: formData.is_active
      }

      if (formData.starts_at) {
        payload.starts_at = toOffsetRFC3339(formData.starts_at)
      }
      if (formData.ends_at) {
        payload.ends_at = toOffsetRFC3339(formData.ends_at)
      }

      if (editingId) {
        if (!formData.starts_at && initialDates.starts_at) {
          payload.clear_starts_at = true
        }
        if (!formData.ends_at && initialDates.ends_at) {
          payload.clear_ends_at = true
        }
      }

      const endpoint = editingId ? `/me/goals/${editingId}` : '/me/goals'
      const method = editingId ? 'POST' : 'POST'

      const res = await fetchWithAuth(endpoint, {
        method,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Gagal menyimpan')
        return
      }

      await loadGoals()
      await loadUser()
      setIsEditing(false)
      setEditingId(null)
      setFormData({ ...emptyForm })
      setInitialDates({ starts_at: '', ends_at: '' })
      showToast('Goal berhasil diperbarui')
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate(goalId: number) {
    try {
      const res = await fetchWithAuth(`/me/goals/${goalId}/activate`, { method: 'POST' })
      if (!res.ok) {
        const text = await res.text()
        setListError(text || 'Gagal mengaktifkan goal')
        return
      }
      await loadGoals()
      await loadUser()
      showToast('Goal aktif diperbarui')
    } catch {
      setListError('Gagal mengaktifkan goal')
    }
  }

  async function handleDelete(goalId: number) {
    if (!window.confirm('Hapus goal ini?')) return
    try {
      const res = await fetchWithAuth(`/me/goals/${goalId}`, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        setListError(text || 'Gagal menghapus goal')
        return
      }
      await loadGoals()
      await loadUser()
      showToast('Goal dihapus')
    } catch {
      setListError('Gagal menghapus goal')
    }
  }

  const overlayPath = user?.uuid ? `/overlays/goal/${user.uuid}` : ''
  const overlayUrl = overlayPath ? `${window.location.origin}${overlayPath}` : ''

  const activeGoal = goals.find(goal => goal.is_active) || user?.active_goal || null
  const progress = activeGoal
    ? Math.min(100, (activeGoal.current_amount / activeGoal.target_amount) * 100)
    : 0

  return (
    <main className="page">
      <div className={`toast-container ${toastVisible ? 'toast-show' : ''}`} role="status" aria-live="polite">
        <div className="toast">{toastMessage}</div>
      </div>

      <section className="dashboard-header">
        <div>
          <h2>Target Donasi</h2>
          <p className="lead">Pantau pencapaian Anda. Sistem otomatis menentukan kategori (Wishlist, Goal, atau Milestone) berdasarkan pengaturan waktu.</p>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid goal-grid">
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
              {overlayPath && (
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
              )}
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <h3>Target Aktif</h3>
          </div>

          {activeGoal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p className="profile-label" style={{ marginBottom: '4px' }}>Judul Target</p>
                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{activeGoal.title}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span className="chip">{getGoalType(activeGoal as Goal)}</span>
                  <span className="chip chip-soft">{formatDateRange(activeGoal as Goal)}</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span className="muted">Progres</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{progress.toFixed(1)}%</span>
                </div>
                <div style={{ height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: 'var(--accent)',
                      transition: 'width 0.5s ease'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px', fontWeight: 600 }}>
                  <span>{formatCurrency(activeGoal.current_amount)}</span>
                  <span className="muted">Target: {formatCurrency(activeGoal.target_amount)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="muted text-center" style={{ padding: '20px' }}>Belum ada target yang sedang berjalan.</p>
          )}
        </article>

        <article className="card">
          <div className="card-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h3>Koleksi Target</h3>
              <p className="muted" style={{ fontSize: '13px' }}>Hanya satu target yang tampil di overlay (Aktif). Target lainnya tetap tersimpan dan progresnya tetap dihitung.</p>
            </div>
          </div>

          {listError && <p className="error-text">{listError}</p>}

          {loadingGoals ? (
            <p className="muted">Memuat data...</p>
          ) : goals.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', padding: '16px' }}>Belum ada target. Mulai buat target pertama Anda.</p>
          ) : (
            <div className="goal-list">
              {goals.map(goal => {
                const itemProgress = Math.min(100, (goal.current_amount / goal.target_amount) * 100)
                return (
                  <div key={goal.id} className={`goal-item ${goal.is_active ? 'goal-active' : ''}`}>
                    <div className="goal-item-header">
                      <div>
                        <p className="goal-item-title">{goal.title}</p>
                        <div className="goal-item-meta">
                          <span className="chip chip-outline">{getGoalType(goal)}</span>
                          <span className="chip chip-soft">{formatDateRange(goal)}</span>
                        </div>
                      </div>
                      {goal.is_active && <span className="chip chip-accent">Aktif</span>}
                    </div>
                    <div className="goal-item-body">
                      <div className="goal-item-progress">
                        <div className="goal-bar">
                          <div className="goal-bar-fill" style={{ width: `${itemProgress}%` }} />
                        </div>
                        <div className="goal-amounts">
                          <span>{formatCurrency(goal.current_amount)}</span>
                          <span className="muted">Target {formatCurrency(goal.target_amount)}</span>
                        </div>
                        <div className="goal-current">
                          <span className="muted">Total Terkumpul</span>
                          <span>{formatCurrency(goal.current_amount)}</span>
                        </div>
                      </div>
                      <div className="goal-item-actions">
                        {!goal.is_active && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleActivate(goal.id)}>
                            Aktifkan di Overlay
                          </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(goal)}>
                          Ubah
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(goal.id)}>
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <h3>{isEditing ? 'Ubah Rincian Target' : 'Konfigurasi Target'}</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Judul Target</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    placeholder="Contoh: Upgrade Kamera Streaming"
                  />
                </div>
                <div className="form-group">
                  <label>Jumlah Target (Rp)</label>
                  <input
                    type="number"
                    value={formData.target_amount}
                    onChange={e => setFormData({ ...formData, target_amount: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Rentang Waktu (Opsional)</label>
                  <div className="date-grid">
                    <input
                      type="date"
                      value={formData.starts_at}
                      onChange={e => setFormData({ ...formData, starts_at: e.target.value })}
                      className="input"
                    />
                    <input
                      type="date"
                      value={formData.ends_at}
                      onChange={e => setFormData({ ...formData, ends_at: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="muted" style={{ fontSize: '12px', marginTop: '8px', lineHeight: '1.5' }}>
                    <strong>Wishlist:</strong> Kosongkan tanggal (untuk target jangka panjang).<br/>
                    <strong>Goal:</strong> Isi tanggal akhir (untuk target dengan tenggat waktu).<br/>
                    <strong>Milestone:</strong> Isi awal & akhir (untuk event periode tertentu).
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="goal_active"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="goal_active" style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                    Langsung tampilkan di overlay
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button className="btn btn-secondary" onClick={handleCancel}>
                    Batal
                  </button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Menyimpan...' : 'Simpan Target'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="profile-display">
                  <div className="profile-field">
                    <p className="profile-label">Target Berjalan</p>
                    <p className="profile-value">{activeGoal ? activeGoal.title : '-'}</p>
                  </div>
                  <div className="profile-field">
                    <p className="profile-label">Nominal Target</p>
                    <p className="profile-value">{activeGoal ? formatCurrency(activeGoal.target_amount) : '-'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={handleCreate}>
                    Buat Target Baru
                  </button>
                </div>
              </div>
            )}
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
        .chip {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          background: #f1f5f9;
          color: #0f172a;
        }
        .chip-soft {
          background: #e2e8f0;
          color: #475569;
        }
        .chip-outline {
          background: transparent;
          border: 1px solid #cbd5f5;
          color: #475569;
        }
        .chip-accent {
          background: var(--accent);
          color: #fff;
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
        .goal-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }
        .goal-current {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
        }
        .goal-item {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #fff;
        }
        .goal-active {
          border-color: rgba(79, 70, 229, 0.35);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
        }
        .goal-item-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }
        .goal-item-title {
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 4px;
        }
        .goal-item-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .goal-item-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .goal-item-progress {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .goal-bar {
          height: 10px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .goal-bar-fill {
          height: 100%;
          background: var(--accent);
          transition: width 0.4s ease;
        }
        .goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
        }
        .goal-item-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .goal-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }
        @media (min-width: 900px) {
          .goal-grid {
            grid-template-columns: 1fr 1fr;
          }
          /* Membuat Daftar Goals dan Pengaturan Goal melebar penuh */
          .goal-grid > .card:nth-child(3),
          .goal-grid > .card:nth-child(4) {
            grid-column: span 2;
          }
          .goal-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .goal-item-body {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }
          .goal-item-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </main>
  )
}

export default OverlayGoalSettings
