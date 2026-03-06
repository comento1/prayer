/**
 * 헬스체크 (Vercel 배포 시 404 방지)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(_req: any, res: any) {
  res.status(200).json({ status: "ok" });
}
