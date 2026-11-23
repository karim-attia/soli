// Typed translation keys: `t('nav.play')` is checked against en.json (the source of truth);
// plural keys are addressed by their base name and need `count`.
import type en from './locales/en.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
  }
}
