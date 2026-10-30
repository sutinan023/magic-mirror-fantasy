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
# magic-mirror-fantasy
