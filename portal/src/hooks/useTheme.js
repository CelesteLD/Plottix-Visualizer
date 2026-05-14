import { useEffect } from 'react'

// Theme is permanently light — no toggle needed.
export default function useTheme() {
  useEffect(() => {
    document.body.classList.remove('theme-light')
    // Light is now the base theme via CSS variables; no class needed.
  }, [])

  return { theme: 'light', toggle: () => {} }
}
