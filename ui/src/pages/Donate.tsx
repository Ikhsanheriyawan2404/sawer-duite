import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function Donate() {
  const { username } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Ambil data dari URL jika ada
  const initialAmount = searchParams.get('amount') || '10000'
  const initialNote = searchParams.get('note') || ''
  const isFixed = searchParams.get('fixed') === 'true'

  const [form, setForm] = useState({
    name: '',
    amount: initialAmount,
    note: initialNote,
    customInput: ''
  })
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
    if (isFixed) return
    const val = e.target.value.replace(/\D/g, '')
    setForm({ ...form, amount: val })
  }

  const isMinDonationMet = !user?.min_donation || parseInt(form.amount) >= user.min_donation
  const isCustomInputMet = !user?.custom_input_required || !user?.custom_input_label || form.customInput.trim() !== ''
  const hasQRIS = user?.has_qris !== false

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed || !isMinDonationMet || !isCustomInputMet || !hasQRIS) return
    setSubmitError(null)

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          sender: isAnonymous ? 'Seseorang' : form.name,
          amount: parseInt(form.amount),
          note: form.note,
          custom_input: form.customInput,
        }),
      })

      if (!response.ok) {
        if (response.status === 400) {
          const data = await response.json().catch(() => ({}))
          if (data?.message) {
            setSubmitError(data.message)
            return
          }
        }
        throw new Error('Gagal membuat transaksi')
      }

      const data = await response.json()
      navigate(`/payment/${data.uuid}`)
    } catch (err) {
      setSubmitError('Terjadi kesalahan, silakan coba lagi.')
    }
  }

  if (loading) return <main className="page page-center"><p>Loading...</p></main>
  if (!user) return <main className="page page-center"><h2>User Not Found</h2></main>

  return (
    <main className="page page-center overlay-page">
      <section className="login-card" style={{ maxWidth: '540px' }}>
        <p className="section-intro-label">KIRIM DUKUNGAN</p>
        <h2>Dukung {user?.name || username}</h2>
        {!hasQRIS && (
          <div style={{
            background: '#fff7ed',
            color: '#9a3412',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #fed7aa',
            marginTop: '10px',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            Streamer ini belum menyiapkan QRIS, jadi donasi belum bisa dilakukan.
          </div>
        )}

        {isFixed ? (
          <div style={{
            background: 'var(--accent)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>✨ Memilih Paket:</span>
            <span style={{ opacity: 0.9 }}>{initialNote}</span>
          </div>
        ) : (
          <p className="lead">Pilih nominal dan tulis pesanmu.</p>
        )}

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

          {/* Custom Input Field (e.g. Roblox Username) */}
          {user?.custom_input_label && (
            <div className="form-group">
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                {user.custom_input_label} {user.custom_input_required && <span style={{ color: '#dc2626' }}>*</span>}
              </div>
              <input
                type="text"
                placeholder={`Masukkan ${user.custom_input_label}`}
                value={form.customInput}
                onChange={e => setForm({...form, customInput: e.target.value})}
                required={user.custom_input_required}
                style={{
                  borderColor: (user.custom_input_required && !form.customInput.trim()) ? '#dc2626' : undefined
                }}
              />
              {user.custom_input_required && !form.customInput.trim() && (
                <p style={{ color: '#dc2626', fontSize: '11px', fontWeight: 600, margin: 0 }}>
                  Wajib diisi
                </p>
              )}
            </div>
          )}

          <label>
            Nominal Dukungan (IDR)
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', fontWeight: '600' }}>Rp</span>
              <input
                type="text"
                value={formatIDR(form.amount)}
                onChange={handleAmountChange}
                disabled={isFixed}
                style={{
                  paddingLeft: '45px',
                  borderColor: !isMinDonationMet ? '#dc2626' : undefined,
                  background: isFixed ? 'var(--muted)' : undefined,
                  cursor: isFixed ? 'not-allowed' : undefined
                }}
                required
              />
            </div>
            {!isMinDonationMet && (
              <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                Minimal dukungan adalah Rp{formatIDR(user.min_donation.toString())}
              </p>
            )}

            {!isFixed && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '12px' }}>
                {quickAmounts.map((amt: number) => {
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
            )}
          </label>

          <label>
            Pesan (Maks. 250 karakter)
            <input
              type="text"
              placeholder="Tulis pesanmu..."
              value={form.note}
              onChange={e => setForm({...form, note: e.target.value.slice(0, 250)})}
              required
            />
            <span style={{ fontSize: '11px', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: 400, marginTop: '4px' }}>
              {form.note.length}/250
            </span>
          </label>

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

          {submitError && (
            <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '12px' }}>
              {submitError}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{
              height: '56px',
              fontSize: '16px',
              fontWeight: '700',
              marginTop: '12px',
              opacity: (agreed && isMinDonationMet && isCustomInputMet && hasQRIS) ? 1 : 0.5,
              cursor: (agreed && isMinDonationMet && isCustomInputMet && hasQRIS) ? 'pointer' : 'not-allowed',
              filter: (agreed && isMinDonationMet && isCustomInputMet && hasQRIS) ? 'none' : 'grayscale(0.5)',
              transition: 'all 0.2s ease'
            }}
            type="submit"
            disabled={!agreed || !isMinDonationMet || !isCustomInputMet || !hasQRIS}
          >
            Lanjut Pembayaran
          </button>
        </form>
      </section>
    </main>
  )
}

export default Donate
