import { useEffect, useState, useCallback } from 'react'
import { fetchWithAuth } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { buildMenuItems } from '../lib/menu'
import { MenuFab } from '../components/MenuFab'

interface AnalyticsData {
  summary: {
    total_nominal: number
    total_count: number
    average_value: number
    total_supporters: number
  }
  transactions: any[]
  pagination: {
    current_page: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

function Analytics() {
  useDocumentTitle('Analytics & Performa')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        search: search,
        page: page.toString(),
        limit: '10'
      })
      const res = await fetchWithAuth(`/me/analytics?${params.toString()}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, search, page])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val)
  }

  return (
    <main className="page">
      <section className="dashboard-header">
        <div>
          <h2>Analytics & Performa</h2>
          <p className="lead">Pantau pertumbuhan dan statistik dukungan Anda.</p>
        </div>
      </section>

      <MenuFab items={buildMenuItems()} />

      <section className="dashboard-grid">
        {/* Filters */}
        <article className="card card-wide" style={{ minWidth: 0 }}>
          <div className="card-header">
            <h3>Filter Data</h3>
          </div>
          <div className="stack-resp" style={{ gap: '16px' }}>
            <div className="form-group flex-1">
              <label>Mulai Tanggal</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="form-group flex-1">
              <label>Sampai Tanggal</label>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Cari (Sender, Nominal, Note)</label>
              <input
                type="text"
                className="input"
                placeholder="Ketik untuk mencari..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </article>

        {/* Summary Cards */}
        <div className="analytics-summary-grid">
          <article className="card analytics-card" style={{ minWidth: 0 }}>
            <p className="muted">Total Nominal</p>
            <h3>{data ? formatCurrency(data.summary.total_nominal) : '...'}</h3>
          </article>
          <article className="card analytics-card" style={{ minWidth: 0 }}>
            <p className="muted">Total Transaksi</p>
            <h3>{data ? data.summary.total_count : '...'}</h3>
          </article>
          <article className="card analytics-card" style={{ minWidth: 0 }}>
            <p className="muted">Rata-rata (AVG)</p>
            <h3>{data ? formatCurrency(data.summary.average_value) : '...'}</h3>
          </article>
          <article className="card analytics-card" style={{ minWidth: 0 }}>
            <p className="muted">Pendukung</p>
            <h3>{data ? data.summary.total_supporters : '100'}</h3>
          </article>
        </div>

        {/* Transactions Table */}
        <article className="card card-wide" style={{ minWidth: 0 }}>
          <div className="card-header">
            <h3>Daftar Transaksi</h3>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pengirim</th>
                  <th>Nominal</th>
                  <th>Pesan</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center">Memuat data...</td></tr>
                ) : data?.transactions.length === 0 ? (
                  <tr><td colSpan={4} className="text-center">Tidak ada transaksi ditemukan</td></tr>
                ) : data?.transactions.map(tx => (
                  <tr key={tx.uuid}>
                    <td className="mono" style={{ fontSize: '12px' }}>
                      {new Date(tx.created_at).toLocaleString('id-ID')}
                    </td>
                    <td style={{ fontWeight: 600 }}>{tx.sender}</td>
                    <td className="accent" style={{ fontWeight: 700 }}>{formatCurrency(tx.base_amount)}</td>
                    <td style={{ fontSize: '13px' }}>{tx.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', gap: '16px' }}>
            <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
              Halaman {data?.pagination.current_page || 1} dari {data?.pagination.total_pages || 1}
            </p>
            <div className="form-actions" style={{ marginTop: 0 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={!data?.pagination.has_prev || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Sebelumnya
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={!data?.pagination.has_next || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </article>
      </section>

      <style>{`
        .analytics-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          grid-column: 1 / -1;
        }
        @media (min-width: 768px) {
          .analytics-summary-grid {
            gap: 20px;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
        }
        .analytics-card {
          padding: 20px 16px;
          text-align: center;
        }
        @media (min-width: 768px) {
          .analytics-card { padding: 24px; }
        }
        .analytics-card h3 {
          margin: 8px 0 0 0;
          font-size: 1.25rem;
          color: var(--accent);
        }
        @media (min-width: 768px) {
          .analytics-card h3 { font-size: 1.5rem; }
        }
        .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin-top: 12px;
          border-radius: 12px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          min-width: 600px; /* Force scroll on small screens */
        }
        .table th {
          padding: 12px 16px;
          border-bottom: 2px solid var(--border);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted-foreground);
          white-space: nowrap;
        }
        .table td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
          font-size: 14px;
        }
        .table td:last-child {
          white-space: normal;
          min-width: 200px;
        }
        .accent { color: var(--accent); }

        /* Fix grid item overflow */
        .card-wide {
          min-width: 0;
          overflow: hidden;
        }
      `}</style>
    </main>
  )
}

export default Analytics
