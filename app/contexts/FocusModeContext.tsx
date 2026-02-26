'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface FocusModeContextType {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined)

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('nexus_focus_mode')
    if (stored === 'true') {
      setIsFocusMode(true)
    }
  }, [])

  const toggleFocusMode = () => {
    setIsFocusMode((prev) => {
      const next = !prev
      localStorage.setItem('nexus_focus_mode', String(next))
      return next
    })
  }

  return (
    <FocusModeContext.Provider value={{ isFocusMode, toggleFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  )
}

export function useFocusMode() {
  const context = useContext(FocusModeContext)
  if (context === undefined) {
    throw new Error('useFocusMode tem de ser usado dentro de um FocusModeProvider')
  }
  return context
}