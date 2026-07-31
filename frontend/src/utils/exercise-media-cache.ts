import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local media cache for exercise demonstration images/GIFs (V3 rewrite).
 *
 * Replaces the previous base64-in-AsyncStorage implementation, which had no
 * eviction policy and silently failed once the browser's localStorage quota
 * was hit (confirmed real-world: a `QuotaExceededError` on `setItem` after
 * ~50MB of cached images, swallowed by the old try/catch, falling back to
 * the emoji placeholder with zero visible error).
 *
 * - Native (iOS/Android): real files under `Paths.cache/exercise-media/`
 *   (`expo-file-system`'s new File/Directory API), one file per media,
 *   named deterministically from the URL (`{source}_{filename}`) so a
 *   repeat request for the same media is a cache hit, never a re-download.
 * - Web: `expo-file-system` has no real filesystem in a browser (its web
 *   shim is a no-op) — uses the browser's `Cache Storage` API instead,
 *   which is disk-backed and has a vastly larger practical quota than
 *   localStorage. A small in-memory map of already-minted `blob:` URLs
 *   avoids re-creating one on every re-render within the same page session
 *   (object URLs aren't reusable across calls otherwise).
 * - Both platforms share one small LRU index (`{key, url, sizeBytes,
 *   lastAccessedAt}`, stored as plain JSON metadata in AsyncStorage — no
 *   media bytes in there, just bookkeeping) capped at `MAX_CACHE_BYTES`;
 *   writing a new entry evicts the least-recently-accessed entries first
 *   until back under the cap.
 */

type CacheIndexEntry = { key: string; url: string; sizeBytes: number; lastAccessedAt: number };
type CacheIndex = Record<string, CacheIndexEntry>;

const CACHE_DIR_NAME = "exercise-media";
const WEB_CACHE_NAME = "ironflow-exercise-media";
const INDEX_KEY = "@ironflow/mediaCacheIndex";
const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500 MB — generous for thousands of exercise media, still bounded.

/** Deterministic, human-readable cache key from a media URL — the last two
 * path segments (`{source}/{filename}`) are already a unique, stable
 * identifier per exercise+media-type, no hashing needed. */
function keyFromUrl(url: string): string {
  const parts = url.split("/").filter(Boolean);
  const filename = parts[parts.length - 1] ?? url;
  const source = parts[parts.length - 2] ?? "media";
  return `${source}_${filename}`;
}

async function getIndex(): Promise<CacheIndex> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[media-cache] corrupt index, resetting", err);
    return {};
  }
}

async function saveIndex(index: CacheIndex): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

/** Records/touches one entry, then evicts least-recently-accessed entries
 * (never the one just written) until the total tracked size is back under
 * `MAX_CACHE_BYTES`. `deleteFile` performs the platform-specific removal. */
async function touchAndEvict(
  key: string,
  url: string,
  sizeBytes: number,
  deleteFile: (key: string) => Promise<void>,
): Promise<void> {
  const index = await getIndex();
  index[key] = { key, url, sizeBytes, lastAccessedAt: Date.now() };

  let total = Object.values(index).reduce((sum, e) => sum + e.sizeBytes, 0);
  if (total > MAX_CACHE_BYTES) {
    const oldestFirst = Object.values(index)
      .filter((e) => e.key !== key)
      .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
    for (const entry of oldestFirst) {
      if (total <= MAX_CACHE_BYTES) break;
      await deleteFile(entry.key).catch((err) =>
        console.warn(`[media-cache] eviction delete failed for ${entry.key}`, err),
      );
      delete index[entry.key];
      total -= entry.sizeBytes;
    }
  }
  await saveIndex(index);
}

async function removeFromIndex(key: string): Promise<void> {
  const index = await getIndex();
  if (index[key]) {
    delete index[key];
    await saveIndex(index);
  }
}

// ---------- Native (iOS/Android): expo-file-system File/Directory ----------

let nativeCacheDir: Directory | null = null;
function getNativeCacheDir(): Directory {
  if (!nativeCacheDir) {
    nativeCacheDir = new Directory(Paths.cache, CACHE_DIR_NAME);
  }
  if (!nativeCacheDir.exists) {
    nativeCacheDir.create({ intermediates: true, idempotent: true });
  }
  return nativeCacheDir;
}

async function ensureMediaCachedNative(url: string): Promise<string | null> {
  const key = keyFromUrl(url);
  const dir = getNativeCacheDir();
  const file = new File(dir, key);

  if (file.exists) {
    await touchAndEvict(key, url, file.size, async (k) => {
      const f = new File(dir, k);
      if (f.exists) f.delete();
    });
    return file.uri;
  }

  try {
    const downloaded = await File.downloadFileAsync(url, file, { idempotent: true });
    await touchAndEvict(key, url, downloaded.size, async (k) => {
      const f = new File(dir, k);
      if (f.exists) f.delete();
    });
    return downloaded.uri;
  } catch (err) {
    console.warn(`[media-cache] native download failed for ${url}`, err);
    return null;
  }
}

async function evictMediaNative(url: string): Promise<void> {
  const key = keyFromUrl(url);
  const dir = getNativeCacheDir();
  const file = new File(dir, key);
  if (file.exists) file.delete();
  await removeFromIndex(key);
}

// ---------- Web: browser Cache Storage API ----------

const webObjectUrlCache = new Map<string, string>();

async function ensureMediaCachedWeb(url: string): Promise<string | null> {
  if (typeof caches === "undefined") {
    console.warn(`[media-cache] Cache Storage API unavailable, cannot cache ${url}`);
    return null;
  }
  const key = keyFromUrl(url);

  const existingObjectUrl = webObjectUrlCache.get(key);
  if (existingObjectUrl) {
    await touchAndEvict(key, url, 0, async (k) => evictWebCacheEntry(k));
    return existingObjectUrl;
  }

  try {
    const cache = await caches.open(WEB_CACHE_NAME);
    let response = await cache.match(url);
    if (!response) {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[media-cache] fetch failed for ${url}: HTTP ${res.status}`);
        return null;
      }
      await cache.put(url, res.clone());
      response = res;
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    webObjectUrlCache.set(key, objectUrl);
    await touchAndEvict(key, url, blob.size, async (k) => evictWebCacheEntry(k));
    return objectUrl;
  } catch (err) {
    console.warn(`[media-cache] web cache error for ${url}`, err);
    return null;
  }
}

async function evictWebCacheEntry(key: string): Promise<void> {
  const index = await getIndex();
  const entry = index[key];
  const objectUrl = webObjectUrlCache.get(key);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    webObjectUrlCache.delete(key);
  }
  if (entry && typeof caches !== "undefined") {
    const cache = await caches.open(WEB_CACHE_NAME);
    await cache.delete(entry.url);
  }
}

async function evictMediaWeb(url: string): Promise<void> {
  const key = keyFromUrl(url);
  await evictWebCacheEntry(key);
  await removeFromIndex(key);
}

// ---------- Public API (unchanged signatures — callers need no changes) ----------

/** Returns a ready-to-use URI for the given media URL (a `file://` URI on
 * native, a `blob:` URI on web) — from cache if already fetched, otherwise
 * downloads, caches to real disk, and returns it. Returns `null` on a
 * missing url or a network/fetch failure (callers should fall back to
 * their existing placeholder, e.g. an emoji icon). */
export async function ensureMediaCached(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  return Platform.OS === "web" ? ensureMediaCachedWeb(url) : ensureMediaCachedNative(url);
}

/** Removes one cached media entry (e.g. if a URL is known to have changed). */
export async function evictCachedMedia(url: string): Promise<void> {
  if (Platform.OS === "web") {
    await evictMediaWeb(url);
  } else {
    await evictMediaNative(url);
  }
}
