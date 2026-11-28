// Covers scripts/lib/store-listings.js, which feeds store.config.js (EAS
// Metadata, App Store) and scripts/submit-android.js (Play listings and
// localized release notes) from store/ (store-launch plan). Runs against the
// real files, so a folder that no upload would reach fails here.
import fs from 'fs'
import path from 'path'

const {
  STORE_LOCALES,
  appleInfo,
  playListings,
  playReleaseNotes,
} = require('../../../scripts/lib/store-listings')
const { extractPlayReleaseNotes } = require('../../../scripts/lib/release-notes')

const root = path.resolve(__dirname, '..', '..', '..')
const folders = (platform: string) =>
  fs
    .readdirSync(path.join(root, 'store', platform), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

describe('store-listings', () => {
  it.each(['ios', 'android'])(
    'uploads every store/%s folder exactly once',
    (platform) => {
      const mapped = STORE_LOCALES.map(
        (row: Record<string, string[]>) => row[platform][0]
      ).sort()
      expect(mapped).toEqual(folders(platform))
    }
  )

  it('reuses fr / es text for the extra store locales', () => {
    const info = appleInfo({ supportUrl: 'https://x', privacyPolicyUrl: 'https://x' })
    expect(Object.keys(info)).toHaveLength(18)
    expect(info['fr-CA']).toEqual(info['fr-FR'])
    expect(info['es-MX']).toEqual(info['es-ES'])
    const play = Object.fromEntries(
      playListings().map((listing: { language: string }) => [listing.language, listing])
    )
    expect(Object.keys(play)).toHaveLength(18)
    expect(play['es-419'].fullDescription).toBe(play['es-ES'].fullDescription)
  })

  it('gives App Store keywords as an array within the 100-character field', () => {
    const info = appleInfo({})
    for (const { keywords } of Object.values(info) as { keywords: string[] }[]) {
      expect(keywords.length).toBeGreaterThan(1)
      expect([...keywords.join(',')].length).toBeLessThanOrEqual(100)
    }
  })

  it('keeps store/release-notes/en-US.txt equal to the current "Google Play:" block', () => {
    const { version } = JSON.parse(
      fs.readFileSync(path.join(root, 'app.json'), 'utf8')
    ).expo
    const markdown = fs.readFileSync(path.join(root, 'docs', 'RELEASE-NOTES.md'), 'utf8')
    const english = playReleaseNotes().find(
      (note: { language: string }) => note.language === 'en-US'
    )
    expect(english.text).toBe(extractPlayReleaseNotes(markdown, version))
  })
})
