#!/usr/bin/env node

/**
 * Upload the locally built AAB to Google Play's open-testing track as a named
 * release with the "Google Play:" notes from docs/RELEASE-NOTES.md (en-US) and
 * store/release-notes/* (every other Play language). Since the store launch
 * (2026-11-28) it also promotes an uploaded versionCode to production with a
 * staged rollout and pushes the 18 store listings from store/android/*.
 *
 *   yarn submit:android [--dry-run] [--hold-review] [--aab <path>]
 *                       [--track beta|production] [--rollout <0-1>] [--promote]
 *                       [--listings | --listings-only]
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
const {
  PLAY_RELEASE_NOTES_MAX_CHARS,
  extractPlayReleaseNotes,
  playReleaseName,
} = require('./lib/release-notes')
const { playListings, playReleaseNotes } = require('./lib/store-listings')

// Play API track ids (developers.google.com/android-publisher/tracks): Console
// "Open testing" = beta (Soli's testers, the default), "Production" = production.
const TRACKS = ['beta', 'production']
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
                          [--track beta|production] [--rollout <0-1>] [--promote]
                          [--listings | --listings-only]

  --dry-run      Validate everything locally and print the release that would
                 be sent; never talks to Google.
  --hold-review  Commit with changesNotSentForReview=true: Play saves the
                 release but Karim must press "Send changes for review" in
                 Play Console → Publishing overview. Default: Play reviews and
                 rolls out automatically (managed publishing is OFF).
  --aab <path>   AAB to upload (default: ${path.relative(REPOSITORY_ROOT, DEFAULT_AAB_PATH)})
  --track <id>   beta (default, "Open testing", release "<major.minor> Beta")
                 or production (release "<version>")
  --rollout <f>  Staged rollout to a fraction 0 < f < 1 (status inProgress);
                 default: completed (everyone on the track)
  --promote      No upload: release the app.json versionCode that is already
                 on Play (uploaded to open testing before) on --track
  --listings     Also replace the store listings (title, short and full
                 description) of all 18 Play languages from store/android/*
  --listings-only  Only the listings: no upload, no track change`

const parseArgs = (argv) => {
  const options = {
    dryRun: false,
    holdReview: false,
    aabPath: DEFAULT_AAB_PATH,
    track: 'beta',
    rollout: undefined,
    promote: false,
    listings: false,
    release: true,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--hold-review') options.holdReview = true
    else if (arg === '--promote') options.promote = true
    else if (arg === '--listings') options.listings = true
    else if (arg === '--listings-only')
      Object.assign(options, { listings: true, release: false })
    else if (arg === '--aab' && argv[index + 1])
      options.aabPath = path.resolve(argv[(index += 1)])
    else if (arg === '--track' && TRACKS.includes(argv[index + 1]))
      options.track = argv[(index += 1)]
    else if (
      arg === '--rollout' &&
      Number(argv[index + 1]) > 0 &&
      Number(argv[index + 1]) < 1
    )
      options.rollout = Number(argv[(index += 1)])
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

// Localized release notes for every Play language from store/release-notes/*.
// docs/RELEASE-NOTES.md stays where the English is written (and the gate), so
// en-US.txt must be an exact copy of its "Google Play:" block.
const loadReleaseNotes = (version) => {
  const english = extractPlayReleaseNotes(
    fs.readFileSync(path.join(REPOSITORY_ROOT, 'docs', 'RELEASE-NOTES.md'), 'utf8'),
    version
  )
  const notes = playReleaseNotes()
  if (notes.find(({ language }) => language === 'en-US').text !== english) {
    throw new Error(
      `store/release-notes/en-US.txt differs from the "Google Play:" block of ${version} in docs/RELEASE-NOTES.md — copy it over (and re-translate if the meaning changed)`
    )
  }
  const tooLong = notes.filter(
    ({ text }) => [...text].length > PLAY_RELEASE_NOTES_MAX_CHARS
  )
  if (tooLong.length > 0) {
    throw new Error(
      `Release notes over ${PLAY_RELEASE_NOTES_MAX_CHARS} characters: ${tooLong.map(({ language }) => language).join(', ')}`
    )
  }
  return notes
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  const { version, android } = require(path.join(REPOSITORY_ROOT, 'app.json')).expo
  const { versionCode, package: packageName } = android
  const upload = options.release && !options.promote

  let aab
  let sha256
  if (upload) {
    if (!fs.existsSync(options.aabPath)) {
      throw new Error(
        `AAB not found at ${options.aabPath} — run \`yarn build:android\` first (or pass --aab <path>, or --promote for a versionCode already on Play)`
      )
    }
    aab = fs.readFileSync(options.aabPath)
    sha256 = crypto.createHash('sha256').update(aab).digest('hex')
  }
  // Release shape per developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks.
  // Production releases are named by the version ("1.2.1"); open testing keeps
  // the "<major.minor> Beta" convention of the manual releases.
  const release = options.release
    ? {
        name: options.track === 'production' ? version : playReleaseName(version),
        versionCodes: [String(versionCode)],
        ...(options.rollout
          ? { status: 'inProgress', userFraction: options.rollout }
          : { status: 'completed' }),
        releaseNotes: loadReleaseNotes(version),
      }
    : undefined
  const listings = options.listings ? playListings() : []
  const { keyPath, exists: keyExists } = resolveKeyPath()

  log(`Package:        ${packageName}`)
  log(`Version:        ${version} (versionCode ${versionCode}) from app.json`)
  if (upload) {
    log(
      `AAB:            ${options.aabPath} (${(aab.length / 1e6).toFixed(1)} MB, sha256 ${sha256})`
    )
  } else if (release) {
    log(
      `AAB:            none (--promote: versionCode ${versionCode} must already be on Play)`
    )
  }
  if (release) {
    log(
      `Track:          ${options.track}, status ${release.status}${release.userFraction ? ` (${release.userFraction * 100} %)` : ''}`
    )
  }
  log(
    `Listings:       ${options.listings ? `${listings.length} languages from store/android/* (${listings.map(({ language }) => language).join(', ')})` : 'unchanged'}`
  )
  log(
    `Review:         ${options.holdReview ? 'HELD (changesNotSentForReview=true)' : 'sent automatically on commit'}`
  )
  log(
    `Service key:    ${keyPath} (${keyExists ? 'found' : `MISSING — set ${KEY_ENV_VAR} in .env or place the file there`})`
  )
  if (release) {
    log(
      `tracks.update body:\n${JSON.stringify({ track: options.track, releases: [release] }, null, 2)}`
    )
  }
  for (const listing of listings) {
    log(
      `listing ${listing.language}: "${listing.title}" · "${listing.shortDescription}" · full ${[...listing.fullDescription].length} chars`
    )
  }

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
  log(`Edit ${edit.id} opened.`)

  if (upload) {
    log('Uploading AAB...')
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
  } else if (release) {
    const { bundles = [] } = await play('GET', `${editsUrl}/${edit.id}/bundles`)
    if (!bundles.some((bundle) => bundle.versionCode === versionCode)) {
      throw new Error(
        `--promote: versionCode ${versionCode} is not on Play yet (bundles: ${bundles.map((bundle) => bundle.versionCode).join(', ')}) — upload it to open testing first. Edit left uncommitted.`
      )
    }
  }

  // Listings first: release notes may only use languages the listing has.
  for (const listing of listings) {
    await play('PUT', `${editsUrl}/${edit.id}/listings/${listing.language}`, listing)
  }
  if (listings.length > 0) log(`${listings.length} listings replaced.`)

  if (release) {
    await play('PUT', `${editsUrl}/${edit.id}/tracks/${options.track}`, {
      track: options.track,
      releases: [release],
    })
  }

  // Cheap pre-commit check: Play reports what a commit would reject without
  // committing (edits.validate).
  await play('POST', `${editsUrl}/${edit.id}:validate`)

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

  if (release) {
    log(
      `${upload ? 'Uploaded' : 'Released'} versionCode ${versionCode} as "${release.name}" to ${options.track}.`
    )
  }
  if (listings.length > 0) log(`Committed ${listings.length} store listings.`)
  log(
    held
      ? 'Saved but NOT sent for review: Play Console → Publishing overview → "Send changes for review" (needs Karim\'s go-ahead).'
      : `Play will review the changes and publish them automatically${release ? ` (${options.track})` : ''}.`
  )
  log(PLAY_CONSOLE_TRACK_URL)
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
