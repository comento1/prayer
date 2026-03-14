import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Group, User } from "../types";

const FALLBACK_GROUPS: Group[] = [
  { id: 1, name: "창환 조" },
  { id: 2, name: "은아 조" },
];

async function safeJson<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!ct.includes("application/json")) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function GroupSelect() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromMy = searchParams.get("from") === "my";
  const user: User | null = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    fetch("/api/groups")
      .then(async (res) => {
        const data = await safeJson<Group[]>(res);
        if (data && Array.isArray(data) && data.length > 0) setGroups(data);
        else setGroups(FALLBACK_GROUPS);
      })
      .catch(() => setGroups(FALLBACK_GROUPS));

    const savedGroupIds = user.groupIds;
    if (Array.isArray(savedGroupIds) && savedGroupIds.length > 0) {
      setSelectedGroups(savedGroupIds);
    }
  }, [user?.id, navigate]);

  const toggleGroup = (id: number) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleComplete = async () => {
    if (selectedGroups.length === 0 || !user) return;

    let saved = false;
    const res = await fetch("/api/sheet-save-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, groupIds: selectedGroups }),
    });
    const data = await safeJson<{ success?: boolean }>(res);
    if (data?.success || res.ok) {
      saved = true;
    }
    if (!saved && res.status === 404) {
      const expressRes = await fetch(`/api/users/${user.id}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: selectedGroups }),
      });
      if (expressRes.ok) saved = true;
    }
    if (saved) {
      const updated = { ...user, groupIds: selectedGroups };
      localStorage.setItem("user", JSON.stringify(updated));
    }

    if (fromMy) {
      navigate("/my");
    } else {
      navigate("/feed");
    }
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
