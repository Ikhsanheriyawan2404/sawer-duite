import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'

interface DonationPackage {
  label: string
  amount: number
}

interface User {
  id: number
  uuid: string
  email: string
  username: string
  name: string
  bio: string
  tiktok: string
  instagram: string
  youtube: string
  min_donation: number
  target_amount: number
  target_description: string
  quick_amounts: number[]
  donation_packages: DonationPackage[]
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
  const [formData, setFormData] = useState({ 
    name: '', 
    username: '',
    bio: '',
    tiktok: '',
    instagram: '',
    youtube: '',
    min_donation: 0,
    target_amount: 0,
    target_description: '',
    quick_amounts: [] as number[],
    donation_packages: [] as DonationPackage[]
  })
  const [newQuickAmount, setNewQuickAmount] = useState('')
  const [newPackage, setNewPackage] = useState({ label: '', amount: '' })
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
      setFormData({ 
        name: parsed.name || '', 
        username: parsed.username || '',
        bio: parsed.bio || '',
        tiktok: parsed.tiktok || '',
        instagram: parsed.instagram || '',
        youtube: parsed.youtube || '',
        min_donation: parsed.min_donation || 0,
        target_amount: parsed.target_amount || 0,
        target_description: parsed.target_description || '',
        quick_amounts: parsed.quick_amounts || [],
        donation_packages: parsed.donation_packages || []
      })
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        setUser(data)
        setFormData({ 
          name: data.name || '', 
          username: data.username || '',
          bio: data.bio || '',
          tiktok: data.tiktok || '',
          instagram: data.instagram || '',
          youtube: data.youtube || '',
          min_donation: data.min_donation || 0,
          target_amount: data.target_amount || 0,
          target_description: data.target_description || '',
          quick_amounts: data.quick_amounts || [],
          donation_packages: data.donation_packages || []
        })
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
      setFormData({ 
        name: user.name || '', 
        username: user.username || '',
        bio: user.bio || '',
        tiktok: user.tiktok || '',
        instagram: user.instagram || '',
        youtube: user.youtube || '',
        min_donation: user.min_donation || 0,
        target_amount: user.target_amount || 0,
        target_description: user.target_description || '',
        quick_amounts: user.quick_amounts || [],
        donation_packages: user.donation_packages || []
      })
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
        body: JSON.stringify({
          ...formData,
          min_donation: Number(formData.min_donation),
          target_amount: Number(formData.target_amount),
          quick_amounts: formData.quick_amounts.map(Number),
          donation_packages: formData.donation_packages.map(p => ({ ...p, amount: Number(p.amount) }))
        }),
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

  const addPackage = () => {
    const amt = parseInt(newPackage.amount)
    if (newPackage.label && amt > 0) {
      setFormData({ 
        ...formData, 
        donation_packages: [...formData.donation_packages, { label: newPackage.label, amount: amt }]
      })
      setNewPackage({ label: '', amount: '' })
    }
  }

  const removePackage = (index: number) => {
    setFormData({ 
      ...formData, 
      donation_packages: formData.donation_packages.filter((_, i) => i !== index) 
    })
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
        {/* Profile & Account Card */}
        <article className="card">
          <div className="card-header">
            <h3>Profil & Akun</h3>
            {!isEditing && (
              <button className="btn btn-secondary btn-sm" onClick={handleEdit}>
                Edit
              </button>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>Informasi Dasar</h4>
                  <div className="form-group">
                    <label>Nama Lengkap</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Bio (Deskripsi Profile)</label>
                    <textarea
                      value={formData.bio}
                      onChange={e => setFormData({ ...formData, bio: e.target.value })}
                      className="input"
                      style={{ minHeight: '80px', resize: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>Media Sosial</h4>
                  <div className="form-group">
                    <label>URL TikTok</label>
                    <input
                      type="text"
                      value={formData.tiktok}
                      onChange={e => setFormData({ ...formData, tiktok: e.target.value })}
                      className="input"
                      placeholder="https://tiktok.com/@username"
                    />
                  </div>
                  <div className="form-group">
                    <label>URL Instagram</label>
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                      className="input"
                      placeholder="https://instagram.com/username"
                    />
                  </div>
                  <div className="form-group">
                    <label>URL YouTube</label>
                    <input
                      type="text"
                      value={formData.youtube}
                      onChange={e => setFormData({ ...formData, youtube: e.target.value })}
                      className="input"
                      placeholder="https://youtube.com/@channel"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="profile-display">
                  <div className="profile-field">
                    <p className="profile-label">Nama Lengkap</p>
                    <p className="profile-value profile-value--accent">{user?.name || '-'}</p>
                  </div>
                  <div className="profile-field">
                    <p className="profile-label">Bio</p>
                    <p className="profile-value" style={{ fontSize: '14px', fontWeight: 500 }}>{user?.bio || 'Belum ada bio'}</p>
                  </div>
                </div>

                <div className="profile-meta">
                  <div className="profile-meta-item">
                    <p className="profile-meta-label">TikTok</p>
                    <p className="profile-meta-value">{user?.tiktok ? 'Tersambung' : '-'}</p>
                  </div>
                  <div className="profile-meta-item">
                    <p className="profile-meta-label">Instagram</p>
                    <p className="profile-meta-value">{user?.instagram ? 'Tersambung' : '-'}</p>
                  </div>
                  <div className="profile-meta-item">
                    <p className="profile-meta-label">YouTube</p>
                    <p className="profile-meta-value">{user?.youtube ? 'Tersambung' : '-'}</p>
                  </div>
                  <div className="profile-meta-item">
                    <p className="profile-meta-label">Username</p>
                    <p className="profile-meta-value">@{user?.username || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Donation Preferences Card */}
        <article className="card">
          <div className="card-header">
            <h3>Preferensi Dukungan</h3>
            {isEditing && (
              <span className="badge badge-active">Sedang Diedit</span>
            )}
          </div>

          <div className="profile-form">
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>Target & Batasan</h4>
                  <div className="form-group">
                    <label>Minimal Donasi (IDR)</label>
                    <input
                      type="number"
                      value={formData.min_donation}
                      onChange={e => setFormData({ ...formData, min_donation: Number(e.target.value) })}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Target Dana (IDR)</label>
                    <input
                      type="number"
                      value={formData.target_amount}
                      onChange={e => setFormData({ ...formData, target_amount: Number(e.target.value) })}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Keterangan Target</label>
                    <input
                      type="text"
                      value={formData.target_description}
                      onChange={e => setFormData({ ...formData, target_description: e.target.value })}
                      className="input"
                      placeholder="Contoh: Untuk beli laptop baru"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>List Harga Cepat</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      value={newQuickAmount}
                      onChange={e => setNewQuickAmount(e.target.value)}
                      placeholder="15000"
                      className="input"
                    />
                    <button type="button" className="btn btn-secondary" onClick={addQuickAmount}>+</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.quick_amounts.map(amt => (
                      <span key={amt} className="badge badge-active" style={{ cursor: 'pointer' }} onClick={() => removeQuickAmount(amt)}>
                        {amt/1000}rb ✕
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>Paket Dukungan</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      value={newPackage.label}
                      onChange={e => setNewPackage({ ...newPackage, label: e.target.value })}
                      placeholder="Label: REVIEW AKUN"
                      className="input"
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        value={newPackage.amount}
                        onChange={e => setNewPackage({ ...newPackage, amount: e.target.value })}
                        placeholder="Harga: 50000"
                        className="input"
                      />
                      <button type="button" className="btn btn-secondary" onClick={addPackage}>Tambah</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {formData.donation_packages.map((p, i) => (
                      <div key={i} className="widget-row" style={{ padding: '8px 12px', background: 'var(--muted)', borderRadius: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{p.label} - {formatCurrency(p.amount)}</span>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => removePackage(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                    Batal
                  </button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="profile-display">
                  <div className="profile-field">
                    <p className="profile-label">Minimal Donasi</p>
                    <p className="profile-value" style={{ color: 'var(--accent)' }}>{formatCurrency(user?.min_donation || 0)}</p>
                  </div>
                  <div className="profile-field">
                    <p className="profile-label">Target Dana</p>
                    <p className="profile-value">{formatCurrency(user?.target_amount || 0)}</p>
                    {user?.target_description && <p style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>{user.target_description}</p>}
                  </div>
                </div>

                <div className="profile-display">
                  <div className="profile-field">
                    <p className="profile-label">List Harga Cepat</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {user?.quick_amounts?.map(amt => (
                        <span key={amt} className="badge" style={{ background: 'var(--muted)', color: 'var(--foreground)', fontSize: '10px' }}>{amt/1000}rb</span>
                      )) || '-'}
                    </div>
                  </div>
                  <div className="profile-field">
                    <p className="profile-label">Paket Dukungan</p>
                    <p className="profile-value" style={{ fontSize: '14px' }}>{user?.donation_packages?.length || 0} Paket Terdaftar</p>
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
