import FileUploadIcon from '@/components/icons/file-upload.icon'
import { handleFileUpload } from '../functions'
import { useIsProcessingStore, useFilePathStore, usePdfPreviewsStore } from '@/lib/stores/file-upload.store'
import { Separator } from '@/components/ui/separator'

export default function UploadButton() {
  const { isProcessing } = useIsProcessingStore()
  const { filePaths, addFilePath } = useFilePathStore()
  const { addPdfPreview } = usePdfPreviewsStore()
  return (
    <div className='flex items-center w-full bg-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-md shadow-md text-white h-12'>
      <span
        onClick={() => handleFileUpload(isProcessing, addFilePath, addPdfPreview)}
        className={`px-3 ${isProcessing ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <FileUploadIcon />
      </span>
      <Separator orientation='vertical' />
      <span
        onClick={() => handleFileUpload(isProcessing, addFilePath, addPdfPreview)}
        className={`px-3 ${isProcessing ? 'cursor-default' : 'cursor-pointer'
          } text-ellipsis text-nowrap overflow-x-hidden grow`}
      >
        {filePaths.length === 1
          ? filePaths[0]
          : filePaths.length > 1
            ? 'Multiple files'
            // : t('encryption.form.selectFiles')}
            : 'Upload files'}
      </span>
    </div>
  )
}