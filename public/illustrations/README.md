# Illustrations

Drop a PNG here with one of these exact names and it replaces the watercolor-blob fallback everywhere it's used. No code changes needed. Sizes are 3× for a 390pt-wide phone.

| File | Size (px) | Where |
|---|---|---|
| `hero-grandma.png` | 1170 × 1140 | Letterbox and recording hero (top ~47% of the screen) |
| `hero-grandma-tea.png` | 1170 × 780 | "When should they hear it?" hero |
| `house-tainan.png` | 288 × 288 | Card thumbnail, 1st life stage (and the family cover placeholder) |
| `market-street.png` | 288 × 288 | Card thumbnail, 2nd life stage |
| `kitchen-bowl.png` | 288 × 288 | Card thumbnail, 3rd life stage |
| `leaves-top-left.png` | 600 × 600, transparent | Branch in the top-left corner of every screen |
| `leaves-top-right.png` | 600 × 600, transparent | Branch in the top-right corner (drawn as-is; the fallback is mirrored) |
| `house-backdrop.png` | ~900 wide, transparent | Faded house behind the Family Book and life map step 1 (not a slot; used by `HouseBackdrop`) |
| `avatar-lily.png` | 240 × 240 | Lily's round portrait (header avatar, "For Lily" row) |
| `avatar-ama.png` | 240 × 240 | Ama's round portrait |

Heroes are transparent cutouts drawn whole and anchored to the bottom of the hero area, so keep the background transparent. To add a portrait for someone else, add `avatar-<firstname>.png` here and the name to `ILLUSTRATIONS` in `src/lib/illustrations.ts`.
