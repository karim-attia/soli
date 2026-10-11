#!/usr/bin/env bash

# scripts/build-rust-solver.sh — builds the Rust solver (rust/soli-solver-ffi)
# release artifacts for mobile and drops them where the soli-solver Expo
# module expects them (module itself is Phase B; artifacts landing ahead of
# time is intended):
#   Android: modules/soli-solver/android/src/main/jniLibs/<abi>/libsoli_solver_ffi.so
#   iOS:     modules/soli-solver/ios/SoliSolver.xcframework
#
# Idempotent: previous outputs are removed first. Requires rustup + cargo;
# installs cargo-ndk and missing rustup targets on first run.
# Re-run whenever the Rust code changes, BEFORE `yarn release` / `yarn ios`.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_DIR="${ROOT_DIR}/rust"
MODULE_DIR="${ROOT_DIR}/modules/soli-solver"
HEADERS_DIR="${RUST_DIR}/soli-solver-ffi/include"
JNILIBS_DIR="${MODULE_DIR}/android/src/main/jniLibs"
XCFRAMEWORK="${MODULE_DIR}/ios/SoliSolver.xcframework"
# Matches the app's iOS deployment target (app.json / podspec Phase B).
IOS_DEPLOYMENT_TARGET="16.4"

ensure_rustup_target() {
  local target="$1"
  if ! rustup target list --installed | grep -qx "${target}"; then
    echo "==> rustup target add ${target}"
    rustup target add "${target}"
  fi
}

# All FOUR Android ABIs on purpose (2026-10-11): the Play Store bundle
# (build-android.sh) ships every ABI in android/gradle.properties, and an ABI
# split without libsoli_solver_ffi.so crashes in System.loadLibrary. A 64-bit-
# only bundle was tried first and reverted after Play warned it dropped 5,607
# device models (29% of phones/tablets, all TVs) vs 1.0.0. The 32-bit builds
# cost ~1 min and ~1 MB; the solver has no pointer-width assumptions (reviewed
# in docs/product/release-automation/release-automation.md). Dev builds
# (`yarn release`) still only package arm64-v8a.
echo "==> Android (arm64-v8a + armeabi-v7a + x86_64 + x86 via cargo-ndk)"
if ! command -v cargo-ndk >/dev/null 2>&1; then
  echo "==> cargo-ndk not found — installing"
  cargo install cargo-ndk
fi
ensure_rustup_target aarch64-linux-android
ensure_rustup_target armv7-linux-androideabi
ensure_rustup_target x86_64-linux-android
ensure_rustup_target i686-linux-android

# cargo-ndk needs an NDK; RN 0.86 pins 27.x. Pick the highest installed 27.x
# when no env var points at one (cargo-ndk v4 auto-adds the 16 KB page-size
# linker flag Play requires on NDK <= 27).
if [[ -z "${ANDROID_NDK_HOME:-}" ]]; then
  SDK_DIR="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
  NDK_CANDIDATE="$(ls -d "${SDK_DIR}/ndk/"27.* 2>/dev/null | sort -V | tail -1 || true)"
  if [[ -n "${NDK_CANDIDATE}" ]]; then
    export ANDROID_NDK_HOME="${NDK_CANDIDATE}"
    echo "==> using NDK ${ANDROID_NDK_HOME}"
  else
    echo "Error: no NDK 27.x found under ${SDK_DIR}/ndk and ANDROID_NDK_HOME unset." >&2
    exit 1
  fi
fi

rm -rf "${JNILIBS_DIR}"
mkdir -p "${JNILIBS_DIR}"
# --platform 24 matches RN 0.86 minSdk.
(cd "${RUST_DIR}" && cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 --platform 24 \
  -o "${JNILIBS_DIR}" build --release -p soli-solver-ffi)

echo "==> iOS (device + universal simulator static libs → XCFramework)"
ensure_rustup_target aarch64-apple-ios
ensure_rustup_target aarch64-apple-ios-sim
# x86_64 sim slice is REQUIRED even on Apple Silicon: the app's Release
# simulator build compiles for (arm64 x86_64), and CocoaPods'
# install_xcframework copies a slice only if it covers ALL current build
# archs — an arm64-only sim slice is silently skipped and the app link then
# fails with `ld: library 'soli_solver_ffi' not found` (hit in Phase C).
ensure_rustup_target x86_64-apple-ios

(cd "${RUST_DIR}" && \
  IPHONEOS_DEPLOYMENT_TARGET="${IOS_DEPLOYMENT_TARGET}" \
  cargo build --release --target aarch64-apple-ios -p soli-solver-ffi)
(cd "${RUST_DIR}" && \
  IPHONEOS_DEPLOYMENT_TARGET="${IOS_DEPLOYMENT_TARGET}" \
  cargo build --release --target aarch64-apple-ios-sim -p soli-solver-ffi)
(cd "${RUST_DIR}" && \
  IPHONEOS_DEPLOYMENT_TARGET="${IOS_DEPLOYMENT_TARGET}" \
  cargo build --release --target x86_64-apple-ios -p soli-solver-ffi)

SIM_UNIVERSAL_DIR="${RUST_DIR}/target/ios-sim-universal/release"
mkdir -p "${SIM_UNIVERSAL_DIR}"
lipo -create \
  "${RUST_DIR}/target/aarch64-apple-ios-sim/release/libsoli_solver_ffi.a" \
  "${RUST_DIR}/target/x86_64-apple-ios/release/libsoli_solver_ffi.a" \
  -output "${SIM_UNIVERSAL_DIR}/libsoli_solver_ffi.a"

rm -rf "${XCFRAMEWORK}"
mkdir -p "${MODULE_DIR}/ios"
xcodebuild -create-xcframework \
  -library "${RUST_DIR}/target/aarch64-apple-ios/release/libsoli_solver_ffi.a" \
  -headers "${HEADERS_DIR}" \
  -library "${SIM_UNIVERSAL_DIR}/libsoli_solver_ffi.a" \
  -headers "${HEADERS_DIR}" \
  -output "${XCFRAMEWORK}"

echo
echo "==> Artifacts"
find "${JNILIBS_DIR}" -name '*.so' -exec ls -lh {} \;
du -sh "${XCFRAMEWORK}"
find "${XCFRAMEWORK}" -name '*.a' -exec ls -lh {} \;
echo "Done."
