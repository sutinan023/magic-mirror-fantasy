// V08.4 Premium crystal-butterfly wing renderer.
// The four transparent images must live in public/assets/wings/.
const ASSET_ROOT='/assets/wings';
const ASSET_NAMES=['wing-left-base.png','wing-right-base.png','wing-left-glow.png','wing-right-glow.png'];

const loadImage=(url)=>new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>img.naturalWidth>0?resolve(img):reject(new Error(`Invalid image: ${url}`));
  img.onerror=()=>reject(new Error(`Wing image not found on this web deployment: ${url}`));
  img.src=url;
});

export async function loadPremiumWings(){
 const images=await Promise.all(ASSET_NAMES.map(name=>loadImage(`${ASSET_ROOT}/${name}`)));
 return {left:{base:images[0],glow:images[2]},right:{base:images[1],glow:images[3]}};
}

// Position of the wing-root *within each source PNG* (normalized 0-1).
// If the asset has a different transparent padding, adjust only these values.
export const WING_CONFIG={
 left:{rootX:.85,rootY:.66},
 right:{rootX:.15,rootY:.66},
 scale:1.8,            // source PNG width / shoulder distance (one wing)
 heightScale:1.8,
 opacity:1,
 glowOpacity:.57,
 rootSpread:.45,        // root x = shoulder center +/- 0.45 * shoulder width
 rootLift:.03,          // root y above shoulder center, in shoulder-width units
};

export function drawPremiumWings(ctx,wings,track,now,config=WING_CONFIG){
 if(!wings||!track||track.span<=0||track.opacity<.02)return;
 const canvasWidth=ctx.canvas.width,canvasHeight=ctx.canvas.height;
 const spread=track.span*config.rootSpread;
 const alpha=Math.min(1,track.opacity)*config.opacity;
 const flap=Math.sin(now/570)*.014;
 const pulse=1+Math.sin(now/690)*.016;
 const baseWidth=track.span*config.scale*pulse;
 const baseHeight=track.span*config.heightScale*pulse;
 const rootY=track.y-track.span*config.rootLift;
 ctx.save();ctx.translate(track.x,rootY);ctx.rotate(track.angle||0);
 for(const [side,sign] of [['left',-1],['right',1]]){
  const {base,glow}=wings[side], cfg=config[side];
  const rootX=sign*spread;
  // Keep the roots at the shoulders and constrain the extent to the portrait canvas.
  // We prefer shrinking over truncating the art at a hard canvas edge.
  const space=sign===-1?track.x-spread:canvasWidth-track.x-spread;
  const maxWidth=Math.max(100,space*.98);
  const drawWidth=Math.min(baseWidth,maxWidth/(sign===-1?cfg.rootX:1-cfg.rootX));
  const drawHeight=baseHeight*(drawWidth/baseWidth);
  const x=rootX-cfg.rootX*drawWidth;
  const y=-cfg.rootY*drawHeight;
  ctx.save();ctx.translate(rootX,0);ctx.rotate(sign*flap);ctx.translate(-rootX,0);
  ctx.globalAlpha=alpha;
  ctx.drawImage(base,x,y,drawWidth,drawHeight);
  ctx.globalCompositeOperation='screen';
  ctx.globalAlpha=alpha*config.glowOpacity*(.82+Math.sin(now/440)*.18);
  ctx.drawImage(glow,x,y,drawWidth,drawHeight);
  ctx.restore();
 }
 ctx.restore();
}
