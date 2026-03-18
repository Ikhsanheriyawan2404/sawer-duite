import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Donate from './pages/Donate'
import Payment from './pages/Payment'
import AlertOverlay from './pages/overlays/AlertOverlay'
import QueueOverlay from './pages/overlays/QueueOverlay'
import MediaOverlay from './pages/overlays/MediaOverlay'
import { ProtectedRoute } from './components/ProtectedRoute'
import { clearTokens } from './lib/api'
import './App.css'

function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isHome = pathname === '/home'

  function handleAuthAction() {
    if (isHome) {
      clearTokens()
      navigate('/login')
    } else {
      navigate('/login')
    }
  }

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <div className="brand-mark"></div>
        <span className="brand-name">Sawer Om</span>
      </Link>
      <button onClick={handleAuthAction} className="btn btn-secondary">
        {isHome ? 'Keluar' : 'Masuk'}
      </button>
    </header>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const { pathname } = useLocation()
  const isOverlay = pathname === '/test' || pathname.startsWith('/overlays')

  return (
    <div className={`app ${isOverlay ? 'app-overlay' : ''}`}>
      {!isOverlay && <Header />}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="/overlays/alert/:uuid" element={<AlertOverlay />} />
        <Route path="/overlays/queue/:uuid" element={<QueueOverlay />} />
        <Route path="/overlays/media/:uuid" element={<MediaOverlay />} />
        <Route path="/:username" element={<Profile />} />
        <Route path="/:username/donate" element={<Donate />} />
        <Route path="/payment/:uuid" element={<Payment />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
