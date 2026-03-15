import { useEffect, useState, MouseEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Feather, Heart, Sparkles, ArrowLeft } from "lucide-react";
import { Group, PrayerRequest, User } from "../types";
import { formatPrayerDate } from "../utils/date";
import { getCached, setCached } from "../utils/cache";

export default function Feed() {
  const [searchParams] = useSearchParams();
  const initialGroupId = searchParams.get("groupId");
  const isAnsweredFilter = searchParams.get("isAnswered") === "true";

  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [prayersLoading, setPrayersLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<number | "ALL">(
    initialGroupId ? Number(initialGroupId) : "ALL",
  );
  const [periodFilter, setPeriodFilter] = useState<string>(searchParams.get("period") || "");
  const [nicknameSearch, setNicknameSearch] = useState("");
  const [prayingId, setPrayingId] = useState<number | null>(null);
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Group[]) => setGroups(Array.isArray(list) ? list : []))
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    let url =
      activeTab === "ALL"
        ? "/api/prayers"
        : `/api/prayers?groupId=${activeTab}`;
    if (isAnsweredFilter) {
      url += (url.includes("?") ? "&" : "?") + "isAnswered=true";
    }
    if (periodFilter && periodFilter !== "all") {
      url += (url.includes("?") ? "&" : "?") + `period=${periodFilter}`;
    }
    if (user?.id) {
      url += (url.includes("?") ? "&" : "?") + `currentUserId=${user.id}`;
    }
    const cached = getCached<PrayerRequest[]>(url);
    if (Array.isArray(cached) && cached.length >= 0) {
      setPrayers(cached);
      setPrayersLoading(false);
    } else {
      setPrayersLoading(true);
    }
    fetch(url)
      .then(async (res) => {
        if (!res.ok) return [];
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return [];
        }
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCached(url, list);
        setPrayers(list);
      })
      .catch(() => setPrayers((prev) => (cached ? prev : [])))
      .finally(() => setPrayersLoading(false));
  }, [activeTab, isAnsweredFilter, periodFilter, user?.id]);

  const handlePray = async (e: MouseEvent, id: number) => {
    e.stopPropagation();
    const prayer = prayers.find((p) => p.id === id);
    if (!prayer) return;
    const nextPraying = !prayer.user_has_prayed;
    setPrayingId(id);
    setPrayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          pray_count: p.pray_count + (nextPraying ? 1 : -1),
          user_has_prayed: nextPraying,
        };
      }),
    );
    try {
      const res = await fetch(`/api/prayers/${id}/pray`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const text = await res.text();
      let data: { praying?: boolean };
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }
      const ok = res.ok && (data.praying === true || data.praying === false);
      if (!ok) {
        setPrayers((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            return {
              ...p,
              pray_count: prayer.pray_count,
              user_has_prayed: prayer.user_has_prayed,
            };
          }),
        );
      }
    } catch {
      setPrayers((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            pray_count: prayer.pray_count,
            user_has_prayed: prayer.user_has_prayed,
          };
        }),
      );
    } finally {
      setPrayingId(null);
    }
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
        <>
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

          <div className="px-4 pb-2 flex flex-wrap items-center gap-2">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-700 dark:text-slate-300"
            >
              <option value="">전체 기간</option>
              <option value="week">최근 7일</option>
              <option value="month">최근 30일</option>
            </select>
            <input
              type="text"
              value={nicknameSearch}
              onChange={(e) => setNicknameSearch(e.target.value)}
              placeholder="닉네임 검색"
              className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
            />
          </div>
        </>
      )}

      <div className="p-4 space-y-4">
        {prayersLoading && prayers.length === 0 ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="prayer-card animate-pulse">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                <div className="flex justify-between mb-3">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-16 bg-slate-100 dark:bg-slate-600 rounded" />
                </div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-600 rounded mb-4" />
                <div className="h-4 w-28 bg-slate-100 dark:bg-slate-600 rounded pt-3 border-t border-slate-100 dark:border-slate-700" />
              </div>
            ))}
          </>
        ) : (() => {
          const searchLower = nicknameSearch.trim().toLowerCase();
          const filtered = searchLower
            ? prayers.filter((p) => (p.user_nickname || "").toLowerCase().includes(searchLower))
            : prayers;
          return filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>
                {prayers.length === 0
                  ? "아직 나눠진 기도가 없어요."
                  : "검색 결과가 없어요."}
              </p>
              <p className="mt-1">
                {prayers.length === 0 ? "첫 번째로 마음을 꺼내보세요." : "기간·닉네임을 바꿔보세요."}
              </p>
            </div>
          ) : (
            filtered.map((prayer) => (
            <motion.div
              key={prayer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/prayers/${Number(prayer.id)}`)}
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
                  {formatPrayerDate(prayer.created_at)}
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
                    disabled={prayingId === prayer.id}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-70 ${
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
                    <span>{prayingId === prayer.id ? "..." : "함께 기도할게요"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
            ) ) );
        })()}
      </div>
    </div>
  );
}
