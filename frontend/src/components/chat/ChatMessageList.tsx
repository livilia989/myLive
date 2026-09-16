import { Fragment, useEffect, useRef, useState } from "react";
import type { ChatMessage, CorgiState, QuickReplyOption } from "@/features/decision/types";
import { isSameDay } from "@/lib/date";
import ChatMessageBubble from "./ChatMessageBubble";
import DateDivider from "./DateDivider";
import QuickReplyButtons from "./QuickReplyButtons";
import TypingIndicator from "./TypingIndicator";

export interface ChatMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  typingLabel: string;
  characterState: CorgiState;
  disabled?: boolean;
  selectedQuickReply?: string | null;
  onQuickReply: (option: QuickReplyOption) => void;
  onRetry: () => void;
}

const ChatMessageList = ({
  messages,
  isTyping,
  typingLabel,
  characterState,
  disabled,
  selectedQuickReply,
  onQuickReply,
  onRetry,
}: ChatMessageListProps) => {
  // logic
  const endRef = useRef<HTMLDivElement>(null);
  const visible = messages.filter((m) => m.role !== "system" && m.type !== "loading");
  // 화면을 열었을 때 이미 있던 메시지는 애니메이션 없이 바로 보여준다
  const [initialCount] = useState(visible.length);
  const last = visible.at(-1);

  useEffect(() => {
    // 새 메시지가 오면 자동 스크롤
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [visible.length, isTyping]);

  // view
  return (
    <div role="log" aria-live="polite" aria-relevant="additions" aria-label="대화 내용" className="pt-2">
      {visible.map((message, index) => {
        const previous = visible[index - 1];
        const showDate = !previous || !isSameDay(previous.createdAt, message.createdAt);
        const showAvatar = message.role !== "user" && (showDate || previous?.role === "user");
        const isLast = message.id === last?.id;
        return (
          <Fragment key={message.id}>
            {showDate && <DateDivider date={message.createdAt} />}
            <ChatMessageBubble
              message={message}
              showAvatar={showAvatar}
              animate={index >= initialCount}
              avatarState={characterState === "error" ? "idle" : characterState}
              onRetry={isLast && message.type === "error" ? onRetry : undefined}
            />
            {isLast && !isTyping && message.role === "assistant" && message.options?.length ? (
              <QuickReplyButtons options={message.options} onSelect={onQuickReply} disabled={disabled} selected={selectedQuickReply} />
            ) : null}
          </Fragment>
        );
      })}
      {isTyping && <TypingIndicator state={characterState} label={typingLabel} />}
      <div ref={endRef} />
    </div>
  );
};

export default ChatMessageList;
