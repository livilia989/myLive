import { Bot, Info, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import { useToast } from "@/components/common/useToast";
import { hasCustomCorgiImages } from "@/components/corgi/corgiAssets";
import AppShell from "@/components/layout/AppShell";
import type { HealthStatus } from "@/features/decision/api";
import { decisionService } from "@/features/decision/service";
import { useDecisionStore } from "@/features/decision/store";
import { useSettingsStore, type Settings } from "@/features/settings/store";

const RadioOption = ({ value, title, description, ...rest }: { value: string; title: string; description: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="flex cursor-pointer gap-3 rounded-2xl border border-lavender bg-white px-4 py-3 has-[:checked]:border-purple has-[:checked]:bg-lavender/40">
    <input type="radio" value={value} className="mt-1 accent-[var(--purple)]" {...rest} />
    <span>
      <span className="block text-sm font-bold text-ink">{title}</span>
      <span className="block text-xs leading-relaxed text-muted-strong">{description}</span>
    </span>
  </label>
);

const SettingsPage = () => {
  // logic
  const { llmMode, reduceMotion, update } = useSettingsStore();
  const clearAllSessions = useDecisionStore((s) => s.clearAllSessions);
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const [health, setHealth] = useState<HealthStatus | "error" | null>(null);

  const { register, control } = useForm<Settings>({ defaultValues: { llmMode, reduceMotion } });
  const watched = useWatch({ control });

  useEffect(() => {
    // 라디오 선택이 바뀌면 바로 저장한다
    if (watched.llmMode && watched.reduceMotion) update({ llmMode: watched.llmMode, reduceMotion: watched.reduceMotion });
  }, [watched.llmMode, watched.reduceMotion, update]);

  const fetchHealth = useCallback(
    (): Promise<HealthStatus | "error"> => decisionService.health().catch(() => "error" as const),
    [],
  );

  const checkHealth = async () => {
    setHealth(null);
    setHealth(await fetchHealth());
  };

  useEffect(() => {
    let cancelled = false;
    void fetchHealth().then((status) => {
      if (!cancelled) setHealth(status);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchHealth, llmMode]);

  // view
  return (
    <AppShell nav>
      <header className="px-5 pb-2 pt-6">
        <h1 className="text-2xl font-extrabold text-ink">설정</h1>
      </header>

      <div className="flex flex-col gap-5 px-4 py-3">
        {/* START: LLM 모드 */}
        <section aria-labelledby="llm-title" className="card px-5 py-5">
          <h2 id="llm-title" className="flex items-center gap-2 text-base font-bold text-ink">
            <Bot aria-hidden size={20} className="text-purple" /> 대화 엔진
          </h2>
          <fieldset className="mt-3 flex flex-col gap-2">
            <legend className="sr-only">대화 엔진 선택</legend>
            <RadioOption
              {...register("llmMode")}
              value="server"
              title="서버 연결 (기본)"
              description="backend 서버를 통해 대화해요. 서버 설정에 따라 Mock 또는 로컬 Ollama 같은 무료 LLM 을 사용해요."
            />
            <RadioOption
              {...register("llmMode")}
              value="browser"
              title="브라우저 Mock 모드"
              description="서버 없이 브라우저 안에서 Mock LLM 으로 전체 흐름을 체험해요."
            />
          </fieldset>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-3 text-sm" aria-live="polite">
            <span className="text-ink">
              {health === null && "연결 상태 확인 중…"}
              {health === "error" && "⚠️ 서버에 연결할 수 없어요. backend 실행 여부를 확인하거나 브라우저 Mock 모드를 사용해 주세요."}
              {health && health !== "error" && (
                <>
                  ✅ 연결됨 · <strong>{health.provider}</strong>
                  {health.model ? ` (${health.model})` : ""}
                  {!health.llmReachable && " · LLM 서버 응답 없음"}
                </>
              )}
            </span>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => void checkHealth()}>
              다시 확인
            </Button>
          </div>
        </section>
        {/* END: LLM 모드 */}

        {/* START: 움직임 */}
        <section aria-labelledby="motion-title" className="card px-5 py-5">
          <h2 id="motion-title" className="flex items-center gap-2 text-base font-bold text-ink">
            <Sparkles aria-hidden size={20} className="text-purple" /> 애니메이션
          </h2>
          <fieldset className="mt-3 flex flex-col gap-2">
            <legend className="sr-only">애니메이션 설정</legend>
            <RadioOption {...register("reduceMotion")} value="system" title="기기 설정 따르기" description="운영체제의 '동작 줄이기' 설정을 따라요." />
            <RadioOption {...register("reduceMotion")} value="on" title="움직임 줄이기" description="코기 애니메이션과 화면 전환 효과를 최소화해요." />
            <RadioOption {...register("reduceMotion")} value="off" title="항상 움직이기" description="귀여운 코기 애니메이션을 항상 보여줘요." />
          </fieldset>
        </section>
        {/* END: 움직임 */}

        {/* START: 데이터 */}
        <section aria-labelledby="data-title" className="card px-5 py-5">
          <h2 id="data-title" className="flex items-center gap-2 text-base font-bold text-ink">
            <Trash2 aria-hidden size={20} className="text-purple" /> 데이터
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-strong">
            고민 기록은 이 브라우저(localStorage)에만 저장돼요. 이름·연락처 같은 개인정보는 입력하지 않아도 돼요.
          </p>
          <Button className="mt-3" variant="secondary" fullWidth onClick={() => setConfirmClear(true)}>
            모든 기록 삭제하기
          </Button>
        </section>
        {/* END: 데이터 */}

        {/* START: 정보 */}
        <section aria-labelledby="about-title" className="card px-5 py-5">
          <h2 id="about-title" className="flex items-center gap-2 text-base font-bold text-ink">
            <Info aria-hidden size={20} className="text-purple" /> 선택점쟁이에 대해
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-strong">
            <li>• 운세 표현은 재미를 위한 연출이고, 판단 근거는 내가 고른 기준의 점수 분석이에요.</li>
            <li>• 정치·의료·법률·투자·대출·보험·안전 관련 고민은 꼭 전문가와 상담해 주세요.</li>
            <li>• 캐릭터 이미지: {hasCustomCorgiImages ? "제공된 코기 이미지 사용 중" : "기본 임시 이미지 사용 중"}</li>
          </ul>
        </section>
        {/* END: 정보 */}
      </div>

      <Modal
        open={confirmClear}
        title="모든 기록을 삭제할까요?"
        description="이 브라우저에 저장된 고민과 결과가 모두 삭제되고 되돌릴 수 없어요."
        onClose={() => setConfirmClear(false)}
      >
        <Button variant="ghost" fullWidth onClick={() => setConfirmClear(false)}>
          취소
        </Button>
        <Button
          variant="danger"
          fullWidth
          onClick={() => {
            clearAllSessions();
            setConfirmClear(false);
            toast.show("모든 기록을 삭제했어요.");
          }}
        >
          전체 삭제
        </Button>
      </Modal>
      <Toast message={toast.message} />
    </AppShell>
  );
};

export default SettingsPage;
