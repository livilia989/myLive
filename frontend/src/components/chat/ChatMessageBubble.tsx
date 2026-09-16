import { motion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import type { ChatMessage, CorgiState } from "@/features/decision/types";
import { formatTime } from "@/lib/date";
import CorgiAvatar from "../corgi/CorgiAvatar";

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  /** 연속된 코기 메시지면 프로필을 생략한다 */
  showAvatar: boolean;
  /** 새로 도착한 메시지만 등장 애니메이션 */
  animate?: boolean;
  avatarState?: CorgiState;
  onRetry?: () => void;
}

/**
 * 메시지는 텍스트로만 렌더링한다 (dangerouslySetInnerHTML / Markdown HTML 변환 없음 → XSS 차단)
 */
const ChatMessageBubble = ({ message, showAvatar, animate = true, avatarState = "idle", onRetry }: ChatMessageBubbleProps) => {
  // logic
  const isUser = message.role === "user";
  const isError = message.type === "error";
  const isResult = message.type === "result";
  const enter = animate ? { opacity: 0, y: 8 } : false;

  // view
  if (isUser) {
    return (
      <motion.div initial={enter} animate={{ opacity: 1, y: 0 }} className="mt-3 flex justify-end">
        <div className="flex max-w-[80%] items-end gap-1.5">
          <time className="shrink-0 text-[11px] text-muted-strong" dateTime={message.createdAt}>
            {formatTime(message.createdAt)}
          </time>
          <p className="whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-user-message px-4 py-2.5 text-[15px] leading-relaxed text-ink">
            <span className="sr-only">나: </span>
            {message.content}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={enter} animate={{ opacity: 1, y: 0 }} className={`flex items-start gap-2 ${showAvatar ? "mt-4" : "mt-1.5"}`}>
      <div className="w-9 shrink-0">{showAvatar && <CorgiAvatar size="sm" state={isError ? "error" : avatarState} alt="" />}</div>
      <div className="flex max-w-[82%] flex-col">
        {showAvatar && <span className="mb-1 text-xs font-semibold text-muted-strong">선택점쟁이</span>}
        <div className="flex items-end gap-1.5">
          <div
            className={`whitespace-pre-wrap break-words rounded-2xl rounded-tl-md px-4 py-2.5 text-[15px] leading-relaxed shadow-soft ${
              isError
                ? "border border-red-200 bg-red-50 text-red-800"
                : isResult
                  ? "border border-gold/70 bg-gradient-to-br from-white to-lavender/60 text-ink"
                  : "bg-assistant-message text-ink"
            }`}
          >
            <span className="sr-only">선택점쟁이: </span>
            {isResult && (
              <span className="mb-1 flex items-center gap-1 text-xs font-bold text-purple">
                <Sparkles aria-hidden size={14} /> 오늘의 선택 운세
              </span>
            )}
            {message.content}
            {isError && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
              >
                <RotateCcw aria-hidden size={14} /> 다시 시도
              </button>
            )}
          </div>
          <time className="shrink-0 text-[11px] text-muted-strong" dateTime={message.createdAt}>
            {formatTime(message.createdAt)}
          </time>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessageBubble;
