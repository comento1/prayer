import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Search as SearchIcon,
  Users,
  Calendar,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Group, User } from "../types";

export default function Search() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/users/${user.id}/groups`)
      .then((res) => res.json())
      .then(setGroups);

    // Fetch users in same groups (simplified for MVP: just fetch all users)
    // In a real app, this should be filtered by group
    fetch("/api/users")
      .then((res) => res.json())
      .then(setUsers)
      .catch(() => setUsers([])); // Ignore if endpoint doesn't exist yet
  }, [user.id]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 flex items-center border-b border-slate-100 dark:border-slate-800">
        <span className="font-medium ml-2">조회</span>
      </header>

      <div className="p-4 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center space-x-2 text-slate-500">
            <Users className="w-5 h-5" />
            <h2 className="font-medium">소그룹별</h2>
          </div>
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => navigate(`/feed?groupId=${group.id}`)}
                className="w-full p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between hover:border-[var(--color-primary-light)] transition-colors"
              >
                <span className="font-medium">🏠 {group.name}</span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center space-x-2 text-slate-500">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-medium">응답됨 모음</h2>
          </div>
          <button
            onClick={() => navigate("/feed?isAnswered=true")}
            className="w-full p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 flex items-center justify-between hover:border-amber-200 transition-colors"
          >
            <span className="font-medium text-amber-700 dark:text-amber-400">
              ✦ 응답된 기도 보기
            </span>
            <ChevronRight className="w-5 h-5 text-amber-400" />
          </button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center space-x-2 text-slate-500">
            <Calendar className="w-5 h-5" />
            <h2 className="font-medium">기간별</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate("/feed?period=week")}
              className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 font-medium text-slate-700 dark:text-slate-300 hover:border-[var(--color-primary-light)] transition-colors"
            >
              이번 주
            </button>
            <button
              onClick={() => navigate("/feed?period=month")}
              className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 font-medium text-slate-700 dark:text-slate-300 hover:border-[var(--color-primary-light)] transition-colors"
            >
              이번 달
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
