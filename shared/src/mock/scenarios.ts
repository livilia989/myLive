import type { DecisionCategory, LLMChoiceDraft, LLMCriterionDraft } from "../types";
import { josa } from "../utils";
import {
  extractFreeCriteria,
  extractKeywords,
  isUnknownAnswer,
  normalize,
  parseAmountManwon,
  parseNights,
  weightByOrder,
} from "./parsers";

// ─────────────────────────────────────────────────────────────
// Mock 시나리오 정의
// 각 시나리오는 "질문 목록 → 기준 생성 → 선택지 평가(1~5)" 만 담당한다.
// 점수 합산과 추천은 analysis.ts 가 한다.
// ─────────────────────────────────────────────────────────────

export type Prefs = Record<string, string | number | boolean>;

export interface ScenarioState {
  prefs: Prefs;
  choices: string[];
}

export interface ScenarioQuestion {
  id: string;
  text: (state: ScenarioState) => string;
  options: (state: ScenarioState) => string[];
  /** 답변을 prefs 에 반영하고, 짧은 맞장구 문장을 돌려준다. */
  parse: (answer: string, state: ScenarioState) => string;
}

export interface ScenarioDefinition {
  key: "travel" | "food" | "phone" | "buy" | "generic";
  category: DecisionCategory;
  emoji: string;
  topic: (state: ScenarioState) => string;
  intro: (state: ScenarioState) => string;
  questions: (state: ScenarioState) => ScenarioQuestion[];
  criteria: (state: ScenarioState) => LLMCriterionDraft[];
  score: (choice: string, criterion: string, state: ScenarioState) => number | undefined;
  describe: (choice: string) => LLMChoiceDraft;
  transition: (state: ScenarioState) => string;
}

interface KnowledgeItem {
  aliases: RegExp;
  description: string;
  pros: string[];
  cons: string[];
  attrs: Record<string, number>;
}

export function findKnown(text: string, kb: Record<string, KnowledgeItem>): string[] {
  const t = normalize(text);
  return Object.entries(kb)
    .map(([name, item]) => ({ name, index: t.search(item.aliases) }))
    .filter((x) => x.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map((x) => x.name);
}

function choicePhrase(choices: string[]): string {
  if (choices.length === 2) return `${josa(choices[0], "과/와")} ${choices[1]}`;
  return choices.join(", ");
}

function describeFrom(kb: Record<string, KnowledgeItem>, name: string): LLMChoiceDraft {
  const item = kb[name];
  return item ? { name, description: item.description, pros: item.pros, cons: item.cons } : { name, pros: [], cons: [] };
}

function criteriaFromPrefs(prefs: Prefs): string[] {
  const raw = prefs.criteria;
  return typeof raw === "string" && raw ? raw.split("|") : [];
}

// ─────────────────────────────────────────────────────────────
// 여행
// ─────────────────────────────────────────────────────────────

export const TRAVEL_KB: Record<string, KnowledgeItem> = {
  후쿠오카: {
    aliases: /후쿠오카|fukuoka|하카타/,
    description: "공항과 시내가 가까워 짧은 일정에 알찬 규슈의 미식 도시",
    pros: ["공항에서 시내까지 지하철로 10분 남짓이에요", "라멘·모츠나베 같은 먹거리가 알차요", "항공권이 비교적 저렴한 편이에요"],
    cons: ["대형 관광지는 오사카보다 적은 편이에요", "긴 일정이면 근교까지 나가야 할 수 있어요"],
    attrs: { 맛집: 4, 쇼핑: 3, 관광: 3, 휴식: 4, 가성비: 5, "이동 편의성": 5, short: 5, long: 3 },
  },
  오사카: {
    aliases: /오사카|osaka|간사이/,
    description: "'먹다 망한다'는 말이 있을 만큼 먹거리와 볼거리가 풍부한 도시",
    pros: ["맛집 선택지가 정말 많아요", "유니버설 스튜디오 등 볼거리가 풍부해요", "교토·나라 근교 여행도 함께할 수 있어요"],
    cons: ["간사이 공항에서 시내까지 이동 시간이 걸려요", "관광객이 많아 붐빌 수 있어요"],
    attrs: { 맛집: 5, 쇼핑: 5, 관광: 5, 휴식: 3, 가성비: 4, "이동 편의성": 3, short: 3, long: 5 },
  },
  도쿄: {
    aliases: /도쿄|동경|tokyo/,
    description: "쇼핑·전시·맛집이 모두 모인 대도시",
    pros: ["볼거리와 쇼핑이 압도적이에요", "맛집 선택지가 다양해요"],
    cons: ["물가와 숙박비가 높은 편이에요", "노선이 복잡해 이동이 피곤할 수 있어요"],
    attrs: { 맛집: 5, 쇼핑: 5, 관광: 5, 휴식: 2, 가성비: 2, "이동 편의성": 3, short: 3, long: 5 },
  },
  교토: {
    aliases: /교토|kyoto/,
    description: "전통 거리와 사찰이 아름다운 고도",
    pros: ["고즈넉한 분위기와 전통 명소가 많아요", "산책하며 여유롭게 둘러보기 좋아요"],
    cons: ["명소 간 버스 이동이 붐빌 수 있어요", "쇼핑 선택지는 적은 편이에요"],
    attrs: { 맛집: 3, 쇼핑: 2, 관광: 5, 휴식: 4, 가성비: 3, "이동 편의성": 3, short: 3, long: 4 },
  },
  삿포로: {
    aliases: /삿포로|홋카이도|sapporo/,
    description: "해산물과 설경, 자연이 매력적인 북쪽 도시",
    pros: ["해산물·징기스칸 등 먹거리가 좋아요", "계절마다 풍경이 아름다워요"],
    cons: ["근교 명소가 멀리 흩어져 있어요", "겨울엔 날씨 변수가 있어요"],
    attrs: { 맛집: 4, 쇼핑: 3, 관광: 4, 휴식: 4, 가성비: 3, "이동 편의성": 3, short: 3, long: 4 },
  },
  제주: {
    aliases: /제주|jeju/,
    description: "바다와 오름, 카페가 많은 국내 대표 휴양지",
    pros: ["여권 없이 가볍게 떠날 수 있어요", "자연 속에서 쉬기 좋아요"],
    cons: ["렌터카가 없으면 이동이 불편해요", "성수기엔 물가가 오르는 편이에요"],
    attrs: { 맛집: 4, 쇼핑: 2, 관광: 4, 휴식: 5, 가성비: 3, "이동 편의성": 2, short: 4, long: 4 },
  },
  부산: {
    aliases: /부산|busan/,
    description: "바다와 먹거리, 도시 분위기를 함께 즐기는 항구 도시",
    pros: ["KTX로 가기 편해요", "돼지국밥·밀면 등 먹거리가 알차요"],
    cons: ["인기 명소는 주말에 붐벼요", "언덕이 많아 걷기 힘들 수 있어요"],
    attrs: { 맛집: 4, 쇼핑: 3, 관광: 4, 휴식: 3, 가성비: 4, "이동 편의성": 4, short: 5, long: 3 },
  },
  강릉: {
    aliases: /강릉|gangneung/,
    description: "바다와 커피거리가 있는 조용한 동해 도시",
    pros: ["바다 보며 쉬기 좋아요", "KTX로 당일치기도 가능해요"],
    cons: ["쇼핑할 곳은 거의 없어요", "긴 일정이면 할 거리가 부족할 수 있어요"],
    attrs: { 맛집: 4, 쇼핑: 1, 관광: 3, 휴식: 5, 가성비: 4, "이동 편의성": 3, short: 5, long: 2 },
  },
  방콕: {
    aliases: /방콕|bangkok/,
    description: "저렴한 물가에 먹거리·쇼핑·마사지까지 즐기는 도시",
    pros: ["물가가 저렴해 가성비가 좋아요", "야시장과 길거리 음식이 매력적이에요"],
    cons: ["비행시간이 길어 짧은 일정엔 빠듯해요", "덥고 교통 체증이 심해요"],
    attrs: { 맛집: 5, 쇼핑: 5, 관광: 4, 휴식: 3, 가성비: 5, "이동 편의성": 3, short: 2, long: 5 },
  },
  다낭: {
    aliases: /다낭|danang/,
    description: "리조트와 바다에서 쉬기 좋은 베트남 휴양 도시",
    pros: ["리조트 가성비가 좋아요", "바다에서 푹 쉬기 좋아요"],
    cons: ["쇼핑 선택지는 적어요", "관광지가 시내에서 떨어져 있어요"],
    attrs: { 맛집: 4, 쇼핑: 2, 관광: 3, 휴식: 5, 가성비: 5, "이동 편의성": 3, short: 3, long: 4 },
  },
  타이베이: {
    aliases: /타이베이|대만|taipei/,
    description: "야시장과 근교 여행이 알찬 대만의 수도",
    pros: ["야시장 먹거리가 풍부해요", "지하철로 이동하기 편해요"],
    cons: ["여름엔 덥고 습해요", "근교 투어는 이동 시간이 걸려요"],
    attrs: { 맛집: 5, 쇼핑: 4, 관광: 4, 휴식: 3, 가성비: 4, "이동 편의성": 4, short: 4, long: 4 },
  },
};

const TRAVEL_CRITERIA_DICT: Record<string, RegExp> = {
  맛집: /맛집|맛있|먹방|먹거리|음식|미식|먹는/,
  쇼핑: /쇼핑|사고 싶|구경|기념품|면세/,
  관광: /관광|명소|볼거리|구경거리|테마파크|유니버설|사진/,
  휴식: /휴식|쉬|온천|힐링|여유|호캉스/,
  가성비: /가성비|저렴|싸|비용|예산|돈|경비/,
  "이동 편의성": /이동|교통|편의|동선|가까|편한|편하/,
};

const travel: ScenarioDefinition = {
  key: "travel",
  category: "travel",
  emoji: "✈️",
  topic: ({ choices }) => `${choices.join(" vs ")} 여행지`,
  intro: ({ choices }) =>
    `오, ${choicePhrase(choices)} 중에서 고민 중이구나! ✈️\n${choices.length === 2 ? "두 곳 모두" : "모두"} 매력이 있어서 더 고민되겠다.`,
  questions: () => [
    {
      id: "duration",
      text: () => "내가 조금 더 잘 비교해주려면 한 가지만 물어봐도 될까?\n여행은 며칠 정도 생각하고 있어?",
      options: () => ["당일치기", "1박 2일", "2박 3일", "3박 4일 이상"],
      parse: (answer, state) => {
        const nights = parseNights(answer);
        if (nights === undefined) {
          state.prefs.duration = "unknown";
          return "좋아, 일정은 아직 정해지지 않았구나.";
        }
        state.prefs.duration = nights;
        if (nights === 0) return "당일치기라니, 알차게 움직여야겠다!";
        if (nights <= 2) return "좋아! 짧은 일정이구나.";
        if (nights === 3) return "좋아! 적당히 여유 있는 일정이네.";
        return "오, 넉넉한 일정이구나!";
      },
    },
    {
      id: "criteria",
      text: () => "그럼 이번 여행에서 가장 중요한 건 뭐에 가까워?\n\n맛집 / 쇼핑 / 관광 / 휴식 / 가성비",
      options: () => ["맛집", "쇼핑", "관광", "휴식", "가성비", "이동 편의성"],
      parse: (answer, state) => {
        let names = extractKeywords(answer, TRAVEL_CRITERIA_DICT);
        if (!names.length) names = isUnknownAnswer(answer) ? ["맛집", "관광", "가성비"] : extractFreeCriteria(answer);
        if (!names.length) names = ["맛집", "관광"];
        state.prefs.criteria = names.join("|");
        return "좋아, 이제 네 여행 스타일이 조금 보였어.";
      },
    },
  ],
  criteria: ({ prefs }) => {
    const names = criteriaFromPrefs(prefs);
    const list: LLMCriterionDraft[] = names.map((name, i) => ({ name, weight: weightByOrder(i, names.length) }));
    if (typeof prefs.duration === "number") {
      list.push({ name: "일정 적합도", weight: 3, description: `${prefs.duration}박 일정에 얼마나 잘 맞는지` });
    }
    return list;
  },
  score: (choice, criterion, { prefs }) => {
    const item = TRAVEL_KB[choice];
    if (!item) return undefined;
    if (criterion === "일정 적합도") {
      const nights = Number(prefs.duration);
      if (nights <= 2) return item.attrs.short;
      if (nights >= 4) return item.attrs.long;
      return Math.round((item.attrs.short + item.attrs.long) / 2);
    }
    return item.attrs[criterion];
  },
  describe: (name) => describeFrom(TRAVEL_KB, name),
  transition: ({ choices }) => `${choices.length === 2 ? "두 선택지를" : "선택지들을"} 차근차근 비교해볼게! 🔮`,
};

// ─────────────────────────────────────────────────────────────
// 음식
// ─────────────────────────────────────────────────────────────

const food = (
  aliases: RegExp,
  description: string,
  spicy: number,
  soup: number,
  filling: number,
  pros: string[],
  cons: string[],
): KnowledgeItem => ({ aliases, description, pros, cons, attrs: { spicy, soup, filling } });

export const FOOD_KB: Record<string, KnowledgeItem> = {
  짜장면: food(/짜장|자장|jjajang/, "달콤짭짤한 춘장 소스 면", 1, 1, 4, ["맵지 않고 부드러워요", "실패 확률이 낮은 익숙한 맛이에요"], ["국물이 없어 뻑뻑하게 느껴질 수 있어요", "먹고 나면 조금 느끼할 수 있어요"]),
  짬뽕: food(/짬뽕|jjamppong/, "해산물과 채소가 들어간 얼큰한 국물 면", 5, 5, 4, ["얼큰한 국물로 속이 확 풀려요", "해산물·채소가 들어가 푸짐해요"], ["매운 걸 못 먹으면 부담돼요", "국물이 튀기 쉬워요"]),
  김치찌개: food(/김치\s*찌개|김찌/, "칼칼한 국물의 대표 한식", 4, 5, 4, ["밥이랑 먹으면 든든해요", "칼칼해서 입맛이 살아나요"], ["속이 예민한 날엔 자극적일 수 있어요"]),
  된장찌개: food(/된장\s*찌개|된찌/, "구수하고 순한 국물 한식", 2, 5, 3, ["구수하고 속이 편해요"], ["자극적인 맛을 원하면 심심할 수 있어요"]),
  돈가스: food(/돈가스|돈까스|카츠/, "바삭한 튀김 요리", 1, 1, 5, ["바삭하고 든든해요", "맵지 않아요"], ["기름져서 느끼할 수 있어요"]),
  라면: food(/라면|라멘/, "빠르고 간편한 국물 면", 4, 5, 3, ["빠르고 간편해요"], ["영양 균형은 아쉬워요"]),
  국밥: food(/국밥/, "뜨끈한 국물에 밥을 만 든든한 한 그릇", 2, 5, 5, ["든든하고 가성비가 좋아요"], ["더운 날엔 부담스러울 수 있어요"]),
  비빔밥: food(/비빔밥/, "채소와 고추장을 비벼 먹는 한 그릇", 3, 1, 4, ["채소가 많아 균형이 좋아요"], ["특별한 맛을 원하면 평범할 수 있어요"]),
  냉면: food(/냉면/, "시원한 육수의 면 요리", 2, 4, 2, ["시원하고 깔끔해요"], ["배가 금방 꺼질 수 있어요"]),
  마라탕: food(/마라탕|마라/, "얼얼하고 매운 중국식 탕", 5, 5, 4, ["재료를 골라 먹는 재미가 있어요", "얼얼한 자극이 확실해요"], ["향신료가 강해 호불호가 있어요"]),
  떡볶이: food(/떡볶이|떡뽁이/, "매콤달콤한 분식", 4, 2, 3, ["매콤달콤해서 기분 전환이 돼요"], ["식사로는 조금 가벼울 수 있어요"]),
  피자: food(/피자|pizza/, "치즈가 듬뿍 올라간 요리", 1, 1, 4, ["여럿이 나눠 먹기 좋아요"], ["혼자 먹기엔 양이 많고 느끼할 수 있어요"]),
  치킨: food(/치킨|통닭/, "바삭한 닭튀김", 2, 1, 4, ["누구나 좋아하는 맛이에요"], ["기름지고 가격이 올랐어요"]),
  햄버거: food(/햄버거|버거/, "빠르게 먹는 패스트푸드", 1, 1, 4, ["빠르고 간편해요"], ["건강을 생각하면 아쉬워요"]),
  초밥: food(/초밥|스시/, "신선한 생선을 올린 밥", 1, 1, 3, ["깔끔하고 가벼워요"], ["가격이 높은 편이에요"]),
  파스타: food(/파스타|스파게티/, "다양한 소스의 이탈리안 면", 1, 1, 3, ["분위기 있게 먹기 좋아요"], ["양이 적게 느껴질 수 있어요"]),
  쌀국수: food(/쌀국수|포/, "맑고 따뜻한 국물의 베트남 면", 2, 5, 3, ["국물이 깔끔하고 속이 편해요"], ["향채를 싫어하면 아쉬워요"]),
  우동: food(/우동/, "쫄깃한 면과 순한 국물", 1, 5, 3, ["부드럽고 속이 편해요"], ["자극적인 맛을 원하면 심심해요"]),
  탕수육: food(/탕수육/, "바삭한 튀김에 새콤달콤 소스", 1, 1, 4, ["바삭하고 달콤해요"], ["식사보다는 요리 느낌이에요"]),
};

const food_: ScenarioDefinition = {
  key: "food",
  category: "food",
  emoji: "🍽️",
  topic: ({ choices }) => `${choices.join(" vs ")} 메뉴`,
  intro: ({ choices }) => `오, ${choicePhrase(choices)} 사이에서 고민 중이구나! 🍽️\n${choices.length === 2 ? "둘 다" : "다"} 맛있어서 더 어렵지?`,
  questions: () => [
    {
      id: "spicy",
      text: () => "오늘 맵고 자극적인 음식은 어때? 당기는 편이야?",
      options: () => ["매운 거 좋아!", "보통이야", "순한 게 좋아"],
      parse: (answer, state) => {
        const t = normalize(answer);
        if (/순한|안\s*매운|못\s*먹|싫|별로|안\s*좋|약한|부드러|자극.*없/.test(t)) {
          state.prefs.spicy = "dislike";
          return "알겠어, 오늘은 부드러운 맛으로 가보자!";
        }
        if (/보통|상관|아무|그냥|몰라|모르/.test(t)) {
          state.prefs.spicy = "neutral";
          return "좋아, 맵기는 크게 상관없구나.";
        }
        if (/좋|당|땡|매운|매콤|최고|자극|얼큰|화끈|칼칼|응|어/.test(t)) {
          state.prefs.spicy = "like";
          return "좋아, 오늘은 자극이 필요한 날이구나! 🌶️";
        }
        state.prefs.spicy = "neutral";
        return "좋아, 맵기는 크게 상관없는 걸로 생각할게.";
      },
    },
    {
      id: "soup",
      text: () => "그럼 국물 있는 음식이 좋아, 아니면 국물 없는 쪽이 좋아?",
      options: () => ["국물 좋아", "국물 없는 게 좋아", "상관없어"],
      parse: (answer, state) => {
        const t = normalize(answer);
        if (/없어도|상관|아무|몰라|모르|보통/.test(t)) {
          state.prefs.soup = "neutral";
          return "알겠어, 국물은 크게 상관없구나.";
        }
        if (/없는|없이|싫|별로|안\s*좋|뻑뻑|비벼/.test(t)) {
          state.prefs.soup = "dislike";
          return "좋아, 국물 없이 깔끔하게!";
        }
        if (/좋|있는|땡|당|뜨끈|시원|얼큰|국물/.test(t)) {
          state.prefs.soup = "like";
          return "오, 국물파구나! 🍜";
        }
        state.prefs.soup = "neutral";
        return "알겠어, 국물은 크게 상관없는 걸로 생각할게.";
      },
    },
  ],
  criteria: ({ prefs }) => {
    const list: LLMCriterionDraft[] = [];
    if (prefs.spicy === "like") list.push({ name: "매콤·자극적인 맛", weight: 5 });
    if (prefs.spicy === "dislike") list.push({ name: "순한 맛", weight: 5 });
    if (prefs.soup === "like") list.push({ name: "국물", weight: 4 });
    if (prefs.soup === "dislike") list.push({ name: "국물 없이 깔끔함", weight: 4 });
    list.push({ name: "든든함", weight: 2 });
    return list;
  },
  score: (choice, criterion) => {
    const item = FOOD_KB[choice];
    if (!item) return undefined;
    const { spicy, soup, filling } = item.attrs;
    switch (criterion) {
      case "매콤·자극적인 맛":
        return spicy;
      case "순한 맛":
        return 6 - spicy;
      case "국물":
        return soup;
      case "국물 없이 깔끔함":
        return 6 - soup;
      case "든든함":
        return filling;
      default:
        return undefined;
    }
  },
  describe: (name) => describeFrom(FOOD_KB, name),
  transition: () => "좋아, 오늘 네 입맛이 보이기 시작했어!\n메뉴를 차근차근 비교해볼게! 🔮",
};

// ─────────────────────────────────────────────────────────────
// 스마트폰
// ─────────────────────────────────────────────────────────────

export const PHONE_KB: Record<string, KnowledgeItem> = {
  아이폰: {
    aliases: /아이폰|iphone|애플\s*폰|아이퐁/,
    description: "애플 기기와의 연동과 영상 품질이 강점인 스마트폰",
    pros: ["영상 촬영 품질과 앱 최적화가 좋아요", "맥북·아이패드·애플워치와 연동이 편해요", "중고 가격 방어가 잘 되는 편이에요"],
    cons: ["가격이 높은 편이에요", "통화 녹음·파일 관리 등 자유도가 낮아요"],
    attrs: { 카메라: 5, 게임: 5, 배터리: 3, 가격: 2 },
  },
  갤럭시: {
    aliases: /갤럭시|galaxy|삼성\s*폰|갤\s*s|폴드|플립/,
    description: "다양한 모델과 편의 기능이 강점인 스마트폰",
    pros: ["줌 카메라 등 기능이 다양해요", "삼성페이·통화 녹음 같은 편의 기능이 많아요", "할인·프로모션이 자주 있어요"],
    cons: ["모델별 성능 차이가 커요", "중고 가격이 빨리 떨어지는 편이에요"],
    attrs: { 카메라: 4, 게임: 4, 배터리: 4, 가격: 3 },
  },
  픽셀: {
    aliases: /픽셀|pixel/,
    description: "사진 보정 품질과 순정 안드로이드가 강점인 스마트폰",
    pros: ["사진 결과물이 뛰어나요", "순정 안드로이드라 가벼워요"],
    cons: ["국내 정식 출시·A/S 가 제한적이에요", "게임 성능은 아쉬울 수 있어요"],
    attrs: { 카메라: 5, 게임: 3, 배터리: 3, 가격: 4 },
  },
};

const PHONE_CRITERIA_DICT: Record<string, RegExp> = {
  카메라: /카메라|사진|촬영|영상|셀카/,
  게임: /게임|성능|발열|고사양/,
  생태계: /생태계|연동|호환|맥북|아이패드|애플\s*워치|에어팟|갤럭시\s*(?:탭|워치|버즈)/,
  배터리: /배터리|충전|오래\s*가/,
  가격: /가격|가성비|저렴|싸게|싼/,
};

const phone: ScenarioDefinition = {
  key: "phone",
  category: "shopping",
  emoji: "📱",
  topic: ({ choices }) => `${choices.join(" vs ")} 스마트폰`,
  intro: ({ choices }) => `오, ${choicePhrase(choices)} 사이에서 고민 중이구나! 📱\n둘 다 인기 많은 폰이라 고민될 만해.`,
  questions: ({ prefs }) => {
    const list: ScenarioQuestion[] = [
      {
        id: "budget",
        text: () => "먼저 예산은 어느 정도 생각하고 있어?",
        options: () => ["100만원 이하", "100~150만원", "150만원 이상", "상관없어"],
        parse: (answer, state) => {
          const t = normalize(answer);
          const amount = parseAmountManwon(t);
          let budget: string;
          if (/상관|넉넉|여유|무관/.test(t)) budget = "loose";
          else if (/저렴|싸게|아껴|부족|빠듯/.test(t)) budget = "tight";
          else if (amount === undefined) budget = "unknown";
          else if (amount <= 100 && !/이상/.test(t)) budget = "tight";
          else if (amount >= 150 && /이상|넘/.test(t)) budget = "loose";
          else if (amount <= 150) budget = "mid";
          else budget = "loose";
          state.prefs.budget = budget;
          return budget === "tight"
            ? "알겠어, 가격도 꼼꼼히 봐야겠다."
            : budget === "mid"
              ? "좋아, 적당한 예산이구나."
              : "좋아, 예산은 여유가 있구나.";
        },
      },
      {
        id: "criteria",
        text: () => "폰을 고를 때 어떤 게 제일 중요해? 여러 개 말해줘도 돼!\n\n카메라 / 게임 / 생태계 / 배터리",
        options: () => ["카메라", "게임", "생태계", "배터리"],
        parse: (answer, state) => {
          let names = extractKeywords(answer, PHONE_CRITERIA_DICT);
          if (!names.length) names = isUnknownAnswer(answer) ? ["카메라", "배터리"] : extractFreeCriteria(answer);
          if (!names.length) names = ["카메라", "배터리"];
          state.prefs.criteria = names.join("|");
          const t = normalize(answer);
          if (/맥북|아이패드|애플\s*워치|에어팟|애플\s*기기/.test(t)) state.prefs.ecosystem = "apple";
          if (/갤럭시\s*(?:탭|워치|버즈)|삼성\s*기기/.test(t)) state.prefs.ecosystem = "samsung";
          return `좋아, ${names.join(", ")} 기준으로 살펴볼게!`;
        },
      },
    ];
    if (criteriaFromPrefs(prefs).includes("생태계") && prefs.ecosystem === undefined) {
      list.push({
        id: "ecosystem",
        text: () => "지금 쓰고 있는 기기가 있어? 맥북·아이패드 같은 애플 기기나, 갤럭시 탭·워치 같은 삼성 기기 말이야.",
        options: () => ["애플 기기 있어", "삼성 기기 있어", "둘 다 없어"],
        parse: (answer, state) => {
          const t = normalize(answer);
          if (/없|딱히/.test(t)) state.prefs.ecosystem = "none";
          else if (/애플|맥|아이패드|워치|에어팟|아이폰/.test(t)) state.prefs.ecosystem = "apple";
          else if (/삼성|갤럭시|버즈|탭/.test(t)) state.prefs.ecosystem = "samsung";
          else state.prefs.ecosystem = "none";
          return "좋아, 기기 연동도 고려해볼게.";
        },
      });
    }
    return list;
  },
  criteria: ({ prefs }) => {
    const names = criteriaFromPrefs(prefs).filter((n) => n !== "가격");
    const list: LLMCriterionDraft[] = names.map((name, i) => ({ name, weight: weightByOrder(i, names.length) }));
    if (prefs.budget === "tight") list.push({ name: "가격", weight: 5, description: "예산이 빠듯해요" });
    else if (prefs.budget === "mid" || criteriaFromPrefs(prefs).includes("가격")) list.push({ name: "가격", weight: 3 });
    return list;
  },
  score: (choice, criterion, { prefs }) => {
    const item = PHONE_KB[choice];
    if (!item) return undefined;
    if (criterion === "생태계") {
      if (prefs.ecosystem === "apple") return choice === "아이폰" ? 5 : 2;
      if (prefs.ecosystem === "samsung") return choice === "갤럭시" ? 5 : choice === "아이폰" ? 2 : 3;
      return 3;
    }
    return item.attrs[criterion];
  },
  describe: (name) => describeFrom(PHONE_KB, name),
  transition: () => "좋아, 네가 폰에서 뭘 중요하게 보는지 알겠어!\n스펙을 차근차근 비교해볼게! 🔮",
};

// ─────────────────────────────────────────────────────────────
// 살까 말까
// ─────────────────────────────────────────────────────────────

export const BUY_CHOICES = ["구매하기", "보류하기"] as const;
export const BUY_PATTERN = /살까\s*말까|살지\s*말지|사야\s*(?:할까|하나|되나)|사도\s*될까|지를까|질러\s*말아|질러야|구매할까|구매\s*고민|살까/;

export function extractBuyItem(text: string): string {
  const m = normalize(text).match(/^(.*?)\s*(?:살까|살지|사야|사도|지를까|질러|구매)/);
  const raw = (m?.[1] ?? "").replace(/(?:을|를|이|가)$/, "").replace(/^(?:나|요즘|오늘|지금)\s+/, "").trim();
  if (!raw || /^(?:이거|이것|그거|저거|이 물건|물건|뭔가)$/.test(raw) || raw.length > 20) return "이 물건";
  return raw;
}

const buy: ScenarioDefinition = {
  key: "buy",
  category: "shopping",
  emoji: "🛍️",
  topic: ({ prefs }) => `${prefs.item ?? "물건"} 구매`,
  intro: ({ prefs }) =>
    `${josa(String(prefs.item ?? "이 물건"), "을/를")} 살까 말까 고민 중이구나! 🛍️\n갖고 싶은 마음이랑 아까운 마음이 싸우는 중이지?\n\n몇 가지만 물어볼게.`,
  questions: () => [
    {
      id: "price",
      text: () => "먼저 가격은 어느 정도야? 대략이면 돼!",
      options: () => ["5만원 이하", "5~30만원", "30~100만원", "100만원 이상"],
      parse: (answer, state) => {
        const t = normalize(answer);
        const amount = parseAmountManwon(t);
        let level: string;
        if (amount !== undefined) {
          level = amount <= 5 ? "low" : amount <= 30 ? "mid" : amount < 100 || (amount === 100 && !/이상|넘/.test(t)) ? "high" : "veryhigh";
        } else if (/엄청\s*비싸|너무\s*비싸/.test(t)) level = "veryhigh";
        else if (/비싸/.test(t)) level = "high";
        else if (/저렴|싸/.test(t)) level = "low";
        else level = "unknown";
        state.prefs.price = level;
        return {
          low: "부담이 크지 않은 가격이네!",
          mid: "적당히 고민되는 가격대구나.",
          high: "꽤 큰 금액이구나, 신중해질 만해.",
          veryhigh: "와, 큰 결심이 필요한 금액이네!",
          unknown: "알겠어, 가격은 대략적으로 생각해볼게.",
        }[level] as string;
      },
    },
    {
      id: "frequency",
      text: () => "산다면 얼마나 자주 쓸 것 같아?",
      options: () => ["거의 매일", "일주일에 몇 번", "한 달에 몇 번", "가끔 생각날 때"],
      parse: (answer, state) => {
        const t = normalize(answer);
        let level: string;
        if (/안\s*쓸|안\s*쓰|가끔|거의\s*안|별로|드물|생각날|잘\s*안/.test(t)) level = "rare";
        else if (/한\s*달|달에|월에|월\s*\d/.test(t)) level = "low";
        else if (/일주일|주에|주\s*\d|주말/.test(t)) level = "mid";
        else if (/매일|날마다|항상|맨날|자주|출퇴근|하루/.test(t)) level = "high";
        else level = "unknown";
        state.prefs.frequency = level;
        return {
          high: "매일 쓴다면 활용도가 높겠다!",
          mid: "꾸준히 쓰게 되겠네.",
          low: "생각보다 자주 쓰진 않겠구나.",
          rare: "가끔 쓰는 물건이구나.",
          unknown: "알겠어, 사용 빈도는 보통으로 생각할게.",
        }[level] as string;
      },
    },
    {
      id: "alternative",
      text: () => "지금 비슷한 역할을 해주는 물건이 있어?",
      options: () => ["없어", "비슷한 게 있어", "있긴 한데 불편해"],
      parse: (answer, state) => {
        const t = normalize(answer);
        let level: string;
        if (/불편|낡|오래됐|고장|느려|아쉬|망가/.test(t)) level = "partial";
        else if (/없/.test(t)) level = "none";
        else if (/있/.test(t)) level = "have";
        else level = "unknown";
        state.prefs.alternative = level;
        return {
          none: "대신할 게 없구나.",
          have: "이미 비슷한 게 있구나.",
          partial: "있긴 한데 아쉬운 상태구나.",
          unknown: "알겠어.",
        }[level] as string;
      },
    },
    {
      id: "regret",
      text: () => "마지막으로 솔직하게! 안 사면 계속 생각날 것 같아, 아니면 사고 나서 후회할 것 같아?",
      options: () => ["안 사면 계속 생각날 듯", "사고 나서 후회할 수도", "잘 모르겠어"],
      parse: (answer, state) => {
        const t = normalize(answer);
        let level: string;
        if (/모르|글쎄|반반|애매/.test(t)) level = "unsure";
        else if (/안\s*사면|생각날|아른|눈에\s*밟|계속|갖고\s*싶/.test(t)) level = "notBuyRegret";
        else if (/사고\s*나서|샀다가|사면\s*후회|돈\s*아까|후회/.test(t)) level = "buyRegret";
        else level = "unsure";
        state.prefs.regret = level;
        return "솔직하게 말해줘서 고마워!";
      },
    },
  ],
  criteria: ({ prefs }) => [
    { name: "사용 빈도", weight: 5, description: "산 뒤에 얼마나 자주 쓸지" },
    { name: "가격 부담", weight: prefs.price === "veryhigh" ? 5 : 4, description: "지금 지출이 부담되는 정도" },
    { name: "대체재 여부", weight: 3, description: "비슷한 역할을 하는 물건이 있는지" },
    { name: "후회 가능성", weight: 4, description: "어느 쪽이 덜 후회할지" },
  ],
  score: (choice, criterion, { prefs }) => {
    const table: Record<string, Record<string, [number, number]>> = {
      "사용 빈도": { high: [5, 1], mid: [4, 2], low: [2, 4], rare: [1, 5] },
      "가격 부담": { low: [5, 3], mid: [4, 3], high: [2, 4], veryhigh: [1, 5] },
      "대체재 여부": { none: [5, 2], partial: [4, 3], have: [2, 5] },
      "후회 가능성": { notBuyRegret: [5, 2], buyRegret: [2, 5], unsure: [3, 3] },
    };
    const key = { "사용 빈도": "frequency", "가격 부담": "price", "대체재 여부": "alternative", "후회 가능성": "regret" }[criterion];
    if (!key) return undefined;
    const pair = table[criterion][String(prefs[key])] ?? [3, 3];
    return choice === BUY_CHOICES[0] ? pair[0] : pair[1];
  },
  describe: (name) =>
    name === BUY_CHOICES[0]
      ? { name, description: "지금 구매한다", pros: ["바로 쓰면서 만족감을 얻을 수 있어요"], cons: ["지출이 생겨요"] }
      : { name, description: "조금 더 두고 본다", pros: ["돈을 아끼고 더 신중하게 고를 수 있어요"], cons: ["계속 신경 쓰일 수 있어요"] },
  transition: () => "좋아, 네 마음이 어느 쪽으로 기울어 있는지 조금 보여!\n구매하기와 보류하기를 비교해볼게! 🔮",
};

// ─────────────────────────────────────────────────────────────
// 일반 (지식 베이스에 없는 선택지)
// ─────────────────────────────────────────────────────────────

export const CATEGORY_CRITERIA_OPTIONS: Record<string, string[]> = {
  travel: ["맛집", "관광", "휴식", "가성비", "이동 편의성"],
  food: ["맛", "가격", "양", "건강", "속도"],
  shopping: ["가격", "품질", "디자인", "사용 빈도", "브랜드"],
  career: ["연봉", "성장 가능성", "워라밸", "안정성", "분위기"],
  money: ["필요성", "금액 부담", "만족도", "장기 가치"],
  daily: ["만족도", "비용", "시간", "편의성", "기분"],
  custom: ["만족도", "비용", "시간", "편의성", "기분"],
  /** 친구 · 연인 · 가족 · 동료 등 사람 사이의 고민 */
  relationship: ["관계", "공정함", "금전 부담", "마음 편함", "상대방 입장"],
};

export const RELATIONSHIP_PATTERN =
  /친구|연인|애인|남친|여친|남자\s*친구|여자\s*친구|가족|부모|엄마|아빠|형|누나|언니|오빠|동생|동료|선배|후배|상사|팀장|지인|룸메/;

const GENERIC_CRITERIA_DICT: Record<string, RegExp> = {
  관계: /관계|사이|우정|서운|눈치|기분\s*상|멀어|사이가/,
  공정함: /공정|공평|반반|형평|번갈아|차례|계산/,
  "금전 부담": /부담|금전|돈|지출|용돈/,
  "마음 편함": /마음\s*편|편하게|찝찝|신경\s*쓰|불편|스트레스/,
  "상대방 입장": /상대|입장|배려|성의|존중/,
  가격: /가격|비용|저렴|싸|예산|금액/,
  품질: /품질|퀄리티|질/,
  디자인: /디자인|예쁜|외관|이쁜/,
  편의성: /편의|간편|접근성|거리|가까/,
  시간: /시간|빠른|빨리|오래\s*걸/,
  맛: /맛/,
  건강: /건강|칼로리|다이어트/,
  연봉: /연봉|급여|월급|보상/,
  "성장 가능성": /성장|커리어|배울|경험|미래/,
  워라밸: /워라밸|야근|칼퇴|여유|휴가/,
  안정성: /안정|안전|오래\s*다닐|정규직/,
  분위기: /분위기|사람|동료|문화|환경/,
  만족도: /만족|행복|좋아하는|재미|즐거/,
  기분: /기분|느낌/,
};

function situationBullets(prefs: Prefs): string {
  const raw = prefs.situation;
  if (typeof raw !== "string" || !raw) return "";
  return `상황을 정리해보면 이렇구나:\n${raw
    .split("|")
    .map((line) => `• ${line}`)
    .join("\n")}\n\n`;
}

const generic: ScenarioDefinition = {
  key: "generic",
  category: "custom",
  emoji: "✨",
  topic: ({ choices }) => choices.join(" vs "),
  intro: ({ choices, prefs }) =>
    prefs.yesNo
      ? `이야기해줘서 고마워. 🐾\n${situationBullets(prefs)}그러니까 '${choices[0]}'${josa(choices[0], "과/와").slice(choices[0].length)} '${choices[1]}' 중에서 고민 중인 거지?`
      : `${situationBullets(prefs)}${choicePhrase(choices)} 사이에서 고민 중이구나! ✨\n둘 다 이유가 있어서 고민되는 거겠지?`,
  questions: ({ prefs, choices }) => {
    const criteriaQuestion: ScenarioQuestion = {
      id: "criteria",
      text: () => "비교할 때 어떤 기준이 제일 중요해? 중요한 순서대로 여러 개 말해줘도 좋아.",
      options: (state) =>
        CATEGORY_CRITERIA_OPTIONS[String(state.prefs.criteriaPreset ?? state.prefs.category ?? "custom")] ?? CATEGORY_CRITERIA_OPTIONS.custom,
      parse: (answer, state) => {
        let names = extractKeywords(answer, GENERIC_CRITERIA_DICT);
        if (!names.length) names = isUnknownAnswer(answer) ? ["만족도", "비용"] : extractFreeCriteria(answer);
        if (!names.length) names = ["만족도"];
        state.prefs.criteria = names.slice(0, 4).join("|");
        return `좋아, ${names.slice(0, 4).join(", ")} 기준으로 살펴볼게!\n그럼 기준별로 하나씩 물어볼게.`;
      },
    };
    const ratingQuestions = criteriaFromPrefs(prefs).map<ScenarioQuestion>((name) => ({
      id: `rate:${name}`,
      text: () => `${name} 면에서는 어느 쪽이 더 나아 보여?`,
      options: () => [...choices, "비슷해"],
      parse: (answer, state) => {
        const t = normalize(answer).replace(/\s+/g, "");
        const winner = state.choices.find((c) => t.includes(normalize(c).replace(/\s+/g, "")));
        state.prefs[`rate:${name}`] = winner && !/비슷|같|몰라|모르|상관/.test(t) ? winner : "same";
        return winner ? `알겠어, ${josa(name, "은/는")} ${winner} 쪽이구나.` : "알겠어, 비슷하다고 볼게.";
      },
    }));
    return [criteriaQuestion, ...ratingQuestions];
  },
  criteria: ({ prefs }) => {
    const names = criteriaFromPrefs(prefs);
    return names.map((name, i) => ({ name, weight: weightByOrder(i, names.length) }));
  },
  score: (choice, criterion, { prefs }) => {
    const rated = prefs[`rate:${criterion}`];
    if (rated === undefined || rated === "same") return 3;
    return rated === choice ? 4 : 2;
  },
  describe: (name) => ({ name, pros: [], cons: [] }),
  transition: ({ choices }) => `좋아, 필요한 건 다 들었어!\n${choices.length === 2 ? "두 선택지를" : "선택지들을"} 차근차근 비교해볼게! 🔮`,
};

export const SCENARIOS: Record<ScenarioDefinition["key"], ScenarioDefinition> = {
  travel,
  food: food_,
  phone,
  buy,
  generic,
};

