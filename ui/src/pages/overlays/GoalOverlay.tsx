import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

interface GoalData {
  title: string
  target_amount: number
  current_amount: number
}

function GoalOverlay() {
  useDocumentTitle('Goal Overlay')
  const { uuid } = useParams()
  const [goal, setGoal] = useState<GoalData | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const fetchGoal = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/user/uuid/${uuid}`)
      if (res.ok) {
        const data = await res.json()
        if (data.active_goal) {
          setGoal(data.active_goal)
        }
      }
    } catch (err) {
      console.error('Failed to fetch goal', err)
    }
  }, [uuid])

  useEffect(() => {
    fetchGoal()
  }, [fetchGoal])

  // WebSocket for real-time updates
  const connectWS = useCallback(() => {
    if (!uuid) return
    const socket = new WebSocket(`${WS_URL}/ws/${uuid}`)
    socketRef.current = socket

    socket.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data)
        // If there's a new transaction, refresh goal progress
        if (payload.type === 'alert') {
          fetchGoal()
        }
      } catch (err) {
        console.error('[WS] Message Error:', err)
      }
    }

    socket.onclose = () => setTimeout(connectWS, 5000)
  }, [uuid, fetchGoal])

  useEffect(() => {
    connectWS()
    return () => socketRef.current?.close()
  }, [connectWS])

  if (!goal) return <main className="overlay-container" />

  const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount).replace(/\s/g, '')
  }

  return (
    <main className="goal-overlay">
      <div className="goal-dialog">
        <div className="goal-heading">
          <span className="goal-percent">{progress.toFixed(0)}%</span>
        </div>
        <h2 className="goal-title">{goal.title}</h2>

        <div className="goal-progress">
          <div className="goal-bar">
            <div className="goal-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="goal-amounts">
            <span>{formatCurrency(goal.current_amount)}</span>
            <span className="muted">Target {formatCurrency(goal.target_amount)}</span>
          </div>
        </div>
      </div>

      <style>{`
        .goal-overlay {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 20px;
          font-family: var(--font-main);
        }

        .goal-dialog {
          width: min(1200px, 98%);
          margin-top: 10px;
          background: #ffffff;
          border-radius: 28px;
          padding: 24px 32px;
          border: 5px solid #0052ff;
          animation: dialogFadeIn 0.5s ease-out both;
        }

        .goal-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .goal-tag {
          font-size: 14px;
          font-weight: 900;
          color: #0052ff;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .goal-percent {
          font-size: 30px;
          font-weight: 900;
          color: #0052ff;
        }

        .goal-title {
          font-size: 34px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: -0.04em;
          margin: 0 0 20px 0;
        }

        .goal-progress {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .goal-bar {
          height: 18px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }

        .goal-bar-fill {
          height: 100%;
          background: #0052ff;
          transition: width 0.6s ease;
        }

        .goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 22px;
          font-weight: 900;
          color: #0052ff;
        }

        .goal-amounts .muted {
          color: #64748b;
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
      `}</style>
    </main>
  )
}

export default GoalOverlay
