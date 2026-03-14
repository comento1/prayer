/**
 * Vercel 배포 시 기도 목록/등록 (구글 시트 연동)
 * GET: 목록 조회, POST: 기도 등록
 * 환경 변수: GOOGLE_SHEETS_WEBHOOK_URL
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) {
    res.status(500).json({
      error: "GOOGLE_SHEETS_WEBHOOK_URL이 설정되지 않았습니다.",
    });
    return;
  }

  if (req.method === "GET") {
    const groupId = req.query?.groupId;
    const userId = req.query?.userId;
    const period = req.query?.period;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prayers_list",
          groupId: groupId || undefined,
          userId: userId || undefined,
          period: period || undefined,
        }),
      });
      const text = await response.text();
      let data: { prayers?: unknown[] };
      try {
        data = JSON.parse(text);
      } catch {
        res.status(502).json({ error: "시트 응답을 처리할 수 없습니다." });
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).json(Array.isArray(data.prayers) ? data.prayers : []);
    } catch (err: unknown) {
      console.error("Prayers list error:", err);
      res.status(500).json({ error: "구글 시트에 연결할 수 없습니다." });
    }
    return;
  }

  if (req.method === "POST") {
    const { userId, groupId, content, originalContent, nickname } = req.body || {};
    if (userId == null || !content) {
      res.status(400).json({ error: "userId와 content가 필요합니다." });
      return;
    }
    const createdAt = new Date().toISOString().replace(" ", "T");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prayer_create",
          userId,
          nickname: nickname || "",
          groupId: groupId ?? null,
          content,
          originalContent: originalContent || content,
          created_at: createdAt,
        }),
      });
      const text = await response.text();
      let data: { id?: number };
      try {
        data = JSON.parse(text);
      } catch {
        res.status(502).json({ error: "시트 응답을 처리할 수 없습니다." });
        return;
      }
      if (data.id == null) {
        res.status(502).json({ error: "기도 등록에 실패했습니다." });
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).json({ id: data.id });
    } catch (err: unknown) {
      console.error("Prayer create error:", err);
      res.status(500).json({ error: "구글 시트에 연결할 수 없습니다." });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
