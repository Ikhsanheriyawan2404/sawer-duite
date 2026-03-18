import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'

interface User {
  id: number
  uuid: string
  email: string
  username: string
  name: string
  created_at: string
  updated_at: string
}

interface Transaction {
  id: number
  uuid: string
  sender: string
  amount: number
  base_amount: number
  note: string
  status: string
  is_queue: boolean
  created_at: string
}

function Home() {
  useDocumentTitle('Dashboard')
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ name: '', username: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [queue, setQueue] = useState<Transaction[]>([])
  const [loadingQueue, setLoadingQueue] = useState(false)
  
  const [filter, setFilter] = useState<'all' | 'queue' | 'done'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = JSON.parse(savedUser)
      setUser(parsed)
      setFormData({ name: parsed.name, username: parsed.username })
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        setUser(data)
        setFormData({ name: data.name, username: data.username })
        localStorage.setItem('user', JSON.stringify(data))
        fetchQueue(data.username)
      })
      .catch(err => console.error('Failed to fetch profile', err))
  }, [])

  async function fetchQueue(username: string) {
    setLoadingQueue(true)
    try {
      const res = await fetchWithAuth(`/user/${username}/queue?status=paid&sort_by=base_amount&order=desc`)
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

  async function toggleQueue(tx: Transaction) {
    try {
      const endpoint = tx.is_queue
        ? `/transactions/${tx.uuid}/queue/remove`
        : `/transactions/${tx.uuid}/queue/add`
      const res = await fetchWithAuth(endpoint, { method: 'POST' })
      if (res.ok && user) {
        setQueue(prev => prev.map(item => 
          item.uuid === tx.uuid ? { ...item, is_queue: !item.is_queue } : item
        ))
      }
    } catch (err) {
      console.error('Failed to toggle queue', err)
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

  const filteredQueue = queue.filter(tx => {
    const matchesSearch = (tx.sender?.toLowerCase() || '').includes(search.toLowerCase()) || 
                          (tx.note?.toLowerCase() || '').includes(search.toLowerCase())
    if (!matchesSearch) return false
    
    if (filter === 'queue') return tx.is_queue
    if (filter === 'done') return !tx.is_queue
    return true
  })

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function handleEdit() {
    setIsEditing(true)
    setError('')
  }

  function handleCancel() {
    setIsEditing(false)
    setError('')
    if (user) {
      setFormData({ name: user.name, username: user.username })
    }
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.username.trim()) {
      setError('Nama dan username tidak boleh kosong')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await fetchWithAuth('/me', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const text = await res.text()
        if (res.status === 409) {
          setError('Username sudah digunakan')
        } else {
          setError(text || 'Gagal menyimpan')
        }
        return
      }

      const updatedUser = await res.json()
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setIsEditing(false)
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <main className="page">
      <section className="dashboard-header">
        <div>
          <h2>Halo, {user?.name || '...'}</h2>
          <p className="lead">Kelola overlay streaming dan pantau dukungan secara real-time.</p>
        </div>
        <div className="form-actions">
          <a href={`/${user?.username}`} target="_blank" rel="noreferrer" className="btn btn-secondary">
            Buka Bio Profile
          </a>
        </div>
      </section>

      <section className="dashboard-grid">
        {/* Profile Card */}
        <article className="card">
          <div className="card-header">
            <h3>Profil</h3>
            {!isEditing && (
              <button className="btn btn-secondary btn-sm" onClick={handleEdit}>
                Edit
              </button>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            {isEditing ? (
              <>
                <div className="form-group">
                  <label>Nama</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="input"
                    placeholder="Masukkan username"
                  />
                </div>
                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                    Batal
                  </button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </>
            ) : (
              <div className="profile-display">
                <div className="profile-field">
                  <p className="profile-label">Nama Lengkap</p>
                  <p className="profile-value profile-value--accent">{user?.name || '-'}</p>
                </div>
                <div className="profile-field">
                  <p className="profile-label">Username</p>
                  <p className="profile-value">@{user?.username || '-'}</p>
                </div>
                <div className="profile-meta">
                  <div className="profile-meta-item">
                    <p className="profile-meta-label">Email</p>
                    <p className="profile-meta-value">{user?.email || '-'}</p>
                  </div>
                  <div className="profile-meta-item">
                    <p className="profile-meta-label">Sejak</p>
                    <p className="profile-meta-value">{user?.created_at ? formatDate(user.created_at) : '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Overlay Links Card */}
        <article className="card">
          <div className="card-header">
            <h3>Overlay Widgets</h3>
            <span className="badge badge-active">Streaming</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Alert Overlay', path: `/overlays/alert/${user?.uuid}`, status: 'active' },
              { label: 'Queue Overlay', path: `/overlays/queue/${user?.uuid}`, status: 'active' },
              { label: 'MediaShare Overlay', path: `/overlays/media/${user?.uuid}`, status: 'soon' },
            ].map((overlay) => (
              <div key={overlay.path} className="widget-row">
                <div className="widget-info">
                  <div className="widget-header">
                    <p>{overlay.label}</p>
                    <span className={`badge ${overlay.status === 'soon' ? 'badge-soon' : 'badge-active'}`}>
                      {overlay.status === 'soon' ? 'SOON' : 'LIVE'}
                    </span>
                  </div>
                  <input
                    readOnly
                    value={overlay.status === 'soon' ? 'Fitur akan segera hadir' : `${window.location.origin}${overlay.path}`}
                    className="input"
                    disabled={overlay.status === 'soon'}
                    style={{ fontSize: '11px' }}
                  />
                </div>
                <div className="form-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={overlay.status === 'soon'}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${overlay.path}`)
                      alert(`${overlay.label} link copied!`)
                    }}
                  >
                    Salin
                  </button>
                  {overlay.status !== 'soon' && (
                    <>
                      <a href={overlay.path} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                        Buka
                      </a>
                      {overlay.label === 'Alert Overlay' && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (!user) return
                            fetchWithAuth(`/user/${user.uuid}/test-alert`, { method: 'POST' })
                              .then(() => alert('Test alert dikirim ke overlay!'))
                              .catch(() => alert('Gagal mengirim test alert'))
                          }}
                        >
                          Test
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Queue Management Card */}
        <article className="card card-wide">
          <div className="card-header">
            <h3>Antrian Donasi</h3>
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
                  {t === 'all' ? 'Semua' : t === 'queue' ? 'Antrian' : 'Selesai'}
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
            {filteredQueue.length === 0 ? (
              <p className="muted text-center" style={{ padding: '40px' }}>
                {loadingQueue ? 'Memuat...' : 'Tidak ada data'}
              </p>
            ) : (
              filteredQueue.map((tx) => (
                <div key={tx.uuid} className="feed-row">
                  <div className="feed-user-info">
                    <div className="feed-avatar" style={{ background: tx.is_queue ? 'var(--accent)' : '#e2e8f0' }}>
                      {tx.sender[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="feed-text">
                      <p className="feed-name">{tx.sender}</p>
                      <p className="feed-note">{tx.note || 'Terima kasih atas dukungannya!'}</p>
                    </div>
                  </div>
                  <div className="feed-meta">
                    <p className="feed-amount">{formatCurrency(tx.base_amount)}</p>
                    <button
                      className={`btn btn-sm ${tx.is_queue ? 'btn-ghost' : 'btn-primary'}`}
                      onClick={() => toggleQueue(tx)}
                      style={{ padding: '4px 8px', height: '28px', marginTop: '4px' }}
                    >
                      {tx.is_queue ? '✕' : '↩'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  )
}

export default Home
