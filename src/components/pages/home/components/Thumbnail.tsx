import { Button } from '@/components/ui/button'
import { ThumbnailData } from '@/lib/types/file-upload.types'
import { Trash2Icon } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
type Props = {
  thumbnail: ThumbnailData
  index: number
}

export default function Thumbnail({ thumbnail, index }: Props) {
  const {
    setNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `${thumbnail.file_path}-${thumbnail.page_index}`,
    data: {
      type: 'thumbnail',
      thumbnail
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }
  return (
    <div className={`${isDragging ? 'opacity-40' : ''}`} ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div>
        <Button variant='destructive' size='icon' className='opacity-80'>
          <Trash2Icon />
        </Button>
      </div>
      <div className=' border-2 border-gray-300'>
        <img src={thumbnail.thumbnail} alt={`Thumbnail ${index}`} className="h-[150px] w-auto object-contain" />
      </div>
    </div>
  )
}