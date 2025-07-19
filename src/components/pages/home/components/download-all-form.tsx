import { useState, useRef, useLayoutEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDownloadAllStore } from '@/lib/stores/file-upload.store'
import { Eye, EyeOff, BanIcon, DownloadIcon } from 'lucide-react'
import { DocumentData, ThumbnailData } from '@/lib/types/file-upload.types'
import { handleDownloadAllDocuments } from '@/functions/document'
import { useTranslation } from 'react-i18next'

type Props = {
  items: Record<string, string[]>
  thumbnailsLookup: Record<string, ThumbnailData>
  documents: Record<string, DocumentData>
}

export default function DownloadAllForm({ items, thumbnailsLookup, documents }: Props) {
  const [fileName, setFileName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { setIsFormOpen, isFormOpen } = useDownloadAllStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()

  useLayoutEffect(() => {
    if (isFormOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFormOpen])

  const isDownloadEnabled = password.length > 0 && password === confirmPassword;
  // const showPasswordMismatch = password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div
      className='flex flex-col gap-3 bg-white rounded-b-md border border-t-0 border-slate-200 px-4 py-3 pt-8 w-full'
    >
      <div className='mb-1'>
        <h2 className='text-base font-semibold text-slate-800'>{t('documents.download_all_form.title')}</h2>
        <div className='text-xs text-slate-500'>{t('documents.download_all_form.description')}</div>
      </div>
      <div className='mb-2 text-sm text-slate-700 w-full max-w-xs flex flex-col gap-1'>
        <span>{t('documents.download_all_form.p1')}</span>
        <span className='text-slate-500'>{t('documents.download_all_form.p2')}</span>
        <span className='text-orange-600'>{t('documents.download_all_form.p3')}</span>
      </div>
      <div className='flex items-center w-full'>
        <Input
          ref={inputRef}
          type='text'
          placeholder={t('documents.download_all_form.file_name')}
          value={fileName}
          onChange={e => setFileName(e.target.value)}
          className='mr-2 grow'
        />
        <span className='text-slate-700 ml-1 select-none w-fit text-sm'>.pdf</span>
      </div>
      <div className="relative w-full">
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder={t('documents.download_all_form.password')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className='pr-10'
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
          placeholder={t('documents.download_all_form.confirm_password')}
          value={confirmPassword}
          disabled={password.length <= 0}
          onChange={e => setConfirmPassword(e.target.value)}
          className='pr-10'
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
      <div className='flex gap-2 justify-end mt-4'>
        <Button
          className='bg-white hover:bg-slate-100 transition-all duration-300 cursor-pointer'
          type='button'
          variant='outline'
          onClick={() => {
            setFileName('')
            setPassword('')
            setConfirmPassword('')
            setIsFormOpen(false)
          }}
        >
          <BanIcon/>
          <span>{t('documents.download_all_form.cancel')}</span>
        </Button>
        <Button
          variant='default'
          className='bg-slate-700 hover:bg-slate-800 transition-all duration-300 cursor-pointer'
          disabled={!isDownloadEnabled}
          onClick={() => {
            if (isDownloadEnabled) {
              handleDownloadAllDocuments(fileName, items, thumbnailsLookup, documents)
            }
          }}
        >
          <DownloadIcon/>
          <span>{t('documents.download_all_form.download')}</span>
        </Button>
      </div>
    </div>
  )
}