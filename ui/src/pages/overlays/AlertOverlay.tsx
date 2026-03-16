import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import '../../App.css'

function AlertOverlay() {
  const { uuid } = useParams()
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState({
    amount: 10000,
    sender: 'Donatur',
    message: 'Semangat terus bang!'
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
      setTimeout(() => setVisible(false), 8000)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  const formattedAmount = new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(data.amount)

  return (
    <main className="overlay-container">
      <div className="alert-wrapper animate-subtle-pop">
        <img src="/thanks.gif" alt="thanks" className="alert-gif" />
        
        <div className="alert-content-simple">
          <div className="alert-line-1">
            <span className="highlight-text">{formattedAmount}</span>
            <span className="normal-text"> dari </span>
            <span className="highlight-text">{data.sender}</span>
          </div>
          <div className="alert-line-2">
            {data.message}
          </div>
        </div>
      </div>

      <style>{`
        .overlay-container {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .alert-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .alert-gif {
          width: 180px;
          height: auto;
          margin-bottom: 8px;
        }
        .alert-content-simple {
          padding: 10px;
        }
        .alert-line-1 {
          font-family: var(--display); /* Calistoga from index.css */
          font-size: 2.5rem;
          color: #ffffff;
          margin-bottom: 2px;
          letter-spacing: -0.01em;
          -webkit-text-stroke: 1.5px #000000;
        }
        .highlight-text {
          color: #863bff;
          font-weight: 700;
        }
        .normal-text {
          font-weight: 400;
          color: #ffffff;
        }
        .alert-line-2 {
          font-family: var(--sans); /* Inter from index.css */
          font-size: 1.4rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.02em;
          text-transform: none;
          -webkit-text-stroke: 1px #000000;
        }

        /* Subtle Shake/Pop Animation */
        .animate-subtle-pop {
          animation: subtlePop 0.6s cubic-bezier(0.17, 0.67, 0.83, 0.67) both,
                     subtleShake 4s ease-in-out 0.6s infinite;
        }

        @keyframes subtlePop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes subtleShake {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        /* Removed shadow for clean border line only */
      `}</style>
    </main>
  )
}

export default AlertOverlay
