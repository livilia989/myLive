import type { ReactNode } from "react";
import MobileBottomNav from "./MobileBottomNav";

export interface AppShellProps {
  children: ReactNode;
  /** 결과 페이지처럼 넓은 화면 (최대 900px) */
  wide?: boolean;
  /** 하단 탭 표시 */
  nav?: boolean;
  /** 채팅처럼 화면 높이를 꽉 채우고 내부 스크롤을 쓰는 레이아웃 */
  fullHeight?: boolean;
}

/**
 * 모바일: 전체 화면
 * 데스크톱: 크림색 배경 위 가운데 정렬된 챗봇 앱 (420~520px), 결과 페이지는 최대 900px
 */
const AppShell = ({ children, wide = false, nav = false, fullHeight = false }: AppShellProps) => (
  <div className="flex min-h-dvh justify-center bg-cream sm:bg-[radial-gradient(circle_at_top,_var(--lavender),_var(--cream)_60%)] sm:py-6">
    <a href="#main" className="sr-only-focusable fixed left-2 top-2 z-50 rounded-xl bg-purple px-3 py-2 text-white">
      본문으로 바로가기
    </a>
    <div
      className={`relative flex w-full flex-col bg-cream sm:rounded-4xl sm:border sm:border-lavender sm:shadow-card ${
        wide ? "max-w-[900px]" : "max-w-[480px]"
      } ${fullHeight ? "h-dvh sm:h-[calc(100dvh-3rem)] sm:overflow-hidden" : "min-h-dvh sm:min-h-[calc(100dvh-3rem)]"}`}
    >
      <main id="main" className={`flex flex-1 flex-col ${fullHeight ? "min-h-0" : ""} ${nav ? "pb-20" : ""}`}>
        {children}
      </main>
      {nav && <MobileBottomNav />}
    </div>
  </div>
);

export default AppShell;
