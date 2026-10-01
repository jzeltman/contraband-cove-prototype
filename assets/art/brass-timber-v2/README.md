# Brass & Timber — composable art pack

Source artwork for unloading, inspection, timed-shift, dockside storage, and upgrade screens. **Selected inspection/UI assets are integrated in prototype 0.5.0** through optimized copies in `assets/art/runtime/ui`. This source directory is not published or precached. The upgrade chart now supports live hiring, training and premium-berth purchases. The storage-ground plate now backs the live yard; three of its six spaces begin locked and unlock with expansion. The nine-space upgrade adds a labeled warehouse annex in the cargo grid. Second berth and lighthouse remain future work. The original art-only commit preserved gameplay unchanged; timer/UI integration is tracked in #21/#22 and the upgrade map in #27.

## Contents

- `sprites/`: individually cropped lossless RGBA WebP sprites, with real alpha and 8px sampling padding. No screen labels, prices, timers, or verdict text baked into the artwork.
- `backgrounds/`: WebP environment plates for the inspection harbor, dockside yard, and upgrade chart.
- `references/`: the six approved screen concepts (unloading, weight, seal before/after, isometric storage, upgrades). These are design references, not runtime screen images.
- `previews/`: visual QA contact sheet and composed storage example.
- `manifest.json`: dimensions, source crop coordinates, nominal anchors, and suggested nine-slice/content insets. Insets are `[top, right, bottom, left]` in source pixels, including transparent padding.

## Composition

### Unloading and inspection

Layer `inspection-harbor` → `captain-merchant` → `inspection-desk` → cargo → UI. Keep the captain in a shallow presence banner when the inspection tool occupies the screen. The `inspection-crate` has a blank wax seal; overlay evidence emblems independently. `reference-parchment` can hold a second seal or a declaration.

Use the existing independent scale assets in `../runtime/`: `scale-stand.webp`, `scale-beam.webp`, `scale-pan.webp`, and `reference-weight.webp`. They remain the source for a movable balance rather than baking a balanced scale into a screenshot. Existing captain and cargo variants also remain available.

The separate `seal-wax-blank` and `seal-anchor-brass` are art components, not new evidence logic. Render the same evidence values consistently on the cargo and reference. Existing deterministic emblem/dot/ring rendering remains unchanged. A brass anchor overlay is decorative; additional matching wax emblems can be authored later if preferred.

### Storage yard

The yard plate contains six empty ground outlines and adjoining vacant land. Cargo, awning, impound pen, warehouse, dock extension, and lighthouse are separate pieces. The storage plate is a fixed six-slot starting scene, **not a tilemap**. For expansion, layer new ground/platform artwork in the adjoining land; do not stretch the original plate to invent slots.

Use the normalized placement example in `storage-layout.json` with `storage-ground.webp` at its native 1536 × 1024 aspect ratio. Coordinates are illustrative art placement, not game logic. Resize the whole scene uniformly; avoid independently stretching assets. Ground objects use bottom-center anchors and should generally sort by their baseline Y. Building footprint/baseline positions may need art-directed adjustment when the actual responsive layout is implemented.

The empty impound sprite includes its opaque front fence. If future held cargo must visibly sit **behind** that fence, split the fence into a foreground layer in a later art pass; simply overlaying cargo on top would be incorrect. The current preview leaves the cage empty.

### UI and upgrades

Use the navy, teal, and terracotta button skins beneath live labels. Nine-slice their borders rather than stretching whole images. The parchment panel is similarly reusable. Pause/expansion symbols, checkbox states, anchor, book, declaration, lock, coin, and a static half-full hourglass are separate sprites. The hourglass is a static icon; it is **not an animated sand atlas**. Keep actual time as readable live text alongside it.

Layer `upgrade-chart` → connector routes → cards/portraits/buildings → lock/status overlays → live labels and prices. Staff illustrations depict hireable workers, not a default employed state. The artwork does not define upgrade dependencies or prices.

Keep safe-area insets, focus/pressed states, readable text, and touch target sizes in layout code when integration is authorized. These are illustrations, not hit targets. Do not encode mobile status-bar padding into sprite dimensions.

## Provenance and export

Art was reconstructed/extracted with the built-in Imagegen tool from the approved mockups, then split into individual assets using source-image crop coordinates. This is not a claim of pixel-identical extraction from the flattened mockups. Prompt set: `prompts.json`. Original model outputs remain available in the authoring conversation; the selected standalone assets are committed here. RGB background plates are WebP quality 92; reference mockups use quality 88; transparent sprites use lossless WebP. Source alpha is preserved. No source code was added or modified for this pack.

## Preserved version

`backup/pre-composable-art-2026-10-01` points to `1ec4a82ff4ee2c80c92ed184fa66cec332dbf38e`, the pre-art v0.2.1 prototype with the confirmed iPhone safe-area fix.
