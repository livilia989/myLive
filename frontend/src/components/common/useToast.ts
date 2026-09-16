import { useCallback, useEffect, useRef, useState } from "react";

/** 짧은 알림 (aria-live 로 스크린리더에도 전달) */
export function useToast(duration = 2400) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(
    (text: string) => {
      setMessage(text);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), duration);
    },
    [duration],
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  return { message, show };
}
