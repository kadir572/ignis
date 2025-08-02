import Document from './Document'
import {
  useDownloadAllStore,
  usePdfPreviewsStore,
} from '@/lib/stores/file-upload.store'
import { DragDropProvider } from '@dnd-kit/react'
import { DocumentData, ThumbnailData } from '@/lib/types/file-upload.types'
import { useEffect, useState } from 'react'
import { move } from '@dnd-kit/helpers'
import UploadButton from './upload-button'
import { documentRequiresDecryption } from '@/functions/document'

import DownloadButton from './download-button'
import DownloadAllForm from './download-all-form'
import ResetButton from './ResetButton'

export default function DocumentsList() {
  const { isFormOpen } = useDownloadAllStore()
  const { documents, setDocuments } = usePdfPreviewsStore()

  /// Lookup of all thumbnails objects as Record<id, ThumbnailData>
  const [thumbnailsLookup, setThumbnailsLookup] = useState<
    Record<string, ThumbnailData>
  >({})

  /// State for documents with the thumbnails they contain as Record<documentId, thumbnailId[]>
  /// The purpose of this is to track the thumbnails that are in a document regardless whether they originate from that document or not.
  /// This way we can move pages of documents between documents.
  const [items, setItems] = useState<Record<string, string[]>>(
    Object.entries(documents).reduce((acc, [documentId, documentData]) => {
      const thumbnailIds = documentData.thumbnails.map(
        thumbnail => thumbnail.id
      )
      acc[documentId] = thumbnailIds
      return acc
    }, {} as Record<string, string[]>)
  )

  const [docsList, setDocsList] = useState(Object.keys(items))

  // Update thumbnails lookup whenever documents change
  useEffect(() => {
    const lookup: Record<string, ThumbnailData> = {}

    // Build a lookup of all thumbnails by ID
    Object.values(documents).forEach(doc => {
      doc.thumbnails.forEach(thumbnail => {
        lookup[thumbnail.id] = thumbnail
      })
    })

    setThumbnailsLookup(lookup)

    // Update items state with the current document structure
    setItems(
      Object.entries(documents).reduce((acc, [documentId, documentData]) => {
        const thumbnailIds = documentData.thumbnails.map(
          thumbnail => thumbnail.id
        )
        acc[documentId] = thumbnailIds
        return acc
      }, {} as Record<string, string[]>)
    )

    setDocsList(Object.keys(documents))
  }, [documents])

  // Update the documents structure when items change
  const syncDocumentsWithItems = () => {
    const newDocuments: Record<string, DocumentData> = {}

    // For each document in our items state
    Object.entries(items).forEach(([docId, thumbnailIds]) => {
      if (!documents[docId]) return

      // Get the document base data
      const docBase = { ...documents[docId] }

      // Update thumbnails with the current order from items
      docBase.thumbnails = thumbnailIds
        .map(id => thumbnailsLookup[id])
        .filter(Boolean)

      newDocuments[docId] = docBase
    })

    // Update documents in the store
    setDocuments(newDocuments)
  }

  const handleDragOver = (event: any) => {
    const { source, target } = event.operation

    if (source?.type === 'document') return

    if (target?.type === 'document') {
      const targetDocId = target.id
      const targetDoc = documents[targetDocId]
      if (targetDocId && documentRequiresDecryption(targetDoc)) {
        return
      }
    }

    setItems(prev => move(prev, event))
  }

  const handleDragEnd = (event: any) => {
    const { source } = event.operation

    if (source?.type === 'document') {
      setDocsList(list => {
        const newList = move(list, event)

        setItems(prev => {
          const newItems = newList.reduce((acc, key) => {
            acc[key as keyof typeof prev] = prev[key as keyof typeof prev] || []
            return acc
          }, {} as typeof prev)

          return newItems
        })

        return newList
      })
    }

    syncDocumentsWithItems()
  }

  return (
    <DragDropProvider onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className='flex flex-col gap-8 w-full relative pb-18'>
        <div className='flex absolute right-0 top-0 z-110 w-min'>
          <div className='flex flex-col w-fit'>
            <div className='flex items-center gap-2'>
              <ResetButton />
              <DownloadButton className="
  bg-white text-slate-800 border-slate-300
  dark:bg-[#334155] dark:text-white dark:border-slate-500
  hover:bg-slate-100 hover:text-slate-900
  dark:hover:bg-[#232e41] dark:hover:text-white
  transition-all duration-300
" />
              <UploadButton />
            </div>
            <div
              className={`grid overflow-hidden ${
                isFormOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              } transition-all duration-200`}
            >
              <div className='min-h-0 overflow-hidden'>
                <DownloadAllForm items={items} thumbnailsLookup={thumbnailsLookup} documents={documents} />
              </div>
            </div>
          </div>
        </div>
        <div className='mt-18 flex flex-col gap-4'>
        {docsList.map((docId, index) => {
          if (!documents[docId]) return null
          return (
            <Document
              key={docId}
              document={documents[docId]}
              index={index}
              pagesInDocument={items[docId]}
              thumbnailsLookup={thumbnailsLookup}
              documents={documents}
            />
          )
        })}
        </div>
      </div>
    </DragDropProvider>
  )
}
