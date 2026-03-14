/**
 * 구글 시트에 사용자 조 저장 (최초 선택 또는 내 기도에서 변경)
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

  const { userId, groupIds } = (req.body || {}) as {
    userId?: number;
    groupIds?: number[];
  };

  if (userId == null || !Array.isArray(groupIds)) {
    res.status(400).json({
      success: false,
      error: "userId와 groupIds가 필요합니다.",
    });
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_user_groups",
        userId,
        groupIds,
      }),
    });
    const text = await response.text();
    res.setHeader("Content-Type", "application/json");
    res.status(response.status).send(text);
  } catch (err: unknown) {
    console.error("Sheet save groups error:", err);
    res.status(500).json({
      success: false,
      error: "구글 시트에 연결할 수 없습니다.",
    });
  }
}
