# Contraband Cove — prototype art

18 generated 2D assets, each supplied as an original PNG and a smaller WebP. No gameplay UI is baked in.

- `originals/`: full generated PNGs, approximately 30.2 MB total; keep out of the PWA precache.
- `runtime/`: resized WebP copies, approximately 1.57 MB total. Use these in the prototype.
- [manifest.json](manifest.json): purposes, dimensions, file sizes, hashes and composition guidance.

## Asset inventory

| Asset | Purpose |
|---|---|
| [mara-neutral](runtime/mara-neutral.webp) | Clerk instruction and review portrait. |
| [inspection-dock](runtime/inspection-dock.webp) | Background for cargo inspection scenes; layer captain and desk above. |
| [inspection-desk](runtime/inspection-desk.webp) | Foreground work surface for both minigames. |
| [scale-stand](runtime/scale-stand.webp) | Stationary weighing apparatus base and upright. |
| [scale-beam](runtime/scale-beam.webp) | Rotating weighing beam. |
| [scale-pan](runtime/scale-pan.webp) | Suspended pan and chains; reuse twice, keep upright as beam tilts. |
| [reference-weight](runtime/reference-weight.webp) | Reusable draggable reference weight; add numeric values in code. |
| [wooden-crate](runtime/wooden-crate.webp) | Common cargo container. |
| [cloth-bundle](runtime/cloth-bundle.webp) | Alternate common cargo container. |
| [trade-chest](runtime/trade-chest.webp) | Higher-value shipment cargo container. |
| [shipment-document](runtime/shipment-document.webp) | Blank document surface; render all case information in code. |
| [reference-card](runtime/reference-card.webp) | Blank reference surface for current comparison evidence. |
| [mara-pleased](runtime/mara-pleased.webp) | Clerk success and training feedback portrait. |
| [harbor-overview](runtime/harbor-overview.webp) | Starting harbor overview for active-play progression. |
| [merchant-captain](runtime/merchant-captain.webp) | Reusable shipment visitor portrait. |
| [weathered-sailor](runtime/weathered-sailor.webp) | Reusable shipment visitor portrait. |
| [well-dressed-trader](runtime/well-dressed-trader.webp) | Reusable shipment visitor portrait. |
| [berth-upgrade](runtime/berth-upgrade.webp) | Additional berth and crane overlay showing the first harbor upgrade. |

## Integration

Use the full canvas for placement. The harbor base and upgraded berth overlay must share exactly the same bounds. The overlay represents an additional improved berth; it is not a replacement background.

Layer inspection background, visitor portrait, desk and evidence in that order. Place minigame content in its own legible foreground area. Render seal designs, comparisons, labels, values and all interaction affordances in code.

The scale contains separate stand, beam and pan assets. Duplicate the pan, rotate the beam around its pivot and move the pan attachment points while keeping the pans upright. Anchor estimates in the manifest need calibration during implementation.

Characters and props include alpha channels. The two backgrounds are opaque. Source cutouts can contain soft edge pixels: check compositing at actual phone size during integration. Mara's expression change is intentionally subtle.

## Validation performed

Decoded all 18 PNG files, verified dimensions and alpha availability, converted and decoded WebP derivatives, and visually checked the harbor overlay at matching bounds. Art is not yet integrated into a playable build; mobile legibility, touch targets and scale motion remain implementation checks.

## Provenance

Generated for this prototype using OpenAI image generation. Direction: angular painted pirate illustration, warm timber, brass, navy and turquoise. These are generated 2D illustrations, not extracted Synty assets. Character variants were generated using the clerk portrait as a style reference; the berth uses the harbor overview as its reference.
