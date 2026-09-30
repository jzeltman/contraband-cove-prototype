# Contraband Cove prototype

A framework-free HTML/CSS/JavaScript mobile-first inspection game in the **Brass & Timber** style. No build dependencies, accounts, ads, timers, or offline income.

## Run and test

Requires Node 22+.

```sh
npm start
# Open http://localhost:4173
npm test
npm run build
```

The build copies only runtime files to `dist/`; original art and tests are excluded. The app also runs directly from any static HTTP server. Relative paths support the GitHub Pages project subdirectory.

## Included

- Deterministic seal comparisons: emblem, dots, and rings.
- Balance scale: tap to add/remove 1/2/5/10 kg reference weights; beam and upright pans follow the heavier side.
- Five-ship shifts with separate introductions, mixed cases, and clerk recommendations.
- Immediate explanations. Incorrect judgments give zero income and never remove existing coins.
- Local per-action saves, resume, protected repeated verdicts/purchases, and shift reports.
- Mara training and a visibly expanded berth unlocking premium cargo next shift.
- PWA manifest, offline runtime cache, install instructions, explicit update prompt, and local playtest export.

## Pages deployment

In repository **Settings → Pages**, select **GitHub Actions** as the build source. The workflow tests and publishes `dist/` on pushes to `main` or manual dispatch. Private-repository Pages availability depends on the account plan; do not change repository visibility without owner approval. The successful deployment job reports the actual test URL.

## Playtest economy (provisional)

| Item | Coins |
| --- | ---: |
| Correct normal / premium shipment | 20 / 35 |
| Clerk credit per correct verdict, before / after training | 2 / 6 |
| Incorrect verdict, shipment and clerk credits | 0 |
| Training / berth purchase | 60 / 120 |

The staff credit is tied to successful work rather than elapsed time. This is an implementation assumption for owner review, not a finalized economy. Every completed five-ship shift can immediately be followed by another. Upgrades have no waiting period.

## State, evidence, privacy

`src/game.js` owns cases, scoring, progression, and pure state transitions. `src/app.js` renders UI and handles browser persistence. `styles.css` contains the style tokens and responsive components. Seal SVG is generated from case data; weights are not exposed numerically until balanced or after judgment.

The first shift is curated; later shifts are seeded and replayable. All current rules appear in the app. A mismatch requires HOLD for verification, not an accusation of criminal guilt. A clerk recommendation is explicitly unverified and may be wrong.

Saves are versioned and device/browser-specific. Invalid saves are backed up locally before fresh state is used. Clearing browser data loses progress. No gameplay data is transmitted; testers can export a JSON log from the handbook or shift report. Duration excludes time while the page is hidden. It is not an inactivity-aware analytics SDK.

## Update process

Increment the `BUILD` constant and service-worker cache version together. A new worker caches the complete runtime before becoming available; the user applies it from the handbook. Save format changes need a migration. No original PNGs enter the precache.

See [art integration notes](assets/art/README.md), [prototype decisions](docs/prototype-decisions.md), and [playtest checklist](docs/playtest.md). Physical iOS/Android install and return-session testing remains a release gate, not something desktop emulation proves.
