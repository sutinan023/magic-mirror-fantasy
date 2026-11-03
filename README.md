# Magic Mirror V08.5 — Back-Rooted Crystal Wings

Base: V08.4 Premium Wings + Body Segmentation.

## Updated files
- `lib/premiumWings.js` — main change: move roots toward the spine, lower toward shoulder blades; outward tilt; preserve alpha and portrait bounds.
- `components/MagicMirror.jsx` — version label only.
- `lib/bodySegmentation.js` — unchanged from V08.4.
- `lib/trueHandMagic.js` — unchanged from V08.4.

## Installation (existing project only)
Copy `lib/premiumWings.js` to `C:\\xampp\\htdocs\\magic-mirror-fantasy-js\\lib\\premiumWings.js`.
Optionally copy `components/MagicMirror.jsx` to update displayed version number.
**No CSS, routing, package.json, Hand Magic, Auto Capture, or photo-save changes.**

The 4 existing transparent PNG images must remain:
- `public/assets/wings/wing-left-base.png`
- `public/assets/wings/wing-right-base.png`
- `public/assets/wings/wing-left-glow.png`
- `public/assets/wings/wing-right-glow.png`

## Main difference
Previously roots sat at x = ±45% of shoulder width (the shoulder edge), slightly above the shoulder line.
Now roots are x = ±23.5% of shoulder width (upper back region projected into camera), y = +14.5% of shoulder width (below the shoulder line).
The person segmentation is drawn **over the wing images** to conceal their internal roots; the visible wing portions emerge from behind the torso.

This is a 2D visual illusion. A front-facing camera cannot directly measure the real scapula behind the body, so the position is an estimate.

## Adjustable parameters
In `WING_CONFIG`:
- `backRootSpread` (default 0.235): 0.20 moves roots closer to spine; 0.29 moves them apart
- `backRootDrop` (default 0.145): 0.10 moves roots higher; 0.20 lower
- `outwardTilt` (default 0.075): changes outward angle subtly
- `scale`, `heightScale`: size before portrait containment
- `glowOpacity`: glow strength

## Testing
1. `npm run build` then `npm run dev`, app on port **3107** (unchanged)
2. Face the camera, activate wings, lower arms and turn shoulders slightly
3. Confirm wing roots disappear behind torso instead of sitting on shoulder outline
4. Confirm both wings remain present in 3-second auto-captured photo
5. Test on iPad/iPhone HTTPS. If segmentation fails, legacy torso approximate mask remains a fallback.

### Limitations
- Image asset roots must match source PNG padding. The PNGs were not provided; these normalized positions use the working V08.4 calibration.
- True 3D depth / shoulder rotation would require additional estimation.
- Syntax and renderer geometry checks performed; browser/camera tests still required.
