# Contraband Cove prototype · 0.3.0

A mobile-first HTML/CSS/JavaScript inspection game in the Brass & Timber style. The current experiment tests three-minute shifts and the new composable artwork. One cargo per captain; no storage or multi-lot gameplay yet.

## Play

- Read the briefing and meet the captain. The timer starts when you begin the first inspection.
- Inspect seals and manually balance cargo; complete every required check before CLEAR/HOLD.
- Arrivals continue while time remains. At zero, finish only an inspection already started. If time expires during an introduction, the shift ends; result feedback stays readable until you finish the shift.
- Pause, harbor planning, reference/help dialogs and backgrounding stop time. There is no offline income.
- Correct judgments pay 20 coins (35 premium) plus clerk credit; errors pay zero and never deduct coins. Existing training (60) and premium berth (120) remain available. Hiring and parallel staff work are later issues.
- View actual inspection counts and earnings, then start another shift.

Three minutes is a provisional playtest value in `SHIFT_MS`. Prototype saves use a new key, `contraband-cove.save.v3`; older prototype progress is not migrated. Current progress and remaining time save locally. Clearing browser data resets progress.

## Run and verify

Requires Node 22+.

```sh
npm start
npm test
npm run build
# Install Playwright and Chromium, then:
node tests/browser-smoke.cjs
```

Browser tests cover verdict gates, timer/pause/background behavior, expiry, rewards, reload, offline launch, narrow/desktop layouts and simulated iPhone insets. `CHROMIUM_PATH` can select an installed browser; `CHROMIUM_SINGLE_PROCESS=1` accommodates restricted local environments. Physical iPhone/Android testing remains necessary.

## Architecture and art

`src/game.js` owns deterministic cases, progression and timer transitions. `src/app.js` owns live UI, monotonic clock sampling, persistence and reference dialogs. `visual-refresh.css` layers the mockup direction over the existing layout and safe-area styles. Seal emblems, dots and rings remain live evidence, and the scale uses movable components.

Optimized artwork in `assets/art/runtime/ui` is derived from the committed Brass & Timber pack (about 0.8 MB). Only runtime art ships; source sprites, mockups and originals do not enter the build/cache. The existing three captain variants remain available. The hourglass is static artwork with live time text.

## Deployment and roadmap

The existing GitHub Actions workflow tests and deploys `dist/` to GitHub Pages on `main`. Build and service-worker cache versions advance together. Installed users can apply the downloaded update through Help.

[Roadmap #1](https://github.com/jzeltman/contraband-cove-prototype/issues/1): timer/UI (#21/#22), then cargo batches (#23), hiring (#20), visible delegation (#24), handling/storage (#25), and harbor expansion (#26).

The aim is to test fun and readability before expanding scope. No accounts, remote analytics, monetization or offline earnings. Optional playtest exports stay local until the tester shares them.
