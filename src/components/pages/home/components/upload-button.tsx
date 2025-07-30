import FileUploadIcon from '@/components/icons/file-upload.icon'
import { handleFileUpload } from '../functions'
import { useIsProcessingStore, useFilePathStore, usePdfPreviewsStore } from '@/lib/stores/file-upload.store'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const defaultClassName =
  'flex items-center w-fit bg-primary text-primary-foreground rounded-md shadow-md h-10 text-sm font-medium border border-border transition-all hover:bg-[color-mix(in_oklab,var(--primary),white_10%)] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden';



export default function UploadButton({ className = '' }: { className?: string }) {
  const {t} = useTranslation()
  const { isProcessing, incrementProcessedFiles, decrementProcessedFiles } = useIsProcessingStore()
  const { addFilePath } = useFilePathStore()
  const { addDocument: addPdfPreview } = usePdfPreviewsStore()
  return (
    <div className={cn(defaultClassName, className)}>
      <span
        onClick={() => handleFileUpload(isProcessing, incrementProcessedFiles, decrementProcessedFiles, addFilePath, addPdfPreview)}
        className={`pl-4 pr-3 py-2 ${isProcessing ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <FileUploadIcon />
      </span>
      <Separator orientation='vertical' />
      <span
        onClick={() => handleFileUpload(isProcessing, incrementProcessedFiles, decrementProcessedFiles, addFilePath, addPdfPreview)}
        className={`pl-3 pr-4 py-2 ${isProcessing ? 'cursor-default' : 'cursor-pointer'} text-ellipsis text-nowrap overflow-x-hidden grow font-medium`}
        style={{ color: 'inherit' }}
      >
        {t('landing.upload_btn')}
      </span>
    </div>
  )
}