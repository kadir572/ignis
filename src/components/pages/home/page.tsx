import UploadButton from './components/upload-button'
import { usePdfPreviewsStore } from '@/lib/stores/file-upload.store'
import DocumentsList from './components/DocumentsList'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './components/LanguageSwitcher'

export default function HomePage() {
  const {t} = useTranslation()
  const { documents } = usePdfPreviewsStore()

  return (
    <div className='flex flex-col items-center justify-center gap-8 my-auto'>
        {Object.keys(documents).length <= 0 && (
          <div className='flex flex-col gap-1 pt-48'>
            <h1 className='text-4xl font-bold'>{t('landing.title')}</h1>
            <h2 className='text-xl font-medium'>{t('landing.subtitle')}</h2>
            <div className='w-full mt-8 flex justify-center'>
              <UploadButton />
            </div>
            <div>
              <LanguageSwitcher/>
            </div>
          </div>
        )}
        {Object.keys(documents).length > 0 && (
          <DocumentsList/>
        )}
      </div>
  )
}