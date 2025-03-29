import { create } from 'zustand'
import { FilePathStore, IsProcessingStore, PdfPreviewData, PdfPreviewsState } from '../types/file-upload.types'

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

export const usePdfPreviewsStore = create<PdfPreviewsState>(set => ({
  pdfsPreviews: [],
  setPdfPreviews: (pdfPreviews: PdfPreviewData[]) => set({ pdfsPreviews: pdfPreviews }),
  addPdfPreview: (pdfPreview: PdfPreviewData) => set(state => ({ pdfsPreviews: [...state.pdfsPreviews, pdfPreview] })),
  clearPdfPreviews: () => set({ pdfsPreviews: [] }),
}))