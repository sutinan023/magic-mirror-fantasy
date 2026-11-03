# Magic Mirror V08.3 — Crystal Butterfly Shape Fix

Based directly on V08.2 Smart Auto Capture, preserving the existing V04 UI, True Hand Magic, mobile save, 3-second auto capture, and port 3107.

## Fixes
- Replaced broad triangle/fan shapes with **four tapered curved wings on each side** (layered crystal butterfly silhouettes).
- Changed inner veins from huge straight triangle facets to fine curved crystalline ribs.
- Cap wing width to fit inside the portrait canvas; no longer draws main wingtips beyond the gold border.
- Keep each wing rooted at the shoulder blade and preserve approximate torso occlusion.
- None of the gesture tracking, auto capture countdown, hand magic or photo saving was changed.

## Install
Back up current stable code. Copy `components/MagicMirror.jsx` to replace the file in your project. Keep existing `lib/trueHandMagic.js` and all other files unchanged. In the existing project run `npm run build` and `npm run dev` (port **3107**).

## Verify
1. Stand at camera distance similar to the screenshot. Raise arms and wait for wings; check for curved 4-lobe outline and no edge clipping.
2. Lower arms during auto countdown. Check position stays behind the shoulders and photo retains the wings.
3. Try near/far positions: if clipped at close distance, step back to show shoulders and arms.
4. Confirm True Hand Magic, manual photo capture and mobile save still work.

This is a Canvas 2D interpretation of the selected Crystal Butterfly Deluxe mockup, not a photorealistic reproduction. Torso occlusion is still based on Pose geometry instead of real person segmentation. Not camera-tested in this environment.
