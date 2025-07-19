import { Button } from '@/components/ui/button'
import { useDownloadAllStore } from '@/lib/stores/file-upload.store'
import { Settings2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export default function DownloadButton({ className = '' }: { className?: string }) {
  const { isFormOpen, setIsFormOpen } = useDownloadAllStore()
  const { t } = useTranslation()
  return (
    <Button
      onClick={() => setIsFormOpen(!isFormOpen)}
      variant="outline"
      className={cn(
        'flex items-center w-fit h-10 px-4 py-2 text-sm font-medium rounded-md shadow-md border border-border transition-all hover:bg-slate-200 hover:text-black hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed active:shadow-md active:bg-slate-100 active:border-slate-400 active:text-slate-900',
        className
      )}
      style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.10)' }}
    >
      <span className='flex items-center'>
        <Settings2Icon />
      </span>
      <span className='text-ellipsis text-nowrap overflow-x-hidden grow'>
        {t('documents.download_btn')}
      </span>
    </Button>
  )
}