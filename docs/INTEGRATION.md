# V08 — Integration into existing V07.2 MagicMirror.jsx

**Important:** This archive is an additive Hand Engine, not a replacement for the working project.
Keep the V07.2 copy and original `MagicMirror.jsx` unchanged until testing passes.

## 1. Copy module
Copy `lib/trueHandMagic.js` into the project's `lib/` folder.

## 2. Import and refs
At the beginning of `components/MagicMirror.jsx`:

```jsx
import { createHandMagic } from '../lib/trueHandMagic';
```

Inside the React component:

```jsx
const handMagicRef = useRef(null);
const [handMagicStatus, setHandMagicStatus] = useState('SEARCHING');
```

## 3. Initialize after the pose model has loaded

```jsx
handMagicRef.current = await createHandMagic({ wasmPath: '/mediapipe/wasm' });
```

If you don't want a hand-model load failure to break the whole mirror, wrap this in its own `try/catch` and leave handMagicRef.current null on failure.

## 4. Detect hand inside the existing requestAnimationFrame loop
After the video is ready and after Pose detection (NOT before video.play()):

```jsx
const hand = handMagicRef.current?.detect(video, timestamp, {
  displayWidth: canvas.width,
  displayHeight: canvas.height,
  mirror: true,
});
if (hand) {
  setHandMagicStatus(hand.state);
  if (hand.canvasPalm) {
    // Render your V07 orb using hand.canvasPalm.x and hand.canvasPalm.y.
    // Keep Pose-based palm as fallback if Hand Landmarker misses a frame.
  }
  if (hand.events.includes('ORB_APPEAR')) {
    // spawn glowing orb
  }
  if (hand.events.includes('CHARGE_START')) {
    // accelerate rune rings / energy particles
  }
  if (hand.events.includes('BURST')) {
    // trigger shockwave / particle burst
  }
}
```

**Do not run the two ML models every animation frame on low-powered phones.** Run pose/hand inference at a limited frequency (e.g. 15–20 Hz), render particles every frame, and reuse the last detected positions.

## 5. Cleanup

```jsx
handMagicRef.current?.close();
handMagicRef.current = null;
```

Use existing cleanup/reset logic for this. Keep wings, frame CSS, photo capture and port 3107 exactly as before.

## Behavior
- Open hand steady for 300ms → ORB_APPEAR.
- Close to fist steady for 300ms → CHARGE_START.
- Return to open hand after >=1100ms charging → BURST.
- Detection is for one hand. Use good lighting and place palm in frame.

## Known constraints
- Hands partly out of frame or sideways can misclassify.
- Open/closed detection uses 2D relative ratios, not a learned Gesture Recognizer.
- MediaPipe model is loaded from Google storage at first access, so Internet is required unless self-hosted.
- For children's event applications, avoid saving webcam footage without consent.
