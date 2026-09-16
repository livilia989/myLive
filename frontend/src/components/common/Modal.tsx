import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, type ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
}

/** 접근성 모달: Esc 로 닫기, 열릴 때 포커스 이동, 닫히면 이전 포커스 복원, Tab 포커스 가두기 */
const Modal = ({ open, title, description, onClose, children }: ModalProps) => {
  // logic
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      panel ? [...panel.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")] : [];
    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  // view
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted-strong">
                {description}
              </div>
            )}
            {children && <div className="mt-5 flex gap-2">{children}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
