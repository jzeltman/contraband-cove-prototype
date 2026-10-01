# Contraband Cove prototype · 0.4.0

A mobile-first HTML/CSS/JavaScript inspection game in the Brass & Timber style. This experiment tests multi-cargo shipments, visible staff assistance and an upgrade map. The goal is to find out whether players want another shift.

## Play

- Each captain brings two cargo lots; every third vessel adds an instrument chest requiring both checks. Choose a lot to bring it onto the desk. The captain stays through the shipment.
- Inspect seals and manually balance cargo. Switching lots preserves weights, measured mass and completed checks. Each lot needs its own CLEAR/HOLD verdict and pays once; departure adds no second payment.
- Three-minute shifts begin at the first inspection. Planning, references, Help, Pause and backgrounding stop the clock and workers.
- At zero, finish only the selected cargo. Other lots wait for next shift, including partial work and certified checks. The summary distinguishes this shift’s payments from the shipment’s already-paid total.
- Hire Mara from **Open upgrade map** for 80 coins. She certifies a seal on another lot in 8 active seconds while you inspect. Select a weighing lot to let her work on the cloth seal. She records evidence, not a verdict.
- Training costs 60 and reduces her check to 4 seconds. Hired staff credit is 2 coins per correct lot, or 6 when trained. There is no staff income before hiring, while paused, or offline.
- Improve the berth for 120 to attract premium lots on new arrivals: 35 coins instead of 20. Existing cargo retains its declared reward. This improves the one active berth.
- The chart shows future dockhand, warehouse, second-berth and lighthouse nodes. They are descriptive only, with no purchase action. Storage is currently represented by routing labels, with no capacity system.

Costs and durations are provisional. Incorrect verdicts earn zero and never deduct existing coins. Prototype saves use `contraband-cove.save.v4`; old builds are not migrated.

## Compare formats

Help links to `?shipments=single`, which presents the **same ordered lots, evidence, and rewards** as individual captain encounters. Default `?shipments=batch` groups them into shipments. Each mode keeps a separate local save. Use this comparison to judge batching itself before balancing staff or income.

## Run and verify

Requires Node 22+.

```sh
npm start
npm test
npm run build
# With Playwright + Chromium installed:
node tests/browser-smoke.cjs
```

Logic tests cover shipment generation, switching, mixed verdicts, hiring, worker progress, expiry/carryover, idempotent payouts and comparison-mode parity. Browser checks cover the actual mobile purchase/delegation loop, offline resume, 320/390/1280 layouts and simulated iPhone insets. `CHROMIUM_PATH` selects a local executable; `CHROMIUM_SINGLE_PROCESS=1` accommodates restricted local environments.

## Architecture and art

`src/game.js` owns ships and their per-lot evidence/progress/results, timer transitions, staff and purchases. `src/app.js` renders live controls and samples the monotonic clock. `visual-refresh.css` contains the Brass & Timber foundation; `shipments.css` adds cargo, crew and chart layouts. All labels and evidence remain live; the scale stays articulated.

Optimized copies in `assets/art/runtime/ui` derive from the committed composable source pack. Build and offline cache contain runtime assets only. Original artwork/reference mockups remain outside the published build.

## Deployment and roadmap

GitHub Actions tests and deploys `dist/` to GitHub Pages on `main`. Build and cache versions advance together. Installed users can apply downloaded updates through Help. Progress remains local to the browser/device; clearing site data resets it. Optional playtest logs stay local until shared.

[Roadmap #1](https://github.com/jzeltman/contraband-cove-prototype/issues/1): cargo batches (#23), hiring (#20), visible delegation (#24), upgrade map (#27), then owner playtest before handling/storage (#25) and harbor expansion (#26). Monetization has been removed from the roadmap.
