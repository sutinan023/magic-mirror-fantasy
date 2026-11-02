# Magic Mirror V08 — True Hand Magic

Integration against the user-provided latest `MagicMirror.jsx`.

## Replace exactly two files in your existing Next.js project

- `components/MagicMirror.jsx` — replace your existing file
- `lib/trueHandMagic.js` — new file; create `lib` if missing

Do NOT replace CSS, package.json, or WASM assets. Your current V07.2 system, mobile share, curved mirror UI, and port 3107 remain intact. The current project must already use `@mediapipe/tasks-vision` (existing V07 dependency).

## Gestures
- Open palm steadily for ~300ms: summon orb
- Hold a fist for 300ms: begin charging
- After at least 1100ms charging, open palm again: burst
- Stretch both arms sideways: the existing wings gesture still works

If the Hand Landmarker fails to load, pose-based Awaken works as a fallback. The Hand model is fetched from Google Storage. Hand and Pose both use your local `/mediapipe/wasm` files. Hand inference is throttled to about 15fps.

## Commands

```bash
npm run build
npm run dev
```

Local port remains 3107 from your existing package.json. For Vercel, commit and push both files to your linked GitHub repository after local verification.

**Known constraints**: single hand, approximation based on 2D finger landmarks, occlusion and mobile performance; must be tested on real camera.
