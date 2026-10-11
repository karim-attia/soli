#!/usr/bin/env node

/**
 * Ensure the Rust solver artifacts exist and match the current Rust sources.
 *
 * The built artifacts (jniLibs .so files + SoliSolver.xcframework) are
 * deliberately NOT committed — see docs/product/hints/
 * hints-and-unwinnable-warning.md, "Artifacts-in-git decision (2026-07-23)".
 * This script is the correctness mechanism that replaces committing them:
 * a sha256 fingerprint over rust/ sources + scripts/build-rust-solver.sh is
 * stored next to the artifacts; any drift (or a fresh clone with no
 * artifacts) triggers a rebuild when the Rust toolchain is available, or a
 * loud actionable failure when it is not. A committed artifact could go
 * silently stale — this cannot.
 *
 * Wired into every local build path (scripts/build-install-android.js,
 * scripts/build-install-ios.js, build-android.sh, package.json build:ios).
 * The match fast-path is silent and must stay well under 1 s.
 *
 * Node stdlib only; exports ensureRustSolverArtifacts() for the build
 * entries and runs it directly when invoked as a script.
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const REPOSITORY_ROOT = path.resolve(__dirname, '..')
const RUST_DIR = path.join(REPOSITORY_ROOT, 'rust')
const BUILD_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts', 'build-rust-solver.sh')
const MODULE_DIR = path.join(REPOSITORY_ROOT, 'modules', 'soli-solver')
const FINGERPRINT_PATH = path.join(MODULE_DIR, '.artifacts-fingerprint.json')

// All six artifacts the build script produces; a missing one means a broken
// or partial build regardless of what the fingerprint says. The four Android
// ABIs match android/gradle.properties `reactNativeArchitectures` — the Play
// bundle must never ship an ABI split without the solver (see the comment in
// scripts/build-rust-solver.sh, 2026-10-11).
const ARTIFACT_PATHS = [
  'android/src/main/jniLibs/arm64-v8a/libsoli_solver_ffi.so',
  'android/src/main/jniLibs/armeabi-v7a/libsoli_solver_ffi.so',
  'android/src/main/jniLibs/x86_64/libsoli_solver_ffi.so',
  'android/src/main/jniLibs/x86/libsoli_solver_ffi.so',
  'ios/SoliSolver.xcframework/ios-arm64/libsoli_solver_ffi.a',
  'ios/SoliSolver.xcframework/ios-arm64_x86_64-simulator/libsoli_solver_ffi.a',
].map((rel) => path.join(MODULE_DIR, rel))

const log = (message) => {
  console.log(`\x1b[36m[soli]\x1b[0m ${message}`)
}

// Every file under rust/ except build output (any dir named "target") and
// macOS noise, as repo-relative paths with stable (sorted) ordering.
const listFingerprintInputs = () => {
  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.DS_Store') {
        continue
      }
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'target') {
          walk(fullPath)
        }
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }
  }
  walk(RUST_DIR)
  files.push(BUILD_SCRIPT) // build flags/targets shape the artifacts too
  return files.map((file) => path.relative(REPOSITORY_ROOT, file)).sort()
}

const computeFingerprint = () => {
  const hash = crypto.createHash('sha256')
  for (const relPath of listFingerprintInputs()) {
    // Path + NUL + bytes + NUL: renames and file-boundary shifts both count.
    hash.update(relPath)
    hash.update('\0')
    hash.update(fs.readFileSync(path.join(REPOSITORY_ROOT, relPath)))
    hash.update('\0')
  }
  return hash.digest('hex')
}

const readStoredFingerprint = () => {
  try {
    return JSON.parse(fs.readFileSync(FINGERPRINT_PATH, 'utf8')).fingerprint ?? null
  } catch {
    return null // missing or corrupt → treat as stale
  }
}

const missingArtifacts = () => ARTIFACT_PATHS.filter((file) => !fs.existsSync(file))

const commandVersion = (command) => {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim().split('\n')[0] : null
}

const TOOLCHAIN_HELP = [
  'The Rust solver artifacts are gitignored and must be built locally, but no',
  'Rust toolchain was found on PATH. Install it once:',
  '',
  '  brew install rustup && rustup-init -y',
  '  (then restart the shell so cargo/rustup are on PATH)',
  '',
  'scripts/build-rust-solver.sh self-installs all cross-compile targets',
  'and cargo-ndk on first run. Re-run the build afterwards.',
].join('\n')

/**
 * Throws with an actionable message when the artifacts cannot be made
 * current; returns silently (fast, <1 s) when everything already matches.
 */
const ensureRustSolverArtifacts = () => {
  const expected = computeFingerprint()
  const stored = readStoredFingerprint()
  const missing = missingArtifacts()
  if (missing.length === 0 && stored === expected) {
    return // fast path: sources unchanged, all artifacts present
  }

  const reason = missing.length
    ? `missing artifact(s): ${missing
        .map((file) => path.relative(REPOSITORY_ROOT, file))
        .join(', ')}`
    : stored === null
      ? 'no fingerprint recorded yet for the existing artifacts'
      : 'rust/ sources changed since the artifacts were built'
  log(`Rust solver artifacts are stale (${reason}) — rebuilding...`)

  if (!commandVersion('cargo') || !commandVersion('rustup')) {
    throw new Error(`Rust solver artifacts are stale (${reason}).\n${TOOLCHAIN_HELP}`)
  }

  const build = spawnSync(BUILD_SCRIPT, [], {
    cwd: REPOSITORY_ROOT,
    stdio: 'inherit',
  })
  if (build.status !== 0) {
    throw new Error(
      `scripts/build-rust-solver.sh failed (exit ${build.status ?? 'signal'}). Fix the Rust build, then rerun.`
    )
  }

  const stillMissing = missingArtifacts()
  if (stillMissing.length) {
    throw new Error(
      `Rust solver build finished but artifact(s) are still missing: ${stillMissing.join(', ')}`
    )
  }

  // Written only after a verified-successful build. rustcVersion is recorded
  // for forensics but deliberately does NOT gate rebuilds — a plain
  // `rustup update` should not force a 4-target rebuild.
  fs.writeFileSync(
    FINGERPRINT_PATH,
    `${JSON.stringify(
      {
        fingerprint: expected,
        builtAt: new Date().toISOString(),
        rustcVersion: commandVersion('rustc'),
      },
      null,
      2
    )}\n`
  )
  log('Rust solver artifacts rebuilt and fingerprint updated.')
}

module.exports = { ensureRustSolverArtifacts }

if (require.main === module) {
  try {
    ensureRustSolverArtifacts()
  } catch (error) {
    console.error(
      `\x1b[31m[soli]\x1b[0m ${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }
}
