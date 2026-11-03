# Magic Mirror V08.2 — Smart Auto Capture

**Based on V08.1 Crystal Butterfly Deluxe**, preserving the approved V04 arched UI, V08 true-hand model, photo share/download flow, existing dependencies, and port **3107**.

## Changes
- After a successful wing gesture, an `ORB_APPEAR` or `BURST` hand event, automatically start a **3-second** visible countdown.
- Wing visibility is locked for up to **5 seconds**, but continues following the shoulder landmarks during the countdown. No static frozen wing overlay.
- Final photo is captured from the latest, already-rendered Canvas frame, not from the screenshot of the countdown overlay.
- Cancels countdown if the Pose model loses the player for over 950 ms.
- Keeps a **ถ่ายเอง** manual fallback.
- Photo preview and mobile Share API unchanged. No photos are sent to a server.

## Install into your existing project
Replace `components/MagicMirror.jsx` with the bundled file. Keep `lib/trueHandMagic.js` from the ZIP or existing V08.1, and keep your existing CSS, WASM, Next.js config, package.json, and port 3107 unchanged.

```bash
npm run build
npm run dev
```

## Acceptance test
1. Raise both arms and hold for 1 second until the wings appear. A 3→2→1 countdown starts.
2. Lower arms a little and move side to side. Wings stay visible and track your shoulders until the image is captured.
3. Preview should show the wings without the countdown numbers. Download on PC or Share on mobile.
4. Restart. Show a palm or complete a hand magic burst; countdown starts automatically.
5. Step out of camera view during countdown; it cancels and no unwanted picture is taken.
6. Verify manual Capture is still available.

## Limitations
- No live camera test or successful Next.js production build performed in this environment.
- Body masking is the approximate Pose-based occlusion from V08.1 (not a true segmentation mask).
- For perfect full-body wings occlusion or exact automatic timing on all mobiles, test and iterate on actual devices.
