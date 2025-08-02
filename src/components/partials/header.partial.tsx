import { useIsProcessingStore } from '@/lib/stores/file-upload.store'
import { getVersion } from '@tauri-apps/api/app'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Header() {
  const [version, setVersion] = useState<string | null>(null)
  const {isProcessing, processedFiles} = useIsProcessingStore()
  const {t} = useTranslation()
  useEffect(() => {
    console.log("isProcessing", isProcessing)
  }, [isProcessing])

  useEffect(() => {
    const tauriVersion = async () => {
      try {
        setVersion(await getVersion())
      } catch (e) {
        console.error(e)
      }
    }

    tauriVersion()
  }, [])
  return (
    <header className='px-4 py-2 flex items-center justify-between relative'>
      <div className='flex items-center gap-2'>
        <span className='text-3xl font-bold dark:text-slate-200 cursor-pointer' onClick={() => {
          window.location.reload()
        }}>Ignis</span>
        <span className='bg-slate-200 dark:bg-slate-700 dark:text-slate-200 px-3 py-px rounded-md text-sm'>
          v{version}
        </span>
      </div>
      <div className='flex items-center gap-2'>
      </div>
      {processedFiles > 0 && (
      <div className='absolute top-4 left-0 w-full h-fit flex items-center justify-center'>
          <span className='text-xl'>  {t('documents.loading_files')} {processedFiles}</span>
      </div>
      )}
    </header>
  )
}