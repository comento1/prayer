import { useEffect, useState, FormEvent } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { generateAIContent } from "../services/aiService";
import { formatPrayerDate } from "../utils/date";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Sparkles,
  BookOpen,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { PrayerRequest, Comment, User } from "../types";

export default function PrayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user: User = JSON.parse(localStorage.getItem("user") || "{}");

  const [prayer, setPrayer] = useState<PrayerRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPraying, setIsPraying] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [generatedPrayer, setGeneratedPrayer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAnsweredModal, setShowAnsweredModal] = useState(false);
  const [answeredNote, setAnsweredNote] = useState("");

  useEffect(() => {
    const url = user?.id ? `/api/prayers/${id}?currentUserId=${user.id}` : `/api/prayers/${id}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setPrayer(data);
        setComments(data.comments || []);
        setIsPraying(!!data.user_has_prayed);
      });
  }, [id, user?.id]);

  const handlePray = async () => {
    const res = await fetch(`/api/prayers/${id}/pray`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    setIsPraying(data.praying);
    setPrayer((prev) =>
      prev
        ? { ...prev, pray_count: prev.pray_count + (data.praying ? 1 : -1) }
        : null,
    );
  };

  const handleComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const res = await fetch(`/api/prayers/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, content: newComment }),
    });

    if (res.ok) {
      setComments([
        ...comments,
        {
          id: Date.now(),
          prayer_request_id: Number(id),
          user_id: user.id,
          type: "COMMENT",
          content: newComment,
          created_at: new Date().toISOString(),
          user_nickname: user.nickname,
        },
      ]);
      setNewComment("");
    }
  };

  const handleGeneratePrayer = async () => {
    setShowPrayerModal(true);
    if (generatedPrayer) return; // Already generated

    setIsGenerating(true);
    try {
      const response = await generateAIContent({
        model: "gemini-3-flash-preview",
        contents: `다음 기도 제목을 바탕으로 함께 기도할 수 있는 짧고 따뜻한 기도문을 작성해주세요: "${prayer?.content}"
        
- 3~4문장 정도로 작성하세요.
- '하나님 아버지,' 로 시작하고, '예수님의 이름으로 기도합니다. 아멘.'으로 마무리해주세요.
- 청년부 공동체에서 서로를 위해 기도하는 따뜻한 톤을 유지하세요.`,
      });
      setGeneratedPrayer(response.text || "");
    } catch (err: any) {
      console.error("AI Prayer Generation Error:", err);
      
      const isQuotaError = err.message?.includes("429") || err.status === "RESOURCE_EXHAUSTED" || err.message === "AI_COOLDOWN";
      
      if (isQuotaError) {
        setGeneratedPrayer("현재 AI 사용량이 많아 기도문을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.");
      } else {
        setGeneratedPrayer("기도문을 생성하는 중에 오류가 발생했습니다.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrayer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openAnsweredModal = () => {
    if (prayer?.is_answered === 1) {
      handleAnsweredSubmit(undefined);
      return;
    }
    setAnsweredNote("");
    setShowAnsweredModal(true);
  };

  const handleAnsweredSubmit = async (note?: string) => {
    if (!prayer || prayer.user_id !== user.id) return;

    if (prayer.is_answered === 1) {
      await fetch(`/api/prayers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnswered: false }),
      });
      setPrayer({ ...prayer, is_answered: 0 });
      setShowAnsweredModal(false);
      return;
    }

    setShowAnsweredModal(false);
    await fetch(`/api/prayers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAnswered: true, answeredNote: note != null ? note.trim() : "" }),
    });
    const updatedContent = note && note.trim() ? prayer.content + "\n\n[응답] " + note.trim() : prayer.content;
    setPrayer({ ...prayer, is_answered: 1, content: updatedContent, answered_note: note?.trim() || null });
    setAnsweredNote("");
  };

  if (!prayer)
    return (
      <div className="min-h-screen flex items-center justify-center">
        로딩 중...
      </div>
    );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 flex items-center border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-medium ml-2">기도 제목</span>
      </header>

      <div className="p-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="prayer-card"
        >
          {prayer.is_answered === 1 && (
            <div className="inline-flex items-center space-x-1 text-[var(--color-secondary-light)] dark:text-[var(--color-secondary-dark)] text-xs font-medium mb-4 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-md">
              <Sparkles className="w-3 h-3" />
              <span>응답됨</span>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium">
                {prayer.user_nickname[0]}
              </div>
              <div>
                <div className="font-medium text-sm">
                  {prayer.user_nickname}
                </div>
                <div className="text-xs text-slate-500">
                  {prayer.group_name || "전체 공개"} ·{" "}
                  {formatPrayerDate(prayer.created_at)}
                </div>
              </div>
            </div>
          </div>

          <p className="text-slate-800 dark:text-slate-200 leading-relaxed mb-6 whitespace-pre-wrap font-prayer text-lg">
            {prayer.content}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-1 text-sm text-slate-500">
              <Heart className="w-4 h-4 text-[var(--color-secondary-light)]" />
              <span>{prayer.pray_count}명이 기도하고 있어요</span>
            </div>
          </div>
        </motion.div>

        <div className="flex space-x-3">
          <button
            onClick={handlePray}
            className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors ${
              isPraying
                ? "bg-[var(--color-secondary-light)] text-white"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Heart className={`w-5 h-5 ${isPraying ? "fill-current" : ""}`} />
            <span>함께 기도할게요</span>
          </button>

          <button
            onClick={handleGeneratePrayer}
            className="flex-1 py-3 rounded-xl bg-[var(--color-primary-light)] text-white font-medium flex items-center justify-center space-x-2"
          >
            <BookOpen className="w-5 h-5" />
            <span>기도문 만들기</span>
          </button>
        </div>

        {prayer.user_id === user.id && (
          <button
            onClick={openAnsweredModal}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors ${
              prayer.is_answered === 1
                ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>
              {prayer.is_answered === 1 ? "응답됨 취소" : "응답됨 표시하기"}
            </span>
          </button>
        )}

        <div className="space-y-4 pt-4">
          <div className="flex items-center space-x-2 text-slate-500">
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium text-sm">격려 메시지</span>
          </div>

          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">
                    {comment.user_nickname}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatPrayerDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 pb-safe">
        <form
          onSubmit={handleComment}
          className="max-w-md mx-auto flex space-x-2"
        >
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="격려 메시지나 성경 구절을 남겨주세요..."
            className="flex-1 px-4 py-3 rounded-full bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] text-white flex items-center justify-center disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
        </form>
      </div>

      <AnimatePresence>
        {showAnsweredModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">응답 내용 기록</span>
                  </div>
                  <button
                    onClick={() => setShowAnsweredModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-slate-500">
                  무엇을 응답받으셨는지 간단히 적어주시면 기도 제목에 함께 기록돼요.
                </p>
                <textarea
                  value={answeredNote}
                  onChange={(e) => setAnsweredNote(e.target.value)}
                  placeholder="예: 면접 합격, 건강 회복, 관계 화해..."
                  className="w-full h-24 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-amber-400 resize-none text-sm"
                  maxLength={300}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAnsweredSubmit(answeredNote)}
                    className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-medium"
                  >
                    기록하고 응답됨 표시
                  </button>
                  <button
                    onClick={() => setShowAnsweredModal(false)}
                    className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                  >
                    취소
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrayerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[var(--color-primary-light)] dark:text-[var(--color-primary-dark)]">
                    <BookOpen className="w-5 h-5" />
                    <span className="font-serif font-medium">
                      AI가 만든 기도문
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPrayerModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="min-h-[200px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  {isGenerating ? (
                    <div className="flex flex-col items-center space-y-3 text-slate-500">
                      <Sparkles className="w-6 h-6 animate-pulse text-[var(--color-primary-light)]" />
                      <span className="text-sm font-medium">
                        기도문을 작성하고 있어요...
                      </span>
                    </div>
                  ) : (
                    <p className="font-prayer text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {generatedPrayer}
                    </p>
                  )}
                </div>

                {!isGenerating && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopy}
                      className="flex-1 py-3 rounded-xl bg-[var(--color-primary-light)] text-white font-medium flex items-center justify-center space-x-2"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                      <span>{copied ? "복사 완료!" : "기도문 복사하기"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setGeneratedPrayer("");
                        handleGeneratePrayer();
                      }}
                      className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                    >
                      다시
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
