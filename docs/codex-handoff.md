# Codex handoff — first playable prototype

## Goal

Finish validation and deploy the existing Brass & Timber prototype to GitHub Pages. Keep scope minimal. The owner authorizes direct commits for this prototype. Do not change repository visibility, add monetization, replace existing generated art, or introduce another hosting service without approval.

## Current implementation

The runnable static app is at the repository root. Existing `assets/art/runtime` images are used directly. See README for architecture and provisional economy. The gameplay covers seals, manual weighing, five-ship shifts, per-ship saves, clerk reviews/training, the berth upgrade, immediate result explanations, and local playtest export. See issue #1 for the approved roadmap.

## Checks completed in the authoring environment

- 12 pure game-logic tests pass (`npm test`), including 2,850 deterministic case combinations, both types of incorrect verdict, repeated submissions, purchase idempotency, scale direction, shift rollover, and save restore.
- JavaScript syntax checks and the dependency-free static build pass.
- Runtime WebP artwork and PWA PNG icons are present.
- Local browser smoke test could not launch because no browser executable was installed in the authoring environment. Do not describe visual QA as completed.

## Next actions

1. Run `npm start`, install Playwright plus Chromium if needed, and run `node tests/browser-smoke.cjs`. The Pages workflow includes this test and uploads screenshots as `browser-review`.
2. Inspect mobile/desktop screenshots, especially scale beam/pan alignment and any text clipping. Adjust CSS/asset anchors before review.
3. Test false verdicts in the UI, berth purchase, reloads, and offline relaunch on actual mobile browsers. The smoke test covers a correct five-ship run, training, next shift, save/reload, and offline reload; it does not replace physical-device QA.
4. In repository Settings → Pages, choose GitHub Actions if not already configured. Respect private-repository plan restrictions. Never make the repo public as a workaround.
5. Re-run the workflow and obtain the real deployment URL from the successful Pages job. Verify that URL before telling the owner it is ready.
6. Update issues with precise evidence. Do not close the playtest gate merely because code builds.

## Decisions for owner review

- Staff credit is provisionally 2 coins per correct verdict, increasing to 6 after 60-coin training. This replaces a clock-based income model and preserves zero income for mistakes.
- Berth costs 120; premium shipments start the next shift and pay 35 vs. 20 normal shipment coins.
- Collect physical-device feedback and establish a small playtest budget/continue-or-stop gate before expansion.

No cloud analytics, payments, ads, or feedback endpoint is configured.
