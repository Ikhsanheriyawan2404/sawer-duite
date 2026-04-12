import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

interface Transaction {
  sender: string
  amount: number
}

interface ListConfig {
  title?: string
}

function ListOverlayHorizontal() {
  useDocumentTitle('List Overlay Horizontal')
  const { uuid } = useParams()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [config, setConfig] = useState<ListConfig>({ title: 'Daftar Donatur' })
  const socketRef = useRef<WebSocket | null>(null)

  const fetchData = useCallback(async () => {
    if (!uuid) return
    try {
      const res = await fetch(`${API_URL}/user/uuid/${uuid}/overlay-list`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data || [])
      }

      const userRes = await fetch(`${API_URL}/user/uuid/${uuid}`)
      if (userRes.ok) {
        const user = await userRes.json()
        setConfig(user.list_config || { title: 'Daftar Donatur' })
      }
    } catch {
      // ignore
    }
  }, [uuid])

  const connectWS = useCallback(() => {
    if (!uuid) return
    const wsUrl = `${WS_URL}/ws/${uuid}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'ALERT' || payload.type === 'REFRESH') {
          fetchData()
        }
      } catch {
        // ignore
      }
    }

    socket.onclose = () => setTimeout(() => connectWS(), 5000)
  }, [uuid, fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (uuid) {
      connectWS()
      return () => socketRef.current?.close()
    }
  }, [uuid, connectWS])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount).replace(/\s/g, '')
  }

  return (
    <main className="list-overlay-horizontal">
      <div className="list-container">
        <div className="list-header">
          <h2 className="list-title">{config.title || 'Daftar Donatur'}</h2>
        </div>

        <div className="list-content">
          {transactions.length === 0 ? (
            <div className="list-empty">Belum ada donatur</div>
          ) : (
            <div className="marquee-track">
              {/* Render dua kali untuk looping yang mulus */}
              {[...transactions, ...transactions].map((tx, index) => (
                <div key={`${tx.sender}-${index}`} className="list-item">
                  <span className="item-name">{tx.sender}</span>
                  <span className="item-amount">{formatAmount(tx.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .list-overlay-horizontal {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 10px;
          font-family: var(--font-main);
          overflow: hidden;
        }

        .list-container {
          display: flex;
          align-items: center;
          background: #ffffff;
          border-radius: 20px;
          padding: 8px 24px;
          border: 4px solid #0052ff;
          animation: slideIn 0.5s ease-out both;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
          max-width: 98vw;
          overflow: hidden; /* Penting untuk marquee */
        }

        .list-header {
          padding-right: 20px;
          margin-right: 20px;
          border-right: 3px solid #f1f5f9;
          white-space: nowrap;
          z-index: 2;
          background: #fff;
        }

        .list-title {
          font-size: 20px;
          font-weight: 900;
          color: #0052ff;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          margin: 0;
        }

        .list-content {
          flex: 1;
          display: flex;
          align-items: center;
          overflow: hidden;
        }

        .marquee-track {
          display: flex;
          align-items: center;
          gap: 40px; /* Jarak antar donatur */
          white-space: nowrap;
          animation: marqueeMove 30s linear infinite; /* Kecepatan jalan */
        }

        .marquee-track:hover {
          animation-play-state: paused; /* Opsional: berhenti saat kursor di atasnya */
        }

        .list-item {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .item-name {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }

        .item-amount {
          font-size: 18px;
          font-weight: 900;
          color: #0052ff;
          background: rgba(0, 82, 255, 0.08);
          padding: 2px 10px;
          border-radius: 8px;
        }

        .list-empty {
          color: #94a3b8;
          font-weight: 700;
          font-size: 16px;
          padding: 4px 20px;
        }

        @keyframes marqueeMove {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); } /* Bergeser setengahnya untuk loop sempurna */
        }

        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </main>
  )
}

export default ListOverlayHorizontal
