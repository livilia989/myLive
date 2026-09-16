import { useState } from "react";
import type { CorgiState } from "@/features/decision/types";
import { DEFAULT_CORGI_IMAGE, getAvatarImage } from "./corgiAssets";

const SIZE = { xs: 28, sm: 36, md: 44, lg: 64, xl: 96 } as const;

export interface CorgiAvatarProps {
  size?: keyof typeof SIZE | number;
  state?: CorgiState;
  showBorder?: boolean;
  className?: string;
  alt?: string;
}

/**
 * 원형 프로필용 코기.
 * 상태별 이미지가 추가되면 자동으로 교체되고, 전신 이미지여도 얼굴이 잘 보이도록 위쪽을 기준으로 자른다.
 */
const CorgiAvatar = ({ size = "md", state = "idle", showBorder = true, className = "", alt = "선택점쟁이 코기" }: CorgiAvatarProps) => {
  // logic
  const pixels = typeof size === "number" ? size : SIZE[size];
  const src = getAvatarImage(state);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // view
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-lavender ${
        showBorder ? "ring-2 ring-white shadow-soft" : ""
      } ${className}`}
      style={{ width: pixels, height: pixels }}
    >
      <img
        src={failedSrc === src ? DEFAULT_CORGI_IMAGE : src}
        alt={alt}
        width={pixels}
        height={pixels}
        className="h-full w-full object-cover"
        style={{ objectPosition: "50% 25%" }}
        onError={() => setFailedSrc(src)}
        draggable={false}
      />
    </span>
  );
};

export default CorgiAvatar;
