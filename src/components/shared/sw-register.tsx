"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Dev chunks aren't content-hashed, so a caching worker serves stale JS/CSS after edits.
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
      if ("caches" in window) caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);
  return null;
}
