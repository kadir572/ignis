import { toast } from 'sonner'
import { DocumentData } from '@/lib/types/file-upload.types'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export async function handleFileUpload(isProcessing: boolean, addFilePath: (filePath: string) => void, addPdfPreview: (pdfPreview: DocumentData) => void): Promise<void> {
  if (isProcessing) return;

  try {
    const fpArr = await open({
      multiple: true,
      directory: false,
      filters: [
        {
          name: 'File Types',
          extensions: ['pdf', 'txt', 'png', 'jpg']
        }
      ]
    })

    if (!fpArr || fpArr.length === 0) return;

    fpArr.forEach(fp => addFilePath(fp));

    fpArr.forEach(async fp => {
      try {
        await generateThumbnails(fp, addPdfPreview)
      } catch (e) {
        console.error(e);
      }
    })
  } catch (e) {
    console.error(e);
  }
}

export async function generateThumbnails(filePath: string, addPdfPreview: (pdfPreview: DocumentData) => void, password?: string, documentId?: string) {
  try {
    const pdfPreviewData = await invoke('generate_thumbnails', { filePath, password, documentId }) as DocumentData
    if (!pdfPreviewData.error) {
      addPdfPreview({
        ...pdfPreviewData,
        decrypted: true,
        password
      })
      if (password) {
        toast.success("Password correct. Document decrypted.")
      }
    } else if (pdfPreviewData.error === 'PDF_PASSWORD_INCORRECT' || pdfPreviewData.error === 'PDF_PASSWORD_REQUIRED') {
      console.log("pdfPreviewData.error in else if", pdfPreviewData.error)
      addPdfPreview({
        ...pdfPreviewData,
        decrypted: false,
        password: ''
      })

      if (pdfPreviewData.error == "PDF_PASSWORD_INCORRECT") {
        toast.error("Password incorrect. Please try again.")
      }
    }
  } catch (e) {
    console.error(e);
    if (e === 'PDF_PASSWORD_INCORRECT') {
      console.log("e in catch", e)
    }
  }
}