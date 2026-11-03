# Magic Mirror V08.7 — Wing Hold + Soft Body Occlusion

**Based on V08.6 (Body-Fit Crystal Wings), not a new UI.**

## Fixes
1. **Wings persist while hands change gesture**: Once the T-pose summons wings, they remain until the session ends or a photo is captured. True Hand Magic can draw an orb on top without disabling wings.
2. **Wing photo takes priority**: If a hand capture is counting down and wings are summoned, the 3-second countdown restarts for a wing photo. A later hand event cannot replace a wing photo.
3. **No more rectangular chest cutout**: Removed polygon clipping. The foreground is drawn over wing assets with the AI person mask (softened 5 px) or, if unavailable, a curved, feathered fallback mask instead of a square torso clip.
4. **Wing scale** remains based on body size and can extend past the camera image. `lib/premiumWings.js` and all 4 PNG assets unchanged.

## Files to replace
- `components/MagicMirror.jsx`
- `lib/bodySegmentation.js`

Other files in the archive are included for reference and stay unchanged (`lib/premiumWings.js` and `lib/trueHandMagic.js`).
Do NOT replace CSS or Next.js settings. Local port stays **3107**.

## How to test
1. `npm run build`, then `npm run dev` in your existing Magic Mirror project.
2. Stand in front of camera. Hold T-pose 1 second, lower arms, then open/close palm. Both wings and the hand orb should remain visible simultaneously.
3. Compare the previous sharp horizontal shoulder cut with the new softer edge; no boxed torso.
4. Ensure auto capture gives a wings photo after 3-second countdown; test mobile share/save again.
5. If the segmentation model fails, the status will indicate soft-body fallback. Take screenshots to compare.

## Cautions
- The Pose fallback is a soft approximation; for best hair/arm occlusion ensure Image Segmenter loads.
- The current PNG assets are outside this ZIP; keep the four PNGs at `public/assets/wings/`.
- The software was parsed and packaged, but not run through a real webcam/Next.js build in this environment.
- Keep your existing stable Git commit; treat V08.7 as a test release until verified.
