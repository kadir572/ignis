import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BanIcon, DownloadIcon, Eye, EyeOff } from 'lucide-react'
import { DocumentData, ThumbnailData } from '@/lib/types/file-upload.types'
import { handleDownloadDocument } from '@/functions/document'
import { useTranslation } from 'react-i18next'

type Props = {
  document: DocumentData
  pagesInDocument: string[]
  thumbnailsLookup: Record<string, ThumbnailData>
  documents: Record<string, DocumentData>
  isDownloadFormOpen: boolean
  setIsDownloadFormOpen: (isDownloadFormOpen: boolean) => void
}

export default function DownloadFileForm({ document, pagesInDocument, thumbnailsLookup, documents, isDownloadFormOpen, setIsDownloadFormOpen }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { t } = useTranslation()
  
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (isDownloadFormOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isDownloadFormOpen])

  const isDownloadEnabled = password.length > 0 && password === confirmPassword;
  // const showPasswordMismatch = password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    console.log('isDownloadFormOpen', isDownloadFormOpen)
  }, [isDownloadFormOpen])

  return (
    <div
      className='flex flex-col gap-3 bg-white rounded-b-md border border-t-0 border-slate-200 px-4 py-3 pt-8 w-full'
    >
      <div className='mb-1'>
        <h2 className='text-base font-semibold text-slate-800'>{t('document.download_form.title')}</h2>
      </div>
      <div className='mb-2 text-sm text-slate-700 w-full max-w-xs flex flex-col gap-1'>
        <span>{t('document.download_form.p1')}</span>
        <span className='text-slate-500'>{t('document.download_form.p2')}</span>
        <span className='text-orange-600'>{t('document.download_form.p3')}</span>
      </div>
      <div className="relative w-full">
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder={t('document.download_form.password')}
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
          placeholder={t('document.download_form.confirm_password')}
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
            setPassword('')
            setConfirmPassword('')
            setIsDownloadFormOpen(false)
          }}
        >
          <BanIcon/>
          <span>{t('document.download_form.cancel')}</span>
        </Button>
        <Button
          variant='default'
          className='bg-slate-700 hover:bg-slate-800 transition-all duration-300 cursor-pointer'
          disabled={!isDownloadEnabled}
          onClick={() => {
            if (isDownloadEnabled) {
              handleDownloadDocument(document, pagesInDocument, thumbnailsLookup, documents, password)
            }
          }}
        >
          <DownloadIcon/>
          <span>{t('document.download_form.download')}</span>
        </Button>
      </div>
    </div>
  )
}