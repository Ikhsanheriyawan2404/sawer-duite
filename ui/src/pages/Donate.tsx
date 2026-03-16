import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../lib/api'

function Donate() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({ name: '', amount: '10000', note: '' })
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const quickAmounts = [10000, 25000, 50000, 100000, 250000, 500000, 1000000]

  useEffect(() => {
    fetch(`${API_URL}/user/${username}`)
      .then(res => res.json())
      .then(data => setUser(data))
  }, [username])

  const formatIDR = (val: string) => {
    const num = val.replace(/\D/g, '')
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    setForm({ ...form, amount: val })
  }
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (!agreed) {
    alert('Harap setujui ketentuan transaksi.')
    return
  }

  try {
    const response = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        sender: isAnonymous ? 'Someone' : form.name,
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

return (
  <main className="page page-center overlay-page">
    <section className="login-card" style={{ width: 'min(540px, 100%)' }}>
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
              value={isAnonymous ? 'Someone' : form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              disabled={isAnonymous}
              required
            />
            <div className="checkbox" style={{ marginTop: '4px' }}>
              <input
                type="checkbox"
                id="anon"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
              />
              <label htmlFor="anon" style={{ display: 'inline', fontSize: '13px', cursor: 'pointer' }}>Kirim sebagai anonim</label>
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
                style={{ paddingLeft: '45px' }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {quickAmounts.map(amt => (
                <button
                  key={amt}
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '10px' }}
                  onClick={() => setForm({ ...form, amount: amt.toString() })}
                >
                  {amt >= 1000000 ? `${amt/1000000}jt` : `${amt/1000}rb`}
                </button>
              ))}
            </div>
          </label>

          <label>
            Pesan (Maks. 250 karakter)
            <textarea
              placeholder="Tulis pesan penyemangat..."
              value={form.note}
              onChange={e => setForm({...form, note: e.target.value.slice(0, 250)})}
              style={{ minHeight: '48px', height: '48px' }}
            />
            <span style={{ fontSize: '11px', textAlign: 'right', color: 'var(--muted-foreground)' }}>
              {form.note.length}/250
            </span>
          </label>

          <div className="checkbox" style={{ alignItems: 'flex-start', gap: '10px', background: 'var(--muted)', padding: '12px', borderRadius: '14px' }}>
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: '4px' }}
              required
            />
            <label htmlFor="terms" style={{ display: 'inline', fontSize: '12px', lineHeight: '1.4', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
              Dengan ini saya menyatakan transaksi ini: murni dukungan saya untuk {user?.name || 'Kreator'}, tidak dapat dikembalikan, bukan untuk transaksi komersial, bukan untuk aktivitas ilegal apa pun.
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '8px' }}>
            <button
              className="btn btn-primary"
              style={{ justifyContent: 'center', height: '52px', fontSize: '16px' }}
              type="submit"
              disabled={!agreed}
            >
              Lanjut Pembayaran
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default Donate
