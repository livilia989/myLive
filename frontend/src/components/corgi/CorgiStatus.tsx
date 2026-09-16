import type { CorgiState } from "@/features/decision/types";

const DOT_LABEL: Record<CorgiState, string> = {
  idle: "대기",
  listening: "듣는 중",
  thinking: "생각 중",
  analysis: "분석 중",
  happy: "완료",
  surprised: "놀람",
  sleeping: "쉬는 중",
  error: "오류",
};

/** 헤더의 상태 문구. 색상만으로 상태를 전달하지 않도록 텍스트를 함께 표시한다. */
const CorgiStatus = ({ state, text }: { state: CorgiState; text: string }) => {
  const busy = state === "thinking" || state === "analysis" || state === "listening";
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-strong" aria-live="polite">
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${state === "error" ? "bg-red-500" : busy ? "twinkle bg-purple" : "bg-emerald-500"}`}
      />
      <span className="sr-only">{DOT_LABEL[state]}: </span>
      {text}
    </p>
  );
};

export default CorgiStatus;
