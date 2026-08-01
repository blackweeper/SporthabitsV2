import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Key-value storage for large payloads (multi-MB JSON) that must not go
 * through `AsyncStorage`'s web fallback — confirmed by direct testing that
 * fallback is `window.localStorage`, which has a small fixed per-origin
 * quota (~5MB on mobile Safari). Writing the ~6.5MB exercise catalog there
 * (plus a full backup duplicate) reliably throws `QuotaExceededError`
 * ("Quota has been exceeded") on phones, even though it succeeds on a
 * desktop browser's much larger localStorage quota — which is why this
 * went uncaught until a real device hit it.
 *
 * On web this uses IndexedDB instead — disk-backed, practical quota in the
 * hundreds of MB to GB, the same storage tier already used successfully by
 * the media cache's Cache Storage API (`exercise-media-cache.ts`). On
 * native, AsyncStorage is already backed by real SQLite/file storage with
 * no such small ceiling, so it's used directly, unchanged.
 */

const DB_NAME = "ironflow-kv";
const STORE_NAME = "kv";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbRemove(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const idbAvailable = () => typeof indexedDB !== "undefined";

/**
 * Reads `key`. On web, checks IndexedDB first; if absent there, falls back
 * to (and migrates) whatever is still sitting in the old AsyncStorage/
 * localStorage entry from before this fix — a one-time move that also
 * frees up the localStorage quota that entry was consuming.
 */
export async function bigStoreGet(key: string): Promise<string | null> {
  if (Platform.OS !== "web" || !idbAvailable()) return AsyncStorage.getItem(key);
  try {
    const fromIdb = await idbGet(key);
    if (fromIdb !== null) return fromIdb;
  } catch (err) {
    console.warn(`[big-kv-store] IndexedDB read failed for ${key}, falling back to AsyncStorage`, err);
    return AsyncStorage.getItem(key);
  }
  const legacy = await AsyncStorage.getItem(key);
  if (legacy !== null) {
    try {
      await idbSet(key, legacy);
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn(`[big-kv-store] migration to IndexedDB failed for ${key}`, err);
    }
  }
  return legacy;
}

export async function bigStoreSet(key: string, value: string): Promise<void> {
  if (Platform.OS !== "web" || !idbAvailable()) return AsyncStorage.setItem(key, value);
  await idbSet(key, value);
  // Clear any stale legacy copy so it doesn't keep eating localStorage quota.
  await AsyncStorage.removeItem(key).catch(() => {});
}

export async function bigStoreRemove(key: string): Promise<void> {
  if (Platform.OS !== "web" || !idbAvailable()) return AsyncStorage.removeItem(key);
  await Promise.all([idbRemove(key).catch(() => {}), AsyncStorage.removeItem(key).catch(() => {})]);
}
