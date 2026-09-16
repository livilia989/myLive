import { CheckCircle2, CircleDashed, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import IconButton from "@/components/common/IconButton";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import { useToast } from "@/components/common/useToast";
import AppShell from "@/components/layout/AppShell";
import { categoryLabel } from "@/features/decision/prompts";
import { useDecisionStore } from "@/features/decision/store";
import type { DecisionSession } from "@/features/decision/types";
import { formatRelative } from "@/lib/date";

const HistoryPage = () => {
  // logic
  const navigate = useNavigate();
  const sessions = useDecisionStore((s) => s.sessions);
  const deleteSession = useDecisionStore((s) => s.deleteSession);
  const [target, setTarget] = useState<DecisionSession | null>(null);
  const toast = useToast();

  const handleDelete = async () => {
    if (!target) return;
    await deleteSession(target.id);
    setTarget(null);
    toast.show("기록을 삭제했어요.");
  };

  // view
  return (
    <AppShell nav>
      <header className="px-5 pb-2 pt-6">
        <h1 className="text-2xl font-extrabold text-ink">고민 기록</h1>
        <p className="mt-1 text-sm text-muted-strong">이 브라우저에 저장된 고민이에요.</p>
      </header>

      {sessions.length === 0 ? (
        <EmptyState
          title="아직 기록이 없어요"
          description={"코기가 기다리다 잠들었어요… 💤\n첫 고민을 들려줄래?"}
          action={
            <Button size="lg" onClick={() => navigate("/decision/new")}>
              고민 이야기하기
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3 px-4 py-3">
          {sessions.map((session) => (
            <li key={session.id} className="card flex items-center gap-2 py-1 pl-4 pr-1">
              <Link to={`/decision/${session.id}`} className="min-w-0 flex-1 rounded-2xl py-3">
                <p className="truncate text-base font-bold text-ink">{session.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-strong">
                  <span>{categoryLabel(session.category ?? session.context.category)}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={session.updatedAt}>{formatRelative(session.updatedAt)}</time>
                </p>
                <p className="mt-2">
                  {session.result ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-lavender px-2.5 py-1 text-xs font-bold text-purple">
                      <CheckCircle2 aria-hidden size={13} />
                      {session.stage === "completed" ? "결과 저장됨" : "결과 있음"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-muted-strong ring-1 ring-lavender">
                      <CircleDashed aria-hidden size={13} />
                      대화 진행 중
                    </span>
                  )}
                </p>
              </Link>
              {session.result && (
                <Link
                  to={`/decision/${session.id}/result`}
                  className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-purple hover:bg-lavender/60"
                  aria-label={`${session.title} 결과 보기`}
                >
                  결과
                </Link>
              )}
              <IconButton label={`${session.title} 삭제`} tone="danger" icon={<Trash2 size={18} />} onClick={() => setTarget(session)} />
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(target)} title="이 기록을 삭제할까요?" description={`"${target?.title ?? ""}" 기록이 삭제되고 되돌릴 수 없어요.`} onClose={() => setTarget(null)}>
        <Button variant="ghost" fullWidth onClick={() => setTarget(null)}>
          취소
        </Button>
        <Button variant="danger" fullWidth onClick={() => void handleDelete()}>
          삭제
        </Button>
      </Modal>
      <Toast message={toast.message} />
    </AppShell>
  );
};

export default HistoryPage;
