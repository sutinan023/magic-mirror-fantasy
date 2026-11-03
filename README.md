# V08.6 — Body-Fit Crystal Wings

**Base:** V08.5, preserving V08.4 MediaPipe segmentation and the working V08.2 Auto Capture / V08 True Hand Magic.

## Changes

- **Scale tied to the person:** shoulder width + shoulder-to-hip estimate, with bounded fallback when hips are hidden.
- **No fit-to-frame shrink:** upper/lower wing tips can be cropped by the camera image; wings no longer shrink to the empty space between the shoulders and the portrait edge.
- **Back-rooted placement:** symmetrical projected scapular roots, at ±28.5% shoulder span horizontally and 24.5% shoulder span below shoulder line. Both stay hidden behind the segmented person when possible.
- **Occlusion fallback:** while the first segmentation mask isn't ready, use the approximate torso clip to avoid exposing roots.
- **No changes** to UI styling, tracking gestures, camera, Auto Capture timing, saving/sharing on mobile or port 3107.

## Files to replace in your existing project

1. `lib/premiumWings.js` — person-sized wing renderer.
2. `components/MagicMirror.jsx` — passes smoothed torso metric to the renderer, version label, and mask-ready fallback.
3. `lib/bodySegmentation.js` — exposes a tiny `hasMask()` readiness check; segmentation core unchanged.

Keep `lib/trueHandMagic.js`, CSS, package.json, original PNGs at `public/assets/wings/` and everything else as-is.

## Run and verify

```bash
npm run build
npm run dev
```

The existing Next.js dev script should keep port **3107**. Test standing near and far, arm extended and down, body slightly angled, and check the 3-second automatic capture saved PNG. Confirm roots are covered by the person and wing scale follows body rather than frame margins. Use the V08.5 Git commit to roll back if needed.

## Tunable parameters

In `lib/premiumWings.js`, change `WING_CONFIG`:
- `widthInShoulders` (2.35) and `heightInShoulders` (2.50) to adjust wing size.
- `backRootSpread` (.285) to move roots farther/closer to spine.
- `backRootDrop` (.245) to move roots lower/higher on upper back.
- `outwardTilt` (.085) to adjust the open angle.

**Important:** A canvas clips at its own rectangle. V08.6 allows wings to exceed the *ideal mirror composition* without shrinking, but their outer portions are still cropped by the actual 720×1280 camera canvas. Drawing them visibly outside the HTML golden mirror frame, or preserving outside-frame portions in a downloadable screenshot, needs a separate overlaid composition canvas and is not part of this patch.

**Status:** Source-level JS/JSX syntax and package integrity verified. Browser camera, iPad, MediaPipe model and actual PNG registration still require testing.
