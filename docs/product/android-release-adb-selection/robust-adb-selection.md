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

for yarn release: when physical device is not found, don't go back to emulator. instead tell user to enable wireless debugging. if an agent is running into this, instruct the agent to also ask me and then continue from there.

Instead of, I think this to agents.md, please add this to the yarn release or the run Android release script, so that kind of the terminal just emits this warning if this happens. I don't think this should go to agents.md. And by the way, also add a quick check for the display timeout. If it's set to under 230 seconds or less, also emit a small warning in the yarn release terminal thingy, so that the agent is able to increase it. Thank you.

The physical device often has a screen timeout set to 15 minutes. adb shell settings put system screen_off_timeout 150000 to temporarily increase it.

Hey, um, you just added it to agents.md. I don't want it in there because I think it's a little bit too granular for agents.md. Please, um, just put it in the, like, terminal output when yarn release is running, um, so that, um, so that if there's, if that's the case, then kind of the agent knows this and the agent has the instruction at this point, but we don't need to send this along every time. And also, um, see above, I added this line to the agents.md thing. And please also as part of the release script, check the display timeout, and if the display timeout is 30 seconds or less, please also emit a small warning to the agent so that, um, it can, uh, it can act appropriately. I'll also remove this from the agents.md, but just give this as a warning to the agent. Please also phrase it as like, to the agent, so that it knows when testing, um, that it can run this command before so it doesn't run into the display timeout issues. Um, thank you very much.

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

Follow-up on 2026-06-29: release validation is intentionally physical-device-only. If
the phone is unavailable after the existing reconnect retry, `yarn release` must stop
with instructions to enable Wireless debugging. It must never hand target selection back
to Expo, because Expo may then select an available emulator and make the validation look
successful on the wrong device.

## Framing context

`yarn release` is both a build command and the repository's normal Android validation
path. A successful emulator install is therefore not an acceptable substitute when the
expected physical phone is offline. The script should make that product/testing decision
explicit. The user clarified that the recovery instructions are too situational for
`AGENTS.md`, so `yarn release` itself should address the testing agent only when a phone is
missing or its screen timeout is short. The latest prompt sets the short-timeout threshold
to 30 seconds or less, superseding the earlier 230-second threshold.

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
- Connected emulators are excluded when choosing an already connected release target.
- If no physical device can be found after the one existing ADB discovery retry, the
  script exits before invoking Expo and tells the user to enable Wireless debugging.
- The missing-device terminal output tells the testing agent to ask Karim to enable
  Wireless debugging, wait for his response, rerun `yarn release`, and continue.
- `AGENTS.md` contains neither the missing-device recovery flow nor the screen-timeout
  command.
- Once a physical target is selected, the script reads `screen_off_timeout` from that
  target.
- If the timeout is a numeric value at or below `30000` milliseconds, the script warns the
  testing agent and prints the exact target-scoped command needed to set it to `150000`.
- A missing, non-numeric, or longer timeout does not block the release and emits no
  timeout warning.

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

### 4. Continue with Expo target detection versus fail fast without a physical device

Continue with Expo target detection:

- Pros: the build may still install somewhere when only an emulator is available.
- Cons: it silently validates the wrong environment and can hide that Wireless debugging
  is disabled.

Fail fast:

- Pros: preserves the physical-device testing contract and gives a clear recovery action.
- Cons: an unattended run pauses until Karim can re-enable Wireless debugging.

Recommendation: fail fast. The pause is intentional because choosing an emulator changes
the meaning of the validation.

### 5. Put recovery guidance in `AGENTS.md` versus contextual terminal output

`AGENTS.md`:

- Pros: every agent sees the rule before running a release.
- Cons: carries low-level device troubleshooting context into unrelated tasks.

Contextual terminal output:

- Pros: appears exactly when the agent needs to act and keeps global guidance concise.
- Cons: the instruction is only visible after the release check detects the condition.

Recommendation: use contextual terminal output and leave `AGENTS.md` unchanged.

## Open questions to the user incl. recommendations (if any)

No blocking questions. Recommendation: keep both installs for now, but make the release
script deterministic and server-owner aware. Later, if desired, set a shell-level
`ADB_BIN=/opt/homebrew/bin/adb` or remove Homebrew/SDK duplication as a separate machine
cleanup task.

The two timeout thresholds in the latest messages conflict. Use the most recent and more
specific requirement: warn at 30 seconds (`30000` milliseconds) or less.

## Dependencies

- None.
- No package guide is required because this follow-up only changes repository shell and
  agent guidance. Android behavior is based on the existing official ADB documentation
  linked above.

## UX/UI Considerations

- No app UI changes.
- Developer UX should be calmer: `yarn release` should print when it repairs an ADB server
  owner mismatch, then continue to reconnect/install.
- Missing-device and short-timeout messages should say "Testing agent" so the required
  next action is unambiguous without permanent global instructions.

## Components -> Which components to reuse, which components to create?

- Reuse `run-android-release.sh`.
- Add small shell helpers inside the same script instead of a new component or external
  script.
- Add one non-blocking helper that reads and validates the selected device's timeout.

## How to fetch data, how to cache

- No app data fetching.
- The release script reads live ADB state via `adb server-status` and does not cache ports.
- Wireless-debugging ports remain dynamic and are discovered through existing mDNS/direct
  target behavior.

## Related tasks

- `docs/delivery/30/30-2-agent-device-guide.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-migration-plan.md`

## Simplification ideas

- Keep the current single retry and remove the generic Expo fallback instead of adding a
  new retry loop or emulator-selection abstraction.
- Reuse the existing connected-device parsing and only exclude emulator serials.
- Query the timeout only after selecting a stable physical serial, so no second target
  selection path is needed.

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
- [completed] Capture the 2026-06-29 physical-device-only follow-up and inspect the current
  release fallback.
- [completed] Confirm from official Android documentation that emulator serials use the
  `emulator-<port>` form, Wireless debugging uses ADB/mDNS, and `ANDROID_SERIAL` selects a
  specific connected target.
- [completed] Extend this implementation plan before changing the release behavior.
- [completed] Exclude emulators from connected release targets and fail before Expo when no
  physical device is available.
- [completed] Add the no-emulator fallback and agent/user handoff rule to `AGENTS.md` without
  disturbing its existing uncommitted timeout note.
- [completed] Capture the follow-up that moves situational instructions out of
  `AGENTS.md`, resolves the timeout threshold to 30 seconds, and update this plan.
- [completed] Restore `AGENTS.md` by removing both granular Android release lines.
- [completed] Move the missing-device recovery flow into the release script's terminal
  error and address the testing agent directly.
- [completed] Add a non-blocking `screen_off_timeout` check for the selected physical device
  and warn at 30 seconds or less with the target-scoped `150000` command.
- [completed] Correct the connected-device parser's `device` state boundary after the
  synthetic test exposed that Bash does not interpret `\b` as the intended word boundary.
- [completed] Validate shell syntax, target-selection behavior, failure copy, and the
  timeout warning behavior, then run the connected physical-device release path.
- [completed] Update this plan with final files, learnings, issue statuses, and test results.

## Plan: Files to modify

- `run-android-release.sh`
- `AGENTS.md` (restored to the repository baseline; no final diff expected)
- `docs/product/android-release-adb-selection/robust-adb-selection.md`
- `src/data/solvableDealsV2.generated.ts`

## Files actually modified

- `docs/product/android-release-adb-selection/robust-adb-selection.md`
- `run-android-release.sh`
- `src/data/solvableDealsV2.generated.ts`
- `AGENTS.md` (temporarily edited, then restored; no final diff)

## Intermediary learnings

- The current `else` branch deliberately continues with Expo device detection when no
  stable Wi-Fi serial exists; this is the exact emulator fallback to remove.
- The physical phone currently appears through both a direct Wi-Fi serial and an mDNS
  alias, so the existing preference for an IP serial should remain intact.
- `AGENTS.md` briefly contained the screen-timeout note and recovery flow, but the user's
  correction moved both into contextual terminal output and restored the file to its
  repository baseline.
- The initial synthetic parser test exposed an existing Bash-regex issue: `\b` was not
  matching the boundary after the `device` state. Use an explicit whitespace-or-end
  boundary instead.
- Android documents `screen_off_timeout` in milliseconds, so the latest 30-second
  threshold maps directly to `30000`.
- The requested `150000` replacement is 150 seconds (2.5 minutes), not 15 minutes; the
  terminal guidance prints the requested numeric command without giving it an incorrect
  duration label.

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
- Missing physical-device discovery currently falls through to Expo, which can select an
  emulator.
  - Status: fixed; the script now exits with a Wireless debugging prompt before invoking
    Expo when no physical serial was established.
- Agents do not currently have an explicit recovery instruction for this release failure.
  - Status: fixed; the missing-device terminal error now contains the ask/wait/rerun flow,
    while `AGENTS.md` remains unchanged.
- Short device screen timeouts can interrupt physical-device testing.
  - Status: fixed; warn the testing agent at `30000` milliseconds or less and print the
    selected-device command for increasing it to `150000`.

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
- `bash -n run-android-release.sh`
  - Result: passed after the 2026-06-29 follow-up.
- `git diff --check -- run-android-release.sh docs/product/android-release-adb-selection/robust-adb-selection.md AGENTS.md`
  - Result: passed; `AGENTS.md` has no final diff.
- Synthetic and live connected-target selection:
  - Result: emulator-only and no-device lists returned no physical target; a mixed list
    preferred `192.168.1.12:43210`; the live list selected A065 at
    `192.168.1.12:40523` rather than its duplicate mDNS alias.
- Synthetic missing-device `main` path:
  - Result: exited with status 1, told the testing agent to ask Karim to enable Wireless
    debugging and continue after rerunning, and did not invoke the stub Expo command.
- Synthetic timeout boundaries:
  - Result: `30000` emitted the agent warning and target-scoped `150000` command; `30001`
    and a non-numeric value emitted nothing.
- Connected physical-device `yarn release`:
  - Result: passed. The command read the A065's live `15000` ms timeout and emitted the
    expected agent warning, completed 642 Gradle tasks with `BUILD SUCCESSFUL in 16s`,
    installed the release APK on A065, and launched the app. ADB then confirmed
    `versionName=0.8.0`, `versionCode=13`, app PID `10286`, and
    `lastUpdateTime=2026-06-29 01:55:53`.
- `shellcheck run-android-release.sh`
  - Result: not run because `shellcheck` is not installed; Bash syntax and focused runtime
    coverage passed instead.
