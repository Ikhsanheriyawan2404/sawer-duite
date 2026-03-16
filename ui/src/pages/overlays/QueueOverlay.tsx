import { useState } from 'react'
import { useParams } from 'react-router-dom'

function QueueOverlay() {
  const { uuid } = useParams()
  const [donors] = useState([
    { id: 1, name: 'Budi Santoso', amount: 50000 },
    { id: 2, name: 'Siska AM', amount: 25000 },
    { id: 3, name: 'Rian Gaming', amount: 100000 },
    { id: 4, name: 'Anonim', amount: 10000 },
    { id: 5, name: 'Junaidi', amount: 5000 }
  ])

  return (
    <main className="queue-container">
      <div className="queue-list">
        <h2 className="queue-header">Latest Donors</h2>
        {donors.map((donor, index) => (
          <div key={donor.id} className="queue-item" style={{ animationDelay: `${index * 0.1}s` }}>
            <span className="donor-name">{donor.name}</span>
            <span className="donor-amount">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(donor.amount)}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .queue-container {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: flex-end;
          padding: 40px;
          font-family: 'Inter', sans-serif;
        }
        .queue-list {
          background: rgba(13, 13, 13, 0.85);
          backdrop-filter: blur(8px);
          border-left: 6px solid #863bff;
          padding: 24px;
          border-radius: 0 20px 20px 0;
          min-width: 320px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .queue-header {
          color: #863bff;
          text-transform: uppercase;
          font-size: 1.1rem;
          letter-spacing: 2px;
          margin: 0 0 20px 0;
          font-weight: 800;
          border-bottom: 2px solid rgba(134, 59, 255, 0.2);
          padding-bottom: 12px;
        }
        .queue-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          animation: slideRight 0.5s ease-out both;
        }
        .queue-item:last-child {
          border-bottom: none;
        }
        .donor-name {
          color: #eee;
          font-weight: 600;
          font-size: 1.1rem;
        }
        .donor-amount {
          color: #863bff;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        @keyframes slideRight {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </main>
  )
}

export default QueueOverlay
