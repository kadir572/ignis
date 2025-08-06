import UploadButton from './components/upload-button'
import { usePdfPreviewsStore } from '@/lib/stores/file-upload.store'
import DocumentsList from './components/DocumentsList'
import { useTranslation } from 'react-i18next'
import Settings from './components/Settings'

export default function HomePage() {
  const {t} = useTranslation()
  const { documents } = usePdfPreviewsStore()

  return (
    <div className='flex flex-col items-center gap-8 relative grow h-full'>
        {Object.keys(documents).length <= 0 && (
          <div className='flex flex-col gap-1 pt-48 items-center'>
            <h1 className='text-4xl font-bold'>{t('landing.title')}</h1>
            <h2 className='text-xl font-medium'>{t('landing.subtitle')}</h2>
            <div className='w-full mt-8 flex justify-center'>
              <UploadButton />
            </div>
            
            {/* Supported File Types Section */}
            <div className='mt-12 max-w-md mx-auto text-center'>
              <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                  {t('landing.supported_files.title')}
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                  {t('landing.supported_files.description')}
                </p>
                <div className='inline-flex flex-wrap gap-2 justify-center'>
                  {t('landing.supported_files.formats').split(', ').map((format, index) => (
                    <span
                      key={index}
                      className='px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800'
                    >
                      {format.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {Object.keys(documents).length > 0 && (
          <DocumentsList/>
        )}
        <Settings/>
      </div>
  )
}