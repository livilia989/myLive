import { AnimatePresence, motion } from "framer-motion";

const Toast = ({ message }: { message: string | null }) => (
  <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-card"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

export default Toast;
