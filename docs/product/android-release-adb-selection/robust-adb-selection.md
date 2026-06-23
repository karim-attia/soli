# Android Release ADB Selection Robust ADB Selection

## User prompt

connect to adb
check why not connected anymore.
we once increased timeout. check if still valid or needs to be reapplied.
i want this as smooth as possible
see also yarn release script

still not connected. undo all changes. as a very first step, connect. then find out the issue and only then, maybe adapt something in the process.

Now I've briefly connected, but again, I'm not connected anymore. Can you check the issue? Is the homebrew ADB server, is something wrong with there? Check if maybe that needs an update. Maybe just as a question for now, would it make sense that if after a little while the yarn release process doesn't work, that we restart that homebrew thingy and retry? Just some thoughts. Please challenge, I really don't know anything about the ADB. But please for sure make it work at the moment so Yarn release installs on the connected Android device.

Please research best practices. Should I even have two of those? Should I just have one and can we remove the other one? Or should we in Yarn release or in the follow-up script on Android release, should we just select the right one? I don't know, make something that this is robust. I trust you and tell me which recommendation you implemented afterwards. Thank you.

## Description

Make Android release installs robust when the machine has more than one `adb` binary
available. The concrete failure observed on 2026-06-18 was that the shared ADB server
on port `5037` repeatedly came back under the Android SDK copy at
`~/Library/Android/sdk/platform-tools/adb`, while the successful pairing/install path
used the Homebrew copy at `/opt/homebrew/bin/adb`.

Official Android docs matter here:
- ADB has a client/server design; all ADB clients use one local server on port `5037`.
- SDK Platform-Tools includes `adb`; Android Studio/SDK Manager normally manages the SDK
  copy, and command-line-only users may use standalone platform-tools.
- The current Homebrew cask version is `37.0.0`, matching the installed versions here.

Recommendation: do not remove either copy as part of this task. Keep the SDK copy because
Android Studio/SDK tooling expects `ANDROID_HOME/platform-tools`, and keep Homebrew because
the user's shell resolves `/opt/homebrew/bin/adb` first and that path worked during the
incident. The robust fix is to make `yarn release` choose one ADB deterministically and
repair the shared server if a different binary owns it.

## Acceptance Criteria -> add more details than in the product document if it makes sense

- `run-android-release.sh` still honors explicit `ADB_BIN`.
- Without `ADB_BIN`, the script prefers the same `adb` found on `PATH` before falling back
  to `ANDROID_HOME`/`ANDROID_SDK_ROOT`.
- Before reconnecting Wi-Fi ADB, the script checks which binary owns the current ADB
  server.
- If the server is owned by a different binary than the selected one, the script restarts
  the ADB server with the selected binary.
- The script does not blindly restart a healthy same-binary ADB server.
- Existing release signing behavior is unchanged.
- The script continues to support `ADB_WIFI_TARGET=<ip:port>` direct serials and mDNS
  discovery.
- `yarn release` can install on the connected Android phone after the change.

## Design links

- Android ADB docs: https://developer.android.com/tools/adb
- Android SDK Platform-Tools release notes: https://developer.android.com/tools/releases/platform-tools
- Android environment variables docs: https://developer.android.com/tools/variables
- Homebrew android-platform-tools cask: https://formulae.brew.sh/cask/android-platform-tools

## Possible approaches incl. pros and cons

### 1. Remove one ADB installation

Pros:
- Reduces ambiguity globally.

Cons:
- Removing the SDK copy fights normal Android Studio/SDK Manager expectations.
- Removing the Homebrew copy may surprise command-line tooling and the user's shell.
- Does not prevent a future tool from installing or starting a different ADB copy again.

### 2. Always hardcode `/opt/homebrew/bin/adb` in the release script

Pros:
- Matches the path that worked during the incident.
- Simple.

Cons:
- Not portable to non-Homebrew or Intel/Linux environments.
- Overrides `ADB_BIN`/PATH intent too aggressively.

### 3. Prefer explicit `ADB_BIN`, then PATH, then SDK, and restart only mismatched servers

Pros:
- Respects user/local environment.
- Portable.
- Fixes the actual shared-server ownership issue.
- Avoids unnecessary server restarts.

Cons:
- Adds a little shell plumbing.

Recommendation: implement approach 3.

## Open questions to the user incl. recommendations (if any)

No blocking questions. Recommendation: keep both installs for now, but make the release
script deterministic and server-owner aware. Later, if desired, set a shell-level
`ADB_BIN=/opt/homebrew/bin/adb` or remove Homebrew/SDK duplication as a separate machine
cleanup task.

## New dependencies

- None.

## UX/UI Considerations

- No app UI changes.
- Developer UX should be calmer: `yarn release` should print when it repairs an ADB server
  owner mismatch, then continue to reconnect/install.

## Components -> Which components to reuse, which components to create?

- Reuse `run-android-release.sh`.
- Add small shell helpers inside the same script instead of a new component or external
  script.

## How to fetch data, how to cache

- No app data fetching.
- The release script reads live ADB state via `adb server-status` and does not cache ports.
- Wireless-debugging ports remain dynamic and are discovered through existing mDNS/direct
  target behavior.

## Related tasks

- `docs/delivery/30/30-2-agent-device-guide.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-migration-plan.md`

## Steps to implement and status of these steps

- [completed] Restore ADB connectivity and complete a successful `yarn release` install
  before changing the process.
- [completed] Research official Android/Homebrew guidance for ADB, platform-tools, and
  server behavior.
- [completed] Create this implementation plan.
- [completed] Update `run-android-release.sh` to select ADB deterministically and repair
  server owner mismatches.
- [completed] Validate shell syntax and helper behavior.
- [completed] Repair the unrelated truncated generated data module that blocked bundling
  in the current worktree.
- [completed] Run `yarn release` again on the connected Android device.
- [completed] Update this plan with actual modified files, identified issues, and testing
  results.

## Plan: Files to modify

- `run-android-release.sh`
- `docs/product/android-release-adb-selection/robust-adb-selection.md`
- `src/data/solvableDealsV2.generated.ts`

## Files actually modified

- `docs/product/android-release-adb-selection/robust-adb-selection.md`
- `run-android-release.sh`
- `src/data/solvableDealsV2.generated.ts`

## Identified issues and status of these issues

- Multiple `adb` binaries exist.
  - Status: accepted; not inherently wrong, but release automation must choose one
    deterministically.
- Homebrew `android-platform-tools` is not outdated.
  - Status: confirmed; current Homebrew cask version is `37.0.0`.
- ADB server ownership can drift back to the SDK binary.
  - Status: fixed in script; release now starts the selected ADB server and restarts it
    only when `server-status` reports a different executable owner.
- `agent-device` may start/poll ADB in the background.
  - Status: observed during manual recovery; release script should not rely on no other
    tool ever touching ADB.
- `src/data/solvableDealsV2.generated.ts` was truncated in the dirty worktree and blocked
  Metro with an unterminated string before the final release verification.
  - Status: repaired minimally by closing the generated `SOLVABLE_DEALS_V2` array without
    rerunning the generator or changing existing rows.

## Testing

- `bash -n run-android-release.sh`
  - Result: passed.
- `git diff --check -- run-android-release.sh docs/product/android-release-adb-selection/robust-adb-selection.md src/data/solvableDealsV2.generated.ts`
  - Result: passed.
- Helper-function smoke test without invoking `main`.
  - Result: `pick_adb` selected `/opt/homebrew/bin/adb`; explicit `ADB_BIN` was honored;
    SDK fallback worked when Homebrew was removed from `PATH`.
- ADB server-owner mismatch simulation using the SDK binary, then the release script's
  Homebrew/PATH selection.
  - Result: SDK-owned server was detected and restarted with `/opt/homebrew/bin/adb`.
- Testing sub-agent static validation.
  - Result: passed; the sub-agent found only one harmless empty-path edge case, which was
    fixed before final release verification.
- Connected Android `yarn release`, with install metadata confirmed via ADB.
  - Result: passed. Installed package `ch.karimattia.soli` on `192.168.1.12:43473` with
    `versionName=0.8.0`, `versionCode=13`, and `lastUpdateTime=2026-06-18 17:17:22`.
