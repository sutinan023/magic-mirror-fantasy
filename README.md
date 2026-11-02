# AI Magic Mirror — WASM fix (JavaScript)

สาเหตุ: เวอร์ชัน `@mediapipe/tasks-vision@0.10.22` ในโปรเจกต์เดิมไม่สามารถโหลด WASM จาก jsDelivr ที่ URL ที่ระบุไว้ได้ (404)

## ติดตั้งแบบแยกโปรเจกต์

1. แตกไฟล์ ZIP นี้เป็นโฟลเดอร์ใหม่ ไม่ต้องทับโปรเจกต์อื่น
2. เปิด Terminal ที่โฟลเดอร์นี้เท่านั้น
3. ถ้าเคยใช้เวอร์ชันเดิมในโฟลเดอร์นี้ ให้ลบ `node_modules` และ `package-lock.json` **เฉพาะโฟลเดอร์นี้** ก่อนติดตั้ง (ไม่ต้องลบของโปรเจกต์อื่น)
4. `npm install` — postinstall จะคัดลอกไฟล์ WASM ไปไว้ที่ `public/mediapipe/wasm` อัตโนมัติ
5. `npm run dev` — เริ่มบนพอร์ต **3107** และไม่แอบเปลี่ยนพอร์ตหากพอร์ตนี้ถูกใช้งาน
6. เข้า `http://localhost:3107`

ลองเปิด `http://localhost:3107/mediapipe/wasm/vision_wasm_internal.js` เพื่อตรวจว่าไฟล์โหลดได้ (200)

หมายเหตุ: โมเดล Pose `.task` ยังโหลดจาก Google Storage ผ่านอินเทอร์เน็ต; ถ้าโมเดลโหลดไม่ได้จะเป็นปัญหาแยกอีกส่วนหนึ่ง

เวอร์ชันนี้ pin MediaPipe ที่ `0.10.21` และใช้ไฟล์ WASM **จากแพ็กเกจเดียวกัน** เพื่อลดปัญหาเวอร์ชันไม่ตรงกัน

ไม่สามารถยืนยัน `npm install`/`npm run build` ในสภาพแวดล้อมสร้าง ZIP นี้ได้ เนื่องจากเครือข่าย npm ใช้งานไม่ได้


## Adaptive Kiosk v02
- Desktop landscape: centered portrait mirror, maximum width 440px and height-derived scaling, with compact instruction panel.
- Portrait: immersive single-mirror layout, instruction panel hidden.
- CSS-only update based on the previously working WASM-fixed version. Gesture engine, MediaPipe paths, and port 3107 are unchanged.


## Portrait Kiosk v03
- Portrait viewport (e.g. 540x960 or 1080x1920) now fills the full height with the mirror, avoiding an empty bottom half.
- The camera, MediaPipe initialization, gesture code, and dev port 3107 are unchanged.
- Test Chrome Device Toolbar > Responsive > 540 x 960; reload and verify camera overlay/capture.
- On a real kiosk, place the camera far enough back for upper body and hands to fit in frame. CSS does not increase camera field of view.

## V04 — Refined V03 Portrait
- Keeps the original tall arched gold frame, color palette, and existing UI elements.
- On portrait screens, gives the frame additional side/top/bottom breathing room and a little less height.
- Preserves camera, WASM setup, gesture logic, JavaScript, and port **3107** unchanged.
- Test Chrome Device Toolbar at **540 × 960** and **1080 × 1920**.


## V05 — Wings of Light
- Built on approved V04: retains arched frame, portrait composition, CSS, MediaPipe 0.10.21 and **port 3107**.
- Existing Awaken spell: raise one wrist above shoulder for ~0.7 seconds.
- New Wings: stretch BOTH arms sideways around shoulder height for 1 second. Glowing translucent wing shapes follow smoothed shoulder landmarks.
- Second progress indicator; wing sparkle burst on trigger. No new npm dependencies.
- This is a stylized 2D overlay, not true behind-body occlusion: segmentation is a future enhancement.
- Avoid close-up camera framing: stand far enough back to see both wrists and shoulders.
- Keep the working V04 backup before installing. Run npm install, npm run dev, then http://localhost:3107.
- This version has been syntax checked but has not been tested with a real webcam here.
