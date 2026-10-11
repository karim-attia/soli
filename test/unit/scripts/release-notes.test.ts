// Covers the Play release-notes extraction used by scripts/submit-android.js
// (release-automation plan). Also runs against the real docs/RELEASE-NOTES.md
// so a malformed current entry fails here, before a release.
import fs from 'fs'
import path from 'path'

const {
  PLAY_RELEASE_NOTES_MAX_CHARS,
  extractPlayReleaseNotes,
  playReleaseName,
} = require('../../../scripts/lib/release-notes')

const notes = `# Soli — Release Notes

---

## 1.1.0 — 2026-10-11

- **Hints**: long text for humans

Google Play:

Soli 1.1 adds hints!

- New Hint button
- Small fixes

Happy playing!

---

## 1.0.0 — 2026-07-09

- stuff

Google Play:

Soli 1.0 is here!

## 0.8.0 — 2026-06-11

- Draw 1–5

Google Play:
Added game mode "Draw 3". Happy playing!

---

## 0.1.1 — 2025-11-30

- Security and build housekeeping; no gameplay changes

---

## 0.1.0 — 2025-12-14 (initial version)

Google Play:
First version
`

describe('extractPlayReleaseNotes', () => {
  it('returns the block between "Google Play:" and the entry separator', () => {
    expect(extractPlayReleaseNotes(notes, '1.1.0')).toBe(
      'Soli 1.1 adds hints!\n\n- New Hint button\n- Small fixes\n\nHappy playing!'
    )
  })

  it('stops at the next entry when there is no separator line', () => {
    expect(extractPlayReleaseNotes(notes, '1.0.0')).toBe('Soli 1.0 is here!')
  })

  it('accepts text that starts on the "Google Play:" line itself', () => {
    expect(extractPlayReleaseNotes(notes, '0.8.0')).toBe(
      'Added game mode "Draw 3". Happy playing!'
    )
  })

  it('matches the exact version only (0.1.0 vs 0.1.1) and tolerates heading suffixes', () => {
    expect(extractPlayReleaseNotes(notes, '0.1.0')).toBe('First version')
  })

  it('fails loudly for a missing entry, a missing block, and an empty block', () => {
    expect(() => extractPlayReleaseNotes(notes, '9.9.9')).toThrow('no "## 9.9.9" entry')
    expect(() => extractPlayReleaseNotes(notes, '0.1.1')).toThrow(
      'no "Google Play:" block'
    )
    expect(() =>
      extractPlayReleaseNotes('## 2.0.0 — 2027-01-01\n\nGoogle Play:\n\n---\n', '2.0.0')
    ).toThrow('is empty')
  })

  it("fails over Play's 500-character limit (counted in code points)", () => {
    const limit = 'x'.repeat(PLAY_RELEASE_NOTES_MAX_CHARS)
    expect(
      extractPlayReleaseNotes(`## 2.0.0 — d\n\nGoogle Play:\n${limit}\n`, '2.0.0')
    ).toBe(limit)
    expect(() =>
      extractPlayReleaseNotes(`## 2.0.0 — d\n\nGoogle Play:\n${limit}y\n`, '2.0.0')
    ).toThrow('501 characters')
  })

  it('finds the current app.json version in the real release notes', () => {
    const root = path.resolve(__dirname, '..', '..', '..')
    const { version } = JSON.parse(
      fs.readFileSync(path.join(root, 'app.json'), 'utf8')
    ).expo
    const markdown = fs.readFileSync(path.join(root, 'docs', 'RELEASE-NOTES.md'), 'utf8')
    expect(extractPlayReleaseNotes(markdown, version).length).toBeGreaterThan(0)
  })
})

describe('playReleaseName', () => {
  it('names releases "<major.minor> Beta" like the manual releases', () => {
    expect(playReleaseName('1.1.0')).toBe('1.1 Beta')
    expect(playReleaseName('1.0.0')).toBe('1.0 Beta')
    expect(playReleaseName('2.10.3')).toBe('2.10 Beta')
    expect(() => playReleaseName('v1')).toThrow('Cannot derive')
  })
})
