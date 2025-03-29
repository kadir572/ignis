import { PdfPreviewData } from '@/lib/types/file-upload.types'
import Thumbnail from './Thumbnail'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
type Props = {
  pdfPreview: PdfPreviewData
}

export default function PdfPreview({ pdfPreview }: Props) {
  const {
    setNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: pdfPreview.file_path,
    data: {
      type: 'document',
      pdfPreview
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div className={`${isDragging ? 'opacity-40' : ''}`} ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span>{pdfPreview.file_name}</span>
      <div className='flex items-center gap-4 w-full overflow-x-auto' style={{ maxWidth: '100%' }}>
        {pdfPreview.thumbnails.map((thumbnail, index) => (
          <div key={index} className="flex-shrink-0">
            <Thumbnail thumbnail={thumbnail} index={index} />
          </div>
        ))}
      </div>
    </div>
  )
}