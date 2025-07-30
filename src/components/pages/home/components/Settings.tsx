import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'

export default function Settings() {
  return (
    <div className='flex items-center gap-4 absolute bottom-4 right-2 z-50'>
      <ThemeToggle/>
      <LanguageSwitcher />
    </div>
  )
}