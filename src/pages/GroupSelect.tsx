import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Group, User } from "../types";

export default function GroupSelect() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const navigate = useNavigate();
  const user: User | null = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    fetch("/api/groups")
      .then((res) => res.json())
      .then(setGroups);

    fetch(`/api/users/${user.id}/groups`)
      .then((res) => res.json())
      .then((userGroups: Group[]) =>
        setSelectedGroups(userGroups.map((g) => g.id)),
      );
  }, [user?.id, navigate]);

  const toggleGroup = (id: number) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleComplete = async () => {
    if (selectedGroups.length === 0) return;

    await fetch(`/api/users/${user?.id}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupIds: selectedGroups }),
    });

    navigate("/feed");
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6 max-w-md mx-auto"
    >
      <div className="space-y-8 pt-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-serif">
            안녕하세요, {user.nickname}님 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            소속 소그룹을 선택해주세요.
            <br />
            (복수 선택 가능)
          </p>
        </div>

        <div className="space-y-3">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => toggleGroup(group.id)}
              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                selectedGroups.includes(group.id)
                  ? "border-[var(--color-primary-light)] bg-indigo-50 dark:bg-indigo-900/20 dark:border-[var(--color-primary-dark)]"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              }`}
            >
              <span className="font-medium">🏠 {group.name}</span>
              {selectedGroups.includes(group.id) && (
                <span className="text-[var(--color-primary-light)] dark:text-[var(--color-primary-dark)]">
                  ✅
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleComplete}
          disabled={selectedGroups.length === 0}
          className="w-full py-4 rounded-xl bg-[var(--color-primary-light)] dark:bg-[var(--color-primary-dark)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          선택 완료 →
        </button>
      </div>
    </motion.div>
  );
}
