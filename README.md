# Magic Mirror V08.5 — Wing Photo Diagnostic Fix

Based on V08.4 Premium Wings + Body Segmentation, not on earlier Canvas wing versions.

## Fixed
- `ORB_APPEAR` no longer triggers automatic photography before wings have time to appear.
- Wing activation can override an already active spell countdown; restarts the 3-second timer for wings.
- If PNG assets are unavailable, the app explains that the four files must be committed and deployed.
- Wing countdown refuses to save a frame if the assets are missing or the wing effect opacity is too low.
- Capture label distinguishes `CRYSTAL WINGS MOMENT` from `MAGIC BURST MOMENT`.
- Manual capture remains available.

## Very important: V08.4 ZIP did not include your PNG assets
Copy these from your existing project into the Vercel-bound repository:

```
public/assets/wings/wing-left-base.png
public/assets/wings/wing-right-base.png
public/assets/wings/wing-left-glow.png
public/assets/wings/wing-right-glow.png
```

Check these paths from the exact iPad website: `https://YOUR-APP.vercel.app/assets/wings/wing-left-base.png` (and the other three). An image must open, NOT a 404.

## Replace files
- `components/MagicMirror.jsx`
- `lib/premiumWings.js`

Keep `lib/bodySegmentation.js`, `lib/trueHandMagic.js`, your CSS, and all other UI unchanged. Port stays **3107**.

## Test
1. Commit/deploy all four PNG assets along with the new code.
2. Reload iPad browser fully (close PWA/reopen if necessary).
3. Open wings and hold arms extended for one second. Wait for three-second countdown; preview should say **CRYSTAL WINGS MOMENT**.
4. Test hand magic separately; `ORB_APPEAR` will not auto-shoot, while a `BURST` does.
5. Verify segmentation doesn't cover wings: disable it temporarily only if a debugging step is needed.

Verified: source syntax/structure only; camera, Vercel asset availability and iPad have not been tested in this environment.
