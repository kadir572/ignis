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
    download_all_form: {
      title: string,
      description: string,
      p1: string,
      p2: string,
      p3: string,
      file_name: string,
      password: string,
      confirm_password: string,
      cancel: string,
      download: string
    }
  },
  document: {
    expand_btn: string,
    collapse_btn: string,
    remove_btn: string,
    download_btn: string,
    drop_here: string,
    download_form: {
      password: string,
      confirm_password: string,
      cancel: string,
      download: string,
      title: string,
      p1: string,
      p2: string,
      p3: string,
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
