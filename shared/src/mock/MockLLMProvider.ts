import type { DecisionLLMInput, DecisionLLMResponse, LLMProvider } from "../types";
import { detectHighRisk, josa } from "../utils";
import {
  extractGenericChoices,
  extractSituation,
  extractYesNoChoices,
  isRecommendRequest,
  normalize,
  pickDecisionSentence,
} from "./parsers";
import {
  BUY_CHOICES,
  BUY_PATTERN,
  FOOD_KB,
  PHONE_KB,
  RELATIONSHIP_PATTERN,
  SCENARIOS,
  TRAVEL_KB,
  extractBuyItem,
  findKnown,
  type Prefs,
  type ScenarioDefinition,
  type ScenarioState,
} from "./scenarios";

// ─────────────────────────────────────────────────────────────
// Mock LLM
// 실제 LLM 없이도 전체 대화 흐름을 테스트할 수 있도록 같은 응답 스키마를 사용한다.
// ─────────────────────────────────────────────────────────────

const CATEGORY_PATTERNS: Array<[string, RegExp]> = [
  ["food", /메뉴|점심|저녁|아침|야식|먹을까|먹지|배고|음식|식사/],
  ["travel", /여행|여행지|휴가|놀러|관광|숙소/],
  ["career", /이직|퇴사|회사|업무|커리어|취업|직장|진로|전공|학교/],
  ["money", /예산|적금|저축|소비|용돈|지출|월급/],
  ["shopping", /살까|구매|사야|쇼핑|물건|폰|노트북|가방|신발|옷/],
  ["daily", /일상|주말|약속|운동|공부|연애|친구/],
];

const ASK_CHOICES: Record<string, { text: string; options: string[] }> = {
  food: {
    text: "좋아, 메뉴 고민이구나! 🍽️\n어떤 메뉴들 사이에서 고민 중이야? 후보를 2개 이상 알려줘.\n예: 짜장면, 짬뽕",
    options: ["짜장면, 짬뽕", "김치찌개, 된장찌개", "후보 추천해줘"],
  },
  travel: {
    text: "좋아, 여행지 고민이구나! ✈️\n어떤 곳들을 비교하고 있어? 후보를 2개 이상 알려줘.\n예: 후쿠오카, 오사카",
    options: ["후쿠오카, 오사카", "제주, 부산", "후보 추천해줘"],
  },
  shopping: {
    text: "좋아, 쇼핑 고민이구나! 🛍️\n어떤 물건들 사이에서 고민 중이야? 아니면 하나를 살까 말까 고민 중이야?",
    options: ["아이폰, 갤럭시", "이거 살까 말까 고민이야"],
  },
  career: {
    text: "업무·커리어 고민이구나. 💼\n어떤 선택지들 사이에서 고민 중인지 알려줄래?\n예: 지금 회사, 이직",
    options: ["지금 회사, 이직", "대학원, 취업"],
  },
  default: {
    text: "좋아, 같이 골라보자! ✨\n어떤 선택지들 사이에서 고민 중이야? 2개 이상 알려줘.\n예: A와 B 중 고민이야",
    options: ["점심 메뉴를 골라줘", "여행지를 비교하고 싶어", "살까 말까 고민이야"],
  },
};

const RECOMMENDED_CHOICES: Record<string, string[]> = {
  food: ["김치찌개", "돈가스", "국밥"],
  travel: ["후쿠오카", "오사카"],
};

function detectCategory(text: string): string | undefined {
  // 사람이 등장하는 긴 사연은 '저녁', '여행' 같은 단어보다 사람 사이의 일상 고민으로 본다
  if (text.length > 40 && RELATIONSHIP_PATTERN.test(text)) return "daily";
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
}

/** 사연형 입력에서 상황 요약과 기준 프리셋(사람 사이 고민 등)을 뽑는다. */
function storyPrefs(text: string): Prefs {
  const prefs: Prefs = {};
  const situation = extractSituation(text);
  if (situation.length) prefs.situation = situation.join("|");
  if (RELATIONSHIP_PATTERN.test(text)) prefs.criteriaPreset = "relationship";
  return prefs;
}

interface DetectedChoices {
  scenario: ScenarioDefinition;
  choices: string[];
  prefs?: Prefs;
}

function detectChoices(text: string, category: string | undefined): DetectedChoices | undefined {
  const travel = findKnown(text, TRAVEL_KB);
  const food = findKnown(text, FOOD_KB);
  const phone = findKnown(text, PHONE_KB);
  const generic = extractGenericChoices(text);

  const knownSets: Array<[ScenarioDefinition, string[]]> = [
    [SCENARIOS.travel, travel],
    [SCENARIOS.food, food],
    [SCENARIOS.phone, phone],
  ];
  for (const [scenario, known] of knownSets) {
    // 지식 베이스로 모든 선택지를 설명할 수 있을 때만 해당 시나리오를 사용한다
    if (known.length >= 2 && (generic.length < 2 || generic.length <= known.length)) {
      return { scenario, choices: known.slice(0, 4) };
    }
  }

  if (BUY_PATTERN.test(normalize(text)) && travel.length + food.length + phone.length < 2) {
    return { scenario: SCENARIOS.buy, choices: [...BUY_CHOICES], prefs: { item: extractBuyItem(text) } };
  }

  // "~하는 게 맞을까?", "~할까 말까" 같은 예/아니오 고민.
  // "A와 B 중", "A, B", "A 아니면 B" 처럼 선택지를 나열한 경우에는 나열된 선택지를 우선한다.
  const yesNo = extractYesNoChoices(text);
  const listed = /,|\/|\bvs\b|아니면|또는|혹은|(?<=\S)(?:와|과|이랑|랑|하고)\s|\s중(?:에서?|에)?(?:\s|$)/i.test(pickDecisionSentence(text));
  if (yesNo && !listed) return { scenario: SCENARIOS.generic, choices: yesNo, prefs: { ...storyPrefs(text), yesNo: true } };

  if (generic.length >= 2) return { scenario: SCENARIOS.generic, choices: generic, prefs: storyPrefs(text) };
  if (yesNo) return { scenario: SCENARIOS.generic, choices: yesNo, prefs: { ...storyPrefs(text), yesNo: true } };

  if (generic.length === 0 && category && RECOMMENDED_CHOICES[category] && isRecommendRequest(text)) {
    const scenario = category === "food" ? SCENARIOS.food : SCENARIOS.travel;
    return { scenario, choices: RECOMMENDED_CHOICES[category] };
  }
  return undefined;
}

function buildResponseFromState(
  scenario: ScenarioDefinition,
  state: ScenarioState,
  leading: string[],
  extra: Partial<DecisionLLMResponse>,
): DecisionLLMResponse {
  const questions = scenario.questions(state);
  const next = questions.find((q) => state.prefs[q.id === "criteria" ? "criteria" : q.id] === undefined);

  const criteria = scenario.criteria(state);
  const choiceScores: Record<string, Record<string, number>> = {};
  for (const choice of state.choices) {
    choiceScores[choice] = {};
    for (const criterion of criteria) {
      const score = scenario.score(choice, criterion.name, state);
      if (score !== undefined) choiceScores[choice][criterion.name] = score;
    }
  }

  const replyParts = [...leading];
  if (next) replyParts.push(next.text(state));
  else replyParts.push(scenario.transition(state));

  return {
    reply: replyParts.join("\n").trim(),
    topic: scenario.topic(state),
    category: String(state.prefs.category ?? scenario.category),
    choices: state.choices.map((name) => scenario.describe(name)),
    criteria,
    userPreferences: state.prefs,
    nextQuestion: next ? { id: next.id, text: next.text(state), options: next.options(state) } : null,
    choiceScores,
    ...extra,
  };
}

export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  async generateDecisionResponse(input: DecisionLLMInput): Promise<DecisionLLMResponse> {
    const { context, userMessage, stage } = input;
    const text = userMessage.trim();
    const prefs: Prefs = { ...context.userPreferences };
    const pending = context.missingInformation[0];
    const highRisk = detectHighRisk(text) ?? (typeof prefs.highRisk === "string" ? prefs.highRisk : undefined);
    if (highRisk) prefs.highRisk = highRisk;

    const category = context.category ?? detectCategory(text);
    if (category && prefs.category === undefined) prefs.category = category;

    // 결과를 이미 보여준 뒤의 자유 대화
    if ((stage === "presenting_result" || stage === "completed") && pending !== "choices") {
      return {
        reply: "결과는 결과 화면에서 자세히 볼 수 있어! 🔮\n선택지를 바꾸고 싶으면 '선택지 수정'을, 다른 고민이 있다면 '새 고민'을 눌러줘.",
        nextQuestion: null,
      };
    }

    // 1) 선택지가 아직 없거나, 선택지를 수정하는 중
    const existingChoices = context.choices.map((c) => c.name);
    if (existingChoices.length < 2 || pending === "choices") {
      const combinedText =
        typeof prefs.pendingChoice === "string" && !text.includes(prefs.pendingChoice) ? `${prefs.pendingChoice}, ${text}` : text;
      const detected = detectChoices(combinedText, category);

      if (!detected) {
        const single = extractGenericChoices(text);
        const situation = extractSituation(text);
        // 짧은 한 문장에서 후보가 하나만 보일 때만 "다른 후보"를 묻는다 (긴 사연에서 단어를 잘못 집지 않도록)
        if (single.length === 1 && situation.length === 0 && text.length <= 25 && !isRecommendRequest(text)) {
          prefs.pendingChoice = single[0];
          return {
            reply: `${josa(single[0], "을/를")} 생각하고 있구나! 🤔\n${single[0]} 말고 비교해볼 다른 후보도 있어?`,
            category,
            userPreferences: prefs,
            nextQuestion: { id: "choices", text: "다른 후보를 알려줘", options: [`${single[0]}, 다른 선택`] },
            isHighRisk: Boolean(highRisk),
          };
        }
        const ask = ASK_CHOICES[category ?? "default"] ?? ASK_CHOICES.default;
        const summary = situation.length
          ? `이야기해줘서 고마워. 🐾\n상황을 정리해보면 이렇구나:\n${situation.map((s) => `• ${s}`).join("\n")}\n\n그럼 어떤 선택지들 사이에서 고민 중인지 알려줄래? 예: 'A 하기, B 하기'`
          : undefined;
        return {
          reply: summary ?? ask.text,
          category,
          userPreferences: prefs,
          nextQuestion: { id: "choices", text: ask.text, options: ask.options },
          isHighRisk: Boolean(highRisk),
        };
      }

      const previousScenario = prefs.scenario;
      let nextPrefs: Prefs = { ...prefs, ...detected.prefs };
      if (previousScenario && previousScenario !== detected.scenario.key) {
        // 시나리오가 바뀌면 이전 답변은 의미가 없으므로 초기화한다
        nextPrefs = { category: detected.scenario.category, ...detected.prefs };
        if (highRisk) nextPrefs.highRisk = highRisk;
      }
      for (const key of Object.keys(nextPrefs)) if (key.startsWith("rate:")) delete nextPrefs[key];
      delete nextPrefs.pendingChoice;
      nextPrefs.scenario = detected.scenario.key;
      if (detected.scenario.key !== "generic") nextPrefs.category = detected.scenario.category;

      const state: ScenarioState = { prefs: nextPrefs, choices: detected.choices };
      const leading = previousScenario
        ? [`좋아, 선택지를 ${josa(detected.choices.join(", "), "으로/로")} 바꿨어!`]
        : [detected.scenario.intro(state), ""];
      return buildResponseFromState(detected.scenario, state, leading, { isHighRisk: Boolean(highRisk) });
    }

    // 2) 선택지가 있는 상태에서 질문에 대한 답변
    const scenarioKey = (prefs.scenario as ScenarioDefinition["key"] | undefined) ?? "generic";
    const scenario = SCENARIOS[scenarioKey] ?? SCENARIOS.generic;
    const state: ScenarioState = { prefs, choices: existingChoices };
    const question = scenario.questions(state).find((q) => q.id === pending);
    const leading: string[] = [];
    if (question) {
      leading.push(question.parse(text, state));
    } else {
      leading.push("알겠어!");
    }
    return buildResponseFromState(scenario, state, leading, { isHighRisk: Boolean(highRisk) });
  }
}
