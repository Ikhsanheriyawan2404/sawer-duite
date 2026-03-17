import { useEffect } from 'react'

const APP_NAME = 'Saweran'

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
    return () => {
      document.title = prevTitle
    }
  }, [title])
}
