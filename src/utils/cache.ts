/**
 * 단순 메모리 캐시 (TTL). 다중 사용자 환경을 고려해 짧은 TTL + 수동 새로고침.
 */
const CACHE_TTL_MS = 15 * 1000; // 15초 (여러 사람이 쓰므로 짧게)

const store = new Map<string, { data: unknown; expires: number }>();

const PRAYERS_PREFIX = "/api/prayers";

function getCacheKey(url: string): string {
  return url;
}

export function getCached<T>(url: string): T | null {
  const key = getCacheKey(url);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached(url: string, data: unknown): void {
  store.set(getCacheKey(url), {
    data,
    expires: Date.now() + CACHE_TTL_MS,
  });
}

/** 기도 목록 관련 캐시만 무효화 (등록/수정/삭제 후 호출) */
export function invalidatePrayersCache(): void {
  for (const key of store.keys()) {
    if (key.startsWith(PRAYERS_PREFIX)) store.delete(key);
  }
}

/** 특정 URL 캐시만 무효화 (새로고침 버튼용) */
export function invalidateUrl(url: string): void {
  store.delete(getCacheKey(url));
}
