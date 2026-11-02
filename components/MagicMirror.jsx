'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Download, RefreshCcw, Sparkles, WandSparkles, Volume2, VolumeX } from 'lucide-react';

const WASM='/mediapipe/wasm';
// Wings use shoulder and wrist landmarks. The translucent wings sit at the sides of
// the silhouette; full body occlusion will be added with segmentation in a later phase.
function drawWings(ctx,centerX,centerY,span,angle,alpha,timestamp){
 const flap=Math.sin(timestamp/360)*.085;
 ctx.save();ctx.translate(centerX,centerY);ctx.rotate(angle);
 ctx.globalCompositeOperation='screen';
 for(const side of [-1,1]){
  ctx.save();ctx.scale(side,1);
  const reach=span*(1.2+flap),rise=span*.83,fall=span*1.02;
  const g=ctx.createLinearGradient(0,-rise,reach,fall);
  g.addColorStop(0,`rgba(255,242,196,${.48*alpha})`);
  g.addColorStop(.55,`rgba(217,157,255,${.32*alpha})`);
  g.addColorStop(1,'rgba(89,191,229,0)');
  ctx.fillStyle=g;ctx.strokeStyle=`rgba(255,220,164,${.65*alpha})`;ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(reach*.45,-rise*.9,reach,-rise*1.12,reach,-rise*.22);
  ctx.bezierCurveTo(reach*1.05,rise*.15,reach*.52,rise*.28,0,span*.15);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,span*.1);ctx.bezierCurveTo(reach*.95,span*.02,reach*.88,fall*.95,reach*.45,fall);
  ctx.bezierCurveTo(reach*.2,fall*1.05,reach*.1,span*.62,0,span*.16);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=`rgba(255,238,193,${.45*alpha})`;ctx.lineWidth=1.3;
  for(let i=1;i<=3;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(reach*(.26+i*.12),-rise*.27,reach*(.42+i*.16),-rise*(.95-i*.17));ctx.stroke();}
  ctx.restore();
 }
 ctx.restore();
}

const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export default function MagicMirror(){
 const videoRef=useRef(null),canvasRef=useRef(null), landmarkerRef=useRef(null),streamRef=useRef(null),rafRef=useRef(0);
 const wingsRef=useRef({x:0,y:0,span:0,angle:0,opacity:0,target:0,burst:0}),wingHoldRef=useRef(null),lastWingTriggerRef=useRef(0),wingShownRef=useRef(false);
 const sparksRef=useRef([]),lastSeenRef=useRef(-1),handRef=useRef(null),holdStartRef=useRef(null),lastFrameRef=useRef(0),lastTriggerRef=useRef(0),activeRef=useRef(false),effectTimeRef=useRef(0),phaseRef=useRef('welcome');
 const [phase,setPhase]=useState('welcome'),[status,setStatus]=useState('กล้องพร้อมจะเริ่มเมื่อคุณกดปุ่ม'),[progress,setProgress]=useState(0),[spellCount,setSpellCount]=useState(0),[wingCount,setWingCount]=useState(0),[wingProgress,setWingProgress]=useState(0),[snapshot,setSnapshot]=useState(null),[muted,setMuted]=useState(true),[error,setError]=useState(null);
 useEffect(()=>{phaseRef.current=phase},[phase]);
 const stop=useCallback(()=>{cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;landmarkerRef.current?.close();landmarkerRef.current=null;holdStartRef.current=null;handRef.current=null;activeRef.current=false;sparksRef.current=[];wingHoldRef.current=null;wingShownRef.current=false;wingsRef.current={x:0,y:0,span:0,angle:0,opacity:0,target:0,burst:0};},[]);
 useEffect(()=>()=>{stop()},[stop]);
 const playChime=useCallback(()=>{if(muted)return;try{const ctx=new AudioContext();const t=ctx.currentTime;[523.25,659.25,783.99].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,t+i*.1);g.gain.exponentialRampToValueAtTime(.065,t+i*.1+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.1+.5);o.connect(g).connect(ctx.destination);o.start(t+i*.1);o.stop(t+i*.1+.52)});setTimeout(()=>ctx.close(),1100)}catch{}},[muted]);
 const draw=useCallback((timestamp)=>{
  const canvas=canvasRef.current,video=videoRef.current,model=landmarkerRef.current;if(!canvas||!video||!model||phaseRef.current!=='play')return;
  const ctx=canvas.getContext('2d');if(!ctx)return;const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  if(video.readyState>=2){
    // cover scaling, mirrored horizontally, matches landmark conversion below
    const vw=video.videoWidth,vh=video.videoHeight,scale=Math.max(w/vw,h/vh),dw=vw*scale,dh=vh*scale,ox=(w-dw)/2,oy=(h-dh)/2;
    ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(video,ox,oy,dw,dh);ctx.restore();
    // restrained fantasy treatment
    const vignette=ctx.createRadialGradient(w/2,h*.46,w*.12,w/2,h*.48,w*.76);vignette.addColorStop(0,'rgba(20,10,40,0)');vignette.addColorStop(1,'rgba(19,9,43,.7)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
    if(timestamp-lastFrameRef.current>32){
      lastFrameRef.current=timestamp;
      try{
       const result=model.detectForVideo(video,timestamp),lm=result.landmarks?.[0];
       if(lm){
        const shoulder=lm[12],wrist=lm[16],leftShoulder=lm[11],leftWrist=lm[15];
        const isVisible=(p)=>p && (p.visibility??1)>.6;
        // The wings are activated when both arms extend horizontally, not simply raised.
        const leftElbow=lm[13],rightElbow=lm[14];
        const extended=[leftShoulder,shoulder,leftElbow,rightElbow,leftWrist,wrist].every(isVisible)
          && Math.abs(leftWrist.y-leftShoulder.y)<.18
          && Math.abs(wrist.y-shoulder.y)<.18
          && leftWrist.x<leftShoulder.x-.12 && wrist.x>shoulder.x+.12
          && leftElbow.x<leftShoulder.x && rightElbow.x>shoulder.x;
        const wings=wingsRef.current;
        const cx=w-(ox+((leftShoulder.x+shoulder.x)/2)*dw);
        const cy=oy+((leftShoulder.y+shoulder.y)/2)*dh;
        const span=Math.hypot((shoulder.x-leftShoulder.x)*dw,(shoulder.y-leftShoulder.y)*dh);
        const tilt=Math.atan2((shoulder.y-leftShoulder.y)*dh,-(shoulder.x-leftShoulder.x)*dw);
        const smooth=wings.span?0.15:1;
        wings.x+=(cx-wings.x)*smooth;wings.y+=(cy-wings.y)*smooth;
        wings.span+=(span-wings.span)*smooth;wings.angle+=(tilt-wings.angle)*smooth;
        if(extended){
          if(wingHoldRef.current===null)wingHoldRef.current=timestamp;
          const held=timestamp-wingHoldRef.current;
          setWingProgress(Math.min(100,Math.floor(held/1000*100)));
          if(held>=1000 && !wingShownRef.current && timestamp-lastWingTriggerRef.current>1800){
            wingShownRef.current=true;lastWingTriggerRef.current=timestamp;wings.burst=timestamp;
            setWingCount(n=>n+1);setStatus('WINGS OF LIGHT — ปีกเวทมนตร์ปรากฏแล้ว!');playChime();
            for(let k=0;k<90;k++){const a=Math.random()*Math.PI*2,vel=1+Math.random()*5;
              sparksRef.current.push({x:cx+(Math.random()-.5)*span*2,y:cy+(Math.random()-.5)*span,vx:Math.cos(a)*vel,vy:Math.sin(a)*vel,life:48+Math.random()*35,max:83,r:1+Math.random()*3,hue:k%3?44:273});}
          }
          wings.target=wingShownRef.current?1:.22;
        }else{
          wingHoldRef.current=null;wingShownRef.current=false;setWingProgress(0);wings.target=0;
        }
        const rightUp=isVisible(shoulder)&&isVisible(wrist)&&wrist.y<shoulder.y-.10;
        const leftUp=isVisible(leftShoulder)&&isVisible(leftWrist)&&leftWrist.y<leftShoulder.y-.10;
        const which=rightUp?wrist:leftUp?leftWrist:null;
        if(which){
          // camera crop + mirror transform: pixels in frame after mirroring
          const px=w-(ox+which.x*dw),py=oy+which.y*dh;
          handRef.current={x:px,y:py};
          if(holdStartRef.current===null)holdStartRef.current=timestamp;
          const held=timestamp-holdStartRef.current;
          setProgress(Math.min(100,Math.floor(held/700*100)));
          if(held>=700 && timestamp-lastTriggerRef.current>1600 && !activeRef.current){activeRef.current=true;effectTimeRef.current=timestamp;lastTriggerRef.current=timestamp;setSpellCount(v=>v+1);setStatus('สำเร็จ! เวทมนตร์ตื่นขึ้นแล้ว ✨');playChime();}
          else if(!activeRef.current)setStatus('ยกมือค้างไว้เพื่อปลุกพลังเวทมนตร์');
         }else{handRef.current=null;holdStartRef.current=null;setProgress(0);setStatus('ยกมือข้างใดข้างหนึ่งให้สูงกว่าไหล่');}
       }else{handRef.current=null;holdStartRef.current=null;wingHoldRef.current=null;wingShownRef.current=false;wingsRef.current.target=0;setWingProgress(0);setProgress(0);setStatus('ขยับเข้ากล้องให้เห็นหัวและแขน');}
      }catch(e){console.warn('Pose detection frame skipped',e)}
    }
    const wings=wingsRef.current;
    wings.opacity+=(wings.target-wings.opacity)*.10;
    if(wings.opacity>.015 && wings.span>0)drawWings(ctx,wings.x,wings.y,wings.span,wings.angle,wings.opacity,timestamp);
    const hand=handRef.current;
    if(hand){
     const power=activeRef.current?1:.55,age=timestamp-effectTimeRef.current;
     if(activeRef.current && age>3000)activeRef.current=false;
     if(activeRef.current || holdStartRef.current!==null){
      const count=activeRef.current?5:2;
      for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,vel=(.35+Math.random()*2.2)*(activeRef.current?1.6:1);sparksRef.current.push({x:hand.x+(Math.random()-.5)*16,y:hand.y+(Math.random()-.5)*16,vx:Math.cos(a)*vel,vy:Math.sin(a)*vel-.5,life:35+Math.random()*35,max:70,r:1.2+Math.random()*3,hue:Math.random()>.25?44:273})}
     }
     const pulse=1+Math.sin(timestamp/180)*.08,rad=(activeRef.current?54:28)*pulse;
     const halo=ctx.createRadialGradient(hand.x,hand.y,1,hand.x,hand.y,rad*2.8);
     halo.addColorStop(0,`rgba(255,242,183,${.95*power})`);halo.addColorStop(.12,`rgba(255,210,111,${.8*power})`);halo.addColorStop(.4,`rgba(178,110,249,${.33*power})`);halo.addColorStop(1,'rgba(123,74,220,0)');ctx.globalCompositeOperation='screen';ctx.fillStyle=halo;ctx.beginPath();ctx.arc(hand.x,hand.y,rad*2.8,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';
     ctx.save();ctx.strokeStyle=`rgba(255,221,157,${activeRef.current?.82:.46})`;ctx.lineWidth=2;ctx.translate(hand.x,hand.y);ctx.rotate(timestamp/2300);ctx.beginPath();ctx.arc(0,0,rad*.9,0,Math.PI*1.5);ctx.stroke();ctx.restore();
    }
    ctx.save();ctx.globalCompositeOperation='screen';sparksRef.current=sparksRef.current.filter(s=>s.life>0).slice(-500);for(const s of sparksRef.current){s.x+=s.vx;s.y+=s.vy;s.vy-=.018;s.life-=1;const alpha=Math.max(0,s.life/s.max);ctx.fillStyle=s.hue===44?`rgba(255,215,126,${alpha})`:`rgba(201,154,255,${alpha})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r*alpha,0,Math.PI*2);ctx.fill();}ctx.restore();
    // gentle frame decoration
    ctx.strokeStyle='rgba(220,183,111,.38)';ctx.lineWidth=3;ctx.strokeRect(14,14,w-28,h-28);
   }
  rafRef.current=requestAnimationFrame(draw);
 },[playChime]);
 const start=async()=>{let stage='เริ่มต้น';stop();setError(null);setStatus('กำลังเปิดประตูเวทมนตร์...');setPhase('loading');setProgress(0);setSpellCount(0);setWingCount(0);setWingProgress(0);setSnapshot(null);try{
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
   phaseRef.current='play';setPhase('play');setStatus('ยกมือข้างใดข้างหนึ่งให้สูงกว่าไหล่');rafRef.current=requestAnimationFrame(draw);
  }catch(err){console.error('Magic Mirror startup failed at:',stage,err);stop();const reason=err instanceof Error?`${err.name}: ${err.message}`:String(err);let tip='';if(err?.name==='NotAllowedError'||err?.name==='PermissionDeniedError')tip=' — กรุณาอนุญาตกล้องใน Site Settings';else if(err?.name==='NotFoundError')tip=' — ไม่พบกล้องที่เชื่อมต่อ';else if(err?.name==='NotReadableError')tip=' — กล้องอาจถูกโปรแกรมอื่นใช้งานอยู่';else if(stage.includes('WASM')||stage.includes('Pose'))tip=' — ตรวจสอบไฟล์ /mediapipe/wasm และการเชื่อมต่อ Google Storage';setError(`ขั้นตอน: ${stage} | ${reason}${tip}`);setPhase('welcome')}
 };
 const capture=()=>{const c=canvasRef.current;if(!c)return;try{setSnapshot(c.toDataURL('image/png'));setPhase('capture');cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;}catch{setError('ไม่สามารถบันทึกภาพได้')}};
 const reset=()=>{stop();setPhase('welcome');setSnapshot(null);setStatus('กล้องพร้อมจะเริ่มเมื่อคุณกดปุ่ม');setError(null)};
 return <main className="app-shell"><div className="site-stars" aria-hidden="true"/><section className="info-panel">
  <span className="eyebrow"><Sparkles size={16}/> AN INTERACTIVE FANTASY EXPERIENCE</span><h1>THE<br/><em>ENCHANTED</em><br/>MIRROR<span className="star-dot">✧</span></h1>
  <div className="gold-rule"/><p className="lead">ก้าวเข้าสู่โลกเวทมนตร์ที่มีชีวิต<br/>เพียงยกมือ… แล้วปล่อยให้แสงมหัศจรรย์ติดตามคุณ</p>
  <div className="instructions"><div><span>01</span><p>อนุญาตการใช้งานกล้อง</p></div><div><span>02</span><p>ยืนให้เห็นช่วงบนและยกมือเหนือไหล่</p></div><div><span>03</span><p>กางแขนค้าง 1 วินาทีเพื่อเรียกปีกเวทมนตร์</p></div></div>
  <div className="notice"><WandSparkles size={17}/><span>Prototype 05 · Awaken + Wings of Light<br/><small>วิดีโอประมวลผลในเบราว์เซอร์ ไม่อัปโหลดขึ้นเซิร์ฟเวอร์</small></span></div>
 </section>
 <section className="mirror-wrap"><div className="mirror-ornament">✦ <span>THE MAGIC IS WITHIN YOU</span> ✦</div><div className="mirror-frame"><div className="mirror-inner">
  <video ref={videoRef} playsInline autoPlay muted className="hidden-video"/><canvas ref={canvasRef} width={720} height={1280} className="mirror-canvas" style={{display:phase==='play'?'block':'none'}}/>
  {phase==='welcome'&&<div className="idle-scene"><div className="portal-ring"><div className="portal-core"><span>✧</span></div></div><div className="scene-copy"><span className="mini-label">ENCHANTED FOREST</span><h2>AWAKEN<br/>YOUR MAGIC</h2><p>กระจกกำลังรอพลังวิเศษของคุณ</p></div></div>}
  {phase==='loading'&&<div className="loading-scene"><div className="loader-sun">✺</div><h2>OPENING THE PORTAL</h2><p>กำลังเตรียมกล้องและโมเดล AI...</p></div>}
  {phase==='capture'&&snapshot&&<img src={snapshot} alt="ภาพเวทมนตร์ที่ถ่ายจากกระจก" className="capture-image"/>}
  {phase==='play'&&<div className="play-overlay"><div className="spell-heading"><span className="mini-label">SPELLS 01 + 02</span><h2>AWAKEN · WINGS</h2></div><div className="spell-instruction"><div className="spell-status">{status}</div><div className="progress-track"><div style={{width:`${progress}%`}}/></div><small>✨ ลูกแก้ว {spellCount} ครั้ง · 🦋 ปีก {wingCount} ครั้ง</small><div className="wing-progress"><span>WINGS OF LIGHT</span><div className="progress-track"><div style={{width:`${wingProgress}%`}}/></div></div></div></div>}
  {phase==='capture'&&<div className="capture-label"><Sparkles size={16}/> YOUR MAGICAL MOMENT</div>}
 </div></div><div className="mirror-footer"><span>✦ ENCHANTED REALM ✦</span><div className="mirror-actions">
  {phase==='welcome'&&<button className="primary-action" onClick={start}><Camera size={18}/> เข้าสู่โลกเวทมนตร์</button>}
  {phase==='loading'&&<button className="primary-action" disabled>กำลังเตรียมระบบ...</button>}
  {phase==='play'&&<><button className="icon-action" onClick={()=>setMuted(v=>!v)} title={muted?'เปิดเสียง':'ปิดเสียง'}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><button className="primary-action" onClick={capture}><Camera size={18}/> ถ่ายภาพเวทมนตร์</button><button className="icon-action" onClick={reset} title="เริ่มใหม่"><RefreshCcw size={18}/></button></>}
  {phase==='capture'&&<><a className="primary-action" href={snapshot??'#'} download="enchanted-mirror.png"><Download size={18}/> บันทึกรูปภาพ</a><button className="secondary-action" onClick={start}><RefreshCcw size={16}/> เล่นอีกครั้ง</button></>}
 </div>{error&&<p className="error-text"><CameraOff size={16}/>{error}<br/>ตรวจสอบสิทธิ์กล้อง อินเทอร์เน็ต แล้วลองใหม่</p>}</div></section>
 <footer className="global-footer">MAGIC MIRROR LAB <span>✦</span> INTERACTIVE VISION PROTOTYPE 05</footer></main>
}
