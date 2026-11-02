// True Hand Magic V08 — browser-side MediaPipe Hand Landmarker adapter.
// Compatible with @mediapipe/tasks-vision (use same version as your Pose Landmarker).
// Does not touch the camera, canvas, wings, photo capture, or network persistence.

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export async function createHandMagic({
  wasmPath = '/mediapipe/wasm',
  modelPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  holdMs = 300,
  chargeMs = 1100,
  cooldownMs = 950,
} = {}) {
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(wasmPath);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: modelPath, delegate },
    runningMode: 'VIDEO', numHands: 1,
    minHandDetectionConfidence: 0.60,
    minHandPresenceConfidence: 0.60,
    minTrackingConfidence: 0.60,
  });
  let landmarker;
  try { landmarker = await HandLandmarker.createFromOptions(fileset, options('GPU')); }
  catch { landmarker = await HandLandmarker.createFromOptions(fileset, options('CPU')); }

  let state = 'SEARCHING';
  let candidate = null, candidateSince = 0, stateSince = 0, lastRelease = -Infinity;
  let smoothPalm = null, lastFrameTime = -Infinity;
  const reset = () => {
    state = 'SEARCHING'; candidate = null; candidateSince = 0;
    stateSince = 0; smoothPalm = null;
  };

  function classify(lm) {
    // Angle-based extension via pip and mcp joints; works in image 2D for front-facing hands.
    const fingers = [[5,6,8],[9,10,12],[13,14,16],[17,18,20]];
    let extended = 0, curled = 0;
    for (const [mcp, pip, tip] of fingers) {
      const ratio = dist(lm[tip], lm[mcp]) / Math.max(.0001, dist(lm[pip], lm[mcp]));
      if (ratio > 1.45) extended++;
      if (ratio < 1.25) curled++;
    }
    if (extended >= 3) return 'OPEN';
    if (curled >= 3) return 'FIST';
    return 'TRANSITION';
  }

  function detect(video, timestampMs, { displayWidth, displayHeight, mirror = true } = {}) {
    if (!video || video.readyState < 2 || timestampMs <= lastFrameTime) return null;
    lastFrameTime = timestampMs;
    const result = landmarker.detectForVideo(video, timestampMs);
    const lm = result.landmarks?.[0];
    if (!lm) { reset(); return { state, gesture:'NONE', palm:null, events:[], charge:0 }; }

    // Palm center = weighted wrist (0), index MCP (5), middle MCP (9), ring MCP (13), pinky MCP (17).
    const indices = [0,5,9,13,17], weights = [.10,.20,.30,.22,.18];
    const raw = { x:0, y:0 };
    indices.forEach((idx,i) => { raw.x+=lm[idx].x*weights[i]; raw.y+=lm[idx].y*weights[i]; });
    smoothPalm = smoothPalm ? {x:smoothPalm.x+(raw.x-smoothPalm.x)*.25,y:smoothPalm.y+(raw.y-smoothPalm.y)*.25} : raw;
    const gesture = classify(lm), events=[];
    if (gesture !== candidate) { candidate=gesture; candidateSince=timestampMs; }
    const stable=timestampMs-candidateSince >= holdMs;
    const setState=(next)=>{ state=next; stateSince=timestampMs; };

    if (state==='SEARCHING' && stable && gesture==='OPEN') { setState('ORB'); events.push('ORB_APPEAR'); }
    else if (state==='ORB' && stable && gesture==='FIST') { setState('CHARGING'); events.push('CHARGE_START'); }
    else if (state==='CHARGING' && stable && gesture==='OPEN') {
      if (timestampMs-stateSince >= chargeMs && timestampMs-lastRelease>=cooldownMs) {
        events.push('BURST'); lastRelease=timestampMs;
      } else events.push('CHARGE_CANCEL');
      setState('ORB');
    }
    const charge=state==='CHARGING'?clamp((timestampMs-stateSince)/chargeMs,0,1):0;
    // Convert image landmark to covered/mirrored canvas coordinate.
    // This matches a canvas renderer drawing video with object-fit: cover.
    let canvasPalm=null;
    if (displayWidth && displayHeight && video.videoWidth && video.videoHeight) {
      const scale=Math.max(displayWidth/video.videoWidth,displayHeight/video.videoHeight);
      const dw=video.videoWidth*scale,dh=video.videoHeight*scale;
      const ox=(displayWidth-dw)/2,oy=(displayHeight-dh)/2;
      const px=ox+smoothPalm.x*dw;
      canvasPalm={x:mirror?displayWidth-px:px,y:oy+smoothPalm.y*dh};
    }
    return {state,gesture,palm:smoothPalm,canvasPalm,events,charge};
  }
  return {detect,reset,close:()=>landmarker.close()};
}
