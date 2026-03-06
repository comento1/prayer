import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, Send } from "lucide-react";
import { generateAIContent } from "../services/aiService";
import { Group, User } from "../types";

export default function CreatePrayer() {
  const [content, setContent] = useState("");
  const [groupId, setGroupId] = useState<number | "">("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [aiResponse, setAiResponse] = useState<{
    type: string;
    text: string;
  } | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinedContent, setRefinedContent] = useState("");
  const [didAnswerQuestion, setDidAnswerQuestion] = useState(false);

  const user: User = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/users/${user.id}/groups`)
      .then((res) => res.json())
      .then((data) => {
        setGroups(data);
        // Default to Public (empty string), so we remove the auto-select first group
      });
  }, [user.id]);

  const handleRefine = async () => {
    if (!content.trim()) return;
    setIsRefining(true);
    try {
      const response = await generateAIContent({
        model: "gemini-3-flash-preview",
        contents: `사용자가 작성한 기도 제목 초안입니다: "${content}"
        
길이나 내용에 따라 적절한 기도 제목 형태로 다듬어주세요.
- "하소서", "주시옵소서"와 같이 지나치게 경직되거나 문어체적인 표현은 피하고, 일상에서 친구나 공동체와 나누는 듯한 따뜻하고 자연스러운 구어체 문장으로 정리하세요.
- 너무 짧으면(단어 수준) 구체적인 상황을 묻는 질문을 1~2개 제안하세요.
- 길면 핵심을 요약하세요.
- 적당하면 자연스럽게 다듬어주세요.
- 청년부 공동체에서 나누기 좋은 따뜻하고 정돈된 톤으로 작성하세요.

반드시 JSON 형태로 응답해주세요:
{
  "type": "question" | "refined",
  "text": "다듬어진 기도 제목 또는 질문 내용"
}`,
        config: {
          responseMimeType: "application/json",
        },
      });

      const data = JSON.parse(response.text || "{}");
      setAiResponse(data);
      if (data.type === "question") {
        setDidAnswerQuestion(false);
        setStep(2);
      } else {
        setDidAnswerQuestion(false);
        setRefinedContent(data.text);
        setStep(3);
      }
    } catch (err: any) {
      console.error("AI Refinement Error:", err);
      // Fallback to direct submit if AI fails, without blocking alert for quota
      handleSubmit(content);
    } finally {
      setIsRefining(false);
    }
  };

  const handleAnswerQuestion = (answer: string) => {
    setContent((prev) => prev + "\n" + answer);
    setDidAnswerQuestion(true);
    setStep(1);
  };

  const handleSubmit = async (finalContent: string) => {
    await fetch("/api/prayers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        groupId: groupId || null,
        content: finalContent,
        originalContent: content,
      }),
    });
    navigate("/feed");
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-slate-900">
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 flex items-center border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-medium ml-2">기도 제목 나누기</span>
      </header>

      <div className="p-4">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-serif">
                마음에 있는 것을
                <br />
                자유롭게 적어주세요 🙏
              </h2>
              <p className="text-sm text-slate-500">
                짧게든 길게든 편하게 적어주세요.
              </p>
            </div>

            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="어떤 기도가 필요하신가요?"
                className="w-full h-48 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[var(--color-primary-light)] resize-none text-base leading-relaxed"
                maxLength={500}
              />
              <div className="absolute bottom-4 right-4 text-xs text-slate-400">
                {content.length} / 500자
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                공개 범위
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(Number(e.target.value) || "")}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none"
              >
                <option value="">전체 공개</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="refine-btn"
              onClick={handleRefine}
              disabled={!content.trim() || isRefining}
              className="w-full py-4 rounded-xl bg-[var(--color-primary-light)] dark:bg-[var(--color-primary-dark)] text-white font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isRefining ? (
                <span className="animate-pulse">AI가 정리하는 중...</span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>AI로 정리해줘 →</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleSubmit(content)}
              disabled={!content.trim() || isRefining}
              className="w-full py-4 rounded-xl bg-transparent text-slate-500 font-medium disabled:opacity-50"
            >
              그냥 이대로 등록할게요
            </button>
          </motion.div>
        )}

        {step === 2 && aiResponse?.type === "question" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-serif">
                조금 더 알려주시면
                <br />더 잘 정리해드릴 수 있어요
              </h2>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50">
              <div className="flex items-center space-x-2 mb-3 text-[var(--color-primary-light)] dark:text-[var(--color-primary-dark)]">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium text-sm">AI의 질문</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {aiResponse.text}
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                autoFocus
                placeholder="답변을 입력해주세요..."
                className="w-full h-32 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[var(--color-primary-light)] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAnswerQuestion(e.currentTarget.value);
                  }
                }}
              />
              <p className="text-xs text-slate-500 text-center">
                엔터를 누르면 답변이 전송됩니다.
              </p>
            </div>

            <button
              onClick={() => handleSubmit(content)}
              className="w-full py-4 rounded-xl text-slate-500 font-medium"
            >
              이 질문 건너뛰고 등록하기
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-serif">
                이렇게 정리해봤어요,
                <br />
                어떠신가요? 🙏
              </h2>
            </div>

            <div className="relative">
              <textarea
                value={refinedContent}
                onChange={(e) => setRefinedContent(e.target.value)}
                className="w-full h-48 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-[var(--color-primary-light)]/20 focus:ring-2 focus:ring-[var(--color-primary-light)] resize-none font-prayer text-base leading-relaxed"
              />
              <div className="absolute top-3 right-3 text-[var(--color-primary-light)] dark:text-[var(--color-primary-dark)]">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSubmit(didAnswerQuestion ? content : refinedContent)}
                className="w-full py-4 rounded-xl bg-[var(--color-primary-light)] dark:bg-[var(--color-primary-dark)] text-white font-medium flex items-center justify-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>
                  {didAnswerQuestion
                    ? "내가 쓴 내용으로 등록하기 →"
                    : "이대로 등록하기 →"}
                </span>
              </button>
              {!didAnswerQuestion && (
                <button
                  onClick={() => handleSubmit(content)}
                  className="w-full py-3 rounded-xl text-slate-500 font-medium text-sm"
                >
                  내가 쓴 원본으로 등록할게요
                </button>
              )}
              <button
                onClick={() => setStep(1)}
                className="w-full py-4 rounded-xl text-slate-500 font-medium"
              >
                다시 작성하기
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
