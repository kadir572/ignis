import { create } from 'zustand'
import { FilePathStore, IsProcessingStore, DocumentsState, DownloadAllStore } from '../types/file-upload.types'

export const useIsProcessingStore = create<IsProcessingStore>(set => ({
  isProcessing: false,
  setIsProcessing: (isProcessing: boolean) => set({ isProcessing }),
}))

export const useFilePathStore = create<FilePathStore>(set => ({
  filePaths: [],
  setFilePaths: (filePaths: string[]) => set({ filePaths }),
  addFilePath: (filePath: string) => set(state => ({ filePaths: [...state.filePaths, filePath] })),
  clearFilePaths: () => set({ filePaths: [] }),
}))

export const useDownloadAllStore = create<DownloadAllStore>(set => ({
  fileName: '',
  password: '',
  isFormOpen: false,
  setFileName: (fileName: string) => set({ fileName }),
  setPassword: (password: string) => set({ password }),
  setIsFormOpen: (isFormOpen: boolean) => set({ isFormOpen }),
}))

export const usePdfPreviewsStore = create<DocumentsState>(set => ({
  documents: {},
  setDocuments: (documents) => set({documents}),
  addDocument: (document) => set((state) => ({
    documents: { ...state.documents, [document.id]: document },
  })),
  removeDocument: (documentId) => set((state) => {
    console.log('Removing document', documentId)
    const newDocuments = {...state.documents}
    console.log('Doc to delete', newDocuments[documentId])
    delete newDocuments[documentId]
    return {documents: newDocuments}
  }),
  removeThumbnail: (documentId, thumbnailId) => set((state) => {
    if (!state.documents[documentId]) return state

    const updatedThumbnails = state.documents[documentId].thumbnails.filter(thumbnail => thumbnail.id !== thumbnailId)

    return {
      documents: {
        ...state.documents,
        [documentId]: {
          ...state.documents[documentId],
          thumbnails: updatedThumbnails,
        }
      }
    }
  }),
  clearDocuments: () => set({ documents: {} }),
  updateFileName: (documentId, fileName) => set((state) => {
    if (!state.documents[documentId]) return state
    return {
      documents: {...state.documents, [documentId]: {...state.documents[documentId], file_name: fileName}}
    }
  })
}))