// ─────────────────────────────────────────────────────────────
// 캐릭터 시트(corgi-sheet.png)를 상태별 이미지로 잘라낸다.
// 사용법: public/assets/corgi/corgi-sheet.png 저장 후 (결과는 src/assets/corgi/ 에 생성) `npm run corgi:crop -w frontend`
// 좌표는 1536×1536 시트 기준이며, 크기가 다르면 비율로 환산한다.
// ─────────────────────────────────────────────────────────────
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = fileURLToPath(new URL("../src/assets/corgi/", import.meta.url));
const sheetCandidates = [
  fileURLToPath(new URL("../../corgi-assets/corgi-character-sheet.png", import.meta.url)),
  fileURLToPath(new URL("../public/assets/corgi/corgi-sheet.png", import.meta.url)),
  fileURLToPath(new URL("../src/assets/corgi/corgi-sheet.png", import.meta.url)),
];
const sheetPath = sheetCandidates.find((p) => existsSync(p)) ?? sheetCandidates[0];
const BASE = 1536;

/** [파일명, left, top, width, height, 출력 최대 크기] */
const CROPS = [
  ["corgi-idle.png", 70, 60, 560, 590, 512], // 큰 프로필 (기본 대기)
  ["corgi-scene.png", 730, 20, 806, 640, 900], // 수정구슬 장면 (홈 화면)
  ["corgi-listening.png", 50, 725, 250, 275, 320], // 기본 (대화중 · 고민 듣기)
  ["corgi-thinking.png", 345, 725, 250, 275, 320], // 생각중
  ["corgi-analysis.png", 645, 725, 250, 275, 320], // 분석중
  ["corgi-surprised.png", 940, 725, 250, 275, 320], // 놀람
  ["corgi-happy.png", 1260, 725, 250, 275, 320], // 기쁨
  ["corgi-avatar.png", 55, 1145, 325, 325, 256], // 프로필 (채팅 앱용)
  ["corgi-sleeping.png", 1045, 1232, 440, 290, 480], // 잠자기
];

if (!existsSync(sheetPath)) {
  console.error(`캐릭터 시트가 없습니다: ${sheetPath}`);
  process.exit(1);
}

const meta = await sharp(sheetPath).metadata();
const scaleX = (meta.width ?? BASE) / BASE;
const scaleY = (meta.height ?? BASE) / BASE;

for (const [name, left, top, width, height, max] of CROPS) {
  const region = {
    left: Math.round(left * scaleX),
    top: Math.round(top * scaleY),
    width: Math.min(Math.round(width * scaleX), (meta.width ?? BASE) - Math.round(left * scaleX)),
    height: Math.min(Math.round(height * scaleY), (meta.height ?? BASE) - Math.round(top * scaleY)),
  };
  await sharp(sheetPath)
    .extract(region)
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(`${dir}${name}`);
  console.log(`✔ ${name}`);
}
