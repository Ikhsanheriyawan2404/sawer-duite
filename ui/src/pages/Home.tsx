import { useEffect, useRef, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'
import type { NormalizedUser } from '../lib/normalizeUser'

interface DonationPackage {
  label: string
  amount: number
}

function Home() {
  useDocumentTitle('Dashboard')
  const [user, setUser] = useState<NormalizedUser | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    tiktok: '',
    instagram: '',
    youtube: '',
    min_donation: 0,
    active_goal: null as any,
    quick_amounts: [] as number[],
    donation_packages: [] as DonationPackage[],
    queue_title: '',
    static_qris: '',
    provider: 'DANA'
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<number | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setUser(parsed)
      setProfileLoaded(true)
      setFormData({
        name: parsed.name || '',
        username: parsed.username || '',
        bio: parsed.bio || '',
        tiktok: parsed.tiktok || '',
        instagram: parsed.instagram || '',
        youtube: parsed.youtube || '',
        min_donation: parsed.min_donation || 0,
        active_goal: parsed.active_goal || null,
        quick_amounts: parsed.quick_amounts || [],
        donation_packages: parsed.donation_packages || [],
        queue_title: parsed.queue_title || '',
        static_qris: parsed.static_qris || '',
        provider: parsed.provider || 'DANA'
      })
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setUser(normalized)
        setProfileLoaded(true)
        setFormData({
          name: normalized.name || '',
          username: normalized.username || '',
          bio: normalized.bio || '',
          tiktok: normalized.tiktok || '',
          instagram: normalized.instagram || '',
          youtube: normalized.youtube || '',
          min_donation: normalized.min_donation || 0,
          active_goal: normalized.active_goal || null,
          quick_amounts: normalized.quick_amounts || [],
          donation_packages: normalized.donation_packages || [],
          queue_title: normalized.queue_title || '',
          static_qris: normalized.static_qris || '',
          provider: normalized.provider || 'DANA'
        })
        localStorage.setItem('user', JSON.stringify(normalized))
      })
      .catch(err => console.error('Failed to fetch profile', err))
  }, [])

  function showToast(message: string) {
    setToastMessage(message)
    setToastVisible(true)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false)
    }, 2200)
  }

  async function handleAvatarChange(file?: File | null) {
    if (!file) return
    const maxSize = 2 * 1024 * 1024
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar')
      return
    }
    if (file.size > maxSize) {
      showToast('Ukuran maksimal 2MB')
      return
    }

    const formDataUpload = new FormData()
    formDataUpload.append('avatar', file)

    setAvatarUploading(true)
    try {
      const res = await fetchWithAuth('/me/avatar', {
        method: 'POST',
        body: formDataUpload
      })
      if (!res.ok) {
        const text = await res.text()
        showToast(text || 'Gagal upload avatar')
        return
      }
      const updatedUser = normalizeMeUser(await res.json())
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      showToast('Avatar diperbarui')
    } catch {
      showToast('Gagal upload avatar')
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
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
      const res = await fetchWithAuth('/me/profile', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          bio: formData.bio,
          social_links: {
            tiktok: formData.tiktok,
            instagram: formData.instagram,
            youtube: formData.youtube
          }
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

      const updatedUser = normalizeMeUser(await res.json())
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setIsEditing(false)
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
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
        active_goal: user.active_goal || null,
        quick_amounts: user.quick_amounts || [],
        donation_packages: user.donation_packages || [],
        queue_title: user.queue_title || '',
        static_qris: user.static_qris || '',
        provider: user.provider || 'DANA'
      })
    }
  }

  return (
    <main className="page">
      <div className={`toast-container ${toastVisible ? 'toast-show' : ''}`} role="status" aria-live="polite">
        <div className="toast">{toastMessage}</div>
      </div>
      <section className="dashboard-header">
        <div>
          <h2>Halo, {user?.name || '...'}</h2>
          <p className="lead">Kelola overlay dan pantau dukungan fans secara real-time. 100% cuan, 0% potongan!</p>
        </div>
        <div className="form-actions">
          <a href={`/${user?.username}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Buka Bio Profile
          </a>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid">
        {/* Profile & Account Card */}
        <article className="card">
          <div className="card-header">
            <h3>Profil & Akun</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form">
            <div className="profile-avatar-block">
              <div className={`avatar-preview ${!profileLoaded ? 'avatar-skeleton' : ''}`}>
                {profileLoaded ? (
                  <img
                    src={user?.avatar_url || '/profile.jpg'}
                    alt="Avatar"
                  />
                ) : (
                  <span className="avatar-skeleton-inner" aria-hidden="true" />
                )}
              </div>
              <div className="avatar-meta">
                <p style={{ margin: 0, fontWeight: 700 }}>Foto Profil</p>
                <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  Maks 2MB. Format JPG, PNG, atau WebP.
                </p>
              </div>
              <div className="avatar-actions">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleAvatarChange(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? 'Mengunggah...' : 'Ganti Foto'}
                </button>
              </div>
            </div>

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
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button className="btn btn-secondary" onClick={handleCancel}>
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
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={handleEdit}>
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </article>

      </section>
      <style>{`
        .profile-avatar-block {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border: 1px dashed var(--border);
          border-radius: 16px;
          background: var(--muted);
        }
        .avatar-preview {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid rgba(0, 82, 255, 0.2);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-skeleton {
          background: linear-gradient(110deg, #e5e7eb 8%, #f3f4f6 18%, #e5e7eb 33%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.4s ease-in-out infinite;
        }
        .avatar-skeleton-inner {
          width: 70%;
          height: 70%;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.55);
        }
        .avatar-actions { display: flex; justify-content: flex-end; }
        @media (max-width: 520px) {
          .profile-avatar-block {
            grid-template-columns: auto 1fr;
            grid-template-areas:
              "avatar meta"
              "actions actions";
          }
          .avatar-preview { grid-area: avatar; }
          .avatar-meta { grid-area: meta; }
          .avatar-actions { grid-area: actions; justify-content: flex-start; }
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
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (min-width: 640px) {
          .toast {
            font-size: 13px;
            padding: 12px 16px;
          }
        }
      `}</style>
    </main>
  )
}

export default Home
