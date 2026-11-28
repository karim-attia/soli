/**
 * Reads the store listing text under store/ for the upload tools
 * (store-launch plan, 2026-11-28): store.config.js (EAS Metadata, App Store)
 * and scripts/submit-android.js (Play listings + localized release notes).
 * store/ stays the single truth; nothing here holds listing text.
 *
 * Node stdlib only; unit-tested in test/unit/scripts/store-listings.test.ts.
 */

const fs = require('fs')
const path = require('path')

const STORE_DIR = path.resolve(__dirname, '../../store')

// One row per listing folder, mirroring store/README.md ("Languages and where
// each folder is uploaded") and LISTING_LOCALES in
// test/unit/store/storeListings.test.ts. The first locale of `ios` / `android`
// is the folder name; the others are store locales that reuse its text
// (fr-CA, es-MX / es-419) — an upload concern, not a second copy in the repo.
// `notes` = store/release-notes/<notes>.txt (by app language; en-GB has no app
// locale and reuses the en-US text).
const STORE_LOCALES = [
  { notes: 'en-US', ios: ['en-US'], android: ['en-US'] },
  { notes: 'en-US', ios: ['en-GB'], android: ['en-GB'] },
  { notes: 'de', ios: ['de-DE'], android: ['de-DE'] },
  { notes: 'fr', ios: ['fr-FR', 'fr-CA'], android: ['fr-FR', 'fr-CA'] },
  { notes: 'es', ios: ['es-ES', 'es-MX'], android: ['es-ES', 'es-419'] },
  { notes: 'pt-BR', ios: ['pt-BR'], android: ['pt-BR'] },
  { notes: 'it', ios: ['it'], android: ['it-IT'] },
  { notes: 'nl', ios: ['nl-NL'], android: ['nl-NL'] },
  { notes: 'ja', ios: ['ja'], android: ['ja-JP'] },
  { notes: 'ru', ios: ['ru'], android: ['ru-RU'] },
  { notes: 'pl', ios: ['pl'], android: ['pl-PL'] },
  { notes: 'tr', ios: ['tr'], android: ['tr-TR'] },
  { notes: 'zh-Hans', ios: ['zh-Hans'], android: ['zh-CN'] },
  { notes: 'ko', ios: ['ko'], android: ['ko-KR'] },
  { notes: 'ar', ios: ['ar-SA'], android: ['ar'] },
  { notes: 'he', ios: ['he'], android: ['iw-IL'] },
]

// Files end with exactly one newline (enforced by the store test); the stores
// get the text without it.
const readStoreFile = (...parts) =>
  fs.readFileSync(path.join(STORE_DIR, ...parts), 'utf8').trimEnd()

/** Every store locale of one platform → { folder, locale, notes }. */
const expandLocales = (platform) =>
  STORE_LOCALES.flatMap((row) =>
    row[platform].map((locale) => ({
      folder: row[platform][0],
      locale,
      notes: row.notes,
    }))
  )

const readReleaseNotes = (notes) => readStoreFile('release-notes', `${notes}.txt`)

/** Play `edits.listings` bodies, one per Play language (18). */
const playListings = () =>
  expandLocales('android').map(({ folder, locale }) => ({
    language: locale,
    title: readStoreFile('android', folder, 'title.txt'),
    shortDescription: readStoreFile('android', folder, 'short_description.txt'),
    fullDescription: readStoreFile('android', folder, 'full_description.txt'),
  }))

/** Play `releaseNotes` (LocalizedText[]) for every Play language. */
const playReleaseNotes = () =>
  expandLocales('android').map(({ locale, notes }) => ({
    language: locale,
    text: readReleaseNotes(notes),
  }))

/** EAS Metadata `apple.info`: App Store locale → localized fields (18). */
const appleInfo = ({ supportUrl, privacyPolicyUrl }) =>
  Object.fromEntries(
    expandLocales('ios').map(({ folder, locale, notes }) => [
      locale,
      {
        title: readStoreFile('ios', folder, 'name.txt'),
        subtitle: readStoreFile('ios', folder, 'subtitle.txt'),
        description: readStoreFile('ios', folder, 'description.txt'),
        // keywords.txt is one comma-separated line; EAS Metadata wants an array
        keywords: readStoreFile('ios', folder, 'keywords.txt').split(','),
        promoText: readStoreFile('ios', folder, 'promotional_text.txt'),
        releaseNotes: readReleaseNotes(notes),
        supportUrl,
        privacyPolicyUrl,
      },
    ])
  )

module.exports = {
  STORE_LOCALES,
  expandLocales,
  playListings,
  playReleaseNotes,
  appleInfo,
}
