// V08.4 Premium crystal-butterfly wing renderer.
// The four transparent images must live in public/assets/wings/.
const ASSET_ROOT='/assets/wings';
const ASSET_NAMES=['wing-left-base.png','wing-right-base.png','wing-left-glow.png','wing-right-glow.png'];

const loadImage=(url)=>new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>img.naturalWidth>0?resolve(img):reject(new Error(`Invalid image: ${url}`));
  img.onerror=()=>reject(new Error(`Wing image not found: ${url}`));
  img.src=url;
});

export async function loadPremiumWings(){
 const images=await Promise.all(ASSET_NAMES.map(name=>loadImage(`${ASSET_ROOT}/${name}`)));
 return {left:{base:images[0],glow:images[2]},right:{base:images[1],glow:images[3]}};
}

// Position of the wing-root *within each source PNG* (normalized 0-1).
// If the asset has a different transparent padding, adjust only these values.
// V08.5 — Back-rooted Crystal Wings
// Root positions in the PNG are kept intact; MOVE THE ANCHORS ON THE BODY,
// not the artwork. Coordinates are measured relative to shoulder midpoint.
// V08.6 — Body-fit wing sizing. Coordinates are in the portrait CANVAS.
// Left/right names refer to the provided asset artwork, not screen side.
// The person mask drawn AFTER this layer hides roots in front of the torso.
export const WING_CONFIG = {
  left:  {rootX: .85, rootY: .66},
  right: {rootX: .15, rootY: .66},
  // Base size: 2.35 shoulder spans wide, 2.50 shoulder spans high per image.
  // No fit-to-frame min() limit. Values are tied to measured body size.
  widthInShoulders: 2.35,
  heightInShoulders: 2.50,
  // Torso length is measured from shoulder midpoint to hip midpoint if visible.
  // Torso influences size gently; it must never explode if hips are offscreen.
  torsoScaleMin: .88,
  torsoScaleMax: 1.18,
  torsoReference: 1.45,
  backRootSpread: .285, // wing roots inside upper back, not at outside shoulders
  backRootDrop: .245,   // below shoulder line toward scapula rather than neckline
  outwardTilt: .085,
  opacity: 1,
  glowOpacity: .46,
};

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function drawPremiumWings(ctx, wings, track, now, config=WING_CONFIG) {
  if(!wings || !track || track.span<=0 || track.opacity<.02) return;
  const shoulderSpan=track.span;
  const torsoLength=track.torso || shoulderSpan*config.torsoReference;
  // The shoulder-to-hip/shoulder ratio is stable across distance to camera.
  const torsoFactor=clamp(torsoLength/Math.max(1,shoulderSpan)/config.torsoReference,
                          config.torsoScaleMin,config.torsoScaleMax);
  const breath=1+Math.sin(now/1150)*.010;
  const baseWidth=shoulderSpan*config.widthInShoulders*torsoFactor*breath;
  const baseHeight=shoulderSpan*config.heightInShoulders*torsoFactor*breath;
  const alpha=clamp(track.opacity*config.opacity,0,1);
  const spread=shoulderSpan*config.backRootSpread;
  const rootDrop=shoulderSpan*config.backRootDrop;

  ctx.save();
  ctx.translate(track.x,track.y+rootDrop);
  ctx.rotate(track.angle||0);

  for(const [side,sign] of [['left',-1],['right',1]]){
    const asset=wings[side], placement=config[side];
    if(!asset?.base)continue;
    // Symmetrical placement, with each root projected behind an inner scapula.
    // The body's segmentation mask will conceal the image where it intersects
    // head, neck, shoulders and torso. No horizontal or vertical frame cap.
    const localX=sign*spread;
    const tilt=-sign*(config.outwardTilt+Math.sin(now/1250)*.010);
    ctx.save();
    ctx.translate(localX,0);
    ctx.rotate(tilt);
    const dx=-placement.rootX*baseWidth;
    const dy=-placement.rootY*baseHeight;
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=alpha;
    ctx.drawImage(asset.base,dx,dy,baseWidth,baseHeight);
    if(asset.glow){
      ctx.globalCompositeOperation='screen';
      ctx.globalAlpha=alpha*config.glowOpacity*(.90+.10*Math.sin(now/530));
      ctx.drawImage(asset.glow,dx,dy,baseWidth,baseHeight);
    }
    ctx.restore();
  }
  ctx.restore();
}
