import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { FullImageData, ThumbnailData } from '@/lib/types/file-upload.types'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import { XIcon } from 'lucide-react'

type Props = {
  isOpen: boolean,
  onClose: () => void,
  thumbnail: ThumbnailData
  password?: string
}

export default function FullScreenThumbnail({ isOpen, onClose, thumbnail, password }: Props) {
  const [imageData, setImageData] = useState<FullImageData | null>(null)

  const generateFullResolutionImage = async () => {
    const fullImageData = await invoke('gen_full_res', {
      filePath: thumbnail.file_path,
      pageIndex: thumbnail.page_index,
      password
    }) as FullImageData
    setImageData(fullImageData)
  }

  useEffect(() => {
    if (isOpen) {
      generateFullResolutionImage()
    }
  }, [isOpen])

  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  // Define maximum width/height of the image based on the window size
  const maxWidth = windowWidth * 0.90
  const maxHeight = windowHeight * 0.90

  // Calculate the aspect ratio of the image
  const aspectRatio = imageData ? imageData.width / imageData.height : 1

  let displayWidth = maxWidth
  let displayHeight = displayWidth / aspectRatio

  // If the image height exceeds the maximum height, adjust width to match the aspect ratio
  if (displayHeight > maxHeight) {
    displayHeight = maxHeight
    displayWidth = maxHeight * aspectRatio
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className='sr-only'>Fullscreen Thumbnail</DialogTitle>
      <DialogContent className="flex items-center justify-center p-0 w-fit max-h-screen" showCloseButton={false}>
        <div className="relative flex items-center justify-center max-h-screen">
          {!imageData && <span className="text-white">Loading...</span>}
          {imageData && (
            <>
              <img
                className="object-contain block"
                src={imageData.data_url}
                alt="Fullscreen Thumbnail"
                style={{
                  maxWidth: `${maxWidth * 1.1}px`,
                  maxHeight: `${maxHeight * 1.1}px`,
                  width: `${displayWidth * 1.1}px`,
                  height: `${displayHeight * 1.1}px`,
                }}
              />
              <button
                onClick={onClose}
                className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow"
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
