# General

- Vision: Create the best Solitaire app in the world and keep it free, ad-free and open source.
- Use web search to research a tool, library, pattern, etc. to see best practices on how to do something.
- Concept: The main thread orchestrates changes and hands off planning (with implementation plan), implementation and testing to a sub-agent. Reason: Save context and tokens on the main thread.
- Sometimes, you're not working with an implementation plan for whatever reason. Also then keep implementing and testing only with sub-agents.
- If it makes sense, please reply in a list or table, so I can easily reference to your statements in my reply.
- Self-improvement: Introspect on runs. Propose an edit to AGENTS.md if 
  - a rule in this file turned out to be wrong or caused friction during a run  
  - spotted inefficiencies, errors, redundant tool calls, etc.
  - anything else based on your judgement

## About the codebase

- Native-only Expo/React Native solitaire app.
- Game logic lives in src/features/klondike/
- Shared components in components/
- Implementation plans in docs/product/<feature>/
- Package guides in docs/external-package-guides/

# Implementation plan

- Every implementation work should have a detailed implementation plan
- Exception: Very small updates. But if the update gets bigger create one, also if it only gets bigger after already having started working on it. Reason: To preserve the context of what we're doing through sessions or after compacting context.
- First check if there is an existing implementation plan in `docs/product/` for what we are doing and continue using it if it makes sense. Otherwise, create a new one with <feature-name>.md.
- Use a subagent with the flagship AI model to create the initial implementation plan. Smaller updates can be done directly or also by the subagent depending on the size of the update.
- The implementation plan should have enough details so that a sub-agent can implement the changes based on it.
- If we're in the same chat, it usually makes sense to use the same file except if we're doing something quite different. Apply common sense here to not overdo it.
- Implementation sub-agents shouldn't create new implementation plans, but rather update the one they got from the orchestrator and give a status update to the orchestrator.
- After compacting context, always re-read the full implementation plan.
- If you're a sub-agent, always read the full implementation plan before starting work.
- Update the status of the steps after the implementation of each step. NEVER SKIP THIS!
- This is like your second brain that we can use through sessions or after compacting context to keep most important artefacts. Treat it accordingly.

Fill in the following sections:

- # [Feature Name] [Story Name]
- ## User prompt
  - Add all prompts from the chat 1:1 in here.
  ## Summary
  - Latest up to date summary
  - (Leave empty at start)
- ## Description
  - Framing context
  - Leading words
  - What are we doing?
  - Why is this nice and important?
- ## Acceptance Criteria
  - What happens when we do what
- ## Possible approaches incl. pros and cons
- ## Open questions to the user
  - Include possible answers including their pros and cons, reasoning with trade-offs and a recommendation
- ## Dependencies
  - List new dependencies
  - Link to all package guides that are used
  - (Only if applicable)
- ## UX/UI Considerations
  - (Only if applicable)
- ## Components
  - Which components to reuse, which components to create?
  - (Only if applicable)
- ## How to fetch data, how to cache
  - (Only if applicable)
- ## Related tasks
- ## Simplification ideas
  - See: Prefer simplicity. Use defaults.
- ## Steps to implement
  - List every step
  - Update if you discover new steps
  - Status of each step -> like a definition of done checklist
- ## Plan: Files to modify
- ## Files actually modified
- ## Intermediary learnings
  - Intermediary learnings discovered during implementation
  - Especially if something didn't work or we discovered a new piece of information
- ## Identified issues
  - and status of these issues
- ## Testing

# Implementation

- **Directly start implementing** except if the user asks for a different approach. But always create a detailed implementation plan before starting to implement. Proceed with recommended options in open questions, flag them in the final summary.

- **Sub-agents**: Use a subagent with flagship AI model to implement code changes except if they're very small. Reason: Save context and tokens on the main thread. Decide whether to reuse a sub-agent or choose a new one depending on how similar the code changes are to the previous ones. The sub-agent should directly update the implementation plan.

- **Leave small documentation comment notes inline** throughout the app to better understand reasons why we did something in a certain way. For example product decisions, technical decisions. This gives valuable context for future development so that we don't undo such decisions unintentionally (or so that we consciously change these assumptions). Especially leave such a comment if there was an initial implementation that was then corrected in the chat afterwards. E.g. we do this this way instead of that way because we learned if we do it that way, we will run into issue X.

- **Never commit/stage changes** except if I directly asked for it. Also never unstage something. Just leave it as it is. Sometimes, I stage stuff between chat turns to easily see the diff between chat messages. Unstaging something messes with this diff.

- **Prefer simplicity. Use defaults.** Some examples: Use components as they are meant to be used, don't engineer something around them. Prefer simple abstractions that can be reused. Optimize on few lines of code. Always propose to remove code if it's not needed anymore. Comment such trade-offs (see above).

Dimensions I care about: Are they a general code improvement? Do they improve performance? Reduce number of lines of code? Simplify understanding of code? Simplify mental model of what's going on? Things that can be done smarter? Things that are not even used anymore? That can be done more direct than now?

The small code comments from above are especially important for simplifications: Sometimes we simplify something that breaks something. Writing down the trade-offs helps to not do this again. If you see something, propose to simplify it or if you're certain, directly do it (but never without mentioning it incl. the trade-offs directly in the chat and in the code so it's easy to undo).

- **Avoid gold plating** or scope creep

## Components

- Use expo ui (preferred if available) or tamagui components for all UI elements.
- Components in `components/`
- Wrap component there with defaults instead of directly using expo ui/tamagui components raw in screens.

# Testing

Context: I am Karim and I code this app. I regularly run AI agents (you) to get a change done. Since you often run for 30min+, I do something else meantime, either on the laptop or away from the computer. The goal of this is that you can run independently for as long as possible without needing to be present. If you can test/verify things yourself and iterate/fix without needing my input, this drastically speeds up the process compared to when I quickly test something and then start a prompt again. However, there's also the trade-off: Getting lost in testing loops wastes both time and tokens. Please decide sensibly how to approach this. For example, in the past, you have tested animations via recording a video and analyzing it frame by frame. This was a bit overkill. It took an hour and burned through my usage limits. Quickly asking me if the animation looks good would have made sense here. However, quickly running a build and doing a smoke test makes sense in most (not all!) cases. Use judgement, happy to fine tune.

Cheap tests first: yarn typecheck && yarn lint && yarn jest

However, also test everything you do in a real environment (when it makes sense!). In order to save context, always use sub-agents to build and test. Use a timer while building to save some context so that you don't check up on the build every few seconds. Use efficient AI model for the testing sub-agent. Give detailed testing instructions and get a detailed test report, though. Give the .md file (updated!) to the sub-agent for context. Also don't run two of these sub-agents in parallel if they will run a build. Reason: See below.

- Orchestrator: Run plausability check on testing results.

Native: Use agent-device skill
Web: Use Playwright with skill (but no need to test on web since the app is for native only, but it's an option.)

Android: Run "yarn release" and wait until the build is complete. Use scripts/android-unlock-pattern.sh script to unlock physical Android device if it's locked.
iOS: Always run a clean build on the connected simulator. Make sure the build is finished before checking on the device.

Never run two builds at the same time as otherwise the computer nearly crashes when running builds in parallel, e.g. iOS and Android in parallel. Also check if there are other processes running a build and kill them first. If there is already a build running, this is no excuse to not run the build and test on an outdated build. Kill the other build first, then build, then test.

Check if the build was actually installed on the device or the device/emulator.

- The board exposes a full a11y tree — prefer it over coordinate taps. Android handle: labels/content-desc (e.g. "Seven of hearts, column 3", "Stock, 24 cards", "Face-down card, column N"). iOS handle: testIDs ("stock", "waste", "card-<suit>-<rank>", "foundation-<suit>"). Source of truth: src/features/klondike/components/cards/accessibility.ts.
- agent-device: `snapshot -i` dedupes identical labels; use `snapshot --raw` to count face-down cards. `uiautomator dump` fails on this app (timer never idles).


## Commands

- Typecheck: `yarn typecheck` — Lint: `yarn lint` — Tests: `yarn jest`
- iOS build+run: `yarn ios` (connected simulator, clean build)
- Android release: `yarn release`; unlock device: `scripts/android-unlock-pattern.sh`

# External packages

**External Package Research and Documentation**: For any proposed tasks that involve external packages, to avoid hallucinations, use the web to research the documentation first to ensure it's 100% clear how to use the API of the package. Then for each package, create or update a document in `docs/external-package-guides/` named `<package>.md` that contains a fresh cache of the information needed to use the API. It should be date-stamped and link to the original docs provided. This documents foundational assumptions about how to use the package, with example snippets.

# AI models
Exception today: Use Fable high for everything, both flagship and efficient.
 (high, xhigh, medium = reasoning)
- Flagship: Anthropic Fable high, GPT 5.5 xhigh
- Efficient: GPT 5.5 medium, Opus 4.8 medium. fallback: composer 2.5 (ignore! today: use Fable high for everything)
