// src/i18n/types.ts

export type TranslationsType = {
  landing: {
    title: string
    subtitle: string
    upload_btn: string
  }
  settings: {
    language: {
      select: string
      search: string
      empty: string
      placeholder: string
    }
  },
  documents: {
    download_btn: string,
    downloading_text: string,
    download_all_form: {
      title: string,
      description: string,
      p1: string,
      p2: string,
      p3: string,
      warning: string,
      file_name: string,
      password: string,
      confirm_password: string,
      encryption_level: string,
      cancel: string,
      download: string,
      messages: {
        download_success: string
        download_error: string
      }
    },
    loading_files: string,
    reset_btn: string,
  },
  document: {
    expand_btn: string,
    collapse_btn: string,
    remove_btn: string,
    download_btn: string,
    downloading_text: string,
    drop_here: string,
    download_form: {
      password: string,
      confirm_password: string,
      encryption_level: string,
      cancel: string,
      download: string,
      title: string,
      p1: string,
      p2: string,
      p3: string,
      warning: string,
    },
    decryption: {
      title: string,
      description: string,
      note: string,
      enter_password: string,
    }
  }
}

// Add the type to i18next
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: TranslationsType
    }
  }
}

// Add this type helper
type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : K
}[keyof T & string]

export type TranslationKey = NestedKeyOf<TranslationsType>
