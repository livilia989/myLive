import { History, House, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/", label: "홈", icon: House, end: true },
  { to: "/history", label: "기록", icon: History, end: false },
  { to: "/settings", label: "설정", icon: Settings, end: false },
];

const MobileBottomNav = () => (
  <nav
    aria-label="주요 메뉴"
    className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t border-lavender bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:absolute sm:rounded-b-4xl"
  >
    <ul className="grid grid-cols-3">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                isActive ? "text-purple" : "text-muted-strong hover:text-purple"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon aria-hidden size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
                {isActive && <span className="sr-only">(현재 페이지)</span>}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);

export default MobileBottomNav;
