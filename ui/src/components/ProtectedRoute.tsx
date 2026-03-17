import React from 'react'
import { Navigate } from 'react-router-dom'
import { getTokens } from '../lib/api'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, refreshToken } = getTokens()

  if (!accessToken && !refreshToken) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
