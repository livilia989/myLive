import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import LoadingDots from "@/components/common/LoadingDots";
import HomePage from "@/pages/HomePage";

// 첫 화면(홈)을 제외한 페이지는 필요할 때 불러온다
const NewDecisionPage = lazy(() => import("@/pages/NewDecisionPage"));
const DecisionChatPage = lazy(() => import("@/pages/DecisionChatPage"));
const DecisionResultPage = lazy(() => import("@/pages/DecisionResultPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const page = (element: ReactNode) => (
  <Suspense
    fallback={
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <LoadingDots label="페이지를 불러오는 중" />
      </div>
    }
  >
    {element}
  </Suspense>
);

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/decision/new", element: page(<NewDecisionPage />) },
  { path: "/decision/:id", element: page(<DecisionChatPage />) },
  { path: "/decision/:id/result", element: page(<DecisionResultPage />) },
  { path: "/history", element: page(<HistoryPage />) },
  { path: "/settings", element: page(<SettingsPage />) },
  { path: "*", element: page(<NotFoundPage />) },
]);
