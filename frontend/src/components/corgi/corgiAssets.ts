import type { CorgiState } from "@/features/decision/types";

// ─────────────────────────────────────────────────────────────
// 캐릭터 이미지 자동 탐색
// src/assets/corgi/ 에 있는 파일만 빌드에 포함된다. (없는 파일을 요청해 404 가 나는 일이 없다)
// 이미지를 추가 · 교체하려면 같은 이름으로 파일만 바꾸면 된다.
// ─────────────────────────────────────────────────────────────

const files = import.meta.glob<string>("../../assets/corgi/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
});

const byName: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split("/").pop()!.replace(/\.\w+$/, ""), url]),
);

export const DEFAULT_CORGI_IMAGE = "/assets/corgi/corgi-default.svg";

const STATE_FILE: Record<CorgiState, string[]> = {
  idle: ["corgi-idle", "corgi-avatar"],
  listening: ["corgi-listening", "corgi-idle"],
  thinking: ["corgi-thinking", "corgi-idle"],
  analysis: ["corgi-analysis", "corgi-thinking", "corgi-idle"],
  happy: ["corgi-happy", "corgi-idle"],
  surprised: ["corgi-surprised", "corgi-idle"],
  sleeping: ["corgi-sleeping", "corgi-idle"],
  error: ["corgi-surprised", "corgi-idle"],
};

/** 프로필(원형 아바타)용: 기본/대화 상태는 채팅 프로필 이미지를 우선 사용 */
export function getAvatarImage(state: CorgiState): string {
  const candidates = state === "idle" || state === "listening" ? ["corgi-avatar", ...STATE_FILE[state]] : [...STATE_FILE[state], "corgi-avatar"];
  return candidates.map((name) => byName[name]).find(Boolean) ?? DEFAULT_CORGI_IMAGE;
}

/** 큰 캐릭터용 */
export function getCharacterImage(state: CorgiState): string {
  return STATE_FILE[state].map((name) => byName[name]).find(Boolean) ?? byName["corgi-avatar"] ?? DEFAULT_CORGI_IMAGE;
}

/** 홈 화면 장면 이미지 (없으면 undefined) */
export function getSceneImage(): string | undefined {
  return byName["corgi-scene"];
}

export const hasCustomCorgiImages = Object.keys(byName).length > 0;
