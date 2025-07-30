import { Outlet } from 'react-router-dom'
import Header from '../partials/header.partial'
import { useEffect } from 'react'
import { useThemeStore } from '@/lib/stores/settings.store'
import { useTranslation } from 'react-i18next'

export default function RootLayout() {const {i18n}= useTranslation()
const {toggleDarkMode} = useThemeStore()
useEffect(() => {
  i18n.changeLanguage(localStorage.getItem('language') ?? 'en')
}, [i18n])

useEffect(() => {
  const theme = JSON.parse(localStorage.getItem('isDarkMode') ?? 'false')
  toggleDarkMode(theme)
}, [toggleDarkMode])
  return (
    <div className='flex flex-col w-full min-h-screen'>
      <Header />
      <div className='grow px-4 flex flex-col justify-start'>
        <Outlet />
      </div>
    </div>
  )
}
