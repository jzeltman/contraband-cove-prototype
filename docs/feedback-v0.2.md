# First playtest feedback — v0.2.0

Tracking: #14 inspection gates, #15 captain introductions, #16 daily briefing, #17 persistent captain portrait, #18 header references.

## Flow

Harbor → daily briefing → captain introduction with portrait/flavor/declaration → required inspection steps → clear/hold → result → next captain. After five results: summary → next shift briefing.

- Seal completion is an explicit player action. The UI and reducer both gate verdicts.
- Weighing completes on a balanced measurement. That recorded fact remains available after removing weights.
- Combined cases require both. Completion alone does not imply a match or reveal the correct judgment.
- A sticky header replaces the gameplay logo with Declaration and Daily rules dialogs. A compact sticky captain portrait stays visible over the inspection workspace.
- The declaration no longer occupies a below-game sidebar. It appears before inspection and can be reopened without changing tool state.
- The daily briefing summarizes current stable rules. Further changing daily restrictions need design/content work; this update does not add undefined exceptions.

## Compatibility and validation

Existing local saves migrate without resetting money or upgrades. Already-paid results cannot pay twice. New briefing and introduction stages persist across reloads and harbor visits. Existing unfinished cases receive the new briefing/introduction before resuming.

17 pure tests cover flow, completion gates, migration, rewards, scale math, cases, and upgrades. Browser smoke tests cover a full five-ship loop, dialogs, sticky portrait/header, 320px/390px/1280px layouts, saved progress, next-shift briefing, and offline reload. CI results and screenshot review must be checked before claiming deployment is verified.

Search noindex directives are retained; service-worker build/cache version is 0.2.0.
