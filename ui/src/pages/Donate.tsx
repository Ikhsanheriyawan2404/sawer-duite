import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function Donate() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', amount: '10000', note: '' })
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useDocumentTitle(user?.name ? `Dukung ${user.name}` : 'Kirim Dukungan')

  const defaultQuickAmounts = [10_000, 20_000, 50_000, 100_000, 500_000]
  const quickAmounts = user?.quick_amounts?.length > 0 ? user.quick_amounts : defaultQuickAmounts

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/user/${username}`)
      .then(res => {
        if (!res.ok) throw new Error('User not found')
        return res.json()
      })
      .then(data => {
        setUser(data)
        setLoading(false)
      })
      .catch(() => {
        setUser(null)
        setLoading(false)
      })
  }, [username])

  const formatIDR = (val: string) => {
    const num = val.replace(/\D/g, '')
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    setForm({ ...form, amount: val })
  }

  const isMinDonationMet = !user?.min_donation || parseInt(form.amount) >= user.min_donation

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed || !isMinDonationMet) return

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          sender: isAnonymous ? 'Seseorang' : form.name,
          amount: parseInt(form.amount),
          note: form.note,
        }),
      })

      if (!response.ok) throw new Error('Gagal membuat transaksi')

      const data = await response.json()
      navigate(`/payment/${data.uuid}`)
    } catch (err) {
      alert('Terjadi kesalahan, silakan coba lagi.')
    }
  }

  if (loading) return <main className="page page-center"><p>Loading...</p></main>
  if (!user) return <main className="page page-center"><h2>User Not Found</h2></main>

  return (
    <main className="page page-center overlay-page">
      <section className="login-card" style={{ maxWidth: '540px' }}>
        <div className="section-label">
          <span className="pulse-dot" />
          <span className="label-text">DUKUNGAN</span>
        </div>
        <h2>Dukung {user?.name || username}</h2>
        <p className="lead">Pilih nominal dan tulis pesanmu.</p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Nama Pengirim
            <input
              type="text"
              placeholder="Masukkan nama kamu"
              value={isAnonymous ? 'Seseorang' : form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              disabled={isAnonymous}
              required
            />
            {/* Checkbox Anonim - Disebelah kiri */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              <input
                type="checkbox"
                id="anon"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }}
              />
              <label htmlFor="anon" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 500, margin: 0 }}>
                Kirim sebagai anonim
              </label>
            </div>
          </label>

          <label>
            Nominal Dukungan (IDR)
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', fontWeight: '600' }}>Rp</span>
              <input
                type="text"
                value={formatIDR(form.amount)}
                onChange={handleAmountChange}
                style={{ paddingLeft: '45px', borderColor: !isMinDonationMet ? '#dc2626' : undefined }}
                required
              />
            </div>
            {!isMinDonationMet && (
              <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                Minimal dukungan adalah Rp{formatIDR(user.min_donation.toString())}
              </p>
            )}
            {/* Grid 5 Nominal Saja */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '12px' }}>
              {quickAmounts.map(amt => {
                let label = ''
                if (amt >= 1000000) {
                  const juta = amt / 1000000
                  label = Number.isInteger(juta) ? `${juta}jt` : `${juta.toFixed(1).replace('.', ',')}jt`
                } else {
                  label = `${amt / 1000}rb`
                }
                return (
                  <button
                    key={amt}
                    type="button"
                    className={`btn ${parseInt(form.amount) === amt ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{ padding: '8px 0', borderRadius: '12px', fontSize: '13px' }}
                    onClick={() => setForm({ ...form, amount: amt.toString() })}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </label>

          <label>
            Pesan (Maks. 250 karakter)
            <input
              type="text"
              placeholder="Tulis pesan penyemangat..."
              value={form.note}
              onChange={e => setForm({...form, note: e.target.value.slice(0, 250)})}
              required
            />
            <span style={{ fontSize: '11px', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: 400, marginTop: '4px' }}>
              {form.note.length}/250
            </span>
          </label>

          {/* Checkbox Ketentuan - Disebelah kiri */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: 'var(--muted)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid var(--border)'
          }}>
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
              required
            />
            <label htmlFor="terms" style={{ fontSize: '12px', lineHeight: '1.5', cursor: 'pointer', color: 'var(--foreground)', fontWeight: 500, margin: 0 }}>
              Saya menyatakan transaksi ini adalah dukungan sukarela, bukan komersial, dan tidak dapat dikembalikan.
            </label>
          </div>

          <button
            className="btn btn-primary"
            style={{
              height: '56px',
              fontSize: '16px',
              fontWeight: '700',
              marginTop: '12px',
              opacity: (agreed && isMinDonationMet) ? 1 : 0.5,
              cursor: (agreed && isMinDonationMet) ? 'pointer' : 'not-allowed',
              filter: (agreed && isMinDonationMet) ? 'none' : 'grayscale(0.5)',
              transition: 'all 0.2s ease'
            }}
            type="submit"
            disabled={!agreed || !isMinDonationMet}
          >
            Lanjut Pembayaran
          </button>
        </form>
      </section>
    </main>
  )
}

export default Donate
