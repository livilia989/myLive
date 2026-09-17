import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import ChatLayout from "@/components/chat/ChatLayout";
import ChatMessageList from "@/components/chat/ChatMessageList";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import DecisionProgress from "@/components/decision/DecisionProgress";
import AppShell from "@/components/layout/AppShell";
import { useDecisionStore } from "@/features/decision/store";
import type { QuickReplyOption } from "@/features/decision/types";
import { ACTION_EDIT_CHOICES, ACTION_NEW_DECISION, ACTION_VIEW_RESULT, STAGE_INFO, stageStatus } from "@/features/decision/utils";

const DecisionChatPage = () => {
  // logic
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const {
    currentSession,
    messages,
    stage,
    isLoading,
    isTyping,
    characterState,
    selectedQuickReply,
    loadSession,
    sendMessage,
    retryLastMessage,
    editChoices,
    selectQuickReply,
  } = useDecisionStore();

  useEffect(() => {
    loadSession(id);
  }, [id, loadSession]);

  if (!currentSession || currentSession.id !== id) {
    return (
      <AppShell>
        <EmptyState
          title="고민 기록을 찾을 수 없어요"
          description={"삭제되었거나 다른 브라우저에서 만든 고민이에요.\n새로운 고민을 들려줄래?"}
          action={
            <Button onClick={() => navigate("/decision/new")} size="lg">
              새 고민 시작하기
            </Button>
          }
        />
      </AppShell>
    );
  }

  const status = stageStatus(stage, isTyping);

  const handleQuickReply = (option: QuickReplyOption) => {
    selectQuickReply(option.value);
    if (option.value === ACTION_VIEW_RESULT) navigate(`/decision/${id}/result`);
    else if (option.value === ACTION_EDIT_CHOICES) void editChoices();
    else if (option.value === ACTION_NEW_DECISION) navigate("/decision/new");
    else void sendMessage(option.value);
  };

  // view
  return (
    <AppShell fullHeight>
      <ChatLayout
        header={
          <>
            <ChatHeader status={status} characterState={characterState} backTo="/" />
            <DecisionProgress stage={stage} />
          </>
        }
        footer={
          <>
            {/* 결과를 보여주는 단계일 때만 표시 (선택지를 수정하거나 새 이야기를 하는 중에는 숨김) */}
            {currentSession.result && !isTyping && (stage === "presenting_result" || stage === "completed") && (
              <div className="flex items-center justify-between gap-2 border-t border-gold/50 bg-gold/15 px-4 py-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Sparkles aria-hidden size={16} className="text-purple" /> 결과가 준비됐어요
                </p>
                <Link to={`/decision/${id}/result`} className="rounded-full bg-purple px-4 py-2 text-sm font-bold text-white hover:bg-purple-deep">
                  결과 보기
                </Link>
              </div>
            )}
            <ChatInput onSubmit={(text) => void sendMessage(text)} disabled={isLoading} stageLabel={STAGE_INFO[stage].label} autoFocus />
          </>
        }
      >
        <ChatMessageList
          messages={messages}
          isTyping={isTyping}
          typingLabel={status}
          characterState={characterState}
          disabled={isLoading}
          selectedQuickReply={selectedQuickReply}
          onQuickReply={handleQuickReply}
          onRetry={() => void retryLastMessage()}
        />
      </ChatLayout>
    </AppShell>
  );
};

export default DecisionChatPage;
