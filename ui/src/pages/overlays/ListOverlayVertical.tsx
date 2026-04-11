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

function ListOverlayVertical() {
  useDocumentTitle('List Overlay Vertical')
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
    <main className="list-overlay-vertical">
      <div className="list-dialog">
        <h2 className="list-title">{config.title || 'Daftar Donatur'}</h2>
        
        <div className="list-content">
          {transactions.length === 0 ? (
            <div className="list-empty">Belum ada donatur</div>
          ) : (
            transactions.map((tx, index) => (
              <div key={`${tx.sender}-${index}`} className="list-row">
                <span className="list-rank">{index + 1}</span>
                <span className="list-name">{tx.sender}</span>
                <span className="list-amount">{formatAmount(tx.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .list-overlay-vertical {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 20px;
          font-family: var(--font-main);
        }

        .list-dialog {
          width: min(1200px, 98%);
          margin-top: 10px;
          background: #ffffff;
          border-radius: 28px;
          padding: 24px 28px;
          border: 6px solid #0052ff;
          animation: dialogFadeIn 0.5s ease-out both;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .list-title {
          font-size: 32px;
          font-weight: 900;
          color: #0052ff;
          letter-spacing: -0.04em;
          text-transform: uppercase;
          margin: 0 0 20px 0;
          text-align: center;
          border-bottom: 3px solid #f1f5f9;
          padding-bottom: 12px;
        }

        .list-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .list-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 16px;
          animation: rowSlideIn 0.4s ease-out both;
        }

        .list-rank {
          width: 32px;
          height: 32px;
          background: #0052ff;
          color: #fff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 14px;
        }

        .list-name {
          flex: 1;
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .list-amount {
          font-size: 20px;
          font-weight: 900;
          color: #0052ff;
        }

        .list-empty {
          text-align: center;
          padding: 30px;
          color: #94a3b8;
          font-weight: 700;
          font-size: 18px;
        }

        @keyframes dialogFadeIn {
          from {
            transform: scale(0.95) translateY(20px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes rowSlideIn {
          from {
            transform: translateX(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  )
}

export default ListOverlayVertical
