import { useEffect, useState, MouseEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Feather, Heart, Sparkles, ArrowLeft } from "lucide-react";
import { Group, PrayerRequest, User } from "../types";

export default function Feed() {
  const [searchParams] = useSearchParams();
  const initialGroupId = searchParams.get("groupId");
  const isAnsweredFilter = searchParams.get("isAnswered") === "true";
  const periodFilter = searchParams.get("period");

  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<number | "ALL">(
    initialGroupId ? Number(initialGroupId) : "ALL",
  );
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/users/${user.id}/groups`)
      .then((res) => res.json())
      .then(setGroups);
  }, [user.id]);

  useEffect(() => {
    let url =
      activeTab === "ALL"
        ? "/api/prayers"
        : `/api/prayers?groupId=${activeTab}`;
    if (isAnsweredFilter) {
      url += (url.includes("?") ? "&" : "?") + "isAnswered=true";
    }
    if (periodFilter) {
      url += (url.includes("?") ? "&" : "?") + `period=${periodFilter}`;
    }
    if (user?.id) {
      url += (url.includes("?") ? "&" : "?") + `currentUserId=${user.id}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then(setPrayers);
  }, [activeTab, isAnsweredFilter, periodFilter, user?.id]);

  const handlePray = async (e: MouseEvent, id: number) => {
    e.stopPropagation();
    const res = await fetch(`/api/prayers/${id}/pray`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();

    setPrayers((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            pray_count: p.pray_count + (data.praying ? 1 : -1),
            user_has_prayed: !!data.praying,
          };
        }
        return p;
      }),
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[var(--color-primary-light)] dark:text-[var(--color-primary-dark)]">
          {isAnsweredFilter ? (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Feather className="w-6 h-6" />
          )}
          <span className="font-serif font-medium text-lg">
            {isAnsweredFilter
              ? "응답된 기도"
              : "서정은혜교회 청년부 기도방"}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium">
          {user.nickname?.[0]}
        </div>
      </header>

      {!isAnsweredFilter && (
        <div className="px-4 py-3 overflow-x-auto no-scrollbar flex space-x-2">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            전체
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveTab(g.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === g.id
                  ? "bg-[var(--color-primary-light)] text-white dark:bg-[var(--color-primary-dark)]"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 space-y-4">
        {prayers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>아직 나눠진 기도가 없어요.</p>
            <p>첫 번째로 마음을 꺼내보세요.</p>
          </div>
        ) : (
          prayers.map((prayer) => (
            <motion.div
              key={prayer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/prayers/${prayer.id}`)}
              className="prayer-card cursor-pointer"
            >
              {prayer.is_answered === 1 && (
                <div className="inline-flex items-center space-x-1 text-[var(--color-secondary-light)] dark:text-[var(--color-secondary-dark)] text-xs font-medium mb-3 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                  <Sparkles className="w-3 h-3" />
                  <span>응답됨</span>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">
                    {prayer.user_nickname}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs text-slate-500">
                    {prayer.group_name || "전체 공개"}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(prayer.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>

              <p className="text-slate-800 dark:text-slate-200 leading-relaxed mb-4 whitespace-pre-wrap font-prayer text-lg">
                {prayer.content}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <span>🙏</span>
                  <span>{prayer.pray_count}명이 기도했어요</span>
                  {(prayer.comment_count ?? 0) > 0 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>💬 {prayer.comment_count}개 격려</span>
                    </>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={(e) => handlePray(e, prayer.id)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      prayer.user_has_prayed
                        ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                        : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        prayer.user_has_prayed
                          ? "fill-current text-rose-500"
                          : "text-[var(--color-secondary-light)]"
                      }`}
                    />
                    <span>함께 기도할게요</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
