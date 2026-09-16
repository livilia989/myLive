import { motion } from "framer-motion";
import { History, MessageCircleHeart, Settings, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import CorgiCharacter from "@/components/corgi/CorgiCharacter";
import { getSceneImage } from "@/components/corgi/corgiAssets";
import AppShell from "@/components/layout/AppShell";
import { CATEGORIES, SAMPLE_DECISIONS } from "@/features/decision/prompts";
import { useDecisionStore } from "@/features/decision/store";

const HomePage = () => {
  // logic
  const navigate = useNavigate();
  const startNewDecision = useDecisionStore((s) => s.startNewDecision);
  const [starting, setStarting] = useState(false);
  const scene = getSceneImage();

  const handleExample = async () => {
    if (starting) return;
    setStarting(true);
    const example = SAMPLE_DECISIONS[Math.floor(Math.random() * SAMPLE_DECISIONS.length)];
    const id = await startNewDecision(example);
    navigate(`/decision/${id}`);
  };

  // view
  return (
    <AppShell nav>
      {/* START: 헤더 */}
      <header className="flex items-center justify-between px-4 pt-4">
        <Link to="/" className="flex items-center gap-1.5 text-lg font-extrabold text-purple">
          <Sparkles aria-hidden size={20} className="text-gold" fill="currentColor" />
          선택점쟁이
        </Link>
        <nav aria-label="바로가기" className="flex">
          <Link to="/history" aria-label="기록" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-lavender/60">
            <History aria-hidden size={22} />
          </Link>
          <Link to="/settings" aria-label="설정" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-lavender/60">
            <Settings aria-hidden size={22} />
          </Link>
        </nav>
      </header>
      {/* END: 헤더 */}

      {/* START: 코기 + 말풍선 */}
      <section className="flex flex-col items-center px-5 pt-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-3 rounded-3xl rounded-bl-md bg-white px-5 py-3 text-[15px] font-medium leading-relaxed text-ink shadow-soft"
        >
          안녕! 나는 선택점쟁이야.
          <br />
          오늘은 어떤 고민이 생겼어?
        </motion.div>
        {scene ? (
          <img
            src={scene}
            alt="수정구슬 앞에 앉은 점쟁이 웰시코기"
            className="corgi-anim-idle aspect-[4/3] w-full max-w-sm rounded-4xl object-cover shadow-card"
          />
        ) : (
          <CorgiCharacter state="idle" size={200} />
        )}
        <h1 className="mt-5 text-2xl font-extrabold text-ink">고민은 맡겨. 내가 같이 골라줄게!</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-strong">
          복잡한 선택도 나에게 이야기해봐.
          <br />
          같이 차근차근 살펴보자!
        </p>
      </section>
      {/* END: 코기 + 말풍선 */}

      {/* START: CTA */}
      <section className="mt-6 flex flex-col gap-2 px-5">
        <Button size="lg" fullWidth icon={<MessageCircleHeart size={22} />} onClick={() => navigate("/decision/new")} className="text-lg">
          고민 이야기하기
        </Button>
        <Button variant="secondary" fullWidth icon={<Wand2 size={18} />} onClick={handleExample} disabled={starting}>
          예시 고민으로 시작하기
        </Button>
      </section>
      {/* END: CTA */}

      {/* START: 카테고리 */}
      <section aria-labelledby="category-title" className="mt-8 px-5">
        <h2 id="category-title" className="text-sm font-bold text-muted-strong">
          어떤 고민이야?
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 min-[380px]:grid-cols-3">
          {CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link
                to={`/decision/new?category=${category.id}`}
                className="flex h-full flex-col items-center gap-1 rounded-2xl border border-lavender bg-white px-2 py-3 text-center text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-purple/40 hover:shadow-soft"
              >
                <span aria-hidden className="text-2xl">
                  {category.emoji}
                </span>
                {category.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {/* END: 카테고리 */}

      <p className="mt-8 pb-4 text-center text-sm font-medium text-muted-strong">🔮 운세는 재미로, 선택은 나답게.</p>
    </AppShell>
  );
};

export default HomePage;
