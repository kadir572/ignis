import { PdfPreviewData } from '@/lib/types/file-upload.types'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export async function handleFileUpload(isProcessing: boolean, addFilePath: (filePath: string) => void, addPdfPreview: (pdfPreview: PdfPreviewData) => void): Promise<void> {
  if (isProcessing) return;

  try {
    const fpArr = await open({
      multiple: true,
      directory: false,
      filters: [
        {
          name: 'File Types',
          extensions: ['pdf']
        }
      ]
    })

    if (!fpArr || fpArr.length === 0) return;

    fpArr.forEach(fp => addFilePath(fp));

    fpArr.forEach(async fp => {
      console.log(fp)
      const pdfPreviewData = await invoke('generate_thumbnails', { filePath: fp }) as PdfPreviewData
      addPdfPreview(pdfPreviewData)
    })
  } catch (e) {
    console.error(e);
  }
}
