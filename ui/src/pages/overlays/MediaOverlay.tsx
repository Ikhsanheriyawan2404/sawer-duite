import { useState } from 'react'
import { useParams } from 'react-router-dom'

function MediaOverlay() {
  const { uuid } = useParams()
  const [videoUrl] = useState('https://www.youtube.com/embed/dQw4w9WgXcQ') // Mock URL

  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
  const isTikTok = videoUrl.includes('tiktok.com')

  return (
    <main className="media-container">
      <div className="media-player-wrapper">
        <div className="player-header">
          <div className="live-badge">MEDIA SHARE</div>
        </div>
        
        <div className="player-frame">
          {isYouTube && (
            <iframe
              width="100%"
              height="100%"
              src={videoUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {isTikTok && (
            <p style={{ color: '#fff', textAlign: 'center' }}>TikTok embedding requires SDK</p>
          )}
          {!isYouTube && !isTikTok && (
            <div className="placeholder">
              <p>Waiting for media...</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .media-container {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
        }
        .media-player-wrapper {
          width: 640px;
          background: #000;
          border-radius: 20px;
          overflow: hidden;
          border: 4px solid #863bff;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .player-header {
          padding: 12px 20px;
          background: #111;
          display: flex;
          align-items: center;
        }
        .live-badge {
          background: #863bff;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 1px;
        }
        .player-frame {
          aspect-ratio: 16/9;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .placeholder {
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
      `}</style>
    </main>
  )
}

export default MediaOverlay
