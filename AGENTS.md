# General

Use web search to research a tool, library, pattern, etc. to see how others do something.

Compatibility notice (explicit): This repo makes NO backward-compatibility guarantees. Breaking changes to are allowed and expected.

# Implementation plan

Create a detailed implementation plan for every feature. IF THERE IS NO IMPLEMENTATION PLAN, SEARCH FOR AN EXISTING ONE.

Create a folder @docs/product/<feature-name> if it doesn't exist yet.

Create a markdown file in the folder with the name of the story.

Fill in the following sections:
- # [Feature Name] [Story Name]
- ## Description
- ## Acceptance Criteria -> add more details than in the product document if it makes sense
- ## Design links
- ## Possible approaches incl. pros and cons
- ## Open questions to the user incl. recommendations (if any)
- ## New dependencies
Follow @external-packages.mdc for new dependencies.
- ## UX/UI Considerations
- ## Components -> Which components to reuse, which components to create?
- ## How to fetch data, how to cache
- ## Related tasks
- ## Steps to implement and status of these steps
- ## Plan: Files to modify
- ## Files actually modified
- ## Identified issues and status of these issues
- ## Testing
One option: Test on http://localhost:8081/ - usually, expo web is running, if not start it with `yarn web`.

Directly start implementing except if the user asks for a different approach. But always create a detailed implementation plan before starting to implement.

Update the status of the steps after the implementation of each step. NEVER SKIP THIS!

# Scope Limitations

> Rationale: Prevents unnecessary work and keeps all efforts focused on agreed tasks, avoiding gold plating and scope creep.

- No gold plating or scope creep is allowed.
- All work must be scoped to the specific task at hand.
- Any identified improvements or optimizations must be proposed as separate tasks.


# Testing

Test everything you do in a real environment. Use sub-agents to test to save context (GPT 5.4 medium reasoning). Give detailed testing instructions and get a detailed test report, though. Also don't run two of these sub-agents in parallel if they will run a build. Reason: See below.

Native: Use agent-device skill
Web: Use Playwright with skill

iOS: Always run a clean build on the connected simulator. Make sure the build is finished before checking on the device.
Android: Run "yarn android" and wait until the build is complete. Use scripts/android-unlock-pattern.sh script to unlock physical Android device if it's locked.

Never run two builds at the same time as otherwise the computer nearly crashes when running builds in parallel, e.g. iOS and Android in parallel. Also check if there are other processes running a build and kill them first. 

Check if the build was actually installed on the device or the emulator.

# Components

Use tamagui components for all UI elements.

-> to write: components in component folder, create component there with defaults instead of directly using tamagui components in the screen.

# External packages

**External Package Research and Documentation**: For any proposed tasks that involve external packages, to avoid hallucinations, use the web to research the documentation first to ensure it's 100% clear how to use the API of the package. Then for each package, a document should be created `<feature-name>-<package>-guide.md` that contains a fresh cache of the information needed to use the API. It should be date-stamped and link to the original docs provided. E.g., if pg-boss is a library to add as part of task 2-1 then a file `tasks/2-1-pg-boss-guide.md` should be created. This documents foundational assumptions about how to use the package, with example snippets, in the language being used in the project.
