import { create } from 'zustand'
import { ThemeState } from '../types/settings.types'

export const useThemeStore = create<ThemeState>(set => ({
  isDarkMode: JSON.parse(localStorage.getItem('isDarkMode') ?? 'false'),
  toggleDarkMode: (isDarkMode?: boolean) =>
    set(state => {
      if (isDarkMode !== undefined) {
        if (isDarkMode) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        return {
          isDarkMode,
        }
      } else {
        document.documentElement.classList.toggle('dark', !state.isDarkMode)
      }
      return {
        isDarkMode: !state.isDarkMode,
      }
    }),
}))