import type { ChatMessage, QuickReplyOption } from "./types";

export function createId(prefix = "id"): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** 선택지·기준 이름에서 안정적인 id 를 만든다. (같은 이름 → 같은 id) */
export function slugId(prefix: string, name: string): string {
  let hash = 0;
  for (const ch of name.trim()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `${prefix}_${hash.toString(36)}`;
}

// ─────────────────────────────────────────────────────────────
// 한국어 조사
// ─────────────────────────────────────────────────────────────

const DIGIT_HAS_FINAL: Record<string, boolean> = {
  "0": true, "1": true, "2": false, "3": true, "4": false,
  "5": false, "6": true, "7": true, "8": true, "9": false,
};

function hasFinalConsonant(word: string): boolean | undefined {
  const trimmed = word.trim().replace(/[)\]}"'”’.!?]+$/, "");
  const last = trimmed.charAt(trimmed.length - 1);
  if (!last) return undefined;
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (last in DIGIT_HAS_FINAL) return DIGIT_HAS_FINAL[last];
  return undefined;
}

type JosaPair = "이/가" | "을/를" | "은/는" | "과/와" | "으로/로" | "이랑/랑" | "아/야";

/** josa("후쿠오카", "이/가") → "후쿠오카가" */
export function josa(word: string, pair: JosaPair): string {
  const [withFinal, withoutFinal] = pair.split("/");
  const final = hasFinalConsonant(word);
  if (final === undefined) return `${word}${withFinal}(${withoutFinal})`;
  const lastCode = word.trim().charCodeAt(word.trim().length - 1);
  const endsWithRieul = lastCode >= 0xac00 && lastCode <= 0xd7a3 && (lastCode - 0xac00) % 28 === 8;
  if (pair === "으로/로" && endsWithRieul) return `${word}로`;
  return `${word}${final ? withFinal : withoutFinal}`;
}

// ─────────────────────────────────────────────────────────────
// 표현 안전장치
// ─────────────────────────────────────────────────────────────

const ASSERTIVE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/100\s*%\s*정답/g, "잘 맞을 수 있는 선택"],
  [/무조건/g, "아마도"],
  [/반드시/g, "가능하면"],
  [/운명적으로/g, "지금 기준으로 보면"],
  [/선택해야\s*(?:한다|합니다|해요|해)/g, "선택하는 쪽이 조금 더 잘 맞아 보여요"],
  [/실패(?:한다|합니다|할 거예요|할 거야)/g, "아쉬울 수 있어요"],
];

/** LLM 이 만든 문장에서 결정을 강요하거나 단정하는 표현을 부드럽게 바꾼다. */
export function softenAssertiveText(text: string): string {
  return ASSERTIVE_REPLACEMENTS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

// ─────────────────────────────────────────────────────────────
// 고위험 의사결정 감지
// ─────────────────────────────────────────────────────────────

const HIGH_RISK_PATTERNS: Array<{ domain: string; pattern: RegExp }> = [
  { domain: "정치", pattern: /정치|투표|선거|후보|정당|대통령/ },
  { domain: "의료", pattern: /병원|수술|진료|치료|진단|처방|약을|약 먹|복용|증상|암\s|항암|임신|우울증/ },
  { domain: "법률", pattern: /소송|고소|변호사|법적|계약서|합의금|이혼|형사|민사|위자료/ },
  { domain: "투자", pattern: /주식|코인|비트코인|투자|펀드|etf|ETF|레버리지|선물 거래/ },
  { domain: "대출", pattern: /대출|빚|마이너스 통장|카드론|전세자금|담보/ },
  { domain: "보험", pattern: /보험/ },
  { domain: "안전", pattern: /자살|자해|죽고 싶|위험한|폭력|안전/ },
];

export function detectHighRisk(text: string): string | undefined {
  return HIGH_RISK_PATTERNS.find(({ pattern }) => pattern.test(text))?.domain;
}

export const HIGH_RISK_NOTICE =
  "이 분야는 실제 전문가의 상담이나 공식 자료 확인이 필요한 영역이에요.\n제가 도와드릴 수 있는 것은 선택 기준을 정리하고 비교하는 정도예요.";

// ─────────────────────────────────────────────────────────────
// 메시지 헬퍼
// ─────────────────────────────────────────────────────────────

export function toQuickReplies(values: string[] | undefined): QuickReplyOption[] | undefined {
  if (!values?.length) return undefined;
  return values.slice(0, 8).map((value, index) => {
    const [label, actionValue] = value.includes("|") ? value.split("|") : [value, value];
    return { id: `qr_${index}`, label, value: actionValue };
  });
}

export function createMessage(partial: Omit<ChatMessage, "id" | "createdAt"> & Partial<ChatMessage>): ChatMessage {
  return {
    id: partial.id ?? createId("msg"),
    createdAt: partial.createdAt ?? nowIso(),
    ...partial,
  };
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
