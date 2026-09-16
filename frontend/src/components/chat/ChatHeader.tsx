import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { CorgiState } from "@/features/decision/types";
import IconButton from "../common/IconButton";
import CorgiAvatar from "../corgi/CorgiAvatar";
import CorgiStatus from "../corgi/CorgiStatus";

export interface ChatHeaderProps {
  status: string;
  characterState: CorgiState;
  backTo?: string;
  right?: ReactNode;
}

const ChatHeader = ({ status, characterState, backTo, right }: ChatHeaderProps) => {
  // logic
  const navigate = useNavigate();
  const handleBack = () => (backTo ? navigate(backTo) : navigate(-1));

  // view
  return (
    <header className="flex items-center gap-2 border-b border-lavender/80 bg-cream/95 px-2 py-2 backdrop-blur">
      <IconButton label="뒤로가기" icon={<ChevronLeft size={24} />} onClick={handleBack} />
      <CorgiAvatar size="md" state={characterState} alt="" />
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold text-ink">선택점쟁이</h1>
        <CorgiStatus state={characterState} text={status} />
      </div>
      {right}
    </header>
  );
};

export default ChatHeader;
