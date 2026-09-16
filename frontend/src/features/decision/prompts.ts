// 화면에 표시하는 문구 모음

export interface CategoryItem {
  id: string;
  emoji: string;
  label: string;
  greeting: string;
  examples: string[];
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: "food",
    emoji: "🍽️",
    label: "메뉴 고르기",
    greeting: "좋아, 메뉴 고민이구나! 🍽️\n어떤 메뉴들 사이에서 고민 중이야?",
    examples: ["짜장면이랑 짬뽕 중 고민이야", "김치찌개랑 돈가스 중 뭐 먹지", "점심 메뉴를 골라줘"],
  },
  {
    id: "travel",
    emoji: "✈️",
    label: "여행지 선택",
    greeting: "좋아, 여행지 고민이구나! ✈️\n어떤 곳들을 비교하고 있어?",
    examples: ["후쿠오카와 오사카 중 어디로 여행 갈지 고민이야", "제주랑 부산 중 고민이야", "여행지를 비교하고 싶어"],
  },
  {
    id: "shopping",
    emoji: "🛍️",
    label: "물건 구매",
    greeting: "좋아, 쇼핑 고민이구나! 🛍️\n뭘 사려고 고민 중이야?",
    examples: ["아이폰이랑 갤럭시 중 고민이야", "무선 이어폰 살까 말까 고민이야"],
  },
  {
    id: "career",
    emoji: "💼",
    label: "업무·커리어",
    greeting: "업무·커리어 고민이구나. 💼\n어떤 선택지들 사이에서 고민 중이야?",
    examples: ["지금 회사랑 이직 중 고민이야", "대학원이랑 취업 중 고민이야"],
  },
  {
    id: "money",
    emoji: "💰",
    label: "소비·예산",
    greeting: "소비·예산 고민이구나! 💰\n어떤 선택지를 비교하고 싶어?",
    examples: ["운동화 살까 말까 고민이야", "헬스장이랑 수영장 중 고민이야"],
  },
  {
    id: "daily",
    emoji: "💕",
    label: "일상 고민",
    greeting: "일상 고민이구나! 💕\n편하게 이야기해줘.",
    examples: ["영화 보기랑 집에서 쉬기 중 고민이야", "헬스장이랑 수영장 중 고민이야"],
  },
  {
    id: "custom",
    emoji: "✨",
    label: "직접 입력",
    greeting: "좋아, 오늘 어떤 고민이 있어?",
    examples: ["점심 메뉴를 골라줘", "여행지를 비교하고 싶어", "살까 말까 고민이야", "A와 B 중 고민이야"],
  },
];

export const QUICK_EXAMPLES = ["점심 메뉴를 골라줘", "여행지를 비교하고 싶어", "살까 말까 고민이야", "A와 B 중 고민이야"];

export const SAMPLE_DECISIONS = [
  "후쿠오카와 오사카 중 어디로 여행 갈지 고민이야",
  "짜장면이랑 짬뽕 중 고민이야",
  "아이폰이랑 갤럭시 중 고민이야",
  "이거 살까 말까 고민이야",
];

export function getCategory(id?: string): CategoryItem | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function categoryLabel(id?: string): string {
  const category = getCategory(id);
  return category ? `${category.emoji} ${category.label}` : "✨ 기타 고민";
}

export const CHECK_BEFORE_DECIDING: Record<string, string[]> = {
  food: ["지금 배고픈 정도와 먹을 수 있는 시간", "같이 먹는 사람의 취향", "가게 영업시간과 대기 시간"],
  travel: ["항공권 · 숙소 가격이 예산 안에 드는지", "여행 기간의 날씨와 현지 행사", "동행자와 여행 스타일이 맞는지"],
  shopping: ["최근 할인 · 프로모션 여부", "실제 사용 후기와 A/S 조건", "환불 · 교환 가능 기간"],
  career: ["조건을 문서로 확인했는지", "믿을 수 있는 사람의 조언", "1년 뒤의 나에게 어떤 선택이 더 좋을지"],
  money: ["이번 달 고정 지출을 뺀 여유 금액", "비슷한 대안이 있는지", "하루 정도 미뤄도 마음이 같은지"],
  daily: ["지금 컨디션과 기분", "함께하는 사람의 상황", "내일 일정에 무리가 없는지"],
  custom: ["내가 가장 중요하게 생각하는 기준이 맞는지", "빠진 선택지는 없는지", "하루 뒤에도 같은 결정을 할지"],
};

export const CONFIDENCE_LABEL = {
  low: { label: "낮음", dots: "●○○", description: "점수 차이가 작아요. 어느 쪽도 괜찮아요." },
  medium: { label: "보통", dots: "●●○", description: "한쪽이 조금 더 잘 맞아 보여요." },
  high: { label: "높음", dots: "●●●", description: "지금 기준에서는 차이가 뚜렷해요." },
} as const;

export const CORGI_CLOSING = {
  low: "어느 쪽을 골라도 네 선택이라면 좋은 선택이 될 거야! 🐾",
  medium: "마지막엔 네 마음이 더 끌리는 쪽을 골라도 괜찮아. 🐾",
  high: "기준을 보면 답이 꽤 보이지만, 결정은 언제나 네 몫이야! 🐾",
} as const;
