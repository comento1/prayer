/**
 * 소그룹 목록 (Vercel 배포 시 사용)
 * Express 서버가 없을 때 이 API가 응답합니다.
 */
export const DEFAULT_GROUPS = [
  { id: 1, name: "창환 조" },
  { id: 2, name: "은아 조" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(_req: any, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json(DEFAULT_GROUPS);
}
