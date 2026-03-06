import { Home, Search, PlusCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/feed", icon: Home, label: "피드" },
    { path: "/search", icon: Search, label: "조회" },
    { path: "/create", icon: PlusCircle, label: "등록" },
    { path: "/my", icon: User, label: "내기도" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors ${
                isActive
                  ? "text-[var(--color-primary-light)] dark:text-[var(--color-primary-dark)]"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
