import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * 시트/API에서 오는 created_at이 문자열·숫자·Date 등일 수 있으므로
 * 유효한 Date만 반환하고, 아니면 null.
 */
export function safeParseDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 기도/댓글 시간 표시. Invalid date면 "방금 전"으로 표시해 RangeError 방지.
 */
export function formatPrayerDate(value: unknown): string {
  const d = safeParseDate(value);
  if (!d) return "방금 전";
  return formatDistanceToNow(d, { addSuffix: true, locale: ko });
}
