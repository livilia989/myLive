import { MotionConfig } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { useSettingsStore } from "@/features/settings/store";

/** 애니메이션 설정(동작 줄이기)을 CSS 와 Framer Motion 에 함께 반영한다. */
const AppProviders = ({ children }: { children: ReactNode }) => {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("reduce-motion", reduceMotion === "on");
    root.classList.toggle("motion-allowed", reduceMotion === "off");
  }, [reduceMotion]);

  return <MotionConfig reducedMotion={reduceMotion === "on" ? "always" : reduceMotion === "off" ? "never" : "user"}>{children}</MotionConfig>;
};

export default AppProviders;
