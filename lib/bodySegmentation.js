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
    const a=Math.min(1,Math.max(0,(values[i]-.24)/.54));
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
  fctx.drawImage(mask,ox,oy,dw,dh);fctx.restore();
  fctx.globalCompositeOperation='source-over';
  ctx.drawImage(foreground,0,0);
  return true;
 }
 return {detect,drawForeground,close(){segmenter.close();mask.width=0;foreground.width=0;fresh=false;}};
}
