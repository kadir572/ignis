import { useThemeStore } from '@/lib/stores/settings.store'
import MoonIcon from '../icons/MoonIcon'
import SunIcon from '../icons/SunIcon'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useThemeStore()

  const handleChange = (checked: boolean) => {
    toggleDarkMode(checked)
    localStorage.setItem('isDarkMode', JSON.stringify(checked))
  }

  return (
    <div className="
      flex items-center gap-4 rounded-full px-3 py-2 border transition-colors
      bg-white text-slate-800 border-slate-300
      dark:bg-[#334155] dark:text-white dark:border-slate-500
      hover:bg-slate-100 hover:text-slate-900
      dark:hover:bg-[#232e41] dark:hover:text-white
    ">
      <Switch
        id='theme-switch'
        onCheckedChange={handleChange}
        checked={isDarkMode}
      />
      <Label htmlFor='theme-switch'>
        {isDarkMode ? <MoonIcon /> : <SunIcon />}
      </Label>
    </div>
  )
}
