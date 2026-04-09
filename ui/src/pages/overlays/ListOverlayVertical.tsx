import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

interface Transaction {
  uuid: string
  sender: string
  base_amount: number
  created_at: string
}

interface ListConfig {
  title?: string
  starts_at?: string | null
  ends_at?: string | null
}

function ListOverlayVertical() {
  useDocumentTitle('List Overlay Vertical')
  const { uuid } = useParams()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [username, setUsername] = useState<string | null>(null)
  const [config, setConfig] = useState<ListConfig>({ title: 'Daftar Donatur' })
  const socketRef = useRef<WebSocket | null>(null)

  const fetchTransactions = useCallback(async (targetUsername: string) => {
    try {
      const res = await fetch(`${API_URL}/user/${targetUsername}/queue?status=PAID&sort_by=created_at&order=desc`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data || [])
      }
    } catch {
      // ignore
    }
  }, [])

  const connectWS = useCallback(() => {
    if (!uuid || !username) return
    const wsUrl = `${WS_URL}/ws/${uuid}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'alert' || payload.type === 'refresh') {
          fetchTransactions(username)
        }
      } catch {
        // ignore
      }
    }

    socket.onclose = () => setTimeout(() => connectWS(), 5000)
  }, [uuid, username, fetchTransactions])

  useEffect(() => {
    if (!uuid) return
    fetch(`${API_URL}/user/uuid/${uuid}`)
      .then(res => res.json())
      .then(user => {
        setUsername(user.username)
        setConfig(user.list_config || { title: 'Daftar Donatur' })
        fetchTransactions(user.username)
      })
      .catch(() => {})
  }, [uuid, fetchTransactions])

  useEffect(() => {
    if (username) {
      connectWS()
      return () => socketRef.current?.close()
    }
  }, [username, connectWS])

  const filteredTransactions = useMemo(() => {
    const start = config.starts_at ? new Date(config.starts_at) : null
    const end = config.ends_at ? new Date(config.ends_at) : null

    return transactions.filter(tx => {
      const created = new Date(tx.created_at)
      if (start && created < start) return false
      if (end && created > end) return false
      return true
    })
  }, [transactions, config.starts_at, config.ends_at])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <main className="list-overlay-vertical">
      <div className="list-dialog">
        <div className="list-header">
          <h2 className="list-title">{config.title || 'Daftar Donatur'}</h2>
        </div>
        <div className="list-body">
          {filteredTransactions.length === 0 ? (
            <div className="list-empty">Belum ada donatur</div>
          ) : (
            filteredTransactions.slice(0, 20).map((tx, index) => (
              <div key={tx.uuid} className="list-row">
                <span className="list-rank">{index + 1}</span>
                <span className="list-name">{tx.sender}</span>
                <span className="list-amount">{formatAmount(tx.base_amount)}</span>
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
          padding: 20px 28px 24px;
          border: 5px solid #0052ff;
          animation: dialogFadeIn 0.5s ease-out both;
        }

        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .list-title {
          font-size: 32px;
          font-weight: 900;
          color: #0052ff;
          letter-spacing: -0.04em;
          text-transform: uppercase;
          margin: 0;
        }

        .list-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .list-empty {
          text-align: center;
          color: #94a3b8;
          font-weight: 600;
          padding: 24px 0;
        }

        .list-row {
          display: grid;
          grid-template-columns: 52px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          background: #f1f5f9;
          border-radius: 16px;
        }

        .list-rank {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #0052ff;
          color: #ffffff;
          font-weight: 900;
        }

        .list-name {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .list-amount {
          font-size: 22px;
          font-weight: 900;
          color: #0052ff;
          white-space: nowrap;
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
      `}</style>
    </main>
  )
}

export default ListOverlayVertical
