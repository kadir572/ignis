import UploadButton from './components/upload-button'
import { usePdfPreviewsStore } from '@/lib/stores/file-upload.store'
import PdfPreviewList from './components/PdfPreviewList'

export default function HomePage() {

  const { pdfsPreviews } = usePdfPreviewsStore()

  return (
    <div className='h-full'>
      <div className='flex flex-col items-center justify-center gap-8 my-auto'>
        {pdfsPreviews.length <= 0 && (
          <div className='flex flex-col gap-1'>
            <h1 className='text-4xl font-bold'>Welcome to Ignis!</h1>
            <h2 className='text-xl font-medium'>Upload your files to get started</h2>
            <div className='w-full mt-8'>
              <UploadButton />
            </div>
          </div>
        )}
        {pdfsPreviews.length > 0 && (
          <PdfPreviewList />
        )}
      </div>
    </div>
  )
}