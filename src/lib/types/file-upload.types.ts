export type IsProcessingStore = {
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  processedFiles: number;
  incrementProcessedFiles: () => void;
  decrementProcessedFiles: () => void;
};

export type FilePathStore = {
  filePaths: string[]
  setFilePaths: (filePaths: string[]) => void;
  addFilePath: (filePath: string) => void;
  clearFilePaths: () => void;
}

export type DownloadAllStore = {
  fileName: string
  password?: string
  isFormOpen: boolean
  isDownloading: boolean
  setFileName: (fileName: string) => void
  setPassword: (password: string) => void
  setIsFormOpen: (isFormOpen: boolean) => void
  setIsDownloading: (isDownloading: boolean) => void
}

export type ThumbnailData = {
  id: string,
  page_index: number
  file_path: string
  thumbnail: string
  width: number
  height: number
}

export type DocumentData = {
  id: string,
  file_name: string,
  file_path: string,
  thumbnails: ThumbnailData[]
  error?: string
  password?: string
  decrypted?: boolean
}

export type DocumentsState = {
  documents: Record<string, DocumentData>
  setDocuments: (docuemnts: Record<string, DocumentData>) => void
  addDocument: (document: DocumentData) => void
  removeDocument: (documentId: string) => void
  removeThumbnail: (documentId: string, thumbnailId: string) => void
  clearDocuments: () => void
  updateFileName: (documentId: string, fileName: string) => void
}

export type FullImageData = {
  data_url: string,
  width: number,
  height: number
}

export type DownloadResponse = {
  key: string,
  file_name: string,
  file_path: string
}