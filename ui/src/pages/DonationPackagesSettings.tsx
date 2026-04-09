import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'
import { normalizeMeUser } from '../lib/normalizeUser'

interface DonationPackage {
  label: string
  amount: number
}

function DonationPackagesSettings() {
  useDocumentTitle('Paket Donasi')
  const [packages, setPackages] = useState<DonationPackage[]>([])
  const [newPackage, setNewPackage] = useState({ label: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsed = normalizeMeUser(JSON.parse(savedUser))
      setPackages(parsed.donation_packages || [])
    }

    fetchWithAuth('/me')
      .then(res => res.json())
      .then(data => {
        const normalized = normalizeMeUser(data)
        setPackages(normalized.donation_packages || [])
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
      const res = await fetchWithAuth('/me/donation-packages', {
        method: 'POST',
        body: JSON.stringify(nextPackages)
      })

      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Gagal menyimpan')
        return
      }

      const updated = normalizeMeUser(await res.json())
      setPackages(updated.donation_packages || [])
      localStorage.setItem('user', JSON.stringify(updated))
      showToast('Paket donasi diperbarui')
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
    const nextPackages = [...packages, { label: newPackage.label, amount: amt }]
    setPackages(nextPackages)
    savePackages(nextPackages)
    setNewPackage({ label: '', amount: '' })
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
          <h2>Paket Donasi</h2>
          <p className="lead">Buat paket nominal tetap agar supporter tinggal klik.</p>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <h3>Tambah Paket</h3>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="profile-form" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Label Paket</label>
              <input
                type="text"
                value={newPackage.label}
                onChange={e => setNewPackage({ ...newPackage, label: e.target.value })}
                className="input"
                placeholder="Contoh: Review Akun"
              />
            </div>
            <div className="form-group">
              <label>Nominal (IDR)</label>
              <input
                type="number"
                value={newPackage.amount}
                onChange={e => setNewPackage({ ...newPackage, amount: e.target.value })}
                className="input"
                placeholder="50000"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={addPackage}>Tambah</button>
            </div>
          </div>
        </article>

        <article className="card card-wide">
          <div className="card-header">
            <h3>Daftar Paket</h3>
            {saving && <span className="muted" style={{ fontSize: '12px' }}>Menyimpan...</span>}
          </div>

          {packages.length === 0 ? (
            <p className="muted" style={{ padding: '20px 0' }}>Belum ada paket.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {packages.map((p, i) => (
                <div key={`${p.label}-${i}`} className="widget-row" style={{ padding: '10px 12px', background: 'var(--muted)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700 }}>{p.label}</span>
                    <span className="muted" style={{ fontSize: '12px' }}>{formatCurrency(p.amount)}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => removePackage(i)}>Hapus</button>
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
      `}</style>
    </main>
  )
}

export default DonationPackagesSettings
