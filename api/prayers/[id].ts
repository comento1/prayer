/**
 * Vercel: GET /api/prayers/:id, DELETE /api/prayers/:id (구글 시트 연동)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) {
    res.status(500).json({ error: "GOOGLE_SHEETS_WEBHOOK_URL이 설정되지 않았습니다." });
    return;
  }

  const id = req.query?.id;
  if (id == null || id === "") {
    res.status(400).json({ error: "id 필요" });
    return;
  }

  if (req.method === "GET") {
    try {
      const currentUserId = req.query?.currentUserId;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prayer_get",
          prayerId: Number(id),
          currentUserId: currentUserId != null ? Number(currentUserId) : undefined,
        }),
      });
      const text = await response.text();
      let data: { error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        res.status(502).json({ error: "시트 응답을 처리할 수 없습니다." });
        return;
      }
      if (data.error) {
        res.status(response.ok ? 200 : 404).json(data);
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).json(data);
    } catch (err: unknown) {
      console.error("Prayer get error:", err);
      res.status(500).json({ error: "구글 시트에 연결할 수 없습니다." });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const body = req.body || {};
      const { isAnswered, answeredNote, content } = body;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prayer_update",
          prayerId: Number(id),
          isAnswered,
          answeredNote:
            answeredNote != null ? String(answeredNote).trim() : undefined,
          content: content != null ? String(content) : undefined,
        }),
      });
      const text = await response.text();
      let data: { success?: boolean; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        res.status(502).json({ error: "시트 응답을 처리할 수 없습니다." });
        return;
      }
      if (data.success) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ error: data.error || "수정 실패" });
      }
    } catch (err: unknown) {
      console.error("Prayer update error:", err);
      res.status(500).json({ error: "구글 시트에 연결할 수 없습니다." });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prayer_delete",
          prayerId: Number(id),
        }),
      });
      const text = await response.text();
      let data: { success?: boolean; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        res.status(502).json({ error: "시트 응답을 처리할 수 없습니다." });
        return;
      }
      if (data.success) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ error: data.error || "삭제 실패" });
      }
    } catch (err: unknown) {
      console.error("Prayer delete error:", err);
      res.status(500).json({ error: "구글 시트에 연결할 수 없습니다." });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
