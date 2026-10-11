# Rust Mobile Guide

Last refreshed: 2026-07-12

## Scope

- Package/tool: `uniffi`, `cargo-ndk`, and Rust mobile bridge tooling
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

Date researched: 2026-06-17

## Source links

- React Native Turbo Native Modules: https://reactnative.dev/docs/turbo-native-modules-introduction
- Expo native module tutorial: https://docs.expo.dev/modules/native-module-tutorial/
- Expo modules API reference: https://docs.expo.dev/modules/module-api/
- UniFFI docs: https://docs.rs/crate/uniffi/latest
- UniFFI for React Native: https://github.com/jhugman/uniffi-bindgen-react-native
- UniFFI for React Native docs: https://jhugman.github.io/uniffi-bindgen-react-native/
- cargo-ndk: https://github.com/bbqsrc/cargo-ndk
- Android NDK ABIs: https://developer.android.com/ndk/guides/abis
- Rust rand `SmallRng`: https://docs.rs/rand/latest/rand/rngs/struct.SmallRng.html
- Rust Rand reproducibility: https://rust-random.github.io/book/crate-reprod.html
- MIT license text: https://opensource.org/license/mit

## Rust in a React Native / Expo app

Rust can run inside native iOS and Android apps, but it is not "just import a crate from TypeScript." It needs a native module boundary.

Likely integration paths:

- Expo Module wrapping a native library.
- React Native Turbo Native Module.
- UniFFI-generated Swift/Kotlin bindings, optionally with `uniffi-bindgen-react-native`.
- Manual C ABI/JNI/Swift bridging.

For this app, an Expo Module or Turbo Module wrapper is the most natural app-facing shape. UniFFI is attractive because it can generate cross-platform bindings from one Rust API instead of hand-writing Swift and Kotlin glue.

## Android build notes

Android needs Rust compiled into native `.so` libraries for target ABIs. `cargo-ndk` is the common helper because it configures Android NDK builds and can generate the correct `jniLibs` structure.

## iOS build notes

iOS needs Rust compiled as a static or dynamic library for iOS simulator and device targets, then linked through Xcode/CocoaPods or an Expo native module. The build scripts must produce separate simulator/device artifacts or an XCFramework.

## Performance expectations

Generating a deck/tableau from a seed is tiny work and does not require shipping Rust. JavaScript or TypeScript can do it instantly if the shuffle algorithm is fixed and simple.

Running the solver on-device is different. Lonelybot is very fast on local desktop tests, but worst-case solving can still take milliseconds to seconds depending on draw step and position. In-app solving should therefore be asynchronous, cancelable, and bounded. A hint button can ask for "first solving move within budget" instead of blocking the UI until a proof is complete.

## Seed reproducibility warning

Lonelybot `default` currently uses `SmallRng::seed_from_u64(seed)` and `SliceRandom::shuffle`. `SmallRng` is deterministic for a given build, but its docs describe it as a small, fast generator, not a portable deal standard. Some `rand` documentation has explicitly warned that small RNG algorithms may change and should not be treated as reproducible across versions/platforms.

Do not make Lonelybot `default` seeds the only durable on-device identity unless we also freeze:

- lonelybot version/commit
- `rand` version
- exact shuffle implementation
- card ordering
- stock/tableau orientation

Safer options:

- Store the canonical 52-card permutation.
- Store Lonelybot `exact` seed, which encodes the permutation.
- Define our own app seed type using a named stable PRNG and checked fixture tests.
- Store both `seed` and a compact deck checksum/permutation for migration confidence.

## License note

Lonelybot's local `LICENSE` is MIT. MIT is permissive and generally allows use, modification, distribution, sublicensing, and sale as long as the copyright and permission notice are included. This is not legal advice, but there is no GPL-style copyleft issue from Lonelybot itself.

## Recommended app boundary

Phase 1: do not ship Rust. Generate and solve offline, ship a compact curated index.

Phase 2: if hint/current-position solving becomes a real product feature, ship a Rust native module with:

- `generateDeal(seedType, seed) -> Deal`
- `solveInitial(seedType, seed, drawCount, budgetMs) -> SolveResult`
- `solvePosition(position, drawCount, budgetMs) -> SolveResult`
- `nextHint(position, drawCount, budgetMs) -> HintResult`

The module should never run long work on the JS thread.

## Refresh check (2026-07-03)

- Status: still useful as the "do not ship Rust yet" boundary, with updated
  version facts for future native-module planning.
- Current checks: `uniffi` latest is `0.32.0`, `uniffi-bindgen-react-native` npm
  latest is `0.31.0-3`, `cargo-ndk` latest is `4.1.2`, and `rand` latest is
  `0.10.2`.
- The React Native Turbo Native Modules docs now explicitly target the New
  Architecture path; for Expo SDK 56, an Expo Module remains the most natural
  app-facing wrapper if this product ever needs in-app solving.
- `uniffi-bindgen-react-native` now also documents `@ubjs/core` and `@ubjs/node`
  package identities. Treat it as a serious option for a future cross-platform
  Rust API, but only after a dedicated spike because it adds generated native
  code, JSI/TurboModule wiring, and platform build complexity.
- The `SmallRng` warning is stronger, not weaker: Rust Rand documents limited
  reproducibility guarantees and permits value-breaking changes for
  non-portable deterministic items. Store exact deck identity or a named stable
  PRNG/permutation format for app data.

## Refresh (2026-07-12): Bundling a Rust solver as a local Expo module

Date researched: 2026-07-12. Scope: how to ship a small single-threaded Rust
Klondike solver in this app (Expo SDK 57 / RN 0.86 New Architecture, CNG
prebuild, iOS 16.4+, Android `ch.karimattia.soli`), exposing 1-3 async JS
functions (e.g. `solvePosition(stateJson, budgetMs) -> resultJson`) that run
off the JS thread with cooperative cancellation.

### Recommendation: manual C-ABI local Expo module (not UBRN)

Ship a **local Expo module** (`modules/soli-solver/`) whose Swift/Kotlin
`AsyncFunction`s call the Rust library over a hand-written `extern "C"` ABI
with JSON strings in/out. Do not use `uniffi-bindgen-react-native` (UBRN) for
this. Reasoning, specific to this app:

- The API surface is tiny (1-3 functions, JSON string in/out, cancel flag).
  UniFFI's value — generated bindings for a rich object graph — buys little
  here, while UBRN's cost is high: it is built around a separate
  `create-react-native-library`/builder-bob npm-package workflow, generates
  C++ JSI glue + codegen TurboModule wiring + its own podspec/CMakeLists, and
  its own docs still say "early development, should not yet be used in
  production" (checked 2026-07-12).
- Expo local modules in `modules/` are autolinked with zero config, survive
  `expo prebuild --clean`, and Expo's `AsyncFunction` already runs on a
  background thread by default — we get the threading model for free.
- Crucially, UBRN's async support does NOT give background execution: Rust
  `async fn`s are polled from the JS thread, and their docs state
  "Dispatching to a background thread is an exercise for the developer on the
  Rust side of the FFI." A CPU-bound solver would still need a hand-rolled
  thread + oneshot future in Rust. The manual Expo module gets the same result
  with `AsyncFunction` and no extra machinery.
- UBRN's TurboModule install path has had RN-version-coupled breakage (e.g.
  `mHybridData` crash on RN 0.80+/Expo 54, fixed in a later release). A plain
  Expo module tracks Expo SDK upgrades with no generated-glue risk.

Reconsider UBRN if the Rust API grows into many types/objects/callbacks
(then its codegen pays off), or once it declares production readiness. It is
real and maintained (v0.31.0-3, 2026-05-28; planned rename to
`uniffi-bindgen-javascript`; new `@ubjs/core` runtime package; used by
Unomed/Matrix and Loro), just wrong-sized for 3 JSON functions in a CNG app.

### Key verified facts (with confidence)

| Fact | Confidence | Source |
| --- | --- | --- |
| Local modules in `modules/` are auto-discovered by Expo Autolinking (default `nativeModulesDir: "./modules"`), need `expo-module.config.json`; not an npm package. Scaffold: `npx create-expo-module@latest --local` | High (docs + `expo-modules-autolinking` source in this repo; local modules get a mock name if `package.json` is absent) | [Autolinking docs](https://docs.expo.dev/modules/autolinking), [create-expo-module](https://docs.expo.dev/more/create-expo-module/) |
| Swift `AsyncFunction` runs on a dedicated serial `DispatchQueue` `expo.modules.AsyncFunctionQueue` (qos `.userInitiated`), NOT the JS thread. `async` closure bodies use Swift concurrency (`ConcurrentFunctionDefinition`) | High (read `AsyncFunctionDefinition.swift` in expo-modules-core 57.0.3 in this repo) | [Module API](https://docs.expo.dev/modules/module-api) |
| Kotlin `AsyncFunction` launches on `appContext.modulesQueue` — a coroutine dispatcher backed by a dedicated `HandlerThread` `expo.modules.AsyncFunctionQueue`. `Coroutine {}` suspend bodies use the same queue by default; `.runOnQueue()`/custom `CoroutineScope` supported | High (read `AppContext.kt`, `SuspendFunctionComponent.kt` in expo-modules-core 57.0.3) | same |
| One shared async queue per platform means a long solve blocks OTHER async functions of our modules — fine for a solver, but use a custom queue/dispatcher if it ever matters | High (source) | same |
| iOS: vendor the Rust lib via `s.vendored_frameworks = 'Frameworks/SoliSolver.xcframework'` (or `s.vendored_libraries` for a plain `.a`); path must live under `ios/` (no `..` traversal); keep `source_files` from matching framework internals | High | [Expo third-party library guide](https://docs.expo.dev/modules/third-party-library) |
| Android: drop `.so` files into `modules/<name>/android/src/main/jniLibs/<abi>/`; AGP picks them up with no gradle changes. `cargo ndk -o` writes that layout directly | High (multiple working examples) | [claas.dev Expo+Rust](https://claas.dev/posts/expo-with-rust/), [dgca/expo-rust-demo](https://github.com/dgca/expo-rust-demo), [cargo-ndk README](https://github.com/bbqsrc/cargo-ndk) |
| RN 0.86 pins NDK 27.1.12297006, AGP 8.12, minSdk 24 (checked `node_modules/react-native/gradle/libs.versions.toml`) | High | local file |
| 16 KB pages: Google Play REQUIRES 16 KB-compatible `.so` for apps targeting Android 15+ since 2025-11-01. NDK r28+ aligns by default; r27 and lower need `-Wl,-z,max-page-size=16384`. cargo-ndk (since v4.0.0, 2025-07-30; latest v4.1.2) injects the flag automatically for 64-bit targets on NDK <= 27 | High | [Android 16 KB docs](https://developer.android.com/guide/practices/page-sizes), [cargo-ndk CHANGELOG](https://github.com/bbqsrc/cargo-ndk/blob/main/CHANGELOG.md) |
| iOS Rust targets: `aarch64-apple-ios` (device) + `aarch64-apple-ios-sim` (Apple-Silicon sim); add `x86_64-apple-ios` only if Intel sim needed. `rustc` respects `IPHONEOS_DEPLOYMENT_TARGET` (set 16.4 to match app; Rust default min is far lower, so this is safe) | High | [rustc platform docs](https://doc.rust-lang.org/rustc/platform-support/apple-ios.html) |
| XCFramework: one library per platform slice; `lipo` sim archs together if both sim targets built, then `xcodebuild -create-xcframework -library ... -headers ...` | High | [Ferrostar iOS packaging](https://stadiamaps.com/blog/ferrostar-building-a-cross-platform-navigation-sdk-in-rust-part-2/) |
| Panic safety: never let a Rust panic unwind through `extern "C"`. Modern rustc aborts the process if a panic escapes an `extern "C"` fn (sound but kills the app). Best practice: `catch_unwind` at every FFI entry point and return an error payload; keep default `panic = "unwind"` in the profile if using catch_unwind (`panic = "abort"` makes catch_unwind useless) | High | [Rustonomicon FFI](https://doc.rust-lang.org/nomicon/ffi.html), [c_unwind stabilization](https://github.com/rust-lang/rust/issues/115285) |
| Size: small Rust staticlib/cdylib with `opt-level` `"s"` or `"z"`, `lto=true`, `codegen-units=1`, `strip="symbols"` lands in the hundreds of KB per ABI for a solver-sized crate (no heavyweight deps). Prefer `"s"` over `"z"` here — solver speed matters; measure both | Medium (size is crate-dependent; the profile levers themselves are well documented) | [min-sized-rust](https://github.com/johnthagen/min-sized-rust), [Rust perf book](https://nnethercote.github.io/perf-book/build-configuration.html) |
| UBRN status: v0.31.0-3 (npm 2026-05-28), supports RN New Architecture TurboModules via generated JSI C++; WASM + Node targets added; still flagged not-production-ready; Expo integration goes through a separate library package (builder-bob), needs `bob build`/prepare quirks in monorepos | High | [UBRN repo](https://github.com/jhugman/uniffi-bindgen-react-native), [UBRN book](https://jhugman.github.io/uniffi-bindgen-react-native/), [Expo feedback issue #195](https://github.com/jhugman/uniffi-bindgen-react-native/issues/195) |

### Alternatives ruled out (2026-07-12)

- **Hermes WASM**: Hermes V1 (default since RN 0.84) can now run WASM,
  including AOT-compiling `.wasm` to `.hbc` via `hermesc --wasm`. But the
  Hermes team explicitly says (2026-02): "early preview... correctness first,
  not performance. Wasm support is not yet ready for production use"; no SIMD,
  no threads — and no threads means the solver would run ON the JS thread.
  Rule out for now; re-check in ~SDK 59 timeframe, could eventually replace
  the native module entirely. Sources: [tmikov: WebAssembly Comes to Hermes](https://tmikov.blogspot.com/2026/02/webassembly-comes-to-hermes_01829874520.html), [RN 0.84 blog](https://reactnative.dev/blog/2026/02/11/react-native-0.84).
- **react-native-webassembly / polygen**: cawfree/react-native-webassembly is
  effectively dormant (last push 2023) with open Hermes-binding issues;
  callstack polygen is "active development, use at your own risk" and
  precompiles WASM to native via codegen — interesting but adds a second
  toolchain for zero benefit over a direct Rust build here. Ruled out.
- **Bundled subprocess binary**: iOS forbids spawning subprocesses
  (no `fork`/`exec` for sandboxed apps), so a bundled solver binary is a
  non-starter on iOS; ruled out without further research.

### Concrete plan (commands verified against sources above)

Layout: Rust crate at `rust/soli-solver/` (workspace-level), local Expo module
at `modules/soli-solver/` created with `npx create-expo-module@latest --local`
(name it without the `expo-` prefix). Build scripts copy artifacts into the
module; artifacts are gitignored or committed (recommend committing — see
open questions).

**Rust crate** (`rust/soli-solver/Cargo.toml`):

```toml
[lib]
crate-type = ["staticlib", "cdylib"]  # staticlib for iOS, cdylib for Android

[profile.release]
opt-level = "s"      # solver: prefer speed-leaning size opt; try "z" and measure
lto = true
codegen-units = 1
strip = "symbols"
# keep default panic = "unwind": we catch_unwind at the FFI boundary
```

**FFI surface** (`extern "C"`, JSON strings + cancel handle):

```rust
use std::ffi::{c_char, CStr, CString};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

// Opaque cancellation token. Kotlin/Swift hold it as a pointer-sized handle.
pub struct CancelToken(Arc<AtomicBool>);

#[no_mangle]
pub extern "C" fn soli_cancel_token_new() -> *mut CancelToken {
    Box::into_raw(Box::new(CancelToken(Arc::new(AtomicBool::new(false)))))
}

#[no_mangle]
pub extern "C" fn soli_cancel_token_cancel(t: *mut CancelToken) {
    if let Some(t) = unsafe { t.as_ref() } { t.0.store(true, Ordering::Relaxed); }
}

#[no_mangle]
pub extern "C" fn soli_cancel_token_free(t: *mut CancelToken) {
    if !t.is_null() { drop(unsafe { Box::from_raw(t) }); }
}

/// Returns malloc'd JSON result; caller must free with soli_string_free.
/// budget_ms and the cancel token are both cooperative: the solver checks
/// them every N thousand nodes.
#[no_mangle]
pub extern "C" fn soli_solve_position(
    state_json: *const c_char,
    budget_ms: u32,
    cancel: *const CancelToken,
) -> *mut c_char {
    let result = std::panic::catch_unwind(|| {
        let state = unsafe { CStr::from_ptr(state_json) }.to_str()?;
        let flag = unsafe { cancel.as_ref() }.map(|c| c.0.clone());
        solve(state, budget_ms, flag) // -> serde_json string
    });
    let json = match result {
        Ok(Ok(json)) => json,
        Ok(Err(e)) => format!(r#"{{"status":"error","message":{:?}}}"#, e.to_string()),
        Err(_) => r#"{"status":"error","message":"solver panicked"}"#.into(),
    };
    CString::new(json).unwrap().into_raw()
}

#[no_mangle]
pub extern "C" fn soli_string_free(s: *mut c_char) {
    if !s.is_null() { drop(unsafe { CString::from_raw(s) }); }
}
```

Threading note: the Rust side stays single-threaded and synchronous. The
native wrappers already call it from a background thread (see below), so no
Rust-side thread spawning, channels, or async runtime — simplest possible FFI.

**Android build** (cargo-ndk v4.x; NDK 27 pinned by RN 0.86 — cargo-ndk adds
the 16 KB page-size linker flag automatically for 64-bit targets on NDK <= 27):

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi \
  x86_64-linux-android i686-linux-android
cargo install cargo-ndk
# -o writes libsoli_solver.so directly into the jniLibs/<abi>/ layout.
# --platform 24 matches RN 0.86 minSdk 24.
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 --platform 24 \
  -o ../../modules/soli-solver/android/src/main/jniLibs \
  build --release
```

**Decision (2026-10-11): build all four ABIs.** The Expo template's
`android/gradle.properties` ships `armeabi-v7a,arm64-v8a,x86,x86_64`, and an
ABI split without the `.so` crashes in `System.loadLibrary`. The first 1.1.0
bundle forced `reactNativeArchitectures=arm64-v8a,x86_64` instead; Play
Console then warned it dropped 5,607 device models (29% of phones/tablets,
all Android TVs) versus 1.0.0 — "64-bit required since 2019" only means a
64-bit variant must exist, not that 32-bit devices are gone. The 32-bit
targets add ~1 min of build time and ~1 MB of artifacts. lonelybot is
pointer-width agnostic (bitboards/encodes/hasher are explicit `u64`, `usize`
only indexes small arrays), so no code changes were needed. Dev builds
(`yarn release`) still package arm64-v8a only (`scripts/lib/build-tools.js`).

Kotlin side (in `modules/soli-solver/android/.../SoliSolverModule.kt`) —
plain `external fun` + `System.loadLibrary`, no JNI_OnLoad needed if we use
JNI naming, but simpler: declare the C symbols via a tiny JNI wrapper or use
the JNI naming convention directly in Rust. Two working options; the
zero-extra-dependency one is JNI-named exports in Rust
(`Java_ch_karimattia_soli_solver_SoliSolverJni_solvePosition`-style, using the
`jni` crate for `JNIEnv`/`jstring`). Alternative used by several Expo+Rust
examples: keep the pure C ABI above and load it with JNA
(`net.java.dev.jna:jna:5.x@aar`) — costs ~1-2 MB extra; prefer the `jni`
crate route. Module definition:

```kotlin
class SoliSolverModule : Module() {
  companion object { init { System.loadLibrary("soli_solver") } }

  override fun definition() = ModuleDefinition {
    Name("SoliSolver")
    // AsyncFunction body already runs on expo.modules.AsyncFunctionQueue
    // (dedicated HandlerThread), NOT the JS thread. For a multi-second solve
    // we still hop to Dispatchers.Default so we don't clog the shared queue.
    AsyncFunction("solvePosition") Coroutine { stateJson: String, budgetMs: Int ->
      withContext(Dispatchers.Default) { SoliSolverJni.solvePosition(stateJson, budgetMs) }
    }
    Function("cancelSolve") { SoliSolverJni.cancelCurrent() }
  }
}
```

**iOS build** (deployment target 16.4 to match the app):

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
export IPHONEOS_DEPLOYMENT_TARGET=16.4
cargo build --release --target aarch64-apple-ios
cargo build --release --target aarch64-apple-ios-sim
# cbindgen or a hand-written header for the 5 functions above
xcodebuild -create-xcframework \
  -library target/aarch64-apple-ios/release/libsoli_solver.a -headers include/ \
  -library target/aarch64-apple-ios-sim/release/libsoli_solver.a -headers include/ \
  -output ../../modules/soli-solver/ios/Frameworks/SoliSolver.xcframework
```

(If we ever need the Intel simulator: build `x86_64-apple-ios` too and `lipo`
the two sim `.a`s into one before `-create-xcframework` — one library per
platform slice.)

Podspec additions (`modules/soli-solver/ios/SoliSolver.podspec`, based on the
SDK 57 module template, e.g. `ExpoFont.podspec`):

```ruby
s.vendored_frameworks = 'Frameworks/SoliSolver.xcframework'
# keep source_files scoped so it doesn't match framework internals:
s.source_files = '*.{h,m,swift}'
```

Swift side — `AsyncFunction` with an `async` body runs via Swift concurrency
off the main/JS thread; wrap the sync FFI call in `Task.detached` or just use
the plain-closure `AsyncFunction` (dispatched to
`expo.modules.AsyncFunctionQueue`, qos `.userInitiated`):

```swift
public class SoliSolverModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SoliSolver")
    AsyncFunction("solvePosition") { (stateJson: String, budgetMs: Int) -> String in
      // Runs on expo.modules.AsyncFunctionQueue (background DispatchQueue).
      let token = soli_cancel_token_new()
      defer { soli_cancel_token_free(token) }
      SolveRegistry.shared.register(token)         // for cancelSolve
      defer { SolveRegistry.shared.clear() }
      guard let raw = soli_solve_position(stateJson, UInt32(budgetMs), token) else {
        throw SolverException()
      }
      defer { soli_string_free(raw) }
      return String(cString: raw)
    }
    Function("cancelSolve") { SolveRegistry.shared.cancelCurrent() }
  }
}
```

**Cancellation pattern** (canonical across sources): JS calls
`cancelSolve()` -> native looks up the live `CancelToken` handle -> sets the
`AtomicBool` -> the Rust solve loop checks the flag every few thousand nodes
and returns a partial/aborted result. Same pattern uniffi-rs itself
recommends ("expose a cancel() method that sets a flag that the library
checks periodically"). Budget (`budgetMs`) is enforced inside Rust with
`Instant::now()` checks on the same cadence, so a forgotten cancel can never
hang the queue. JS wrapper (`modules/soli-solver/index.ts`) exposes
`solvePosition(stateJson, budgetMs): Promise<SolveResult>` and
`cancelSolve(): void`.

**CNG/prebuild fit**: nothing above touches `android/` or `ios/` app
projects — the module is self-contained and autolinked, so
`expo prebuild --clean` keeps working. The only build-order requirement:
run the Rust build scripts (yarn script, e.g. `yarn rust:android`,
`yarn rust:ios`) before `yarn release`/`yarn ios` whenever the Rust changed.

### Gotchas and open risks

- **16 KB pages (Android)**: mandatory for Play submissions targeting
  Android 15+ since 2025-11-01. Covered as long as we build with cargo-ndk
  v4.x (auto-adds `-Wl,-z,max-page-size=16384` on NDK <= 27) or move to NDK
  r28+. Verify in the release AAB with APK Analyzer / `zipalign -c -P 16`.
- **Shared async queue**: the default async queue is app-wide, not
  per-module (iOS: one file-scoped serial `DispatchQueue` in
  expo-modules-core; Android: one `HandlerThread` per `AppContext`). All
  default `AsyncFunction`s of every Expo module share it, so a 5 s solve
  would delay other async native calls. Mitigation shown above: Kotlin
  `withContext(Dispatchers.Default)`; on iOS either accept it (solves are
  budget-bounded) or `.runOnQueue(DispatchQueue(label: "soli.solver"))`.
- **Simulator/emulator artifacts**: developers must build the sim/emulator
  Rust targets too, or the dev build fails to link/load. Keep all targets in
  the yarn scripts; consider committing the built artifacts (a few hundred
  KB) so JS-only contributors and EAS builds never need a Rust toolchain.
  EAS/CI: if artifacts are NOT committed, the build image needs rustup +
  cargo-ndk — a prebuild hook or custom build step; committing artifacts
  avoids this entirely. Trade-off: binary blobs in git; acceptable at this
  size, revisit if it grows.
- **JSON boundary cost**: for a solver returning a move list, JSON
  encode/decode is microseconds against a 100 ms-5 s solve — a non-issue;
  do not add flatbuffers/etc. (avoid gold plating).
- **Panic/abort**: with `catch_unwind` at the boundary a solver bug degrades
  to an error result, not a crash. Do NOT set `panic = "abort"` in the
  release profile, it would turn any panic into a process abort.
- **NDK/AGP drift**: RN 0.86 pins NDK 27.1.12297006 / AGP 8.12. When Expo
  bumps RN, re-run the Android Rust build so alignment/toolchain stay in
  sync (cheap; scripted).
- **UBRN reversal risk**: if the Rust API grows (deal generation, hints,
  analytics structs), the manual boundary accretes hand-written glue. The
  cutover point is roughly "more than ~5 functions or any shared
  objects/callbacks" — then spike UBRN again.

### Implementation notes (2026-07-13, soli-solver module built)

What Phase B actually shipped in `modules/soli-solver/` — deltas vs. the plan
above (all verified by compiling/`llvm-nm`; device build pending):

- **No cancel token v1**: budget is enforced inside Rust (travels in the
  request JSON), the JS side ignores stale results instead of cancelling.
  The `CancelToken` sketch above remains the recipe if cancellation is needed.
- **Kotlin cannot call a plain C ABI** — added a JNI-named export in Rust
  (`rust/soli-solver-ffi/src/android_jni.rs`): android-only dependency
  `jni = { version = "0.21", default-features = false }`, `extern "system"`,
  symbol `Java_expo_modules_solisolver_SoliSolverJni_nativeSolve` matching
  `object SoliSolverJni` in package `expo.modules.solisolver`. Verify export:
  `$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-nm -D
  --defined-only <so> | grep Java_` (macOS `nm -gU` can't read ELF).
- **Swift → Rust via `@_silgen_name`** for the two C functions instead of
  importing the xcframework header: a Swift-only pod has no bridging header,
  and CocoaPods umbrella/module-map plumbing for vendored-framework headers is
  the error-prone part. Direct symbol declarations always compile; the linker
  resolves them from `s.vendored_frameworks = 'SoliSolver.xcframework'`.
  Fallback if a future Xcode/CocoaPods change breaks this: copy the header
  beside the podspec and use `s.public_header_files`.
- **Local module needs a minimal `package.json`** (`name`, `version`, `main`):
  expo-modules-autolinking's search-path scanner otherwise registers it under
  a mock name (`local-module`), see
  `expo-modules-autolinking/build/dependencies/scanning.js`.
- Kotlin coroutine body syntax needs
  `import expo.modules.kotlin.functions.Coroutine`;
  `AsyncFunction("solvePosition") Coroutine { req: String -> withContext(Dispatchers.Default) { … } }`.
- Config uses the `"apple"` platform key (SDK 57 convention; `"ios"` still
  accepted as fallback — see `ExpoModuleConfig.js` `getAppleConfig`).

### Source links (all accessed 2026-07-12)

- Expo Autolinking (local modules, `nativeModulesDir`): https://docs.expo.dev/modules/autolinking
- create-expo-module `--local`: https://docs.expo.dev/more/create-expo-module/
- Expo Module API (AsyncFunction threading, runOnQueue, Coroutine): https://docs.expo.dev/modules/module-api
- Expo third-party libraries (vendored_frameworks note): https://docs.expo.dev/modules/third-party-library
- expo-modules-core 57.0.3 source read locally: `AsyncFunctionDefinition.swift`, `ConcurrentFunctionDefinition.swift`, `AppContext.kt`, `SuspendFunctionComponent.kt`
- UBRN repo/releases (v0.31.0-3, 2026-05-28): https://github.com/jhugman/uniffi-bindgen-react-native
- UBRN book (turbo-module files, threading, cancellation/AbortSignal): https://jhugman.github.io/uniffi-bindgen-react-native/
- UBRN Expo feedback issue: https://github.com/jhugman/uniffi-bindgen-react-native/issues/195
- UBRN RN 0.80+/Expo 54 crash (fixed): https://github.com/jhugman/uniffi-bindgen-react-native/issues/295
- Mozilla Hacks announcement (2024-12): https://hacks.mozilla.org/2024/12/introducing-uniffi-for-react-native-rust-powered-turbo-modules/
- Expo + Rust (UniFFI, local module, jniLibs + vendored_libraries walkthrough): https://claas.dev/posts/expo-with-rust/
- dgca/expo-rust-demo (C ABI local module): https://github.com/dgca/expo-rust-demo
- cargo-ndk README + CHANGELOG (v4.1.2; 16 KB flags in v4.0.0): https://github.com/bbqsrc/cargo-ndk
- Android 16 KB page sizes (Play requirement 2025-11-01, NDK r28 default): https://developer.android.com/guide/practices/page-sizes
- NDK r28 release notes: https://github.com/android/ndk/releases/tag/r28
- RN 0.86 release/toolchain (NDK 27.1, AGP 8.12 read from `libs.versions.toml`): https://reactnative.dev/blog/2026/06/11/react-native-0.86
- rustc iOS targets + IPHONEOS_DEPLOYMENT_TARGET: https://doc.rust-lang.org/rustc/platform-support/apple-ios.html
- Ferrostar iOS packaging (lipo + create-xcframework): https://stadiamaps.com/blog/ferrostar-building-a-cross-platform-navigation-sdk-in-rust-part-2/
- Rustonomicon FFI/unwinding + catch_unwind: https://doc.rust-lang.org/nomicon/ffi.html
- c_unwind stabilization (extern "C" panic aborts): https://github.com/rust-lang/rust/issues/115285
- min-sized-rust (size profile levers): https://github.com/johnthagen/min-sized-rust
- Rust perf book build config: https://nnethercote.github.io/perf-book/build-configuration.html
- Hermes WASM preview (2026-02, not production-ready): https://tmikov.blogspot.com/2026/02/webassembly-comes-to-hermes_01829874520.html
- RN 0.84 blog (Hermes V1 default): https://reactnative.dev/blog/2026/02/11/react-native-0.84
- react-native-webassembly (dormant since 2023): https://github.com/cawfree/react-native-webassembly
- polygen (experimental): https://github.com/callstackincubator/polygen
- Cancellation flag pattern (Rust forum, AtomicBool over FFI): https://users.rust-lang.org/t/simple-way-to-expose-cancelable-work-implemented-in-rust-to-swift-c/19539
