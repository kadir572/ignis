import { DocumentData, DownloadResponse, ThumbnailData } from '@/lib/types/file-upload.types'
import { CollisionPriority } from '@dnd-kit/abstract'
import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers'
import { useSortable } from '@dnd-kit/react/sortable'
import { invoke } from '@tauri-apps/api/core'

export const handleDownloadDocument = async (document: DocumentData, pagesInDocument: string[], thumbnailsLookup: Record<string, ThumbnailData>, documents: Record<string, DocumentData>, password?: string): Promise<DownloadResponse> => {
  const thumbnails = pagesInDocument.map(thumbnailId => {
    const thumbnail = thumbnailsLookup[thumbnailId]
    if (!thumbnail) return null
    const originalDocument = Object.values(documents).find(d => d.file_path === thumbnail.file_path)
    return {
      file_path: thumbnail.file_path,
      page_index: thumbnail.page_index,
      password: originalDocument?.password
    }
  }).filter(Boolean)
  let res = await invoke('download_file', {
    fileName: document.file_name,
    thumbnails,
    password
  })
  return res as DownloadResponse
}

export const handleDownloadAllDocuments = async (fileName: string, pagesInDocuments: Record<string, string[]>, thumbnailsLookup: Record<string, ThumbnailData>, documents: Record<string, DocumentData>, password?: string): Promise<DownloadResponse> => {
  // Flatten all pages in all documents, preserving order
  const thumbnails = Object.values(pagesInDocuments).flatMap(pagesInDocument =>
    pagesInDocument.map(thumbnailId => {
      const thumbnail = thumbnailsLookup[thumbnailId]
      if (!thumbnail) return null
      const originalDocument = Object.values(documents).find(d => d.file_path === thumbnail.file_path)
      return {
        file_path: thumbnail.file_path,
        page_index: thumbnail.page_index,
        password: originalDocument?.password
      }
    })
  ).filter(Boolean)
  let res = await invoke('download_file', {
    fileName,
    thumbnails,
    password
  })

  return res as DownloadResponse
}

export const sortableDocument = (documentId: string, index: number): ReturnType<typeof useSortable> => {
  return useSortable({
    id: documentId,
    index,
    type: 'document',
    accept: ['document', 'thumbnail'],
    collisionPriority: CollisionPriority.Low,
    modifiers: [RestrictToVerticalAxis],
  })
}

export function documentRequiresDecryption(doc: DocumentData): boolean {
  // If decrypted is explicitly false, and password is missing or empty
  return doc.decrypted === false && (!doc.password || doc.password === '')
}