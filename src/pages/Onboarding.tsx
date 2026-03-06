import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Feather } from "lucide-react";

export default function Onboarding() {
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!nickname || pin.length !== 4) {
      setError("닉네임과 4자리 PIN을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, pin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem("user", JSON.stringify(data));
      navigate("/groups");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-6">
            <Feather className="w-8 h-8 text-[var(--color-primary-light)] dark:text-[var(--color-primary-dark)]" />
          </div>
          <h1 className="text-2xl font-serif font-medium">
            중보기도 웹 서비스
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            함께 기도하는 공간
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              이름 (닉네임)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
              placeholder="이름을 입력해주세요"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              PIN (4자리 숫자)
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all tracking-widest"
              placeholder="••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            onClick={handleStart}
            className="w-full py-4 rounded-xl bg-[var(--color-primary-light)] dark:bg-[var(--color-primary-dark)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            시작하기 →
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          이미 계정이 있으신가요?
          <br />
          닉네임과 PIN을 입력하면 자동으로 접속됩니다.
        </p>
      </div>
    </motion.div>
  );
}
