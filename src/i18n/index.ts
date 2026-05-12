import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import sq from './sq.json'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, sq: { translation: sq } },
  lng: localStorage.getItem('lms_lang') ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
