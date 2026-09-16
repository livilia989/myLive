// ─────────────────────────────────────────────────────────────
// Mock LLM 용 한국어 자연어 파서
// 단순 문자열 일치가 아니라 동의어 · 조사 · 구분자를 유연하게 처리한다.
// ─────────────────────────────────────────────────────────────

export function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const TRAILING_PARTICLES = /(?:이랑|랑|하고|으로|로|이나|나|을|를|이|가|은|는|에서|에|중|사이|둘)$/;

export function cleanChoiceName(raw: string): string {
  let name = raw
    .replace(/["'“”‘’`]/g, "")
    .replace(/^(?:나는|난|나|저는|전|음+|흠+|그냥|혹시|요즘|오늘|지금|이번에?)\s+/, "")
    .replace(/[?!.~]+$/g, "")
    .trim();
  // 조사를 한 번만 떼어낸다 (단어 자체가 짧으면 그대로 둔다)
  if (name.length > 2) name = name.replace(TRAILING_PARTICLES, "").trim();
  return name;
}

const STOPWORDS =
  /^(?:메뉴|점심|저녁|아침|야식|점심\s*메뉴|저녁\s*메뉴|여행|여행지|여행지를|물건|이거|이것|그거|저거|선택지|선택|고민|뭐|무엇|어디|a|b|하나|둘|진로|업무|커리어|소비|예산|일상|직접\s*입력|안녕|안녕하세요|하이|hi|hello|도와줘|좋아|응|네|ㅇㅇ)$/i;

export function isStopword(word: string): boolean {
  return STOPWORDS.test(word.trim());
}

const DECISION_TAIL =
  /(?:\s+(?:중(?:에서?|에)?|사이(?:에서)?|둘\s*중)(?=\s|$)|\s+(?:어디|뭐|무엇|어떤|어느|고민|골라|선택|비교)|\s*(?:할까|갈까|먹을까|살까|할지|갈지|먹을지|살지))[\s\S]*$/;

/**
 * "A와 B 중 고민이야", "A vs B", "A, B, C", "A 아니면 B" 형태에서 선택지를 추출한다.
 */
export function extractGenericChoices(text: string): string[] {
  const head = text.replace(DECISION_TAIL, "").trim() || text.trim();
  const parts = head
    .split(/\s*(?:,|\/|·|\bvs\.?\b|\bVS\b|또는|아니면|혹은)\s*|(?<=\S)(?:와|과|이랑|랑|하고)\s+/i)
    .map((part) => cleanChoiceName(part ?? ""))
    .filter((part) => part.length >= 1 && part.length <= 20);
  let unique = [...new Set(parts)].filter((part) => !isStopword(part));
  // "짜장면 짬뽕" 처럼 구분자 없이 두세 단어만 나열한 경우
  const tokens = head.split(/\s+/).filter(Boolean).map(cleanChoiceName);
  if (unique.length === 1 && tokens.length >= 2 && tokens.length <= 3 && tokens.every((t) => t.length <= 10 && !isStopword(t))) {
    unique = [...new Set(tokens)];
  }
  return unique.length >= 2 ? unique.slice(0, 4) : unique.slice(0, 1);
}

export function includesAny(text: string, words: RegExp): boolean {
  return words.test(normalize(text));
}

/** "2박 3일", "3일", "당일치기", "일주일" → 박 수 */
export function parseNights(text: string): number | undefined {
  const t = normalize(text);
  if (/당일/.test(t)) return 0;
  const nights = t.match(/(\d+)\s*박/);
  if (nights) return Number(nights[1]);
  const days = t.match(/(\d+)\s*일/);
  if (days) return Math.max(0, Number(days[1]) - 1);
  if (/일주일|1주/.test(t)) return 6;
  if (/주말/.test(t)) return 1;
  const koreanNights: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5 };
  const k = t.match(/(한|두|세|네|다섯)\s*밤/);
  if (k) return koreanNights[k[1]];
  return undefined;
}

/** "30만원", "5천원", "150만원 이상" → 만원 단위 금액 */
export function parseAmountManwon(text: string): number | undefined {
  const t = normalize(text).replace(/,/g, "");
  const values: number[] = [];
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*만/g)) values.push(Number(m[1]));
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*천\s*원?/g)) values.push(Number(m[1]) / 10);
  for (const m of t.matchAll(/(\d{4,})\s*원/g)) values.push(Number(m[1]) / 10000);
  if (!values.length) {
    const bare = t.match(/(\d+(?:\.\d+)?)/);
    if (bare) values.push(Number(bare[1]));
  }
  return values.length ? Math.max(...values) : undefined;
}

export function isUnknownAnswer(text: string): boolean {
  return /모르|몰라|글쎄|상관\s*없|아무거나|잘\s*모르|패스|넘어가/.test(normalize(text));
}

export function isRecommendRequest(text: string): boolean {
  return /추천|아무거나|정해\s*줘|몰라|모르겠/.test(normalize(text));
}

/**
 * 동의어 사전을 사용해 기준 이름을 추출한다. 먼저 언급된 기준이 앞에 온다.
 */
export function extractKeywords(text: string, dictionary: Record<string, RegExp>): string[] {
  const t = normalize(text);
  return Object.entries(dictionary)
    .map(([name, pattern]) => ({ name, index: t.search(pattern) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.name);
}

/** 사전에 없는 자유 입력 기준: "가격이랑 분위기가 중요해" → ["가격", "분위기"] */
export function extractFreeCriteria(text: string): string[] {
  const body = normalize(text)
    .replace(/(?:이|가|은|는|을|를)?\s*(?:제일|가장|정말|진짜|좀|많이)?\s*(?:중요(?:해|하다|함|하고|해요|합니다)?|봐|볼래|볼게|생각해)[\s.!~]*$/, "")
    .trim();
  return [
    ...new Set(
      body
        .split(/\s*(?:,|\/|·|그리고|또|및)\s*|(?<=\S)(?:와|과|이랑|랑|하고)\s+/)
        .map((part) => cleanChoiceName(part))
        .filter((part) => part.length >= 1 && part.length <= 12),
    ),
  ].slice(0, 5);
}

/** 순서 기반 가중치: 첫 번째 5, 두 번째 4, 나머지 3 */
export function weightByOrder(index: number, total: number): number {
  if (total === 1) return 5;
  return index === 0 ? 5 : index === 1 ? 4 : 3;
}
