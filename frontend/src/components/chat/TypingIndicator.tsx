import { motion } from "framer-motion";
import type { CorgiState } from "@/features/decision/types";
import LoadingDots from "../common/LoadingDots";
import CorgiAvatar from "../corgi/CorgiAvatar";

const TypingIndicator = ({ state, label }: { state: CorgiState; label: string }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-end gap-2">
    <CorgiAvatar size="sm" state={state} alt="" />
    <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-assistant-message px-4 py-3 shadow-soft">
      <LoadingDots label={`코기가 ${label}`} />
      <span className="text-xs text-muted-strong">{label}…</span>
    </div>
  </motion.div>
);

export default TypingIndicator;
