import { ChevronLeft, ClipboardCheck, Lightbulb, MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import Toast from "@/components/common/Toast";
import { useToast } from "@/components/common/useToast";
import CorgiCharacter from "@/components/corgi/CorgiCharacter";
import ChoiceComparisonCard from "@/components/decision/ChoiceComparisonCard";
import ChoiceComparisonChart from "@/components/decision/ChoiceComparisonChart";
import DecisionContextSummary from "@/components/decision/DecisionContextSummary";
import DecisionResultCard from "@/components/decision/DecisionResultCard";
import ReasonList from "@/components/decision/ReasonList";
import ResultActions from "@/components/decision/ResultActions";
import TradeoffCard from "@/components/decision/TradeoffCard";
import AppShell from "@/components/layout/AppShell";
import { CHECK_BEFORE_DECIDING, CORGI_CLOSING } from "@/features/decision/prompts";
import { useDecisionStore } from "@/features/decision/store";
import { choiceName, isHighRisk, resultShareText } from "@/features/decision/utils";

const DecisionResultPage = () => {
  // logic
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { currentSession: session, isLoading, characterState, loadSession, reanalyze, editChoices, saveSession, sendFeedback } =
    useDecisionStore();
  const toast = useToast();
  const [feedback, setFeedback] = useState<boolean | null>(null);

  useEffect(() => {
    loadSession(id);
  }, [id, loadSession]);

  if (!session || session.id !== id || !session.result) {
    return (
      <AppShell>
        <EmptyState
          title="아직 결과가 없어요"
          description="코기와 조금 더 이야기하면 결과를 볼 수 있어요."
          state="thinking"
          action={
            <Button onClick={() => navigate(session?.id === id ? `/decision/${id}` : "/")} size="lg">
              {session?.id === id ? "대화로 돌아가기" : "홈으로"}
            </Button>
          }
        />
      </AppShell>
    );
  }

  const result = session.result;
  const highRisk = isHighRisk(session);
  const top = result.choiceResults.find((r) => r.choiceId === result.recommendedChoiceId) ?? result.choiceResults[0];
  const category = session.category ?? session.context.category ?? "custom";
  const checklist = [...(CHECK_BEFORE_DECIDING[category] ?? CHECK_BEFORE_DECIDING.custom)];
  if (highRisk) checklist.unshift("관련 분야 전문가의 상담 또는 공식 자료");
  const saved = session.stage === "completed";

  const handleSave = async () => {
    await saveSession();
    toast.show("기록에 저장했어요! 📌");
  };

  const handleReanalyze = async (weights?: Record<string, number>) => {
    await reanalyze(weights);
    toast.show("수정구슬을 다시 들여다봤어요 🔮");
  };

  const handleEditChoices = async () => {
    await editChoices();
    navigate(`/decision/${id}`);
  };

  const handleShare = async () => {
    const text = resultShareText(session);
    try {
      if (navigator.share) {
        await navigator.share({ title: "선택점쟁이 결과", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.show("결과를 클립보드에 복사했어요 📋");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.show("공유하지 못했어요. 다시 시도해 주세요.");
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    setFeedback(helpful);
    await sendFeedback(helpful);
    toast.show("의견 고마워! 🐾");
  };

  // view
  return (
    <AppShell wide>
      {/* START: 헤더 */}
      <header className="flex items-center justify-between px-3 pt-3">
        <Link
          to={`/decision/${id}`}
          className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-lavender/60"
        >
          <ChevronLeft aria-hidden size={20} /> 대화로 돌아가기
        </Link>
      </header>
      {/* END: 헤더 */}

      <div className="mx-auto flex w-full flex-col gap-5 px-4 pb-10 sm:px-8">
        {/* START: 타이틀 */}
        <section className="flex flex-col items-center pt-2 text-center">
          <CorgiCharacter state={isLoading ? "analysis" : highRisk ? "thinking" : characterState === "error" ? "surprised" : "happy"} size={140} />
          <p className="mt-3 text-sm font-semibold text-muted-strong">{session.title}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-purple sm:text-3xl">{highRisk ? "🧭 선택 기준 정리" : "✨ 오늘의 선택 운세"}</h1>
        </section>
        {/* END: 타이틀 */}

        <DecisionResultCard result={result} recommendedName={choiceName(session, result.recommendedChoiceId)} score={top.score} highRisk={highRisk} />

        <ChoiceComparisonChart session={session} />

        <section aria-labelledby="compare-title">
          <h2 id="compare-title" className="mb-3 px-1 text-lg font-bold text-ink">
            선택지 비교
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {result.choiceResults.map((choiceResult) => (
              <ChoiceComparisonCard key={choiceResult.choiceId} session={session} result={choiceResult} />
            ))}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <ReasonList title="추천한 이유" icon={<Lightbulb size={20} className="text-gold" />} items={result.keyReasons} />
          <TradeoffCard tradeoffs={result.tradeoffs} alternativeScenario={result.alternativeScenario} />
          <ReasonList title="결정 전에 확인하면 좋은 것" icon={<ClipboardCheck size={20} className="text-purple" />} items={checklist} />
          <DecisionContextSummary
            key={session.context.criteria.map((c) => `${c.id}:${c.weight}`).join("|")}
            context={session.context}
            isLoading={isLoading}
            onReanalyze={(weights) => void handleReanalyze(weights)}
          />
        </div>

        {/* START: 코기의 한마디 */}
        <section className="card flex items-center gap-4 px-5 py-4">
          <CorgiCharacter state="happy" size={64} sparkles={false} alt="" />
          <div>
            <h2 className="flex items-center gap-1 text-sm font-bold text-purple">
              <MessageCircle aria-hidden size={16} /> 코기의 한마디
            </h2>
            <p className="mt-1 text-[15px] leading-relaxed text-ink">{CORGI_CLOSING[result.confidence]}</p>
          </div>
        </section>
        {/* END: 코기의 한마디 */}

        <ResultActions
          saved={saved}
          isLoading={isLoading}
          onSave={() => void handleSave()}
          onReanalyze={() => void handleReanalyze()}
          onEditChoices={() => void handleEditChoices()}
          onNew={() => navigate("/decision/new")}
          onShare={() => void handleShare()}
        />

        {/* START: 피드백 */}
        <section aria-labelledby="feedback-title" className="flex flex-col items-center gap-2 pt-2">
          <h2 id="feedback-title" className="text-sm font-semibold text-muted-strong">
            이 분석이 도움이 됐어?
          </h2>
          <div className="flex gap-2">
            <Button variant={feedback === true ? "primary" : "ghost"} size="sm" icon={<ThumbsUp size={16} />} aria-pressed={feedback === true} onClick={() => void handleFeedback(true)}>
              도움됐어
            </Button>
            <Button variant={feedback === false ? "primary" : "ghost"} size="sm" icon={<ThumbsDown size={16} />} aria-pressed={feedback === false} onClick={() => void handleFeedback(false)}>
              아쉬워
            </Button>
          </div>
        </section>
        {/* END: 피드백 */}

        <p className="text-center text-sm text-muted-strong">🔮 운세는 재미로, 선택은 나답게.</p>
      </div>
      <Toast message={toast.message} />
    </AppShell>
  );
};

export default DecisionResultPage;
