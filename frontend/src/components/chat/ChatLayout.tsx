import type { ReactNode } from "react";

/** 고정 헤더 · 스크롤 메시지 영역 · 고정 입력창 */
const ChatLayout = ({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) => (
  <div className="flex h-full min-h-0 flex-1 flex-col">
    <div className="sticky top-0 z-20 shrink-0">{header}</div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
    <div className="shrink-0">{footer}</div>
  </div>
);

export default ChatLayout;
