import { useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import AppShell from "@/components/layout/AppShell";

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <AppShell>
      <EmptyState
        title="길을 잃었어요"
        description="수정구슬로도 이 페이지는 찾을 수 없었어요. 🔮"
        state="surprised"
        action={
          <Button size="lg" onClick={() => navigate("/")}>
            홈으로 가기
          </Button>
        }
      />
    </AppShell>
  );
};

export default NotFoundPage;
