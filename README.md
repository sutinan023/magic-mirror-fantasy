# Magic Mirror V08.4 — Premium Wings + Body Segmentation

**ฐานโค้ด:** `MagicMirror(1).jsx` ที่อัปโหลด ซึ่งมี V08 True Hand Magic + V08.2 Smart Auto Capture และฟังก์ชันปีกจาก V08.3

## คัดลอกไฟล์

นำ 3 ไฟล์นี้ไปใส่โปรเจกต์เดิม `C:\xampp\htdocs\magic-mirror-fantasy-js`:

```
components/MagicMirror.jsx          (แทนที่ของเดิม)
lib/premiumWings.js                 (เพิ่มใหม่)
lib/bodySegmentation.js             (เพิ่มใหม่)
```

`lib/trueHandMagic.js` **ยังใช้ของเดิมได้เลย** ไม่ต้องแก้ (สำเนามีใน ZIP เผื่อจำเป็น)

**ไฟล์ PNG 4 ภาพที่ผู้ใช้มีอยู่แล้ว** ต้องคงอยู่ในโฟลเดอร์ดังนี้ (ZIP ไม่มี PNG เพราะมีเพียงภาพหน้าจอ ไม่ได้รับไฟล์ภาพต้นฉบับ):

```
public/assets/wings/wing-left-base.png
public/assets/wings/wing-right-base.png
public/assets/wings/wing-left-glow.png
public/assets/wings/wing-right-glow.png
```

ตรวจ URL เช่น `http://localhost:3107/assets/wings/wing-left-base.png` ต้องเปิดภาพได้ (ไม่ใช่หน้า 404)

## วิธีรัน

```
npm install
npm run build
npm run dev
```

ใช้พอร์ต **3107** ตาม `package.json` ของโปรเจกต์เดิม ห้ามปิด Node process ของโปรเจกต์อื่น

## ฟีเจอร์

- Wing Asset renderer: จัดตำแหน่งปีกซ้าย/ขวาจาก Pose shoulder midpoint + shoulder span และหมุนตามไหล่
- วาดฐาน PNG + Glow PNG แบบ Layer โดยไม่ใช้ปีกสามเหลี่ยมเก่า
- MediaPipe Image Segmenter (selfie segmenter, Google-hosted model) ประมาณ 10 FPS ปกป้องลำตัวด้วยคนที่ตัดจากกล้องมาแสดงทับปีก
- ถ้า Segmentation โหลดไม่ได้ ระบบใช้ approximate pose torso clipping แทน
- ถ้า PNG หาย แสดงข้อความเตือนและไม่วาดปีกเสียรูป
- คงระบบ True Hand Magic, Auto Capture, Download/Share Mobile, UI (CSS เดิม), พอร์ต 3107

## ปรับตำแหน่งปีก

แก้ค่าที่ `lib/premiumWings.js` ใน `WING_CONFIG` เท่านั้น:

- `left.rootX`, `left.rootY`, `right.rootX`, `right.rootY`: ตำแหน่งรากปีก **ภายในไฟล์ภาพ** ตั้งแต่ 0.0–1.0
- `scale` และ `heightScale`: ขนาดก่อนจำกัดตามขอบจอ
- `rootSpread`, `rootLift`: ชดเชยตำแหน่งจากกึ่งกลางไหล่
- `glowOpacity`: ความเข้ม Glow layer

**ถ้าปีกกลับด้าน:** ตรวจว่าชื่อไฟล์ left/right ตรงกับรูปจริง เพราะการสะท้อนกล้องจะมีผลต่อซ้ายขวาที่มองเห็น

## สิ่งที่ควรทดสอบ

1. เปิดภาพ PNG ทุกภาพผ่าน URL และตรวจพื้นหลังโปร่งใส
2. เริ่มกระจกและกางแขนค้าง 1 วินาที — แสดงปีก 4 เลเยอร์
3. ลดแขนลงแล้วขยับตัว — ปีกค้างชั่วคราวและติดตามหัวไหล่
4. ตรวจว่าปีกไม่วาดทับลำตัวเมื่อ Segmentation ทำงาน
5. ทดสอบนับถอยหลัง 3 วินาที, ภาพ Preview, Save/Share บนมือถือ
6. ตรวจ FPS มือถือ และ fallback หากโหลดโมเดล/ภาพล้มเหลว

### หมายเหตุการทดสอบ

ผ่านการตรวจ syntax JS/JSX ในไฟล์ แต่ยัง **ไม่ผ่านการรัน npm build หรือทดสอบกล้องในเบราว์เซอร์จริง** ที่นี่ ไม่สามารถยืนยันความเข้ากันของภาพ PNG ต้นฉบับได้เพราะยังไม่ได้รับสี่ไฟล์นั้น กรุณาเก็บ V08 Stable เดิมไว้ก่อน
