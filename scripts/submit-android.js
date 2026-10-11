#!/usr/bin/env node

/**
 * Upload the locally built AAB to Google Play's open-testing track as a named
 * release with the "Google Play:" notes from docs/RELEASE-NOTES.md.
 *
 *   yarn submit:android [--dry-run] [--hold-review] [--aab <path>]
 *
 * Why a 150-line script and not `eas submit` / fastlane (release-automation
 * plan, 2026-10-11): `eas submit -p android` cannot set the release NAME or
 * the RELEASE NOTES (eas.json only knows track/releaseStatus/rollout/
 * changesNotSentForReview), so every release would still end in the Console
 * UI; fastlane supply can, but drags in a Ruby toolchain for one call. The
 * Play Developer API flow is four requests (edits.insert → bundles.upload →
 * tracks.update → edits.commit) and Node's stdlib covers the service-account
 * JWT (crypto.sign RS256) and the HTTP (fetch). Guide:
 * docs/external-package-guides/google-play-developer-api.md.
 *
 * Nothing is consumed on Play until edits.commit: a versionCode/sha256
 * mismatch after the upload aborts with the edit uncommitted. The browser
 * agent cannot upload files above 10 MB, which is the reason this exists.
 */

const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  ENV_FILE_PATH,
  REPOSITORY_ROOT,
  log,
  logError,
  parseEnvFile,
} = require('./lib/build-tools')
const { extractPlayReleaseNotes, playReleaseName } = require('./lib/release-notes')

// Play API track id of the Console's "Open testing" track
// (developers.google.com/android-publisher/tracks). Soli's testers live there.
const TRACK = 'beta'
const RELEASE_NOTES_LANGUAGE = 'en-US'
const DEFAULT_AAB_PATH = path.join(
  REPOSITORY_ROOT,
  'android/app/build/outputs/bundle/release/app-release.aab'
)
// Service-account key: outside the repo, like the upload keystore. The env var
// (set in .env) wins; the default is the conventional location.
const KEY_ENV_VAR = 'SOLI_PLAY_SERVICE_ACCOUNT_KEY'
const DEFAULT_KEY_PATH = path.join(
  os.homedir(),
  '.config',
  'soli',
  'play-service-account.json'
)
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/androidpublisher'
const API_ROOT = 'https://androidpublisher.googleapis.com'
// Console deep link printed at the end (ids are URL parts, not secrets).
const PLAY_CONSOLE_TRACK_URL =
  'https://play.google.com/console/u/0/developers/5772991807588369431/app/4974901385199648938/tracks/open-testing'

const USAGE = `Usage: yarn submit:android [--dry-run] [--hold-review] [--aab <path>]

  --dry-run      Validate everything locally and print the release that would
                 be sent; never talks to Google.
  --hold-review  Commit with changesNotSentForReview=true: Play saves the
                 release but Karim must press "Send changes for review" in
                 Play Console → Publishing overview. Default: Play reviews and
                 rolls out automatically (managed publishing is OFF).
  --aab <path>   AAB to upload (default: ${path.relative(REPOSITORY_ROOT, DEFAULT_AAB_PATH)})`

const parseArgs = (argv) => {
  const options = { dryRun: false, holdReview: false, aabPath: DEFAULT_AAB_PATH }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--hold-review') options.holdReview = true
    else if (arg === '--aab' && argv[index + 1])
      options.aabPath = path.resolve(argv[(index += 1)])
    else if (arg === '--help' || arg === '-h') {
      console.log(USAGE)
      process.exit(0)
    } else throw new Error(`Unknown argument "${arg}"\n${USAGE}`)
  }
  return options
}

const resolveKeyPath = () => {
  if (!process.env[KEY_ENV_VAR] && fs.existsSync(ENV_FILE_PATH)) {
    const fromEnvFile = parseEnvFile(fs.readFileSync(ENV_FILE_PATH, 'utf8'))[KEY_ENV_VAR]
    if (fromEnvFile) process.env[KEY_ENV_VAR] = fromEnvFile
  }
  const keyPath = (process.env[KEY_ENV_VAR] ?? DEFAULT_KEY_PATH).replace(
    /^~(?=\/)/,
    os.homedir()
  )
  return { keyPath, exists: fs.existsSync(keyPath) }
}

// OAuth2 service-account flow, REST variant: a self-signed RS256 JWT is
// exchanged for a bearer token (developers.google.com/identity/protocols/oauth2/service-account).
const fetchAccessToken = async (key) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const tokenUri = key.token_uri ?? 'https://oauth2.googleapis.com/token'
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: key.client_email,
    scope: OAUTH_SCOPE,
    aud: tokenUri,
    iat: now,
    exp: now + 600,
  })}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.private_key)
  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature.toString('base64url')}`,
    }),
  })
  const payload = await response.json()
  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Token request failed (HTTP ${response.status}): ${JSON.stringify(payload)}`
    )
  }
  return payload.access_token
}

const createPlayClient = (token) => async (method, url, body) => {
  const isBinary = Buffer.isBuffer(body)
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body
        ? { 'content-type': isBinary ? 'application/octet-stream' : 'application/json' }
        : {}),
    },
    body: isBinary ? body : body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${method} ${url} → HTTP ${response.status}\n${text}`)
  }
  return text ? JSON.parse(text) : {}
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  const { version, android } = require(path.join(REPOSITORY_ROOT, 'app.json')).expo
  const { versionCode, package: packageName } = android

  if (!fs.existsSync(options.aabPath)) {
    throw new Error(
      `AAB not found at ${options.aabPath} — run \`yarn build:android\` first (or pass --aab <path>)`
    )
  }
  const aab = fs.readFileSync(options.aabPath)
  const sha256 = crypto.createHash('sha256').update(aab).digest('hex')
  const releaseNotes = extractPlayReleaseNotes(
    fs.readFileSync(path.join(REPOSITORY_ROOT, 'docs', 'RELEASE-NOTES.md'), 'utf8'),
    version
  )
  // Release shape per developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks
  const release = {
    name: playReleaseName(version),
    versionCodes: [String(versionCode)],
    status: 'completed',
    releaseNotes: [{ language: RELEASE_NOTES_LANGUAGE, text: releaseNotes }],
  }
  const { keyPath, exists: keyExists } = resolveKeyPath()

  log(`Package:        ${packageName}`)
  log(`Version:        ${version} (versionCode ${versionCode}) from app.json`)
  log(
    `AAB:            ${options.aabPath} (${(aab.length / 1e6).toFixed(1)} MB, sha256 ${sha256})`
  )
  log(`Track:          ${TRACK} (Play Console "Open testing"), status ${release.status}`)
  log(
    `Review:         ${options.holdReview ? 'HELD (changesNotSentForReview=true)' : 'sent automatically on commit'}`
  )
  log(
    `Service key:    ${keyPath} (${keyExists ? 'found' : `MISSING — set ${KEY_ENV_VAR} in .env or place the file there`})`
  )
  log(
    `tracks.update body:\n${JSON.stringify({ track: TRACK, releases: [release] }, null, 2)}`
  )

  if (options.dryRun) {
    log(
      keyExists
        ? 'Dry run — nothing was sent to Google.'
        : 'Dry run — nothing was sent to Google. A real run would FAIL: service-account key missing.'
    )
    return
  }
  if (!keyExists) {
    throw new Error(
      `Google Play service-account key not found at ${keyPath}. Set ${KEY_ENV_VAR}=<path> in .env (file lives outside the repo; see docs/external-package-guides/google-play-developer-api.md).`
    )
  }

  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  const play = createPlayClient(await fetchAccessToken(key))
  const editsUrl = `${API_ROOT}/androidpublisher/v3/applications/${packageName}/edits`
  const edit = await play('POST', editsUrl, {})
  log(`Edit ${edit.id} opened; uploading AAB...`)

  const bundle = await play(
    'POST',
    `${API_ROOT}/upload/androidpublisher/v3/applications/${packageName}/edits/${edit.id}/bundles?uploadType=media`,
    aab
  )
  // Uncommitted edits expire on their own — aborting here consumes nothing.
  if (bundle.versionCode !== versionCode) {
    throw new Error(
      `Uploaded AAB has versionCode ${bundle.versionCode}, app.json says ${versionCode} — edit left uncommitted. Rebuild with \`yarn build:android\`.`
    )
  }
  if (bundle.sha256 !== sha256) {
    throw new Error(
      `Play's sha256 ${bundle.sha256} differs from the local ${sha256} — edit left uncommitted, retry.`
    )
  }
  log(`Bundle accepted (versionCode ${bundle.versionCode}, sha256 matches).`)

  await play('PUT', `${editsUrl}/${edit.id}/tracks/${TRACK}`, {
    track: TRACK,
    releases: [release],
  })

  // Play sometimes refuses to auto-send changes for review (e.g. other
  // changes pending) and asks for changesNotSentForReview=true — retry once
  // that way instead of losing the upload; Karim then sends it from the
  // Publishing overview, exactly like the manual flow.
  const commitUrl = (hold) =>
    `${editsUrl}/${edit.id}:commit?changesNotSentForReview=${hold}`
  let held = options.holdReview
  try {
    await play('POST', commitUrl(held))
  } catch (error) {
    if (held || !String(error.message).includes('changesNotSentForReview')) throw error
    log(
      'Play refused to send the changes for review automatically — committing with changesNotSentForReview=true instead.'
    )
    held = true
    await play('POST', commitUrl(true))
  }

  log(`Uploaded versionCode ${versionCode} as "${release.name}" to ${TRACK}.`)
  log(
    held
      ? 'Saved but NOT sent for review: Play Console → Publishing overview → "Send changes for review" (needs Karim\'s go-ahead).'
      : 'Play will review and roll it out to open testing automatically.'
  )
  log(PLAY_CONSOLE_TRACK_URL)
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
