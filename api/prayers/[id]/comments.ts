/**
 * Vercel: POST /api/prayers/:id/comments (격려 메시지, 구글 시트 연동)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) {
    res.status(500).json({ error: "GOOGLE_SHEETS_WEBHOOK_URL이 설정되지 않았습니다." });
    return;
  }

  const id = req.query?.id;
  if (!id) {
    res.status(400).json({ error: "id 필요" });
    return;
  }

  const { userId, content } = req.body || {};
  if (userId == null || content == null) {
    res.status(400).json({ error: "userId, content 필요" });
    return;
  }

  const contentStr = String(content).trim();
  if (!contentStr) {
    res.status(400).json({ error: "내용을 입력해주세요." });
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "prayer_comment",
        prayerId: Number(id),
        userId: Number(userId),
        content: contentStr,
      }),
    });
    const text = await response.text();
    let data: { id?: number; error?: string };
    try {
      data = JSON.parse(text);
    } catch {
      res.status(502).json({ error: "시트 응답을 처리할 수 없습니다." });
      return;
    }
    if (data.error) {
      res.status(400).json(data);
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.status(200).json({ id: data.id ?? 0 });
  } catch (err: unknown) {
    console.error("Prayer comment error:", err);
    res.status(500).json({ error: "구글 시트에 연결할 수 없습니다." });
  }
}
