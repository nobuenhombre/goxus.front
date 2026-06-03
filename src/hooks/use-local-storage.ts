import { useSyncExternalStore } from "react"

function subscribeStorage(key: string, callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === key) callback()
  }
  window.addEventListener("storage", handler)
  return () => window.removeEventListener("storage", handler)
}

function getStorageSnapshot(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback
  return localStorage.getItem(key) || fallback
}

export function useLocalStorageString(key: string, fallback: string): string {
  return useSyncExternalStore(
    (cb) => subscribeStorage(key, cb),
    () => getStorageSnapshot(key, fallback),
    () => fallback,
  )
}
