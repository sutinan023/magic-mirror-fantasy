// MediaPipe Image Segmenter: draw ONLY the person back over the wings.
// Mask is mapped with the same cover crop + mirroring used by MagicMirror.jsx.
const DEFAULT_MODEL='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

export async function createBodySegmentation({vision,wasmPath='/mediapipe/wasm',modelAssetPath=DEFAULT_MODEL}={}){
 const {ImageSegmenter,FilesetResolver}=vision||await import('@mediapipe/tasks-vision');
 const fileset=await FilesetResolver.forVisionTasks(wasmPath);
 let segmenter;
 try{
  segmenter=await ImageSegmenter.createFromOptions(fileset,{
   baseOptions:{modelAssetPath,delegate:'GPU'},runningMode:'VIDEO',
   outputCategoryMask:false,outputConfidenceMasks:true,
  });
 }catch(err){
  console.warn('Segmentation GPU unavailable, switching to CPU',err);
  segmenter=await ImageSegmenter.createFromOptions(fileset,{
   baseOptions:{modelAssetPath,delegate:'CPU'},runningMode:'VIDEO',
   outputCategoryMask:false,outputConfidenceMasks:true,
  });
 }
 const mask=document.createElement('canvas'),maskCtx=mask.getContext('2d',{willReadFrequently:true});
 const foreground=document.createElement('canvas');const fctx=foreground.getContext('2d');
 let fresh=false;
 function detect(video,timestamp){
  // The mask buffer provided to the callback becomes invalid after the callback.
  segmenter.segmentForVideo(video,timestamp,(result)=>{
   const person=result.confidenceMasks?.[1];
   if(!person){fresh=false;return;}
   if(mask.width!==person.width||mask.height!==person.height){mask.width=person.width;mask.height=person.height;}
   const values=person.getAsFloat32Array();
   const image=maskCtx.createImageData(person.width,person.height);
   for(let i=0;i<values.length;i++){
    const a=Math.min(1,Math.max(0,(values[i]-.32)/.42));
    const j=i*4;image.data[j]=255;image.data[j+1]=255;image.data[j+2]=255;
    image.data[j+3]=Math.round(a*a*(3-2*a)*255);
   }
   maskCtx.putImageData(image,0,0);fresh=true;
  });
 }
 function drawForeground(ctx,video,cover){
  if(!fresh||!mask.width||!mask.height)return false;
  const {width,height,dw,dh,ox,oy}=cover;
  if(foreground.width!==width||foreground.height!==height){foreground.width=width;foreground.height=height;}
  fctx.clearRect(0,0,width,height);
  fctx.save();fctx.translate(width,0);fctx.scale(-1,1);
  fctx.drawImage(video,ox,oy,dw,dh);fctx.restore();
  fctx.globalCompositeOperation='destination-in';
  fctx.save();fctx.translate(width,0);fctx.scale(-1,1);
  fctx.filter='blur(5px)';fctx.drawImage(mask,ox,oy,dw,dh);fctx.filter='none';fctx.restore();
  fctx.globalCompositeOperation='source-over';
  ctx.drawImage(foreground,0,0);
  return true;
 }
 return {detect,drawForeground,hasMask(){return fresh && mask.width>0 && mask.height>0;},close(){segmenter.close();mask.width=0;foreground.width=0;fresh=false;}};
}


// V08.7 fallback — soft-edged body reconstruction when AI segmentation is
// unavailable. A blurred *curved silhouette* replaces the old squared torso
// hole. This intentionally approximates a front-facing pose, not full AI depth.
let poseSurface=null, poseMask=null;
export function drawSoftPoseForeground(ctx,video,lm,cover){
  const {width:w,height:h,dw,dh,ox,oy}=cover;
  const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>.32;
  const left=lm?.[11],right=lm?.[12],hipL=lm?.[23],hipR=lm?.[24];
  if(!valid(left)||!valid(right))return false;
  if(!poseSurface){poseSurface=document.createElement('canvas');poseMask=document.createElement('canvas');}
  for(const c of [poseSurface,poseMask]){if(c.width!==w||c.height!==h){c.width=w;c.height=h;}}
  const front=poseSurface.getContext('2d'),mask=poseMask.getContext('2d');
  const pt=p=>({x:w-(ox+p.x*dw),y:oy+p.y*dh});
  const L=pt(left),R=pt(right);
  const shoulderX=(L.x+R.x)/2,shoulderY=(L.y+R.y)/2;
  const span=Math.max(44,Math.hypot(L.x-R.x,L.y-R.y));
  const leftX=Math.min(L.x,R.x),rightX=Math.max(L.x,R.x);
  const pelvis=valid(hipL)&&valid(hipR)?(pt(hipL).y+pt(hipR).y)/2:shoulderY+span*1.75;
  const hem=Math.min(h+80,Math.max(shoulderY+span*1.05,pelvis+span*.18));
  mask.clearRect(0,0,w,h);
  mask.fillStyle='#fff';
  // Round the upper shoulders so no horizontal line appears on the chest.
  mask.beginPath();
  mask.moveTo(shoulderX,shoulderY-span*.33);
  mask.bezierCurveTo(shoulderX-span*.18,shoulderY-span*.36,leftX-span*.11,shoulderY-span*.22,leftX-span*.21,shoulderY+span*.12);
  mask.bezierCurveTo(leftX-span*.35,shoulderY+span*.46,leftX-span*.26,hem-span*.18,leftX-span*.18,hem+span*.2);
  mask.lineTo(rightX+span*.18,hem+span*.2);
  mask.bezierCurveTo(rightX+span*.26,hem-span*.18,rightX+span*.35,shoulderY+span*.46,rightX+span*.21,shoulderY+span*.12);
  mask.bezierCurveTo(rightX+span*.11,shoulderY-span*.22,shoulderX+span*.18,shoulderY-span*.36,shoulderX,shoulderY-span*.33);
  mask.closePath();mask.fill();
  // Head/hair use a round silhouette to keep wing roots behind the face.
  const face=valid(lm[0])?pt(lm[0]):{x:shoulderX,y:shoulderY-span*.68};
  mask.beginPath();mask.ellipse(face.x,shoulderY-span*.79,span*.43,span*.64,0,0,Math.PI*2);mask.fill();
  front.clearRect(0,0,w,h);
  front.save();front.translate(w,0);front.scale(-1,1);
  front.drawImage(video,ox,oy,dw,dh);front.restore();
  front.globalCompositeOperation='destination-in';
  front.save();front.filter='blur(16px)';front.drawImage(poseMask,0,0);front.restore();
  front.globalCompositeOperation='source-over';
  ctx.drawImage(poseSurface,0,0);
  return true;
}
