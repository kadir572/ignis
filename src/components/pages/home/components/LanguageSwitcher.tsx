import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Globe, Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export type LanguageSwitcherProps = {
  placement?: 'bottom-right' | 'inline';
  className?: string;
}

export default function LanguageSwitcher({ placement = 'bottom-right', className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()

  type Language = {
    label: string,
    value: string,
    abbr: string
  }

  const languages: Language[] = [
    {
      label: t('settings.language.english', { defaultValue: 'English' }),
      value: 'en',
      abbr: t('settings.language.abbr_en', { defaultValue: 'EN' })
    },
    {
      label: t('settings.language.german', { defaultValue: 'German' }),
      value: 'de',
      abbr: t('settings.language.abbr_de', { defaultValue: 'DE' })
    },
    {
      label: t('settings.language.polish', { defaultValue: 'Polish' }),
      value: 'pl',
      abbr: t('settings.language.abbr_pl', { defaultValue: 'PL' })
    },
    {
      label: t('settings.language.turkish', { defaultValue: 'Turkish' }),
      value: 'tr',
      abbr: t('settings.language.abbr_tr', { defaultValue: 'TR' })
    }
  ]

  const [open, setOpen] = useState<boolean>(false)
  const [value, setValue] = useState<string>(
    localStorage.getItem('language') ?? i18n.resolvedLanguage ?? 'en'
  )

  const currentLang = languages.find(l => l.value === value) || languages[0]

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            aria-label={t('settings.language.switcher', { defaultValue: 'Switch language' })}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-full shadow-sm border w-fit h-10 transition-colors',
              'bg-white text-slate-800 border-slate-300',
              'dark:bg-[#334155] dark:text-white dark:border-slate-500',
              'hover:bg-slate-100 hover:text-slate-900',
              'dark:hover:bg-[#232e41] dark:hover:text-white',
              placement === 'bottom-right' ? 'text-base' : '',
              className
            )}
            style={{ minWidth: 0 }}
          >
            <Globe className='w-5 h-5' style={{ color: 'currentColor' }} />
            <span className='font-semibold' style={{ color: 'currentColor' }}>{currentLang.abbr}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-44 p-0 rounded-lg shadow-lg border' style={{ background: 'var(--popover)', color: 'var(--popover-foreground)', borderColor: 'var(--border)' }}>
          <Command className='bg-transparent'>
            <CommandInput
              placeholder={t('settings.language.search', { defaultValue: 'Search language...' })}
              className='h-9'
            />
            <CommandList>
              <CommandEmpty>{t('settings.language.empty', { defaultValue: 'No language found.' })}</CommandEmpty>
              <CommandGroup>
                {languages.map(l => (
                  <CommandItem
                    key={l.value}
                    value={l.value}
                    onSelect={currentValue => {
                      setValue(currentValue)
                      setOpen(false)
                      localStorage.setItem('language', currentValue)
                      i18n.changeLanguage(currentValue)
                    }}
                  >
                    <span className='font-medium'>{l.label}</span>
                    <span className='ml-auto text-xs text-slate-500'>{l.abbr}</span>
                    <Check
                      className={cn(
                        'ml-2',
                        value === l.value ? 'opacity-100 text-primary' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}