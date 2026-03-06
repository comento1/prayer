/**
 * 구글 시트 로그인 프록시 (CORS 회피)
 * 브라우저 → 이 API → 구글 Apps Script
 * 환경 변수: GOOGLE_SHEETS_WEBHOOK_URL
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) {
    res.status(500).json({
      success: false,
      error: "GOOGLE_SHEETS_WEBHOOK_URL이 설정되지 않았습니다.",
    });
    return;
  }

  const { nickname, pin } = (req.body || {}) as {
    nickname?: string;
    pin?: string;
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "auth",
        nickname: nickname?.trim() ?? "",
        pin: pin ?? "",
      }),
    });
    const text = await response.text();
    res.setHeader("Content-Type", "application/json");
    res.status(response.status).send(text);
  } catch (err: unknown) {
    console.error("Sheet auth proxy error:", err);
    res.status(500).json({
      success: false,
      error: "구글 시트에 연결할 수 없습니다.",
    });
  }
}
