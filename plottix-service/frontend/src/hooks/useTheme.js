import { useState, useEffect } from 'react'

const STORAGE_KEY = 'sx-theme'

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'dark'
  })

  useEffect(() => {
    const body = document.body
    if (theme === 'light') {
      body.classList.add('theme-light')
    } else {
      body.classList.remove('theme-light')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}