# Task 30-2 Agent Device Guide (2026-03-02)

## Package
- `agent-device` from [callstackincubator/agent-device](https://github.com/callstackincubator/agent-device)

## Why this guide exists
- Cache the API/CLI usage needed for PBI 30 Android validation and gameplay smoke testing.
- Document the project-local multi-agent setup so Codex and Cursor can share the same installed skill.

## Installation + multi-agent best practice
- Use project-local install so this repository owns the skill configuration:
  - `npx skills add https://github.com/callstackincubator/agent-device --skill agent-device -a codex -a cursor -y`
- Resulting layout:
  - `.agents/skills/agent-device` (shared project-local source of truth)
  - `.cursor/skills/agent-device` (Cursor-facing skill entrypoint linked to project-local install)
- Rationale:
  - Keeps skill version and behavior scoped to this project.
  - Lets multiple coding agents use one managed installation flow.

## Core commands used in this task
- Discover Android targets:
  - `npx -y agent-device devices --platform android --json`
- Launch/relaunch the app on explicit device:
  - `npx -y agent-device open ch.karimattia.soli --platform android --serial 192.168.1.12:37635 --relaunch --json`
- Capture UI state:
  - `npx -y agent-device snapshot -i --platform android --serial 192.168.1.12:37635 --json`
  - `npx -y agent-device screenshot .agents/skills/agent-device-after-fix.png --platform android --serial 192.168.1.12:37635 --json`

## Notes for this repository
- When mDNS device names include spaces/parentheses, prefer direct TCP serials from `adb connect` (for example `192.168.1.12:37635`) to avoid selector truncation in downstream tooling.
- Keep Android validation deterministic by pairing `agent-device` app automation with explicit `adb -s <serial>` install/logcat commands.

## Sources
- Skills CLI docs (`skills add`, local installation behavior):
  - https://github.com/vercel-labs/skills?tab=readme-ov-file#skills-add
- Agent-device project:
  - https://github.com/callstackincubator/agent-device
