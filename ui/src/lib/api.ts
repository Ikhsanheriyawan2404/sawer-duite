export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // Default to the same host as API but with ws protocol
  // Or if API_URL is relative/localhost, use window.location.hostname
  if (API_URL.startsWith('http')) {
    const url = new URL(API_URL)
    return `${protocol}//${url.host}`
  }
  return `${protocol}//${window.location.hostname}:3000`
}

export const WS_URL = getWsUrl()

export function getTokens() {
  const accessToken = localStorage.getItem('access_token')
  const refreshToken = localStorage.getItem('refresh_token')
  return { accessToken, refreshToken }
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export async function refreshTokens() {
  const { refreshToken } = getTokens()
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) throw new Error('Refresh failed')

    const data = await response.json()
    setTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch (_err) {
    clearTokens()
    return null
  }
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const { accessToken } = getTokens()
  
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const getHeaders = (token: string | null) => ({
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  })

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: getHeaders(accessToken),
  })

  if (response.status === 401) {
    // Try to refresh
    const newAccessToken = await refreshTokens()
    if (newAccessToken) {
      // Retry the original request with new token
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: getHeaders(newAccessToken),
      })
    } else {
      clearTokens()
      window.location.href = '/login'
    }
  }

  return response
}
