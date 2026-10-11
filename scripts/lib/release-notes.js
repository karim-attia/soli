/**
 * Release-notes helpers for the store upload scripts (release-automation plan,
 * 2026-10-11). docs/RELEASE-NOTES.md is the single place Karim writes notes;
 * each `## <version> — <date>` entry carries a long list for humans plus a
 * short block under a `Google Play:` line that is what Play users see. This
 * module pulls that block out so scripts/submit-android.js can put it into
 * the Play release instead of someone pasting it into the Console.
 *
 * Node stdlib only; unit-tested in test/unit/scripts/release-notes.test.ts.
 */

// Play rejects release notes above 500 Unicode characters per language
// (support.google.com/googleplay/android-developer/answer/9859348); the API
// fails the whole track update, so we fail before uploading 120 MB.
const PLAY_RELEASE_NOTES_MAX_CHARS = 500

// Play release names are Console-only labels (not shown to users). Soli names
// open-testing releases "<major.minor> Beta" ("1.0 Beta", "1.1 Beta") — kept
// as a convention here so every agent-run release matches the manual ones.
const playReleaseName = (version) => {
  const match = /^(\d+)\.(\d+)(?:\.\d+)?$/.exec(version)
  if (!match) {
    throw new Error(`Cannot derive a Play release name from version "${version}"`)
  }
  return `${match[1]}.${match[2]} Beta`
}

/**
 * Returns the text under `Google Play:` of the `## <version> …` entry, trimmed.
 * Throws when the entry or the block is missing, empty, or over Play's limit.
 */
const extractPlayReleaseNotes = (markdown, version) => {
  const entry = markdown
    .split(/^## /m)
    .find(
      (section) => section.startsWith(`${version} `) || section.startsWith(`${version}\n`)
    )
  if (!entry) {
    throw new Error(`docs/RELEASE-NOTES.md has no "## ${version}" entry`)
  }

  const lines = entry.split(/\r?\n/)
  const markerIndex = lines.findIndex((line) => /^Google Play:/.test(line.trim()))
  if (markerIndex === -1) {
    throw new Error(`docs/RELEASE-NOTES.md entry ${version} has no "Google Play:" block`)
  }

  const body = [lines[markerIndex].trim().slice('Google Play:'.length)]
  for (const line of lines.slice(markerIndex + 1)) {
    if (/^---\s*$/.test(line)) {
      break // entry separator
    }
    body.push(line)
  }
  const text = body.join('\n').trim()
  if (!text) {
    throw new Error(
      `docs/RELEASE-NOTES.md entry ${version}: the "Google Play:" block is empty`
    )
  }
  const length = [...text].length // code points, like Play's "Unicode characters"
  if (length > PLAY_RELEASE_NOTES_MAX_CHARS) {
    throw new Error(
      `docs/RELEASE-NOTES.md entry ${version}: "Google Play:" text is ${length} characters, Play allows ${PLAY_RELEASE_NOTES_MAX_CHARS}`
    )
  }
  return text
}

module.exports = {
  PLAY_RELEASE_NOTES_MAX_CHARS,
  playReleaseName,
  extractPlayReleaseNotes,
}
