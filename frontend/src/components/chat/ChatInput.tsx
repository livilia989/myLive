import { zodResolver } from "@hookform/resolvers/zod";
import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const MessageFormSchema = z.object({
  message: z.string().trim().min(1, "고민을 입력해 주세요.").max(1000, "1000자 이내로 입력해 주세요."),
});

type MessageForm = z.infer<typeof MessageFormSchema>;

export interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  stageLabel?: string;
  autoFocus?: boolean;
}

const ChatInput = ({ onSubmit, disabled, placeholder = "고민을 편하게 적어줘", stageLabel, autoFocus }: ChatInputProps) => {
  // logic
  const { register, handleSubmit, reset, setFocus, control } = useForm<MessageForm>({
    resolver: zodResolver(MessageFormSchema),
    defaultValues: { message: "" },
  });
  const value = useWatch({ control, name: "message" });

  useEffect(() => {
    if (autoFocus && !disabled) setFocus("message");
  }, [autoFocus, disabled, setFocus]);

  const submit = handleSubmit(({ message }) => {
    if (disabled) return;
    onSubmit(message);
    reset({ message: "" });
  });

  const submitAfterComposition = useRef(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter: 전송 / Shift+Enter: 줄바꿈
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
      // 한글 조합 중 Enter 는 조합을 끝내는 키이므로, 조합이 끝난 직후 전송한다 (한 번만 눌러도 전송)
      submitAfterComposition.current = true;
      return;
    }
    event.preventDefault();
    void submit();
  };

  const handleCompositionEnd = () => {
    if (!submitAfterComposition.current) return;
    submitAfterComposition.current = false;
    // 조합 완료 후 입력값이 반영된 다음 전송
    setTimeout(() => {
      reset({ message: textareaRef.current?.value.replace(/\n$/, "") ?? "" }, { keepDefaultValues: true });
      void submit();
    }, 0);
  };

  const { ref, ...field } = register("message");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // view
  return (
    <form onSubmit={submit} className="border-t border-lavender/80 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {stageLabel && (
        <p className="mb-1.5 px-1 text-xs text-muted-strong">
          현재 단계: <strong className="font-semibold text-purple">{stageLabel}</strong>
        </p>
      )}
      <div className="flex items-end gap-2">
        <label htmlFor="chat-message" className="sr-only">
          메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)
        </label>
        <textarea
          id="chat-message"
          ref={(element) => {
            ref(element);
            textareaRef.current = element;
          }}
          {...field}
          rows={1}
          maxLength={1000}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          onCompositionEnd={handleCompositionEnd}
          aria-describedby="chat-input-hint"
          className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-lavender bg-cream px-4 py-3 text-[15px] leading-snug text-ink placeholder:text-muted focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/30"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={disabled || !value?.trim()}
          aria-label="보내기"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple text-white shadow-soft transition hover:bg-purple-deep disabled:bg-muted/60"
        >
          <SendHorizontal aria-hidden size={20} />
        </button>
      </div>
      <p id="chat-input-hint" className="sr-only">
        Enter 키로 전송하고 Shift와 Enter 키로 줄을 바꿉니다.
      </p>
    </form>
  );
};

export default ChatInput;
