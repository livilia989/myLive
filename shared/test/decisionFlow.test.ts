import { describe, expect, it } from "vitest";
import {
  DecisionSessionSchema,
  MockLLMProvider,
  createDecisionSession,
  processUserMessage,
  reanalyzeSession,
  startChoiceEdit,
  type DecisionSession,
} from "../src";

const provider = new MockLLMProvider();

async function talk(messages: string[], session: DecisionSession = createDecisionSession()): Promise<DecisionSession> {
  let current = session;
  for (const message of messages) {
    current = await processUserMessage(current, message, provider);
    expect(DecisionSessionSchema.safeParse(current).success).toBe(true);
  }
  return current;
}

const lastAssistant = (s: DecisionSession) => [...s.messages].reverse().find((m) => m.role === "assistant")!;
const recommendedName = (s: DecisionSession) => s.context.choices.find((c) => c.id === s.result?.recommendedChoiceId)?.name;

describe("여행 시나리오", () => {
  it("여행 기간 → 기준 → 분석 → 후쿠오카 추천", async () => {
    let s = await talk(["후쿠오카와 오사카 중 어디로 여행 갈지 고민이야"]);
    expect(s.context.choices.map((c) => c.name)).toEqual(["후쿠오카", "오사카"]);
    expect(s.stage).toBe("asking_questions");
    expect(lastAssistant(s).content).toContain("며칠");

    s = await talk(["2박 3일"], s);
    expect(s.stage).toBe("collecting_criteria");
    expect(lastAssistant(s).content).toContain("짧은 일정");

    s = await talk(["맛집과 이동 편의성이 중요해"], s);
    expect(s.stage).toBe("presenting_result");
    expect(s.context.criteria.map((c) => c.name)).toEqual(["맛집", "이동 편의성", "일정 적합도"]);
    expect(recommendedName(s)).toBe("후쿠오카");
    expect(s.result?.choiceResults).toHaveLength(2);
    expect(lastAssistant(s).type).toBe("result");
    expect(s.result?.fortuneMessage).not.toMatch(/무조건|반드시|100%/);
  });
});

describe("음식 시나리오", () => {
  it("매운맛 · 국물 선호 → 짬뽕", async () => {
    let s = await talk(["짜장면이랑 짬뽕 중 고민이야"]);
    expect(s.context.choices.map((c) => c.name)).toEqual(["짜장면", "짬뽕"]);
    expect(lastAssistant(s).content).toContain("맵고");
    s = await talk(["매운 거 좋아!", "국물 좋아"], s);
    expect(s.stage).toBe("presenting_result");
    expect(recommendedName(s)).toBe("짬뽕");
  });

  it("순한 맛 · 국물 없는 쪽 → 짜장면", async () => {
    const s = await talk(["짜장면 짬뽕 뭐 먹지", "순한 게 좋아", "국물 없는 게 좋아"]);
    expect(recommendedName(s)).toBe("짜장면");
  });
});

describe("스마트폰 시나리오", () => {
  it("예산 → 기준 → 생태계 → 분석", async () => {
    let s = await talk(["아이폰이랑 갤럭시 중 고민이야"]);
    expect(lastAssistant(s).content).toContain("예산");
    s = await talk(["100만원 이하"], s);
    expect(lastAssistant(s).content).toContain("카메라");
    s = await talk(["배터리랑 생태계"], s);
    expect(s.stage).toBe("asking_questions");
    s = await talk(["삼성 기기 있어"], s);
    expect(s.stage).toBe("presenting_result");
    expect(recommendedName(s)).toBe("갤럭시");
  });
});

describe("살까 말까 시나리오", () => {
  it("가격 → 사용 빈도 → 대체재 → 후회 → 분석", async () => {
    let s = await talk(["이거 살까 말까 고민이야"]);
    expect(s.context.choices.map((c) => c.name)).toEqual(["구매하기", "보류하기"]);
    expect(lastAssistant(s).content).toContain("가격");
    s = await talk(["5~30만원"], s);
    expect(lastAssistant(s).content).toContain("자주");
    s = await talk(["거의 매일"], s);
    expect(lastAssistant(s).content).toContain("비슷한");
    s = await talk(["없어"], s);
    expect(lastAssistant(s).content).toContain("후회");
    s = await talk(["안 사면 계속 생각날 듯"], s);
    expect(s.stage).toBe("presenting_result");
    expect(recommendedName(s)).toBe("구매하기");
  });
});

describe("일반 시나리오 · 수정 · 재분석", () => {
  it("선택지가 없으면 먼저 선택지를 묻는다", async () => {
    const s = await talk(["점심 메뉴를 골라줘"]);
    expect(s.stage).toBe("collecting_choices");
    expect(s.context.choices).toHaveLength(0);
  });

  it("지식 베이스에 없는 선택지는 기준별로 물어본다", async () => {
    let s = await talk(["헬스장이랑 수영장 중 고민이야"]);
    expect(s.context.choices.map((c) => c.name)).toEqual(["헬스장", "수영장"]);
    expect(s.stage).toBe("collecting_criteria");
    s = await talk(["가격이랑 시간이 중요해"], s);
    expect(lastAssistant(s).content).toContain("가격");
    s = await talk(["수영장", "헬스장"], s);
    expect(s.stage).toBe("presenting_result");
  });

  it("선택지 수정 후 다시 분석한다", async () => {
    let s = await talk(["후쿠오카와 오사카 중 어디로 여행 갈지 고민이야", "2박 3일", "맛집과 이동 편의성이 중요해"]);
    s = startChoiceEdit(s);
    expect(s.stage).toBe("collecting_choices");
    s = await talk(["도쿄, 오사카"], s);
    expect(s.stage).toBe("presenting_result");
    expect(s.context.choices.map((c) => c.name)).toEqual(["도쿄", "오사카"]);
  });

  it("가중치를 바꿔 재분석한다", async () => {
    const s = await talk(["후쿠오카와 오사카 중 어디로 여행 갈지 고민이야", "2박 3일", "맛집과 이동 편의성이 중요해"]);
    const weights = Object.fromEntries(s.context.criteria.map((c) => [c.id, c.name === "맛집" ? 5 : 1]));
    const r = reanalyzeSession(s, weights);
    expect(recommendedName(r)).toBe("오사카");
  });

  it("고위험 주제는 안내 문구를 보여준다", async () => {
    const s = await talk(["주식이랑 적금 중 고민이야"]);
    expect(s.messages.some((m) => m.content.includes("전문가"))).toBe(true);
  });
});
