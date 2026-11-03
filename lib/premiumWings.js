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
export const WING_CONFIG={
 left:{rootX:.85,rootY:.66},
 right:{rootX:.15,rootY:.66},
 scale:1.95,
 heightScale:2.05,
 opacity:1,
 glowOpacity:.53,
 backRootSpread:.235,  // each root is 23.5% of shoulder width from spine
 backRootDrop:.145,    // drop below shoulder line toward upper shoulder blades
 outwardTilt:.075,    // subtle out-and-up angle, radians
 margin:20,           // preserve tips inside the portrait canvas
};

export function drawPremiumWings(ctx,wings,track,now,config=WING_CONFIG){
 if(!wings||!track||track.span<=0||track.opacity<.02)return;
 const cw=ctx.canvas.width,ch=ctx.canvas.height;
 const alpha=Math.min(1,track.opacity)*config.opacity;
 const span=track.span, spread=span*config.backRootSpread;
 const rootY=track.y+span*config.backRootDrop;
 const widthTarget=span*config.scale*(1+Math.sin(now/850)*.012);
 const heightTarget=span*config.heightScale*(1+Math.sin(now/930)*.014);
 // Rotate symmetrically so both sets of tips point away from the spine.
 // Body Segmentation reconstructs the person over the inner wing roots.
 ctx.save();
 ctx.translate(track.x,rootY);
 ctx.rotate(track.angle||0);
 for(const [side,sign] of [['left',-1],['right',1]]){
  const asset=wings[side],cfg=config[side];
  if(!asset?.base||!asset?.glow)continue;
  const rootX=sign*spread;
  const wingTilt=-sign*(config.outwardTilt+Math.sin(now/1080)*.008);
  const outerRatio=sign===-1?cfg.rootX:1-cfg.rootX;
  // Conservative fit: allow space for rotation, and keep the apparent root
  // buried under the torso instead of sliding it back to the shoulder edge.
  const availableX=Math.max(45,(sign===-1?track.x+rootX:cw-track.x-rootX)-config.margin);
  const maxWidth=Math.max(42,availableX/(outerRatio+Math.abs(Math.sin(wingTilt))*.24));
  const width=Math.min(widthTarget,maxWidth);
  const height=heightTarget*(width/widthTarget);
  // Limit upper and lower tips without changing the stable root position.
  const availableTop=Math.max(50,rootY-config.margin);
  const availableBottom=Math.max(70,ch-config.margin-rootY);
  const h=Math.min(height,availableTop/Math.max(.20,cfg.rootY),
                        availableBottom/Math.max(.20,1-cfg.rootY));
  const x=-cfg.rootX*width,y=-cfg.rootY*h;
  ctx.save();
  ctx.translate(rootX,0);
  ctx.rotate(wingTilt);
  // Near-root transparency is provided by the person mask. Do not use
  // globalCompositeOperation='screen' for the base PNG: preserve its texture.
  ctx.globalAlpha=alpha;
  ctx.drawImage(asset.base,x,y,width,h);
  ctx.globalCompositeOperation='screen';
  ctx.globalAlpha=alpha*config.glowOpacity*(.88+Math.sin(now/550)*.12);
  ctx.drawImage(asset.glow,x,y,width,h);
  ctx.restore();
 }
 ctx.restore();
}
