'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Download, RefreshCcw, Sparkles, WandSparkles, Volume2, VolumeX } from 'lucide-react';

const WASM='/mediapipe/wasm';
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export default function MagicMirror(){
 const videoRef=useRef(null),canvasRef=useRef(null), landmarkerRef=useRef(null),streamRef=useRef(null),rafRef=useRef(0);
 const sparksRef=useRef([]),lastSeenRef=useRef(-1),handRef=useRef(null),holdStartRef=useRef(null),lastFrameRef=useRef(0),lastTriggerRef=useRef(0),activeRef=useRef(false),effectTimeRef=useRef(0),phaseRef=useRef('welcome');
 const [phase,setPhase]=useState('welcome'),[status,setStatus]=useState('กล้องพร้อมจะเริ่มเมื่อคุณกดปุ่ม'),[progress,setProgress]=useState(0),[spellCount,setSpellCount]=useState(0),[snapshot,setSnapshot]=useState(null),[muted,setMuted]=useState(true),[error,setError]=useState(null);
 useEffect(()=>{phaseRef.current=phase},[phase]);
 const stop=useCallback(()=>{cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;landmarkerRef.current?.close();landmarkerRef.current=null;holdStartRef.current=null;handRef.current=null;activeRef.current=false;sparksRef.current=[];},[]);
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
       }else{handRef.current=null;holdStartRef.current=null;setProgress(0);setStatus('ขยับเข้ากล้องให้เห็นหัวและแขน');}
      }catch(e){console.warn('Pose detection frame skipped',e)}
    }
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
 const start=async()=>{let stage='เริ่มต้น';stop();setError(null);setStatus('กำลังเปิดประตูเวทมนตร์...');setPhase('loading');setProgress(0);setSpellCount(0);setSnapshot(null);try{
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
  <div className="instructions"><div><span>01</span><p>อนุญาตการใช้งานกล้อง</p></div><div><span>02</span><p>ยืนให้เห็นช่วงบนและยกมือเหนือไหล่</p></div><div><span>03</span><p>ค้างไว้ 0.7 วินาทีเพื่อร่ายเวท!</p></div></div>
  <div className="notice"><WandSparkles size={17}/><span>Prototype 01 · Awaken Spell<br/><small>วิดีโอประมวลผลในเบราว์เซอร์ ไม่อัปโหลดขึ้นเซิร์ฟเวอร์</small></span></div>
 </section>
 <section className="mirror-wrap"><div className="mirror-ornament">✦ <span>THE MAGIC IS WITHIN YOU</span> ✦</div><div className="mirror-frame"><div className="mirror-inner">
  <video ref={videoRef} playsInline autoPlay muted className="hidden-video"/><canvas ref={canvasRef} width={720} height={1280} className="mirror-canvas" style={{display:phase==='play'?'block':'none'}}/>
  {phase==='welcome'&&<div className="idle-scene"><div className="portal-ring"><div className="portal-core"><span>✧</span></div></div><div className="scene-copy"><span className="mini-label">ENCHANTED FOREST</span><h2>AWAKEN<br/>YOUR MAGIC</h2><p>กระจกกำลังรอพลังวิเศษของคุณ</p></div></div>}
  {phase==='loading'&&<div className="loading-scene"><div className="loader-sun">✺</div><h2>OPENING THE PORTAL</h2><p>กำลังเตรียมกล้องและโมเดล AI...</p></div>}
  {phase==='capture'&&snapshot&&<img src={snapshot} alt="ภาพเวทมนตร์ที่ถ่ายจากกระจก" className="capture-image"/>}
  {phase==='play'&&<div className="play-overlay"><div className="spell-heading"><span className="mini-label">SPELL NO. 01</span><h2>AWAKEN</h2></div><div className="spell-instruction"><div className="spell-status">{status}</div><div className="progress-track"><div style={{width:`${progress}%`}}/></div><small>✨ ร่ายเวทสำเร็จ {spellCount} ครั้ง</small></div></div>}
  {phase==='capture'&&<div className="capture-label"><Sparkles size={16}/> YOUR MAGICAL MOMENT</div>}
 </div></div><div className="mirror-footer"><span>✦ ENCHANTED REALM ✦</span><div className="mirror-actions">
  {phase==='welcome'&&<button className="primary-action" onClick={start}><Camera size={18}/> เข้าสู่โลกเวทมนตร์</button>}
  {phase==='loading'&&<button className="primary-action" disabled>กำลังเตรียมระบบ...</button>}
  {phase==='play'&&<><button className="icon-action" onClick={()=>setMuted(v=>!v)} title={muted?'เปิดเสียง':'ปิดเสียง'}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><button className="primary-action" onClick={capture}><Camera size={18}/> ถ่ายภาพเวทมนตร์</button><button className="icon-action" onClick={reset} title="เริ่มใหม่"><RefreshCcw size={18}/></button></>}
  {phase==='capture'&&<><a className="primary-action" href={snapshot??'#'} download="enchanted-mirror.png"><Download size={18}/> บันทึกรูปภาพ</a><button className="secondary-action" onClick={start}><RefreshCcw size={16}/> เล่นอีกครั้ง</button></>}
 </div>{error&&<p className="error-text"><CameraOff size={16}/>{error}<br/>ตรวจสอบสิทธิ์กล้อง อินเทอร์เน็ต แล้วลองใหม่</p>}</div></section>
 <footer className="global-footer">MAGIC MIRROR LAB <span>✦</span> INTERACTIVE VISION PROTOTYPE 01</footer></main>
}
