export type IsProcessingStore = {
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
};

export type FilePathStore = {
  filePaths: string[]
  setFilePaths: (filePaths: string[]) => void;
  addFilePath: (filePath: string) => void;
  clearFilePaths: () => void;
}

export type ThumbnailData = {
  page_index: number
  file_path: string
  thumbnail: string
  width: number
  height: number
}

export type PdfPreviewData = {
  file_name: string,
  file_path: string,
  thumbnails: ThumbnailData[]
}

export type PdfPreviewsState = {
  pdfsPreviews: PdfPreviewData[]
  setPdfPreviews: (pdfPreviews: PdfPreviewData[]) => void
  addPdfPreview: (pdfPreview: PdfPreviewData) => void
  clearPdfPreviews: () => void
}