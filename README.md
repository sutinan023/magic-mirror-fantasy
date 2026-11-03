# Magic Mirror V08.1 — Crystal Butterfly Deluxe

Patch to the **V08 Integrated** release. This package contains only two code files:
- `components/MagicMirror.jsx` — replace the old component entirely.
- `lib/trueHandMagic.js` — same V08 engine, preserve/copy as needed.

**Unchanged:** Hand gestures, hand model, photo capture, mobile Share, all JSX layout/CSS, WASM install, and local Next.js port **3107**.

## Wing redesign
- Four pointed stained-glass butterfly lobes (two per side) instead of four rounded petals.
- Gold structural spine, cyan/violet/pink crystal facets, sparkly trim.
- Two independent shoulder-blade attachment points rather than single chest origin.
- Wing path stays behind/outside the torso; approximate **Pose-based torso occlusion** masks overlapping wing portions. This is not full Image Segmentation; crossing arms and rotating sideways may still expose inaccuracies.
- Subtle wing motion; existing arms-open 1-second gesture remains intact.

## Install and test
1. Backup or Git commit working V08 first.
2. Replace `components/MagicMirror.jsx` and keep/add `lib/trueHandMagic.js`.
3. Run `npm run build`, then `npm run dev` (port 3107).
4. Open with full shoulders and torso visible. Extend both arms level with shoulders for ~1s.
5. Verify four crystal lobes emerge from shoulder blades, not sternum. Confirm normal hand spell and mobile image Save still work.
6. Test with sideways pose and crossed arms; true pixel-perfect body occlusion is deferred to a segmentation-based release.

**Validation:** JSX syntax parsing is performed, but real-camera and production build remain to be validated locally in the user's Next.js project. No Vercel deployment is performed by this package.
