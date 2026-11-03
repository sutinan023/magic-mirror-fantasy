'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Download, RefreshCcw, Sparkles, WandSparkles, Volume2, VolumeX } from 'lucide-react';
import { createHandMagic } from '../lib/trueHandMagic';
import { loadPremiumWings, drawPremiumWings } from '../lib/premiumWings';
import { createBodySegmentation, drawSoftPoseForeground } from '../lib/bodySegmentation';

const WASM='/mediapipe/wasm';
// Pose Landmarker also provides thumb/index/pinky landmarks (22/20/18 on the
// right, 21/19/17 on the left). Estimate the middle of the palm instead of
// anchoring the spell directly on the wrist. If fingers are outside the shot,
// extend the elbow -> wrist vector by a modest amount as a fallback.
function palmAnchor(lm, side){
 const wrist=lm[side==='right'?16:15], elbow=lm[side==='right'?14:13];
 const index=lm[side==='right'?20:19], pinky=lm[side==='right'?18:17];
 const visible=p=>p && (p.visibility??1)>.45 && Number.isFinite(p.x) && Number.isFinite(p.y);
 if(!visible(wrist))return null;
 if(visible(index)&&visible(pinky)){
   const fingerCenter={x:(index.x+pinky.x)/2,y:(index.y+pinky.y)/2};
   return {x:wrist.x*.20+fingerCenter.x*.80,y:wrist.y*.20+fingerCenter.y*.80};
 }
 if(visible(elbow))return {x:wrist.x+(wrist.x-elbow.x)*.33,y:wrist.y+(wrist.y-elbow.y)*.33};
 return {x:wrist.x,y:wrist.y};
}

// V07: luminous hand-held arcane orb. Canvas only; no extra model or GPU dependency.
// Coordinate anchor comes from existing palmAnchor() and is smoothed each frame.
function drawArcaneOrb(ctx,x,y,time,activatedAt,chargeProgress){
 const charged=activatedAt>0 && time-activatedAt<3200;
 const t=time*.001, power=charged?1:Math.max(.16,chargeProgress/100);
 const radius=(charged?43:28)*(1+Math.sin(t*4.3)*.055);
 ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='screen';
 // Massive soft aura, with violet and cyan prismatic fringes.
 for(const [scale,color] of [[4.3,'rgba(127,61,255,0)'],[3.25,'rgba(158,86,255,0.045)']]){
  const a=ctx.createRadialGradient(0,0,0,0,0,radius*scale);
  a.addColorStop(0,`rgba(255,244,204,${.23*power})`);
  a.addColorStop(.22,`rgba(255,181,95,${.24*power})`);
  a.addColorStop(.52,`rgba(145,91,246,${.16*power})`);
  a.addColorStop(1,color);ctx.fillStyle=a;
  ctx.beginPath();ctx.arc(0,0,radius*scale,0,Math.PI*2);ctx.fill();
 }
 // Rotating rune rings: two elliptical orbits at opposing angles.
 for(let ring=0;ring<3;ring++){
  ctx.save();ctx.rotate((ring%2?-1:1)*t*(.65+ring*.2)+ring*1.05);
  ctx.scale(1,.42+ring*.07);
  ctx.strokeStyle=ring===1?`rgba(158,227,255,${.72*power})`:`rgba(255,214,142,${.84*power})`;
  ctx.lineWidth=ring===0?2.5:1.6;ctx.setLineDash(ring===2?[4,9]:[]);
  ctx.beginPath();ctx.ellipse(0,0,radius*(1.55+ring*.29),radius*(1.55+ring*.29),0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  for(let j=0;j<6;j++){
   const a=j*Math.PI/3+t*(ring%2?-1.4:1.2);
   const rr=radius*(1.55+ring*.29),px=Math.cos(a)*rr,py=Math.sin(a)*rr;
   ctx.fillStyle=j%2?`rgba(151,225,255,${power})`:`rgba(255,228,164,${power})`;
   ctx.beginPath();ctx.arc(px,py,ring===0?2.8:1.9,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 // Core of the spell, prismatic energy compressed into a white-hot center.
 const core=ctx.createRadialGradient(-radius*.24,-radius*.22,1,0,0,radius*1.25);
 core.addColorStop(0,`rgba(255,255,247,${.98*power})`);
 core.addColorStop(.20,`rgba(255,235,180,${.92*power})`);
 core.addColorStop(.48,`rgba(250,165,255,${.77*power})`);
 core.addColorStop(.76,`rgba(108,205,255,${.46*power})`);
 core.addColorStop(1,'rgba(97,61,236,0)');
 ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,radius*1.25,0,Math.PI*2);ctx.fill();
 // Flowing plasma loops and outward star spikes.
 for(let k=0;k<8;k++){
  const a=t*.38+k*Math.PI/4,outer=radius*(2+Math.sin(t*3+k)*.24);
  ctx.strokeStyle=`rgba(${k%2?'156,225,255':'255,216,151'},${.60*power})`;
  ctx.lineWidth=k%2?1.2:1.7;ctx.beginPath();
  ctx.moveTo(Math.cos(a)*radius*.75,Math.sin(a)*radius*.75);
  ctx.quadraticCurveTo(Math.cos(a+.26)*outer*.85,Math.sin(a+.26)*outer*.85,Math.cos(a+.44)*outer,Math.sin(a+.44)*outer);
  ctx.stroke();
 }
 // Trigger flare lasts about 0.65 seconds, easing outward.
 if(charged){
  const age=Math.max(0,time-charged),u=Math.min(1,age/650);
  if(u<1){ctx.strokeStyle=`rgba(255,225,166,${.88*(1-u)})`;
   ctx.lineWidth=5*(1-u)+1;ctx.beginPath();ctx.arc(0,0,radius*(1.1+u*4),0,Math.PI*2);ctx.stroke();}
 }
 ctx.restore();
}

const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export default function MagicMirror(){
 const videoRef=useRef(null),canvasRef=useRef(null), landmarkerRef=useRef(null),streamRef=useRef(null),rafRef=useRef(0);
  const premiumWingsRef=useRef(null),bodySegRef=useRef(null),lastSegFrameRef=useRef(0);
  const [wingAssetStatus,setWingAssetStatus]=useState('pending'),[segStatus,setSegStatus]=useState('pending');
 // Auto capture is driven by the video render clock, NOT by a timeout that may fire
 // before the latest wings and hand particles have been painted on the Canvas.
 const autoPhotoRef=useRef(null),captureFrameRef=useRef(null),wingLockUntilRef=useRef(0),lastPoseSeenRef=useRef(0);
 const [countdown,setCountdown]=useState(null),[photoCue,setPhotoCue]=useState('');
 const wingLandmarksRef=useRef(null),wingActivatedRef=useRef(false);
 const handMagicRef=useRef(null),handMagicLastRef=useRef(null),handMagicFrameRef=useRef(0),handBurstRef=useRef(0);
 const wingsRef=useRef({x:0,y:0,span:0,angle:0,opacity:0,target:0,burst:0}),wingHoldRef=useRef(null),lastWingTriggerRef=useRef(0),wingShownRef=useRef(false);
 const progressRef=useRef(0),sparksRef=useRef([]),lastSeenRef=useRef(-1),handRef=useRef(null),holdStartRef=useRef(null),lastFrameRef=useRef(0),lastTriggerRef=useRef(0),activeRef=useRef(false),effectTimeRef=useRef(0),phaseRef=useRef('welcome');
 const [phase,setPhase]=useState('welcome'),[status,setStatus]=useState('กล้องพร้อมจะเริ่มเมื่อคุณกดปุ่ม'),[progress,setProgress]=useState(0),[spellCount,setSpellCount]=useState(0),[wingCount,setWingCount]=useState(0),[wingProgress,setWingProgress]=useState(0),[snapshot,setSnapshot]=useState(null),[muted,setMuted]=useState(true),[error,setError]=useState(null),[handStatus,setHandStatus]=useState('เริ่มระบบเวทมือ'),[handMode,setHandMode]=useState(false),[chargePercent,setChargePercent]=useState(0);
 useEffect(()=>{phaseRef.current=phase},[phase]);
 const stop=useCallback(()=>{autoPhotoRef.current=null;captureFrameRef.current=null;wingLockUntilRef.current=0;lastPoseSeenRef.current=0;setCountdown(null);setPhotoCue('');cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;landmarkerRef.current?.close();landmarkerRef.current=null;
  bodySegRef.current?.close();bodySegRef.current=null;lastSegFrameRef.current=0;handMagicRef.current?.close();handMagicRef.current=null;handMagicLastRef.current=null;handMagicFrameRef.current=0;handBurstRef.current=0;wingLandmarksRef.current=null;wingActivatedRef.current=false;holdStartRef.current=null;handRef.current=null;progressRef.current=0;activeRef.current=false;sparksRef.current=[];wingHoldRef.current=null;wingShownRef.current=false;wingsRef.current={x:0,y:0,span:0,torso:0,angle:0,opacity:0,target:0,burst:0};},[]);
 useEffect(()=>()=>{stop()},[stop]);
 const playChime=useCallback(()=>{if(muted)return;try{const ctx=new AudioContext();const t=ctx.currentTime;[523.25,659.25,783.99].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,t+i*.1);g.gain.exponentialRampToValueAtTime(.065,t+i*.1+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.1+.5);o.connect(g).connect(ctx.destination);o.start(t+i*.1);o.stop(t+i*.1+.52)});setTimeout(()=>ctx.close(),1100)}catch{}},[muted]);
 const draw=useCallback((timestamp)=>{
  const canvas=canvasRef.current,video=videoRef.current,model=landmarkerRef.current;if(!canvas||!video||!model||phaseRef.current!=='play')return;
  const ctx=canvas.getContext('2d');if(!ctx)return;const w=canvas.width,h=canvas.height;
  const beginAutoPhoto=(kind)=>{
   if(phaseRef.current!=='play')return;
   // After wings appear, never replace their photo with a hand-only capture.
   if(kind!=='wings' && wingActivatedRef.current)return;
   if(autoPhotoRef.current?.kind==='wings')return;
   // Wings can upgrade an earlier hand countdown; restart the full 3 seconds.
   if(autoPhotoRef.current && kind!=='wings')return;
   autoPhotoRef.current={kind,startedAt:timestamp,shootAt:timestamp+3000};
   setPhotoCue(kind==='wings'?'ปีกคริสตัลพร้อมแล้ว! โพสท่าเลย':kind==='burst'?'ปล่อยพลังสำเร็จ! เตรียมถ่าย':'ลูกแก้วพร้อมแล้ว! ยิ้มได้เลย');
   setCountdown(3);
   if(kind==='wings')wingLockUntilRef.current=timestamp+5000;
  };
  ctx.clearRect(0,0,w,h);
  if(video.readyState>=2){
    // cover scaling, mirrored horizontally, matches landmark conversion below
    const vw=video.videoWidth,vh=video.videoHeight,scale=Math.max(w/vw,h/vh),dw=vw*scale,dh=vh*scale,ox=(w-dw)/2,oy=(h-dh)/2;
    ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(video,ox,oy,dw,dh);ctx.restore();
    // restrained fantasy treatment

    if(timestamp-lastFrameRef.current>32){
      lastFrameRef.current=timestamp;
      try{
       const result=model.detectForVideo(video,timestamp),lm=result.landmarks?.[0];
       if(lm){
        lastPoseSeenRef.current=timestamp;
        wingLandmarksRef.current=lm;
        const shoulder=lm[12],wrist=lm[16],leftShoulder=lm[11],leftWrist=lm[15];
        const isVisible=(p)=>p && (p.visibility??1)>.6;
        // The wings are activated when both arms extend horizontally, not simply raised.
        const leftElbow=lm[13],rightElbow=lm[14];
        // MediaPipe landmarks are in camera-image coordinates (before mirroring).
        // Use shoulder-relative arm span without assuming camera-left/right orientation.
        const shoulderWidth=Math.abs(shoulder.x-leftShoulder.x);
        const armSpan=Math.abs(leftWrist.x-wrist.x);
        const visibleArms=[leftShoulder,shoulder,leftElbow,rightElbow,leftWrist,wrist].every(isVisible);
        const extended=visibleArms
          && Math.abs(leftWrist.y-leftShoulder.y)<.22
          && Math.abs(wrist.y-shoulder.y)<.22
          && armSpan>Math.max(.24,shoulderWidth*2.0)
          && Math.abs(leftWrist.x-leftShoulder.x)>shoulderWidth*.55
          && Math.abs(wrist.x-shoulder.x)>shoulderWidth*.55;
        const wings=wingsRef.current;
        const cx=w-(ox+((leftShoulder.x+shoulder.x)/2)*dw);
        const cy=oy+((leftShoulder.y+shoulder.y)/2)*dh;
        const span=Math.hypot((shoulder.x-leftShoulder.x)*dw,(shoulder.y-leftShoulder.y)*dh);
        const tilt=Math.atan2((shoulder.y-leftShoulder.y)*dh,-(shoulder.x-leftShoulder.x)*dw);
        const smooth=wings.span?0.15:1;
        wings.x+=(cx-wings.x)*smooth;wings.y+=(cy-wings.y)*smooth;
        // Estimate body dimensions with the same crop and mirrored coordinate
        // system as the camera. If hips are not reliable, preserve recent
        // torso length or use a shoulder-based fallback.
        const leftHip=lm[23],rightHip=lm[24];
        const hipsVisible=[leftHip,rightHip].every(p=>p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility??1)>.48);
        let torso=span*1.45;
        if(hipsVisible){
          const hipX=w-(ox+((leftHip.x+rightHip.x)/2)*dw);
          const hipY=oy+((leftHip.y+rightHip.y)/2)*dh;
          const measured=Math.hypot(hipX-cx,hipY-cy);
          if(measured>span*.65 && measured<span*2.6)torso=measured;
          else if(wings.torso)torso=wings.torso;
        }else if(wings.torso)torso=wings.torso;
        wings.span+=(span-wings.span)*smooth;
        wings.torso+=(torso-wings.torso)*smooth;
        wings.angle+=(tilt-wings.angle)*smooth;
        if(extended){
          if(wingHoldRef.current===null)wingHoldRef.current=timestamp;
          const held=timestamp-wingHoldRef.current;
          setWingProgress(Math.min(100,Math.floor(held/1000*100)));
          if(held>=1000 && !wingActivatedRef.current && timestamp-lastWingTriggerRef.current>1800){
            wingShownRef.current=true;wingActivatedRef.current=true;lastWingTriggerRef.current=timestamp;wings.burst=timestamp;
            setWingCount(n=>n+1);setStatus('WINGS OF LIGHT — ปีกเวทมนตร์ปรากฏแล้ว!');playChime();beginAutoPhoto('wings');
            for(let k=0;k<90;k++){const a=Math.random()*Math.PI*2,vel=1+Math.random()*5;
              sparksRef.current.push({x:cx+(Math.random()-.5)*span*2,y:cy+(Math.random()-.5)*span,vx:Math.cos(a)*vel,vy:Math.sin(a)*vel,life:48+Math.random()*35,max:83,r:1+Math.random()*3,hue:k%3?44:273});}
          }
          wings.target=wingActivatedRef.current?1:.22;
        }else{
          wingHoldRef.current=null;wingShownRef.current=false;setWingProgress(0);wings.target=(wingActivatedRef.current || timestamp<wingLockUntilRef.current)?1:0;
        }
        const rightUp=isVisible(shoulder)&&isVisible(wrist)&&wrist.y<shoulder.y-.10;
        const leftUp=isVisible(leftShoulder)&&isVisible(leftWrist)&&leftWrist.y<leftShoulder.y-.10;
        const which=!handMagicRef.current ? (rightUp?palmAnchor(lm,'right'):leftUp?palmAnchor(lm,'left'):null) : null;
        if(which){
          // camera crop + mirror transform: pixels in frame after mirroring
          const px=w-(ox+which.x*dw),py=oy+which.y*dh;
          // Low-pass filter prevents the orb jittering as finger landmarks move.
          const prev=handRef.current;
          handRef.current=prev?{x:prev.x+(px-prev.x)*.24,y:prev.y+(py-prev.y)*.24}:{x:px,y:py};
          if(holdStartRef.current===null)holdStartRef.current=timestamp;
          const held=timestamp-holdStartRef.current;
          progressRef.current=Math.min(100,Math.floor(held/700*100));setProgress(progressRef.current);
          if(held>=700 && timestamp-lastTriggerRef.current>1600 && !activeRef.current){activeRef.current=true;effectTimeRef.current=timestamp;lastTriggerRef.current=timestamp;setSpellCount(v=>v+1);setStatus('สำเร็จ! เวทมนตร์ตื่นขึ้นแล้ว ✨');playChime();}
          else if(!activeRef.current)setStatus('ยกมือค้างไว้เพื่อปลุกพลังเวทมนตร์');
         }else if(!handMagicRef.current){handRef.current=null;holdStartRef.current=null;progressRef.current=0;setProgress(0);setStatus('ยกมือข้างใดข้างหนึ่งให้สูงกว่าไหล่');}
       }else{wingLandmarksRef.current=null;if(!handMagicRef.current){handRef.current=null;holdStartRef.current=null;setProgress(0);}wingHoldRef.current=null;wingShownRef.current=false;wingsRef.current.target=(wingActivatedRef.current || timestamp<wingLockUntilRef.current)?1:0;setWingProgress(0);}
      }catch(e){console.warn('Pose detection frame skipped',e)}
    }
    // V08 hand inference at ~15 Hz; rendering stays at display refresh rate.
    if(handMagicRef.current && timestamp-handMagicFrameRef.current>=66){
      handMagicFrameRef.current=timestamp;
      try {
        const info=handMagicRef.current.detect(video,timestamp,{displayWidth:w,displayHeight:h,mirror:true});
        if(info){
          handMagicLastRef.current=info;
          const labels={SEARCHING:'ยื่นมือเข้ากล้อง',ORB:'แบมือ: ลูกแก้วพร้อม',CHARGING:'กำมือ: กำลังสะสมพลัง'};
          setHandStatus(labels[info.state]||info.state);
          setChargePercent(Math.round(info.charge*100));
          if(info.canvasPalm){
            const previous=handRef.current;
            handRef.current=previous?{x:previous.x+(info.canvasPalm.x-previous.x)*.34,y:previous.y+(info.canvasPalm.y-previous.y)*.34}:info.canvasPalm;
          }else if(!autoPhotoRef.current){handRef.current=null;}
          for(const event of info.events){
            if(event==='ORB_APPEAR'){setSpellCount(n=>n+1);playChime();beginAutoPhoto('orb');}
            if(event==='BURST'){
              beginAutoPhoto('burst');
              handBurstRef.current=timestamp;effectTimeRef.current=timestamp;activeRef.current=true;
              playChime();
              const pos=handRef.current;
              if(pos)for(let i=0;i<130;i++){
                const a=Math.random()*Math.PI*2,speed=2+Math.random()*8;
                sparksRef.current.push({x:pos.x,y:pos.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:52+Math.random()*28,max:80,r:1.5+Math.random()*4,hue:i%4===0?273:44});
              }
            }
          }
        }
      }catch(e){console.warn('Hand detection frame skipped',e);}
    }
     // Person mask at ~10 FPS. Capture the copied pixels while MediaPipe's callback is valid.
     if(bodySegRef.current && timestamp-lastSegFrameRef.current>=100){
       lastSegFrameRef.current=timestamp;
       try{bodySegRef.current.detect(video,timestamp)}
       catch(err){console.warn('Segmentation disabled after runtime error',err);bodySegRef.current?.close();bodySegRef.current=null;setSegStatus('fallback')}
     }
     const wings=wingsRef.current;
     if(wingActivatedRef.current || timestamp<wingLockUntilRef.current)wings.target=1;
    wings.opacity+=(wings.target-wings.opacity)*.10;
     if(wings.opacity>.015 && wings.span>0 && premiumWingsRef.current){
       // Draw full premium wings first, then put the original person *over* them.
       // Do not clip the wings with polygon/rect masks: it creates a visible
       // square shoulder edge, especially when a pose mask is only approximate.
       drawPremiumWings(ctx,premiumWingsRef.current,wings,timestamp);
       const cover={width:w,height:h,dw,dh,ox,oy};
       const segmented=bodySegRef.current?.drawForeground(ctx,video,cover)===true;
       if(!segmented && wingLandmarksRef.current){
         drawSoftPoseForeground(ctx,video,wingLandmarksRef.current,cover);
       }
     }

    // Apply the same vignette to background, wings and reconstructed foreground.
    const vignette=ctx.createRadialGradient(w/2,h*.46,w*.12,w/2,h*.48,w*.76);
    vignette.addColorStop(0,'rgba(20,10,40,0)');
    vignette.addColorStop(1,'rgba(19,9,43,.7)');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
    const hand=handRef.current;
    if(hand){
     const power=activeRef.current?1:.55,age=timestamp-effectTimeRef.current;
     if(activeRef.current && age>3000 && !autoPhotoRef.current)activeRef.current=false;
     if(activeRef.current || holdStartRef.current!==null || handMagicLastRef.current?.state==='CHARGING'){
      const count=activeRef.current?10:handMagicLastRef.current?.state==='CHARGING'?7:3;
      for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,vel=(.35+Math.random()*2.2)*(activeRef.current?1.6:1);sparksRef.current.push({x:hand.x+(Math.random()-.5)*16,y:hand.y+(Math.random()-.5)*16,vx:Math.cos(a)*vel,vy:Math.sin(a)*vel-.5,life:35+Math.random()*35,max:70,r:1.2+Math.random()*3,hue:Math.random()>.25?44:273})}
     }
     const handInfo=handMagicRef.current?handMagicLastRef.current:null;
      const charging=handInfo?.state==='CHARGING';
      const charge=charging?Math.round((handInfo?.charge||0)*100):progressRef.current;
      drawArcaneOrb(ctx,hand.x,hand.y,timestamp,activeRef.current?effectTimeRef.current:0,charge);
      if(charging){
        // Additional charge rings and lightning accelerate as the fist is held.
        const intensity=.35+(handInfo.charge||0)*.65;
        ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=`rgba(235,163,255,${intensity})`;
        ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(hand.x,hand.y,68+Math.sin(timestamp/80)*4,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
    }
    ctx.save();ctx.globalCompositeOperation='screen';sparksRef.current=sparksRef.current.filter(s=>s.life>0).slice(-500);for(const s of sparksRef.current){s.x+=s.vx;s.y+=s.vy;s.vy-=.018;s.life-=1;const alpha=Math.max(0,s.life/s.max);ctx.fillStyle=s.hue===44?`rgba(255,215,126,${alpha})`:`rgba(201,154,255,${alpha})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r*alpha,0,Math.PI*2);ctx.fill();}ctx.restore();
    // gentle frame decoration
    ctx.strokeStyle='rgba(220,183,111,.38)';ctx.lineWidth=3;ctx.strokeRect(14,14,w-28,h-28);
    // After the full composited frame is drawn, save THAT frame directly.
    // No on-screen countdown UI is rendered onto this canvas.
    const pending=autoPhotoRef.current;
    if(pending){
      if(timestamp-lastPoseSeenRef.current>950){
        autoPhotoRef.current=null;wingLockUntilRef.current=0;
        setCountdown(null);setPhotoCue('');setStatus('ผู้เล่นหลุดจากกล้อง กรุณาร่ายเวทใหม่');
      }else{
        const seconds=Math.max(1,Math.ceil((pending.shootAt-timestamp)/1000));
        if(seconds!==pending.lastSecond){pending.lastSecond=seconds;setCountdown(seconds);}
        if(timestamp>=pending.shootAt){
          autoPhotoRef.current=null;
          setCountdown(null);setPhotoCue('');
          // Capture must run from this animation frame after drawing the latest effects.
          captureFrameRef.current?.();
          return;
        }
      }
    }
   }
  rafRef.current=requestAnimationFrame(draw);
 },[playChime]);
 const start=async()=>{let stage='เริ่มต้น';stop();setError(null);setStatus('กำลังเปิดประตูเวทมนตร์...');setPhase('loading');setProgress(0);setSpellCount(0);setWingCount(0);setWingProgress(0);setSnapshot(null);setCountdown(null);setPhotoCue('');setWingAssetStatus('pending');setSegStatus('pending');setHandMode(false);setHandStatus('กำลังเปิดระบบติดตามมือ...');setChargePercent(0);try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('เบราว์เซอร์นี้ไม่รองรับกล้อง หรือไม่ได้ใช้ HTTPS/localhost');
   stage='ขอสิทธิ์กล้อง';setStatus('กำลังขอสิทธิ์กล้อง...');
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'}});streamRef.current=stream;
   stage='แสดงภาพกล้อง';setStatus('กำลังเตรียมภาพจากกล้อง...');
   const video=videoRef.current;if(!video)throw new Error('ไม่พบ Video Element');video.srcObject=stream;await video.play();
   stage='โหลดไลบรารี AI';setStatus('กำลังโหลดไลบรารี AI...');
   const {FilesetResolver,PoseLandmarker}=await import('@mediapipe/tasks-vision');stage='โหลด WASM ภายในโปรเจกต์';setStatus('กำลังโหลดตัวประมวลผล AI (WASM)...');const fileset=await FilesetResolver.forVisionTasks(WASM);
   let model;stage='โหลดโมเดล Pose';setStatus('กำลังโหลดโมเดล Pose...');
   try {
     model = await PoseLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.6,minTrackingConfidence:.6});
   } catch (gpuError) {
     console.warn('GPU unavailable, falling back to CPU',gpuError);
     model = await PoseLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.6,minTrackingConfidence:.6});
   }
       landmarkerRef.current=model;
    stage='โหลดไฟล์ปีก Crystal Butterfly Deluxe';setStatus('กำลังโหลดภาพปีกคริสตัล...');
    try{premiumWingsRef.current=await loadPremiumWings();setWingAssetStatus('ready');}
    catch(assetError){console.error('Wing images missing',assetError);premiumWingsRef.current=null;setWingAssetStatus('missing');}
    stage='โหลด Body Segmentation';setStatus('กำลังเตรียมระบบแยกตัวคน...');
    try{bodySegRef.current=await createBodySegmentation({wasmPath:WASM});setSegStatus('ready');}
    catch(segError){console.warn('Segmentation unavailable; approximate torso clipping enabled',segError);bodySegRef.current=null;setSegStatus('fallback');}
    stage='โหลด Hand Landmarker';setStatus('กำลังโหลด Hand Landmarker...');
   try{handMagicRef.current=await createHandMagic({wasmPath:WASM});setHandMode(true);setHandStatus('แบมือเพื่อเรียกลูกแก้ว');}
   catch(handError){console.warn('Hand tracking unavailable; Pose fallback enabled',handError);handMagicRef.current=null;setHandMode(false);setHandStatus('Hand Tracking ไม่พร้อม: ใช้โหมดเดิม');}
   phaseRef.current='play';setPhase('play');setStatus(handMagicRef.current?'แบมือ → กำมือ → แบมือ เพื่อปล่อยพลัง':'ยกมือข้างใดข้างหนึ่งให้สูงกว่าไหล่');rafRef.current=requestAnimationFrame(draw);
  }catch(err){console.error('Magic Mirror startup failed at:',stage,err);stop();const reason=err instanceof Error?`${err.name}: ${err.message}`:String(err);let tip='';if(err?.name==='NotAllowedError'||err?.name==='PermissionDeniedError')tip=' — กรุณาอนุญาตกล้องใน Site Settings';else if(err?.name==='NotFoundError')tip=' — ไม่พบกล้องที่เชื่อมต่อ';else if(err?.name==='NotReadableError')tip=' — กล้องอาจถูกโปรแกรมอื่นใช้งานอยู่';else if(stage.includes('WASM')||stage.includes('Pose'))tip=' — ตรวจสอบไฟล์ /mediapipe/wasm และการเชื่อมต่อ Google Storage';setError(`ขั้นตอน: ${stage} | ${reason}${tip}`);setPhase('welcome')}
 };
 const makePhotoFile=(dataUrl)=>{
  const [header,base64]=dataUrl.split(',');
  const mime=header.match(/data:([^;]+)/)?.[1]||'image/png';
  const binary=atob(base64);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const filename=`magic-mirror-${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
  return new File([bytes],filename,{type:mime});
 };
 const photoFileRef=useRef(null);
 const capture=()=>{const c=canvasRef.current;if(!c)return;try{
   autoPhotoRef.current=null;wingLockUntilRef.current=0;setCountdown(null);setPhotoCue('');
   const data=c.toDataURL('image/png');photoFileRef.current=makePhotoFile(data);
   phaseRef.current='capture';setSnapshot(data);setPhase('capture');cancelAnimationFrame(rafRef.current);
   streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
  }catch{setError('ไม่สามารถบันทึกภาพได้')}};
 captureFrameRef.current=capture;
 // Use a Blob download instead of relying on the `download` attribute for a data URL.
 // Some mobile browsers require the user to save the opened image manually.
 const savePhoto=()=>{
  const file=photoFileRef.current;
  if(!file)return;
  try {
   const url=URL.createObjectURL(file);
   const anchor=document.createElement('a');
   anchor.href=url;anchor.download=file.name;
   document.body.appendChild(anchor);anchor.click();anchor.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);
   setError(null);
  } catch(err){console.error('Download failed',err);setError('ดาวน์โหลดไม่สำเร็จ ลองใช้ปุ่มแชร์/บันทึกบนมือถือ');}
 };
 const sharePhoto=async()=>{
  const file=photoFileRef.current;
  if(!file)return;
  // Keep navigator.share directly in the tap handler: mobile browsers require user activation.
  if(typeof navigator.share==='function' && typeof navigator.canShare==='function' && navigator.canShare({files:[file]})){
   try {
    await navigator.share({files:[file],title:'My Magic Mirror Photo'});
    setError(null);
    return;
   }catch(err){
    if(err?.name==='AbortError')return; // user cancelled
    console.error('Share failed',err);
   }
  }
  setError('อุปกรณ์นี้ไม่รองรับการแชร์รูปโดยตรง กรุณาแตะรูปค้างเพื่อบันทึก หรือใช้ปุ่มดาวน์โหลด');
 };
 const openPhoto=()=>{
  if(!snapshot)return;
  // Keep fallback image visible inside page; window.open(data:) is blocked by some mobile browsers.
  setError('แตะรูปภาพค้างแล้วเลือก “บันทึกรูปภาพ” หรือ “ดาวน์โหลดรูปภาพ” ตามเมนูของอุปกรณ์');
 };
 const reset=()=>{stop();setPhase('welcome');setSnapshot(null);photoFileRef.current=null;setCountdown(null);setPhotoCue('');setStatus('กล้องพร้อมจะเริ่มเมื่อคุณกดปุ่ม');setError(null)};
 return <main className="app-shell"><div className="site-stars" aria-hidden="true"/><section className="info-panel">
  <span className="eyebrow"><Sparkles size={16}/> AN INTERACTIVE FANTASY EXPERIENCE</span><h1>THE<br/><em>ENCHANTED</em><br/>MIRROR<span className="star-dot">✧</span></h1>
  <div className="gold-rule"/><p className="lead">ก้าวเข้าสู่โลกเวทมนตร์ที่มีชีวิต<br/>เพียงยกมือ… แล้วปล่อยให้แสงมหัศจรรย์ติดตามคุณ</p>
  <div className="instructions"><div><span>01</span><p>อนุญาตการใช้งานกล้อง</p></div><div><span>02</span><p>ยืนให้เห็นช่วงบนและยกมือเหนือไหล่</p></div><div><span>03</span><p>กางแขนค้าง 1 วินาทีเพื่อเรียกปีกเวทมนตร์</p></div></div>
  <div className="notice"><WandSparkles size={17}/><span>Prototype 08.7 · Premium Wing Asset + Body Segmentation<br/><small>วิดีโอประมวลผลในเบราว์เซอร์ ไม่อัปโหลดขึ้นเซิร์ฟเวอร์</small></span></div>
 </section>
 <section className="mirror-wrap"><div className="mirror-ornament">✦ <span>THE MAGIC IS WITHIN YOU</span> ✦</div><div className="mirror-frame"><div className="mirror-inner">
  <video ref={videoRef} playsInline autoPlay muted className="hidden-video"/><canvas ref={canvasRef} width={720} height={1280} className="mirror-canvas" style={{display:phase==='play'?'block':'none'}}/>
  {phase==='welcome'&&<div className="idle-scene"><div className="portal-ring"><div className="portal-core"><span>✧</span></div></div><div className="scene-copy"><span className="mini-label">ENCHANTED FOREST</span><h2>AWAKEN<br/>YOUR MAGIC</h2><p>กระจกกำลังรอพลังวิเศษของคุณ</p></div></div>}
  {phase==='loading'&&<div className="loading-scene"><div className="loader-sun">✺</div><h2>OPENING THE PORTAL</h2><p>กำลังเตรียมกล้องและโมเดล AI...</p></div>}
  {phase==='capture'&&snapshot&&<img src={snapshot} alt="ภาพเวทมนตร์ที่ถ่ายจากกระจก" className="capture-image"/>}
  {phase==='play'&&<div className="play-overlay"><div className="spell-heading"><span className="mini-label">SPELLS 01 + 02 + 03</span><h2>TRUE HAND MAGIC</h2></div><div className="spell-instruction"><div className="spell-status">{status}</div><div className="progress-track"><div style={{width:`${progress}%`}}/></div><small>✨ ลูกแก้ว {spellCount} ครั้ง · 🦋 ปีก {wingCount} ครั้ง</small>{handMode&&<div style={{fontSize:12,marginTop:6,color:'#f3d6a4'}}>✋ {handStatus} · พลัง {chargePercent}%</div>}{wingAssetStatus==='missing'&&<div style={{fontSize:12,color:'#ffd1d1'}}>ไม่พบ PNG ปีก ตรวจสอบ /public/assets/wings</div>}{segStatus==='fallback'&&<div style={{fontSize:11,color:'#ead8b0'}}>Segmentation ไม่พร้อม — ใช้ขอบลำตัวแบบฟุ้ง</div>}<div className="wing-progress"><span>WINGS OF LIGHT</span><div className="progress-track"><div style={{width:`${wingProgress}%`}}/></div></div></div></div>}
  {phase==='play'&&countdown!==null&&<div role="status" aria-live="polite" style={{position:'absolute',left:'50%',top:'46%',transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:9,textAlign:'center',width:'85%',textShadow:'0 3px 20px #13082e'}}><div style={{color:'#ffe5a7',letterSpacing:'.09em',fontSize:'clamp(11px,1.2vw,16px)',fontWeight:700}}>{photoCue}</div><div style={{fontSize:'clamp(100px,15vw,180px)',fontFamily:'Georgia,serif',color:'#fff4cc',fontWeight:700,lineHeight:1.1,filter:'drop-shadow(0 0 24px #d19cff)'}}>{countdown}</div><div style={{color:'#f5dcfa',fontSize:'clamp(12px,1.3vw,18px)'}}>ระบบจะถ่ายให้อัตโนมัติ ✦</div></div>}
  {phase==='capture'&&<div className="capture-label"><Sparkles size={16}/> YOUR MAGICAL MOMENT</div>}
 </div></div><div className="mirror-footer"><span>✦ ENCHANTED REALM ✦</span><div className="mirror-actions">
  {phase==='welcome'&&<button className="primary-action" onClick={start}><Camera size={18}/> เข้าสู่โลกเวทมนตร์</button>}
  {phase==='loading'&&<button className="primary-action" disabled>กำลังเตรียมระบบ...</button>}
  {phase==='play'&&<><button className="icon-action" onClick={()=>setMuted(v=>!v)} title={muted?'เปิดเสียง':'ปิดเสียง'}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><button className="primary-action" onClick={capture}><Camera size={18}/> ถ่ายเอง</button><button className="icon-action" onClick={reset} title="เริ่มใหม่"><RefreshCcw size={18}/></button></>}
  {phase==='capture'&&<><button className="primary-action" onClick={sharePhoto}><Download size={18}/> แชร์ / บันทึกบนมือถือ</button><button className="secondary-action" onClick={savePhoto}>ดาวน์โหลด PNG</button><button className="secondary-action" onClick={openPhoto}>วิธีบันทึกรูป</button><button className="secondary-action" onClick={start}><RefreshCcw size={16}/> เล่นอีกครั้ง</button></>}
 </div>{error&&<p className="error-text"><CameraOff size={16}/>{error}<br/>ตรวจสอบสิทธิ์กล้อง อินเทอร์เน็ต แล้วลองใหม่</p>}</div></section>
 <footer className="global-footer">MAGIC MIRROR LAB <span>✦</span> INTERACTIVE VISION PROTOTYPE 08.7</footer></main>
}
