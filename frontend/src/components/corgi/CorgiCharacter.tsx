import type { CorgiState } from "@/features/decision/types";
import { DEFAULT_CORGI_IMAGE, getCharacterImage } from "./corgiAssets";

export interface CorgiCharacterProps {
  state?: CorgiState;
  size?: number;
  className?: string;
  alt?: string;
  /** 반짝이 장식 표시 */
  sparkles?: boolean;
}

/** 큰 캐릭터 표시 + 상태별 애니메이션 (prefers-reduced-motion 존중) */
const CorgiCharacter = ({ state = "idle", size = 200, className = "", alt = "보라색 점쟁이 모자를 쓴 웰시코기", sparkles = true }: CorgiCharacterProps) => {
  // logic
  const src = getCharacterImage(state);

  // view
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      {sparkles && (
        <>
          <span aria-hidden className="twinkle absolute -left-2 top-4 text-xl text-gold">✦</span>
          <span aria-hidden className="twinkle absolute -right-1 top-10 text-base text-gold" style={{ animationDelay: "0.6s" }}>
            ✦
          </span>
          {(state === "analysis" || state === "thinking") && (
            <span aria-hidden className="twinkle absolute bottom-6 right-2 text-2xl text-purple" style={{ animationDelay: "0.3s" }}>
              ✧
            </span>
          )}
        </>
      )}
      <img
        key={state}
        src={src}
        alt={alt}
        width={size}
        height={size}
        draggable={false}
        // 기본 SVG 는 원형, 제공된 캐릭터 이미지는 귀·모자가 잘리지 않도록 전체를 보여준다
        className={`corgi-anim-${state} h-full w-full ${src === DEFAULT_CORGI_IMAGE ? "rounded-full object-cover" : "object-contain"} drop-shadow-md`}
        style={{ objectPosition: "50% 30%" }}
      />
    </div>
  );
};

export default CorgiCharacter;
