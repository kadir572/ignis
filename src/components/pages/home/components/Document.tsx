import { DocumentData, ThumbnailData } from '@/lib/types/file-upload.types'
import { DownloadIcon, GripVertical, Pen, Lock as LockIcon, UnlockIcon, Eye, EyeOff, Trash2Icon, UnfoldVerticalIcon, FoldVerticalIcon, MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { usePdfPreviewsStore } from '@/lib/stores/file-upload.store'
import { Input } from '@/components/ui/input'
import {
  documentRequiresDecryption,
  handleDownloadDocument,
  sortableDocument,
} from '@/functions/document'
import Thumbnail from './Thumbnail'
import { generateThumbnails } from '../functions'
import DownloadFileForm from './download-file-form'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type Props = {
  document: DocumentData
  index: number
  pagesInDocument: string[]
  thumbnailsLookup: Record<string, ThumbnailData>
  documents: Record<string, DocumentData>
}

export default function Document({
  document,
  index,
  pagesInDocument,
  thumbnailsLookup,
  documents,
}: Props) {
  const { t } = useTranslation()
  // local state
  const requiresDecryption = documentRequiresDecryption(document)
  const [isEditing, setIsEditing] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDownloadFormOpen, setIsDownloadFormOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // file name
  const fileNameParts = document.file_name.match(/^(.*?)(\.[^.]+)?$/)
  const baseName = fileNameParts?.[1] || document.file_name
  const extension = fileNameParts?.[2] || ''
  const [fileName, setFileName] = useState(baseName)

  // store state
  const { removeDocument, updateFileName, addDocument } = usePdfPreviewsStore()

  // dnd state
  const sortable = sortableDocument(document.id, index)

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (requiresDecryption) return
    const container = scrollContainerRef.current
    if (!container) return

    let isDown = false
    let startX: number
    let scrollLeft: number

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (
        target.closest('input, textarea, button, select, [contenteditable="true"]')
      ) {
        return
      }

      if (target.closest('[data-draggable="true"]')) return

      isDown = true
      container.style.cursor = 'grabbing'
      startX = e.pageX - container.offsetLeft
      scrollLeft = container.scrollLeft

      e.preventDefault()
    }

    const handleMouseLeave = () => {
      isDown = false
      container.style.cursor = 'grab'
    }

    const handleMouseUp = () => {
      isDown = false
      container.style.cursor = 'grab'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - container.offsetLeft
      const walk = (x - startX) * 2
      container.scrollLeft = scrollLeft - walk
    }

    if (container instanceof HTMLDivElement) {
      container.addEventListener('mousedown', handleMouseDown)
      container.addEventListener('mouseleave', handleMouseLeave)
      container.addEventListener('mouseup', handleMouseUp)
      container.addEventListener('mousemove', handleMouseMove)

      return () => {
        container.removeEventListener('mousedown', handleMouseDown)
        container.removeEventListener('mouseleave', handleMouseLeave)
        container.removeEventListener('mouseup', handleMouseUp)
        container.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [])

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      let res = await handleDownloadDocument(document, pagesInDocument, thumbnailsLookup, documents)
      toast.success(t('documents.download_all_form.messages.download_success', { filePath: res.file_path }))
    } catch (error) {
      toast.error(t('documents.download_all_form.messages.download_error'))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div
      className={`${
        sortable.isDragging ? 'opacity-40' : ''
      } ${isDownloadFormOpen ? 'z-50' : ''} flex flex-col gap-2 w-full transition-all duration-300 pt-2 max-w-full`}
      ref={sortable.ref}
      data-dragging={sortable.isDragging}
    >
      <div className='flex items-center gap-2'>
        <div
          ref={sortable.handleRef}
          className="flex items-center justify-center w-8 h-8
    bg-gray-100 hover:bg-gray-200
    dark:bg-slate-700 dark:hover:bg-slate-600
    rounded-md cursor-grab transition-all duration-200"
        >
          <GripVertical className="w-6 h-6 text-slate-400 dark:text-slate-300" />
        </div>
        {/* File name */}
        <div className='mr-auto'>
          {isEditing && (
            <div className='flex items-center gap-2'>
              <Input
              className='text-lg w-72 max-w-full py-0 px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-1 focus-visible:border-slate-800/20'
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  updateFileName(document.id, fileName + extension)
                  setIsEditing(false)
                }
                if (e.key === 'Escape') {
                  setIsEditing(false)
                  setFileName(baseName)
                }
              }}
              onBlur={() => {
                setIsEditing(false)
                setFileName(baseName)
              }}
            />
            <span>{extension}</span>
            </div>
          )}
          {!isEditing && (
            <div className='px-4 relative'>
              <div className='absolute -top-2 -right-2'>
                <Pen
                  className={`w-4 h-4 ${requiresDecryption ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (requiresDecryption) return
                    setIsEditing(true)
                  }}
                />
              </div>
              <span className='text-lg font-bold'>{baseName + extension}</span>
            </div>
          )}
        </div>
        {!requiresDecryption && (
          <div className="flex items-center gap-2 w-fit ml-12 relative z-10">
            <Button
              variant='outline'
              className="
                w-fit cursor-pointer flex items-center gap-2 transition-all duration-300
                bg-white text-slate-800 border-slate-300
                dark:bg-[#334155] dark:text-white dark:border-slate-500
                hover:bg-slate-100 hover:text-slate-900
                dark:hover:bg-[#232e41] dark:hover:text-white
              "
              onClick={() => setIsExpanded(v => !v)}
            >
              {isExpanded ? <FoldVerticalIcon/> : <UnfoldVerticalIcon/> }
              <span>{isExpanded ? t('document.collapse_btn') : t('document.expand_btn')}</span>
            </Button>
            <Button
              onClick={() => removeDocument(document.id)}
              variant='destructive'
              className='w-fit cursor-pointer flex items-center gap-2'
            >
              <Trash2Icon />
              <span>{t('document.remove_btn')}</span>
            </Button>
            <Button
              disabled={isDownloading || isDownloadFormOpen}
              variant="outline"
              className={`
                w-fit flex items-center gap-0 relative p-0 border border-border overflow-hidden
                transition-all duration-300
                disabled:opacity-100 disabled:cursor-pointer disabled:bg-white disabled:text-slate-800 disabled:border-slate-300
                disabled:dark:bg-[#334155] disabled:dark:text-white disabled:dark:border-slate-500
              `}
              style={{ transition: 'all 0.3s' }}
            >
              {/* Left side: Download PDF */}
              <span
                className={`
                  flex items-center gap-2 h-full px-3 cursor-pointer
                  transition-all duration-300
                  bg-white text-slate-800 border-slate-300
                  dark:bg-[#334155] dark:text-white dark:border-slate-500
                  hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400
                  dark:hover:bg-[#232e41] dark:hover:text-white dark:hover:border-slate-400
                `}
                onClick={handleDownload}
                style={{ borderTopLeftRadius: '0.375rem', borderBottomLeftRadius: '0.375rem' }}
              >
                <DownloadIcon />
                <span>{isDownloading ? t('documents.downloading_text') : t('document.download_btn')}</span>
              </span>
              <Separator orientation="vertical" />
              {/* Right side: More/three dots */}
              <span
                className={`
                  cursor-pointer h-full px-2 flex items-center justify-center z-20
                  transition-all duration-300
                  bg-white text-slate-800 border-slate-300
                  dark:bg-[#334155] dark:text-white dark:border-slate-500
                  hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400
                  dark:hover:bg-[#232e41] dark:hover:text-white dark:hover:border-slate-400
                  disabled:opacity-100 disabled:cursor-pointer disabled:bg-white disabled:text-slate-800 disabled:border-slate-300
                  disabled:dark:bg-[#334155] disabled:dark:text-white disabled:dark:border-slate-500
                `}
                
                onClick={e => {
                  e.stopPropagation();
                  setIsDownloadFormOpen(!isDownloadFormOpen);
                }}
                style={{ borderTopRightRadius: '0.375rem', borderBottomRightRadius: '0.375rem' }}
              >
                <MoreVertical
                  className="text-gray-500 dark:text-slate-300 hover:text-gray-700"
                  style={{ cursor: 'pointer' }}
                />
              </span>
            </Button>
            <div
              className={`grid overflow-hidden absolute right-0 top-full ${
                isDownloadFormOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              } transition-all duration-200`}
            >
              <div className='min-h-0 overflow-hidden'>
                <DownloadFileForm  doc={document} pagesInDocument={pagesInDocument} thumbnailsLookup={thumbnailsLookup} documents={documents} isDownloadFormOpen={isDownloadFormOpen} setIsDownloadFormOpen={setIsDownloadFormOpen} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div
        className='relative w-full'
      >
        <div
          ref={scrollContainerRef}
          className={`
  flex gap-6
  bg-slate-200/50 hover:bg-slate-200
  dark:bg-slate-700/70 dark:hover:bg-slate-600/80
  transition-all duration-300 p-4 rounded-sm overflow-x-auto min-h-[100px] min-w-[180px] max-w-full
  ${requiresDecryption ? 'w-fit' : ''}
  ${isExpanded ? 'flex-wrap' : ''}
`}
        >
          {requiresDecryption && (
            <div className="flex flex-col justify-center gap-4 bg-white/80 rounded-lg shadow-md p-6 min-w-[260px] min-h-[140px] border border-blue-200">
              <h2 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                <LockIcon className="w-5 h-5" />
                Password Required
              </h2>
              <span className="text-gray-600 text-sm">
                This PDF document is encrypted.<br />Please enter the password to view it.
              </span>
              <form
                className="flex flex-col gap-2"
                onSubmit={e => {
                  e.preventDefault()
                  generateThumbnails(document.file_path, addDocument, password, document.id)
                  setPassword('')
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="relative w-full max-w-xs">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      className="w-full bg-slate-100 border border-blue-200 rounded-md pr-10"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
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
                  <Button
                    disabled={password.length === 0}
                    type="submit"
                    className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                    variant="default"
                  >
                    <UnlockIcon className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          )}
          {pagesInDocument.length == 0 && !requiresDecryption && (
            <div
              key={`${document.id}-placeholder`}
              className='w-full h-full bg-slate-200/50 hover:bg-slate-200 transition-all duration-300 p-4 rounded-md min-h-[100px] min-w-[180px] flex items-center justify-center border-2 border-dashed border-gray-400'
            >
              <p className='text-center text-gray-500'>{t('document.drop_here')}</p>
            </div>
          )}
          {!requiresDecryption && pagesInDocument?.map((thumbnailId: string, index: number) => {
            const thumbnailData = thumbnailsLookup[thumbnailId]
            if (!thumbnailData) return null
            return (
              <Thumbnail
                key={thumbnailId}
                thumbnail={thumbnailData}
                index={index}
                group={document.id}
                password={document.password}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
