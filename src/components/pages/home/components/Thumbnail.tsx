import { Button } from '@/components/ui/button'
import { ThumbnailData } from '@/lib/types/file-upload.types'
import { Copy, Expand, XIcon } from 'lucide-react'
import { useSortable } from '@dnd-kit/react/sortable'
import { CollisionPriority } from '@dnd-kit/abstract'
import { useState } from 'react'
import { usePdfPreviewsStore } from '@/lib/stores/file-upload.store'
import FullScreenThumbnail from '../FullScreenThumbnail'

type Props = {
  thumbnail: ThumbnailData
  index: number
  group: string
  password?: string
}

export default function Thumbnail({ thumbnail, index, group, password }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [showFullScreen, setShowFullScreen] = useState<boolean>(false)
  const { removeThumbnail } = usePdfPreviewsStore()
  // console.log('Thumbnail id', thumbnail.id)
  const sortable = useSortable({
    id: thumbnail.id,
    index,
    type: 'thumbnail',
    accept: ['thumbnail'],
    group,
    collisionPriority: CollisionPriority.High,
  })

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${sortable.isDragging ? 'opacity-40' : ''} relative w-fit cursor-grab flex-shrink-0 rounded-md border-1 border-gray-500`}
        ref={sortable.ref}
        data-dragging={sortable.isDragging}
      >
        <div className='absolute -top-2 -right-2 flex items-center gap-2'>
          <div className={`${isHovered ? 'opacity-100' : 'opacity-0'} transition-all duration-200 flex items-center gap-2`}>
            {/* Copy button */}
            <Button
              variant='outline'
              size='icon'
              className="w-6 h-6 rounded-full cursor-pointer border border-border transition-all hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 active:shadow-md active:bg-slate-100 active:border-slate-400 active:text-slate-900"
            >
              <Copy />
            </Button>
            {/* Remove button */}
            <Button
              onClick={() => removeThumbnail(group, thumbnail.id)}
              variant='destructive'
              size='icon'
              className="w-6 h-6 rounded-full cursor-pointer"
            >
              <XIcon />
            </Button>
          </div>
        </div>
        <div className={`${isHovered ? 'opacity-100' : 'opacity-0'} absolute -bottom-2 -right-2 transition-all duration-200 flex items-center gap-2`}>
          {/* Fullscreen button */}
          <Button
            onClick={() => setShowFullScreen(true)}
            variant='outline'
            size='icon'
            className="w-6 h-6 rounded-full cursor-pointer border border-border transition-all hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400 active:shadow-md active:bg-slate-100 active:border-slate-400 active:text-slate-900"
          >
            <Expand />
          </Button>
        </div>
        <div className='w-fit overflow-hidden rounded-md'>
          <img src={thumbnail.thumbnail} alt={`Thumbnail ${index}`} className="h-[140px] w-auto object-contain" />
        </div>
      </div>
      <FullScreenThumbnail isOpen={showFullScreen} onClose={() => setShowFullScreen(false)} thumbnail={thumbnail} password={password} />
    </>
  )
}