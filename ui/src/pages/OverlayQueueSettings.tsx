import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'
import type { NormalizedUser } from '../lib/normalizeUser'

interface Transaction {
  id: number
  uuid: string
  sender: string
  amount: number
  base_amount: number
  note: string
  custom_input_json: Record<string, string>
  status: string
  is_queue: boolean
  created_at: string
}

function OverlayQueueSettings() {
  useDocumentTitle('Queue Overlay Settings')
  const [user, setUser] = useState<NormalizedUser | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [configEditing, setConfigEditing] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [configError, setConfigError] = useState('')
  const [queue, setQueue] = useState<Transaction[]>([])
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [filter, setFilter] = useState<'all' | 'queue' | 'done'>('all')
  const [search, setSearch] = useState('')
  const [configData, setConfigData] = useState({
    queue_title: 'Antrean Donasi'
  })

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
      setConfigData({
        queue_title: parsed.queue_config?.queue_title ?? 'Antrean Donasi'
      })
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setUser(normalized)
        setConfigData({
          queue_title: normalized.queue_config?.queue_title ?? 'Antrean Donasi'
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

  async function fetchQueue(username: string) {
    setLoadingQueue(true)
    try {
      const res = await fetchWithAuth(`/user/${username}/queue?status=PAID&order=desc`)
      if (res.ok) {
        const data = await res.json()
        setQueue(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch queue', err)
    } finally {
      setLoadingQueue(false)
    }
  }

  async function toggleGroupQueue(uuids: string[], currentIsQueue: boolean) {
    try {
      const endpoint = currentIsQueue ? '/queue/remove' : '/queue/add'
      const promises = uuids.map(uuid =>
        fetchWithAuth(`/transactions/${uuid}${endpoint}`, { method: 'POST' })
      )
      await Promise.all(promises)
      setQueue(prev => prev.map(item =>
        uuids.includes(item.uuid) ? { ...item, is_queue: !currentIsQueue } : item
      ))
    } catch (err) {
      console.error('Failed to toggle queue group', err)
    }
  }

  async function handleBulkAction(action: 'clear' | 'reset') {
    if (!user) return
    const confirmMsg = action === 'clear'
      ? 'Kosongkan semua antrean saat ini?'
      : 'Masukkan semua donasi ke antrean?'

    if (!window.confirm(confirmMsg)) return

    setLoadingQueue(true)
    try {
      const promises = queue
        .filter(tx => action === 'clear' ? tx.is_queue : !tx.is_queue)
        .map(tx => {
          const endpoint = action === 'clear'
            ? `/transactions/${tx.uuid}/queue/remove`
            : `/transactions/${tx.uuid}/queue/add`
          return fetchWithAuth(endpoint, { method: 'POST' })
        })

      await Promise.all(promises)
      fetchQueue(user.username)
    } catch (err) {
      console.error('Bulk action failed', err)
    } finally {
      setLoadingQueue(false)
    }
  }

  useEffect(() => {
    if (!user?.username) return
    fetchQueue(user.username)
  }, [user?.username])

  const filteredQueue = queue.filter(tx => {
    const matchesSearch = (tx.sender?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (tx.note?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (tx.custom_input_json ? Object.values(tx.custom_input_json).join(' ').toLowerCase().includes(search.toLowerCase()) : false)
    if (!matchesSearch) return false

    if (filter === 'queue') return tx.is_queue
    if (filter === 'done') return !tx.is_queue
    return true
  })

  const aggregatedQueue = (() => {
    const groups: Record<string, {
      sender: string,
      custom_input_display: string,
      total_base_amount: number,
      notes: string[],
      is_queue: boolean,
      uuids: string[],
      latest_date: string
    }> = {}

    filteredQueue.forEach(tx => {
      const customValues = tx.custom_input_json ? Object.values(tx.custom_input_json).filter(Boolean).join(', ') : ''
      const key = customValues ? `custom_${customValues.toLowerCase()}` : `single_${tx.uuid}`

      if (!groups[key]) {
        groups[key] = {
          sender: tx.sender,
          custom_input_display: customValues,
          total_base_amount: 0,
          notes: [],
          is_queue: false,
          uuids: [],
          latest_date: tx.created_at
        }
      }

      groups[key].total_base_amount += tx.base_amount
      groups[key].uuids.push(tx.uuid)
      if (tx.note && !groups[key].notes.includes(tx.note)) {
        groups[key].notes.push(tx.note)
      }
      if (tx.is_queue) groups[key].is_queue = true
    })

    return Object.values(groups).sort((a, b) => b.total_base_amount - a.total_base_amount)
  })()

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

  function handleConfigEdit() {
    setConfigEditing(true)
    setConfigError('')
    if (user) {
      setConfigData({
        queue_title: user.queue_config?.queue_title ?? 'Antrean Donasi'
      })
    }
  }

  function handleConfigCancel() {
    setConfigEditing(false)
    setConfigError('')
    if (user) {
      setConfigData({
        queue_title: user.queue_config?.queue_title ?? 'Antrean Donasi'
      })
    }
  }

  async function handleConfigSave() {
    setConfigSaving(true)
    setConfigError('')
    try {
      const res = await fetchWithAuth('/me/queue-config', {
        method: 'POST',
        body: JSON.stringify({
          queue_title: configData.queue_title
        })
      })

      if (!res.ok) {
        const text = await res.text()
        setConfigError(text || 'Gagal menyimpan')
        return
      }

      const updated = normalizeMeUser(await res.json())
      setUser(updated)
      setConfigData({
        queue_title: updated.queue_config?.queue_title ?? 'Antrean Donasi'
      })
      localStorage.setItem('user', JSON.stringify(updated))
      setConfigEditing(false)
      showToast('Pengaturan disimpan')
    } catch {
      setConfigError('Terjadi kesalahan')
    } finally {
      setConfigSaving(false)
    }
  }

  const overlayPath = user?.uuid ? `/overlays/queue/${user.uuid}` : ''
  const overlayUrl = overlayPath ? `${window.location.origin}${overlayPath}` : ''

  return (
    <main className="page">
      <div className={`toast-container ${toastVisible ? 'toast-show' : ''}`} role="status" aria-live="polite">
        <div className="toast">{toastMessage}</div>
      </div>

      <section className="dashboard-header">
        <div>
          <h2>Queue Overlay</h2>
          <p className="lead">Atur judul antrean dan lihat daftar donasi aktif.</p>
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
            <h3>Config Queue</h3>
          </div>

          {configError && <p className="error-text">{configError}</p>}

          <div className="profile-form">
            {configEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Judul Antrean</label>
                  <input
                    type="text"
                    value={configData.queue_title}
                    onChange={e => setConfigData({ ...configData, queue_title: e.target.value })}
                    className="input"
                    placeholder="Contoh: Antrean Request"
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={handleConfigCancel}>Batal</button>
                  <button className="btn btn-primary" onClick={handleConfigSave} disabled={configSaving}>
                    {configSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="profile-display">
                <div className="profile-field">
                  <p className="profile-label">Judul Antrean</p>
                  <p className="profile-value">{user?.queue_config?.queue_title || 'Antrean Donasi'}</p>
                </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={handleConfigEdit}>Edit</button>
                </div>
              </div>
            )}
          </div>
        </article>

        <article className="card card-wide">
          <div className="card-header">
            <h3>Antrean Donasi</h3>
            <div className="form-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => handleBulkAction('reset')} disabled={loadingQueue} style={{ color: 'var(--accent)' }}>Reset</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleBulkAction('clear')} disabled={loadingQueue} style={{ color: '#dc2626' }}>Clear</button>
              <button className="btn btn-secondary btn-sm" onClick={() => user && fetchQueue(user.username)} disabled={loadingQueue}>Refresh</button>
            </div>
          </div>

          <div className="stack-resp">
            <div className="tab-group flex-1">
              {(['all', 'queue', 'done'] as const).map(t => (
                <button
                  key={t}
                  className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilter(t)}
                  style={{ flex: 1, padding: '6px' }}
                >
                  {t === 'all' ? 'Semua' : t === 'queue' ? 'Antrean' : 'Selesai'}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Cari donatur..."
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1.5 }}
            />
          </div>

          <div className="feed">
            {aggregatedQueue.length === 0 ? (
              <p className="muted text-center" style={{ padding: '40px' }}>
                {loadingQueue ? 'Memuat...' : 'Tidak ada data'}
              </p>
            ) : (
              aggregatedQueue.map((group) => (
                <div key={group.uuids[0]} className="feed-row" style={{ minWidth: 0 }}>
                  <div className="feed-user-info" style={{ minWidth: 0, flex: 1 }}>
                    <div className="feed-avatar" style={{ background: group.is_queue ? 'var(--accent)' : '#e2e8f0', flexShrink: 0 }}>
                      {group.sender[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="feed-text" style={{ minWidth: 0, flex: 1 }}>
                      <p className="feed-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>{group.sender}</p>
                      {group.custom_input_display && (
                        <p style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, margin: '2px 0', overflowWrap: 'anywhere' }}>
                          {group.custom_input_display}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="feed-meta" style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p className="feed-amount">{formatCurrency(group.total_base_amount)}</p>
                    {group.uuids.length > 1 && (
                      <span className="badge badge-active" style={{ fontSize: '9px', padding: '2px 6px', marginTop: '2px' }}>
                        {group.uuids.length}x Donasi
                      </span>
                    )}
                    <button
                      className={`btn btn-sm ${group.is_queue ? 'btn-ghost' : 'btn-primary'}`}
                      onClick={() => toggleGroupQueue(group.uuids, group.is_queue)}
                      style={{ padding: '4px 8px', height: '28px', marginTop: '4px' }}
                    >
                      {group.is_queue ? '✕' : '↩'}
                    </button>
                  </div>
                </div>
              ))
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
      `}</style>
    </main>
  )
}

export default OverlayQueueSettings
