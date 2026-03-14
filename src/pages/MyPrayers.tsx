import { useEffect, useState, MouseEvent } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Sparkles, Heart, Trash2, Users } from "lucide-react";
import { PrayerRequest, User } from "../types";

export default function MyPrayers() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ANSWERED">("ACTIVE");
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/prayers?userId=${user.id}`)
      .then((res) => res.json())
      .then(setPrayers);
  }, [user.id]);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/prayers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPrayers((prev) => prev.filter((p) => p.id !== id));
        setDeletingId(null);
      } else {
        const data = await res.json();
        alert(`삭제에 실패했습니다: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const activePrayers = prayers.filter((p) => p.is_answered === 0);
  const answeredPrayers = prayers.filter((p) => p.is_answered === 1);
  const displayPrayers =
    activeTab === "ACTIVE" ? activePrayers : answeredPrayers;

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <h1 className="font-serif font-medium text-lg">내 기도</h1>
        <button
          onClick={() => navigate("/groups?from=my")}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-sm"
        >
          <Users className="w-4 h-4" />
          조 설정
        </button>
      </header>

      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-serif mb-2">
            {user.nickname}님의 기도 제목
          </h2>
          <p className="text-slate-500">
            총 {prayers.length}개 · 응답 {answeredPrayers.length}개
          </p>
        </div>

        <div className="flex space-x-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "ACTIVE"
                ? "bg-white dark:bg-slate-700 shadow-sm text-[var(--color-primary-light)] dark:text-white"
                : "text-slate-500"
            }`}
          >
            기도 중 ({activePrayers.length})
          </button>
          <button
            onClick={() => setActiveTab("ANSWERED")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "ANSWERED"
                ? "bg-white dark:bg-slate-700 shadow-sm text-[var(--color-secondary-light)] dark:text-[var(--color-secondary-dark)]"
                : "text-slate-500"
            }`}
          >
            응답됨 ({answeredPrayers.length})
          </button>
        </div>

        <div className="space-y-4">
          {displayPrayers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>해당하는 기도 제목이 없습니다.</p>
            </div>
          ) : (
            displayPrayers.map((prayer) => (
              <motion.div
                key={prayer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/prayers/${prayer.id}`)}
                className="prayer-card cursor-pointer relative overflow-hidden"
              >
                <AnimatePresence>
                  {deletingId === prayer.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-800/95 flex flex-col items-center justify-center p-4 text-center"
                    >
                      <p className="text-sm font-medium mb-3">정말 삭제하시겠습니까?</p>
                      <div className="flex space-x-2 w-full">
                        <button
                          onClick={() => handleDelete(prayer.id)}
                          className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium"
                        >
                          삭제
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium"
                        >
                          취소
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(prayer.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeletingId(prayer.id);
                    }}
                    className="p-2 -mr-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4 line-clamp-3 font-prayer">
                  {prayer.content}
                </p>

                <div className="flex items-center space-x-1 text-sm text-slate-500">
                  <Heart className="w-4 h-4 text-slate-300" />
                  <span>{prayer.pray_count}명이 함께 기도했어요</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
