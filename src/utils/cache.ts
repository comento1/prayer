/**
 * 단순 메모리 캐시 (TTL). 피드/내기도 목록 등 로딩 체감 속도 개선용.
 */
const CACHE_TTL_MS = 45 * 1000; // 45초

const store = new Map<string, { data: unknown; expires: number }>();

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
