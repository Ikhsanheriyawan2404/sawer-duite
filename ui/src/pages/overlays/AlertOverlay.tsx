import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { WS_URL } from '../../lib/api'
import '../../App.css'

function AlertOverlay() {
  const { uuid } = useParams()
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState({
    amount: 0,
    sender: '',
    message: ''
  })
  
  const idVoiceRef = useRef<SpeechSynthesisVoice | null>(null)

  const loadVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices()
    const idVoice = voices.find(v => v.lang === 'id-ID' || v.lang === 'id_ID')
    if (idVoice) idVoiceRef.current = idVoice
  }, [])

  useEffect(() => {
    loadVoice()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoice
    }
  }, [loadVoice])

  const speakMessage = (amount: number, sender: string, message: string) => {
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    const formattedAmount = new Intl.NumberFormat('id-ID').format(amount)
    const textToSpeak = `${formattedAmount} rupiah dari ${sender || 'Anonim'}. ${message || ''}`
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    if (idVoiceRef.current) {
      utterance.voice = idVoiceRef.current
    }
    
    utterance.lang = 'id-ID'
    utterance.rate = 1.0
    utterance.pitch = 1.0

    window.speechSynthesis.speak(utterance)
  }

  const connectWS = useCallback(() => {
    if (!uuid) return

    const wsUrl = `${WS_URL}/ws/${uuid}`
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => console.log('✅ Connected')
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        setData({
          amount: payload.amount,
          sender: payload.sender,
          message: payload.message
        })
        
        setVisible(true)
        speakMessage(payload.amount, payload.sender, payload.message)
        setTimeout(() => setVisible(false), 12000)
      } catch (err) {
        console.error('❌ WS Error', err)
      }
    }

    socket.onclose = () => setTimeout(() => connectWS(), 5000)
    return socket
  }, [uuid])

  useEffect(() => {
    const socket = connectWS()
    return () => {
      if (socket) socket.close()
      window.speechSynthesis.cancel()
    }
  }, [connectWS])

  if (!visible) return null

  const formattedAmount = new Intl.NumberFormat('id-ID', { 
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0 
  }).format(data.amount)

  return (
    <main className="overlay-container">
      <div className="alert-wrapper animate-subtle-pop">
        <img src="/thanks.gif" alt="thanks" className="alert-gif" />
        <div className="alert-content-simple">
          <div className="alert-line-1">
            <span className="highlight-text">{formattedAmount}</span>
            <span className="normal-text"> dari </span>
            <span className="highlight-text">{data.sender || 'Anonim'}</span>
          </div>
          <div className="alert-line-2">{data.message}</div>
        </div>
      </div>

      <style>{`
        .overlay-container {
          width: 100vw; height: 100vh; background: transparent;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .alert-wrapper { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .alert-gif { width: 180px; height: auto; margin-bottom: 8px; }
        .alert-content-simple { padding: 10px; }
        .alert-line-1 {
          font-family: var(--display); font-size: 2.5rem; color: #ffffff;
          margin-bottom: 2px; letter-spacing: -0.01em; -webkit-text-stroke: 1.5px #000000;
        }
        .highlight-text { color: #863bff; font-weight: 700; }
        .normal-text { font-weight: 400; color: #ffffff; }
        .alert-line-2 {
          font-family: var(--sans); font-size: 1.4rem; font-weight: 700; color: #ffffff;
          letter-spacing: 0.02em; text-transform: none; -webkit-text-stroke: 1px #000000;
        }
        .animate-subtle-pop {
          animation: subtlePop 0.6s cubic-bezier(0.17, 0.67, 0.83, 0.67) both,
                     subtleShake 4s ease-in-out 0.6s infinite;
        }
        @keyframes subtlePop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes subtleShake { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      `}</style>
    </main>
  )
}

export default AlertOverlay
