# AI Magic Mirror V07 — Celestial Inferno

Based on the working JavaScript V06. The V04 curved gold mirror, Arcane Prism wings and port **3107** are unchanged.

## New spell visual
- Palm-anchored (Pose-based estimate, *not* full Hand Landmarker)
- Multi-layer gold/violet/cyan bloom, white-hot orb, three animated rune orbits, plasma ribbons, expanding burst on trigger
- Existing raise-hand gesture and wing gesture remain unchanged
- All visual effects rendered with Canvas 2D; no additional package required

## Run
```bash
npm install
npm run dev
```
Open http://localhost:3107. Run `npm run build` before pushing to GitHub. Never close other projects' node processes to free the port; stop only the previous Magic Mirror terminal using 3107.

## Testing
1. Face camera, keep hand visible above shoulder for 0.7s.
2. Orb should hover near palm and follow smoothly. Check both left and right hands.
3. Open arms for Wings of Light; wings should still trigger.
4. Capture photo; effect should appear in PNG.
5. Test FPS on mobile via Vercel HTTPS; reduce particle count if FPS drops.

**Known limitation:** The 33-point Pose model approximates a palm anchor. Precise palm rotation and open-palm detection require a separate Hand Landmarker in a future version. Build/runtime camera testing still required.


## V07.1 Photo Save Patch
- Photo result downloads as a local PNG through a Blob object URL.
- Added 'เปิดรูปเพื่อบันทึก' fallback for mobile browsers that open rather than download.
- Preserves UI, video processing, gestures, effects, and port 3107.
- Chrome/Android: check Downloads. On iOS Safari: use the share sheet or long-press to save the opened image.


## V07.2 Mobile Save
- เมื่อถ่ายภาพ จะสร้าง PNG File ไว้ทันที
- ปุ่ม แชร์ / บันทึกบนมือถือ ใช้ Web Share API ใน user tap โดยตรง (iOS/Android ที่รองรับ)
- ปุ่ม ดาวน์โหลด PNG ยังใช้ Blob download สำหรับ Desktop
- หากอุปกรณ์ไม่รองรับ ให้แตะภาพตัวอย่างค้างเพื่อเลือก Save Image/Download Image
- ไม่อัปโหลดภาพขึ้น Server ภาพถูกประมวลผลใน Browser เท่านั้น
- ไม่เปลี่ยน UI กระจก, Gesture, Effect, WASM หรือพอร์ต 3107
