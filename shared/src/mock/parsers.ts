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
  /^(?:메뉴|점심|저녁|아침|야식|점심\s*메뉴|저녁\s*메뉴|여행|여행지|여행지를|물건|이거|이것|그거|저거|선택지|선택|고민|뭐|무엇|어디|a|b|하나|둘|진로|업무|커리어|소비|예산|일상|직접\s*입력|안녕|안녕하세요|하이|hi|hello|도와줘|좋아|응|네|ㅇㅇ|어떻게|어쩌지|어떡해|어떡하지|뭐하지|모르겠어)$/i;

export function isStopword(word: string): boolean {
  return STOPWORDS.test(word.trim());
}

const DECISION_TAIL =
  /(?:\s+(?:중(?:에서?|에)?|사이(?:에서)?|둘\s*중)(?=\s|$)|\s+(?:어디|뭐|무엇|어떤|어느|고민|골라|선택|비교)|\s*(?:할까|갈까|먹을까|살까|할지|갈지|먹을지|살지))[\s\S]*$/;

// ─────────────────────────────────────────────────────────────
// 긴 사연형 입력: 문장 분리 → "고민 문장" 과 "상황 설명" 구분
// ─────────────────────────────────────────────────────────────

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。…>~])\s*|\n+/)
    .map((s) => s.replace(/[.!?。…>~]+$/g, "").trim())
    .filter(Boolean);
}

const QUESTION_ENDING = /(?:까|지|나|래|요|어때|좋아|말아|고민|할지|될지|갈지)\s*$/;

/** 여러 문장 중 실제로 고민을 묻는 문장 (보통 마지막 질문형 문장) */
export function pickDecisionSentence(text: string): string {
  const sentences = splitSentences(text);
  return [...sentences].reverse().find((s) => QUESTION_ENDING.test(s)) ?? sentences.at(-1) ?? text.trim();
}

/** 고민 문장을 뺀 나머지 문장 = 상황 설명 (최대 3개) */
export function extractSituation(text: string): string[] {
  const decision = pickDecisionSentence(text);
  return splitSentences(text)
    .filter((s) => s !== decision && s.length >= 4)
    .slice(0, 3)
    .map((s) => (s.length > 60 ? `${s.slice(0, 58)}…` : s));
}

const FILLER = /^(?:그냥|차라리|역시|혹시|이번엔|이번에는|아예|그럼|그러면|근데|그래도|솔직히|그래서)\s+/;

function cleanStem(raw: string): string | undefined {
  let stem = raw.trim();
  for (let i = 0; i < 3; i += 1) stem = stem.replace(FILLER, "").trim();
  if (!stem || stem.length > 20) return undefined;
  return stem;
}

const SPLIT_BILL = /더치\s*페이|나눠\s*(?:내|계산)|반반|엔빵|n\s*빵|각자\s*(?:계산|내|부담)/i;

/**
 * "~하는 게 맞을까?", "~해도 될까?", "~해야 할까?", "~할까 말까" 같은 예/아니오 고민을
 * "~하기" / "~하지 않기" 두 선택지로 바꾼다.
 * 예) "그냥 내가 사는게 맞을까" → ["내가 사기", "내가 사지 않기"] (더치페이 이야기가 있으면 "더치페이 하기")
 */
export function extractYesNoChoices(text: string): string[] | undefined {
  const sentence = normalize(pickDecisionSentence(text)).replace(/[?？!.~>]+$/g, "");
  let stem: string | undefined;

  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^(.*?)(?:는\s*게|는게|는\s*것이|는\s*거)\s*(?:맞|좋|나을|낫|괜찮|옳)/, (m) => m[1]],
    [/^(.*?)해야\s*(?:할까|하나|하는\s*걸까|될까|되나|돼)/, (m) => `${m[1]}하`],
    [/^(.*?)해도\s*(?:될까|되나|돼|괜찮)/, (m) => `${m[1]}하`],
    [/^(.*?)할까\s*말까/, (m) => `${m[1]}하`],
    [/^(.*?)(?:을|를)?\s*할지\s*말지/, (m) => `${m[1]}하`],
  ];
  for (const [pattern, toStem] of patterns) {
    const m = sentence.match(pattern);
    if (m) {
      stem = cleanStem(toStem(m));
      if (stem) break;
    }
  }
  if (!stem || stem === "하") return undefined;

  const yes = `${stem}기`;
  const no = SPLIT_BILL.test(text) && /(?:사|내|쏘|결제하|계산하)$/.test(stem) ? "더치페이 하기" : `${stem}지 않기`;
  return [yes, no];
}

/**
 * "A와 B 중 고민이야", "A vs B", "A, B, C", "A 아니면 B" 형태에서 선택지를 추출한다.
 * 긴 사연은 고민 문장에서만 찾고, 너무 긴 조각(서술문)은 선택지로 보지 않는다.
 */
export function extractGenericChoices(text: string): string[] {
  const sentence = pickDecisionSentence(text);
  const head = sentence.replace(DECISION_TAIL, "").trim() || sentence.trim();
  const parts = head
    .split(/\s*(?:,|\/|·|\bvs\.?\b|\bVS\b|또는|아니면|혹은)\s*|(?<=\S)(?:와|과|이랑|랑|하고)\s+/i)
    .map((part) => cleanChoiceName(part ?? ""))
    .filter((part) => part.length >= 1 && part.length <= 15 && part.split(/\s+/).length <= 3);
  let unique = [...new Set(parts)].filter((part) => !isStopword(part));
  // "짜장면 짬뽕" 처럼 구분자 없이 두세 단어만 나열한 경우
  const tokens = head.split(/\s+/).filter(Boolean).map(cleanChoiceName);
  // 단, "거절해도 될까", "어떻게 하지" 처럼 동사로 끝나는 말은 선택지가 아니다
  const looksLikeNoun = (t: string) => t.length <= 10 && !isStopword(t) && !/(?:까|지|야|어|해|요|다|네|게|면|도|고)$/.test(t);
  if (unique.length === 1 && tokens.length >= 2 && tokens.length <= 3 && tokens.every(looksLikeNoun)) {
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
