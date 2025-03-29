import { PdfPreviewData, ThumbnailData } from '@/lib/types/file-upload.types'
import PdfPreview from './PdfPreview'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core'
import { useState } from 'react'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { usePdfPreviewsStore } from '@/lib/stores/file-upload.store'

export default function PdfPreviewList() {
  const { pdfsPreviews, setPdfPreviews } = usePdfPreviewsStore()
  // For dragging documents
  const [activeDocument, setActiveDocument] = useState<PdfPreviewData | null>(null)
  // For dragging thumbnails
  const [activeThumbnail, setActiveThumbnail] = useState<ThumbnailData | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 0.1 } })
  )

  const handleDragStart = (e: DragStartEvent): void => {
    if (e.active.data.current?.type === 'document') {
      setActiveDocument(e.active.data.current.document)
      return
    }

    if (e.active.data.current?.type === 'thumbnail') {
      setActiveThumbnail(e.active.data.current.thumbnail)
    }
  }

  const handleDragOver = (e: DragOverEvent): void => {
    const { active, over } = e

    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveThumbnail = active.data.current?.type === 'thumbnail'
    const isOverThumbnail = over.data.current?.type === 'thumbnail'
    const isOverDocument = over.data.current?.type === 'document'

    if (!isActiveThumbnail) return

    // Move thumbnail within the same document or to another document
    if (isActiveThumbnail && isOverThumbnail) {
      // Find which documents these thumbnails belong to
      const activeDocIndex = pdfsPreviews.findIndex(doc =>
        doc.thumbnails.some(thumb => thumb.page_index === active.data.current?.thumbnail.page_index &&
          thumb.file_path === active.data.current?.thumbnail.file_path))

      const overDocIndex = pdfsPreviews.findIndex(doc =>
        doc.thumbnails.some(thumb => thumb.page_index === over.data.current?.thumbnail.page_index &&
          thumb.file_path === over.data.current?.thumbnail.file_path))

      if (activeDocIndex === overDocIndex) {
        // Same document - reorder thumbnails
        const newPdfsPreviews = [...pdfsPreviews]
        const activeThumbIndex = newPdfsPreviews[activeDocIndex].thumbnails.findIndex(
          thumb => thumb.page_index === active.data.current?.thumbnail.page_index &&
            thumb.file_path === active.data.current?.thumbnail.file_path
        )

        const overThumbIndex = newPdfsPreviews[activeDocIndex].thumbnails.findIndex(
          thumb => thumb.page_index === over.data.current?.thumbnail.page_index &&
            thumb.file_path === over.data.current?.thumbnail.file_path
        )

        // Move the thumbnail within the same document
        newPdfsPreviews[activeDocIndex].thumbnails = arrayMove(
          newPdfsPreviews[activeDocIndex].thumbnails,
          activeThumbIndex,
          overThumbIndex
        )

        setPdfPreviews(newPdfsPreviews)
      } else {
        // Different documents - move thumbnail to another document
        const newPdfsPreviews = [...pdfsPreviews]

        // Remove thumbnail from source
        const activeThumbIndex = newPdfsPreviews[activeDocIndex].thumbnails.findIndex(
          thumb => thumb.page_index === active.data.current?.thumbnail.page_index &&
            thumb.file_path === active.data.current?.thumbnail.file_path
        )

        const [movedThumbnail] = newPdfsPreviews[activeDocIndex].thumbnails.splice(activeThumbIndex, 1)

        // Add to destination
        const overThumbIndex = newPdfsPreviews[overDocIndex].thumbnails.findIndex(
          thumb => thumb.page_index === over.data.current?.thumbnail.page_index &&
            thumb.file_path === over.data.current?.thumbnail.file_path
        )

        newPdfsPreviews[overDocIndex].thumbnails.splice(overThumbIndex, 0, movedThumbnail)

        setPdfPreviews(newPdfsPreviews)
      }
    }

    // Move thumbnail to another document (when dragging over the document itself)
    else if (isActiveThumbnail && isOverDocument) {
      const newPdfsPreviews = [...pdfsPreviews]

      // Find the source document
      const sourceDocIndex = newPdfsPreviews.findIndex(doc =>
        doc.thumbnails.some(thumb => thumb.page_index === active.data.current?.thumbnail.page_index &&
          thumb.file_path === active.data.current?.thumbnail.file_path))



      console.log('in handle drag over')
      // Find the destination document
      const destDocIndex = newPdfsPreviews.findIndex(doc =>
        doc.file_path === over.data.current?.document.file_path)

      if (sourceDocIndex !== destDocIndex) {
        // Get the thumbnail from source
        const sourceThumbIndex = newPdfsPreviews[sourceDocIndex].thumbnails.findIndex(
          thumb => thumb.page_index === active.data.current?.thumbnail.page_index &&
            thumb.file_path === active.data.current?.thumbnail.file_path
        )

        const [movedThumbnail] = newPdfsPreviews[sourceDocIndex].thumbnails.splice(sourceThumbIndex, 1)

        // Add to destination
        newPdfsPreviews[destDocIndex].thumbnails.push(movedThumbnail)

        setPdfPreviews(newPdfsPreviews)
      }
    }
  }

  const handleDragEnd = (e: DragEndEvent): void => {
    setActiveDocument(null)
    setActiveThumbnail(null)

    const { active, over } = e

    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    // Handle document reordering
    const isActiveDocument = active.data.current?.type === 'document'
    const isOverDocument = over.data.current?.type === 'document'

    if (isActiveDocument && isOverDocument) {
      const activeDocIndex = pdfsPreviews.findIndex(
        doc => doc.file_path === active.data.current?.document.file_path
      )

      console.log('over', over)
      const overDocIndex = pdfsPreviews.findIndex(
        doc => doc.file_path === over.data.current?.document.file_path
      )

      if (activeDocIndex !== overDocIndex) {
        const newPdfsPreviews = arrayMove(
          pdfsPreviews,
          activeDocIndex,
          overDocIndex
        )

        setPdfPreviews(newPdfsPreviews)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={pdfsPreviews.map(pdf => pdf.file_path)}
        strategy={verticalListSortingStrategy}
      >
        <div className='flex flex-col gap-8 w-full'>
          {pdfsPreviews.map((pdfPreview, index) => (
            <div key={index} className='flex flex-col gap-4'>
              <PdfPreview pdfPreview={pdfPreview} />
            </div>
          ))}
        </div>
      </SortableContext>

      {createPortal(
        <DragOverlay>
          {activeDocument && (
            <PdfPreview pdfPreview={activeDocument} />
          )}
          {activeThumbnail && (
            <div className="thumbnail-preview">
              <img src={activeThumbnail.thumbnail}
                alt={`Page ${activeThumbnail.page_index}`}
                style={{
                  width: activeThumbnail.width,
                  height: activeThumbnail.height
                }} />
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}