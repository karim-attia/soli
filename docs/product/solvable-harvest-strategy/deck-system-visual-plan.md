# Solvable Harvest Strategy Deck System Visual Plan

## User prompt

```text
make a visual plan in html for how we create decks, solvabe decks, history, etc.
```

## Description

Create a standalone HTML visual plan that explains the proposed v2 deck system: random deck creation, exact deal identity, solvable-deal harvesting, draw-specific selection, history migration, and future hint solving.

## Acceptance Criteria -> add more details than in the product document if it makes sense

- The HTML can be opened directly from the filesystem.
- The first viewport shows the core recommendation.
- The plan distinguishes generator, exact identity, solver harvest, app runtime selection, and history.
- The visual makes clear that Lonelybot `exact` is an identity, not a random generator.
- The visual includes the legacy tableau migration path.
- The visual includes open decisions and the recommended defaults.
- The artifact is scoped to planning only and does not modify runtime app code.

## Design links

- N/A

## Possible approaches incl. pros and cons

- Static HTML/CSS artifact in `docs/product/solvable-harvest-strategy/`.
  - Pros: easy to open, review, and iterate; no build required.
  - Cons: not connected to the app's component system.
- Markdown with Mermaid diagrams.
  - Pros: compact and readable in GitHub.
  - Cons: less control over layout and visual hierarchy.

Recommendation: use standalone HTML because the request is specifically for a visual plan in HTML.

## Open questions to the user incl. recommendations (if any)

- Should the visual plan become a durable architecture doc after implementation?
  - Recommendation: yes, but keep this first version as a planning artifact.

## New dependencies

- None.

## UX/UI Considerations

- Keep the artifact dense but readable: this is an engineering planning surface, not a landing page.
- Use clear swimlanes and arrows so the system flow is understandable at a glance.
- Avoid decorative effects that compete with the decision content.

## Components -> Which components to reuse, which components to create?

- Reuse existing docs folder.
- Create a standalone HTML file with local CSS only.

## How to fetch data, how to cache

- No data fetching.
- The plan describes future generated caches: exact IDs, solvability masks, solver stats, and legacy migration maps.

## Related tasks

- `docs/product/solvable-harvest-strategy/rethink-solvable-harvesting.md`
- `docs/product/solvable-harvest-strategy/seed-recovery-and-generator-selection.md`
- `docs/external-package-guides/lonelybot.md`

## Steps to implement and status of these steps

1. **Completed**: Create this implementation plan.
2. **Completed**: Create the standalone HTML visual plan.
3. **Completed**: Verify the HTML artifact exists and can be inspected.

## Plan: Files to modify

- `docs/product/solvable-harvest-strategy/deck-system-visual-plan.md`
- `docs/product/solvable-harvest-strategy/deck-system-visual-plan.html`

## Files actually modified

- `docs/product/solvable-harvest-strategy/deck-system-visual-plan.md`
- `docs/product/solvable-harvest-strategy/deck-system-visual-plan.html`

## Identified issues and status of these issues

- None yet.

## Testing

- Verified the HTML file exists and includes the expected main sections.
- Opened the file with `chrome-devtools-axi` from `file:///Users/karim/kDrive/Code/soli/docs/product/solvable-harvest-strategy/deck-system-visual-plan.html`.
- Checked a narrow viewport snapshot for the headline, system map, data contracts, and implementation phases.
