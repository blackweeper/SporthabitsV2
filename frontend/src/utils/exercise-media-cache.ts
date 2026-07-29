import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local media cache for exercise demonstration images/GIFs (Phase B3.5).
 *
 * One `AsyncStorage` key per media URL rather than a single blob — caching
 * or evicting one image never requires reading/rewriting every other cached
 * item. The public surface (`ensureMediaCached`) is intentionally the only
 * thing callers depend on: if the media library later grows large enough to
 * justify a native file-based cache (e.g. `expo-file-system`), only this
 * file's internals change — no caller needs to change.
 *
 * "Don't re-download unchanged media": the cache key is the URL itself, so
 * as long as an exercise's media URL stays stable (as WorkoutX's GIF URLs
 * are, per-exercise-id), it is fetched at most once. WebP vs GIF is handled
 * transparently — this module just stores/serves whatever bytes + content
 * type it fetched, so once the (separate, not-yet-built) import script
 * starts producing WebP URLs instead of GIF ones, nothing here needs to
 * change.
 */

type CachedMedia = { mime: string; base64: string };

function cacheKey(url: string): string {
  return `@ironflow/media/${encodeURIComponent(url)}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = (reader.result as string) ?? "";
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Returns a ready-to-use `data:` URI for the given media URL — from cache
 * if already fetched, otherwise downloads, caches, and returns it. Returns
 * `null` on a missing url or a network/fetch failure (callers should fall
 * back to their existing placeholder, e.g. an emoji icon). */
export async function ensureMediaCached(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const key = cacheKey(url);

  const cachedRaw = await AsyncStorage.getItem(key);
  if (cachedRaw) {
    try {
      const { mime, base64 } = JSON.parse(cachedRaw) as CachedMedia;
      return `data:${mime};base64,${base64}`;
    } catch {
      // Fall through and refetch — treat a corrupted cache entry like a miss.
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") ?? "image/gif";
    const blob = await res.blob();
    const base64 = await blobToBase64(blob);
    await AsyncStorage.setItem(key, JSON.stringify({ mime, base64 } satisfies CachedMedia));
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

/** Removes one cached media entry (e.g. if a URL is known to have changed). */
export async function evictCachedMedia(url: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKey(url));
}
