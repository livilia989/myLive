import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import ChatLayout from "@/components/chat/ChatLayout";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import AppShell from "@/components/layout/AppShell";
import { QUICK_EXAMPLES, getCategory } from "@/features/decision/prompts";
import { useDecisionStore } from "@/features/decision/store";
import type { ChatMessage } from "@/features/decision/types";

const NewDecisionPage = () => {
  // logic
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const category = getCategory(params.get("category") ?? undefined);
  const startNewDecision = useDecisionStore((s) => s.startNewDecision);
  const [starting, setStarting] = useState(false);
  const [createdAt] = useState(() => new Date().toISOString());

  const greeting: ChatMessage = {
    id: "greeting",
    role: "assistant",
    type: "text",
    content: category?.greeting ?? "좋아, 오늘 어떤 고민이 있어?",
    createdAt,
  };
  const examples = category && category.id !== "custom" ? category.examples : QUICK_EXAMPLES;

  const start = async (text: string) => {
    if (starting) return;
    setStarting(true);
    const id = await startNewDecision(text, category && category.id !== "custom" ? category.id : undefined);
    navigate(`/decision/${id}`, { replace: true });
  };

  // view
  return (
    <AppShell fullHeight>
      <ChatLayout
        header={<ChatHeader status="고민을 듣는 중" characterState="listening" backTo="/" />}
        footer={<ChatInput onSubmit={start} disabled={starting} autoFocus placeholder="예: 후쿠오카와 오사카 중 고민이야" />}
      >
        <div role="log" aria-live="polite" aria-label="대화 내용" className="pt-4">
          <ChatMessageBubble message={greeting} showAvatar avatarState="idle" />
          {!starting && (
            <div role="group" aria-label="빠른 예시" className="mt-3 flex flex-wrap gap-2 pl-11">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => start(example)}
                  className="rounded-full border border-purple/40 bg-white px-3.5 py-2 text-sm font-medium text-purple transition hover:bg-lavender/60"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
          {starting && <TypingIndicator state="listening" label="고민을 듣는 중" />}
        </div>
      </ChatLayout>
    </AppShell>
  );
};

export default NewDecisionPage;
