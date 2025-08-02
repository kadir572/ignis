import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BanIcon, DownloadIcon, Eye, EyeOff } from 'lucide-react'
import { DocumentData, EncryptionLevel, ThumbnailData } from '@/lib/types/file-upload.types'
import { handleDownloadDocument } from '@/functions/document'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Label } from '@/components/ui/label'

type Props = {
  doc: DocumentData
  pagesInDocument: string[]
  thumbnailsLookup: Record<string, ThumbnailData>
  documents: Record<string, DocumentData>
  isDownloadFormOpen: boolean
  setIsDownloadFormOpen: (isDownloadFormOpen: boolean) => void
}

export default function DownloadFileForm({ doc, pagesInDocument, thumbnailsLookup, documents, isDownloadFormOpen, setIsDownloadFormOpen }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [encryptionLevel, setEncryptionLevel] = useState<EncryptionLevel>('Aes128');
  const { t } = useTranslation()
  
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (isDownloadFormOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isDownloadFormOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        formRef.current &&
        !formRef.current.contains(event.target as Node)
      ) {
        handleReset() // or setIsDownloadFormOpen(false)
      }
    }

    if (isDownloadFormOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDownloadFormOpen])

  const isDownloadEnabled = password.length > 0 && password === confirmPassword;
  
  const handleReset = () => {
    setPassword('')
    setConfirmPassword('')
    setIsDownloadFormOpen(false)
    setEncryptionLevel('Aes128')
  }

  const handleDownload = async () => {
    if (isDownloadEnabled) {
      try {
        let res = await handleDownloadDocument(doc, pagesInDocument, thumbnailsLookup, documents, password, encryptionLevel)
        toast.success(t('documents.download_all_form.messages.download_success', { filePath: res.file_path }))
        handleReset()
      } catch (error) {
        console.error(error)
        toast.error(t('documents.download_all_form.messages.download_error'))
      }
    }
  }

  return (
    <div
      ref={formRef}
      className='flex flex-col gap-3 bg-white rounded-b-md border border-t-0 border-slate-200 px-4 py-3 pt-8 w-full dark:bg-[#1e293b] dark:border-slate-700'
    >
      <div className='mb-1'>
        <h2 className='text-base font-semibold text-slate-800 dark:text-white'>{t('document.download_form.title')}</h2>
      </div>
      <div className='mb-2 text-sm text-slate-700 w-full max-w-xs flex flex-col gap-1 dark:text-slate-300'>
        <span>{t('document.download_form.p1')}</span>
        <span className='text-slate-500 dark:text-slate-400'>{t('document.download_form.p2')}</span>
        <span className='text-orange-600 dark:text-red-400'>{t('document.download_form.p3')}</span>
      </div>
      <div className="relative w-full">
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder={t('document.download_form.password')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className='pr-10 focus-visible:ring-0'
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 cursor-pointer"
          onClick={() => setShowPassword(v => !v)}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <div className="relative w-full">
        <Input
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder={t('document.download_form.confirm_password')}
          value={confirmPassword}
          disabled={password.length <= 0}
          onChange={e => setConfirmPassword(e.target.value)}
          className='pr-10 focus-visible:ring-0'
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={password.length <= 0}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 cursor-pointer disabled:text-blue-500/50 disabled:cursor-auto"
          onClick={() => setShowConfirmPassword(v => !v)}
        >
          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <div className='flex flex-col gap-2 w-full mt-2'>
        <Label className='text-sm font-medium text-slate-700 dark:text-slate-300'>
          {t('document.download_form.encryption_level')}
        </Label>
        <ToggleGroup
          type='single'
          value={encryptionLevel}
          onValueChange={(val: string) => {
            if (val) setEncryptionLevel(val as EncryptionLevel);
          }}
          className='w-full flex gap-2'
        >
          <ToggleGroupItem
            value='Aes128'
            className={`
              py-6
              bg-slate-100 dark:bg-slate-800
              data-[state=on]:bg-slate-700 data-[state=on]:text-white dark:data-[state=on]:bg-slate-700 dark:data-[state=on]:text-white
              transition-colors duration-200
              rounded-md
            `}
          >
            <span>
              AES-128
              <span className="block text-xs">PDF 1.5</span>
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value='Aes256'
            className={`
              py-6
              bg-slate-100 dark:bg-slate-800
              data-[state=on]:bg-slate-700 data-[state=on]:text-white dark:data-[state=on]:bg-slate-700 dark:data-[state=on]:text-white
              transition-colors duration-200
              rounded-md
            `}
          >
            <span>
              AES-256
              <span className="block text-xs">PDF 1.7</span>
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
        {encryptionLevel === 'Aes256' && (
          <span className="block w-full max-w-xs text-sm text-red-600 dark:text-red-400 font-medium mt-1">
              {t('document.download_form.warning')}
          </span>
        )}
      </div>
      <div className='flex gap-2 justify-end mt-4'>
        <Button
          className='transition-all duration-300 cursor-pointer'
          type='button'
          variant='destructive'
          onClick={handleReset}
        >
          <BanIcon/>
          <span>{t('document.download_form.cancel')}</span>
        </Button>
        <Button
          variant='default'
          className='bg-slate-700 hover:bg-slate-800 transition-all duration-300 cursor-pointer'
          disabled={!isDownloadEnabled}
          onClick={handleDownload}
        >
          <DownloadIcon/>
          <span>{t('document.download_form.download')}</span>
        </Button>
      </div>
    </div>
  )
}