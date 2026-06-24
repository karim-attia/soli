# General

Use web search to research a tool, library, pattern, etc. to see best practices on how to do something.

Leave small documentation comment notes inline throughout the app to better understand reasons why we did something in a certain way. For example product decisions, technical decisions. This gives valuable context for future development so that we don't undo such decisions unintentionally (or so that we consciously change these assumptions). Especially leave such a comment if there was an initial implementation that was then corrected in the chat afterwards. E.g. we do this this way instead of that way because we learned if we do it that way, we will run into issue X.

Never commit/stage changes except if the user directly asked for it.

Prefer simplicity. Use defaults. Some examples: Use components as they are meant to be used, don't engineer something around them. Prefer simple abstractions that can be reused. Optimize on few lines of code. Always propose to remove code if it's not needed anymore. Comment such trade-offs (see above).

Avoid gold plating or scope creep

# Implementation plan

- Create a detailed implementation plan for every feature. IF THERE IS NO IMPLEMENTATION PLAN, SEARCH FOR AN EXISTING ONE.
- Create a folder @docs/product/<feature-name> if it doesn't exist yet.
- Create a markdown file in the folder with the name of the story.
- If we're in the same chat, it usually makes sense to use the same file except if we're doing something quite different. Apply common sense here to not overdo it. Sub-agents shouldn't create new files, but rather return their status to the orchestrator agent which will then update the file.
- After compacting context, always re-read the full implementation plan.
- If you're a sub-agent, always read the full implementation plan before starting work.
- Directly start implementing except if the user asks for a different approach. But always create a detailed implementation plan before starting to implement.
- Update the status of the steps after the implementation of each step. NEVER SKIP THIS!
- This is like your second brain that we can use through sessions or after compacting context to keep most inportant artefacts. Treat it accordingly.

Fill in the following sections:

- # [Feature Name] [Story Name]
- ## User prompt
  - Add all prompts from the chat 1:1 in here.
- ## Description
- ## Framing context
- ## Acceptance Criteria
  - add more details than in the product document if it makes sense
- ## Design links
- ## Possible approaches incl. pros and cons
- ## Open questions to the user
  - include alternative, pro/con for each alternative and a recommendation
- ## Dependencies
  - List new depencencies
  - Link to all package guides that are used
- ## UX/UI Considerations
- ## Components
  - Which components to reuse, which components to create?
- ## How to fetch data, how to cache
- ## Related tasks
- ## Simplification ideas
- ## Steps to implement
  - and status of these steps
- ## Plan: Files to modify
- ## Files actually modified
- ## Intermediary learnings
  - add intermediary learnings here especially if something didn't work or we discovered a new piece of information
- ## Identified issues
  - and status of these issues
- ## Testing

# Testing

Test everything you do in a real environment (when it makes sense!). In order to save context, always use sub-agents to test. Use GPT 5.5 medium reasoning for the testing sub-agent. Give detailed testing instructions and get a detailed test report, though. Give the .md file (updated!) to the sub-agent for context. Also don't run two of these sub-agents in parallel if they will run a build. Reason: See below.

Native: Use agent-device skill
Web: Use Playwright with skill (but no need to test on web since the app is for native only, but it's an option.)

iOS: Always run a clean build on the connected simulator. Make sure the build is finished before checking on the device.
Android: Run "yarn release" and wait until the build is complete. Use scripts/android-unlock-pattern.sh script to unlock physical Android device if it's locked.

Never run two builds at the same time as otherwise the computer nearly crashes when running builds in parallel, e.g. iOS and Android in parallel. Also check if there are other processes running a build and kill them first. If there is already a build running, this is no excuse to not run the build and test on an outdated build. Kill the other build first, then build, then test.

Check if the build was actually installed on the device or the device/emulator.

# Components

Use expo ui or tamagui components for all UI elements.

-> to write: components in component folder, create component there with defaults instead of directly using tamagui components in the screen.

# External packages

**External Package Research and Documentation**: For any proposed tasks that involve external packages, to avoid hallucinations, use the web to research the documentation first to ensure it's 100% clear how to use the API of the package. Then for each package, a document should be created `<feature-name>-<package>-guide.md` that contains a fresh cache of the information needed to use the API. It should be date-stamped and link to the original docs provided. E.g., if pg-boss is a library to add as part of task 2-1 then a file `tasks/2-1-pg-boss-guide.md` should be created. This documents foundational assumptions about how to use the package, with example snippets.
