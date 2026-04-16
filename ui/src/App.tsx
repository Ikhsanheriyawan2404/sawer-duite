import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Analytics from './pages/Analytics'
import PaymentSettings from './pages/PaymentSettings'
import Settings from './pages/Settings'
import OverlayAlertSettings from './pages/OverlayAlertSettings'
import OverlayQueueSettings from './pages/OverlayQueueSettings'
import DonationPackagesSettings from './pages/DonationPackagesSettings'
import SupportButtonSettings from './pages/SupportButtonSettings'
import OverlayGoalSettings from './pages/OverlayGoalSettings'
import OverlayListSettings from './pages/OverlayListSettings'
import OverlayMediaSettings from './pages/OverlayMediaSettings'
import OverlayQRSettings from './pages/OverlayQRSettings'
import Profile from './pages/Profile'
import Donate from './pages/Donate'
import Payment from './pages/Payment'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import AlertOverlay from './pages/overlays/AlertOverlay'
import QueueOverlay from './pages/overlays/QueueOverlay'
import GoalOverlay from './pages/overlays/GoalOverlay'
import ListOverlayVertical from './pages/overlays/ListOverlayVertical'
import ListOverlayHorizontal from './pages/overlays/ListOverlayHorizontal'
import QROverlay from './pages/overlays/QROverlay'

import MediaOverlay from './pages/overlays/MediaOverlay'
import { ProtectedRoute } from './components/ProtectedRoute'
import { clearTokens, getTokens } from './lib/api'
import './App.css'

function Header() {
  const navigate = useNavigate()
  const { accessToken } = getTokens()

  function handleLogout() {
    clearTokens()
    navigate('/login')
  }

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <div className="brand-mark">
          <img src="/logo.svg" alt="Sawer Duite" />
        </div>
        <span className="brand-name">Sawer Duite</span>
      </Link>
      {accessToken && (
        <button onClick={handleLogout} className="btn btn-secondary">
          Keluar
        </button>
      )}
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
        <Route path="/register" element={<Register />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/payment"
          element={
            <ProtectedRoute>
              <PaymentSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/overlay/alert"
          element={
            <ProtectedRoute>
              <OverlayAlertSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/overlay/queue"
          element={
            <ProtectedRoute>
              <OverlayQueueSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/donation-packages"
          element={
            <ProtectedRoute>
              <DonationPackagesSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/support-buttons"
          element={
            <ProtectedRoute>
              <SupportButtonSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/overlay/goal"
          element={
            <ProtectedRoute>
              <OverlayGoalSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/overlay/list"
          element={
            <ProtectedRoute>
              <OverlayListSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/overlay/media"
          element={
            <ProtectedRoute>
              <OverlayMediaSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/overlay/qr"
          element={
            <ProtectedRoute>
              <OverlayQRSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/overlays/alert/:uuid" element={<AlertOverlay />} />
        <Route path="/overlays/queue/:uuid" element={<QueueOverlay />} />
        <Route path="/overlays/goal/:uuid" element={<GoalOverlay />} />
        <Route path="/overlays/list-vertical/:uuid" element={<ListOverlayVertical />} />
        <Route path="/overlays/list-horizontal/:uuid" element={<ListOverlayHorizontal />} />
        <Route path="/overlays/qr/:uuid" element={<QROverlay />} />

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
