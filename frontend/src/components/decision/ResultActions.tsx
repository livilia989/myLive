import { Bookmark, BookmarkCheck, PencilLine, Plus, RefreshCw, Share2 } from "lucide-react";
import Button from "../common/Button";

export interface ResultActionsProps {
  saved: boolean;
  isLoading?: boolean;
  onSave: () => void;
  onReanalyze: () => void;
  onEditChoices: () => void;
  onNew: () => void;
  onShare: () => void;
}

const ResultActions = ({ saved, isLoading, onSave, onReanalyze, onEditChoices, onNew, onShare }: ResultActionsProps) => (
  <section aria-label="결과 메뉴" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    <Button
      className="col-span-2 sm:col-span-3"
      size="lg"
      icon={saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
      onClick={onSave}
      aria-pressed={saved}
    >
      {saved ? "기록에 저장됨" : "이 결과 저장하기"}
    </Button>
    <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={onReanalyze} disabled={isLoading}>
      다시 분석하기
    </Button>
    <Button variant="secondary" icon={<PencilLine size={18} />} onClick={onEditChoices} disabled={isLoading}>
      선택지를 수정하기
    </Button>
    <Button variant="secondary" icon={<Share2 size={18} />} onClick={onShare}>
      결과 공유하기
    </Button>
    <Button variant="soft" icon={<Plus size={18} />} onClick={onNew} className="col-span-2 sm:col-span-3">
      새 고민 시작하기
    </Button>
  </section>
);

export default ResultActions;
